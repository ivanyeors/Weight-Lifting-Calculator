import { NextRequest, NextResponse } from 'next/server'

export const dynamic = 'force-dynamic'
export const runtime = 'nodejs'

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const code = searchParams.get('code')
    const state = searchParams.get('state')
    const error = searchParams.get('error')

    if (error) {
      console.error('OAuth error:', error)
      return NextResponse.redirect(new URL('/account?tab=calendar&error=auth_failed', request.url))
    }

    if (!code) {
      return NextResponse.redirect(new URL('/account?tab=calendar&error=no_code', request.url))
    }

    // Instead of redirecting, return an HTML page that handles the callback client-side
    const html = `
      <!DOCTYPE html>
      <html>
        <head>
          <title>Connecting Google Calendar...</title>
          <meta charset="utf-8">
        </head>
        <body>
          <div style="display: flex; justify-content: center; align-items: center; height: 100vh; font-family: Arial, sans-serif;">
            <div style="text-align: center;">
              <h2>Connecting Google Calendar...</h2>
              <p>Please wait while we complete the connection.</p>
            </div>
          </div>
          <script>
            // Handle the OAuth callback on the client side
            const urlParams = new URLSearchParams(window.location.search);
            const code = urlParams.get('code');
            const state = urlParams.get('state');
            
            if (code) {
              // Store the code temporarily
              sessionStorage.setItem('googleCalendarCode', code);
              sessionStorage.setItem('googleCalendarState', state || '');
              
              // Determine redirect: support JSON state { next, nonce }
              let redirectUrl = '/account?tab=calendar'
              try {
                if (state) {
                  const parsed = JSON.parse(decodeURIComponent(state))
                  if (parsed && typeof parsed === 'object' && parsed.next) {
                    redirectUrl = parsed.next
                  } else {
                    // state is likely a plain URL
                    redirectUrl = decodeURIComponent(state)
                  }
                }
              } catch (e) {
                try {
                  // state might be a plain encoded URL
                  if (state) redirectUrl = decodeURIComponent(state)
                } catch (_) {}
              }
              window.location.href = redirectUrl;
            } else {
              // No code, redirect with error
              window.location.href = '/account?tab=calendar&error=no_code';
            }
          </script>
        </body>
      </html>
    `

    return new NextResponse(html, {
      headers: {
        'Content-Type': 'text/html',
      },
    })
  } catch (error) {
    console.error('Error handling auth callback:', error)
    return NextResponse.redirect(new URL('/account?tab=calendar&error=callback_failed', request.url))
  }
}
