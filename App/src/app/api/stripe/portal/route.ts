import { NextResponse } from 'next/server'
import Stripe from 'stripe'
import { createClient } from '@supabase/supabase-js'

export const runtime = 'nodejs'

export async function POST(request: Request) {
  const stripeSecret = process.env.STRIPE_SECRET_KEY as string | undefined
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL as string | undefined
  const supabaseServiceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY as string | undefined

  if (!stripeSecret || !supabaseUrl || !supabaseServiceRoleKey) {
    return new NextResponse('Missing environment configuration', { status: 500 })
  }

  const authHeader = request.headers.get('authorization') || request.headers.get('Authorization')
  if (!authHeader || !authHeader.toLowerCase().startsWith('bearer ')) {
    return new NextResponse('Unauthorized', { status: 401 })
  }

  const accessToken = authHeader.slice(7)
  const admin = createClient(supabaseUrl, supabaseServiceRoleKey)
  const { data: userRes, error: userErr } = await admin.auth.getUser(accessToken)
  if (userErr || !userRes?.user) {
    return new NextResponse('Unauthorized', { status: 401 })
  }

  const user = userRes.user

  // Look up stripe_customer_id in our subscriptions table
  const { data: subRows, error: subErr } = await admin
    .from('subscriptions')
    .select('stripe_customer_id')
    .eq('user_id', user.id)
    .limit(1)
    .maybeSingle()

  if (subErr) {
    return NextResponse.json({ ok: false, error: subErr.message }, { status: 500 })
  }

  let stripeCustomerId: string | null = subRows?.stripe_customer_id || null

  // As a fallback, try to find by email if not stored
  if (!stripeCustomerId && user.email) {
    try {
      const stripe = new Stripe(stripeSecret, { apiVersion: '2024-06-20' })
      const customers = await stripe.customers.list({ email: user.email, limit: 1 })
      if (customers.data.length > 0) stripeCustomerId = customers.data[0].id
    } catch {
      // ignore lookup errors
    }
  }

  if (!stripeCustomerId) {
    return NextResponse.json({ ok: false, error: 'No Stripe customer found' }, { status: 404 })
  }

  const stripe = new Stripe(stripeSecret, { apiVersion: '2024-06-20' })
  const origin = (() => {
    try { return new URL(request.url).origin } catch { return request.headers.get('origin') || '' }
  })()
  const returnUrl = `${origin}/account?tab=billing`

  try {
    const session = await stripe.billingPortal.sessions.create({
      customer: stripeCustomerId,
      return_url: returnUrl,
    })
    return NextResponse.json({ url: session.url })
  } catch (e) {
    return NextResponse.json({ ok: false }, { status: 500 })
  }
}


