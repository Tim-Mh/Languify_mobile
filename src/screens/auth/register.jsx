import { useRef, useState } from 'react'
import { Pressable, StyleSheet, Text, View } from 'react-native'
import { Link, useRouter } from '@/navigation'

import AuthScreen from '@/components/AuthScreen'
import Button from '@/components/Button'
import SocialAuthButtons from '@/components/SocialAuthButtons'
import TextField from '@/components/TextField'
import { useRegister } from '@/hooks/useAuthActions'
import { useTranslate } from '@/lib/i18n'
import { mutationErrors } from '@/lib/formErrors'
import { colors, fonts, spacing } from '@/theme'

const MIN_PASSWORD_LENGTH = 6

export default function Register() {
  const t = useTranslate()
  const router = useRouter()
  const emailRef = useRef(null)
  const passwordRef = useRef(null)
  const confirmRef = useRef(null)

  const [fullName, setFullName] = useState('')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  /** Client-side rules the API cannot tell us about until we have already asked. */
  const [localErrors, setLocalErrors] = useState({})

  const signUp = useRegister()

  const createAccount = () =>
    signUp.mutate(
      { fullName: fullName.trim() || null, email: email.trim(), password },
      {
        onSuccess: () => {
          // Registration deliberately does not sign you in; the account is
          // created unverified and a code is emailed.
          router.push({ pathname: '/(auth)/verify-otp', params: { email: email.trim() } })
        },
      },
    )

  const submit = () => {
    const problems = {}

    if (password.length < MIN_PASSWORD_LENGTH) {
      problems.password = t('m_auth_min_chars', { n: MIN_PASSWORD_LENGTH })
    }
    // Checked before sending: the API has no idea we asked twice, so a typo
    // would otherwise create an account with a password they cannot repeat.
    if (confirmPassword !== password) {
      problems.confirmPassword = 'Both passwords must match.'
    }

    setLocalErrors(problems)

    if (Object.keys(problems).length > 0) return

    createAccount()
  }

  const { fieldErrors, message } = mutationErrors(signUp.error)

  return (
    <AuthScreen
      title={t('m_auth_signup_t')}
      subtitle={t('m_auth_signup_s')}
      error={message}
    >
      <TextField
        label={t('m_auth_name')}
        value={fullName}
        onChangeText={setFullName}
        error={fieldErrors.fullName}
        placeholder={t('m_auth_name_ph')}
        autoCapitalize="words"
        autoComplete="name"
        textContentType="name"
        returnKeyType="next"
        onSubmitEditing={() => emailRef.current?.focus()}
      />

      <TextField
        ref={emailRef}
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
        error={localErrors.password ?? fieldErrors.password}
        placeholder={t('m_auth_min_hint', { n: MIN_PASSWORD_LENGTH })}
        autoCapitalize="none"
        autoComplete="new-password"
        textContentType="newPassword"
        secureToggle
        returnKeyType="next"
        onSubmitEditing={() => confirmRef.current?.focus()}
      />

      <TextField
        ref={confirmRef}
        label={t('m_auth_confirm_pw')}
        value={confirmPassword}
        onChangeText={setConfirmPassword}
        error={localErrors.confirmPassword}
        placeholder={t('m_auth_type_again')}
        autoCapitalize="none"
        autoComplete="new-password"
        textContentType="newPassword"
        secureToggle
        returnKeyType="go"
        onSubmitEditing={submit}
      />

      <Button
        label={t('m_auth_create_btn')}
        onPress={submit}
        loading={signUp.isPending}
        style={styles.submit}
      />

      <SocialAuthButtons label={t('m_auth_or_signup')} />

      <View style={styles.footer}>
        <Text style={styles.footerText}>{t('m_auth_have_acc')} </Text>
        <Link href="/(auth)/login" asChild>
          <Pressable hitSlop={8}>
            <Text style={styles.footerLink}>{t('m_auth_login')}</Text>
          </Pressable>
        </Link>
      </View>
    </AuthScreen>
  )
}

const styles = StyleSheet.create({
  submit: {
    marginTop: spacing.md,
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
