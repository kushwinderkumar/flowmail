'use client'

import { useState, useRef, useEffect } from 'react'
import { X, Send, Minimize2, ChevronDown } from 'lucide-react'
import toast from 'react-hot-toast'
import { cn } from '@/lib/utils'

interface ComposeProps {
  onClose: () => void
  replyTo?: {
    to: string
    subject: string
    threadId?: string
    messageId?: string
  }
  prefill?: {
    to?: string
    subject?: string
    body?: string
  }
}

export default function ComposeModal({ onClose, replyTo, prefill }: ComposeProps) {
  const [to, setTo] = useState(replyTo?.to || prefill?.to || '')
  const [subject, setSubject] = useState(replyTo?.subject || prefill?.subject || '')
  const [body, setBody] = useState(prefill?.body || '')
  const [cc, setCc] = useState('')
  const [showCc, setShowCc] = useState(false)
  const [sending, setSending] = useState(false)
  const [minimized, setMinimized] = useState(false)
  const bodyRef = useRef<HTMLTextAreaElement>(null)

  useEffect(() => {
    bodyRef.current?.focus()
  }, [])

  // Cmd+Enter to send
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === 'Enter') {
        e.preventDefault()
        handleSend()
      }
    }
    window.addEventListener('keydown', handler)
    return () => window.removeEventListener('keydown', handler)
  }, [to, subject, body])

  const handleSend = async () => {
    if (!to.trim()) { toast.error('Please enter a recipient'); return }
    if (!subject.trim()) { toast.error('Please enter a subject'); return }
    if (!body.trim()) { toast.error('Message body is empty'); return }

    setSending(true)
    try {
      const res = await fetch('/api/emails/send', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          to,
          subject,
          message: body,
          cc: cc || undefined,
          threadId: replyTo?.threadId,
          replyToMessageId: replyTo?.messageId,
        }),
      })
      if (!res.ok) throw new Error('Send failed')
      toast.success('Email sent!')
      onClose()
    } catch {
      toast.error('Failed to send email')
    } finally {
      setSending(false)
    }
  }

  if (minimized) {
    return (
      <div className="fixed bottom-4 right-4 bg-[#1a1a1a] border border-[#2a2a2a] rounded-xl shadow-xl z-50 w-64 overflow-hidden">
        <div className="flex items-center gap-2 px-4 py-3 cursor-pointer" onClick={() => setMinimized(false)}>
          <span className="text-sm text-white font-medium flex-1 truncate">
            {subject || 'New message'}
          </span>
          <ChevronDown size={14} className="text-gray-400" />
          <button onClick={(e) => { e.stopPropagation(); onClose() }} className="text-gray-500 hover:text-white cursor-pointer">
            <X size={13} />
          </button>
        </div>
      </div>
    )
  }

  return (
    <div className="fixed bottom-4 right-4 w-[540px] bg-[#1a1a1a] border border-[#2a2a2a] rounded-xl shadow-2xl z-50 flex flex-col animate-slide-up">
      {/* Header */}
      <div className="flex items-center gap-2 px-4 py-3 border-b border-[#2a2a2a]">
        <span className="text-sm font-medium text-white flex-1">
          {replyTo ? 'Reply' : 'New message'}
        </span>
        <button onClick={() => setMinimized(true)} className="text-gray-500 hover:text-white transition-colors cursor-pointer">
          <Minimize2 size={13} />
        </button>
        <button onClick={onClose} className="text-gray-500 hover:text-white transition-colors cursor-pointer">
          <X size={13} />
        </button>
      </div>

      {/* Fields */}
      <div className="flex flex-col divide-y divide-[#2a2a2a]">
        <div className="flex items-center px-4 py-2 gap-2">
          <span className="text-xs text-gray-500 w-12">To</span>
          <input
            value={to}
            onChange={(e) => setTo(e.target.value)}
            placeholder="recipient@example.com"
            className="flex-1 bg-transparent text-sm text-white placeholder-gray-600 outline-none"
          />
          <button
            onClick={() => setShowCc(!showCc)}
            className="text-xs text-gray-600 hover:text-gray-400 cursor-pointer"
          >
            CC
          </button>
        </div>

        {showCc && (
          <div className="flex items-center px-4 py-2 gap-2">
            <span className="text-xs text-gray-500 w-12">CC</span>
            <input
              value={cc}
              onChange={(e) => setCc(e.target.value)}
              placeholder="cc@example.com"
              className="flex-1 bg-transparent text-sm text-white placeholder-gray-600 outline-none"
            />
          </div>
        )}

        <div className="flex items-center px-4 py-2 gap-2">
          <span className="text-xs text-gray-500 w-12">Subject</span>
          <input
            value={subject}
            onChange={(e) => setSubject(e.target.value)}
            placeholder="Subject"
            className="flex-1 bg-transparent text-sm text-white placeholder-gray-600 outline-none"
          />
        </div>
      </div>

      {/* Body */}
      <textarea
        ref={bodyRef}
        value={body}
        onChange={(e) => setBody(e.target.value)}
        placeholder="Write your message..."
        rows={10}
        className="flex-1 bg-transparent text-sm text-white placeholder-gray-600 outline-none resize-none px-4 py-3"
      />

      {/* Footer */}
      <div className="flex items-center justify-between px-4 py-3 border-t border-[#2a2a2a]">
        <span className="text-xs text-gray-600">
          <span className="kbd">⌘ Enter</span> to send
        </span>
        <button
          onClick={handleSend}
          disabled={sending}
          className={cn(
            'flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-colors cursor-pointer',
            sending
              ? 'bg-blue-500/50 text-white/50'
              : 'bg-blue-500 hover:bg-blue-600 text-white'
          )}
        >
          <Send size={13} />
          {sending ? 'Sending...' : 'Send'}
        </button>
      </div>
    </div>
  )
}
