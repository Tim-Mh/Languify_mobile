import { Modal, StyleSheet, Text, View } from 'react-native'
import Animated, { FadeIn, ZoomIn } from 'react-native-reanimated'

import Button from './Button'
import { useLayout } from '../lib/responsive'
import { colors, fonts, radii, shadows, spacing } from '../theme'

/**
 * "Are you sure?" in the app's own skin.
 *
 * The platform `Alert.alert` is a system dialog: it ignores the theme, renders
 * differently on each OS, and cannot show a spinner while the action it
 * confirms is still in flight. Anything irreversible goes through here instead.
 */
export default function ConfirmDialog({
  visible,
  title,
  body,
  confirmLabel = 'Confirm',
  cancelLabel = 'Cancel',
  destructive = false,
  loading = false,
  onConfirm,
  onCancel,
}) {
  const { column, size } = useLayout()

  return (
    <Modal visible={visible} transparent animationType="none" onRequestClose={onCancel}>
      <Animated.View entering={FadeIn.duration(160)} style={styles.scrim}>
        {/* Settles rather than bounces, matching RewardModal: a spring overshoot
            on a dialog this size reads as a wobble, not as delight. */}
        <Animated.View entering={ZoomIn.duration(220)} style={[styles.card, column]}>
          <Text style={[styles.title, { fontSize: size(20) }]}>{title}</Text>
          {body ? <Text style={styles.body}>{body}</Text> : null}

          <Button
            label={confirmLabel}
            variant={destructive ? 'secondary' : 'primary'}
            onPress={onConfirm}
            loading={loading}
            style={styles.action}
          />
          {/* Cancelling stays available while the action runs, so a slow network
              never traps the learner in the dialog. */}
          <Button
            label={cancelLabel}
            variant="outline"
            onPress={onCancel}
            style={styles.action}
          />
        </Animated.View>
      </Animated.View>
    </Modal>
  )
}

const styles = StyleSheet.create({
  scrim: {
    flex: 1,
    backgroundColor: 'rgba(40, 27, 55, 0.55)',
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: spacing.lg,
  },
  card: {
    backgroundColor: colors.white,
    borderRadius: radii.xl,
    padding: spacing.lg,
    ...shadows.lifted,
  },
  title: {
    fontFamily: fonts.display,
    color: colors.secondary[900],
  },
  body: {
    fontFamily: fonts.body,
    fontSize: 14.5,
    lineHeight: 21,
    color: colors.secondary[500],
    marginTop: spacing.sm,
  },
  action: {
    marginTop: spacing.md,
  },
})
