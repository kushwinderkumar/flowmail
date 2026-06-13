import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/lib/auth'
import { prisma } from '@/lib/db'
import { processAgentMessage } from '@/lib/ai'
import { corsairSendEmail, corsairCreateEvent } from '@/lib/corsair'

export async function POST(req: NextRequest) {
  const session = await auth()
  if (!session?.user?.id) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const accessToken = (session as any).accessToken
  const { message } = await req.json()

  if (!message?.trim()) {
    return NextResponse.json({ error: 'No message provided' }, { status: 400 })
  }

  // Load conversation history
  const history = await prisma.chatMessage.findMany({
    where: { userId: session.user.id },
    orderBy: { createdAt: 'desc' },
    take: 10,
  })
  const formattedHistory = history
    .reverse()
    .map((m) => ({ role: m.role as 'user' | 'assistant', content: m.content }))

  // Save user message
  await prisma.chatMessage.create({
    data: { userId: session.user.id, role: 'user', content: message },
  })

  // Process with AI
  const { text, actions } = await processAgentMessage(message, formattedHistory, {
    userEmail: session.user.email || '',
  })

  // Execute actions
  const results: string[] = []
  if (accessToken && actions) {
    for (const action of actions) {
      try {
        if (action.type === 'send_email') {
          await corsairSendEmail(accessToken, {
            to: action.params.to,
            subject: action.params.subject,
            body: action.params.body,
          })
          results.push(`✅ Email sent to ${action.params.to}`)
        } else if (action.type === 'create_event') {
          await corsairCreateEvent(accessToken, {
            title: action.params.title,
            startTime: action.params.startTime,
            endTime: action.params.endTime,
            attendees: action.params.attendees || [],
            description: action.params.description,
            addGoogleMeet: true,
          })
          results.push(`✅ Calendar event created: "${action.params.title}"`)
        }
      } catch (err: any) {
        results.push(`❌ Action failed: ${err.message}`)
      }
    }
  }

  const finalText = results.length > 0 ? `${text}\n\n${results.join('\n')}` : text

  // Save assistant response
  await prisma.chatMessage.create({
    data: { userId: session.user.id, role: 'assistant', content: finalText },
  })

  return NextResponse.json({
    text: finalText,
    actions,
  })
}

export async function GET(req: NextRequest) {
  const session = await auth()
  if (!session?.user?.id) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const messages = await prisma.chatMessage.findMany({
    where: { userId: session.user.id },
    orderBy: { createdAt: 'asc' },
    take: 50,
  })

  return NextResponse.json({ messages })
}
