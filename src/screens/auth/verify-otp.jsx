import { useEffect, useRef, useState } from 'react'
import { Pressable, StyleSheet, Text, TextInput, View } from 'react-native'
import { useLocalSearchParams, useRouter } from '@/navigation'

import AuthScreen from '@/components/AuthScreen'
import Button from '@/components/Button'
import { useNotify } from '@/components/NotificationProvider'
import { useAuth } from '@/auth/AuthContext'
import { routeAfterAuth } from '@/auth/setupState'
import { useResendOtp, useVerifyOtp } from '@/hooks/useAuthActions'
import { useTranslate } from '@/lib/i18n'
import { mutationErrors } from '@/lib/formErrors'
import { colors, fonts, radii, spacing } from '@/theme'

const OTP_LENGTH = 6
const RESEND_COOLDOWN_SECONDS = 30

export default function VerifyOtp() {
  const t = useTranslate()
  const router = useRouter()
  const notify = useNotify()
  const { verifyOtp } = useAuth()
  const { email = '' } = useLocalSearchParams()
  const inputRef = useRef(null)

  const [code, setCode] = useState('')
  const [cooldown, setCooldown] = useState(0)

  useEffect(() => {
    if (cooldown <= 0) return undefined
    const timer = setTimeout(() => setCooldown((seconds) => seconds - 1), 1000)
    return () => clearTimeout(timer)
  }, [cooldown])

  const verify = useVerifyOtp(email)

  const submit = (value) =>
    verify.mutate(value, {
      onSuccess: ({ user }) => {
        notify.success(t('m_auth_verified'))
        // A freshly verified account has no course yet, so this lands on the
        // first setup step.
        router.replace(routeAfterAuth(user))
      },
      onError: () => setCode(''),
    })

  const resend = useResendOtp(email)

  const requestNewCode = () =>
    resend.mutate(undefined, {
      onSuccess: () => {
        setCooldown(RESEND_COOLDOWN_SECONDS)
        notify.info(t('m_auth_resent'))
      },
    })

  const onChange = (text) => {
    const digits = text.replace(/\D/g, '').slice(0, OTP_LENGTH)
    setCode(digits)
    // Submit the moment the last digit lands, so a pasted or auto-filled code
    // does not also require a button press.
    if (digits.length === OTP_LENGTH && !verify.isPending) submit(digits)
  }

  // Either request can fail, and only one banner exists, so the most recent
  // failure wins.
  const message =
    mutationErrors(verify.error).message ?? mutationErrors(resend.error).message

  return (
    <AuthScreen
      title={t('m_auth_otp_t')}
      subtitle={t('m_auth_otp_s', { n: OTP_LENGTH, email })}
      error={message}
    >
      {/* One real input holding the whole code, with the boxes drawn over it.
          Six separate inputs fight the keyboard, break paste, and defeat the
          OS's SMS/email autofill. */}
      <Pressable
        accessibilityRole="button"
        accessibilityLabel="Enter verification code"
        onPress={() => inputRef.current?.focus()}
        style={styles.boxes}
      >
        {Array.from({ length: OTP_LENGTH }, (_, i) => {
          const filled = i < code.length
          const active = i === code.length
          return (
            <View
              key={i}
              style={[styles.box, filled && styles.boxFilled, active && styles.boxActive]}
            >
              <Text style={styles.boxDigit}>{code[i] ?? ''}</Text>
            </View>
          )
        })}
      </Pressable>

      <TextInput
        ref={inputRef}
        value={code}
        onChangeText={onChange}
        keyboardType="number-pad"
        textContentType="oneTimeCode"
        autoComplete="one-time-code"
        maxLength={OTP_LENGTH}
        autoFocus
        style={styles.hiddenInput}
      />

      {resend.isSuccess && !resend.error ? (
        <Text style={styles.notice}>{t('m_auth_new_code_hint')}</Text>
      ) : null}

      <Button
        label={t('m_auth_verify')}
        onPress={() => submit(code)}
        loading={verify.isPending}
        disabled={code.length !== OTP_LENGTH}
        style={styles.submit}
      />

      <Pressable
        accessibilityRole="button"
        onPress={requestNewCode}
        disabled={cooldown > 0 || resend.isPending}
        hitSlop={8}
        style={({ pressed }) => [styles.resend, pressed && styles.pressed]}
      >
        <Text style={[styles.resendLabel, cooldown > 0 && styles.resendDisabled]}>
          {cooldown > 0 ? t('m_auth_resend_in', { n: cooldown }) : t('m_auth_resend')}
        </Text>
      </Pressable>
    </AuthScreen>
  )
}

const styles = StyleSheet.create({
  boxes: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: spacing.sm,
  },
  box: {
    flex: 1,
    height: 60,
    borderWidth: 2,
    borderColor: colors.secondary[200],
    borderRadius: radii.lg,
    backgroundColor: colors.white,
    alignItems: 'center',
    justifyContent: 'center',
  },
  boxFilled: {
    borderColor: colors.primary[400],
  },
  boxActive: {
    borderColor: colors.primary[500],
  },
  boxDigit: {
    fontFamily: fonts.display,
    fontSize: 24,
    color: colors.secondary[900],
  },
  // Kept mounted and focusable but visually out of the way: `display: none`
  // would stop it receiving the keyboard at all.
  hiddenInput: {
    position: 'absolute',
    opacity: 0,
    height: 1,
    width: 1,
  },
  notice: {
    fontFamily: fonts.bodySemi,
    fontSize: 14,
    color: colors.success[700],
    marginTop: spacing.md,
    textAlign: 'center',
  },
  submit: {
    marginTop: spacing.xl,
  },
  resend: {
    alignSelf: 'center',
    marginTop: spacing.md,
    paddingVertical: spacing.sm,
  },
  pressed: {
    opacity: 0.55,
  },
  resendLabel: {
    fontFamily: fonts.bodyBold,
    fontSize: 15,
    color: colors.primary[600],
  },
  resendDisabled: {
    color: colors.secondary[300],
  },
})
