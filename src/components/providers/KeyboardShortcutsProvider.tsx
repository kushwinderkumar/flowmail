'use client'

import { createContext, useContext, useEffect, useState, useCallback, ReactNode } from 'react'
import { useRouter } from 'next/navigation'

interface KeyboardShortcutsContextType {
  openCompose: () => void
  closeCompose: () => void
  openAgent: () => void
  closeAgent: () => void
  openCommandPalette: () => void
  closeCommandPalette: () => void
  isComposeOpen: boolean
  isAgentOpen: boolean
  isCommandPaletteOpen: boolean
  setIsComposeOpen: (v: boolean) => void
  setIsAgentOpen: (v: boolean) => void
  setIsCommandPaletteOpen: (v: boolean) => void
}

const KeyboardShortcutsContext = createContext<KeyboardShortcutsContextType | null>(null)

export function useKeyboardShortcuts() {
  const ctx = useContext(KeyboardShortcutsContext)
  if (!ctx) throw new Error('useKeyboardShortcuts must be used inside KeyboardShortcutsProvider')
  return ctx
}

export default function KeyboardShortcutsProvider({ children }: { children: ReactNode }) {
  const router = useRouter()
  const [isComposeOpen, setIsComposeOpen] = useState(false)
  const [isAgentOpen, setIsAgentOpen] = useState(false)
  const [isCommandPaletteOpen, setIsCommandPaletteOpen] = useState(false)

  const openCompose = useCallback(() => setIsComposeOpen(true), [])
  const closeCompose = useCallback(() => setIsComposeOpen(false), [])
  const openAgent = useCallback(() => setIsAgentOpen(true), [])
  const closeAgent = useCallback(() => setIsAgentOpen(false), [])
  const openCommandPalette = useCallback(() => setIsCommandPaletteOpen(true), [])
  const closeCommandPalette = useCallback(() => setIsCommandPaletteOpen(false), [])

  useEffect(() => {
    let gPressed = false
    let gTimer: ReturnType<typeof setTimeout>

    const handleKeyDown = (e: KeyboardEvent) => {
      const tag = (e.target as HTMLElement).tagName.toLowerCase()
      const isInput = tag === 'input' || tag === 'textarea' || tag === 'div' && (e.target as HTMLElement).contentEditable === 'true'

      // Global shortcuts (work everywhere)
      if ((e.metaKey || e.ctrlKey) && e.key === 'k') {
        e.preventDefault()
        setIsCommandPaletteOpen((v) => !v)
        return
      }

      if (e.key === 'Escape') {
        setIsCommandPaletteOpen(false)
        setIsAgentOpen(false)
        setIsComposeOpen(false)
        return
      }

      if (isInput) return

      // Single key shortcuts
      switch (e.key) {
        case 'c':
        case 'C':
          e.preventDefault()
          setIsComposeOpen(true)
          break
        case '/':
          e.preventDefault()
          router.push('/mail/search')
          break
        case '?':
          e.preventDefault()
          setIsCommandPaletteOpen(true)
          break
      }

      // G + key navigation shortcuts
      if (e.key === 'g' || e.key === 'G') {
        gPressed = true
        clearTimeout(gTimer)
        gTimer = setTimeout(() => { gPressed = false }, 1000)
        return
      }

      if (gPressed) {
        gPressed = false
        clearTimeout(gTimer)
        switch (e.key) {
          case 'i': case 'I': router.push('/mail/inbox'); break
          case 's': case 'S': router.push('/mail/sent'); break
          case 't': case 'T': router.push('/mail/starred'); break
          case 'c': case 'C': router.push('/calendar'); break
        }
      }
    }

    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [router])

  return (
    <KeyboardShortcutsContext.Provider
      value={{
        openCompose, closeCompose,
        openAgent, closeAgent,
        openCommandPalette, closeCommandPalette,
        isComposeOpen, isAgentOpen, isCommandPaletteOpen,
        setIsComposeOpen, setIsAgentOpen, setIsCommandPaletteOpen,
      }}
    >
      {children}
    </KeyboardShortcutsContext.Provider>
  )
}
