import { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react'
import { useQueryClient } from '@tanstack/react-query'

import * as authApi from '../api/auth'
import { revokeDevice } from '../api/push'
import { currentPushToken, forgetPushToken } from '../lib/push'
import { onSessionExpired } from '../lib/sessionEvents'
import { clearToken, getToken, setToken } from '../session'

const AuthContext = createContext(null)

/** Shared cache key so the profile is fetched once and reused everywhere. */

export const ME_QUERY_KEY = ['auth', 'me']

export function AuthProvider({ children }) {
  const queryClient = useQueryClient()
  const [user, setUser] = useState(null)
  /** False until we have decided whether the stored token is still good. */
  const [ready, setReady] = useState(false)
  /**
   * Set when the server rejects a token mid-session, so the login screen can
   * explain why the user is suddenly back there. Distinct from simply being
   * signed out, which needs no explanation.
   */
  const [sessionExpired, setSessionExpired] = useState(false)

  // On launch, a stored token is only a claim. Verify it against /auth/me before
  // treating the user as signed in, otherwise an expired or server-revoked token
  // drops them into the app and then 401s on the first real request.
  
  useEffect(() => {
    let cancelled = false

    async function restore() {
      const token = await getToken()

      if (!token) {
        if (!cancelled) setReady(true)
        return
      }

      try {
        // Through the query client rather than a bare call, so this response
        // populates the same cache entry the rest of the app reads.
        const data = await queryClient.fetchQuery({
          queryKey: ME_QUERY_KEY,
          queryFn: authApi.me,
        })
        if (!cancelled) setUser(data.user)
      } catch (error) {
        // Only a rejected token means "signed out". A network blip should leave
        // the token alone so they are still logged in once back online.
        if (error.status === 401) await clearToken()
      } finally {
        if (!cancelled) setReady(true)
      }
    }

    restore()
    return () => {
      cancelled = true
    }
  }, [queryClient])

  /** Shared tail of every path that ends with an authenticated user. */
  const adoptSession = useCallback(
    async (data) => {
      if (data?.token) await setToken(data.token)
      setUser(data.user)
      // Seed the cache so anything reading the profile query does not refetch
      // what we were just handed.
      queryClient.setQueryData(ME_QUERY_KEY, { user: data.user })
      return data
    },
    [queryClient],
  )

  const signIn = useCallback(
    async ({ email, password }) => adoptSession(await authApi.login({ email, password })),
    [adoptSession],
  )

  /**
   * Completes a Google/Apple sign-in. OAuth hands back only a token, so the
   * profile has to be fetched separately; the token must be stored first
   * because that /auth/me call is what authenticates with it.
   */
  const signInWithToken = useCallback(
    async (token) => {
      await setToken(token)

      try {
        const { user: profile } = await queryClient.fetchQuery({
          queryKey: ME_QUERY_KEY,
          queryFn: authApi.me,
        })
        setUser(profile)
        return { user: profile, token }
      } catch (error) {
        // Do not leave a token behind that we could not verify, or the next
        // launch would restore a broken session.
        await clearToken()
        queryClient.removeQueries({ queryKey: ME_QUERY_KEY })
        throw error
      }
    },
    [queryClient],
  )

  const verifyOtp = useCallback(
    async ({ email, otp }) => adoptSession(await authApi.verifyOtp({ email, otp })),
    [adoptSession],
  )

  const signOut = useCallback(async () => {
    // Before the token goes, or the request has nothing to authenticate with.
    // Leaving the device attached would send this account's streak reminders to
    // whoever signs in on this phone next.
    const pushToken = currentPushToken()

    if (pushToken) {
      try {
        await revokeDevice({ token: pushToken })
        forgetPushToken()
      } catch {
        // Offline, or the endpoint is not deployed yet. A device that keeps
        // receiving push is not worth blocking a sign-out over; the backend
        // drops tokens Expo reports as dead anyway.
      }
    }

    try {
      await authApi.logout()
    } catch {
      // The token may already be dead server-side. Either way we are signing out
      // locally, so a failed revoke must not strand them on the home screen.
    }
    await clearToken()
    setUser(null)
    // A deliberate logout is not an expiry, so make sure no stale notice is left
    // to greet them on the login screen.
    setSessionExpired(false)
    queryClient.clear()
  }, [queryClient])

  /**
   * The server rejected our token mid-session. Tear the session down locally so
   * the guards route to the intro, and remember why so login can say so.
   *
   * Only acts while a user is actually signed in: a 401 that arrives after we
   * have already signed out is noise, and re-running this would flash the
   * "session expired" message at someone who logged out on purpose.
   */
  useEffect(
    () =>
      onSessionExpired(() => {
        setUser((current) => {
          if (current === null) return null
          setSessionExpired(true)
          clearToken()
          queryClient.clear()
          return null
        })
      }),
    [queryClient],
  )

  /** Called once the login screen has shown the explanation. */
  const acknowledgeSessionExpiry = useCallback(() => setSessionExpired(false), [])

  /** Called after the profile changes server-side (course switch, avatar, etc). */
  const refreshUser = useCallback(async () => {
    // fetchQuery, not invalidate: callers await this and then route on the
    // result, so it has to be the fresh profile rather than a refetch that may
    // land after they have already navigated.
    const data = await queryClient.fetchQuery({
      queryKey: ME_QUERY_KEY,
      queryFn: authApi.me,
      staleTime: 0,
    })
  
    setUser(data.user)
    return data.user
  }, [queryClient])

  const value = useMemo(
    () => ({
      user,
      ready,
      isSignedIn: user !== null,
      sessionExpired,
      acknowledgeSessionExpiry,
      signIn,
      signInWithToken,
      signOut,
      verifyOtp,
      refreshUser,
      register: authApi.register,
    }),
    [
      user,
      ready,
      sessionExpired,
      acknowledgeSessionExpiry,
      signIn,
      signInWithToken,
      signOut,
      verifyOtp,
      refreshUser,
    ],
  )

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}

export function useAuth() {
  const context = useContext(AuthContext)
  if (!context) throw new Error('useAuth must be used inside an AuthProvider')
  return context
}

