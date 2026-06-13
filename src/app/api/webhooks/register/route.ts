import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/lib/auth'
import { corsairRegisterWebhook } from '@/lib/corsair'

export async function POST(req: NextRequest) {
  const session = await auth()
  if (!session?.user?.id) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const accessToken = (session as any).accessToken
  if (!accessToken) return NextResponse.json({ error: 'No access token' }, { status: 401 })

  const appUrl = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'
  const webhookUrl = `${appUrl}/api/webhooks/corsair`

  try {
    const [gmailResult, calResult] = await Promise.allSettled([
      corsairRegisterWebhook({
        type: 'gmail',
        accessToken,
        webhookUrl,
        userId: session.user.id,
      }),
      corsairRegisterWebhook({
        type: 'calendar',
        accessToken,
        webhookUrl,
        userId: session.user.id,
      }),
    ])

    return NextResponse.json({
      gmail: gmailResult.status === 'fulfilled' ? 'registered' : 'failed',
      calendar: calResult.status === 'fulfilled' ? 'registered' : 'failed',
      webhookUrl,
    })
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 })
  }
}
