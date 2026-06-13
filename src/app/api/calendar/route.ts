import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/lib/auth'
import { prisma } from '@/lib/db'
import { corsairListEvents } from '@/lib/corsair'

export async function GET(req: NextRequest) {
  const session = await auth()
  if (!session?.user?.id) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const accessToken = (session as any).accessToken
  if (!accessToken) return NextResponse.json({ error: 'No access token' }, { status: 401 })

  const { searchParams } = new URL(req.url)
  const timeMin = searchParams.get('timeMin') || new Date().toISOString()
  const timeMax =
    searchParams.get('timeMax') ||
    new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString()

  try {
    const result = await corsairListEvents(accessToken, {
      timeMin,
      timeMax,
      maxResults: 50,
    })

    const events = result.items || []

    // Sync to DB
    const saved = await Promise.all(
      events.map(async (evt: any) => {
        const startTime = new Date(evt.start?.dateTime || evt.start?.date)
        const endTime = new Date(evt.end?.dateTime || evt.end?.date)
        const attendees = evt.attendees?.map((a: any) => a.email) || []
        const meetLink =
          evt.hangoutLink ||
          evt.conferenceData?.entryPoints?.find((e: any) => e.entryPointType === 'video')?.uri

        return prisma.calendarEvent.upsert({
          where: { googleId: evt.id },
          update: {
            title: evt.summary || '(no title)',
            description: evt.description,
            location: evt.location,
            startTime,
            endTime,
            allDay: !!evt.start?.date,
            attendees,
            meetLink,
            status: evt.status,
          },
          create: {
            googleId: evt.id,
            userId: session.user!.id!,
            title: evt.summary || '(no title)',
            description: evt.description,
            location: evt.location,
            startTime,
            endTime,
            allDay: !!evt.start?.date,
            attendees,
            meetLink,
            status: evt.status,
          },
        })
      })
    )

    return NextResponse.json({ events: saved })
  } catch (err: any) {
    console.error('Calendar GET error:', err)
    return NextResponse.json({ error: err.message }, { status: 500 })
  }
}
