import { useState } from 'react'
import { StyleSheet } from 'react-native'
import { useRouter } from '@/navigation'

import AuthScreen from '@/components/AuthScreen'
import Button from '@/components/Button'
import TextField from '@/components/TextField'
import { useNotify } from '@/components/NotificationProvider'
import { useForgotPassword } from '@/hooks/useAuthActions'
import { useTranslate } from '@/lib/i18n'
import { mutationErrors } from '@/lib/formErrors'
import { spacing } from '@/theme'

export default function ForgotPassword() {
  const t = useTranslate()
  const router = useRouter()
  const notify = useNotify()
  const [email, setEmail] = useState('')

  const request = useForgotPassword()

  const submit = () =>
    request.mutate(email.trim(), {
      onSuccess: () => {
        notify.info(t('m_auth_forgot_ok'))
        // The endpoint answers the same way whether or not the address exists,
        // so that an attacker cannot use it to discover who has an account.
        // Move on regardless and let the reset screen judge the code.
        router.push({ pathname: '/(auth)/reset-password', params: { email: email.trim() } })
      },
    })

  const { fieldErrors, message } = mutationErrors(request.error)

  return (
    <AuthScreen
      title={t('m_auth_forgot_t')}
      subtitle={t('m_auth_forgot_s')}
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
        autoFocus
        returnKeyType="go"
        onSubmitEditing={submit}
      />

      <Button
        label={t('m_auth_send_code')}
        onPress={submit}
        loading={request.isPending}
        disabled={email.trim().length === 0}
        style={styles.submit}
      />
    </AuthScreen>
  )
}

const styles = StyleSheet.create({
  submit: {
    marginTop: spacing.md,
  },
})
