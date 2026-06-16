import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/lib/auth'
import { prisma } from '@/lib/db'
import { getOrCreateUser } from '@/lib/getOrCreateUser'
import { corsairListEmails, corsairGetEmail } from '@/lib/corsair'
import { classifyEmailPriority } from '@/lib/ai'

export const dynamic = 'force-dynamic'

const LABEL_MAP: Record<string, string[]> = {
  inbox: ['INBOX'],
  sent: ['SENT'],
  starred: ['STARRED'],
  trash: ['TRASH'],
  spam: ['SPAM'],
}

function extractHeader(headers: Array<{ name: string; value: string }>, name: string): string {
  return headers.find((h) => h.name.toLowerCase() === name.toLowerCase())?.value ?? ''
}

function extractBody(part: any): { text: string; html: string } {
  let text = ''
  let html = ''
  const decode = (data: string) => Buffer.from(data, 'base64').toString('utf-8')
  if (part.mimeType === 'text/plain' && part.body?.data) text = decode(part.body.data)
  else if (part.mimeType === 'text/html' && part.body?.data) html = decode(part.body.data)
  if (part.parts) {
    for (const child of part.parts) {
      const sub = extractBody(child)
      if (!text && sub.text) text = sub.text
      if (!html && sub.html) html = sub.html
    }
  }
  return { text, html }
}

export async function GET(req: NextRequest) {
  const session = await auth()
  if (!session?.user?.email) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const accessToken = (session as any).accessToken as string | undefined
  if (!accessToken) {
    return NextResponse.json({ error: 'No access token' }, { status: 401 })
  }

  const { searchParams } = new URL(req.url)
  const folder = searchParams.get('folder') ?? 'inbox'
  const pageToken = searchParams.get('pageToken') ?? undefined
  const q = searchParams.get('q') ?? undefined
  const limit = Math.min(parseInt(searchParams.get('limit') ?? '20', 10), 50)

  try {
    const user = await getOrCreateUser(session)
    if (!user) return NextResponse.json({ error: 'User not found' }, { status: 401 })

    const corsairResult = (await corsairListEmails(accessToken, {
      maxResults: limit,
      pageToken,
      q,
      labelIds: LABEL_MAP[folder] ?? ['INBOX'],
    })) as any

    const messageIds: string[] = corsairResult.messages?.map((m: any) => m.id) ?? []

    // Batch-fetch cached emails to avoid N+1 queries
    const cachedEmails = await prisma.email.findMany({
      where: { gmailId: { in: messageIds } },
    })
    const cachedMap = new Map(cachedEmails.map((e) => [e.gmailId, e]))

    const uncachedIds = messageIds.filter((id) => !cachedMap.has(id))

    // Fetch & classify missing emails (parallelised)
    const fetchedEmails = await Promise.all(
      uncachedIds.map(async (id) => {
        const msg = (await corsairGetEmail(accessToken, id)) as any
        const headers: Array<{ name: string; value: string }> = msg.payload?.headers ?? []
        const subject = extractHeader(headers, 'subject') || '(no subject)'
        const from = extractHeader(headers, 'from')
        const to = extractHeader(headers, 'to')
        const dateStr = extractHeader(headers, 'date')
        const receivedAt = dateStr ? new Date(dateStr) : new Date()
        const { text: body, html: bodyHtml } = extractBody(msg.payload ?? {})
        const priority = await classifyEmailPriority(subject, msg.snippet ?? '', from)

        return prisma.email.upsert({
          where: { gmailId: id },
          update: {},
          create: {
            gmailId: id,
            threadId: msg.threadId ?? null,
            userId: user.id,
            from,
            to,
            subject,
            snippet: msg.snippet ?? '',
            body: body || null,
            bodyHtml: bodyHtml || null,
            labels: msg.labelIds ?? [],
            isRead: !(msg.labelIds as string[])?.includes('UNREAD'),
            receivedAt,
            priority,
          },
        })
      }),
    )

    // Merge cached + fetched, preserving original order
    const fetchedMap = new Map(fetchedEmails.map((e) => [e.gmailId, e]))
    const emails = messageIds.map((id) => cachedMap.get(id) ?? fetchedMap.get(id)).filter(Boolean)

    return NextResponse.json({
      emails,
      nextPageToken: corsairResult.nextPageToken ?? null,
      resultSizeEstimate: corsairResult.resultSizeEstimate ?? emails.length,
    })
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : 'Unknown error'
    console.error('GET /api/emails error:', err)
    return NextResponse.json({ error: msg }, { status: 500 })
  }
}
