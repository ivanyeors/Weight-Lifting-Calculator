import { NextRequest, NextResponse } from 'next/server'
import { google } from 'googleapis'

const oauth2Client = new google.auth.OAuth2(
  process.env.GOOGLE_CLIENT_ID!,
  process.env.GOOGLE_CLIENT_SECRET!,
  process.env.GOOGLE_REDIRECT_URI!
)

// GET - Fetch events from Google Calendar
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const timeMin = searchParams.get('timeMin')
    const timeMax = searchParams.get('timeMax')
    const calendarId = searchParams.get('calendarId') || 'primary'
    const tokens = searchParams.get('tokens')

    if (!tokens) {
      return NextResponse.json(
        { error: 'Authentication tokens required' },
        { status: 401 }
      )
    }

    oauth2Client.setCredentials(JSON.parse(tokens))
    const calendar = google.calendar({ version: 'v3', auth: oauth2Client })
    
    const response = await calendar.events.list({
      calendarId,
      timeMin: timeMin || new Date().toISOString(),
      timeMax: timeMax || new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString(),
      singleEvents: true,
      orderBy: 'startTime'
    })

    return NextResponse.json({ events: response.data.items || [] })
  } catch (error) {
    console.error('Error fetching events:', error)
    return NextResponse.json(
      { error: 'Failed to fetch events from Google Calendar' },
      { status: 500 }
    )
  }
}

// POST - Create event in Google Calendar
export async function POST(request: NextRequest) {
  try {
    const { event, calendarId = 'primary', tokens } = await request.json()

    if (!tokens) {
      return NextResponse.json(
        { error: 'Authentication tokens required' },
        { status: 401 }
      )
    }

    oauth2Client.setCredentials(tokens)
    const calendar = google.calendar({ version: 'v3', auth: oauth2Client })
    
    const response = await calendar.events.insert({
      calendarId,
      resource: event
    })

    return NextResponse.json({ 
      success: true, 
      event: response.data,
      message: 'Event created successfully in Google Calendar'
    })
  } catch (error) {
    console.error('Error creating event:', error)
    return NextResponse.json(
      { error: 'Failed to create event in Google Calendar' },
      { status: 500 }
    )
  }
}

// PUT - Update event in Google Calendar
export async function PUT(request: NextRequest) {
  try {
    const { eventId, event, calendarId = 'primary', tokens } = await request.json()

    if (!tokens) {
      return NextResponse.json(
        { error: 'Authentication tokens required' },
        { status: 401 }
      )
    }

    oauth2Client.setCredentials(tokens)
    const calendar = google.calendar({ version: 'v3', auth: oauth2Client })
    
    const response = await calendar.events.update({
      calendarId,
      eventId,
      resource: event
    })

    return NextResponse.json({ 
      success: true, 
      event: response.data,
      message: 'Event updated successfully in Google Calendar'
    })
  } catch (error) {
    console.error('Error updating event:', error)
    return NextResponse.json(
      { error: 'Failed to update event in Google Calendar' },
      { status: 500 }
    )
  }
}

// DELETE - Delete event from Google Calendar
export async function DELETE(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const eventId = searchParams.get('eventId')
    const calendarId = searchParams.get('calendarId') || 'primary'
    const tokens = searchParams.get('tokens')

    if (!eventId || !tokens) {
      return NextResponse.json(
        { error: 'Event ID and authentication tokens required' },
        { status: 400 }
      )
    }

    oauth2Client.setCredentials(JSON.parse(tokens))
    const calendar = google.calendar({ version: 'v3', auth: oauth2Client })
    
    await calendar.events.delete({
      calendarId,
      eventId
    })

    return NextResponse.json({ 
      success: true,
      message: 'Event deleted successfully from Google Calendar'
    })
  } catch (error) {
    console.error('Error deleting event:', error)
    return NextResponse.json(
      { error: 'Failed to delete event from Google Calendar' },
      { status: 500 }
    )
  }
}
