import React, { createContext, useContext, useEffect, useState } from 'react'
import type { User, Session } from '@supabase/supabase-js'
import { supabase } from '@/lib/supabase'

export type UserRole = 'traveler' | 'operator' | 'admin'

export interface UserProfile {
  id: string
  role: UserRole
  fullName: string
  email: string
}

interface AuthContextValue {
  user: User | null
  session: Session | null
  loading: boolean
  userRole: UserRole
  userProfile: UserProfile | null
  signUp: (email: string, password: string, name?: string) => Promise<{ error: string | null }>
  signIn: (email: string, password: string) => Promise<{ error: string | null }>
  signOut: () => Promise<void>
  updateDisplayName: (name: string) => Promise<{ error: string | null }>
}

const AuthContext = createContext<AuthContextValue | null>(null)

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null)
  const [session, setSession] = useState<Session | null>(null)
  const [loading, setLoading] = useState(true)
  const [userProfile, setUserProfile] = useState<UserProfile | null>(null)

  const loadProfile = async (u: User) => {
    const { data } = await supabase
      .from('user_profiles')
      .select('id, role, full_name, email')
      .eq('id', u.id)
      .single()
    if (data) {
      setUserProfile({
        id: data.id,
        role: (data.role as UserRole) ?? 'traveler',
        fullName: data.full_name ?? '',
        email: data.email ?? u.email ?? '',
      })
    } else {
      // Profile not yet created (trigger may race) — upsert a default
      await supabase.from('user_profiles').upsert({
        id: u.id,
        role: 'traveler',
        full_name: (u.user_metadata?.full_name as string | undefined) ?? '',
        email: u.email ?? '',
      }, { onConflict: 'id' })
      setUserProfile({ id: u.id, role: 'traveler', fullName: '', email: u.email ?? '' })
    }
  }

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session)
      setUser(session?.user ?? null)
      if (session?.user) loadProfile(session.user).finally(() => setLoading(false))
      else setLoading(false)
    })

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setSession(session)
      setUser(session?.user ?? null)
      if (session?.user) loadProfile(session.user)
      else setUserProfile(null)
    })

    return () => subscription.unsubscribe()
  }, [])

  const signUp = async (email: string, password: string, name?: string) => {
    const { error } = await supabase.auth.signUp({
      email,
      password,
      options: name?.trim() ? { data: { full_name: name.trim() } } : undefined,
    })
    return { error: error?.message ?? null }
  }

  const signIn = async (email: string, password: string) => {
    const { error } = await supabase.auth.signInWithPassword({ email, password })
    return { error: error?.message ?? null }
  }

  const signOut = async () => {
    await supabase.auth.signOut()
    setUserProfile(null)
  }

  const updateDisplayName = async (name: string) => {
    const trimmed = name.trim()
    if (!trimmed) return { error: 'Name cannot be empty' }
    const { data, error } = await supabase.auth.updateUser({ data: { full_name: trimmed } })
    if (error) return { error: error.message }
    if (data.user) setUser(data.user)
    return { error: null }
  }

  const userRole: UserRole = userProfile?.role ?? 'traveler'

  return (
    <AuthContext.Provider value={{ user, session, loading, userRole, userProfile, signUp, signIn, signOut, updateDisplayName }}>
      {children}
    </AuthContext.Provider>
  )
}

export function useAuth() {
  const ctx = useContext(AuthContext)
  if (!ctx) throw new Error('useAuth must be used within AuthProvider')
  return ctx
}
