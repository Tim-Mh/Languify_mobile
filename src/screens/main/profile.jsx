import { useState } from 'react'
import { Image, Pressable, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native'
import { useSafeAreaInsets } from 'react-native-safe-area-context'
import { useRouter } from '@/navigation'
import { LinearGradient } from 'react-native-linear-gradient'
import Animated, { FadeIn, FadeInDown } from 'react-native-reanimated'
import Bell from 'lucide-react-native/icons/bell'
import BookOpen from 'lucide-react-native/icons/book-open'
import Check from 'lucide-react-native/icons/check'
import ChevronRight from 'lucide-react-native/icons/chevron-right'
import Crown from 'lucide-react-native/icons/crown'
import Flame from 'lucide-react-native/icons/flame'
import Languages from 'lucide-react-native/icons/languages'
import Pencil from 'lucide-react-native/icons/pencil'
import Star from 'lucide-react-native/icons/star'
import Users from 'lucide-react-native/icons/users'
import Zap from 'lucide-react-native/icons/zap'

import Button from '@/components/Button'
import ConfirmDialog from '@/components/ConfirmDialog'
import QueryState from '@/components/QueryState'
import RewardModal from '@/components/RewardModal'
import { ProfileSkeleton } from '@/components/Skeleton'
import { TAB_BAR_OVERHANG } from '@/components/TabBar'
import { useNotify } from '@/components/NotificationProvider'
import Avatar from '@/components/Avatar'
import { useAuth } from '@/auth/AuthContext'
import { useAvatar } from '@/hooks/useAvatar'
import { useGameState } from '@/hooks/useGame'
import {
  useClaimBadge,
  useDeleteAccount,
  useLogOut,
  useUpdateProfile,
} from '@/hooks/useProfile'
import { BADGES, badgeImage, badgeProgress } from '@/lib/badges'
import { badgeDescription, badgeTitle } from '@/lib/contentNames'
import { useTranslate } from '@/lib/i18n'
import { useRefresh } from '@/lib/useRefresh'
import { useLayout } from '@/lib/responsive'
import { colors, fonts, radii, shadows, spacing } from '@/theme'

/**
 * The three badge ladders, in the order the web shows them. The icon is the
 * category's, not the badge's — the badge itself is the artwork beside it.
 */
const CATEGORIES = [
  { key: 'streak', labelKey: 'm_profile_cat_streak', Icon: Flame, tint: colors.primary[500], filled: true },
  { key: 'xp', labelKey: 'm_profile_cat_xp', Icon: Zap, tint: colors.accent[500], filled: true },
  { key: 'lesson', labelKey: 'm_profile_cat_lesson', Icon: BookOpen, tint: colors.secondary[500], filled: false },
]

/**
 * The badge artwork is 160×183, not square, so the tiles carry the art's real
 * ratio rather than letterboxing it in a square.
 */
const BADGE_ASPECT = 160 / 183

/** Earned badges a row. */
const EARNED_COLUMNS = 4

/** Space between them, split either side of each cell. */
const EARNED_GAP = 10

export default function Profile() {
  const insets = useSafeAreaInsets()
  const router = useRouter()
  const t = useTranslate()
  const { contentWidth, size } = useLayout()
  const notify = useNotify()
  const { user } = useAuth()
  const refreshControl = useRefresh()
  const stateQuery = useGameState()
  const state = stateQuery.data
  // The face the learner built, same DiceBear config the web renders.
  const avatarQuery = useAvatar()

  /** The badge just claimed, so its reward can be celebrated. */
  const [claimed, setClaimed] = useState(null)
  /** The draft name while renaming, or null when not renaming. */
  const [draftName, setDraftName] = useState(null)
  const [confirmingDelete, setConfirmingDelete] = useState(false)

  const logOut = useLogOut()
  const rename = useUpdateProfile()
  const closeAccount = useDeleteAccount()
  const claim = useClaimBadge()

  // Sized in pixels from the content width. `width: '100%'` plus an
  // `aspectRatio` on an image that also has an intrinsic size left the artwork
  // resolving against the wrong axis, which is how two badges ended up wider
  // than the screen and overlapping each other.
  const badgeWidth = Math.floor((contentWidth - spacing.lg * 2) / EARNED_COLUMNS) - EARNED_GAP

  const earnedIds = state?.earnedBadgeIds ?? []
  const earned = BADGES.filter((badge) => earnedIds.includes(badge.id))

  const saveName = () => {
    const trimmed = (draftName ?? '').trim()
    if (!trimmed) {
      notify.error(t('m_profile_name_empty'))
      return
    }
    if (trimmed === user?.fullName) {
      setDraftName(null)
      return
    }
    rename.mutate(trimmed, { onSuccess: () => setDraftName(null) })
  }

  return (
    <ScrollView
      style={styles.screen}
      refreshControl={refreshControl}
      contentContainerStyle={[
        styles.content,
        { paddingTop: insets.top + spacing.lg, width: contentWidth, alignSelf: 'center' },
      ]}
    >
      {/* The identity block comes from the already-loaded profile, so it renders
          immediately; only the badges wait on their own request. */}
      <QueryState query={stateQuery} skeleton={<ProfileSkeleton />} errorTitle={t('m_profile_stats_error')} inline>
        {/* The same plum gradient as Home's status slab, so the two screens
            read as one product rather than a card page and a chrome page. */}
        <Animated.View entering={FadeIn.duration(260)}>
            <LinearGradient
              colors={[colors.secondary[700], colors.secondary[500]]}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 1 }}
              style={styles.header}
            >
              {/* The avatar is itself the way into the editor, as on the web,
                  with the badge on its corner saying so without a caption. */}
              <Pressable
                accessibilityRole="button"
                accessibilityLabel={t('m_profile_edit_avatar')}
                onPress={() => router.push('/avatar')}
                style={({ pressed }) => [styles.avatarWrap, pressed && styles.pressed]}
              >
                <Avatar
                  config={avatarQuery.data}
                  seed={user?.id}
                  name={user?.fullName}
                  size={size(94)}
                  ring={colors.white}
                />
                <View style={styles.avatarBadge}>
                  <Pencil size={12} color={colors.white} strokeWidth={2.8} />
                </View>
              </Pressable>

              {draftName === null ? (
                <View style={styles.nameRow}>
                  <Text style={[styles.name, { fontSize: size(22) }]} numberOfLines={1}>
                    {user?.fullName ?? t('m_profile_learner')}
                  </Text>
                  <Pressable
                    accessibilityRole="button"
                    accessibilityLabel={t('m_profile_edit_name')}
                    onPress={() => setDraftName(user?.fullName ?? '')}
                    hitSlop={10}
                    style={({ pressed }) => [styles.nameEdit, pressed && styles.pressed]}
                  >
                    <Pencil size={13} color={colors.white} strokeWidth={2.6} />
                  </Pressable>
                </View>
              ) : (
                <View style={styles.nameRow}>
                  <TextInput
                    autoFocus
                    value={draftName}
                    onChangeText={setDraftName}
                    onSubmitEditing={saveName}
                    returnKeyType="done"
                    maxLength={40}
                    editable={!rename.isPending}
                    accessibilityLabel="Your name"
                    style={styles.nameInput}
                  />
                  <Pressable
                    accessibilityRole="button"
                    accessibilityLabel={t('m_profile_save_name')}
                    onPress={saveName}
                    disabled={rename.isPending}
                    hitSlop={10}
                    style={({ pressed }) => [
                      styles.nameSave,
                      (pressed || rename.isPending) && styles.pressed,
                    ]}
                  >
                    <Check size={16} color={colors.secondary[700]} strokeWidth={3} />
                  </Pressable>
                </View>
              )}

              <Text style={styles.email} numberOfLines={1}>
                {user?.email}
              </Text>
            </LinearGradient>
        </Animated.View>
      </QueryState>

      <Text style={styles.sectionLabel}>{t('m_profile_badges')}</Text>

      {/* One card per ladder, showing the next badge to go for. Once a ladder is
          finished the last badge stays on show with a full bar, rather than the
          card disappearing and making the achievement invisible. */}
      {CATEGORIES.map((category, index) => {
        const ladder = BADGES.filter((badge) => badge.category === category.key)
        const nextBadge = ladder.find((badge) => !earnedIds.includes(badge.id))
        const shown = nextBadge ?? ladder[ladder.length - 1]
        const progress = nextBadge ? badgeProgress(nextBadge, state) : null
        const claimable = Boolean(progress && progress.current >= progress.total)
        const busy = claim.isPending && claim.variables?.id === nextBadge?.id

        return (
          <Animated.View
            key={category.key}
            entering={FadeInDown.delay(60 * index).duration(300)}
            style={styles.badgeCard}
          >
            <Image source={badgeImage(shown)} style={styles.badgeArt} resizeMode="contain" />

            <View style={styles.badgeCopy}>
              <View style={styles.badgeHead}>
                <category.Icon
                  size={17}
                  color={category.tint}
                  strokeWidth={2.2}
                  fill={category.filled ? category.tint : 'none'}
                />
                <Text style={styles.badgeCategory}>{t(category.labelKey)}</Text>
                {progress && !claimable ? (
                  <Text style={styles.badgeCount}>
                    {progress.current}/{progress.total}
                  </Text>
                ) : null}
                {!progress ? <Text style={styles.badgeAllDone}>{t('m_profile_all_earned')}</Text> : null}
              </View>

              <Text style={styles.badgeName} numberOfLines={1}>
                {badgeTitle(t, shown)}
              </Text>

              {claimable ? (
                <Button
                  label={t('m_profile_claim')}
                  onPress={() =>
                    claim.mutate(nextBadge, {
                      onSuccess: (result) =>
                        setClaimed({ badge: nextBadge, reward: result?.reward ?? null }),
                    })
                  }
                  loading={busy}
                  style={styles.badgeClaim}
                />
              ) : (
                <View style={styles.badgeBar}>
                  <View
                    style={[
                      styles.badgeBarFill,
                      progress
                        ? { width: `${Math.max(2, (progress.current / progress.total) * 100)}%` }
                        : { width: '100%', backgroundColor: colors.success[500] },
                    ]}
                  />
                </View>
              )}
            </View>
          </Animated.View>
        )
      })}

      <View style={styles.earnedHead}>
        <Star size={15} color={colors.accent[500]} strokeWidth={2.2} fill={colors.accent[500]} />
        <Text style={styles.earnedTitle}>{t('m_profile_earned')}</Text>
        <Text style={styles.earnedCount}>
          {t('m_profile_earned_count', { done: earned.length, total: BADGES.length })}
        </Text>
      </View>

      {earned.length > 0 ? (
        <View style={styles.earnedGrid}>
          {earned.map((badge) => (
            <View key={badge.id} style={[styles.earnedCell, { width: badgeWidth + EARNED_GAP }]}>
              <Image
                source={badgeImage(badge)}
                style={{ width: badgeWidth, height: Math.round(badgeWidth / BADGE_ASPECT) }}
                resizeMode="contain"
              />
              <Text style={styles.earnedLabel} numberOfLines={2}>
                {badgeTitle(t, badge)}
              </Text>
            </View>
          ))}
        </View>
      ) : (
        <Text style={styles.earnedEmpty}>
          {t('m_profile_no_badges')}
        </Text>
      )}

      <Text style={styles.sectionLabel}>{t('m_profile_account')}</Text>
      <View style={styles.card}>
        {/* Naming the plan and doing nothing is a dead end: the only reason to
            look is to change it, and that lives in the shop. */}
        <LinkRow
          icon={<Crown size={18} color={colors.secondary[500]} strokeWidth={2.2} />}
          label={t('m_profile_subscription')}
          hint={user?.hasActiveAppAccess ? t('m_profile_premium') : t('m_profile_free_plan')}
          onPress={() => router.push('/shop')}
        />
        {/* Here as well as on the plan card, because someone who has been
            invited is on no plan at all and would never think to look in the
            shop for it. */}
        <LinkRow
          icon={<Users size={18} color={colors.secondary[500]} strokeWidth={2.2} />}
          label={t('m_profile_family')}
          hint={t('m_profile_family_hint')}
          onPress={() => router.push('/family')}
        />
        {/* The only way to switch or add a language now that the drawer is
            gone, so it cannot live anywhere but here. */}
        <LinkRow
          icon={<Languages size={18} color={colors.secondary[500]} strokeWidth={2.2} />}
          label={t('m_profile_courses')}
          hint={t('m_profile_courses_hint')}
          onPress={() => router.push('/courses')}
        />
        {/* The only route to the notification settings. Required to be
            reachable in-app: the OS switch is all-or-nothing, and an app that
            offers no finer control than that does not pass App Store review. */}
        <LinkRow
          icon={<Bell size={18} color={colors.secondary[500]} strokeWidth={2.2} />}
          label={t('m_profile_notifications')}
          hint={t('m_profile_notifications_hint')}
          onPress={() => router.push('/notifications')}
          last
        />
      </View>

      <Button
        label={t('m_profile_log_out')}
        variant="outline"
        onPress={() => logOut.mutate()}
        loading={logOut.isPending}
        style={styles.logout}
      />

      <Button
        label={t('m_profile_delete')}
        variant="dangerOutline"
        onPress={() => setConfirmingDelete(true)}
        style={styles.deleteAccount}
      />

      <ConfirmDialog
        visible={confirmingDelete}
        title={t('m_profile_delete_title')}
        body={t('m_profile_delete_body')}
        confirmLabel={t('m_profile_delete_yes')}
        cancelLabel={t('m_profile_delete_no')}
        destructive
        loading={closeAccount.isPending}
        onConfirm={() =>
          closeAccount.mutate(undefined, { onSettled: () => setConfirmingDelete(false) })
        }
        onCancel={() => setConfirmingDelete(false)}
      />

      <RewardModal
        visible={claimed !== null}
        title={claimed?.badge ? badgeTitle(t, claimed.badge) : t('m_profile_badge_earned')}
        subtitle={claimed?.badge ? badgeDescription(t, claimed.badge) : undefined}
        rewards={
          claimed?.reward
            ? [
                ...(claimed.reward.gems ? [{ kind: 'gems', value: `+${claimed.reward.gems}`, label: t('m_gems') }] : []),
                ...(claimed.reward.xp ? [{ kind: 'xp', value: `+${claimed.reward.xp}`, label: t('m_xp') }] : []),
                ...(claimed.reward.hearts ? [{ kind: 'badge', value: `+${claimed.reward.hearts}`, label: t('m_hearts') }] : []),
              ]
            : []
        }
        actionLabel={t('m_nice')}
        onClose={() => setClaimed(null)}
      />
    </ScrollView>
  )
}

function LinkRow({ icon, label, hint, onPress, last }) {
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={label}
      onPress={onPress}
      style={({ pressed }) => [styles.row, last && styles.rowLast, pressed && styles.pressed]}
    >
      {icon}
      <View style={styles.linkCopy}>
        <Text style={styles.rowValue}>{label}</Text>
        {hint ? <Text style={styles.linkHint}>{hint}</Text> : null}
      </View>
      <ChevronRight size={17} color={colors.secondary[300]} strokeWidth={2.2} />
    </Pressable>
  )
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: colors.secondary[50],
  },
  content: {
    paddingHorizontal: spacing.lg,
    // Clears the tab bar's raised centre button, which overhangs the scene.
    paddingBottom: spacing.xxl + TAB_BAR_OVERHANG,
  },
  header: {
    alignItems: 'center',
    borderRadius: 26,
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.xl,
    marginBottom: spacing.sm,
    ...shadows.lifted,
  },
  avatarWrap: {
    // The badge hangs off the avatar's corner, so nothing here may clip.
    marginBottom: spacing.md,
  },
  avatarBadge: {
    position: 'absolute',
    right: -2,
    bottom: -2,
    width: 30,
    height: 30,
    borderRadius: radii.pill,
    backgroundColor: colors.primary[500],
    borderWidth: 3,
    borderColor: colors.white,
    alignItems: 'center',
    justifyContent: 'center',
  },
  pressed: {
    opacity: 0.7,
  },
  nameRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    alignSelf: 'stretch',
    justifyContent: 'center',
  },
  name: {
    fontFamily: fonts.display,
    fontSize: 22,
    color: colors.white,
    flexShrink: 1,
  },
  nameEdit: {
    width: 26,
    height: 26,
    borderRadius: radii.pill,
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  nameInput: {
    flex: 1,
    height: 44,
    borderRadius: radii.pill,
    backgroundColor: colors.white,
    paddingHorizontal: spacing.md,
    textAlign: 'center',
    fontFamily: fonts.display,
    fontSize: 18,
    color: colors.secondary[900],
  },
  nameSave: {
    width: 40,
    height: 40,
    borderRadius: radii.pill,
    backgroundColor: colors.white,
    alignItems: 'center',
    justifyContent: 'center',
  },
  email: {
    fontFamily: fonts.body,
    fontSize: 13.5,
    color: colors.secondary[200],
    marginTop: 5,
  },
  badgeCard: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    backgroundColor: colors.white,
    borderRadius: radii.xl,
    padding: spacing.md,
    marginBottom: spacing.sm,
    ...shadows.card,
  },
  badgeArt: {
    width: 76,
    // The art is taller than it is wide; a square box would shrink it to 66pt
    // and leave dead space either side of it.
    height: 76 / BADGE_ASPECT,
  },
  badgeCopy: {
    flex: 1,
  },
  badgeHead: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  badgeCategory: {
    fontFamily: fonts.bodyBold,
    fontSize: 13,
    color: colors.secondary[700],
  },
  badgeCount: {
    marginLeft: 'auto',
    fontFamily: fonts.bodyBold,
    fontSize: 12,
    color: colors.secondary[400],
  },
  badgeAllDone: {
    marginLeft: 'auto',
    fontFamily: fonts.bodyBold,
    fontSize: 12,
    color: colors.success[600],
  },
  badgeName: {
    fontFamily: fonts.display,
    fontSize: 15,
    color: colors.secondary[900],
    marginTop: 2,
    marginBottom: spacing.sm,
  },
  badgeClaim: {
    alignSelf: 'stretch',
  },
  badgeBar: {
    height: 10,
    borderRadius: radii.pill,
    backgroundColor: colors.secondary[100],
    overflow: 'hidden',
  },
  badgeBarFill: {
    height: '100%',
    borderRadius: radii.pill,
    backgroundColor: colors.primary[400],
  },
  earnedHead: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginTop: spacing.lg,
    marginBottom: spacing.sm,
  },
  earnedTitle: {
    fontFamily: fonts.display,
    fontSize: 15,
    color: colors.secondary[900],
  },
  earnedCount: {
    marginLeft: 'auto',
    fontFamily: fonts.bodySemi,
    fontSize: 12,
    color: colors.secondary[400],
  },
  earnedGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    marginHorizontal: -EARNED_GAP / 2,
  },
  // Four a row. These are a collection to scan, not the thing the screen is
  // for — the ladder cards above already show the artwork at size.
  earnedCell: {
    alignItems: 'center',
    paddingHorizontal: EARNED_GAP / 2,
    marginBottom: spacing.md,
  },
  earnedLabel: {
    fontFamily: fonts.bodySemi,
    fontSize: 10,
    lineHeight: 13,
    color: colors.secondary[500],
    textAlign: 'center',
    marginTop: 3,
  },
  earnedEmpty: {
    fontFamily: fonts.body,
    fontSize: 13.5,
    lineHeight: 20,
    color: colors.secondary[400],
  },
  sectionLabel: {
    fontFamily: fonts.bodyBold,
    fontSize: 12,
    letterSpacing: 1,
    color: colors.secondary[400],
    marginTop: spacing.xl,
    marginBottom: spacing.sm,
  },
  card: {
    backgroundColor: colors.white,
    borderRadius: radii.xl,
    paddingHorizontal: spacing.md,
    ...shadows.card,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    paddingVertical: 14,
    borderBottomWidth: 1,
    borderBottomColor: colors.secondary[100],
  },
  rowLast: {
    borderBottomWidth: 0,
  },
  rowValue: {
    fontFamily: fonts.bodyBold,
    fontSize: 15,
    color: colors.secondary[900],
  },
  linkCopy: {
    flex: 1,
  },
  linkHint: {
    fontFamily: fonts.body,
    fontSize: 12,
    color: colors.secondary[400],
    marginTop: 1,
  },
  logout: {
    marginTop: spacing.xl,
  },
  deleteAccount: {
    marginTop: spacing.sm,
  },
})
