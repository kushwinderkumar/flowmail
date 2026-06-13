'use client'

import { useState, useEffect, useRef } from 'react'
import { useRouter } from 'next/navigation'
import { useKeyboardShortcuts } from '@/components/providers/KeyboardShortcutsProvider'
import { cn } from '@/lib/utils'
import {
  Inbox, Send, Star, Search, Calendar, Pen, Bot,
  Archive, LogOut, Keyboard
} from 'lucide-react'

interface Command {
  id: string
  label: string
  description?: string
  icon: React.ReactNode
  shortcut?: string
  action: () => void
  category: string
}

export default function CommandPalette() {
  const { isCommandPaletteOpen, setIsCommandPaletteOpen, setIsComposeOpen, setIsAgentOpen } = useKeyboardShortcuts()
  const router = useRouter()
  const [query, setQuery] = useState('')
  const [selectedIdx, setSelectedIdx] = useState(0)
  const inputRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    if (isCommandPaletteOpen) {
      setQuery('')
      setSelectedIdx(0)
      setTimeout(() => inputRef.current?.focus(), 50)
    }
  }, [isCommandPaletteOpen])

  const commands: Command[] = [
    {
      id: 'compose',
      label: 'Compose new email',
      icon: <Pen size={14} />,
      shortcut: 'C',
      action: () => { setIsCommandPaletteOpen(false); setIsComposeOpen(true) },
      category: 'Actions',
    },
    {
      id: 'agent',
      label: 'Open AI Agent',
      description: 'Chat to send emails or create events',
      icon: <Bot size={14} />,
      shortcut: '⌘K',
      action: () => { setIsCommandPaletteOpen(false); setIsAgentOpen(true) },
      category: 'Actions',
    },
    {
      id: 'inbox',
      label: 'Go to Inbox',
      icon: <Inbox size={14} />,
      shortcut: 'G I',
      action: () => { setIsCommandPaletteOpen(false); router.push('/mail/inbox') },
      category: 'Navigate',
    },
    {
      id: 'sent',
      label: 'Go to Sent',
      icon: <Send size={14} />,
      shortcut: 'G S',
      action: () => { setIsCommandPaletteOpen(false); router.push('/mail/sent') },
      category: 'Navigate',
    },
    {
      id: 'starred',
      label: 'Go to Starred',
      icon: <Star size={14} />,
      shortcut: 'G T',
      action: () => { setIsCommandPaletteOpen(false); router.push('/mail/starred') },
      category: 'Navigate',
    },
    {
      id: 'search',
      label: 'Search emails',
      icon: <Search size={14} />,
      shortcut: '/',
      action: () => { setIsCommandPaletteOpen(false); router.push('/mail/search') },
      category: 'Navigate',
    },
    {
      id: 'calendar',
      label: 'Go to Calendar',
      icon: <Calendar size={14} />,
      shortcut: 'G C',
      action: () => { setIsCommandPaletteOpen(false); router.push('/calendar') },
      category: 'Navigate',
    },
    {
      id: 'shortcuts',
      label: 'View keyboard shortcuts',
      icon: <Keyboard size={14} />,
      shortcut: '?',
      action: () => {},
      category: 'Help',
    },
  ]

  const filtered = query
    ? commands.filter(
        (c) =>
          c.label.toLowerCase().includes(query.toLowerCase()) ||
          c.description?.toLowerCase().includes(query.toLowerCase())
      )
    : commands

  useEffect(() => { setSelectedIdx(0) }, [query])

  useEffect(() => {
    if (!isCommandPaletteOpen) return
    const handler = (e: KeyboardEvent) => {
      if (e.key === 'ArrowDown') { e.preventDefault(); setSelectedIdx((i) => Math.min(i + 1, filtered.length - 1)) }
      if (e.key === 'ArrowUp') { e.preventDefault(); setSelectedIdx((i) => Math.max(i - 1, 0)) }
      if (e.key === 'Enter') { e.preventDefault(); filtered[selectedIdx]?.action() }
    }
    window.addEventListener('keydown', handler)
    return () => window.removeEventListener('keydown', handler)
  }, [isCommandPaletteOpen, filtered, selectedIdx])

  if (!isCommandPaletteOpen) return null

  const categories = [...new Set(filtered.map((c) => c.category))]

  return (
    <div className="fixed inset-0 z-50 flex items-start justify-center pt-[20vh]">
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-black/60 backdrop-blur-sm"
        onClick={() => setIsCommandPaletteOpen(false)}
      />

      {/* Palette */}
      <div className="relative w-full max-w-lg bg-[#1a1a1a] border border-[#2a2a2a] rounded-2xl shadow-2xl overflow-hidden animate-slide-up">
        {/* Search input */}
        <div className="flex items-center gap-3 px-4 py-3.5 border-b border-[#2a2a2a]">
          <Search size={14} className="text-gray-500" />
          <input
            ref={inputRef}
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Type a command or search..."
            className="flex-1 bg-transparent text-sm text-white placeholder-gray-500 outline-none"
          />
          <span className="text-xs text-gray-600 kbd">Esc</span>
        </div>

        {/* Commands */}
        <div className="max-h-80 overflow-y-auto py-2">
          {filtered.length === 0 ? (
            <div className="px-4 py-8 text-center text-sm text-gray-500">No commands found</div>
          ) : (
            categories.map((category) => (
              <div key={category}>
                <div className="px-4 py-1.5 text-[10px] font-medium text-gray-600 uppercase tracking-wider">
                  {category}
                </div>
                {filtered
                  .filter((c) => c.category === category)
                  .map((cmd) => {
                    const idx = filtered.indexOf(cmd)
                    return (
                      <button
                        key={cmd.id}
                        onClick={cmd.action}
                        onMouseEnter={() => setSelectedIdx(idx)}
                        className={cn(
                          'w-full flex items-center gap-3 px-4 py-2.5 text-left transition-colors cursor-pointer',
                          idx === selectedIdx ? 'bg-[#2a2a2a]' : 'hover:bg-[#222]'
                        )}
                      >
                        <span className="text-gray-400">{cmd.icon}</span>
                        <div className="flex-1 min-w-0">
                          <p className="text-sm text-white">{cmd.label}</p>
                          {cmd.description && (
                            <p className="text-xs text-gray-500 truncate">{cmd.description}</p>
                          )}
                        </div>
                        {cmd.shortcut && (
                          <span className="text-[10px] text-gray-600 kbd shrink-0">{cmd.shortcut}</span>
                        )}
                      </button>
                    )
                  })}
              </div>
            ))
          )}
        </div>

        <div className="px-4 py-2 border-t border-[#2a2a2a] flex gap-3 text-[10px] text-gray-600">
          <span><span className="kbd">↑↓</span> navigate</span>
          <span><span className="kbd">Enter</span> select</span>
          <span><span className="kbd">Esc</span> close</span>
        </div>
      </div>
    </div>
  )
}
