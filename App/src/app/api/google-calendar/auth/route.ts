import { NextRequest, NextResponse } from 'next/server'
import { google } from 'googleapis'

export const dynamic = 'force-dynamic'
export const runtime = 'nodejs'

const oauth2Client = new google.auth.OAuth2(
  process.env.GOOGLE_CLIENT_ID!,
  process.env.GOOGLE_CLIENT_SECRET!,
  process.env.GOOGLE_REDIRECT_URI!
)

export async function GET(request: NextRequest) {
  try {
    const authUrl = oauth2Client.generateAuthUrl({
      access_type: 'offline',
      scope: [
        'https://www.googleapis.com/auth/calendar',
        'https://www.googleapis.com/auth/calendar.events',
        'https://www.googleapis.com/auth/calendar.readonly',
        // Needed to retrieve user info for account labeling
        'https://www.googleapis.com/auth/userinfo.email',
        'https://www.googleapis.com/auth/userinfo.profile',
        'openid'
      ],
      prompt: 'consent',
      include_granted_scopes: true
    })
    
    return NextResponse.json({ authUrl })
  } catch (error) {
    console.error('Error generating auth URL:', error)
    return NextResponse.json(
      { error: 'Failed to generate authorization URL' },
      { status: 500 }
    )
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { code, state, refreshToken } = body || {}

    // Support refresh flow from client
    if (refreshToken) {
      const form = new URLSearchParams({
        client_id: process.env.GOOGLE_CLIENT_ID!,
        client_secret: process.env.GOOGLE_CLIENT_SECRET!,
        refresh_token: refreshToken as string,
        grant_type: 'refresh_token'
      })
      const resp = await fetch('https://oauth2.googleapis.com/token', {
        method: 'POST',
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
        body: form.toString()
      })
      if (!resp.ok) {
        const t = await resp.text()
        return NextResponse.json({ error: 'Failed to refresh token', details: t }, { status: 500 })
      }
      const tokens = await resp.json()
      return NextResponse.json({ success: true, tokens, state, message: 'Token refreshed' })
    }

    if (!code) {
      return NextResponse.json(
        { error: 'Authorization code is required' },
        { status: 400 }
      )
    }

    const { tokens } = await oauth2Client.getToken(code)
    
    return NextResponse.json({ 
      success: true, 
      tokens,
      state,
      message: 'Successfully authenticated with Google Calendar'
    })
  } catch (error) {
    console.error('Error handling auth callback:', error)
    return NextResponse.json(
      { error: 'Failed to authenticate with Google Calendar' },
      { status: 500 }
    )
  }
}
