import Stripe from 'stripe'
import { NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

export const runtime = 'nodejs'

// Helper: parse client_reference_id in the form "<userId>|<planName>|<billing>"
function parseClientReferenceId(ref: string | null | undefined) {
  if (!ref) return null
  const parts = ref.split('|')
  if (parts.length < 2) return null
  const [userId, planName] = parts
  return { userId, planName }
}

async function upsertSubscriptionRow(params: {
  supabaseUrl: string
  supabaseServiceRoleKey: string
  userId: string
  planName?: string | null
  stripeCustomerId?: string | null
  stripeSubscriptionId?: string | null
  status?: string | null
  currentPeriodEnd?: number | null
  cancelAtPeriodEnd?: boolean | null
}) {
  const admin = createClient(params.supabaseUrl, params.supabaseServiceRoleKey)
  const payload: Record<string, unknown> = {
    user_id: params.userId,
  }
  if (typeof params.planName !== 'undefined') payload['plan_tier'] = params.planName
  if (typeof params.stripeCustomerId !== 'undefined') payload['stripe_customer_id'] = params.stripeCustomerId
  if (typeof params.stripeSubscriptionId !== 'undefined') payload['stripe_subscription_id'] = params.stripeSubscriptionId
  if (typeof params.status !== 'undefined') payload['status'] = params.status
  if (typeof params.currentPeriodEnd !== 'undefined') payload['current_period_end'] = params.currentPeriodEnd
  if (typeof params.cancelAtPeriodEnd !== 'undefined') payload['cancel_at_period_end'] = params.cancelAtPeriodEnd

  // Upsert into a "subscriptions" table (create it in Supabase with appropriate RLS)
  await admin
    .from('subscriptions')
    .upsert(payload, { onConflict: 'user_id' })
}

export async function POST(request: Request) {
  const stripeSecret = process.env.STRIPE_SECRET_KEY as string | undefined
  const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET as string | undefined
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL as string | undefined
  const supabaseServiceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY as string | undefined

  if (!stripeSecret || !webhookSecret || !supabaseUrl || !supabaseServiceRoleKey) {
    return new NextResponse('Missing environment configuration', { status: 500 })
  }

  const stripe = new Stripe(stripeSecret, { apiVersion: '2024-06-20' })

  let event: Stripe.Event
  let rawBody: string
  try {
    rawBody = await request.text()
  } catch {
    return new NextResponse('Invalid body', { status: 400 })
  }

  const signature = request.headers.get('stripe-signature') as string | null
  if (!signature) return new NextResponse('Missing Stripe signature', { status: 400 })

  try {
    event = stripe.webhooks.constructEvent(rawBody, signature, webhookSecret)
  } catch (err) {
    return new NextResponse('Webhook signature verification failed', { status: 400 })
  }

  // Only handle completed checkouts (one-time or subscription)
  if (event.type === 'checkout.session.completed') {
    const session = event.data.object as Stripe.Checkout.Session
    const ref = parseClientReferenceId(session.client_reference_id)
    const paymentStatus = session.payment_status
    const hasSubscription = Boolean(session.subscription)

    if (ref && (paymentStatus === 'paid' || hasSubscription)) {
      const admin = createClient(supabaseUrl, supabaseServiceRoleKey)
      const userId = ref.userId
      const planName = ref.planName
      try {
        // Update the user's plan in auth metadata
        const { error } = await admin.auth.admin.updateUserById(userId, {
          user_metadata: { plan: planName },
        })
        if (error) {
          return NextResponse.json({ ok: false, error: error.message }, { status: 500 })
        }

        // Also persist to a subscriptions table for backend visibility
        let stripeSubscriptionId: string | null = null
        let status: string | null = null
        let currentPeriodEnd: number | null = null
        let cancelAtPeriodEnd: boolean | null = null

        if (typeof session.subscription === 'string') {
          try {
            const sub = await stripe.subscriptions.retrieve(session.subscription)
            stripeSubscriptionId = sub.id
            status = sub.status
            currentPeriodEnd = sub.current_period_end || null
            cancelAtPeriodEnd = sub.cancel_at_period_end || false
          } catch {
            // ignore subscription fetch errors
          }
        } else if (session.subscription && typeof session.subscription === 'object') {
          const sub = session.subscription as Stripe.Subscription
          stripeSubscriptionId = sub.id
          status = sub.status
          currentPeriodEnd = sub.current_period_end || null
          cancelAtPeriodEnd = sub.cancel_at_period_end || false
        }

        await upsertSubscriptionRow({
          supabaseUrl,
          supabaseServiceRoleKey,
          userId,
          planName,
          stripeCustomerId: (typeof session.customer === 'string' ? session.customer : (session.customer as Stripe.Customer | null)?.id) || null,
          stripeSubscriptionId,
          status,
          currentPeriodEnd,
          cancelAtPeriodEnd,
        })
      } catch (e) {
        return NextResponse.json({ ok: false }, { status: 500 })
      }
    }
  }

  // Handle cancellations or subscription deletions to downgrade to Free and sync table
  if (event.type === 'customer.subscription.deleted') {
    const subscription = event.data.object as Stripe.Subscription
    const supabaseUrl2 = process.env.NEXT_PUBLIC_SUPABASE_URL as string | undefined
    const supabaseServiceRoleKey2 = process.env.SUPABASE_SERVICE_ROLE_KEY as string | undefined
    if (supabaseUrl2 && supabaseServiceRoleKey2) {
      const admin2 = createClient(supabaseUrl2, supabaseServiceRoleKey2)
      // Find user by stored subscription id
      const { data: row } = await admin2
        .from('subscriptions')
        .select('user_id')
        .eq('stripe_subscription_id', subscription.id)
        .maybeSingle()
      const userId = row?.user_id as string | undefined
      if (userId) {
        await admin2.auth.admin.updateUserById(userId, {
          user_metadata: { plan: 'Free' },
        })
        await upsertSubscriptionRow({
          supabaseUrl: supabaseUrl2,
          supabaseServiceRoleKey: supabaseServiceRoleKey2,
          userId,
          planName: 'Free',
          stripeCustomerId: subscription.customer as string,
          stripeSubscriptionId: subscription.id,
          status: subscription.status,
          currentPeriodEnd: subscription.current_period_end || null,
          cancelAtPeriodEnd: subscription.cancel_at_period_end || false,
        })
      }
    }
  }

  if (event.type === 'customer.subscription.updated') {
    const subscription = event.data.object as Stripe.Subscription
    const supabaseUrl2 = process.env.NEXT_PUBLIC_SUPABASE_URL as string | undefined
    const supabaseServiceRoleKey2 = process.env.SUPABASE_SERVICE_ROLE_KEY as string | undefined
    if (supabaseUrl2 && supabaseServiceRoleKey2) {
      const admin2 = createClient(supabaseUrl2, supabaseServiceRoleKey2)
      const { data: row } = await admin2
        .from('subscriptions')
        .select('user_id')
        .eq('stripe_subscription_id', subscription.id)
        .maybeSingle()
      const userId = row?.user_id as string | undefined
      if (userId) {
        await upsertSubscriptionRow({
          supabaseUrl: supabaseUrl2,
          supabaseServiceRoleKey: supabaseServiceRoleKey2,
          userId,
          // We may not know plan name here without a mapping; leave unchanged
          stripeCustomerId: subscription.customer as string,
          stripeSubscriptionId: subscription.id,
          status: subscription.status,
          currentPeriodEnd: subscription.current_period_end || null,
          cancelAtPeriodEnd: subscription.cancel_at_period_end || false,
        })
      }
    }
  }

  return NextResponse.json({ received: true })
}


