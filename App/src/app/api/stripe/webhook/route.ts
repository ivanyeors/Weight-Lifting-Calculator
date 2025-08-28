import { NextResponse } from 'next/server'

export const runtime = 'nodejs'

export async function POST() {
  try {
    // For GitHub Pages, we can't use API routes
    // This would normally handle Stripe webhooks
    return NextResponse.json({ 
      error: 'API routes are not available in static export' 
    }, { status: 501 })
  } catch {
    return NextResponse.json({ 
      error: 'Webhook processing failed' 
    }, { status: 500 })
  }
}


