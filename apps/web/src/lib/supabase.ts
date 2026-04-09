import { createClient } from '@supabase/supabase-js'

const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL ?? ''
const SUPABASE_ANON_KEY = import.meta.env.VITE_SUPABASE_ANON_KEY ?? ''

export const isSupabaseAuthConfigured =
  SUPABASE_URL.length > 0 && SUPABASE_ANON_KEY.length > 0

export const supabase = isSupabaseAuthConfigured
  ? createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
      auth: {
        persistSession: true,
        autoRefreshToken: true,
        detectSessionInUrl: true,
      },
    })
  : null

export async function getAccessToken(): Promise<string | null> {
  if (!supabase) {
    return null
  }
  const {
    data: { session },
  } = await supabase.auth.getSession()
  return session?.access_token ?? null
}

export async function getAuthenticatedUser() {
  if (!supabase) {
    throw new Error('Supabase auth is not configured')
  }

  const {
    data: { user },
    error,
  } = await supabase.auth.getUser()

  if (error || !user || !user.email) {
    throw new Error('No authenticated user session')
  }

  return user
}

export type PasswordAuthResult = {
  kind: 'signed-in'
} | {
  kind: 'email-confirmation-required'
}

function isAlreadyRegisteredError(message: string): boolean {
  const normalized = message.toLowerCase()
  return (
    normalized.includes('already registered') ||
    normalized.includes('already been registered') ||
    normalized.includes('user already exists')
  )
}

export async function signInOrSignUpWithPassword(email: string, password: string) {
  if (!supabase) {
    throw new Error('Supabase auth is not configured')
  }

  const signUpResult = await supabase.auth.signUp({
    email,
    password,
    options: {
      emailRedirectTo: `${globalThis.location.origin}/auth`,
    },
  })

  if (!signUpResult.error) {
    if (signUpResult.data.session) {
      return { kind: 'signed-in' } satisfies PasswordAuthResult
    }
    return { kind: 'email-confirmation-required' } satisfies PasswordAuthResult
  }

  if (!isAlreadyRegisteredError(signUpResult.error.message)) {
    throw signUpResult.error
  }

  const signInResult = await supabase.auth.signInWithPassword({ email, password })
  if (signInResult.error || !signInResult.data.session) {
    throw signInResult.error ?? new Error('Unable to create active session')
  }

  return { kind: 'signed-in' } satisfies PasswordAuthResult
}

export async function signInWithPassword(email: string, password: string) {
  if (!supabase) {
    throw new Error('Supabase auth is not configured')
  }

  const signInResult = await supabase.auth.signInWithPassword({ email, password })
  if (signInResult.error || !signInResult.data.session) {
    throw signInResult.error ?? new Error('Unable to create active session')
  }

  return signInResult.data.session
}

export async function signInWithGoogle() {
  if (!supabase) {
    throw new Error('Supabase auth is not configured')
  }

  const { error } = await supabase.auth.signInWithOAuth({
    provider: 'google',
    options: {
      redirectTo: `${globalThis.location.origin}/auth`,
    },
  })

  if (error) {
    throw error
  }
}

export async function signOut() {
  if (!supabase) {
    return
  }

  const { error } = await supabase.auth.signOut()
  if (error) {
    throw error
  }
}
