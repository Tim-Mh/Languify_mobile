import {
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native'
import { useSafeAreaInsets } from 'react-native-safe-area-context'
import { useRouter } from '@/navigation'

import { useTranslate } from '../lib/i18n'
import { useLayout } from '../lib/responsive'
import { UNAUTHENTICATED } from '../routes'
import { colors, fonts, radii, spacing } from '../theme'

/**
 * Shared chrome for every auth screen: back button, title, subtitle, an error
 * banner, and a scroll view that gets out of the keyboard's way.
 */
export default function AuthScreen({ title, subtitle, error, children, onBack }) {
  const t = useTranslate()
  const insets = useSafeAreaInsets()
  const router = useRouter()
  const { contentWidth, size, isShort } = useLayout()

  const goBack = () => {
    if (onBack) return onBack()
    if (router.canGoBack()) return router.back()
    router.replace(UNAUTHENTICATED)
  }

  return (
    <KeyboardAvoidingView
      style={styles.screen}
      // Only iOS needs the manual offset; Android's windowSoftInputMode already
      // resizes the view and doubling up leaves a gap under the keyboard.
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
    >
      <ScrollView
        contentContainerStyle={[
          styles.content,
          {
            paddingTop: insets.top + spacing.md,
            paddingBottom: insets.bottom + spacing.xl,
            width: contentWidth,
            alignSelf: 'center',
          },
        ]}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
      >
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Go back"
          onPress={goBack}
          hitSlop={12}
          style={({ pressed }) => [styles.back, pressed && styles.pressed]}
        >
          <Text style={styles.backLabel}>{t('m_back_label')}</Text>
        </Pressable>

        <Text style={[styles.title, { fontSize: size(30), lineHeight: size(38) }]}>{title}</Text>
        {/* Dropped on a short screen: with the keyboard up it is the first thing
            worth sacrificing to keep the fields visible. */}
        {subtitle && !isShort ? <Text style={styles.subtitle}>{subtitle}</Text> : null}

        {error ? (
          <View style={styles.banner}>
            <Text style={styles.bannerText}>{error}</Text>
          </View>
        ) : null}

        <View style={styles.form}>{children}</View>
      </ScrollView>
    </KeyboardAvoidingView>
  )
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: colors.surface,
  },
  content: {
    flexGrow: 1,
    paddingHorizontal: spacing.lg,
  },
  back: {
    alignSelf: 'flex-start',
    paddingVertical: spacing.sm,
    marginBottom: spacing.sm,
  },
  pressed: {
    opacity: 0.55,
  },
  backLabel: {
    fontFamily: fonts.bodyBold,
    fontSize: 15,
    color: colors.secondary[500],
  },
  title: {
    fontFamily: fonts.display,
    color: colors.secondary[900],
  },
  subtitle: {
    fontFamily: fonts.body,
    fontSize: 16,
    lineHeight: 24,
    color: colors.secondary[500],
    marginTop: spacing.sm,
  },
  banner: {
    backgroundColor: colors.danger[50],
    borderWidth: 2,
    borderColor: colors.danger[300],
    borderRadius: radii.lg,
    padding: spacing.md,
    marginTop: spacing.lg,
  },
  bannerText: {
    fontFamily: fonts.bodySemi,
    fontSize: 14,
    lineHeight: 20,
    color: colors.danger[700],
  },
  form: {
    marginTop: spacing.xl,
  },
})
