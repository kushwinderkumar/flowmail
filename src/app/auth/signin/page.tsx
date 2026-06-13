import { signIn } from '@/lib/auth'
import { redirect } from 'next/navigation'
import { auth } from '@/lib/auth'

export default async function SignInPage() {
  const session = await auth()
  if (session) redirect('/mail')

  return (
    <div className="min-h-screen flex items-center justify-center bg-[#0f0f0f]">
      <div className="w-full max-w-sm space-y-8 animate-slide-up">
        {/* Logo */}
        <div className="text-center">
          <div className="inline-flex items-center gap-2 mb-6">
            <div className="w-8 h-8 rounded-lg bg-blue-500 flex items-center justify-center text-white font-bold text-sm">
              FM
            </div>
            <span className="text-xl font-semibold text-white">FlowMail</span>
          </div>
          <h1 className="text-2xl font-semibold text-white">Sign in</h1>
          <p className="text-sm text-gray-500 mt-2">
            The smarter way to manage email & calendar
          </p>
        </div>

        {/* Features preview */}
        <div className="space-y-3">
          {[
            { icon: '⚡', text: 'Keyboard-first workflow with shortcuts' },
            { icon: '🤖', text: 'AI agent to send emails & schedule meetings' },
            { icon: '📬', text: 'Auto-priority filtering by importance' },
            { icon: '📅', text: 'Calendar + email in one unified view' },
          ].map((f) => (
            <div
              key={f.text}
              className="flex items-center gap-3 text-sm text-gray-400 bg-[#1a1a1a] rounded-lg px-4 py-2.5 border border-[#2a2a2a]"
            >
              <span>{f.icon}</span>
              <span>{f.text}</span>
            </div>
          ))}
        </div>

        {/* Sign in button */}
        <form
          action={async () => {
            'use server'
            await signIn('google', { redirectTo: '/mail' })
          }}
        >
          <button
            type="submit"
            className="w-full flex items-center justify-center gap-3 bg-white text-gray-900 font-medium py-3 px-4 rounded-xl hover:bg-gray-100 transition-colors cursor-pointer"
          >
            <svg width="18" height="18" viewBox="0 0 18 18">
              <path
                fill="#4285F4"
                d="M17.64 9.2c0-.637-.057-1.251-.164-1.84H9v3.481h4.844c-.209 1.125-.843 2.078-1.796 2.717v2.258h2.908c1.702-1.567 2.684-3.874 2.684-6.615z"
              />
              <path
                fill="#34A853"
                d="M9 18c2.43 0 4.467-.806 5.956-2.18l-2.908-2.259c-.806.54-1.837.86-3.048.86-2.344 0-4.328-1.584-5.036-3.711H.957v2.332A8.997 8.997 0 009 18z"
              />
              <path
                fill="#FBBC05"
                d="M3.964 10.71A5.41 5.41 0 013.682 9c0-.593.102-1.17.282-1.71V4.958H.957A8.996 8.996 0 000 9c0 1.452.348 2.827.957 4.042l3.007-2.332z"
              />
              <path
                fill="#EA4335"
                d="M9 3.58c1.321 0 2.508.454 3.44 1.345l2.582-2.58C13.463.891 11.426 0 9 0A8.997 8.997 0 00.957 4.958L3.964 7.29C4.672 5.163 6.656 3.58 9 3.58z"
              />
            </svg>
            Continue with Google
          </button>
        </form>

        <p className="text-center text-xs text-gray-600">
          Powered by{' '}
          <span className="text-blue-500">Corsair</span> · Gmail & Calendar APIs
        </p>
      </div>
    </div>
  )
}
