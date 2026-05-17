import React, { createContext, useContext, useEffect, useMemo, useState } from 'react'
import { supabase } from '@/lib/supabase'

const AuthContext = createContext(null)
const ROLE_STORAGE_KEY = 'fandirect_active_role'
const DEFAULT_ROLES = ['fan']
const ROUTES_BY_ROLE = {
  super_admin: '/admin',
  admin: '/admin',
  creator: '/creator-portal',
  investor: '/investors',
  fan: '/dashboard',
}

const AUTH_TIMEOUT_MS = 15000

function withTimeout(promise, message = 'Login is taking too long. Check the Supabase URL/key, internet connection, and browser Network tab.') {
  let timeoutId

  const timeout = new Promise((_, reject) => {
    timeoutId = window.setTimeout(() => {
      reject(new Error(message))
    }, AUTH_TIMEOUT_MS)
  })

  return Promise.race([promise, timeout]).finally(() => {
    window.clearTimeout(timeoutId)
  })
}

function unique(values = []) {
  return Array.from(new Set(values.filter(Boolean)))
}

function readStoredRole() {
  if (typeof window === 'undefined') return null
  return window.localStorage.getItem(ROLE_STORAGE_KEY)
}

function writeStoredRole(role) {
  if (typeof window === 'undefined') return
  if (role) window.localStorage.setItem(ROLE_STORAGE_KEY, role)
  else window.localStorage.removeItem(ROLE_STORAGE_KEY)
}

function metadataRoles(metadata = {}) {
  const roles = Array.isArray(metadata.roles) ? metadata.roles : []
  const role = metadata.role ? [metadata.role] : []
  const activeRole = metadata.active_role ? [metadata.active_role] : []
  return unique([...roles, ...role, ...activeRole])
}

function buildProfile(user, preferredRole = null) {
  if (!user) return null

  const userMeta = user.user_metadata || {}
  const appMeta = user.app_metadata || {}
  const roles = unique([
    ...metadataRoles(userMeta),
    ...metadataRoles(appMeta),
    ...DEFAULT_ROLES,
  ])

  const storedRole = preferredRole || readStoredRole()
  const activeRole = roles.includes(storedRole)
    ? storedRole
    : roles.includes(userMeta.active_role)
      ? userMeta.active_role
      : roles.includes(appMeta.active_role)
        ? appMeta.active_role
        : roles[0]

  writeStoredRole(activeRole)

  return {
    id: user.id,
    email: user.email,
    role: activeRole,
    active_role: activeRole,
    roles,
    display_name:
      userMeta.display_name ||
      userMeta.full_name ||
      user.email?.split('@')[0] ||
      'FanDirect User',
    username: userMeta.username || '',
    creator_id: userMeta.creator_id || null,
  }
}

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null)
  const [profile, setProfile] = useState(null)
  const [isAuthenticated, setIsAuthenticated] = useState(false)
  const [isLoadingAuth, setIsLoadingAuth] = useState(true)
  const [authError, setAuthError] = useState(null)
  const [authChecked, setAuthChecked] = useState(false)

  function applyUser(currentUser, preferredRole = null) {
    const nextProfile = buildProfile(currentUser, preferredRole)
    setUser(currentUser)
    setProfile(nextProfile)
    setIsAuthenticated(Boolean(currentUser))
    return nextProfile
  }

  useEffect(() => {
    let mounted = true

    async function loadSession() {
      try {
        const {
          data: { session },
          error,
        } = await supabase.auth.getSession()

        if (error) console.error('Supabase session error:', error)
        if (!mounted) return

        applyUser(session?.user || null)
      } catch (error) {
        console.error('Auth load failed:', error)

        if (mounted) {
          setAuthError(error)
          setUser(null)
          setProfile(null)
          setIsAuthenticated(false)
        }
      } finally {
        if (mounted) {
          setIsLoadingAuth(false)
          setAuthChecked(true)
        }
      }
    }

    loadSession()

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, session) => {
      applyUser(session?.user || null)
      setIsLoadingAuth(false)
      setAuthChecked(true)
      setAuthError(null)
    })

    return () => {
      mounted = false
      subscription.unsubscribe()
    }
  }, [])

  async function login(email, password) {
    setAuthError(null)

    try {
      const { data, error } = await withTimeout(
        supabase.auth.signInWithPassword({
          email: email.trim(),
          password,
        })
      )

      if (error) {
        setAuthError(error)
        return { error }
      }

      const resolvedProfile = applyUser(data?.user || null)
      setIsLoadingAuth(false)
      setAuthChecked(true)
      return { data, profile: resolvedProfile }
    } catch (error) {
      console.error('Login failed:', error)
      setAuthError(error)
      setIsLoadingAuth(false)
      setAuthChecked(true)
      return { error }
    }
  }

  async function register(email, password, role = 'fan', displayName = '', extra = {}) {
    setAuthError(null)

    const normalizedRole = ['fan', 'creator', 'investor'].includes(role) ? role : 'fan'
    const roles = unique([normalizedRole, 'fan'])

    try {
      const { data, error } = await withTimeout(
        supabase.auth.signUp({
          email: email.trim(),
          password,
          options: {
            data: {
              role: normalizedRole,
              roles,
              active_role: normalizedRole,
              display_name: displayName || email.split('@')[0],
              full_name: extra.full_name || displayName || '',
              username: extra.username || '',
            },
            emailRedirectTo: `${window.location.origin}/login`,
          },
        }),
        'Sign-up is taking too long. Check the Supabase URL/key, internet connection, and browser Network tab.'
      )

      if (error) {
        setAuthError(error)
        return { error }
      }

      const resolvedProfile = applyUser(data?.session?.user || null, normalizedRole)
      setIsLoadingAuth(false)
      setAuthChecked(true)

      return {
        data,
        profile: resolvedProfile,
        needsEmailConfirmation: Boolean(data?.user && !data?.session),
      }
    } catch (error) {
      console.error('Register failed:', error)
      setAuthError(error)
      setIsLoadingAuth(false)
      setAuthChecked(true)
      return { error }
    }
  }

  async function sendMagicLink(email, role = 'fan') {
    setAuthError(null)

    try {
      const { error } = await withTimeout(
        supabase.auth.signInWithOtp({
          email: email.trim(),
          options: {
            emailRedirectTo: `${window.location.origin}/dashboard`,
            data: { role, roles: unique([role, 'fan']), active_role: role },
          },
        }),
        'Sign-in link request is taking too long. Check the Supabase URL/key, internet connection, and browser Network tab.'
      )

      if (error) {
        setAuthError(error)
        return { error }
      }

      return { success: true }
    } catch (error) {
      console.error('Magic link failed:', error)
      setAuthError(error)
      return { error }
    }
  }


  async function sendPasswordReset(email) {
    setAuthError(null)

    try {
      const { error } = await withTimeout(
        supabase.auth.resetPasswordForEmail(email.trim(), {
          redirectTo: `${window.location.origin}/reset-password`,
        }),
        'Password reset request is taking too long. Check the Supabase URL/key, internet connection, and browser Network tab.'
      )

      if (error) {
        setAuthError(error)
        return { error }
      }

      return { success: true }
    } catch (error) {
      console.error('Password reset failed:', error)
      setAuthError(error)
      return { error }
    }
  }

  async function logout(shouldRedirect = true) {
    await supabase.auth.signOut()

    writeStoredRole(null)
    setUser(null)
    setProfile(null)
    setIsAuthenticated(false)
    setIsLoadingAuth(false)
    setAuthChecked(true)

    if (shouldRedirect) window.location.href = '/login'
  }

  async function checkUserAuth() {
    try {
      const {
        data: { session },
      } = await supabase.auth.getSession()

      const currentUser = session?.user || null
      applyUser(currentUser)
      setAuthChecked(true)
      setIsLoadingAuth(false)

      return currentUser
    } catch (error) {
      console.error('checkUserAuth failed:', error)
      setAuthError(error)
      setIsLoadingAuth(false)
      setAuthChecked(true)
      return null
    }
  }

  function switchRole(nextRole) {
    if (!profile?.roles?.includes(nextRole)) return false
    const nextProfile = buildProfile(user, nextRole)
    setProfile(nextProfile)
    return true
  }

  function hasRole(role) {
    return Boolean(profile?.roles?.includes(role))
  }

  function navigateToLogin() {
    window.location.href = '/login'
  }

  function getHomeRoute(role = profile?.role) {
    return ROUTES_BY_ROLE[role] || '/dashboard'
  }

  const value = useMemo(
    () => ({
      user,
      profile,
      isAuthenticated,
      isLoadingAuth,
      authError,
      authChecked,

      isFan: profile?.role === 'fan',
      isCreator: profile?.role === 'creator',
      isAdmin: profile?.role === 'admin' || profile?.role === 'super_admin',
      isSuperAdmin: profile?.role === 'super_admin',
      isInvestor: profile?.role === 'investor',
      userRole: profile?.role || null,
      roles: profile?.roles || [],
      activeRole: profile?.role || null,

      login,
      register,
      logout,
      sendMagicLink,
      sendPasswordReset,
      navigateToLogin,
      checkUserAuth,
      getHomeRoute,
      switchRole,
      hasRole,

      appPublicSettings: null,
      isLoadingPublicSettings: false,
    }),
    [user, profile, isAuthenticated, isLoadingAuth, authError, authChecked]
  )

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}

export function useAuth() {
  const context = useContext(AuthContext)

  if (!context) throw new Error('useAuth must be used within AuthProvider')

  return context
}
