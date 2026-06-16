import { prisma } from './db'
import type { Session } from 'next-auth'

/**
 * Upsert the local User record from a NextAuth JWT session.
 * The `id` field on session.user is populated by our `session` callback.
 */
export async function getOrCreateUser(session: Session) {
  const googleId = (session.user as any)?.id as string | undefined
  const email = session.user?.email
  const name = session.user?.name ?? null
  const image = session.user?.image ?? null

  if (!googleId || !email) return null

  return prisma.user.upsert({
    where: { googleId },
    update: { name, image },
    create: { googleId, email, name, image },
  })
}
