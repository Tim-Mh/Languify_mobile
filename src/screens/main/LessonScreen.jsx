import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { BackHandler, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native'
import { useSafeAreaInsets } from 'react-native-safe-area-context'
import { useFocusEffect, useLocalSearchParams, useRouter } from '@/navigation'
import Animated, { FadeIn, FadeInRight, SlideInDown, ZoomIn } from 'react-native-reanimated'
import Check from 'lucide-react-native/icons/check'
import Heart from 'lucide-react-native/icons/heart'
// Aliased: importing this as `Infinity` would shadow the global, and
// `staleTime: Infinity` below would silently become a React component.
import InfinityIcon from 'lucide-react-native/icons/infinity'
import X from 'lucide-react-native/icons/x'

import AdInterstitial from '@/components/AdInterstitial'
import Button from '@/components/Button'
import ConfirmDialog from '@/components/ConfirmDialog'
import { EXERCISE_COMPONENTS } from '@/components/exercises'
import MascotHint from '@/components/MascotHint'
import { useNotify } from '@/components/NotificationProvider'
import QueryState from '@/components/QueryState'
import RewardModal from '@/components/RewardModal'
import { ExerciseSkeleton } from '@/components/Skeleton'
import StateView from '@/components/StateView'
import { useAuth } from '@/auth/AuthContext'
import { useGameState } from '@/hooks/useGame'
import {
  useCompleteLesson,
  useExercises,
  useLoseHeart,
  useRecordAttempt,
} from '@/hooks/useLessons'
import { useAds } from '@/hooks/useProfile'
import { useSubscriptionStatus } from '@/hooks/useShop'
import { HintProvider } from '@/components/HintBubble'
import { nextAd } from '@/lib/adRotation'
import { useTranslate } from '@/lib/i18n'
import { useLayout } from '@/lib/responsive'
import { releaseSounds, sounds } from '@/lib/sounds'
import { useExitFlow } from '@/lib/useExitFlow'
import { colors, fonts, radii, spacing } from '@/theme'

/**
 * What to call each exercise when the API has no instruction for this type and
 * native language, which is currently every one of them. Without a fallback the
 * learner gets a bare word and no idea what to do with it. Same wording as the
 * web's own fallback.
 */
const TYPE_TITLES = {
  match_pairs: 'Select the correct image',
  fill_blank: 'Fill in the blank',
  tap_word: 'Build the correct sentence',
  listen_select: 'Listen and select',
  multiple_choice: 'Choose the right answer',
  paragraph_translation: 'Translation challenge',
  translate: 'Write this in your language',
}

/**
 * Route wrapper whose only job is to remount the player for every lesson.
 *
 * Every screen under `(app)` is a single entry in one tab navigator, so
 * `/lesson/1` and `/lesson/2` are the same mounted component with different
 * params — React keeps the instance and all of its state. Finishing a lesson
 * and opening another one therefore reopened the previous lesson's queue, still
 * sitting on its last exercise with a Finish button.
 *
 * The id alone is not enough of a key. Reopening the *same* lesson does not
 * change it, so the finished session — its exhausted queue, its summary, its
 * completed state — was still there waiting, and the lesson opened on the last
 * exercise you had already answered. The counter fixes that: it ticks on the
 * way out, so the next entry is always a different key and therefore always a
 * fresh mount. Cheap, because the screen is being torn down anyway.
 */
export default function LessonRoute() {
  const { id, chapterId } = useLocalSearchParams()
  const [visit, setVisit] = useState(0)

  useFocusEffect(
    useCallback(() => () => setVisit((count) => count + 1), []),
  )

  return (
    <LessonPlayer key={`${String(id)}:${visit}`} id={String(id)} chapterId={chapterId} />
  )
}

function LessonPlayer({ id, chapterId }) {
  const insets = useSafeAreaInsets()
  const router = useRouter()
  // Leaving a full-screen flow so it is really gone: see the note in leave().
  const exitFlow = useExitFlow()
  const notify = useNotify()
  const { user } = useAuth()
  const t = useTranslate()
  const { column, contentWidth, size } = useLayout()

  const exerciseRef = useRef(null)

  /**
   * A queue, not an index. A wrong answer sends its exercise to the back of the
   * queue instead of dropping it, so missed questions come back around after the
   * rest of the round and the lesson only ends once every exercise has been
   * answered correctly at least once. This is what the web does, and it is the
   * difference between a lesson that teaches and a lesson you can click through.
   */
  const [queue, setQueue] = useState(null)
  const [solved, setSolved] = useState(0)
  const [ready, setReady] = useState(false)
  const [verdict, setVerdict] = useState(null) // null | 'correct' | 'wrong'
  const [mistakes, setMistakes] = useState(0)
  const [summary, setSummary] = useState(null)
  const [quitting, setQuitting] = useState(false)
  /** Exercise ids answered wrong at least once: their hints all come back. */
  const [wrongIds, setWrongIds] = useState(() => new Set())
  /** The creative to show after the summary, chosen while the lesson saves. */
  const [ad, setAd] = useState(null)
  /** True once the rewards have been dismissed and the ad is what comes next. */
  const [adPending, setAdPending] = useState(false)

  const query = useExercises(id)
  const { data: state } = useGameState()

  // Both are wanted before the lesson ends, not at the moment it ends, so the
  // interstitial never makes the learner wait on a request.
  const { data: subscription } = useSubscriptionStatus()
  const { data: adData } = useAds()

  const exercises = useMemo(() => query.data?.exercises ?? [], [query.data])
  const total = exercises.length
  const current = queue?.[0]

  // Every paid plan is ad-free, matching the web.
  const adFree =
    subscription?.subscription?.status === 'active' ||
    subscription?.subscription?.status === 'trialing'

  useEffect(() => {
    if (exercises.length > 0 && queue === null) setQueue(exercises)
  }, [exercises, queue])

  // Native audio players are held open for the whole lesson so repeated answers
  // do not each pay to spin one up; they are handed back when the lesson closes.
  useEffect(() => () => releaseSounds(), [])

  // The fanfare is `RewardModal`'s now, fired with the confetti so the two stay
  // in step. Playing it here as well double-struck it on every lesson, and left
  // the chest and quest popups — which use the same modal — silent.

  /**
   * What the answer should have been, for the wrong-answer bar. Only the types
   * that carry a single flat answer can say it plainly; the ordering types
   * already reveal the full sentence in their own body, and paragraph
   * translation deliberately reveals nothing.
   */
  const correctText = useMemo(() => {
    const data = current?.data
    if (!data) return null
    if (typeof data.correct_answer === 'string') return data.correct_answer
    if (Array.isArray(data.correct_order)) return data.correct_order.join(' ')
    if (Array.isArray(data.correct)) return data.correct.join(' ')
    return null
  }, [current])

  const heartsGone = !state?.infiniteHeartsActive && (state?.hearts ?? 1) <= 0

  const dropHeart = useLoseHeart()
  const record = useRecordAttempt()
  const finish = useCompleteLesson(id)

  /**
   * Banks the lesson, then decides what the learner sees next.
   *
   * The hook owns the cache sweep — finishing a lesson moves XP, gems, the
   * streak, badges and the position on the path. What stays here is the ad, and
   * it is picked *before* anything is shown so the interstitial never flashes
   * an empty frame. A subscriber, or an empty pool, skips straight to the
   * rewards.
   */
  const bankLesson = () =>
    finish.mutate(
      { mistakes },
      {
        onSuccess: async (result) => {
          if (!adFree) {
            // The mobile pool first: it holds the portrait creatives cut for a
            // phone. The website's landscape pool is the fallback, so an admin
            // who has not uploaded a mobile creative yet still gets an ad
            // rather than silence.
            const pool =
              adData?.placements?.mobileLessonComplete?.length > 0
                ? adData.placements.mobileLessonComplete
                : adData?.placements?.lessonComplete
            const creative = await nextAd(pool)
            if (creative) setAd(creative)
          }

          setSummary(result)
        },
        onError: (error) => notify.error(error.message),
      },
    )

  const onResult = useCallback(
    (correct) => {
      setVerdict(correct ? 'correct' : 'wrong')
      // The rising chime / falling buzz the web plays on the same events.
      if (correct) sounds.correct()
      else sounds.incorrect()

      if (!correct) {
        setMistakes((count) => count + 1)
        // Remember it so its hints are all shown when it comes back around.
        setWrongIds((prev) => new Set(prev).add(current?.id))
        if (!state?.infiniteHeartsActive) dropHeart.mutate()
      }

      if (current?.id) {
        record.mutate({ exerciseId: current.id, correct })
      }
    },
    [current?.id, dropHeart, record, state?.infiniteHeartsActive],
  )

  const check = () => {
    if (!ready || verdict) return
    sounds.click()
    exerciseRef.current?.check()
  }

  const next = () => {
    sounds.click()
    const wasCorrect = verdict === 'correct'
    const [head, ...rest] = queue
    // Correct retires the exercise; wrong puts it back at the end of the round.
    const remaining = wasCorrect ? rest : [...rest, head]

    // Before the branch, so the bar reaches 100% while the save is in flight
    // rather than stopping one short of the end.
    if (wasCorrect) setSolved((count) => count + 1)

    if (remaining.length === 0) {
      // The verdict is deliberately left up: the button stays a live "Finish"
      // with a spinner on it, so a failed save can simply be tapped again
      // instead of stranding the learner on a graded exercise with no way on.
      bankLesson()
      return
    }

    setVerdict(null)
    setReady(false)
    exerciseRef.current?.reset()
    setQueue(remaining)
  }

  /**
   * Back to the lesson path this lesson belongs to.
   *
   * Explicit rather than `router.back()`. Every screen in `(app)` is a sibling
   * in a bottom-tab navigator, and a tab navigator's goBack falls through to its
   * *initial* route when it has no history of its own — which is the first tab
   * declared, Leagues. That is why finishing a lesson landed on the leaderboard.
   * `replace` rather than `push` so the finished lesson is not left behind for
   * the back gesture to return to.
   */
  const leave = useCallback(() => {
    // Deliberately does *not* clear `summary`. Clearing it tore the ad and the
    // rewards card down a frame before the navigation landed, so the finished
    // lesson flashed back up on its last exercise on the way out — and with the
    // rewards card re-shown over it, needing a second Continue. The route
    // wrapper remounts this player from scratch on the next visit, so there is
    // nothing to reset on the way out.
    //
    // Through `exitFlow` rather than `router.replace`, and that is the whole
    // point: every screen here is a sibling in one tab navigator, where there
    // is no stack entry to replace. A replace focuses the sibling and *appends*
    // to the focus history, so finishing a lesson left
    // `[…, chapter, lesson, chapter]` and one press of back walked straight
    // back into the finished lesson. `exitFlow` drops this screen from that
    // history first, so back from the chapter goes wherever it went before the
    // lesson started.
    if (chapterId) {
      exitFlow({ pathname: '/chapter/[id]', params: { id: String(chapterId) } })
      return
    }
    // Deep-linked straight into a lesson, so there is no path to go back to.
    exitFlow('/home')
  }, [chapterId, exitFlow])

  /**
   * Continue on the rewards card. If there is a creative to show, this is where
   * it goes; otherwise it is the way out. The creative was already chosen while
   * the lesson was saving, so switching to it costs no request and shows no
   * empty frame.
   */
  const dismissRewards = useCallback(() => {
    if (ad) {
      setAdPending(true)
      return
    }
    leave()
  }, [ad, leave])

  /**
   * The Android back gesture is the other quit button, so it asks the same
   * question the X in the header does. Without this it walked straight out of a
   * half-finished lesson with no warning, and — because a tab navigator's back
   * falls through to its initial route — landed on the leaderboard.
   *
   * Returning true swallows the event. The exception is the summary: the lesson
   * is already saved by then, so there is nothing to confirm and back simply
   * leaves. While the confirm dialog is up this stands aside entirely — it is a
   * Modal, and dismissing it is what its own `onRequestClose` does.
   */
  useFocusEffect(
    useCallback(() => {
      const subscription = BackHandler.addEventListener('hardwareBackPress', () => {
        if (quitting) return false
        if (summary) {
          leave()
          return true
        }
        setQuitting(true)
        return true
      })

      return () => subscription.remove()
    }, [quitting, summary, leave]),
  )

  const rewards = summary
    ? [
        { kind: 'xp', value: `+${summary.xpAwarded ?? 0}`, label: t('m_xp') },
        ...(summary.unitBonusGems
          ? [{ kind: 'gems', value: `+${summary.unitBonusGems}`, label: t('m_bonus_gems') }]
          : []),
        ...(summary.languageBonus?.gems
          ? [{ kind: 'gems', value: `+${summary.languageBonus.gems}`, label: t('m_course_bonus') }]
          : []),
        ...(summary.newBadges?.length
          ? [
              {
                kind: 'badge',
                value: summary.newBadges.length,
                label: summary.newBadges.length === 1 ? t('m_new_badge') : t('m_new_badges'),
              },
            ]
          : []),
        // No streak tile. The popup is for what this session *earned*, and the
        // streak is a running total that was already on screen before the
        // lesson started — it read as a reward when it is really just status,
        // and it was the one tile that appeared even when nothing was won.
      ]
    : []

  /**
   * The celebration is the payoff for finishing the lesson, so it comes first
   * and the advertising comes after it. Putting the ad in front meant the
   * learner's reward for a completed session was ten seconds of waiting, and
   * the confetti had gone cold by the time they reached it.
   *
   * The interstitial owns the whole screen, exactly as it does on the web, so
   * the lesson behind it cannot be interacted with while it is up. Its Continue
   * is what finally leaves for the lesson path.
   */
  if (summary && ad && adPending) {
    return (
      <AdInterstitial
        ad={ad}
        seconds={adData?.settings?.interstitialSeconds ?? 10}
        // Straight out. Dropping `adPending` first would render the lesson
        // underneath for a frame before the navigation landed.
        onContinue={leave}
      />
    )
  }

  return (
    <View style={styles.screen}>
      {/* Header: quit, progress, hearts. */}
      <View style={[styles.header, { paddingTop: insets.top + spacing.sm }]}>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Quit lesson"
          onPress={() => setQuitting(true)}
          hitSlop={12}
          style={({ pressed }) => [styles.quit, pressed && styles.pressed]}
        >
          <X size={22} color={colors.secondary[500]} strokeWidth={2.4} />
        </Pressable>

        <View style={styles.track}>
          {/* Counts answers got right, not questions seen: a missed exercise
              goes back in the queue, so position would run past 100%. Clamped
              because a retried save re-counts the final answer. */}
          <View
            style={[
              styles.fill,
              { width: `${total ? Math.min(100, Math.max(3, (solved / total) * 100)) : 3}%` },
            ]}
          />
        </View>

        <View style={styles.hearts}>
          {state?.infiniteHeartsActive ? (
            <InfinityIcon size={18} color={colors.danger[500]} strokeWidth={2.4} />
          ) : (
            <>
              <Heart size={17} color={colors.danger[500]} strokeWidth={2.4} fill={colors.danger[500]} />
              <Text style={styles.heartCount}>{state?.hearts ?? '–'}</Text>
            </>
          )}
        </View>
      </View>

      {/* Owns the one hint bubble for the whole exercise area. It sits below the
          header so the overlay's coordinate space starts where the words do,
          and spans the footer as well, so a hint on the bottom row of the word
          bank is drawn over the verdict bar instead of being cut off by it. */}
      <HintProvider>
      <QueryState
        query={query}
        skeleton={<ExerciseSkeleton options={4} />}
        errorTitle={t('m_lesson_error')}
        isEmpty={(data) => (data?.exercises?.length ?? 0) === 0}
        emptyTitle={t('m_lesson_none')}
        emptyBody={t('m_lesson_none_b')}
      >
        {() => {
          // Running out mid-lesson ends the session: there is nothing to spend
          // on the next wrong answer. Both ways out are offered rather than
          // just dumping the learner back on the path.
          if (heartsGone) {
            return (
              <StateView
                icon="error"
                tone="danger"
                title={t('m_hearts_out')}
                body={t('m_hearts_out_b')}
                actionLabel={t('m_get_hearts')}
                onAction={() => router.replace('/hearts')}
                secondaryActionLabel={t('m_back_to_lessons')}
                onSecondaryAction={leave}
              />
            )
          }

          // The queue is seeded from the query in an effect, so there is one
          // render where the data has landed but the queue has not been built.
          // Without this the screen briefly claims the exercise type is
          // unsupported, because `current` is still undefined.
          if (!current) {
            return (
              <ExerciseSkeleton options={4} />
            )
          }

          const Component = EXERCISE_COMPONENTS[current.type]

          if (!Component) {
            return (
              <StateView
                icon="error"
                title={t('m_unsupported')}
                body={t('m_unsupported_b', { type: current?.type ?? '' })}
                actionLabel={t('m_skip_it')}
                onAction={next}
              />
            )
          }

          return (
            <>
              <ScrollView
                contentContainerStyle={[styles.body, { width: contentWidth, alignSelf: 'center' }]}
                keyboardShouldPersistTaps="handled"
              >
                <Text style={[styles.instruction, { fontSize: size(15) }]}>
                  {current.instruction || TYPE_TITLES[current.type] || 'Exercise'}
                </Text>

                <MascotHint exerciseId={current.id ?? 0} />

                {/* Keyed by exercise id so state resets cleanly between
                    questions instead of leaking the previous answer. A repeat
                    of a missed exercise gets the same key, which is fine: the
                    queue only ever holds one copy of it. */}
                <Animated.View key={current.id} entering={FadeInRight.duration(240)}>
                  <Component
                    ref={exerciseRef}
                    exercise={current}
                    onResult={onResult}
                    onReadyChange={setReady}
                    // Every hint comes back for an exercise already got wrong,
                    // so the second attempt is a lesson rather than a re-test.
                    forceHints={wrongIds.has(current.id)}
                    nativeCode={user?.nativeLanguage?.code ?? 'en'}
                    learningCode={user?.learningLanguage?.code ?? 'en'}
                  />
                </Animated.View>
              </ScrollView>

              <VerdictBar
                verdict={verdict}
                correctText={correctText}
                ready={ready}
                saving={finish.isPending}
                lastOne={queue.length === 1}
                column={column}
                bottomInset={insets.bottom}
                onCheck={check}
                onNext={next}
              />
            </>
          )
        }}
      </QueryState>
      </HintProvider>

      {/* Confirmed rather than immediate: the close button sits next to the
          progress bar, and a stray tap there would throw away the session.
          Leaving is the confirm action, not the cancel one, so the Android back
          button (which cancels) dismisses the dialog instead of quitting. */}
      <ConfirmDialog
        visible={quitting}
        title={t('m_leave_lesson_t')}
        body={t('m_leave_lesson_b')}
        confirmLabel={t('m_leave_lesson')}
        cancelLabel={t('m_keep_learning')}
        destructive
        onConfirm={() => {
          setQuitting(false)
          leave()
        }}
        onCancel={() => setQuitting(false)}
      />

      <RewardModal
        visible={summary !== null && !adPending}
        title={summary?.mastered ? t('m_lesson_mastered') : t('m_lesson_complete')}
        subtitle={
          mistakes === 0
            ? t('m_flawless')
            : summary?.alreadyCompletedBefore
              ? t('m_practice_sticks')
              : t('m_nice_work')
        }
        rewards={rewards}
        actionLabel={t('m_continue')}
        onClose={dismissRewards}
      />
    </View>
  )
}

/**
 * The bottom of the lesson: a Check button before an answer is graded, and the
 * graded result afterwards.
 *
 * The whole sheet takes the verdict's colour and slides up over the footer, and
 * the Continue button takes it too, so the result reads from across the room and
 * the learner's thumb is already where it needs to be. Keyed on the verdict so
 * the slide replays on each grade rather than firing once per lesson.
 *
 * `column`, not a pixel `contentWidth`: the sheet owns horizontal padding, and a
 * fixed width inside it is measured against the parent's *full* width, so it
 * overflowed that padding and pinned the button and the verdict row flush to
 * both screen edges.
 */
function VerdictBar({
  verdict,
  correctText,
  ready,
  saving,
  lastOne,
  column,
  bottomInset,
  onCheck,
  onNext,
}) {
  const t = useTranslate()
  const graded = Boolean(verdict)
  const good = verdict === 'correct'

  return (
    <Animated.View
      key={verdict ?? 'idle'}
      entering={graded ? SlideInDown.duration(240) : undefined}
      style={[
        styles.footer,
        good && styles.footerOk,
        verdict === 'wrong' && styles.footerBad,
        { paddingBottom: bottomInset + spacing.md },
      ]}
    >
      {graded ? (
        <Animated.View
          entering={FadeIn.duration(200)}
          style={[styles.verdict, column]}
        >
          <Animated.View
            entering={ZoomIn.duration(200).delay(60)}
            style={[styles.badge, good ? styles.badgeOk : styles.badgeBad]}
          >
            {good ? (
              <Check size={22} color={colors.white} strokeWidth={3.4} />
            ) : (
              <X size={22} color={colors.white} strokeWidth={3.4} />
            )}
          </Animated.View>

          <View style={styles.copy}>
            <Text style={[styles.headline, good ? styles.headlineOk : styles.headlineBad]}>
              {good ? t('m_nicely_done') : t('m_not_quite')}
            </Text>

            {/* Only shown when there is a single flat answer to name. The
                ordering types already print the full sentence themselves, and
                repeating it here would say it twice. */}
            {!good && correctText ? (
              <>
                <Text style={styles.answerLabel}>{t('m_correct_answer')}</Text>
                <Text style={styles.answer} numberOfLines={2}>
                  {correctText}
                </Text>
              </>
            ) : null}
          </View>
        </Animated.View>
      ) : null}

      <View style={column}>
        <Button
          label={graded ? (lastOne && good ? t('m_finish') : t('m_continue')) : t('m_check')}
          variant={graded ? (good ? 'success' : 'danger') : 'primary'}
          onPress={graded ? onNext : onCheck}
          disabled={!graded && !ready}
          loading={saving}
        />
      </View>
    </Animated.View>
  )
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: colors.surface,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    paddingHorizontal: spacing.md,
    paddingBottom: spacing.sm,
  },
  quit: {
    width: 34,
    height: 34,
    alignItems: 'center',
    justifyContent: 'center',
  },
  pressed: {
    opacity: 0.6,
  },
  track: {
    flex: 1,
    height: 12,
    borderRadius: radii.pill,
    backgroundColor: colors.secondary[100],
    overflow: 'hidden',
  },
  fill: {
    height: '100%',
    borderRadius: radii.pill,
    backgroundColor: colors.primary[500],
  },
  hearts: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    minWidth: 42,
    justifyContent: 'flex-end',
  },
  heartCount: {
    fontFamily: fonts.display,
    fontSize: 15,
    color: colors.secondary[900],
  },
  loading: {
    padding: spacing.lg,
  },
  body: {
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.lg,
    paddingBottom: spacing.xxl,
  },
  instruction: {
    fontFamily: fonts.bodyBold,
    color: colors.secondary[500],
    marginBottom: spacing.md,
  },
  footer: {
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.md,
    backgroundColor: colors.white,
    borderTopWidth: 1,
    borderTopColor: colors.secondary[100],
    // Rounded only at the top: it reads as a sheet arriving over the exercise
    // rather than as the screen changing colour underneath it.
    borderTopLeftRadius: radii.xl,
    borderTopRightRadius: radii.xl,
  },
  footerOk: {
    backgroundColor: colors.success[50],
    borderTopColor: colors.success[100],
  },
  footerBad: {
    backgroundColor: colors.danger[50],
    borderTopColor: colors.danger[100],
  },
  verdict: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    marginBottom: spacing.md,
  },
  badge: {
    width: 42,
    height: 42,
    borderRadius: radii.pill,
    alignItems: 'center',
    justifyContent: 'center',
  },
  badgeOk: {
    backgroundColor: colors.success[500],
  },
  badgeBad: {
    backgroundColor: colors.danger[500],
  },
  copy: {
    flex: 1,
  },
  headline: {
    fontFamily: fonts.display,
    fontSize: 19,
  },
  headlineOk: {
    color: colors.success[700],
  },
  headlineBad: {
    color: colors.danger[700],
  },
  answerLabel: {
    fontFamily: fonts.bodyBold,
    fontSize: 10.5,
    letterSpacing: 0.9,
    textTransform: 'uppercase',
    color: colors.danger[400],
    marginTop: 4,
  },
  answer: {
    fontFamily: fonts.bodyBold,
    fontSize: 15,
    color: colors.danger[700],
    marginTop: 1,
  },
})
