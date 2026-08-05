import { useMutation } from '@tanstack/react-query'

import * as authApi from '../api/auth'
import { signInWithProvider } from '../api/oauth'
import { useAuth } from '../auth/AuthContext'

/**
 * The authentication writes, as mutations.
 *
 * Nothing here invalidates a cache, and that is the point of it being separate
 * from the rest of the hooks layer: signing in or out replaces the whole
 * session, which `AuthContext` owns and does by clearing the client outright.
 * These are the requests that lead up to that.
 *
 * The errors are deliberately left unhandled. Every one of these is a form, the
 * failures are all about what was typed, and the screens render them inline
 * through `mutationErrors` rather than as a toast over the field in question.
 */
export function useRegister() {
  return useMutation({ mutationFn: authApi.register })
}

export function useSignIn() {
  const { signIn } = useAuth()
  return useMutation({ mutationFn: signIn })
}

export function useVerifyOtp(email) {
  const { verifyOtp } = useAuth()
  return useMutation({ mutationFn: (otp) => verifyOtp({ email: String(email), otp }) })
}

export function useResendOtp(email) {
  return useMutation({ mutationFn: () => authApi.resendOtp({ email: String(email) }) })
}

export function useForgotPassword() {
  return useMutation({ mutationFn: (email) => authApi.forgotPassword({ email }) })
}

export function useResetPassword() {
  return useMutation({ mutationFn: authApi.resetPassword })
}

/**
 * Google or Apple sign-in.
 *
 * Resolves null when the learner closes the browser, which is a cancellation
 * rather than a failure and must not surface as an error.
 */
export function useOAuthSignIn() {
  const { signInWithToken } = useAuth()

  return useMutation({
    mutationFn: async (provider) => {
      const token = await signInWithProvider(provider)
      if (!token) return null
      return signInWithToken(token)
    },
  })
}
