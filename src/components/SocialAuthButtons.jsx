import { ActivityIndicator, Platform, Pressable, StyleSheet, Text, View } from 'react-native'
import { useRouter } from '@/navigation'
import Svg, { Path } from 'react-native-svg'

import { useOAuthSignIn } from '../hooks/useAuthActions'
import { routeAfterAuth } from '../auth/setupState'
import { useTranslate } from '../lib/i18n'
import { mutationErrors } from '../lib/formErrors'
import { colors, fonts, radii, spacing } from '../theme'

function GoogleMark() {
  // Google's four-colour G. Their brand terms require the official mark, so
  // these paths are the standard ones rather than something approximated.
  return (
    <Svg width={19} height={19} viewBox="0 0 48 48">
      <Path
        fill="#4285F4"
        d="M45.12 24.5c0-1.56-.14-3.06-.4-4.5H24v8.51h11.84c-.51 2.75-2.06 5.08-4.39 6.64v5.52h7.11c4.16-3.83 6.56-9.47 6.56-16.17z"
      />
      <Path
        fill="#34A853"
        d="M24 46c5.94 0 10.92-1.97 14.56-5.33l-7.11-5.52c-1.97 1.32-4.49 2.1-7.45 2.1-5.73 0-10.58-3.87-12.31-9.07H4.34v5.7C7.96 41.07 15.4 46 24 46z"
      />
      <Path
        fill="#FBBC05"
        d="M11.69 28.18C11.25 26.86 11 25.45 11 24s.25-2.86.69-4.18v-5.7H4.34C2.85 17.09 2 20.45 2 24s.85 6.91 2.34 9.88l7.35-5.7z"
      />
      <Path
        fill="#EA4335"
        d="M24 10.75c3.23 0 6.13 1.11 8.41 3.29l6.31-6.31C34.91 4.18 29.93 2 24 2 15.4 2 7.96 6.93 4.34 14.12l7.35 5.7c1.73-5.2 6.58-9.07 12.31-9.07z"
      />
    </Svg>
  )
}

function AppleMark({ color }) {
  return (
    <Svg width={19} height={19} viewBox="0 0 24 24">
      <Path
        fill={color}
        d="M17.05 12.66c.02 2.72 2.38 3.62 2.41 3.64-.02.06-.38 1.3-1.25 2.57-.75 1.1-1.54 2.2-2.78 2.22-1.21.03-1.6-.72-2.99-.72-1.38 0-1.82.7-2.97.74-1.19.05-2.09-1.18-2.85-2.28-1.65-2.39-2.91-6.76-1.22-9.71.84-1.47 2.34-2.4 3.97-2.42 1.17-.02 2.27.79 2.99.79.71 0 2.05-.98 3.46-.83.59.02 2.25.21 3.31 1.62-.09.05-1.98 1.16-1.96 3.45"
      />
      <Path
        fill={color}
        d="M14.6 4.2c.65-.79 1.09-1.88.97-2.97-.96.04-2.12.64-2.79 1.42-.6.7-1.13 1.81-.99 2.88 1.07.08 2.16-.54 2.81-1.33"
      />
    </Svg>
  )
}

/**
 * Google and Apple sign-in. Both providers go through the same backend OAuth
 * routes the web app uses; the only difference is that the callback redirects
 * back into this app carrying a token instead of setting a cookie.
 *
 * **Apple is iOS only.** It is *required* there — Apple's review guidelines
 * mandate Sign in with Apple wherever another third-party sign-in is offered —
 * but on Android it has no native sheet, so it fell back to a browser round
 * trip that few Android users have an Apple ID for. Offering it there cost the
 * Google button half the row and left its label cramped, which is the visible
 * half of the same problem.
 *
 * With one provider the button fills the row, which is the ordinary shape for a
 * single social sign-in and needs no special casing: `flex: 1` on the only
 * child does it.
 */
const SHOWS_APPLE = Platform.OS === 'ios'
export default function SocialAuthButtons({ label }) {
  const t = useTranslate()
  const router = useRouter()
  const oauth = useOAuthSignIn()

  // Where to land is this component's business, not the hook's: a null session
  // means the browser was closed, which is a cancellation, not a failure.
  const start = (provider) =>
    oauth.mutate(provider, {
      onSuccess: (session) => {
        if (session) router.replace(routeAfterAuth(session.user))
      },
      onError: (error) => {
        // The email already belongs to a password account. The backend has
        // stashed the link and wants the password proved once before joining
        // them, which is deliberate: a provider verifying an email does not
        // prove this is the person who set that account's password.
        //
        // Left as a bare error this is a dead end — the learner is told an
        // account exists and given nowhere to go. Sending them to login with
        // the address already filled in turns it into the one step it actually
        // is, after which the provider is linked automatically.
        if (error?.status === 409 && error?.payload?.email) {
          router.push({
            pathname: '/(auth)/login',
            params: { email: String(error.payload.email), linkProvider: provider },
          })
        }
      },
    })

  const { message } = mutationErrors(oauth.error)
  const pendingProvider = oauth.isPending ? oauth.variables : null

  return (
    <View style={styles.wrapper}>
      <View style={styles.dividerRow}>
        <View style={styles.rule} />
        <Text style={styles.dividerLabel}>{label ?? t('m_auth_or')}</Text>
        <View style={styles.rule} />
      </View>

      {message ? <Text style={styles.error}>{message}</Text> : null}

      <View style={styles.row}>
        <ProviderButton
          onPress={() => start('google')}
          disabled={oauth.isPending}
          loading={pendingProvider === 'google'}
          icon={<GoogleMark />}
          label={t('m_auth_google')}
          accessibilityLabel="Continue with Google"
        />
        {SHOWS_APPLE ? (
          <ProviderButton
            onPress={() => start('apple')}
            disabled={oauth.isPending}
            loading={pendingProvider === 'apple'}
            icon={<AppleMark color={colors.secondary[900]} />}
            label={t('m_auth_apple')}
            accessibilityLabel="Continue with Apple"
          />
        ) : null}
      </View>
    </View>
  )
}

function ProviderButton({ onPress, disabled, loading, icon, label, accessibilityLabel }) {
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={accessibilityLabel}
      accessibilityState={{ disabled: Boolean(disabled), busy: Boolean(loading) }}
      onPress={onPress}
      disabled={disabled}
      style={({ pressed }) => [
        styles.button,
        pressed && !disabled && styles.buttonPressed,
        disabled && styles.buttonDisabled,
      ]}
    >
      {loading ? (
        <ActivityIndicator color={colors.secondary[500]} size="small" />
      ) : (
        <>
          {icon}
          {/* Kept to one line so a longer translation shrinks rather than
              wrapping and pushing the button out of its row. */}
          <Text style={styles.buttonLabel} numberOfLines={1} adjustsFontSizeToFit minimumFontScale={0.8}>
            {label}
          </Text>
        </>
      )}
    </Pressable>
  )
}

const styles = StyleSheet.create({
  wrapper: {
    marginTop: spacing.lg,
  },
  dividerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
  },
  rule: {
    flex: 1,
    height: 1,
    backgroundColor: colors.secondary[200],
  },
  dividerLabel: {
    fontFamily: fonts.bodySemi,
    fontSize: 13,
    color: colors.secondary[400],
  },
  error: {
    fontFamily: fonts.bodySemi,
    fontSize: 13,
    color: colors.danger[600],
    textAlign: 'center',
    marginTop: spacing.md,
  },
  row: {
    flexDirection: 'row',
    gap: spacing.sm,
    marginTop: spacing.md,
  },
  button: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.sm,
    height: 52,
    backgroundColor: colors.white,
    borderWidth: 2,
    borderColor: colors.secondary[200],
    borderRadius: radii.lg,
  },
  buttonPressed: {
    opacity: 0.7,
  },
  buttonDisabled: {
    opacity: 0.5,
  },
  buttonLabel: {
    fontFamily: fonts.display,
    fontSize: 15,
    color: colors.secondary[800],
  },
})
