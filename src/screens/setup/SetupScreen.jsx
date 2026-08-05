import { useCallback, useMemo, useRef, useState } from 'react'
import { ScrollView, StyleSheet, Text, View } from 'react-native'
import { useSafeAreaInsets } from 'react-native-safe-area-context'
import { useRouter } from '@/navigation'

import Button from '@/components/Button'
import ChoiceCard from '@/components/ChoiceCard'
import FlagIcon from '@/components/FlagIcon'
import Flame from 'lucide-react-native/icons/flame'
import MessagesSquare from 'lucide-react-native/icons/messages-square'
import Sprout from 'lucide-react-native/icons/sprout'
import BookOpen from 'lucide-react-native/icons/book-open'

import QueryState from '@/components/QueryState'
import { RowSkeleton } from '@/components/Skeleton'
import StepProgress from '@/components/StepProgress'
import { useNotify } from '@/components/NotificationProvider'
import { useAuth } from '@/auth/AuthContext'
import {
  useLanguages,
  useSelectCourse,
  useSelectProficiency,
  useSelectStreakGoal,
} from '@/hooks/useCourses'
import { firstIncompleteStepIndex } from '@/auth/setupState'
import { mutationErrors } from '@/lib/formErrors'
import { useTranslate } from '@/lib/i18n'
import { useLayout } from '@/lib/responsive'
import { colors, fonts, radii, spacing } from '@/theme'

/** Values must match the backend's PROFICIENCY_LEVELS exactly. */
const LEVELS = [
  { value: 'beginner', Icon: Sprout, titleKey: 'm_level_new', subKey: 'm_level_new_sub' },
  {
    value: 'some_knowledge',
    Icon: BookOpen,
    titleKey: 'm_level_some',
    subKey: 'm_level_some_sub',
  },
  {
    value: 'conversational',
    Icon: MessagesSquare,
    titleKey: 'm_level_conv',
    subKey: 'm_level_conv_sub',
  },
]

/** Values must match the backend's STREAK_GOAL_DAYS exactly. */
const GOALS = [
  { days: 10, subKey: 'm_goal_10_sub' },
  { days: 20, subKey: 'm_goal_20_sub' },
  { days: 30, subKey: 'm_goal_30_sub' },
  { days: 40, subKey: 'm_goal_40_sub' },
  { days: 50, subKey: 'm_goal_50_sub' },
]

const STEPS = ['speak', 'learn', 'level', 'goal']

export default function Setup() {
  const router = useRouter()
  const insets = useSafeAreaInsets()
  const notify = useNotify()
  const t = useTranslate()
  const { user } = useAuth()
  const { width, column, size } = useLayout()

  const scrollRef = useRef(null)
  // Resume on the earliest step still missing from the profile, so quitting
  // halfway and coming back does not restart the wizard.
  const [index, setIndex] = useState(() => firstIncompleteStepIndex(user) ?? 0)

  const [nativeId, setNativeId] = useState(user?.nativeLanguage?.id ?? null)
  const [learningId, setLearningId] = useState(user?.learningLanguage?.id ?? null)
  const [level, setLevel] = useState(user?.proficiencyLevel ?? null)
  const [days, setDays] = useState(user?.streakGoalDays ?? 10)

  const languagesQuery = useLanguages()
  const languages = languagesQuery.data ?? []

  // Picking the same language on both sides is rejected by the API, so make it
  // unpickable rather than letting them find out on submit.
  const learningOptions = useMemo(
    () => languages.filter((language) => language.id !== nativeId),
    [languages, nativeId],
  )

  const slideTo = useCallback(
    (next) => {
      setIndex(next)
      scrollRef.current?.scrollTo({ x: next * width, animated: true })
    },
    [width],
  )

  // At step 1 there is only somewhere to go back to if this screen was pushed
  // rather than replaced onto the stack, which is not the case straight after
  // signup.
  const canGoBack = index > 0 || router.canGoBack()

  const goBack = useCallback(() => {
    if (index === 0) {
      if (router.canGoBack()) router.back()
      return
    }
    slideTo(index - 1)
  }, [index, router, slideTo])

  // Each step saves as it completes, so quitting halfway is resumable. The
  // language pair can only be saved once both halves are known, which is why
  // step 1 advances without a request.
  // Each hook owns the cache sweep its step invalidates and the profile
  // refresh that follows it; what stays here is only where to go next.
  const saveCourse = useSelectCourse()
  const saveLevel = useSelectProficiency()
  const saveGoal = useSelectStreakGoal()

  const busy = saveCourse.isPending || saveLevel.isPending || saveGoal.isPending
  const message =
    mutationErrors(saveCourse.error).message ??
    mutationErrors(saveLevel.error).message ??
    mutationErrors(saveGoal.error).message

  const advance = () => {
    if (busy) return

    if (index === 0) {
      slideTo(1)
    } else if (index === 1) {
      saveCourse.mutate(
        { nativeLanguageId: nativeId, learningLanguageId: learningId },
        { onSuccess: () => slideTo(2) },
      )
    } else if (index === 2) {
      saveLevel.mutate(level, { onSuccess: () => slideTo(3) })
    } else {
      saveGoal.mutate(days, {
        onSuccess: () => {
          notify.success(t('m_setup_ready'))
          router.replace('/home')
        },
      })
    }
  }

  const canContinue = [
    Boolean(nativeId),
    Boolean(learningId),
    Boolean(level),
    Boolean(days),
  ][index]

  const pageStyle = { width, paddingHorizontal: spacing.lg }
  const columnStyle = column

  return (
    <View style={[styles.screen, { paddingTop: insets.top + spacing.md }]}>
      <StepProgress
        step={index + 1}
        totalSteps={STEPS.length}
        onBack={goBack}
        canGoBack={canGoBack}
      />

      {message ? (
        <View style={[styles.banner, { marginHorizontal: spacing.lg }]}>
          <Text style={styles.bannerText}>{message}</Text>
        </View>
      ) : null}

      <ScrollView
        ref={scrollRef}
        horizontal
        pagingEnabled
        // Driven by the buttons, not the finger. Swiping forward would skip the
        // save that each step performs, so the pair of pages either side of a
        // request must not be reachable by gesture.
        scrollEnabled={false}
        showsHorizontalScrollIndicator={false}
        // Jump straight to the resumed step without animating past the earlier
        // ones. Needed in addition to contentOffset because Android ignores it.
        onLayout={() => scrollRef.current?.scrollTo({ x: index * width, animated: false })}
        contentOffset={{ x: index * width, y: 0 }}
        style={styles.pager}
      >
        {/* 1 — what they already speak */}
        <ScrollView contentContainerStyle={[pageStyle, styles.page]} showsVerticalScrollIndicator={false}>
          <View style={columnStyle}>
            <Text style={[styles.title, { fontSize: size(26) }]}>{t('m_setup_speak_q')}</Text>
            <Text style={styles.subtitle}>
              {t('m_setup_speak_sub')}
            </Text>

            <QueryState
              query={languagesQuery}
              skeleton={<RowSkeleton count={6} />}
              errorTitle={t('m_lang_error')}
              isEmpty={(data) => (data?.length ?? 0) === 0}
              emptyTitle={t('m_lang_none')}
              emptyBody={t('m_lang_none_body')}
              inline
            >
              {languages.map((language) => (
                <ChoiceCard
                  key={language.id}
                  title={language.name}
                  subtitle={language.nativeName}
                  leading={<FlagIcon code={language.code} emoji={language.flagEmoji} width={30} />}
                  selected={language.id === nativeId}
                  onPress={() => {
                    setNativeId(language.id)
                    // Clear a now-invalid pair rather than silently submitting it.
                    if (learningId === language.id) setLearningId(null)
                  }}
                />
              ))}
            </QueryState>
          </View>
        </ScrollView>

        {/* 2 — what they want to learn */}
        <ScrollView contentContainerStyle={[pageStyle, styles.page]} showsVerticalScrollIndicator={false}>
          <View style={columnStyle}>
            <Text style={[styles.title, { fontSize: size(26) }]}>{t('m_setup_learn_q')}</Text>
            <Text style={styles.subtitle}>{t('m_setup_learn_sub')}</Text>

            {learningOptions.map((language) => (
              <ChoiceCard
                key={language.id}
                title={language.name}
                subtitle={language.nativeName}
                leading={<FlagIcon code={language.code} emoji={language.flagEmoji} width={30} />}
                selected={language.id === learningId}
                onPress={() => setLearningId(language.id)}
              />
            ))}
          </View>
        </ScrollView>

        {/* 3 — proficiency */}
        <ScrollView contentContainerStyle={[pageStyle, styles.page]} showsVerticalScrollIndicator={false}>
          <View style={columnStyle}>
            <Text style={[styles.title, { fontSize: size(26) }]}>{t('m_setup_level_q')}</Text>
            <Text style={styles.subtitle}>
              {t('m_setup_level_sub')}
            </Text>

            {LEVELS.map((option) => (
              <ChoiceCard
                key={option.value}
                title={t(option.titleKey)}
                subtitle={t(option.subKey)}
                leading={<option.Icon size={24} color={colors.primary[500]} strokeWidth={2.1} />}
                selected={option.value === level}
                onPress={() => setLevel(option.value)}
              />
            ))}
          </View>
        </ScrollView>

        {/* 4 — streak goal */}
        <ScrollView contentContainerStyle={[pageStyle, styles.page]} showsVerticalScrollIndicator={false}>
          <View style={columnStyle}>
            <Text style={[styles.title, { fontSize: size(26) }]}>{t('m_setup_goal_q')}</Text>
            <Text style={styles.subtitle}>
              {t('m_setup_goal_sub')}
            </Text>

            {GOALS.map((goal) => (
              <ChoiceCard
                key={goal.days}
                title={t('m_goal_days', { n: goal.days })}
                subtitle={t(goal.subKey)}
                leading={<Flame size={24} color={colors.warning[500]} strokeWidth={2.1} />}
                selected={goal.days === days}
                onPress={() => setDays(goal.days)}
              />
            ))}
          </View>
        </ScrollView>
      </ScrollView>

      <View style={[styles.footer, { paddingBottom: insets.bottom + spacing.lg }]}>
        <View style={columnStyle}>
          <Button
            label={index === STEPS.length - 1 ? t('m_setup_start') : t('m_continue')}
            onPress={advance}
            loading={busy}
            disabled={!canContinue}
          />
        </View>
      </View>
    </View>
  )
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: colors.surface,
  },
  pager: {
    flex: 1,
  },
  page: {
    paddingTop: spacing.lg,
    paddingBottom: spacing.xl,
  },
  title: {
    fontFamily: fonts.display,
    lineHeight: 34,
    color: colors.secondary[900],
  },
  subtitle: {
    fontFamily: fonts.body,
    fontSize: 15,
    lineHeight: 22,
    color: colors.secondary[500],
    marginTop: spacing.sm,
    marginBottom: spacing.lg,
  },
  banner: {
    backgroundColor: colors.danger[50],
    borderWidth: 2,
    borderColor: colors.danger[300],
    borderRadius: radii.lg,
    padding: spacing.md,
    marginTop: spacing.md,
  },
  bannerText: {
    fontFamily: fonts.bodySemi,
    fontSize: 14,
    lineHeight: 20,
    color: colors.danger[700],
  },
  footer: {
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.sm,
    backgroundColor: colors.surface,
  },
})
