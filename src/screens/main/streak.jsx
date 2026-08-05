import { useState } from 'react'
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native'
import { useSafeAreaInsets } from 'react-native-safe-area-context'
import { useRouter } from '@/navigation'
import { LinearGradient } from 'react-native-linear-gradient'
import Animated, { FadeIn, FadeInDown } from 'react-native-reanimated'
import Check from 'lucide-react-native/icons/check'
import ChevronLeft from 'lucide-react-native/icons/chevron-left'
import ChevronRight from 'lucide-react-native/icons/chevron-right'
import Flame from 'lucide-react-native/icons/flame'
import Lock from 'lucide-react-native/icons/lock'
import Snowflake from 'lucide-react-native/icons/snowflake'

import { TAB_BAR_OVERHANG } from '@/components/TabBar'
import { useActivityCalendar, useGameState } from '@/hooks/useGame'
import { useRefresh } from '@/lib/useRefresh'
import { useGoBack } from '@/lib/useGoBack'
import { useTranslate } from '@/lib/i18n'
import { useLayout } from '@/lib/responsive'
import { colors, fonts, radii, shadows, spacing } from '@/theme'

/**
 * The same ladder the web app shows. It is client-side in both products: the
 * backend awards the badges, but the list of what is coming is fixed content.
 */
const MILESTONES = [
  { days: 3, titleKey: 'm_ms_started', gems: 0 },
  { days: 7, titleKey: 'm_ms_week', gems: 50 },
  { days: 30, titleKey: 'm_ms_month', gems: 150 },
  { days: 100, titleKey: 'm_ms_century', gems: 500 },
  { days: 365, titleKey: 'm_ms_year', gems: 2000 },
]

const MONTHS = [
  'January',
  'February',
  'March',
  'April',
  'May',
  'June',
  'July',
  'August',
  'September',
  'October',
  'November',
  'December',
]

/** Monday first, matching the web calendar and most of the world. */
const WEEKDAYS = ['M', 'T', 'W', 'T', 'F', 'S', 'S']

function nextMilestone(streak) {
  return MILESTONES.find((milestone) => milestone.days > streak) ?? null
}

/**
 * The leading blanks before the 1st, with Monday as column 0. JavaScript's
 * getDay() puts Sunday at 0, hence the shift.
 */
function leadingBlanks(year, month) {
  const weekday = new Date(year, month - 1, 1).getDay()
  return (weekday + 6) % 7
}

function daysInMonth(year, month) {
  return new Date(year, month, 0).getDate()
}

export default function Streak() {
  const insets = useSafeAreaInsets()
  const refreshControl = useRefresh()
  const router = useRouter()
  const goBack = useGoBack('/home')
  const t = useTranslate()
  const { contentWidth, size } = useLayout()

  const today = new Date()
  const [view, setView] = useState({ year: today.getFullYear(), month: today.getMonth() + 1 })

  const { data: state } = useGameState()
  const { data: calendar } = useActivityCalendar(view)

  const streak = state?.streak ?? 0
  const target = nextMilestone(streak)
  const progress = target ? Math.min(1, streak / target.days) : 1

  const activeDays = new Set(calendar?.activeDays ?? [])
  const frozenDays = new Set(calendar?.frozenDays ?? [])

  const isThisMonth =
    view.year === today.getFullYear() && view.month === today.getMonth() + 1

  const step = (delta) => {
    setView(({ year, month }) => {
      const next = month + delta
      if (next < 1) return { year: year - 1, month: 12 }
      if (next > 12) return { year: year + 1, month: 1 }
      return { year, month: next }
    })
  }

  const blanks = leadingBlanks(view.year, view.month)
  const total = daysInMonth(view.year, view.month)

  return (
    <View style={styles.screen}>
      <View style={[styles.header, { paddingTop: insets.top + spacing.sm }]}>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Go back"
          onPress={goBack}
          hitSlop={10}
          style={({ pressed }) => [styles.back, pressed && styles.pressed]}
        >
          <ChevronLeft size={22} color={colors.secondary[600]} strokeWidth={2.4} />
        </Pressable>

        <Text style={[styles.headerTitle, { fontSize: size(19) }]} numberOfLines={1}>
          Your streak
        </Text>
      </View>

      <ScrollView
        style={styles.scroll}
        refreshControl={refreshControl}
        contentContainerStyle={[
          styles.content,
          // Clears the tab bar's raised centre button, which overhangs the scene.
          { width: contentWidth, alignSelf: 'center', paddingBottom: spacing.xxl + TAB_BAR_OVERHANG },
        ]}
      >
        <Animated.View entering={FadeIn.duration(280)}>
          <LinearGradient
            colors={[colors.warning[400], colors.primary[500]]}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
            style={styles.hero}
          >
            <View style={styles.heroFlame}>
              <Flame size={size(34)} color={colors.white} strokeWidth={2.2} />
            </View>
            <Text style={[styles.heroValue, { fontSize: size(40) }]}>{streak}</Text>
            <Text style={styles.heroLabel}>
              {t('m_streak_days')}
            </Text>
            <Text style={styles.heroSub}>
              {streak > 0
                ? t('m_streak_keep')
                : t('m_streak_start')}
            </Text>
          </LinearGradient>
        </Animated.View>

        {target ? (
          <Animated.View entering={FadeInDown.delay(70).duration(320)} style={styles.card}>
            <View style={styles.cardHead}>
              <Text style={styles.cardTitle}>{t('m_streak_next')}</Text>
              <Text style={styles.cardMeta}>
                {streak} / {target.days}
              </Text>
            </View>
            <Text style={styles.cardBody}>
              {target.days - streak} more {target.days - streak === 1 ? 'day' : 'days'} to{' '}
              {target.title}
              {target.gems > 0 ? `, worth ${target.gems} gems` : ''}.
            </Text>
            <View style={styles.track}>
              <View style={[styles.fill, { width: `${Math.max(3, progress * 100)}%` }]} />
            </View>
          </Animated.View>
        ) : null}

        <Animated.View entering={FadeInDown.delay(140).duration(320)} style={styles.tiles}>
          <View style={styles.tile}>
            <Text style={styles.tileValue}>{state?.longestStreak ?? '–'}</Text>
            <Text style={styles.tileLabel}>{t('m_streak_longest')}</Text>
          </View>
          <View style={styles.tile}>
            <Text style={styles.tileValue}>{state?.todayXp ?? '–'}</Text>
            <Text style={styles.tileLabel}>{t('m_streak_xp_today')}</Text>
          </View>
        </Animated.View>

        <Animated.View entering={FadeInDown.delay(210).duration(320)} style={styles.card}>
          <Text style={styles.cardTitle}>{t('m_streak_freezes')}</Text>
          {state?.maxStreakFreezes > 0 ? (
            <>
              <View style={styles.freezes}>
                {Array.from({ length: state.maxStreakFreezes }, (_, i) => (
                  <View
                    key={i}
                    style={[
                      styles.freeze,
                      i < (state.streakFreezesRemaining ?? 0) && styles.freezeFull,
                    ]}
                  >
                    <Snowflake
                      size={16}
                      color={
                        i < (state.streakFreezesRemaining ?? 0)
                          ? colors.white
                          : colors.secondary[300]
                      }
                      strokeWidth={2.3}
                    />
                  </View>
                ))}
              </View>
              <Text style={styles.cardBody}>
                A freeze keeps your streak alive on a day you miss. You have{' '}
                {state.streakFreezesRemaining} of {state.maxStreakFreezes}.
              </Text>
            </>
          ) : (
            <Text style={[styles.cardBody, styles.cardBodyTop]}>
              {t('m_streak_fr_body')}
            </Text>
          )}
        </Animated.View>

        <Animated.View entering={FadeInDown.delay(280).duration(320)} style={styles.card}>
          <View style={styles.monthBar}>
            <Pressable
              accessibilityRole="button"
              accessibilityLabel="Previous month"
              onPress={() => step(-1)}
              hitSlop={10}
              style={({ pressed }) => [styles.monthStep, pressed && styles.pressed]}
            >
              <ChevronLeft size={18} color={colors.secondary[500]} strokeWidth={2.4} />
            </Pressable>

            <Text style={styles.monthLabel}>
              {MONTHS[view.month - 1]} {view.year}
            </Text>

            <Pressable
              accessibilityRole="button"
              accessibilityLabel="Next month"
              onPress={() => step(1)}
              disabled={isThisMonth}
              hitSlop={10}
              style={({ pressed }) => [
                styles.monthStep,
                isThisMonth && styles.monthStepInert,
                pressed && styles.pressed,
              ]}
            >
              <ChevronRight size={18} color={colors.secondary[500]} strokeWidth={2.4} />
            </Pressable>
          </View>

          <View style={styles.week}>
            {WEEKDAYS.map((day, i) => (
              <Text key={i} style={styles.weekday}>
                {day}
              </Text>
            ))}
          </View>

          <View style={styles.grid}>
            {Array.from({ length: blanks }, (_, i) => (
              <View key={`blank-${i}`} style={styles.cell} />
            ))}

            {Array.from({ length: total }, (_, i) => {
              const day = i + 1
              const practised = activeDays.has(day)
              const frozen = frozenDays.has(day)
              const isToday = isThisMonth && day === today.getDate()

              return (
                /* The date always stays readable: the icon marks what happened
                   that day, the number says which day it was, so the calendar
                   never stops being a calendar. */
                <View key={day} style={styles.cell}>
                  <View
                    style={[
                      styles.dayDot,
                      practised && styles.dayDone,
                      frozen && styles.dayFrozen,
                      isToday && !practised && !frozen && styles.dayToday,
                    ]}
                  >
                    {practised ? (
                      <Flame size={13} color={colors.white} strokeWidth={2.6} />
                    ) : frozen ? (
                      <Snowflake size={13} color={colors.white} strokeWidth={2.6} />
                    ) : null}

                    <Text
                      style={[
                        styles.dayNumber,
                        (practised || frozen) && styles.dayNumberMarked,
                      ]}
                    >
                      {day}
                    </Text>
                  </View>
                </View>
              )
            })}
          </View>

          <View style={styles.legend}>
            <View style={styles.legendItem}>
              <View style={[styles.legendDot, styles.dayDone]}>
                <Flame size={11} color={colors.white} strokeWidth={2.8} />
              </View>
              <Text style={styles.legendText}>{t('m_streak_practised')}</Text>
            </View>
            <View style={styles.legendItem}>
              <View style={[styles.legendDot, styles.dayFrozen]}>
                <Snowflake size={11} color={colors.white} strokeWidth={2.8} />
              </View>
              <Text style={styles.legendText}>{t('m_streak_frozen')}</Text>
            </View>
          </View>
        </Animated.View>

        <Text style={styles.sectionLabel}>{t('m_streak_milestones')}</Text>

        {MILESTONES.map((milestone, index) => {
          const reached = streak >= milestone.days

          return (
            <Animated.View
              key={milestone.days}
              entering={FadeInDown.delay(340 + index * 50).duration(300)}
              style={styles.milestone}
            >
              <View style={[styles.milestoneIcon, reached && styles.milestoneIconDone]}>
                {reached ? (
                  <Check size={15} color={colors.white} strokeWidth={3} />
                ) : (
                  <Lock size={14} color={colors.secondary[300]} strokeWidth={2.4} />
                )}
              </View>
              <View style={styles.milestoneCopy}>
                <Text style={styles.milestoneTitle}>{milestone.title}</Text>
                <Text style={styles.milestoneMeta}>
                  {milestone.days} days
                  {milestone.gems > 0 ? ` · ${milestone.gems} gems` : ''}
                </Text>
              </View>
            </Animated.View>
          )
        })}
      </ScrollView>
    </View>
  )
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: colors.secondary[50],
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    paddingHorizontal: spacing.lg,
    paddingBottom: spacing.sm,
  },
  back: {
    width: 40,
    height: 40,
    borderRadius: radii.pill,
    backgroundColor: colors.white,
    alignItems: 'center',
    justifyContent: 'center',
    ...shadows.card,
  },
  pressed: {
    opacity: 0.75,
  },
  headerTitle: {
    flex: 1,
    fontFamily: fonts.display,
    color: colors.secondary[900],
  },
  scroll: {
    flex: 1,
  },
  content: {
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.sm,
  },
  hero: {
    alignItems: 'center',
    borderRadius: radii.xl,
    paddingVertical: spacing.lg,
    paddingHorizontal: spacing.md,
    ...shadows.lifted,
  },
  heroFlame: {
    width: 68,
    height: 68,
    borderRadius: radii.pill,
    backgroundColor: 'rgba(255, 255, 255, 0.22)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  heroValue: {
    fontFamily: fonts.display,
    color: colors.white,
    marginTop: spacing.sm,
  },
  heroLabel: {
    fontFamily: fonts.bodyBold,
    fontSize: 13,
    letterSpacing: 1,
    color: colors.white,
    textTransform: 'uppercase',
  },
  heroSub: {
    fontFamily: fonts.body,
    fontSize: 13.5,
    color: 'rgba(255, 255, 255, 0.9)',
    marginTop: 6,
    textAlign: 'center',
  },
  card: {
    backgroundColor: colors.white,
    borderRadius: radii.xl,
    padding: spacing.md,
    marginTop: spacing.md,
    ...shadows.card,
  },
  cardHead: {
    flexDirection: 'row',
    alignItems: 'baseline',
    justifyContent: 'space-between',
  },
  cardTitle: {
    fontFamily: fonts.display,
    fontSize: 15.5,
    color: colors.secondary[900],
  },
  cardMeta: {
    fontFamily: fonts.bodyBold,
    fontSize: 13,
    color: colors.primary[600],
  },
  cardBody: {
    fontFamily: fonts.body,
    fontSize: 13,
    lineHeight: 19,
    color: colors.secondary[400],
    marginTop: 4,
  },
  cardBodyTop: {
    marginTop: 6,
  },
  track: {
    height: 9,
    borderRadius: radii.pill,
    backgroundColor: colors.secondary[100],
    overflow: 'hidden',
    marginTop: spacing.sm,
  },
  fill: {
    height: '100%',
    borderRadius: radii.pill,
    backgroundColor: colors.primary[500],
  },
  tiles: {
    flexDirection: 'row',
    gap: spacing.sm,
    marginTop: spacing.md,
  },
  tile: {
    flex: 1,
    alignItems: 'center',
    backgroundColor: colors.white,
    borderRadius: radii.xl,
    paddingVertical: spacing.md,
    ...shadows.card,
  },
  tileValue: {
    fontFamily: fonts.display,
    fontSize: 22,
    color: colors.secondary[900],
  },
  tileLabel: {
    fontFamily: fonts.bodySemi,
    fontSize: 11.5,
    color: colors.secondary[400],
    marginTop: 2,
  },
  freezes: {
    flexDirection: 'row',
    gap: spacing.sm,
    marginTop: spacing.sm,
  },
  freeze: {
    width: 34,
    height: 34,
    borderRadius: radii.pill,
    backgroundColor: colors.secondary[100],
    alignItems: 'center',
    justifyContent: 'center',
  },
  freezeFull: {
    backgroundColor: colors.accent[500],
  },
  monthBar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  monthStep: {
    width: 32,
    height: 32,
    borderRadius: radii.pill,
    backgroundColor: colors.secondary[50],
    alignItems: 'center',
    justifyContent: 'center',
  },
  monthStepInert: {
    opacity: 0.35,
  },
  monthLabel: {
    fontFamily: fonts.display,
    fontSize: 15,
    color: colors.secondary[900],
  },
  week: {
    flexDirection: 'row',
    marginTop: spacing.md,
  },
  weekday: {
    width: `${100 / 7}%`,
    textAlign: 'center',
    fontFamily: fonts.bodyBold,
    fontSize: 11,
    color: colors.secondary[300],
  },
  grid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    marginTop: 4,
  },
  cell: {
    width: `${100 / 7}%`,
    alignItems: 'center',
    paddingVertical: 3,
  },
  dayDot: {
    width: 36,
    height: 40,
    // Fully rounded rather than a softened square. The marked days are filled
    // blocks of colour, and at this size a 12pt radius still read as boxes in a
    // grid; a pill makes them read as marks on a calendar.
    borderRadius: radii.pill,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 1,
  },
  dayDone: {
    backgroundColor: colors.primary[500],
  },
  dayFrozen: {
    backgroundColor: colors.accent[500],
  },
  dayToday: {
    borderWidth: 2,
    borderColor: colors.primary[300],
  },
  dayNumber: {
    fontFamily: fonts.bodySemi,
    fontSize: 11.5,
    color: colors.secondary[400],
  },
  dayNumberMarked: {
    color: colors.white,
    fontFamily: fonts.bodyBold,
  },
  legend: {
    flexDirection: 'row',
    gap: spacing.md,
    marginTop: spacing.sm,
  },
  legendItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  legendDot: {
    width: 18,
    height: 18,
    borderRadius: radii.sm,
    alignItems: 'center',
    justifyContent: 'center',
  },
  legendText: {
    fontFamily: fonts.bodySemi,
    fontSize: 11.5,
    color: colors.secondary[400],
  },
  sectionLabel: {
    fontFamily: fonts.bodyBold,
    fontSize: 11,
    letterSpacing: 1,
    color: colors.secondary[400],
    marginTop: spacing.xl,
    marginBottom: spacing.sm,
  },
  milestone: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    backgroundColor: colors.white,
    borderRadius: radii.lg,
    padding: spacing.md,
    marginBottom: spacing.sm,
    ...shadows.card,
  },
  milestoneIcon: {
    width: 32,
    height: 32,
    borderRadius: radii.pill,
    backgroundColor: colors.secondary[100],
    alignItems: 'center',
    justifyContent: 'center',
  },
  milestoneIconDone: {
    backgroundColor: colors.success[500],
  },
  milestoneCopy: {
    flex: 1,
  },
  milestoneTitle: {
    fontFamily: fonts.display,
    fontSize: 15,
    color: colors.secondary[900],
  },
  milestoneMeta: {
    fontFamily: fonts.bodySemi,
    fontSize: 12,
    color: colors.secondary[400],
    marginTop: 1,
  },
})
