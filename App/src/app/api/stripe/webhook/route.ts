'use server'

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
    const subscriptionStatus = (session.subscription as Stripe.Subscription | string | null) ? 'active' : null

    if (ref && (paymentStatus === 'paid' || subscriptionStatus === 'active')) {
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
      } catch (e) {
        return NextResponse.json({ ok: false }, { status: 500 })
      }
    }
  }

  // Handle cancellations or subscription deletions to downgrade to Free
  if (event.type === 'customer.subscription.deleted') {
    const subscription = event.data.object as Stripe.Subscription
    const ref = parseClientReferenceId(subscription.metadata?.client_reference_id || null)
    const supabaseUrl2 = process.env.NEXT_PUBLIC_SUPABASE_URL as string | undefined
    const supabaseServiceRoleKey2 = process.env.SUPABASE_SERVICE_ROLE_KEY as string | undefined
    if (ref && supabaseUrl2 && supabaseServiceRoleKey2) {
      const admin2 = createClient(supabaseUrl2, supabaseServiceRoleKey2)
      await admin2.auth.admin.updateUserById(ref.userId, {
        user_metadata: { plan: 'Free' },
      })
    }
  }

  return NextResponse.json({ received: true })
}


