import type { Metadata } from 'next'
import './globals.css'
import { Toaster } from 'react-hot-toast'
import SessionProvider from '@/components/providers/SessionProvider'

export const metadata: Metadata = {
  title: 'FlowMail — Superhuman-style Gmail & Calendar',
  description:
    'A keyboard-first, AI-powered email and calendar workflow app built with Corsair, Gmail, and Google Calendar APIs.',
}

// RootLayout does NOT fetch session — each auth-protected route handles that
// individually. SessionProvider with no session prop uses client-side fetching.
export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body>
        <SessionProvider>
          {children}
          <Toaster
            position="bottom-right"
            toastOptions={{
              style: {
                background: '#1a1a1a',
                color: '#e8e8e8',
                border: '1px solid #2a2a2a',
                borderRadius: '8px',
              },
            }}
          />
        </SessionProvider>
      </body>
    </html>
  )
}
