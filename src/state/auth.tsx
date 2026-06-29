import { createContext, useContext, useEffect, useMemo, useState, type ReactNode } from 'react'
import type { User } from '@supabase/supabase-js'
import { supabase } from '@/lib/supabase'

/**
 * Auth is ADDITIVE — never a gate. The app is fully usable signed-out on
 * localStorage; signing in just mirrors your picks to the cloud so the league
 * leaderboard can rank everyone. Sign-in is Google-only (the owner's choice).
 *
 *  - `unavailable` — no backend configured; all auth/league UI hides.
 *  - `loading`     — checking for an existing session.
 *  - `signedOut`   — backend ready, nobody signed in.
 *  - `signedIn`    — `user` is set.
 */
export type AuthStatus = 'unavailable' | 'loading' | 'signedOut' | 'signedIn'

interface AuthCtx {
  status: AuthStatus
  user: User | null
  /** A friendly name from the Google profile, falling back to the email. */
  displayName: string | null
  signInWithGoogle: () => Promise<void>
  signOut: () => Promise<void>
  /** Remove this account's stored picks from the league and sign out (the Google
   *  account itself is untouched). Wipes the local cache and reloads. */
  deleteAccount: () => Promise<void>
}

const Ctx = createContext<AuthCtx | null>(null)

export function AuthProvider({ children }: { children: ReactNode }) {
  const [status, setStatus] = useState<AuthStatus>(supabase ? 'loading' : 'unavailable')
  const [user, setUser] = useState<User | null>(null)

  useEffect(() => {
    if (!supabase) return
    let active = true

    supabase.auth.getSession().then(({ data }) => {
      if (!active) return
      setUser(data.session?.user ?? null)
      setStatus(data.session?.user ? 'signedIn' : 'signedOut')
    })

    const { data: sub } = supabase.auth.onAuthStateChange((_event, session) => {
      setUser(session?.user ?? null)
      setStatus(session?.user ? 'signedIn' : 'signedOut')
    })

    return () => {
      active = false
      sub.subscription.unsubscribe()
    }
  }, [])

  const displayName = useMemo(() => {
    if (!user) return null
    const meta = (user.user_metadata ?? {}) as Record<string, unknown>
    return (
      (typeof meta.full_name === 'string' && meta.full_name) ||
      (typeof meta.name === 'string' && meta.name) ||
      user.email ||
      null
    )
  }, [user])

  const signInWithGoogle = async () => {
    if (!supabase) return
    // Return to wherever the user started (preserves the current path/hash).
    await supabase.auth.signInWithOAuth({
      provider: 'google',
      options: { redirectTo: window.location.origin + window.location.pathname },
    })
  }

  const signOut = async () => {
    if (!supabase) return
    await supabase.auth.signOut()
  }

  // Delete only the app account (the league row), never the Google account. The
  // picks row must be removed while still authenticated (RLS lets you delete only
  // your own row); then sign out, wipe the local cache (keys mirror
  // src/state/games.tsx), and reload to a clean signed-out slate.
  const deleteAccount = async () => {
    if (!supabase || !user) return
    // Surface a failed delete (e.g. the DELETE policy/grant isn't applied yet) so
    // the UI never signs out + reloads as if it worked while the row — and the
    // leaderboard entry it feeds — actually survives.
    const { error } = await supabase.from('picks').delete().eq('user_id', user.id)
    if (error) throw new Error(error.message)
    await supabase.auth.signOut()
    try {
      localStorage.removeItem('homeside.predictions')
      localStorage.removeItem('homeside.fantasy.v2')
      localStorage.removeItem('homeside.owner')
    } catch {
      /* ignore */
    }
    window.location.assign(window.location.origin + window.location.pathname)
  }

  const value = useMemo<AuthCtx>(
    () => ({ status, user, displayName, signInWithGoogle, signOut, deleteAccount }),
    [status, user, displayName],
  )
  return <Ctx.Provider value={value}>{children}</Ctx.Provider>
}

export function useAuth() {
  const v = useContext(Ctx)
  if (!v) throw new Error('useAuth must be used within AuthProvider')
  return v
}
