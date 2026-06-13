import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/lib/auth'
import { prisma } from '@/lib/db'
import { getOrCreateUser } from '@/lib/getOrCreateUser'
import { corsairModifyEmail } from '@/lib/corsair'

export const dynamic = 'force-dynamic'

export async function GET(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await auth()
  if (!session?.user?.email) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { id } = await params
  const user = await getOrCreateUser(session)
  if (!user) return NextResponse.json({ error: 'User not found' }, { status: 401 })

  const email = await prisma.email.findFirst({ where: { id, userId: user.id } })
  if (!email) return NextResponse.json({ error: 'Not found' }, { status: 404 })

  if (!email.isRead) {
    await prisma.email.update({ where: { id }, data: { isRead: true } })
    const accessToken = (session as any).accessToken
    if (accessToken) {
      await corsairModifyEmail(accessToken, email.gmailId, [], ['UNREAD']).catch(() => {})
    }
  }

  return NextResponse.json(email)
}

export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await auth()
  if (!session?.user?.email) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { id } = await params
  const body = await req.json()
  const { isRead, isStarred, isArchived } = body

  const user = await getOrCreateUser(session)
  if (!user) return NextResponse.json({ error: 'User not found' }, { status: 401 })

  const email = await prisma.email.findFirst({ where: { id, userId: user.id } })
  if (!email) return NextResponse.json({ error: 'Not found' }, { status: 404 })

  const updated = await prisma.email.update({
    where: { id },
    data: {
      ...(isRead !== undefined && { isRead }),
      ...(isStarred !== undefined && { isStarred }),
      ...(isArchived !== undefined && { isArchived }),
    },
  })

  const accessToken = (session as any).accessToken
  if (accessToken) {
    const addLabels: string[] = []
    const removeLabels: string[] = []
    if (isRead === true) removeLabels.push('UNREAD')
    if (isRead === false) addLabels.push('UNREAD')
    if (isStarred === true) addLabels.push('STARRED')
    if (isStarred === false) removeLabels.push('STARRED')
    if (isArchived === true) removeLabels.push('INBOX')
    if (addLabels.length || removeLabels.length) {
      await corsairModifyEmail(accessToken, email.gmailId, addLabels, removeLabels).catch(() => {})
    }
  }

  return NextResponse.json(updated)
}

export async function DELETE(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await auth()
  if (!session?.user?.email) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { id } = await params
  const user = await getOrCreateUser(session)
  if (!user) return NextResponse.json({ error: 'User not found' }, { status: 401 })

  const email = await prisma.email.findFirst({ where: { id, userId: user.id } })
  if (!email) return NextResponse.json({ error: 'Not found' }, { status: 404 })

  const accessToken = (session as any).accessToken
  if (accessToken) {
    await corsairModifyEmail(accessToken, email.gmailId, ['TRASH'], ['INBOX']).catch(() => {})
  }

  await prisma.email.update({ where: { id }, data: { isArchived: true } })
  return NextResponse.json({ success: true })
}
