import { Linking, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native'
import { useSafeAreaInsets } from 'react-native-safe-area-context'
import Bell from 'lucide-react-native/icons/bell'
import ChevronLeft from 'lucide-react-native/icons/chevron-left'
import CreditCard from 'lucide-react-native/icons/credit-card'
import Gift from 'lucide-react-native/icons/gift'
import Medal from 'lucide-react-native/icons/medal'
import TrendingUp from 'lucide-react-native/icons/trending-up'
import Users from 'lucide-react-native/icons/users'

import QueryState from '@/components/QueryState'
import { RowSkeleton } from '@/components/Skeleton'
import {
  useNotificationPreferences,
  useUpdateNotificationPreferences,
} from '@/hooks/useNotificationPreferences'
import { useGoBack } from '@/lib/useGoBack'
import { useTranslate } from '@/lib/i18n'
import { useLayout } from '@/lib/responsive'
import { useRefresh } from '@/lib/useRefresh'
import { colors, fonts, radii, shadows, spacing } from '@/theme'

/**
 * Six switches, in the order they matter to a learner rather than
 * alphabetically: the ones that arrive most often first, billing last because
 * it is the one nobody wants but everybody should leave on.
 *
 * These keys are the contract with App\Enums\NotificationCategory on the
 * backend and the Android channel ids in src/lib/push.js. All three lists have
 * to move together.
 */
const CATEGORIES = [
  { key: 'reminders', Icon: Bell },
  { key: 'rewards', Icon: Gift },
  { key: 'progress', Icon: TrendingUp },
  { key: 'league', Icon: Medal },
  { key: 'family', Icon: Users },
  { key: 'billing', Icon: CreditCard },
]

export default function NotificationSettings() {
  const insets = useSafeAreaInsets()
  const refreshControl = useRefresh()
  const goBack = useGoBack('/profile')
  const t = useTranslate()
  const { contentWidth, size } = useLayout()

  const preferencesQuery = useNotificationPreferences()
  const update = useUpdateNotificationPreferences()

  const preferences = preferencesQuery.data?.preferences ?? {}

  return (
    <View style={styles.screen}>
      <View style={[styles.header, { paddingTop: insets.top + spacing.sm }]}>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel={t('m_notif_back')}
          onPress={goBack}
          hitSlop={12}
          style={({ pressed }) => [styles.back, pressed && styles.pressed]}
        >
          <ChevronLeft size={22} color={colors.secondary[600]} strokeWidth={2.4} />
        </Pressable>
        <Text style={[styles.headerTitle, { fontSize: size(19) }]}>{t('m_notif_title')}</Text>
        <View style={styles.back} />
      </View>

      <ScrollView
        refreshControl={refreshControl}
        contentContainerStyle={[styles.content, { width: contentWidth, alignSelf: 'center' }]}
      >
        <Text style={styles.intro}>{t('m_notif_intro')}</Text>

        <QueryState
          query={preferencesQuery}
          skeleton={<RowSkeleton count={6} />}
          errorTitle={t('m_notif_error')}
          inline
        >
          {() => (
            <View style={styles.card}>
              {CATEGORIES.map(({ key, Icon }, index) => {
                // Defaults to on while the first response is still in flight,
                // so the switches never flash off and then jump on.
                const enabled = preferences[key] !== false

                return (
                  <Pressable
                    key={key}
                    accessibilityRole="switch"
                    accessibilityLabel={t(`m_notif_${key}`)}
                    accessibilityState={{ checked: enabled }}
                    onPress={() => update.mutate({ [key]: !enabled })}
                    style={({ pressed }) => [
                      styles.row,
                      index === CATEGORIES.length - 1 && styles.rowLast,
                      pressed && styles.pressed,
                    ]}
                  >
                    <View style={styles.iconWrap}>
                      <Icon size={18} color={colors.secondary[500]} strokeWidth={2.2} />
                    </View>

                    <View style={styles.copy}>
                      <Text style={styles.label}>{t(`m_notif_${key}`)}</Text>
                      <Text style={styles.hint}>{t(`m_notif_${key}_hint`)}</Text>
                    </View>

                    {/* Hand-rolled to match the plan screen's pill rather than
                        the platform Switch, which looks different on each OS
                        and ignores the app's palette. */}
                    <View style={[styles.track, enabled && styles.trackOn]}>
                      <View style={[styles.knob, enabled && styles.knobOn]} />
                    </View>
                  </Pressable>
                )
              })}
            </View>
          )}
        </QueryState>

        {/* Switching everything off here still leaves the OS permission granted,
            and the reverse is worse: someone who denied the system prompt would
            otherwise sit on this screen flipping switches that can never
            deliver anything. */}
        <Text style={styles.footnote}>{t('m_notif_system_note')}</Text>

        <Pressable
          accessibilityRole="button"
          onPress={() => Linking.openSettings()}
          style={({ pressed }) => [styles.systemLink, pressed && styles.pressed]}
        >
          <Text style={styles.systemLinkText}>{t('m_notif_open_settings')}</Text>
        </Pressable>
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
    justifyContent: 'space-between',
    paddingHorizontal: spacing.md,
    paddingBottom: spacing.sm,
    backgroundColor: colors.white,
  },
  back: {
    width: 34,
    height: 34,
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerTitle: {
    fontFamily: fonts.display,
    color: colors.secondary[900],
  },
  pressed: {
    opacity: 0.85,
  },
  content: {
    paddingHorizontal: spacing.md,
    paddingTop: spacing.md,
    paddingBottom: spacing.xl,
  },
  intro: {
    fontFamily: fonts.body,
    fontSize: 14,
    lineHeight: 20,
    color: colors.secondary[600],
    marginBottom: spacing.md,
  },
  card: {
    backgroundColor: colors.white,
    borderRadius: radii.lg,
    paddingHorizontal: spacing.md,
    ...shadows.card,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    paddingVertical: 14,
    borderBottomWidth: 1,
    borderBottomColor: colors.secondary[100],
  },
  rowLast: {
    borderBottomWidth: 0,
  },
  iconWrap: {
    width: 34,
    height: 34,
    borderRadius: radii.pill,
    backgroundColor: colors.secondary[50],
    alignItems: 'center',
    justifyContent: 'center',
  },
  copy: {
    flex: 1,
  },
  label: {
    fontFamily: fonts.display,
    fontSize: 15,
    color: colors.secondary[900],
  },
  hint: {
    fontFamily: fonts.body,
    fontSize: 13,
    lineHeight: 17,
    color: colors.secondary[500],
    marginTop: 1,
  },
  track: {
    width: 48,
    height: 28,
    borderRadius: radii.pill,
    backgroundColor: colors.secondary[300],
    justifyContent: 'center',
  },
  trackOn: {
    backgroundColor: colors.primary[500],
  },
  knob: {
    width: 20,
    height: 20,
    borderRadius: radii.pill,
    backgroundColor: colors.white,
    marginLeft: 4,
    ...shadows.card,
  },
  knobOn: {
    marginLeft: 24,
  },
  footnote: {
    fontFamily: fonts.body,
    fontSize: 13,
    lineHeight: 18,
    color: colors.secondary[500],
    marginTop: spacing.md,
  },
  systemLink: {
    alignSelf: 'flex-start',
    marginTop: spacing.xs,
    paddingVertical: spacing.xs,
  },
  systemLinkText: {
    fontFamily: fonts.bodySemi,
    fontSize: 14,
    color: colors.primary[600],
  },
})
