import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/lib/auth'
import { prisma } from '@/lib/db'
import { getOrCreateUser } from '@/lib/getOrCreateUser'
import { corsairCreateEvent } from '@/lib/corsair'

export const dynamic = 'force-dynamic'

export async function POST(req: NextRequest) {
  const session = await auth()
  if (!session?.user?.email) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const accessToken = (session as any).accessToken
  if (!accessToken) return NextResponse.json({ error: 'No access token' }, { status: 401 })

  const user = await getOrCreateUser(session)
  if (!user) return NextResponse.json({ error: 'User not found' }, { status: 401 })

  const body = await req.json()
  const { title, description, location, startTime, endTime, attendees, addGoogleMeet } = body

  if (!title || !startTime || !endTime) {
    return NextResponse.json({ error: 'Missing required fields' }, { status: 400 })
  }

  try {
    const result = await corsairCreateEvent(accessToken, {
      title,
      description,
      location,
      startTime,
      endTime,
      attendees,
      addGoogleMeet: addGoogleMeet ?? true,
    })

    const event = await prisma.calendarEvent.create({
      data: {
        googleId: result.id,
        userId: user.id,
        title,
        description,
        location,
        startTime: new Date(startTime),
        endTime: new Date(endTime),
        attendees: attendees || [],
        meetLink: result.hangoutLink,
        status: result.status || 'confirmed',
      },
    })

    return NextResponse.json(event)
  } catch (err: any) {
    console.error('Create event error:', err)
    return NextResponse.json({ error: err.message }, { status: 500 })
  }
}
