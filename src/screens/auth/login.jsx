import { useEffect, useRef, useState } from 'react'
import { Pressable, StyleSheet, Text, View } from 'react-native'
import { Link, useRouter } from '@/navigation'

import AuthScreen from '@/components/AuthScreen'
import Button from '@/components/Button'
import SocialAuthButtons from '@/components/SocialAuthButtons'
import TextField from '@/components/TextField'
import { useNotify } from '@/components/NotificationProvider'
import { useAuth } from '@/auth/AuthContext'
import { useSignIn } from '@/hooks/useAuthActions'
import { routeAfterAuth } from '@/auth/setupState'
import { useTranslate } from '@/lib/i18n'
import { mutationErrors } from '@/lib/formErrors'
import { colors, fonts, spacing } from '@/theme'

export default function Login() {
  const t = useTranslate()
  const router = useRouter()
  const notify = useNotify()
  const { sessionExpired, acknowledgeSessionExpiry } = useAuth()
  const passwordRef = useRef(null)

  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')

  // Someone bounced here by an expired token deserves to know why, rather than
  // wondering whether the app just forgot them.
  useEffect(() => {
    if (!sessionExpired) return
    notify.info(t('m_auth_expired'), { duration: 5000 })
    acknowledgeSessionExpiry()
  }, [acknowledgeSessionExpiry, notify, sessionExpired])

  const login = useSignIn()

  const submit = () =>
    login.mutate({ email: email.trim(), password }, {
      onSuccess: ({ user }) => {
        // An account that never finished signing up resumes where it
        // stopped, rather than landing on a home screen with no course on it.
        router.replace(routeAfterAuth(user))
      },
      onError: (error) => {
        // An unverified account is not a failure, it is a detour: the backend
        // has already emailed a fresh code, so take them straight to the OTP
        // screen.
        if (error.status === 403 && error.payload?.requiresVerification) {
          router.push({
            pathname: '/(auth)/verify-otp',
            params: { email: error.payload.email ?? email.trim() },
          })
        }
      },
    })

  const { fieldErrors, message } = mutationErrors(login.error)

  return (
    <AuthScreen
      title={t('m_auth_welcome')}
      subtitle={t('m_auth_welcome_s')}
      error={message}
    >
      <TextField
        label={t('m_auth_email')}
        value={email}
        onChangeText={setEmail}
        error={fieldErrors.email}
        placeholder="you@example.com"
        keyboardType="email-address"
        autoCapitalize="none"
        autoComplete="email"
        textContentType="emailAddress"
        returnKeyType="next"
        onSubmitEditing={() => passwordRef.current?.focus()}
      />

      <TextField
        ref={passwordRef}
        label={t('m_auth_password')}
        value={password}
        onChangeText={setPassword}
        error={fieldErrors.password}
        placeholder={t('m_auth_your_pw')}
        autoCapitalize="none"
        autoComplete="current-password"
        textContentType="password"
        secureToggle
        returnKeyType="go"
        onSubmitEditing={submit}
      />

      <Link href="/(auth)/forgot-password" asChild>
        <Pressable hitSlop={8} style={({ pressed }) => [styles.forgot, pressed && styles.pressed]}>
          <Text style={styles.forgotLabel}>{t('m_auth_forgot_link')}</Text>
        </Pressable>
      </Link>

      <Button
        label={t('m_auth_login')}
        onPress={submit}
        loading={login.isPending}
        style={styles.submit}
      />

      <SocialAuthButtons />

      <View style={styles.footer}>
        <Text style={styles.footerText}>{t('m_auth_new_here')} </Text>
        <Link href="/(auth)/register" asChild>
          <Pressable hitSlop={8}>
            <Text style={styles.footerLink}>{t('m_auth_create_acc')}</Text>
          </Pressable>
        </Link>
      </View>
    </AuthScreen>
  )
}

const styles = StyleSheet.create({
  forgot: {
    alignSelf: 'flex-end',
    paddingVertical: spacing.xs,
    marginBottom: spacing.lg,
  },
  pressed: {
    opacity: 0.55,
  },
  forgotLabel: {
    fontFamily: fonts.bodyBold,
    fontSize: 14,
    color: colors.primary[600],
  },
  submit: {
    marginTop: spacing.xs,
  },
  footer: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: spacing.lg,
  },
  footerText: {
    fontFamily: fonts.body,
    fontSize: 15,
    color: colors.secondary[500],
  },
  footerLink: {
    fontFamily: fonts.bodyBold,
    fontSize: 15,
    color: colors.primary[600],
  },
})
