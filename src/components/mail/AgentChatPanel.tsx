'use client'

import { useState, useEffect, useRef } from 'react'
import { useKeyboardShortcuts } from '@/components/providers/KeyboardShortcutsProvider'
import { X, Send, Bot, Sparkles, ChevronDown } from 'lucide-react'
import { cn, formatRelativeTime } from '@/lib/utils'
import toast from 'react-hot-toast'

interface Message {
  id: string
  role: 'user' | 'assistant'
  content: string
  createdAt: string
}

const SUGGESTIONS = [
  'Summarize my unread emails',
  'Schedule a meeting for tomorrow at 3pm',
  'Send a follow-up to my last email',
  'Show me high priority emails',
]

export default function AgentChatPanel() {
  const { isAgentOpen, setIsAgentOpen } = useKeyboardShortcuts()
  const [messages, setMessages] = useState<Message[]>([])
  const [input, setInput] = useState('')
  const [loading, setLoading] = useState(false)
  const [loadingHistory, setLoadingHistory] = useState(false)
  const messagesEndRef = useRef<HTMLDivElement>(null)
  const inputRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    if (isAgentOpen) {
      fetchHistory()
      setTimeout(() => inputRef.current?.focus(), 100)
    }
  }, [isAgentOpen])

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages])

  const fetchHistory = async () => {
    setLoadingHistory(true)
    try {
      const res = await fetch('/api/agent/chat')
      const data = await res.json()
      if (data.messages) {
        setMessages(data.messages.map((m: any) => ({
          ...m,
          id: m.id || String(Math.random()),
        })))
      }
    } catch {}
    finally { setLoadingHistory(false) }
  }

  const sendMessage = async (text?: string) => {
    const msg = (text || input).trim()
    if (!msg || loading) return

    const userMsg: Message = {
      id: String(Date.now()),
      role: 'user',
      content: msg,
      createdAt: new Date().toISOString(),
    }
    setMessages((prev) => [...prev, userMsg])
    setInput('')
    setLoading(true)

    try {
      const res = await fetch('/api/agent/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ message: msg }),
      })
      const data = await res.json()

      const assistantMsg: Message = {
        id: String(Date.now() + 1),
        role: 'assistant',
        content: data.text || 'Sorry, something went wrong.',
        createdAt: new Date().toISOString(),
      }
      setMessages((prev) => [...prev, assistantMsg])
    } catch {
      toast.error('Agent failed to respond')
    } finally {
      setLoading(false)
    }
  }

  if (!isAgentOpen) return null

  return (
    <div className="fixed bottom-4 right-4 w-[380px] h-[560px] bg-[#1a1a1a] border border-[#2a2a2a] rounded-2xl shadow-2xl z-40 flex flex-col animate-slide-up">
      {/* Header */}
      <div className="flex items-center gap-3 px-4 py-3 border-b border-[#2a2a2a]">
        <div className="w-7 h-7 rounded-lg bg-blue-500/20 flex items-center justify-center">
          <Bot size={14} className="text-blue-400" />
        </div>
        <div className="flex-1">
          <p className="text-sm font-medium text-white">FlowMail AI</p>
          <p className="text-[10px] text-gray-500">Powered by Corsair MCP</p>
        </div>
        <button
          onClick={() => setIsAgentOpen(false)}
          className="text-gray-500 hover:text-white transition-colors cursor-pointer"
        >
          <X size={14} />
        </button>
      </div>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto p-4 space-y-4">
        {loadingHistory ? (
          <div className="flex items-center justify-center py-8">
            <div className="w-4 h-4 border-2 border-blue-500 border-t-transparent rounded-full animate-spin" />
          </div>
        ) : messages.length === 0 ? (
          <div className="space-y-4">
            <div className="text-center">
              <div className="inline-flex items-center justify-center w-12 h-12 rounded-2xl bg-blue-500/10 mb-3">
                <Sparkles size={20} className="text-blue-400" />
              </div>
              <p className="text-sm font-medium text-white">What can I help you with?</p>
              <p className="text-xs text-gray-500 mt-1">Send emails, schedule events, search inbox</p>
            </div>
            <div className="grid grid-cols-1 gap-2">
              {SUGGESTIONS.map((s) => (
                <button
                  key={s}
                  onClick={() => sendMessage(s)}
                  className="text-left text-xs text-gray-400 bg-[#222] hover:bg-[#2a2a2a] border border-[#2a2a2a] hover:border-[#3a3a3a] px-3 py-2 rounded-lg transition-colors cursor-pointer"
                >
                  {s}
                </button>
              ))}
            </div>
          </div>
        ) : (
          messages.map((msg) => (
            <div
              key={msg.id}
              className={cn('flex', msg.role === 'user' ? 'justify-end' : 'justify-start')}
            >
              <div
                className={cn(
                  'max-w-[85%] rounded-2xl px-3.5 py-2.5 text-sm',
                  msg.role === 'user'
                    ? 'bg-blue-500 text-white rounded-br-sm'
                    : 'bg-[#222] text-gray-200 rounded-bl-sm border border-[#2a2a2a]'
                )}
              >
                <p className="whitespace-pre-wrap leading-relaxed">{msg.content}</p>
              </div>
            </div>
          ))
        )}

        {loading && (
          <div className="flex justify-start">
            <div className="bg-[#222] border border-[#2a2a2a] rounded-2xl rounded-bl-sm px-4 py-3">
              <div className="flex gap-1">
                {[0, 1, 2].map((i) => (
                  <div
                    key={i}
                    className="w-1.5 h-1.5 bg-gray-500 rounded-full animate-bounce"
                    style={{ animationDelay: `${i * 0.15}s` }}
                  />
                ))}
              </div>
            </div>
          </div>
        )}

        <div ref={messagesEndRef} />
      </div>

      {/* Input */}
      <div className="border-t border-[#2a2a2a] p-3">
        <div className="flex items-center gap-2 bg-[#111] border border-[#2a2a2a] rounded-xl px-3 py-2">
          <input
            ref={inputRef}
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={(e) => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); sendMessage() } }}
            placeholder="Send an email, schedule a meeting..."
            className="flex-1 bg-transparent text-sm text-white placeholder-gray-600 outline-none"
          />
          <button
            onClick={() => sendMessage()}
            disabled={loading || !input.trim()}
            className={cn(
              'p-1.5 rounded-lg transition-colors cursor-pointer',
              input.trim() && !loading
                ? 'bg-blue-500 text-white hover:bg-blue-600'
                : 'text-gray-600'
            )}
          >
            <Send size={13} />
          </button>
        </div>
        <p className="text-[10px] text-gray-600 text-center mt-2">
          Powered by Corsair MCP · Actions run with your permissions
        </p>
      </div>
    </div>
  )
}
