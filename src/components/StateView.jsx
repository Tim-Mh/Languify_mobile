import { StyleSheet, Text, View } from 'react-native'
import Animated, { FadeIn } from 'react-native-reanimated'

import Button from './Button'
import StateIcon from './StateIcon'
import { useLayout } from '../lib/responsive'
import { colors, fonts, spacing } from '../theme'

/**
 * One layout for every "there is nothing normal to show" moment: error, offline,
 * empty, slow, session expired, success.
 *
 * Keeping them in one component is the point. Nine bespoke screens drift apart,
 * and a user cannot tell an empty list from a failed request if each is styled
 * on its own.
 *
 * `inline` shrinks it to sit inside a page that still has other content around
 * it, rather than taking over the screen.
 */
export default function StateView({
  icon = 'error',
  tone = 'neutral',
  title,
  body,
  actionLabel,
  onAction,
  secondaryActionLabel,
  onSecondaryAction,
  inline = false,
  busy = false,
}) {
  const { size, column } = useLayout()

  return (
    <Animated.View
      entering={FadeIn.duration(240)}
      style={[styles.wrapper, inline ? styles.inline : styles.full]}
      accessibilityRole="summary"
    >
      <View style={column}>
        <View style={styles.centre}>
          <StateIcon name={icon} tone={tone} size={inline ? size(56) : size(76)} />

          <Text style={[styles.title, { fontSize: inline ? size(17) : size(20) }]}>{title}</Text>

          {body ? (
            <Text style={[styles.body, { fontSize: inline ? size(14) : size(15) }]}>{body}</Text>
          ) : null}
        </View>

        {actionLabel ? (
          <Button
            label={actionLabel}
            onPress={onAction}
            loading={busy}
            style={styles.action}
          />
        ) : null}

        {secondaryActionLabel ? (
          <Button
            label={secondaryActionLabel}
            variant="outline"
            onPress={onSecondaryAction}
            style={styles.secondary}
          />
        ) : null}
      </View>
    </Animated.View>
  )
}

const styles = StyleSheet.create({
  wrapper: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  full: {
    flex: 1,
    paddingHorizontal: spacing.lg,
  },
  inline: {
    paddingVertical: spacing.xl,
  },
  centre: {
    alignItems: 'center',
  },
  title: {
    fontFamily: fonts.display,
    color: colors.secondary[900],
    textAlign: 'center',
    marginTop: spacing.md,
  },
  body: {
    fontFamily: fonts.body,
    lineHeight: 22,
    color: colors.secondary[500],
    textAlign: 'center',
    marginTop: spacing.sm,
  },
  action: {
    marginTop: spacing.lg,
  },
  secondary: {
    marginTop: spacing.sm,
  },
})
