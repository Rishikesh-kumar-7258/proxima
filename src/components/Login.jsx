import { useState } from 'react'
import { supabase } from '../lib/supabase'

export default function Login() {
  const [email, setEmail] = useState('')
  const [sent, setSent] = useState(false)

  // Supabase owns the whole OAuth dance — we just hand off and ask to land back here.
  const google = () =>
    supabase.auth.signInWithOAuth({
      provider: 'google',
      options: { redirectTo: window.location.origin },
    })

  // Passwordless: Supabase emails a one-time magic link, nothing to store or leak.
  const magicLink = async (e) => {
    e.preventDefault()
    await supabase.auth.signInWithOtp({ email })
    setSent(true)
  }

  return (
    <main className="grid min-h-svh place-items-center p-6">
     <div className="flex w-full max-w-sm flex-col gap-8 md:rounded-3xl md:border md:border-gray-200 md:bg-white md:p-10 md:shadow-sm">
      <div className="flex flex-col items-center gap-3 text-center">
        <div className="grid size-16 place-items-center rounded-2xl bg-violet-600 text-2xl font-bold text-white shadow-lg shadow-violet-600/30">
          MN
        </div>
        <h1 className="text-2xl font-bold tracking-tight">My Network</h1>
        <p className="max-w-xs text-gray-500">Your network, on a map. Sign in to begin.</p>
      </div>

      <div className="flex w-full flex-col gap-3">
        <button onClick={google} className="btn-ghost">
          <GoogleIcon className="size-5" /> Continue with Google
        </button>

        <div className="flex items-center gap-3 text-xs text-gray-400">
          <span className="h-px flex-1 bg-gray-200" /> or <span className="h-px flex-1 bg-gray-200" />
        </div>

        {sent ? (
          <p className="rounded-xl bg-green-50 px-4 py-3 text-center text-sm text-green-700">
            ✓ Check your inbox for the magic link.
          </p>
        ) : (
          <form onSubmit={magicLink} className="flex flex-col gap-2">
            <input
              type="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="you@email.com"
              className="input"
            />
            <button className="btn">Email me a link</button>
          </form>
        )}
      </div>
     </div>
    </main>
  )
}

// Google "G" mark.
const GoogleIcon = (p) => (
  <svg viewBox="0 0 24 24" {...p}>
    <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92a5.06 5.06 0 0 1-2.2 3.32v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.1Z" />
    <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84A11 11 0 0 0 12 23Z" />
    <path fill="#FBBC05" d="M5.84 14.1a6.6 6.6 0 0 1 0-4.2V7.06H2.18a11 11 0 0 0 0 9.88l3.66-2.84Z" />
    <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84C6.71 7.31 9.14 5.38 12 5.38Z" />
  </svg>
)
