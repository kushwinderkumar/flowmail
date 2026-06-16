'use client'

import { SessionProvider as NextAuthSessionProvider } from 'next-auth/react'

// No need to pass a server-side session — NextAuth handles client-side
// session fetching automatically via /api/auth/session.
export default function SessionProvider({ children }: { children: React.ReactNode }) {
  return <NextAuthSessionProvider>{children}</NextAuthSessionProvider>
}
