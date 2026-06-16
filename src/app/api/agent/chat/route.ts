import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/lib/auth'
import { prisma } from '@/lib/db'
import { getOrCreateUser } from '@/lib/getOrCreateUser'
import { processAgentMessage } from '@/lib/ai'
import { corsairSendEmail, corsairCreateEvent } from '@/lib/corsair'

export const dynamic = 'force-dynamic'

export async function POST(req: NextRequest) {
  const session = await auth()
  if (!session?.user?.email) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const { message } = (await req.json()) as { message?: string }
  if (!message?.trim()) {
    return NextResponse.json({ error: 'No message provided' }, { status: 400 })
  }

  const user = await getOrCreateUser(session)
  if (!user) return NextResponse.json({ error: 'User not found' }, { status: 401 })

  const accessToken = (session as any).accessToken as string | undefined

  // Load recent history (oldest-first for the AI)
  const historyRows = await prisma.chatMessage.findMany({
    where: { userId: user.id },
    orderBy: { createdAt: 'desc' },
    take: 10,
    select: { role: true, content: true },
  })
  const history = historyRows
    .reverse()
    .map((m) => ({ role: m.role as 'user' | 'assistant', content: m.content }))

  // Persist user message before calling AI (so it's in history on retry)
  await prisma.chatMessage.create({
    data: { userId: user.id, role: 'user', content: message },
  })

  const { text, actions } = await processAgentMessage(message, history, {
    userEmail: session.user.email,
  })

  // Execute AI-decided actions
  const actionResults: string[] = []
  if (accessToken && actions.length > 0) {
    for (const action of actions) {
      try {
        if (action.type === 'send_email') {
          const p = action.params as { to: string; subject: string; body: string }
          await corsairSendEmail(accessToken, { to: p.to, subject: p.subject, body: p.body })
          actionResults.push(`✅ Email sent to ${p.to}`)
        } else if (action.type === 'create_event') {
          const p = action.params as {
            title: string
            startTime: string
            endTime: string
            attendees?: string[]
            description?: string
          }
          await corsairCreateEvent(accessToken, {
            title: p.title,
            startTime: p.startTime,
            endTime: p.endTime,
            attendees: p.attendees ?? [],
            description: p.description,
            addGoogleMeet: true,
          })
          actionResults.push(`✅ Event created: "${p.title}"`)
        }
      } catch (err: unknown) {
        const msg = err instanceof Error ? err.message : 'Unknown error'
        actionResults.push(`❌ Action failed: ${msg}`)
      }
    }
  }

  const finalText =
    actionResults.length > 0 ? `${text}\n\n${actionResults.join('\n')}` : text

  await prisma.chatMessage.create({
    data: { userId: user.id, role: 'assistant', content: finalText },
  })

  return NextResponse.json({ text: finalText, actions })
}

export async function GET() {
  const session = await auth()
  if (!session?.user?.email) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const user = await getOrCreateUser(session)
  if (!user) return NextResponse.json({ messages: [] })

  const messages = await prisma.chatMessage.findMany({
    where: { userId: user.id },
    orderBy: { createdAt: 'asc' },
    take: 50,
    select: { id: true, role: true, content: true, createdAt: true },
  })

  return NextResponse.json({ messages })
}
