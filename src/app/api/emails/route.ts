import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/lib/auth'
import { prisma } from '@/lib/db'
import { corsairListEmails, corsairGetEmail } from '@/lib/corsair'
import { classifyEmailPriority } from '@/lib/ai'

export async function GET(req: NextRequest) {
  const session = await auth()
  if (!session?.user?.id) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const { searchParams } = new URL(req.url)
  const folder = searchParams.get('folder') || 'inbox'
  const pageToken = searchParams.get('pageToken') || undefined
  const query = searchParams.get('q') || undefined
  const limit = parseInt(searchParams.get('limit') || '20')

  try {
    const accessToken = (session as any).accessToken
    if (!accessToken) {
      return NextResponse.json({ error: 'No access token' }, { status: 401 })
    }

    // Map folder to Gmail label
    const labelMap: Record<string, string[]> = {
      inbox: ['INBOX'],
      sent: ['SENT'],
      starred: ['STARRED'],
      trash: ['TRASH'],
      spam: ['SPAM'],
    }

    const corsairResult = await corsairListEmails(accessToken, {
      maxResults: limit,
      pageToken,
      q: query,
      labelIds: labelMap[folder] || ['INBOX'],
    })

    const messageIds: string[] = corsairResult.messages?.map((m: any) => m.id) || []

    // Fetch full email details & sync to DB
    const emails = await Promise.all(
      messageIds.map(async (id) => {
        // Check cache first
        const cached = await prisma.email.findUnique({ where: { gmailId: id } })
        if (cached) return cached

        // Fetch from Corsair/Gmail
        const msg = await corsairGetEmail(accessToken, id)
        const headers = msg.payload?.headers || []
        const getHeader = (name: string) =>
          headers.find((h: any) => h.name.toLowerCase() === name.toLowerCase())?.value || ''

        const subject = getHeader('subject') || '(no subject)'
        const from = getHeader('from') || ''
        const to = getHeader('to') || ''
        const dateStr = getHeader('date')
        const receivedAt = dateStr ? new Date(dateStr) : new Date()

        // Extract body
        let body = ''
        let bodyHtml = ''
        const extractBody = (part: any): void => {
          if (part.mimeType === 'text/plain' && part.body?.data) {
            body = Buffer.from(part.body.data, 'base64').toString('utf-8')
          } else if (part.mimeType === 'text/html' && part.body?.data) {
            bodyHtml = Buffer.from(part.body.data, 'base64').toString('utf-8')
          }
          if (part.parts) part.parts.forEach(extractBody)
        }
        extractBody(msg.payload || {})

        // AI priority classification
        const priority = await classifyEmailPriority(
          subject,
          msg.snippet || '',
          from
        )

        const email = await prisma.email.upsert({
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
            body,
            bodyHtml,
            labels: msg.labelIds || [],
            isRead: !msg.labelIds?.includes('UNREAD'),
            receivedAt,
            priority,
          },
        })
        return email
      })
    )

    return NextResponse.json({
      emails,
      nextPageToken: corsairResult.nextPageToken || null,
      resultSizeEstimate: corsairResult.resultSizeEstimate || emails.length,
    })
  } catch (err: any) {
    console.error('GET /api/emails error:', err)
    return NextResponse.json({ error: err.message }, { status: 500 })
  }
}
