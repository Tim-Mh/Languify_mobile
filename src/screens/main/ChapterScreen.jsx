import { useMemo, useState } from 'react'
import { Image, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native'
import { useSafeAreaInsets } from 'react-native-safe-area-context'
import { useLocalSearchParams, useRouter } from '@/navigation'
import { LinearGradient } from 'react-native-linear-gradient'
import Animated, { FadeIn } from 'react-native-reanimated'
import BookOpen from 'lucide-react-native/icons/book-open'
import Check from 'lucide-react-native/icons/check'
import ChevronLeft from 'lucide-react-native/icons/chevron-left'
import Lock from 'lucide-react-native/icons/lock'
import Star from 'lucide-react-native/icons/star'

import { useNotify } from '@/components/NotificationProvider'
import ProgressRing from '@/components/ProgressRing'
import QueryState from '@/components/QueryState'
import { UnitPathSkeleton } from '@/components/Skeleton'
import SnakePath, {
  NODE_SIZE,
  nodeLean,
  nodePosition,
  pathHeight,
} from '@/components/SnakePath'
import { TAB_BAR_OVERHANG } from '@/components/TabBar'
import { useLessonsForUnits, useUnits } from '@/hooks/useLessons'
import { useAuth } from '@/auth/AuthContext'
import { characterAt } from '@/lib/characters'
import { useRefresh } from '@/lib/useRefresh'
import { useGoBack } from '@/lib/useGoBack'
import { useTranslate } from '@/lib/i18n'
import { useLayout } from '@/lib/responsive'
import { sounds } from '@/lib/sounds'
import { colors, fonts, radii, shadows, spacing } from '@/theme'

/** Matches the web: the path column is capped so it snakes rather than sprawls. */
const PATH_MAX_WIDTH = 340
const CHARACTER_WIDTH = 92

/** How far the session ring sits outside the node it wraps. */
const RING_GAP = 9
const RING_SIZE = NODE_SIZE + RING_GAP * 2

export default function ChapterPath() {
  const insets = useSafeAreaInsets()
  const refreshControl = useRefresh()
  const router = useRouter()
  const goBack = useGoBack('/home')
  const notify = useNotify()
  const { id, title } = useLocalSearchParams()
  const { user } = useAuth()
  const t = useTranslate()
  const { width, size } = useLayout()

  const [pathWidth, setPathWidth] = useState(0)

  const unitsQuery = useUnits(id)

  const units = useMemo(() => unitsQuery.data?.units ?? [], [unitsQuery.data])

  // Every unit's lessons, in parallel, so the whole chapter renders as one
  // continuous path exactly like the web's Units page.
  const lessonQueries = useLessonsForUnits(units)

  const lessonsByUnit = {}
  units.forEach((unit, index) => {
    lessonsByUnit[unit.id] = lessonQueries[index]?.data?.lessons ?? []
  })

  // Progression runs across the whole chapter, not per unit: the first
  // unfinished lesson anywhere is the only one open.
  const flatLessons = units.flatMap((unit) => lessonsByUnit[unit.id] ?? [])
  const currentLessonIndex = (() => {
    const index = flatLessons.findIndex((lesson) => !lesson.completed)
    return index === -1 ? flatLessons.length : index
  })()
  const lessonOrder = new Map(flatLessons.map((lesson, index) => [lesson.id, index]))

  const openLesson = (lesson, isLocked) => {
    // Played for a locked node too: the tap did something, it just said no, and
    // silence there reads as the button being broken rather than refusing.
    sounds.click()

    if (isLocked) {
      notify.info(t('m_finish_previous'))
      return
    }
    router.push({
      pathname: '/lesson/[id]',
      // `chapterId` travels with the lesson so it can return here explicitly
      // when it finishes. Going "back" is not reliable: these screens are
      // siblings in a tab navigator, and a tab navigator's goBack falls through
      // to its *initial* route, which dumped the learner on Leagues.
      params: { id: String(lesson.id), title: lesson.title, chapterId: String(id) },
    })
  }

  const columnWidth = Math.min(width - spacing.lg * 2, PATH_MAX_WIDTH)

  return (
    <View style={styles.screen}>
      <View style={[styles.header, { paddingTop: insets.top + spacing.sm }]}>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Go back"
          onPress={goBack}
          hitSlop={12}
          style={({ pressed }) => [styles.back, pressed && styles.pressed]}
        >
          <ChevronLeft size={22} color={colors.secondary[600]} strokeWidth={2.4} />
        </Pressable>

        <Text style={[styles.headerTitle, { fontSize: size(19) }]} numberOfLines={1}>
          {unitsQuery.data?.chapter?.title ?? title ?? 'Section'}
        </Text>

        <View style={styles.back} />
      </View>

      <ScrollView
        refreshControl={refreshControl}
        contentContainerStyle={styles.content}
        showsVerticalScrollIndicator={false}
      >
        <QueryState
          query={unitsQuery}
          skeleton={<UnitPathSkeleton units={2} nodes={4} />}
          errorTitle={t('m_chapter_error')}
          isEmpty={(data) => (data?.units?.length ?? 0) === 0}
          emptyTitle={t('m_units_none')}
          emptyBody={t('m_units_none_b')}
          inline
        >
          {() =>
            units.map((unit, unitIndex) => {
              const lessons = lessonsByUnit[unit.id] ?? []
              const loading = lessonQueries[unitIndex]?.isPending

              return (
                <View key={unit.id} style={styles.unit}>
                  {/* Unit banner, matching the web's gradient header card. */}
                  <LinearGradient
                    colors={[colors.primary[500], colors.secondary[600]]}
                    start={{ x: 0, y: 0 }}
                    end={{ x: 1, y: 1 }}
                    style={styles.unitHeader}
                  >
                    <View style={styles.unitIcon}>
                      <BookOpen size={19} color={colors.white} strokeWidth={2.2} />
                    </View>
                    <View style={styles.unitCopy}>
                      <Text style={styles.unitEyebrow} numberOfLines={1}>
                        {(unitsQuery.data?.chapter?.title ?? '').toUpperCase()} · UNIT{' '}
                        {unitIndex + 1}
                      </Text>
                      <Text style={styles.unitTitle} numberOfLines={2}>
                        {unit.title}
                      </Text>
                    </View>
                  </LinearGradient>

                  {loading ? (
                    <View style={styles.unitLoading}>
                      <UnitPathSkeleton units={1} nodes={3} banner={false} />
                    </View>
                  ) : (
                    <View
                      style={[styles.path, { width: columnWidth, height: pathHeight(lessons.length) }]}
                      onLayout={(e) => setPathWidth(e.nativeEvent.layout.width)}
                    >
                      <SnakePath count={lessons.length} width={pathWidth || columnWidth} />

                      {lessons.map((lesson, lessonIndex) => {
                        const globalIndex = lessonOrder.get(lesson.id) ?? 0
                        const isCurrent = globalIndex === currentLessonIndex
                        const isLocked = !user?.isTester && globalIndex > currentLessonIndex
                        const { xFraction, y } = nodePosition(lessonIndex)
                        const lean = nodeLean(lessonIndex)
                        const left = xFraction * (pathWidth || columnWidth) - NODE_SIZE / 2

                        return (
                          <View key={lesson.id}>
                            {/* Art tucked beside nodes that lean fully to one
                                side, so it never sits under a node. */}
                            {lean ? (
                              <Image
                                source={characterAt(unitIndex * 3 + lessonIndex)}
                                style={[
                                  styles.character,
                                  {
                                    top: y - CHARACTER_WIDTH * 0.55,
                                    [lean === 'right' ? 'left' : 'right']: 0,
                                  },
                                ]}
                                resizeMode="contain"
                              />
                            ) : null}

                            <Animated.View
                              entering={FadeIn.duration(260)}
                              style={{
                                position: 'absolute',
                                left: left - RING_GAP,
                                top: y - NODE_SIZE / 2 - RING_GAP,
                              }}
                            >
                              {/* The ring is the lesson's sessions: each lesson
                                  is completed `targetCompletions` times, and the
                                  arc is how many of those are done. */}
                              <ProgressRing
                                percent={
                                  lesson.targetCompletions
                                    ? ((lesson.completionsCount ?? 0) / lesson.targetCompletions) *
                                      100
                                    : 0
                                }
                                size={RING_SIZE}
                                thickness={5}
                                track={colors.secondary[200]}
                              >
                                <View
                                  style={[
                                    styles.nodeBacking,
                                    {
                                      width: RING_SIZE - 10,
                                      height: RING_SIZE - 10,
                                    },
                                  ]}
                                />
                                <Pressable
                                  accessibilityRole="button"
                                  accessibilityLabel={`${lesson.title}, ${lesson.completionsCount ?? 0} of ${lesson.targetCompletions ?? 0} sessions done`}
                                  accessibilityState={{ disabled: isLocked }}
                                  onPress={() => openLesson(lesson, isLocked)}
                                  style={({ pressed }) => [
                                    styles.node,
                                    lesson.completed
                                      ? styles.nodeDone
                                      : isCurrent
                                        ? styles.nodeCurrent
                                        : styles.nodeLocked,
                                    pressed && styles.nodePressed,
                                  ]}
                                >
                                  {lesson.completed ? (
                                    <Check size={26} color={colors.white} strokeWidth={3} />
                                  ) : isLocked ? (
                                    <Lock size={22} color={colors.secondary[300]} strokeWidth={2.4} />
                                  ) : (
                                    <Star
                                      size={26}
                                      // Open but not started is a pale node, so
                                      // a white star on it would disappear.
                                      color={isCurrent ? colors.white : colors.primary[400]}
                                      strokeWidth={2.4}
                                      fill={isCurrent ? colors.white : colors.primary[400]}
                                    />
                                  )}
                                </Pressable>
                              </ProgressRing>
                            </Animated.View>
                          </View>
                        )
                      })}
                    </View>
                  )}
                </View>
              )
            })
          }
        </QueryState>
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
    paddingHorizontal: spacing.md,
    paddingBottom: spacing.sm,
    backgroundColor: colors.white,
    borderBottomWidth: 1,
    borderBottomColor: colors.secondary[100],
  },
  back: {
    width: 36,
    height: 36,
    alignItems: 'center',
    justifyContent: 'center',
  },
  pressed: {
    opacity: 0.6,
  },
  headerTitle: {
    flex: 1,
    fontFamily: fonts.display,
    color: colors.secondary[900],
    textAlign: 'center',
  },
  content: {
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.lg,
    // Extra room for the tab bar's raised centre button, which overhangs the
    // bottom of the scene and would otherwise sit on the last lesson node.
    paddingBottom: spacing.xxl + TAB_BAR_OVERHANG,
    alignItems: 'center',
  },
  unit: {
    width: '100%',
    alignItems: 'center',
    marginBottom: spacing.xl,
  },
  unitHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    width: '100%',
    maxWidth: PATH_MAX_WIDTH,
    borderRadius: radii.xl,
    paddingHorizontal: spacing.md,
    paddingVertical: 14,
    ...shadows.card,
  },
  unitIcon: {
    width: 42,
    height: 42,
    borderRadius: radii.md,
    backgroundColor: 'rgba(255,255,255,0.22)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  unitCopy: {
    flex: 1,
  },
  unitEyebrow: {
    fontFamily: fonts.bodyBold,
    fontSize: 10,
    letterSpacing: 0.9,
    color: 'rgba(255,255,255,0.85)',
  },
  unitTitle: {
    fontFamily: fonts.display,
    fontSize: 17,
    color: colors.white,
    marginTop: 1,
  },
  unitLoading: {
    width: '100%',
    maxWidth: PATH_MAX_WIDTH,
    marginTop: spacing.lg,
  },
  path: {
    position: 'relative',
    marginTop: spacing.sm,
  },
  // No shadow: it falls 6px below the node, and inside a ring that reads as the
  // node sitting low rather than as depth. The ring is the separation now.
  node: {
    width: NODE_SIZE,
    height: NODE_SIZE,
    borderRadius: radii.pill,
    alignItems: 'center',
    justifyContent: 'center',
  },
  nodeDone: {
    backgroundColor: colors.success[500],
  },
  nodeCurrent: {
    backgroundColor: colors.primary[500],
  },
  // No border of its own: the session ring already draws a circle around this
  // node, and a second outline in the same colour reads as one badly-drawn ring
  // rather than two deliberate ones.
  nodeLocked: {
    backgroundColor: colors.white,
  },
  // Sits behind the node and fills the ring's interior, so the dotted path does
  // not show through the gap between the node and its ring.
  nodeBacking: {
    position: 'absolute',
    borderRadius: radii.pill,
    // Matches the screen behind it, so it reads as a gap rather than a disc.
    backgroundColor: colors.secondary[50],
  },
  nodePressed: {
    opacity: 0.8,
    transform: [{ scale: 0.96 }],
  },
  character: {
    position: 'absolute',
    width: CHARACTER_WIDTH,
    height: CHARACTER_WIDTH * 1.35,
  },
})
