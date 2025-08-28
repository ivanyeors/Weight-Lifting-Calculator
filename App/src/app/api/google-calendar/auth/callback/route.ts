import { NextResponse } from 'next/server'

export async function GET() {
  try {
    // For GitHub Pages, we can't use API routes
    // This would normally handle OAuth callbacks
    return NextResponse.json({ 
      error: 'API routes are not available in static export' 
    }, { status: 501 })
  } catch (error) {
    console.error('Google Calendar callback error:', error)
    return NextResponse.json({ 
      error: 'Callback processing failed' 
    }, { status: 500 })
  }
}
