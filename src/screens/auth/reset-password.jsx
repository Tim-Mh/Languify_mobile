import { useRef, useState } from 'react'
import { StyleSheet, Text } from 'react-native'
import { useLocalSearchParams, useRouter } from '@/navigation'

import AuthScreen from '@/components/AuthScreen'
import Button from '@/components/Button'
import TextField from '@/components/TextField'
import { useNotify } from '@/components/NotificationProvider'
import { useResetPassword } from '@/hooks/useAuthActions'
import { useTranslate } from '@/lib/i18n'
import { mutationErrors } from '@/lib/formErrors'
import { colors, fonts, spacing } from '@/theme'

const OTP_LENGTH = 6
const MIN_PASSWORD_LENGTH = 6

export default function ResetPassword() {
  const t = useTranslate()
  const router = useRouter()
  const notify = useNotify()
  const { email = '' } = useLocalSearchParams()
  const passwordRef = useRef(null)

  const [otp, setOtp] = useState('')
  const [password, setPassword] = useState('')
  /** Client-side rule the API cannot tell us about until we have already asked. */
  const [localPasswordError, setLocalPasswordError] = useState(null)

  const reset = useResetPassword()

  const submit = () => {
    // Checked here because the API cannot tell us until we have already asked.
    if (password.length < MIN_PASSWORD_LENGTH) {
      setLocalPasswordError(t('m_auth_min_chars', { n: MIN_PASSWORD_LENGTH }))
      return
    }
    setLocalPasswordError(null)

    reset.mutate(
      { email: String(email), otp, password },
      {
        onSuccess: () => {
          notify.success(t('m_auth_reset_ok'))
          // Every existing token is revoked server-side by a reset, so there is
          // no session to carry forward: send them to log in with the new one.
          router.replace({ pathname: '/(auth)/login', params: { reset: '1' } })
        },
      },
    )
  }

  const { fieldErrors, message } = mutationErrors(reset.error)

  return (
    <AuthScreen
      title={t('m_auth_new_pw_t')}
      subtitle={t('m_auth_reset_s', { n: OTP_LENGTH, email })}
      error={message}
    >
      <TextField
        label={t('m_auth_reset_code')}
        value={otp}
        onChangeText={(text) => setOtp(text.replace(/\D/g, '').slice(0, OTP_LENGTH))}
        error={fieldErrors.otp}
        placeholder="123456"
        keyboardType="number-pad"
        textContentType="oneTimeCode"
        autoComplete="one-time-code"
        maxLength={OTP_LENGTH}
        autoFocus
        returnKeyType="next"
        onSubmitEditing={() => passwordRef.current?.focus()}
      />

      <TextField
        ref={passwordRef}
        label={t('m_auth_new_pw')}
        value={password}
        onChangeText={setPassword}
        error={localPasswordError ?? fieldErrors.password}
        placeholder={t('m_auth_min_hint', { n: MIN_PASSWORD_LENGTH })}
        autoCapitalize="none"
        autoComplete="new-password"
        textContentType="newPassword"
        secureToggle
        returnKeyType="go"
        onSubmitEditing={submit}
      />

      <Text style={styles.hint}>{t('m_auth_signs_out')}</Text>

      <Button
        label={t('m_auth_reset_t')}
        onPress={submit}
        loading={reset.isPending}
        disabled={otp.length !== OTP_LENGTH || password.length === 0}
        style={styles.submit}
      />
    </AuthScreen>
  )
}

const styles = StyleSheet.create({
  hint: {
    fontFamily: fonts.body,
    fontSize: 14,
    lineHeight: 20,
    color: colors.secondary[400],
    marginBottom: spacing.md,
  },
  submit: {
    marginTop: spacing.xs,
  },
})
