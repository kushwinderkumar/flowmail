'use client'

import { useState, useEffect } from 'react'
import { formatRelativeTime, parseEmailAddress, priorityColor, getInitials } from '@/lib/utils'
import { X, Archive, Star, Reply, Forward, MoreHorizontal, ExternalLink } from 'lucide-react'
import toast from 'react-hot-toast'
import ComposeModal from './ComposeModal'

interface EmailFull {
  id: string
  from: string
  to: string
  subject: string
  body: string
  bodyHtml: string
  snippet: string
  isRead: boolean
  isStarred: boolean
  priority: string | null
  receivedAt: string
  labels: string[]
  gmailId: string
  threadId: string | null
}

export default function EmailDetail({
  emailId,
  onClose,
  onArchive,
}: {
  emailId: string
  onClose: () => void
  onArchive: () => void
}) {
  const [email, setEmail] = useState<EmailFull | null>(null)
  const [loading, setLoading] = useState(true)
  const [showReply, setShowReply] = useState(false)
  const [smartReplies, setSmartReplies] = useState<string[]>([])

  useEffect(() => {
    const fetchEmail = async () => {
      setLoading(true)
      try {
        const res = await fetch(`/api/emails/${emailId}`)
        const data = await res.json()
        setEmail(data)

        // Fetch smart replies
        if (data.body || data.snippet) {
          const srRes = await fetch('/api/emails/smart-replies', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ subject: data.subject, body: data.body || data.snippet }),
          })
          if (srRes.ok) {
            const srData = await srRes.json()
            setSmartReplies(srData.replies || [])
          }
        }
      } catch {
        toast.error('Failed to load email')
      } finally {
        setLoading(false)
      }
    }
    fetchEmail()
  }, [emailId])

  // Keyboard shortcuts
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      const tag = (e.target as HTMLElement).tagName.toLowerCase()
      if (tag === 'input' || tag === 'textarea') return
      switch (e.key) {
        case 'Escape': onClose(); break
        case 'e': case 'E': onArchive(); break
        case 'r': case 'R': setShowReply(true); break
        case 's': case 'S':
          if (email) handleStar()
          break
      }
    }
    window.addEventListener('keydown', handler)
    return () => window.removeEventListener('keydown', handler)
  }, [email, onClose, onArchive])

  const handleStar = async () => {
    if (!email) return
    await fetch(`/api/emails/${email.id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ isStarred: !email.isStarred }),
    })
    setEmail((prev) => prev ? { ...prev, isStarred: !prev.isStarred } : prev)
  }

  if (loading) {
    return (
      <div className="h-full flex items-center justify-center">
        <div className="w-5 h-5 border-2 border-blue-500 border-t-transparent rounded-full animate-spin" />
      </div>
    )
  }

  if (!email) return null

  const sender = parseEmailAddress(email.from)

  return (
    <div className="h-full flex flex-col bg-[#0f0f0f] animate-slide-in">
      {/* Header */}
      <div className="flex items-center gap-2 px-6 py-3 border-b border-[#1e1e1e]">
        <button onClick={onClose} className="text-gray-500 hover:text-white transition-colors cursor-pointer p-1 rounded">
          <X size={15} />
        </button>
        <div className="flex-1" />
        <div className="flex items-center gap-1">
          <button
            onClick={handleStar}
            className={`p-1.5 rounded hover:bg-[#1e1e1e] transition-colors cursor-pointer ${email.isStarred ? 'text-yellow-400' : 'text-gray-500'}`}
            title="Star (S)"
          >
            <Star size={14} fill={email.isStarred ? 'currentColor' : 'none'} />
          </button>
          <button
            onClick={onArchive}
            className="p-1.5 rounded hover:bg-[#1e1e1e] text-gray-500 hover:text-white transition-colors cursor-pointer"
            title="Archive (E)"
          >
            <Archive size={14} />
          </button>
          <button
            onClick={() => setShowReply(true)}
            className="p-1.5 rounded hover:bg-[#1e1e1e] text-gray-500 hover:text-white transition-colors cursor-pointer"
            title="Reply (R)"
          >
            <Reply size={14} />
          </button>
        </div>
      </div>

      {/* Email content */}
      <div className="flex-1 overflow-y-auto px-6 py-6">
        {/* Subject */}
        <div className="flex items-start gap-3 mb-6">
          <div>
            <h2 className="text-lg font-semibold text-white leading-tight">{email.subject}</h2>
            {email.priority && email.priority !== 'low' && (
              <span className={`text-xs font-medium mt-1 ${priorityColor(email.priority)}`}>
                {email.priority === 'high' ? '🔴 High priority' : '🟡 Medium priority'}
              </span>
            )}
          </div>
        </div>

        {/* Sender info */}
        <div className="flex items-center gap-3 mb-6 pb-4 border-b border-[#1e1e1e]">
          <div className="w-10 h-10 rounded-full bg-[#2a2a2a] flex items-center justify-center text-sm font-medium text-gray-300">
            {getInitials(sender.name || sender.email)}
          </div>
          <div>
            <p className="text-sm font-medium text-white">{sender.name}</p>
            <p className="text-xs text-gray-500">{sender.email}</p>
          </div>
          <div className="ml-auto text-xs text-gray-500">
            {formatRelativeTime(email.receivedAt)}
          </div>
        </div>

        {/* Body */}
        <div className="text-sm text-gray-300 leading-relaxed">
          {email.bodyHtml ? (
            <div
              className="prose prose-invert prose-sm max-w-none"
              dangerouslySetInnerHTML={{ __html: email.bodyHtml }}
            />
          ) : (
            <pre className="whitespace-pre-wrap font-sans">{email.body || email.snippet}</pre>
          )}
        </div>

        {/* Smart replies */}
        {smartReplies.length > 0 && (
          <div className="mt-8 pt-4 border-t border-[#1e1e1e]">
            <p className="text-xs text-gray-500 mb-2">✨ Smart replies</p>
            <div className="flex flex-wrap gap-2">
              {smartReplies.map((reply, i) => (
                <button
                  key={i}
                  onClick={() => setShowReply(true)}
                  className="text-xs bg-[#1a1a1a] border border-[#2a2a2a] text-gray-300 hover:text-white hover:border-[#3a3a3a] px-3 py-1.5 rounded-full transition-colors cursor-pointer"
                >
                  {reply}
                </button>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* Keyboard shortcuts */}
      <div className="px-6 py-2 border-t border-[#1e1e1e] flex gap-3 text-[10px] text-gray-600">
        <span><span className="kbd">R</span> reply</span>
        <span><span className="kbd">E</span> archive</span>
        <span><span className="kbd">S</span> star</span>
        <span><span className="kbd">Esc</span> close</span>
      </div>

      {/* Reply compose */}
      {showReply && email && (
        <ComposeModal
          onClose={() => setShowReply(false)}
          replyTo={{ to: email.from, subject: `Re: ${email.subject}`, threadId: email.threadId || undefined, messageId: email.gmailId }}
        />
      )}
    </div>
  )
}
