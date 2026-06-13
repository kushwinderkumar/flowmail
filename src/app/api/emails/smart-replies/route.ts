import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/lib/auth'
import { generateSmartReplies } from '@/lib/ai'

export const dynamic = 'force-dynamic'

export async function POST(req: NextRequest) {
  const session = await auth()
  if (!session?.user?.id) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { subject, body } = await req.json()
  const replies = await generateSmartReplies(subject, body)
  return NextResponse.json({ replies })
}
