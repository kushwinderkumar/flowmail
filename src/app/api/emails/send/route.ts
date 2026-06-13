import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/lib/auth'
import { corsairSendEmail } from '@/lib/corsair'

export const dynamic = 'force-dynamic'

export async function POST(req: NextRequest) {
  const session = await auth()
  if (!session?.user?.id) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const accessToken = (session as any).accessToken
  if (!accessToken) {
    return NextResponse.json({ error: 'No access token' }, { status: 401 })
  }

  const body = await req.json()
  const { to, subject, message, cc, bcc, replyToMessageId, threadId } = body

  if (!to || !subject || !message) {
    return NextResponse.json({ error: 'Missing required fields' }, { status: 400 })
  }

  try {
    const result = await corsairSendEmail(accessToken, {
      to,
      subject,
      body: message,
      cc,
      bcc,
      replyToMessageId,
      threadId,
    })
    return NextResponse.json({ success: true, messageId: result.id })
  } catch (err: any) {
    console.error('Send email error:', err)
    return NextResponse.json({ error: err.message }, { status: 500 })
  }
}
