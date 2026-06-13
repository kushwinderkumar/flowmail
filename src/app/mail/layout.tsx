import { redirect } from 'next/navigation'
import { auth } from '@/lib/auth'
import Sidebar from '@/components/mail/Sidebar'
import KeyboardShortcutsProvider from '@/components/providers/KeyboardShortcutsProvider'
import CommandPalette from '@/components/mail/CommandPalette'
import AgentChatPanel from '@/components/mail/AgentChatPanel'

export default async function MailLayout({ children }: { children: React.ReactNode }) {
  const session = await auth()
  if (!session) redirect('/auth/signin')

  return (
    <KeyboardShortcutsProvider>
      <div className="flex h-screen overflow-hidden bg-[#0f0f0f]">
        <Sidebar user={session.user} />
        <main className="flex-1 overflow-hidden relative">{children}</main>
        <CommandPalette />
        <AgentChatPanel />
      </div>
    </KeyboardShortcutsProvider>
  )
}
