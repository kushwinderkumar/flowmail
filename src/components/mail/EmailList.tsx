'use client'

import { useState, useEffect, useCallback, useRef } from 'react'
import { cn, formatEmailDate, parseEmailAddress, priorityColor, priorityBg, getInitials } from '@/lib/utils'
import { Star, Archive, Trash2, RefreshCw } from 'lucide-react'
import toast from 'react-hot-toast'
import EmailDetail from './EmailDetail'
import ComposeModal from './ComposeModal'
import { useKeyboardShortcuts } from '@/components/providers/KeyboardShortcutsProvider'

interface Email {
  id: string
  from: string
  subject: string
  snippet: string
  isRead: boolean
  isStarred: boolean
  isArchived: boolean
  priority: string | null
  receivedAt: string
  labels: string[]
}

export default function EmailList({ folder, title }: { folder: string; title: string }) {
  const [emails, setEmails] = useState<Email[]>([])
  const [loading, setLoading] = useState(true)
  const [selectedIdx, setSelectedIdx] = useState(0)
  const [openEmail, setOpenEmail] = useState<Email | null>(null)
  const [showCompose, setShowCompose] = useState(false)
  const [filter, setFilter] = useState<'all' | 'high' | 'unread'>('all')
  const listRef = useRef<HTMLDivElement>(null)
  const { setIsComposeOpen, isComposeOpen } = useKeyboardShortcuts()

  const fetchEmails = useCallback(async () => {
    setLoading(true)
    try {
      const res = await fetch(`/api/emails?folder=${folder}&limit=30`)
      const data = await res.json()
      if (data.emails) setEmails(data.emails)
    } catch {
      toast.error('Failed to load emails')
    } finally {
      setLoading(false)
    }
  }, [folder])

  useEffect(() => { fetchEmails() }, [fetchEmails])

  // Keyboard navigation
  useEffect(() => {
    if (openEmail) return
    const handler = (e: KeyboardEvent) => {
      const tag = (e.target as HTMLElement).tagName.toLowerCase()
      if (tag === 'input' || tag === 'textarea') return
      switch (e.key) {
        case 'j': case 'ArrowDown':
          e.preventDefault()
          setSelectedIdx((i) => Math.min(i + 1, filtered.length - 1))
          break
        case 'k': case 'ArrowUp':
          e.preventDefault()
          setSelectedIdx((i) => Math.max(i - 1, 0))
          break
        case 'Enter':
          e.preventDefault()
          if (filtered[selectedIdx]) setOpenEmail(filtered[selectedIdx])
          break
        case 'e':
          e.preventDefault()
          if (filtered[selectedIdx]) handleArchive(filtered[selectedIdx].id)
          break
        case 's':
          e.preventDefault()
          if (filtered[selectedIdx]) handleStar(filtered[selectedIdx].id)
          break
        case 'r':
          e.preventDefault()
          fetchEmails()
          break
      }
    }
    window.addEventListener('keydown', handler)
    return () => window.removeEventListener('keydown', handler)
  }, [selectedIdx, openEmail])

  const filtered = emails.filter((e) => {
    if (filter === 'high') return e.priority === 'high'
    if (filter === 'unread') return !e.isRead
    return true
  })

  const handleArchive = async (id: string) => {
    await fetch(`/api/emails/${id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ isArchived: true }),
    })
    setEmails((prev) => prev.filter((e) => e.id !== id))
    toast.success('Archived')
  }

  const handleStar = async (id: string) => {
    const email = emails.find((e) => e.id === id)
    if (!email) return
    await fetch(`/api/emails/${id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ isStarred: !email.isStarred }),
    })
    setEmails((prev) =>
      prev.map((e) => (e.id === id ? { ...e, isStarred: !e.isStarred } : e))
    )
  }

  const handleMarkRead = async (id: string) => {
    await fetch(`/api/emails/${id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ isRead: true }),
    })
    setEmails((prev) => prev.map((e) => (e.id === id ? { ...e, isRead: true } : e)))
  }

  const highCount = emails.filter((e) => e.priority === 'high' && !e.isRead).length
  const unreadCount = emails.filter((e) => !e.isRead).length

  return (
    <div className="flex h-full">
      {/* Email list panel */}
      <div className="w-full md:w-96 lg:w-[420px] h-full flex flex-col border-r border-[#1e1e1e]">
        {/* Header */}
        <div className="px-4 py-3 border-b border-[#1e1e1e] flex items-center justify-between gap-2">
          <div>
            <h1 className="text-sm font-semibold text-white">{title}</h1>
            <p className="text-xs text-gray-500">
              {unreadCount > 0 ? `${unreadCount} unread` : 'All caught up'}
            </p>
          </div>
          <button
            onClick={fetchEmails}
            className="text-gray-500 hover:text-white transition-colors cursor-pointer"
            title="Refresh (R)"
          >
            <RefreshCw size={14} className={loading ? 'animate-spin' : ''} />
          </button>
        </div>

        {/* Priority filter tabs */}
        <div className="flex gap-1 px-3 py-2 border-b border-[#1e1e1e]">
          {[
            { key: 'all', label: 'All', count: emails.length },
            { key: 'unread', label: 'Unread', count: unreadCount },
            { key: 'high', label: '🔴 Priority', count: highCount },
          ].map((tab) => (
            <button
              key={tab.key}
              onClick={() => setFilter(tab.key as any)}
              className={cn(
                'flex items-center gap-1 px-2.5 py-1 rounded-md text-xs transition-colors cursor-pointer',
                filter === tab.key
                  ? 'bg-[#1e1e1e] text-white'
                  : 'text-gray-500 hover:text-gray-300'
              )}
            >
              {tab.label}
              {tab.count > 0 && (
                <span className="bg-[#2a2a2a] px-1.5 py-0.5 rounded-full text-[10px]">
                  {tab.count}
                </span>
              )}
            </button>
          ))}
        </div>

        {/* List */}
        <div ref={listRef} className="flex-1 overflow-y-auto">
          {loading ? (
            <div className="p-8 text-center">
              <div className="inline-block w-5 h-5 border-2 border-blue-500 border-t-transparent rounded-full animate-spin" />
              <p className="text-xs text-gray-500 mt-2">Loading emails...</p>
            </div>
          ) : filtered.length === 0 ? (
            <div className="p-8 text-center text-gray-500">
              <p className="text-2xl mb-2">📭</p>
              <p className="text-sm">Nothing here</p>
            </div>
          ) : (
            filtered.map((email, idx) => {
              const sender = parseEmailAddress(email.from)
              const isSelected = idx === selectedIdx
              return (
                <div
                  key={email.id}
                  onClick={() => {
                    setSelectedIdx(idx)
                    setOpenEmail(email)
                    if (!email.isRead) handleMarkRead(email.id)
                  }}
                  className={cn(
                    'px-4 py-3 border-b border-[#1a1a1a] cursor-pointer group transition-colors relative',
                    isSelected ? 'bg-[#1a1a1a]' : 'hover:bg-[#161616]',
                    !email.isRead && 'border-l-2 border-l-blue-500',
                    email.priority === 'high' && !email.isRead && priorityBg(email.priority)
                  )}
                >
                  <div className="flex items-start gap-3">
                    {/* Avatar */}
                    <div className="w-8 h-8 rounded-full bg-[#2a2a2a] flex items-center justify-center text-xs font-medium text-gray-300 shrink-0 mt-0.5">
                      {getInitials(sender.name || sender.email)}
                    </div>

                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between gap-2">
                        <span className={cn(
                          'text-sm truncate',
                          email.isRead ? 'text-gray-400 font-normal' : 'text-white font-medium'
                        )}>
                          {sender.name || sender.email}
                        </span>
                        <div className="flex items-center gap-1 shrink-0">
                          {email.priority && email.priority !== 'low' && (
                            <span className={cn('text-[10px]', priorityColor(email.priority))}>
                              {email.priority === 'high' ? '●' : '○'}
                            </span>
                          )}
                          <span className="text-[10px] text-gray-600">
                            {formatEmailDate(email.receivedAt)}
                          </span>
                        </div>
                      </div>
                      <p className={cn(
                        'text-xs truncate mt-0.5',
                        email.isRead ? 'text-gray-500' : 'text-gray-300'
                      )}>
                        {email.subject}
                      </p>
                      <p className="text-[11px] text-gray-600 truncate mt-0.5">
                        {email.snippet}
                      </p>
                    </div>
                  </div>

                  {/* Hover actions */}
                  <div className="absolute right-2 top-2 hidden group-hover:flex items-center gap-1">
                    <button
                      onClick={(ev) => { ev.stopPropagation(); handleStar(email.id) }}
                      className={cn(
                        'p-1 rounded transition-colors cursor-pointer',
                        email.isStarred ? 'text-yellow-400' : 'text-gray-600 hover:text-yellow-400'
                      )}
                    >
                      <Star size={12} fill={email.isStarred ? 'currentColor' : 'none'} />
                    </button>
                    <button
                      onClick={(ev) => { ev.stopPropagation(); handleArchive(email.id) }}
                      className="p-1 rounded text-gray-600 hover:text-gray-300 transition-colors cursor-pointer"
                    >
                      <Archive size={12} />
                    </button>
                  </div>
                </div>
              )
            })
          )}
        </div>

        {/* Keyboard shortcuts hint */}
        <div className="px-4 py-2 border-t border-[#1e1e1e] flex gap-3 text-[10px] text-gray-600">
          <span><span className="kbd">J/K</span> navigate</span>
          <span><span className="kbd">Enter</span> open</span>
          <span><span className="kbd">E</span> archive</span>
          <span><span className="kbd">S</span> star</span>
          <span><span className="kbd">C</span> compose</span>
        </div>
      </div>

      {/* Email detail */}
      <div className="flex-1 h-full overflow-hidden">
        {openEmail ? (
          <EmailDetail
            emailId={openEmail.id}
            onClose={() => setOpenEmail(null)}
            onArchive={() => {
              handleArchive(openEmail.id)
              setOpenEmail(null)
            }}
          />
        ) : (
          <div className="h-full flex items-center justify-center text-gray-600">
            <div className="text-center">
              <p className="text-4xl mb-3">✉️</p>
              <p className="text-sm">Select an email to read</p>
              <p className="text-xs mt-1">Press <span className="kbd">Enter</span> to open selected</p>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
