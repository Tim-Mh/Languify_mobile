import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from 'react'
import { Pressable, StyleSheet, Text, View } from 'react-native'
import { useSafeAreaInsets } from 'react-native-safe-area-context'
import Animated, { FadeOutUp, SlideInUp } from 'react-native-reanimated'
import CircleCheck from 'lucide-react-native/icons/circle-check'
import CircleX from 'lucide-react-native/icons/circle-x'
import Info from 'lucide-react-native/icons/info'
import X from 'lucide-react-native/icons/x'

import { useLayout } from '../lib/responsive'
import { colors, fonts, radii, shadows, spacing } from '../theme'

const NotificationContext = createContext(null)

const DEFAULT_DURATION_MS = 3400

/**
 * Card on the app's own surface with a coloured accent rail, rather than a solid
 * block of colour. Keeps notifications part of the interface instead of a system
 * banner pasted on top of it.
 */
const TONES = {
  success: { accent: colors.success[500], icon: CircleCheck, tint: colors.success[50] },
  error: { accent: colors.danger[500], icon: CircleX, tint: colors.danger[50] },
  info: { accent: colors.primary[500], icon: Info, tint: colors.primary[50] },
}

export function NotificationProvider({ children }) {
  const insets = useSafeAreaInsets()
  const { column } = useLayout()
  const [notice, setNotice] = useState(null)
  const timer = useRef(null)

  const dismiss = useCallback(() => {
    clearTimeout(timer.current)
    setNotice(null)
  }, [])

  const show = useCallback(({ message, title, tone = 'info', duration = DEFAULT_DURATION_MS }) => {
    if (!message) return

    clearTimeout(timer.current)
    // The id forces a remount, so a second notification replays the entry
    // animation instead of silently swapping its text.
    setNotice({ message, title, tone, id: `${tone}-${message}-${Math.random()}` })

    timer.current = setTimeout(() => setNotice(null), duration)
  }, [])

  useEffect(() => () => clearTimeout(timer.current), [])

  const value = useMemo(
    () => ({
      show,
      dismiss,
      success: (message, options) => show({ ...options, message, tone: 'success' }),
      error: (message, options) => show({ ...options, message, tone: 'error' }),
      info: (message, options) => show({ ...options, message, tone: 'info' }),
    }),
    [dismiss, show],
  )

  const palette = notice ? (TONES[notice.tone] ?? TONES.info) : null
  const Icon = palette?.icon

  return (
    <NotificationContext.Provider value={value}>
      {children}

      {notice ? (
        <View pointerEvents="box-none" style={[styles.host, { paddingTop: insets.top + spacing.sm }]}>
          <Animated.View
            key={notice.id}
            entering={SlideInUp.duration(280)}
            exiting={FadeOutUp.duration(200)}
            style={column}
          >
            <Pressable
              accessibilityRole="alert"
              accessibilityLabel={notice.message}
              onPress={dismiss}
              style={({ pressed }) => [styles.card, pressed && styles.pressed]}
            >
              <View style={[styles.rail, { backgroundColor: palette.accent }]} />

              <View style={[styles.iconWrap, { backgroundColor: palette.tint }]}>
                <Icon size={18} color={palette.accent} strokeWidth={2.2} />
              </View>

              <View style={styles.copy}>
                {notice.title ? <Text style={styles.title}>{notice.title}</Text> : null}
                <Text style={styles.message} numberOfLines={3}>
                  {notice.message}
                </Text>
              </View>

              <View style={styles.close}>
                <X size={16} color={colors.secondary[300]} strokeWidth={2.4} />
              </View>
            </Pressable>
          </Animated.View>
        </View>
      ) : null}
    </NotificationContext.Provider>
  )
}

export function useNotify() {
  const context = useContext(NotificationContext)
  if (!context) throw new Error('useNotify must be used inside a NotificationProvider')
  return context
}

const styles = StyleSheet.create({
  host: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    alignItems: 'center',
    paddingHorizontal: spacing.md,
    // Above every screen, including modals.
    zIndex: 1000,
  },
  card: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    backgroundColor: colors.white,
    borderRadius: radii.lg,
    paddingRight: spacing.md,
    paddingLeft: spacing.md + 6,
    paddingVertical: 14,
    overflow: 'hidden',
    ...shadows.lifted,
  },
  pressed: {
    opacity: 0.9,
  },
  rail: {
    position: 'absolute',
    left: 0,
    top: 0,
    bottom: 0,
    width: 6,
  },
  iconWrap: {
    width: 32,
    height: 32,
    borderRadius: radii.pill,
    alignItems: 'center',
    justifyContent: 'center',
  },
  copy: {
    flex: 1,
  },
  title: {
    fontFamily: fonts.display,
    fontSize: 14,
    color: colors.secondary[900],
    marginBottom: 2,
  },
  message: {
    fontFamily: fonts.bodySemi,
    fontSize: 14,
    lineHeight: 19,
    color: colors.secondary[600],
  },
  close: {
    paddingLeft: 2,
  },
})
