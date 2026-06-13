import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/lib/auth'
import { corsairRegisterWebhook } from '@/lib/corsair'

/**
 * Called after sign-in to register webhooks and do initial setup
 */
export async function POST(req: NextRequest) {
  const session = await auth()
  if (!session?.user?.id) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const accessToken = (session as any).accessToken
  const appUrl = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'

  const results: Record<string, string> = {}

  // Register Corsair webhooks for real-time updates
  if (accessToken) {
    try {
      await corsairRegisterWebhook({
        type: 'gmail',
        accessToken,
        webhookUrl: `${appUrl}/api/webhooks/corsair`,
        userId: session.user.id,
      })
      results.gmail_webhook = 'registered'
    } catch (e: any) {
      results.gmail_webhook = `failed: ${e.message}`
    }

    try {
      await corsairRegisterWebhook({
        type: 'calendar',
        accessToken,
        webhookUrl: `${appUrl}/api/webhooks/corsair`,
        userId: session.user.id,
      })
      results.calendar_webhook = 'registered'
    } catch (e: any) {
      results.calendar_webhook = `failed: ${e.message}`
    }
  }

  return NextResponse.json({ success: true, results })
}
