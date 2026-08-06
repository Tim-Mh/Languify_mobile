import { useEffect, useState } from 'react'
import { Modal, StyleSheet, Text, View } from 'react-native'
import Animated, { FadeIn, ZoomIn } from 'react-native-reanimated'
import Award from 'lucide-react-native/icons/award'
import Flame from 'lucide-react-native/icons/flame'
import Gem from 'lucide-react-native/icons/gem'
import Zap from 'lucide-react-native/icons/zap'

import Button from './Button'
import Confetti from './Confetti'
import { sounds } from '../lib/sounds'
import { useLayout } from '../lib/responsive'
import { colors, fonts, radii, shadows, spacing } from '../theme'

const REWARD_ICONS = {
  gems: { Icon: Gem, color: colors.accent[500], tint: colors.accent[50] },
  xp: { Icon: Zap, color: colors.warning[500], tint: colors.warning[50] },
  streak: { Icon: Flame, color: colors.warning[500], tint: colors.warning[50] },
  badge: { Icon: Award, color: colors.primary[500], tint: colors.primary[50] },
}

/**
 * The payoff moment: chest opened, quest collected, lesson finished.
 *
 * The confetti is mounted only once the modal's native window is actually on
 * screen, and that is the whole reason it works. A `Modal` is a separate native
 * window, and the burst is a native-driver `Animated` sequence that starts in
 * `componentDidMount`: mounted with the modal's children, it began attaching to
 * a window that was not up yet, and a three-second animation that starts before
 * anything is visible is over before it can be seen. `onShow` is the signal
 * that the window is live; the timer is a fallback so a platform that does not
 * fire it still celebrates.
 *
 * It renders *after* the card, not before. Behind it, the card covers most of
 * the screen and swallowed nearly the whole burst. `pointerEvents="none"` is
 * what makes that safe: the pieces fall over the Continue button without ever
 * stealing a tap meant for it.
 *
 * The card settles rather than bounces. A spring entrance overshoots and wobbles
 * back, which on a card this size reads as the whole dialog giggling at you and
 * makes the reward numbers hard to read for the first half-second.
 */
export default function RewardModal({
  visible,
  title,
  subtitle,
  rewards = [],
  actionLabel = 'Nice',
  onClose,
  celebrate = true,
}) {
  const { column, size } = useLayout()
  /** True once the modal's native window is up and the burst can be fired. */
  const [live, setLive] = useState(false)

  useEffect(() => {
    if (!visible) {
      setLive(false)
      return undefined
    }

    // Backstop for `onShow`. Long enough for the window to attach and for the
    // card's own entrance to be under way, short enough that the celebration
    // still reads as a response to finishing.
    const timer = setTimeout(() => setLive(true), 260)
    return () => clearTimeout(timer)
  }, [visible])

  /**
   * The fanfare, fired with the confetti rather than by each caller.
   *
   * It used to be the caller's job, which meant a lesson and a gem purchase
   * played it and the daily chest, a claimed quest and a claimed badge did not
   * — the popups that most look like a celebration were the silent ones. Tying
   * it to the same `live` flag the burst uses keeps sound and confetti in step,
   * and means a new reward popup gets both for free.
   */
  useEffect(() => {
    if (live && celebrate) sounds.complete()
  }, [live, celebrate])

  return (
    <Modal
      visible={visible}
      transparent
      animationType="none"
      onShow={() => setLive(true)}
      onRequestClose={onClose}
    >
      <Animated.View entering={FadeIn.duration(180)} style={styles.scrim}>
        <Animated.View entering={ZoomIn.duration(240)} style={[styles.card, column]}>
          <Text style={[styles.title, { fontSize: size(24) }]}>{title}</Text>
          {subtitle ? <Text style={styles.subtitle}>{subtitle}</Text> : null}

          {rewards.length > 0 ? (
            <View style={styles.rewards}>
              {rewards.map((reward) => {
                const { Icon, color, tint } =
                  REWARD_ICONS[reward.kind] ?? REWARD_ICONS.gems

                return (
                  <View key={`${reward.kind}-${reward.label}`} style={styles.reward}>
                    <View style={[styles.rewardIcon, { backgroundColor: tint }]}>
                      <Icon size={22} color={color} strokeWidth={2.2} />
                    </View>
                    <Text style={styles.rewardValue}>{reward.value}</Text>
                    <Text style={styles.rewardLabel}>{reward.label}</Text>
                  </View>
                )
              })}
            </View>
          ) : null}

          <Button label={actionLabel} onPress={onClose} style={styles.action} />
        </Animated.View>
      </Animated.View>

      {/*
        A sibling of the scrim, not a child of it, and outside every Reanimated
        view.

        It sat inside the scrim next to the card, which put it in an elevation
        contest with an animated sibling on Android and made it a child of a
        Reanimated view whose own entering animation governs when its subtree
        draws. Neither is a fight worth having for decoration. Out here it is a
        plain overlay on the modal's own window with nothing above it.

        Mounted fresh each time the modal opens, so the burst replays.
      */}
      {celebrate && live ? <Confetti /> : null}
    </Modal>
  )
}

const styles = StyleSheet.create({
  scrim: {
    flex: 1,
    backgroundColor: colors.overlay.scrim,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: spacing.lg,
  },
  card: {
    backgroundColor: colors.white,
    borderRadius: radii.xl,
    padding: spacing.lg,
    alignItems: 'center',
    ...shadows.lifted,
  },
  title: {
    fontFamily: fonts.display,
    color: colors.secondary[900],
    textAlign: 'center',
  },
  subtitle: {
    fontFamily: fonts.body,
    fontSize: 15,
    lineHeight: 22,
    color: colors.secondary[500],
    textAlign: 'center',
    marginTop: spacing.sm,
  },
  rewards: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'center',
    gap: spacing.md,
    marginTop: spacing.lg,
  },
  reward: {
    alignItems: 'center',
    minWidth: 84,
  },
  rewardIcon: {
    width: 46,
    height: 46,
    borderRadius: radii.pill,
    alignItems: 'center',
    justifyContent: 'center',
  },
  rewardValue: {
    fontFamily: fonts.display,
    fontSize: 19,
    color: colors.secondary[900],
    marginTop: 6,
  },
  rewardLabel: {
    fontFamily: fonts.bodySemi,
    fontSize: 11.5,
    color: colors.secondary[400],
  },
  action: {
    alignSelf: 'stretch',
    marginTop: spacing.lg,
  },
})
