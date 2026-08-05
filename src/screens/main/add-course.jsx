import { useCallback, useMemo, useRef, useState } from 'react'
import { ScrollView, StyleSheet, Text, View } from 'react-native'
import { useSafeAreaInsets } from 'react-native-safe-area-context'
import { useRouter } from '@/navigation'

import Button from '@/components/Button'
import ChoiceCard from '@/components/ChoiceCard'
import FlagIcon from '@/components/FlagIcon'
import { useNotify } from '@/components/NotificationProvider'
import QueryState from '@/components/QueryState'
import { RowSkeleton } from '@/components/Skeleton'
import StepProgress from '@/components/StepProgress'
import { useAuth } from '@/auth/AuthContext'
import { useLanguages, useMyCourses, useSelectCourse } from '@/hooks/useCourses'
import { useTranslate } from '@/lib/i18n'
import { useLayout } from '@/lib/responsive'
import { colors, fonts, spacing } from '@/theme'

/**
 * Adding a course, as two pages rather than one list: which language the
 * instructions should be in, then which language to learn.
 *
 * The native language is asked every time on purpose. A course remembers its
 * own pairing, so the same language can be learned twice from two different
 * native languages — and someone adding their second course is often the person
 * who wants exactly that. Reusing the profile's existing native language
 * silently made that impossible.
 *
 * Deliberately the same two steps, in the same order and with the same
 * component, as the first two pages of the signup wizard in `(setup)`. It is
 * the same decision; making it look like a different one is how people end up
 * unsure what they just picked.
 */
export default function AddCourse() {
  const insets = useSafeAreaInsets()
  const router = useRouter()
  const notify = useNotify()
  const t = useTranslate()
  const { user } = useAuth()
  const { width, column, size } = useLayout()

  const scrollRef = useRef(null)
  const [index, setIndex] = useState(0)
  const [nativeId, setNativeId] = useState(user?.nativeLanguage?.id ?? null)
  const [learningId, setLearningId] = useState(null)

  const languagesQuery = useLanguages()
  const coursesQuery = useMyCourses()

  const languages = languagesQuery.data ?? []

  /**
   * The exact learning+native pairs already enrolled.
   *
   * A course is a pair, not a language: German-from-English and
   * German-from-French teach the same language through different instructions,
   * and a learner who speaks both may well want both. Only the exact pair is
   * blocked, which is also how the web app models it.
   */
  const enrolledPairs = useMemo(
    () =>
      new Set(
        (coursesQuery.data?.courses ?? []).map(
          (course) => course.languageId + ":" + course.nativeLanguageId,
        ),
      ),
    [coursesQuery.data],
  )

  const learningOptions = useMemo(
    () =>
      languages.filter(
        (language) =>
          // `isLearnable === false` is a language the interface is translated
          // into but that has no course behind it. It belongs in the native
          // picker only, or the learner lands on an empty path. An older API
          // that predates the flag sends undefined, which counts as learnable.
          language.isLearnable !== false &&
          language.id !== nativeId &&
          !enrolledPairs.has(language.id + ":" + nativeId),
      ),
    [languages, nativeId, enrolledPairs],
  )

  const slideTo = useCallback(
    (next) => {
      setIndex(next)
      scrollRef.current?.scrollTo({ x: next * width, animated: true })
    },
    [width],
  )

  const goBack = useCallback(() => {
    if (index === 0) router.replace('/courses')
    else slideTo(index - 1)
  }, [index, router, slideTo])

  // Adding a course makes it the active one, so every course-shaped cache in
  // the app is now about the wrong language. The hook owns that sweep.
  const add = useSelectCourse()

  const canContinue = index === 0 ? Boolean(nativeId) : Boolean(learningId)

  const advance = () => {
    if (add.isPending) return
    if (index === 0) slideTo(1)
    else
      add.mutate(
        { nativeLanguageId: nativeId, learningLanguageId: learningId },
        {
          onSuccess: () => {
            notify.success(t('m_addc_added'))
            router.replace('/courses')
          },
        },
      )
  }

  const pageStyle = { width, paddingHorizontal: spacing.lg }

  return (
    <View style={[styles.screen, { paddingTop: insets.top + spacing.md }]}>
      <StepProgress step={index + 1} totalSteps={2} onBack={goBack} canGoBack />

      <ScrollView
        ref={scrollRef}
        horizontal
        pagingEnabled
        // Driven by the buttons, not the finger: swiping to page two before a
        // native language is picked would leave the learning list filtered
        // against nothing.
        scrollEnabled={false}
        showsHorizontalScrollIndicator={false}
        style={styles.pager}
      >
        {/* 1 — the language the instructions should be in */}
        <ScrollView contentContainerStyle={[pageStyle, styles.page]} showsVerticalScrollIndicator={false}>
          <View style={column}>
            <Text style={[styles.title, { fontSize: size(26) }]}>{t('m_setup_speak_q')}</Text>
            <Text style={styles.subtitle}>
              {t('m_addc_speak_sub')}
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
              {(list) =>
                list.map((language) => (
                  <ChoiceCard
                    key={language.id}
                    title={language.name}
                    subtitle={language.nativeName}
                    leading={<FlagIcon code={language.code} emoji={language.flagEmoji} width={30} />}
                    selected={language.id === nativeId}
                    onPress={() => {
                      setNativeId(language.id)
                      // The pair would be invalid, and a stale pick here is
                      // what silently submits the wrong course.
                      if (learningId === language.id) setLearningId(null)
                    }}
                  />
                ))
              }
            </QueryState>
          </View>
        </ScrollView>

        {/* 2 — the language to learn */}
        <ScrollView contentContainerStyle={[pageStyle, styles.page]} showsVerticalScrollIndicator={false}>
          <View style={column}>
            <Text style={[styles.title, { fontSize: size(26) }]}>{t('m_setup_learn_q')}</Text>
            <Text style={styles.subtitle}>
              {t('m_addc_learn_sub')}
            </Text>

            {learningOptions.length > 0 ? (
              learningOptions.map((language) => (
                <ChoiceCard
                  key={language.id}
                  title={language.name}
                  subtitle={language.nativeName}
                  leading={<FlagIcon code={language.code} emoji={language.flagEmoji} width={30} />}
                  selected={language.id === learningId}
                  onPress={() => setLearningId(language.id)}
                />
              ))
            ) : (
              <Text style={styles.empty}>
                You already have a course for every language available from this one. Go back and pick a different language to learn from.
              </Text>
            )}
          </View>
        </ScrollView>
      </ScrollView>

      <View style={[styles.footer, { paddingBottom: insets.bottom + spacing.lg }]}>
        <View style={column}>
          <Button
            label={index === 0 ? t('m_continue') : t('m_addc_button')}
            onPress={advance}
            loading={add.isPending}
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
  empty: {
    fontFamily: fonts.body,
    fontSize: 14,
    lineHeight: 21,
    color: colors.secondary[400],
  },
  footer: {
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.sm,
    backgroundColor: colors.surface,
  },
})
