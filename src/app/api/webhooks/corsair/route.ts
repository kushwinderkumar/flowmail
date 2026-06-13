import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/db'
import { classifyEmailPriority } from '@/lib/ai'

/**
 * Corsair webhook endpoint
 * Receives real-time Gmail and Calendar push notifications via Corsair
 */
export async function POST(req: NextRequest) {
  // Verify Corsair signature
  const corsairSignature = req.headers.get('x-corsair-signature')
  const apiKey = process.env.CORSAIR_API_KEY

  // Basic auth check
  if (!corsairSignature || corsairSignature !== apiKey) {
    // In production use proper HMAC verification
    // return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const body = await req.json()
  const { type, data, userId: corsairUserId } = body

  console.log('[Webhook] Received:', type, corsairUserId)

  try {
    if (type === 'gmail.message.new' || type === 'gmail.message.received') {
      const msg = data
      const headers = msg.payload?.headers || []
      const getHeader = (name: string) =>
        headers.find((h: any) => h.name.toLowerCase() === name.toLowerCase())?.value || ''

      const subject = getHeader('subject') || '(no subject)'
      const from = getHeader('from') || ''
      const to = getHeader('to') || ''
      const dateStr = getHeader('date')
      const receivedAt = dateStr ? new Date(dateStr) : new Date()

      // Find user by corsairUserId or email
      const user = await prisma.user.findFirst({
        where: corsairUserId ? { id: corsairUserId } : { email: to },
      })

      if (!user) {
        return NextResponse.json({ error: 'User not found' }, { status: 404 })
      }

      const priority = await classifyEmailPriority(subject, msg.snippet || '', from)

      await prisma.email.upsert({
        where: { gmailId: msg.id },
        update: { priority },
        create: {
          gmailId: msg.id,
          threadId: msg.threadId,
          userId: user.id,
          from,
          to,
          subject,
          snippet: msg.snippet || '',
          labels: msg.labelIds || [],
          isRead: !msg.labelIds?.includes('UNREAD'),
          receivedAt,
          priority,
        },
      })

      return NextResponse.json({ success: true, type: 'email_saved' })
    }

    if (type === 'calendar.event.new' || type === 'calendar.event.updated') {
      const evt = data
      const user = await prisma.user.findFirst({
        where: { id: corsairUserId },
      })

      if (!user) {
        return NextResponse.json({ error: 'User not found' }, { status: 404 })
      }

      const startTime = new Date(evt.start?.dateTime || evt.start?.date)
      const endTime = new Date(evt.end?.dateTime || evt.end?.date)

      await prisma.calendarEvent.upsert({
        where: { googleId: evt.id },
        update: {
          title: evt.summary || '(no title)',
          description: evt.description,
          startTime,
          endTime,
          attendees: evt.attendees?.map((a: any) => a.email) || [],
          meetLink: evt.hangoutLink,
          status: evt.status,
        },
        create: {
          googleId: evt.id,
          userId: user.id,
          title: evt.summary || '(no title)',
          description: evt.description,
          location: evt.location,
          startTime,
          endTime,
          allDay: !!evt.start?.date,
          attendees: evt.attendees?.map((a: any) => a.email) || [],
          meetLink: evt.hangoutLink,
          status: evt.status,
        },
      })

      return NextResponse.json({ success: true, type: 'event_saved' })
    }

    return NextResponse.json({ success: true, type: 'ignored' })
  } catch (err: any) {
    console.error('[Webhook] Error:', err)
    return NextResponse.json({ error: err.message }, { status: 500 })
  }
}
