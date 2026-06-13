'use client'

import { useState, useEffect, useRef } from 'react'
import { useSearchParams, useRouter } from 'next/navigation'
import { Search, X, Filter } from 'lucide-react'
import { cn, formatEmailDate, parseEmailAddress, priorityColor } from '@/lib/utils'
import EmailDetail from './EmailDetail'
import toast from 'react-hot-toast'

// Gmail advanced search tokens
const SEARCH_TOKENS = [
  { token: 'from:', hint: 'from:someone@email.com' },
  { token: 'to:', hint: 'to:recipient@email.com' },
  { token: 'subject:', hint: 'subject:meeting notes' },
  { token: 'has:attachment', hint: 'emails with attachments' },
  { token: 'is:unread', hint: 'unread emails' },
  { token: 'is:starred', hint: 'starred emails' },
  { token: 'after:', hint: 'after:2024/01/01' },
  { token: 'before:', hint: 'before:2024/12/31' },
  { token: 'label:', hint: 'label:important' },
]

interface Email {
  id: string
  from: string
  subject: string
  snippet: string
  isRead: boolean
  priority: string | null
  receivedAt: string
}

export default function SearchResults() {
  const router = useRouter()
  const [query, setQuery] = useState('')
  const [emails, setEmails] = useState<Email[]>([])
  const [loading, setLoading] = useState(false)
  const [openEmail, setOpenEmail] = useState<Email | null>(null)
  const [source, setSource] = useState<'local' | 'corsair' | null>(null)
  const [showTokens, setShowTokens] = useState(false)
  const inputRef = useRef<HTMLInputElement>(null)
  const debounceRef = useRef<ReturnType<typeof setTimeout> | undefined>(undefined)

  useEffect(() => {
    inputRef.current?.focus()
  }, [])

  useEffect(() => {
    clearTimeout(debounceRef.current)
    if (!query.trim()) { setEmails([]); return }
    debounceRef.current = setTimeout(() => doSearch(query), 400)
    return () => clearTimeout(debounceRef.current)
  }, [query])

  const doSearch = async (q: string) => {
    setLoading(true)
    try {
      const res = await fetch(`/api/emails/search?q=${encodeURIComponent(q)}`)
      const data = await res.json()
      setEmails(data.emails || [])
      setSource(data.source || null)
    } catch {
      toast.error('Search failed')
    } finally {
      setLoading(false)
    }
  }

  const appendToken = (token: string) => {
    setQuery((prev) => `${prev} ${token}`.trimStart())
    setShowTokens(false)
    inputRef.current?.focus()
  }

  return (
    <div className="flex h-full">
      <div className="w-full md:w-96 lg:w-[420px] flex flex-col border-r border-[#1e1e1e]">
        {/* Search header */}
        <div className="px-4 py-4 border-b border-[#1e1e1e]">
          <div className="flex items-center gap-2 bg-[#1a1a1a] border border-[#2a2a2a] rounded-xl px-3 py-2.5">
            <Search size={14} className="text-gray-500 shrink-0" />
            <input
              ref={inputRef}
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Search emails... (try from:, subject:, is:unread)"
              className="flex-1 bg-transparent text-sm text-white placeholder-gray-600 outline-none"
            />
            {query && (
              <button onClick={() => setQuery('')} className="text-gray-500 hover:text-white cursor-pointer">
                <X size={13} />
              </button>
            )}
          </div>

          {/* Advanced search tokens */}
          <div className="mt-2">
            <button
              onClick={() => setShowTokens(!showTokens)}
              className="text-xs text-gray-600 hover:text-gray-400 flex items-center gap-1 cursor-pointer"
            >
              <Filter size={11} />
              Advanced filters
            </button>
            {showTokens && (
              <div className="mt-2 flex flex-wrap gap-1.5">
                {SEARCH_TOKENS.map((t) => (
                  <button
                    key={t.token}
                    onClick={() => appendToken(t.token)}
                    className="text-[11px] bg-[#1a1a1a] border border-[#2a2a2a] text-gray-400 hover:text-white px-2 py-1 rounded cursor-pointer transition-colors"
                    title={t.hint}
                  >
                    {t.token}
                  </button>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Results */}
        <div className="flex-1 overflow-y-auto">
          {loading ? (
            <div className="p-8 text-center">
              <div className="inline-block w-5 h-5 border-2 border-blue-500 border-t-transparent rounded-full animate-spin" />
            </div>
          ) : query && emails.length === 0 ? (
            <div className="p-8 text-center text-gray-500">
              <p className="text-2xl mb-2">🔍</p>
              <p className="text-sm">No results for "{query}"</p>
            </div>
          ) : emails.length > 0 ? (
            <>
              <div className="px-4 py-2 text-xs text-gray-600">
                {emails.length} results {source === 'local' ? '(local · lightning fast ⚡)' : '(via Corsair)'}
              </div>
              {emails.map((email) => {
                const sender = parseEmailAddress(email.from)
                return (
                  <div
                    key={email.id}
                    onClick={() => setOpenEmail(email)}
                    className="px-4 py-3 border-b border-[#1a1a1a] hover:bg-[#161616] cursor-pointer"
                  >
                    <div className="flex items-center justify-between mb-1">
                      <span className="text-sm font-medium text-white truncate">
                        {sender.name || sender.email}
                      </span>
                      <span className="text-[10px] text-gray-600 shrink-0 ml-2">
                        {formatEmailDate(email.receivedAt)}
                      </span>
                    </div>
                    <p className={cn('text-xs truncate', email.isRead ? 'text-gray-500' : 'text-gray-300 font-medium')}>
                      {email.subject}
                    </p>
                    <p className="text-[11px] text-gray-600 truncate mt-0.5">{email.snippet}</p>
                    {email.priority === 'high' && (
                      <span className={`text-[10px] mt-1 ${priorityColor(email.priority)}`}>● High priority</span>
                    )}
                  </div>
                )
              })}
            </>
          ) : (
            <div className="p-8 text-center text-gray-600">
              <p className="text-sm">Start typing to search</p>
              <p className="text-xs mt-1">Searches local cache first, then Gmail via Corsair</p>
            </div>
          )}
        </div>
      </div>

      {/* Detail */}
      <div className="flex-1 h-full overflow-hidden">
        {openEmail ? (
          <EmailDetail
            emailId={openEmail.id}
            onClose={() => setOpenEmail(null)}
            onArchive={() => setOpenEmail(null)}
          />
        ) : (
          <div className="h-full flex items-center justify-center text-gray-600">
            <div className="text-center">
              <p className="text-4xl mb-3">🔍</p>
              <p className="text-sm">Search results appear here</p>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
