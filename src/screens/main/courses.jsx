import { useState } from 'react'
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native'
import { useSafeAreaInsets } from 'react-native-safe-area-context'
import { useRouter } from '@/navigation'
import Check from 'lucide-react-native/icons/check'
import ChevronLeft from 'lucide-react-native/icons/chevron-left'
import Plus from 'lucide-react-native/icons/plus'
import Trash2 from 'lucide-react-native/icons/trash-2'

import ConfirmDialog from '@/components/ConfirmDialog'
import FlagIcon from '@/components/FlagIcon'
import { useNotify } from '@/components/NotificationProvider'
import QueryState from '@/components/QueryState'
import { RowSkeleton } from '@/components/Skeleton'
import { TAB_BAR_OVERHANG } from '@/components/TabBar'
import { useDeleteCourse, useMyCourses, useSwitchCourse } from '@/hooks/useCourses'
import { useRefresh } from '@/lib/useRefresh'
import { useGoBack } from '@/lib/useGoBack'
import { useTranslate } from '@/lib/i18n'
import { useLayout } from '@/lib/responsive'
import { colors, fonts, radii, shadows, spacing } from '@/theme'

export default function Courses() {
  const insets = useSafeAreaInsets()
  const refreshControl = useRefresh()
  const router = useRouter()
  const goBack = useGoBack('/profile')
  const notify = useNotify()
  const t = useTranslate()
  const { contentWidth, size } = useLayout()

  const [pendingRemoval, setPendingRemoval] = useState(null)

  const coursesQuery = useMyCourses()
  const courses = coursesQuery.data?.courses ?? []

  // Both hooks own the full course-wide cache refresh and the failure message.
  const swap = useSwitchCourse()
  const remove = useDeleteCourse()

  const busy = swap.isPending || remove.isPending

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
        <Text style={[styles.headerTitle, { fontSize: size(19) }]}>{t('m_courses_title')}</Text>
        <View style={styles.back} />
      </View>

      <ScrollView
        refreshControl={refreshControl}
        contentContainerStyle={[
          styles.content,
          { width: contentWidth, alignSelf: 'center' },
        ]}
      >
        <QueryState
          query={coursesQuery}
          skeleton={<RowSkeleton count={3} />}
          errorTitle={t('m_courses_error')}
          isEmpty={(data) => (data?.courses?.length ?? 0) === 0}
          emptyTitle={t('m_courses_none')}
          emptyBody={t('m_courses_none_b')}
          inline
        >
          {() =>
            courses.map((course) => (
              <View
                key={course.id}
                style={[styles.card, course.isActive && styles.cardActive]}
              >
                <Pressable
                  accessibilityRole="button"
                  accessibilityLabel={`Switch to ${course.name}`}
                  accessibilityState={{ selected: course.isActive }}
                  onPress={() =>
                    !course.isActive &&
                    !busy &&
                    swap.mutate(course.id, {
                      onSuccess: () => {
                        notify.success(t('m_courses_now', { language: course.name }))
                        // The cache is empty at this point, so every screen
                        // rebuilds for the new course. Landing on home means the
                        // learner sees that happen once, on a screen that is
                        // meant to load, rather than watching the course list
                        // they are already looking at flicker.
                        router.replace('/home')
                      },
                    })
                  }
                  disabled={course.isActive || busy}
                  style={styles.cardMain}
                >
                  <FlagIcon code={course.code} emoji={course.flagEmoji} width={32} />

                  <View style={styles.cardCopy}>
                    <Text style={styles.cardTitle}>{course.name}</Text>
                    <Text style={styles.cardMeta}>
                      {t('m_courses_from', { language: course.nativeLanguageName ?? '' })}
                      {course.isActive ? ` · ${t('m_courses_active')}` : ''}
                    </Text>
                  </View>

                  {course.isActive ? (
                    <View style={styles.activeBadge}>
                      <Check size={15} color={colors.white} strokeWidth={3} />
                    </View>
                  ) : (
                    <Text style={styles.switchHint}>{t('m_courses_switch')}</Text>
                  )}
                </Pressable>

                {/* Removing the active course would leave the app with none, so
                    it is only offered on the others. */}
                {!course.isActive ? (
                  <Pressable
                    accessibilityRole="button"
                    accessibilityLabel={`Remove ${course.name}`}
                    onPress={() => setPendingRemoval(course)}
                    disabled={busy}
                    hitSlop={8}
                    style={({ pressed }) => [styles.remove, pressed && styles.pressed]}
                  >
                    <Trash2 size={17} color={colors.danger[500]} strokeWidth={2.2} />
                  </Pressable>
                ) : null}
              </View>
            ))
          }
        </QueryState>

        {/* Adding is its own two-step flow — which language you speak, then
            which you want to learn — because the native language is part of the
            course, not something to inherit silently from the profile. */}
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Add a course"
          onPress={() => router.push('/add-course')}
          style={({ pressed }) => [styles.addCard, pressed && styles.pressed]}
        >
          <View style={styles.addIcon}>
            <Plus size={20} color={colors.primary[600]} strokeWidth={2.4} />
          </View>
          <Text style={styles.addLabel}>{t('m_courses_add')}</Text>
        </Pressable>
      </ScrollView>

      <ConfirmDialog
        visible={pendingRemoval !== null}
        title={t('m_courses_rm_title', { name: pendingRemoval?.name ?? '' })}
        body={t('m_courses_rm_body')}
        confirmLabel={t('m_remove')}
        cancelLabel={t('m_keep_it')}
        destructive
        loading={remove.isPending}
        onConfirm={() =>
          remove.mutate(pendingRemoval.id, {
            // Worth saying explicitly: people hesitate to delete a course they
            // have put hours into.
            onSuccess: () =>
              notify.info(t('m_courses_removed')),
            onSettled: () => setPendingRemoval(null),
          })
        }
        onCancel={() => setPendingRemoval(null)}
      />
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
  headerTitle: {
    flex: 1,
    fontFamily: fonts.display,
    color: colors.secondary[900],
    textAlign: 'center',
  },
  pressed: {
    opacity: 0.7,
  },
  content: {
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.lg,
    // Clears the tab bar's raised centre button, which overhangs the scene.
    paddingBottom: spacing.xxl + TAB_BAR_OVERHANG,
  },
  // Flat, with a border, exactly like the pickers in the setup and add-course
  // flows. A shadow on every row made the whole list look selectable-and-
  // already-selected; the lift now means something, because only the active
  // course has it.
  card: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.white,
    borderRadius: radii.xl,
    borderWidth: 2,
    borderColor: colors.secondary[200],
    marginBottom: spacing.sm,
  },
  cardActive: {
    borderColor: colors.primary[400],
    backgroundColor: colors.primary[50],
    ...shadows.card,
  },
  cardMain: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    padding: spacing.md,
  },
  cardCopy: {
    flex: 1,
  },
  cardTitle: {
    fontFamily: fonts.display,
    fontSize: 16,
    color: colors.secondary[900],
  },
  cardMeta: {
    fontFamily: fonts.body,
    fontSize: 12.5,
    color: colors.secondary[400],
    marginTop: 1,
  },
  activeBadge: {
    width: 26,
    height: 26,
    borderRadius: radii.pill,
    backgroundColor: colors.primary[500],
    alignItems: 'center',
    justifyContent: 'center',
  },
  switchHint: {
    fontFamily: fonts.bodyBold,
    fontSize: 13,
    color: colors.primary[600],
  },
  remove: {
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.md,
  },
  addCard: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    borderWidth: 2,
    borderStyle: 'dashed',
    borderColor: colors.secondary[200],
    borderRadius: radii.xl,
    padding: spacing.md,
    marginTop: spacing.sm,
  },
  addIcon: {
    width: 40,
    height: 40,
    borderRadius: radii.pill,
    backgroundColor: colors.primary[50],
    alignItems: 'center',
    justifyContent: 'center',
  },
  addLabel: {
    fontFamily: fonts.bodyBold,
    fontSize: 15,
    color: colors.secondary[700],
  },
})
