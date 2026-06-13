import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/lib/auth'
import { prisma } from '@/lib/db'
import { corsairSearchEmails, corsairGetEmail } from '@/lib/corsair'
import { classifyEmailPriority } from '@/lib/ai'

export async function GET(req: NextRequest) {
  const session = await auth()
  if (!session?.user?.id) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { searchParams } = new URL(req.url)
  const query = searchParams.get('q') || ''
  if (!query) return NextResponse.json({ emails: [] })

  const accessToken = (session as any).accessToken

  try {
    // First search local DB (fast)
    const localResults = await prisma.email.findMany({
      where: {
        userId: session.user.id,
        OR: [
          { subject: { contains: query, mode: 'insensitive' } },
          { from: { contains: query, mode: 'insensitive' } },
          { snippet: { contains: query, mode: 'insensitive' } },
          { body: { contains: query, mode: 'insensitive' } },
        ],
      },
      orderBy: { receivedAt: 'desc' },
      take: 20,
    })

    if (localResults.length >= 5) {
      return NextResponse.json({ emails: localResults, source: 'local' })
    }

    // Fall back to Corsair search API
    if (accessToken) {
      const corsairResult = await corsairSearchEmails(accessToken, query, 20)
      const messageIds: string[] = corsairResult.messages?.map((m: any) => m.id) || []

      const emails = await Promise.all(
        messageIds.map(async (id) => {
          const cached = await prisma.email.findUnique({ where: { gmailId: id } })
          if (cached) return cached

          const msg = await corsairGetEmail(accessToken, id)
          const headers = msg.payload?.headers || []
          const getHeader = (name: string) =>
            headers.find((h: any) => h.name.toLowerCase() === name.toLowerCase())?.value || ''

          const subject = getHeader('subject') || '(no subject)'
          const from = getHeader('from') || ''
          const to = getHeader('to') || ''
          const dateStr = getHeader('date')
          const receivedAt = dateStr ? new Date(dateStr) : new Date()
          const priority = await classifyEmailPriority(subject, msg.snippet || '', from)

          return prisma.email.upsert({
            where: { gmailId: id },
            update: {},
            create: {
              gmailId: id,
              threadId: msg.threadId,
              userId: session.user!.id!,
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
        })
      )

      return NextResponse.json({ emails, source: 'corsair' })
    }

    return NextResponse.json({ emails: localResults, source: 'local' })
  } catch (err: any) {
    console.error('Search error:', err)
    return NextResponse.json({ error: err.message }, { status: 500 })
  }
}
