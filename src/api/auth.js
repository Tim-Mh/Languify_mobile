import api from './client'
import { deviceTimezone } from '../lib/timezone'

export function register({ fullName, email, password }) {
  return api.post(
    '/auth/register',
    { fullName, email, password, timezone: deviceTimezone() },
    { auth: false },
  )
}

export function login({ email, password }) {
  return api.post('/auth/login', { email, password, timezone: deviceTimezone() }, { auth: false })
}

export function verifyOtp({ email, otp }) {
  return api.post('/auth/verify-otp', { email, otp }, { auth: false })
}

export function resendOtp({ email }) {
  return api.post('/auth/resend-otp', { email }, { auth: false })
}

export function forgotPassword({ email }) {
  return api.post('/auth/forgot-password', { email }, { auth: false })
}

export function resetPassword({ email, otp, password }) {
  return api.post('/auth/reset-password', { email, otp, password }, { auth: false })
}

export function logout() {
  return api.post('/auth/logout')
}

export function me() {
  return api.get('/auth/me')
}
