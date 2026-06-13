import { prisma } from './db'

export async function getOrCreateUser(session: any) {
  const googleId = session.user?.id || session.user?.sub
  const email = session.user?.email
  const name = session.user?.name
  const image = session.user?.image

  if (!googleId || !email) return null

  return prisma.user.upsert({
    where: { googleId },
    update: { name, image },
    create: { googleId, email, name, image },
  })
}
