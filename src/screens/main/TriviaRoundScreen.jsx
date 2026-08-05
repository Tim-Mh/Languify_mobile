import { useCallback, useEffect, useMemo, useState } from 'react'
import { BackHandler, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native'
import { useSafeAreaInsets } from 'react-native-safe-area-context'
import { useFocusEffect, useLocalSearchParams, useRouter } from '@/navigation'
import Animated, { FadeIn, FadeInRight, SlideInDown, ZoomIn } from 'react-native-reanimated'
import Check from 'lucide-react-native/icons/check'
import Heart from 'lucide-react-native/icons/heart'
import InfinityIcon from 'lucide-react-native/icons/infinity'
import X from 'lucide-react-native/icons/x'

import Button from '@/components/Button'
import ConfirmDialog from '@/components/ConfirmDialog'
import { useNotify } from '@/components/NotificationProvider'
import QueryState from '@/components/QueryState'
import RewardModal from '@/components/RewardModal'
import { ExerciseSkeleton } from '@/components/Skeleton'
import StateView from '@/components/StateView'
import { useGameState } from '@/hooks/useGame'
import { useLoseHeart } from '@/hooks/useLessons'
import {
  useCheckTriviaAnswer,
  useSubmitTrivia,
  useTriviaQuestions,
} from '@/hooks/useRewards'
import { useTranslate } from '@/lib/i18n'
import { useLayout } from '@/lib/responsive'
import { releaseSounds, sounds } from '@/lib/sounds'
import { colors, fonts, radii, shadows, spacing } from '@/theme'

const LETTERS = ['A', 'B', 'C', 'D', 'E', 'F']

/**
 * One trivia round, mirroring the web's TriviaQuestion page.
 *
 * The correct answer is deliberately never sent to the client with the
 * questions, so each answer is graded by the server through `/check` before the
 * round is submitted. That is why selecting an option only highlights it: the
 * commit is the Check button, exactly as in a lesson.
 */
/**
 * Remounts the round on every entry — see the note on the lesson player's route
 * wrapper, which has the same problem for the same reason. These screens are
 * siblings in one tab navigator, so without a key the previous round's answers
 * and progress carry straight over; and the topic alone is not enough of a key,
 * because replaying the same topic would reopen the finished round.
 */
export default function TriviaRoute() {
  const { topic, title } = useLocalSearchParams()
  const [visit, setVisit] = useState(0)

  useFocusEffect(
    useCallback(() => () => setVisit((count) => count + 1), []),
  )

  return (
    <TriviaRound key={`${String(topic)}:${visit}`} topic={String(topic)} title={title} />
  )
}

function TriviaRound({ topic, title }) {
  const insets = useSafeAreaInsets()
  const router = useRouter()
  const notify = useNotify()
  const t = useTranslate()
  const { column, contentWidth, size } = useLayout()

  const [index, setIndex] = useState(0)
  const [selected, setSelected] = useState(null)
  const [verdict, setVerdict] = useState(null) // null | 'correct' | 'wrong'
  const [answers, setAnswers] = useState({})
  const [summary, setSummary] = useState(null)
  const [quitting, setQuitting] = useState(false)

  const query = useTriviaQuestions(topic)
  const { data: state } = useGameState()

  const questions = useMemo(() => query.data ?? [], [query.data])
  const total = questions.length
  const question = questions[index]

  const heartsGone = !state?.infiniteHeartsActive && (state?.hearts ?? 1) <= 0

  useEffect(() => () => releaseSounds(), [])

  const dropHeart = useLoseHeart()

  const grade = useCheckTriviaAnswer(topic)
  const finish = useSubmitTrivia(topic)

  const gradeAnswer = () =>
    grade.mutate({ questionId: question.id, selectedIndex: selected }, {
      onSuccess: (result) => {
        const correct = result?.correct === true
        setVerdict(correct ? 'correct' : 'wrong')

        if (correct) {
          sounds.correct()
          return
        }

        sounds.incorrect()
        if (!state?.infiniteHeartsActive) dropHeart.mutate()
      },
      onError: (error) => notify.error(error.message ?? t('m_err_answer')),
    })

  const submitRound = (payload) =>
    finish.mutate(payload, {
      onSuccess: (result) => {
        sounds.complete()
        setSummary(result)
      },
      onError: (error) => notify.error(error.message ?? t('m_err_submit')),
    })

  /**
   * Back to the topic list. Explicit rather than `router.back()`: these screens
   * are siblings in a tab navigator, whose goBack falls through to its initial
   * route when it has no history of its own.
   */
  const leave = useCallback(() => {
    setSummary(null)
    router.replace('/trivia')
  }, [router])

  /**
   * The Android back gesture is the other quit button, so it asks the same
   * question the X in the header does — the same rule the lesson player
   * follows, because abandoning a round costs the same as abandoning a lesson.
   * Once the results are up there is nothing left to lose, so back just leaves.
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

  const check = () => {
    if (selected === null || verdict || grade.isPending) return
    sounds.click()
    gradeAnswer()
  }

  const next = () => {
    if (!verdict) return
    sounds.click()

    const collected = { ...answers, [question.id]: selected }
    setAnswers(collected)

    if (index + 1 >= total) {
      submitRound(
        Object.entries(collected).map(([questionId, selectedIndex]) => ({
          questionId: Number(questionId),
          selectedIndex,
        })),
      )
      return
    }

    setIndex((i) => i + 1)
    setSelected(null)
    setVerdict(null)
  }

  const rewards = summary
    ? [
        { kind: 'gems', value: `+${summary.gemsAwarded ?? 0}`, label: t('m_gems') },
        { kind: 'xp', value: `+${summary.xpAwarded ?? 0}`, label: t('m_xp') },
        {
          kind: 'badge',
          value: `${summary.correctCount ?? 0}/${summary.totalQuestions ?? total}`,
          label: t('m_correct'),
        },
      ]
    : []

  return (
    <View style={styles.screen}>
      <View style={[styles.header, { paddingTop: insets.top + spacing.sm }]}>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Quit round"
          onPress={() => setQuitting(true)}
          hitSlop={12}
          style={({ pressed }) => [styles.quit, pressed && styles.pressed]}
        >
          <X size={22} color={colors.secondary[500]} strokeWidth={2.4} />
        </Pressable>

        <View style={styles.track}>
          <View
            style={[
              styles.fill,
              { width: `${total ? Math.min(100, Math.max(3, (index / total) * 100)) : 3}%` },
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

      <QueryState
        query={query}
        skeleton={<ExerciseSkeleton options={4} mascot={false} chip />}
        errorTitle={t('m_tround_error')}
        isEmpty={(data) => (data?.length ?? 0) === 0}
        emptyTitle={t('m_tround_none')}
        emptyBody={t('m_tround_none_b')}
      >
        {() => {
          if (heartsGone) {
            return (
              <StateView
                icon="error"
                tone="danger"
                title={t('m_hearts_out')}
                body={t('m_hearts_out_b2')}
                actionLabel={t('m_get_hearts')}
                onAction={() => router.replace('/hearts')}
                secondaryActionLabel={t('m_back_to_trivia')}
                onSecondaryAction={leave}
              />
            )
          }

          if (!question) {
            return (
              <ExerciseSkeleton options={4} mascot={false} chip />
            )
          }

          return (
            <>
              <ScrollView
                contentContainerStyle={[styles.body, { width: contentWidth, alignSelf: 'center' }]}
              >
                <View style={styles.chip}>
                  <Text style={styles.chipText}>
                    {(title ? String(title).toUpperCase() : 'TRIVIA')} · {index + 1} OF {total}
                  </Text>
                </View>

                <Animated.View key={question.id} entering={FadeInRight.duration(240)}>
                  <Text style={[styles.question, { fontSize: size(21) }]}>{question.question}</Text>

                  {question.options.map((option, optionIndex) => {
                    const isPicked = selected === optionIndex
                    // Only the picked option is coloured after grading: the
                    // server reports whether the answer was right, not which
                    // option was, so there is nothing honest to highlight.
                    const graded = isPicked && verdict !== null
                    const tone = graded ? (verdict === 'correct' ? 'correct' : 'wrong') : isPicked ? 'picked' : 'idle'

                    return (
                      <Pressable
                        key={optionIndex}
                        accessibilityRole="radio"
                        accessibilityState={{ selected: isPicked, disabled: verdict !== null }}
                        accessibilityLabel={option}
                        disabled={verdict !== null || grade.isPending}
                        onPress={() => {
                          sounds.select()
                          setSelected(optionIndex)
                        }}
                        style={({ pressed }) => [
                          styles.option,
                          styles[tone],
                          pressed && verdict === null && styles.pressed,
                        ]}
                      >
                        <View style={[styles.letter, styles[`${tone}Letter`]]}>
                          <Text style={[styles.letterText, styles[`${tone}LetterText`]]}>
                            {LETTERS[optionIndex] ?? optionIndex + 1}
                          </Text>
                        </View>
                        <Text style={styles.optionText}>{option}</Text>
                      </Pressable>
                    )
                  })}
                </Animated.View>
              </ScrollView>

              <Animated.View
                key={verdict ?? 'idle'}
                entering={verdict ? SlideInDown.duration(240) : undefined}
                style={[
                  styles.footer,
                  verdict === 'correct' && styles.footerOk,
                  verdict === 'wrong' && styles.footerBad,
                  { paddingBottom: insets.bottom + spacing.md },
                ]}
              >
                {verdict ? (
                  <Animated.View
                    entering={FadeIn.duration(200)}
                    style={[styles.verdict, column]}
                  >
                    <Animated.View
                      entering={ZoomIn.duration(200).delay(60)}
                      style={[
                        styles.badge,
                        verdict === 'correct' ? styles.badgeOk : styles.badgeBad,
                      ]}
                    >
                      {verdict === 'correct' ? (
                        <Check size={22} color={colors.white} strokeWidth={3.4} />
                      ) : (
                        <X size={22} color={colors.white} strokeWidth={3.4} />
                      )}
                    </Animated.View>
                    <Text
                      style={[
                        styles.headline,
                        verdict === 'correct' ? styles.headlineOk : styles.headlineBad,
                      ]}
                    >
                      {verdict === 'correct' ? t('m_trivia_correct') : t('m_trivia_wrong')}
                    </Text>
                  </Animated.View>
                ) : null}

                <View style={column}>
                  <Button
                    label={verdict ? (index + 1 >= total ? t('m_finish') : t('m_continue')) : t('m_check')}
                    variant={verdict ? (verdict === 'correct' ? 'success' : 'danger') : 'primary'}
                    onPress={verdict ? next : check}
                    disabled={!verdict && selected === null}
                    loading={grade.isPending || finish.isPending}
                  />
                </View>
              </Animated.View>
            </>
          )
        }}
      </QueryState>

      <ConfirmDialog
        visible={quitting}
        title={t('m_trivia_leave')}
        body={t('m_tround_leave_b')}
        confirmLabel={t('m_trivia_leave_yes')}
        cancelLabel={t('m_trivia_leave_no')}
        destructive
        onConfirm={() => {
          setQuitting(false)
          leave()
        }}
        onCancel={() => setQuitting(false)}
      />

      <RewardModal
        visible={summary !== null}
        title={
          summary?.infiniteHeartsGranted
            ? 'Perfect round!'
            : summary?.alreadyCompletedBefore
              ? 'Round complete'
              : 'Nice round!'
        }
        subtitle={
          summary?.infiniteHeartsGranted
            ? 'A perfect score earns you unlimited hearts for a while.'
            : summary?.alreadyCompletedBefore
              ? 'You have played this topic before, so rewards are reduced.'
              : 'Rewards have been added to your account.'
        }
        rewards={rewards}
        actionLabel="Done"
        onClose={leave}
      />
    </View>
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
    opacity: 0.7,
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
    paddingTop: spacing.md,
    paddingBottom: spacing.xxl,
  },
  chip: {
    alignSelf: 'flex-start',
    backgroundColor: colors.primary[50],
    borderRadius: radii.pill,
    paddingHorizontal: 11,
    paddingVertical: 5,
    marginBottom: spacing.md,
  },
  chipText: {
    fontFamily: fonts.bodyBold,
    fontSize: 10.5,
    letterSpacing: 0.9,
    color: colors.primary[600],
  },
  question: {
    fontFamily: fonts.display,
    lineHeight: 30,
    color: colors.secondary[900],
    marginBottom: spacing.lg,
  },
  option: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    borderWidth: 2,
    borderColor: colors.secondary[200],
    borderRadius: radii.lg,
    backgroundColor: colors.white,
    paddingHorizontal: spacing.md,
    paddingVertical: 14,
    marginBottom: spacing.sm,
  },
  idle: {},
  picked: {
    borderColor: colors.primary[500],
    backgroundColor: colors.primary[50],
  },
  correct: {
    borderColor: colors.success[500],
    backgroundColor: colors.success[50],
  },
  wrong: {
    borderColor: colors.danger[500],
    backgroundColor: colors.danger[50],
  },
  letter: {
    width: 32,
    height: 32,
    borderRadius: radii.pill,
    backgroundColor: colors.secondary[100],
    alignItems: 'center',
    justifyContent: 'center',
  },
  idleLetter: {},
  pickedLetter: {
    backgroundColor: colors.primary[500],
  },
  correctLetter: {
    backgroundColor: colors.success[500],
  },
  wrongLetter: {
    backgroundColor: colors.danger[500],
  },
  letterText: {
    fontFamily: fonts.display,
    fontSize: 14,
    color: colors.secondary[500],
  },
  idleLetterText: {},
  pickedLetterText: {
    color: colors.white,
  },
  correctLetterText: {
    color: colors.white,
  },
  wrongLetterText: {
    color: colors.white,
  },
  optionText: {
    flex: 1,
    fontFamily: fonts.bodyBold,
    fontSize: 15.5,
    lineHeight: 21,
    color: colors.secondary[900],
  },
  footer: {
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.md,
    backgroundColor: colors.white,
    borderTopWidth: 1,
    borderTopColor: colors.secondary[100],
    borderTopLeftRadius: radii.xl,
    borderTopRightRadius: radii.xl,
    ...shadows.card,
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
  headline: {
    flex: 1,
    fontFamily: fonts.display,
    fontSize: 19,
  },
  headlineOk: {
    color: colors.success[700],
  },
  headlineBad: {
    color: colors.danger[700],
  },
})
