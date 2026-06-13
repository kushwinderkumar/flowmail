import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/lib/auth'
import { prisma } from '@/lib/db'
import { getOrCreateUser } from '@/lib/getOrCreateUser'
import { corsairUpdateEvent, corsairDeleteEvent } from '@/lib/corsair'

export const dynamic = 'force-dynamic'

export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await auth()
  if (!session?.user?.email) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { id } = await params
  const body = await req.json()
  const accessToken = (session as any).accessToken

  const user = await getOrCreateUser(session)
  if (!user) return NextResponse.json({ error: 'User not found' }, { status: 401 })

  const event = await prisma.calendarEvent.findFirst({ where: { id, userId: user.id } })
  if (!event) return NextResponse.json({ error: 'Not found' }, { status: 404 })

  if (accessToken) {
    await corsairUpdateEvent(accessToken, event.googleId, body).catch(() => {})
  }

  const updated = await prisma.calendarEvent.update({
    where: { id },
    data: {
      ...(body.title && { title: body.title }),
      ...(body.description !== undefined && { description: body.description }),
      ...(body.startTime && { startTime: new Date(body.startTime) }),
      ...(body.endTime && { endTime: new Date(body.endTime) }),
      ...(body.attendees && { attendees: body.attendees }),
    },
  })

  return NextResponse.json(updated)
}

export async function DELETE(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await auth()
  if (!session?.user?.email) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { id } = await params
  const accessToken = (session as any).accessToken

  const user = await getOrCreateUser(session)
  if (!user) return NextResponse.json({ error: 'User not found' }, { status: 401 })

  const event = await prisma.calendarEvent.findFirst({ where: { id, userId: user.id } })
  if (!event) return NextResponse.json({ error: 'Not found' }, { status: 404 })

  if (accessToken) {
    await corsairDeleteEvent(accessToken, event.googleId).catch(() => {})
  }

  await prisma.calendarEvent.delete({ where: { id } })
  return NextResponse.json({ success: true })
}
