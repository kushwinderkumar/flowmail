import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/lib/auth'
import { prisma } from '@/lib/db'
import { getOrCreateUser } from '@/lib/getOrCreateUser'
import { processAgentMessage } from '@/lib/ai'
import { corsairSendEmail, corsairCreateEvent } from '@/lib/corsair'

export const dynamic = 'force-dynamic'

export async function POST(req: NextRequest) {
  const session = await auth()
  if (!session?.user?.email) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const accessToken = (session as any).accessToken
  const { message } = await req.json()

  if (!message?.trim()) {
    return NextResponse.json({ error: 'No message provided' }, { status: 400 })
  }

  const user = await getOrCreateUser(session)
  if (!user) return NextResponse.json({ error: 'User not found' }, { status: 401 })

  const history = await prisma.chatMessage.findMany({
    where: { userId: user.id },
    orderBy: { createdAt: 'desc' },
    take: 10,
  })
  const formattedHistory = history
    .reverse()
    .map((m) => ({ role: m.role as 'user' | 'assistant', content: m.content }))

  await prisma.chatMessage.create({
    data: { userId: user.id, role: 'user', content: message },
  })

  const { text, actions } = await processAgentMessage(message, formattedHistory, {
    userEmail: session.user.email || '',
  })

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

  await prisma.chatMessage.create({
    data: { userId: user.id, role: 'assistant', content: finalText },
  })

  return NextResponse.json({ text: finalText, actions })
}

export async function GET(req: NextRequest) {
  const session = await auth()
  if (!session?.user?.email) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const user = await getOrCreateUser(session)
  if (!user) return NextResponse.json({ messages: [] })

  const messages = await prisma.chatMessage.findMany({
    where: { userId: user.id },
    orderBy: { createdAt: 'asc' },
    take: 50,
  })

  return NextResponse.json({ messages })
}
