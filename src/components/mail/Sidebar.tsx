'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { signOut } from 'next-auth/react'
import { cn, getInitials } from '@/lib/utils'
import {
  Inbox, Send, Star, Search, Calendar, Bot, LogOut, Pen, Settings
} from 'lucide-react'
import { useKeyboardShortcuts } from '@/components/providers/KeyboardShortcutsProvider'
import { useState } from 'react'
import ComposeModal from './ComposeModal'

const navItems = [
  { href: '/mail/inbox', icon: Inbox, label: 'Inbox', shortcut: 'G I' },
  { href: '/mail/sent', icon: Send, label: 'Sent', shortcut: 'G S' },
  { href: '/mail/starred', icon: Star, label: 'Starred', shortcut: 'G T' },
  { href: '/mail/search', icon: Search, label: 'Search', shortcut: '/' },
  { href: '/calendar', icon: Calendar, label: 'Calendar', shortcut: 'G C' },
]

export default function Sidebar({ user }: { user: any }) {
  const pathname = usePathname()
  const { openCompose, openAgent } = useKeyboardShortcuts()
  const [showCompose, setShowCompose] = useState(false)

  return (
    <>
      <aside className="w-56 flex flex-col border-r border-[#1e1e1e] bg-[#111111] h-full shrink-0">
        {/* Logo */}
        <div className="px-4 py-4 border-b border-[#1e1e1e]">
          <div className="flex items-center gap-2">
            <div className="w-7 h-7 rounded-md bg-blue-500 flex items-center justify-center text-white font-bold text-xs">
              FM
            </div>
            <span className="font-semibold text-white text-sm">FlowMail</span>
          </div>
        </div>

        {/* Compose */}
        <div className="px-3 pt-4 pb-2">
          <button
            onClick={() => setShowCompose(true)}
            className="w-full flex items-center gap-2 bg-blue-500 hover:bg-blue-600 text-white text-sm font-medium px-3 py-2 rounded-lg transition-colors cursor-pointer"
          >
            <Pen size={14} />
            Compose
            <span className="ml-auto text-blue-200 text-xs">C</span>
          </button>
        </div>

        {/* Nav */}
        <nav className="flex-1 px-2 py-1 space-y-0.5">
          {navItems.map((item) => {
            const isActive = pathname === item.href || pathname.startsWith(item.href + '/')
            return (
              <Link
                key={item.href}
                href={item.href}
                className={cn(
                  'flex items-center gap-2.5 px-3 py-2 rounded-lg text-sm transition-colors group',
                  isActive
                    ? 'bg-[#1e1e1e] text-white'
                    : 'text-gray-400 hover:text-white hover:bg-[#1a1a1a]'
                )}
              >
                <item.icon size={15} />
                <span className="flex-1">{item.label}</span>
                <span className="opacity-0 group-hover:opacity-100 text-[10px] text-gray-600 transition-opacity">
                  {item.shortcut}
                </span>
              </Link>
            )
          })}
        </nav>

        {/* AI Agent button */}
        <div className="px-2 pb-2">
          <button
            onClick={openAgent}
            className="w-full flex items-center gap-2.5 px-3 py-2 rounded-lg text-sm text-gray-400 hover:text-white hover:bg-[#1a1a1a] transition-colors cursor-pointer"
          >
            <Bot size={15} />
            <span className="flex-1 text-left">AI Agent</span>
            <span className="text-[10px] text-gray-600">⌘K</span>
          </button>
        </div>

        {/* User */}
        <div className="border-t border-[#1e1e1e] p-3">
          <div className="flex items-center gap-2">
            {user?.image ? (
              <img src={user.image} alt={user.name} className="w-7 h-7 rounded-full" />
            ) : (
              <div className="w-7 h-7 rounded-full bg-blue-500/20 text-blue-400 text-xs font-bold flex items-center justify-center">
                {getInitials(user?.name || 'U')}
              </div>
            )}
            <div className="flex-1 min-w-0">
              <p className="text-xs font-medium text-white truncate">{user?.name}</p>
              <p className="text-[10px] text-gray-500 truncate">{user?.email}</p>
            </div>
            <button
              onClick={() => signOut({ callbackUrl: '/auth/signin' })}
              className="text-gray-600 hover:text-gray-300 transition-colors cursor-pointer"
              title="Sign out"
            >
              <LogOut size={13} />
            </button>
          </div>
        </div>
      </aside>

      {showCompose && <ComposeModal onClose={() => setShowCompose(false)} />}
    </>
  )
}
