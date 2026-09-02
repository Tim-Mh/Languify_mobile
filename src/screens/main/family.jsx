import { useState } from 'react'
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native'
import { useSafeAreaInsets } from 'react-native-safe-area-context'
import { useRouter } from '@/navigation'
import Animated, { FadeInDown } from 'react-native-reanimated'
import ChevronLeft from 'lucide-react-native/icons/chevron-left'
import Clock from 'lucide-react-native/icons/clock'
import Mail from 'lucide-react-native/icons/mail'
import Trash2 from 'lucide-react-native/icons/trash-2'
import UserRound from 'lucide-react-native/icons/user-round'
import Users from 'lucide-react-native/icons/users'

import Button from '@/components/Button'
import ConfirmDialog from '@/components/ConfirmDialog'
import { useNotify } from '@/components/NotificationProvider'
import QueryState from '@/components/QueryState'
import { RowSkeleton } from '@/components/Skeleton'
import StateView from '@/components/StateView'
import TextField from '@/components/TextField'
import { TAB_BAR_OVERHANG } from '@/components/TabBar'
import {
  useAcceptFamilyInvite,
  useDeclineFamilyInvite,
  useFamily,
  useInviteFamilyMember,
  useLeaveFamily,
  useRemoveFamilyMember,
  useRevokeFamilyInvite,
} from '@/hooks/useFamily'
import { mutationErrors } from '@/lib/formErrors'
import { useRefresh } from '@/lib/useRefresh'
import { useGoBack } from '@/lib/useGoBack'
import { useTranslate } from '@/lib/i18n'
import { useLayout } from '@/lib/responsive'
import { colors, fonts, radii, shadows, spacing } from '@/theme'

function formatDate(value) {
  if (!value) return null
  return new Date(value).toLocaleDateString(undefined, { month: 'short', day: 'numeric' })
}

/**
 * Managing a Family plan: who is on it, who has been asked, and the two ways
 * off it.
 *
 * One screen for all four roles the API reports, because they are the same
 * question asked from different sides — "what is my household plan doing?" —
 * and splitting them would mean routing a learner to a different URL depending
 * on a field they cannot see.
 */
export default function Family() {
  const insets = useSafeAreaInsets()
  const router = useRouter()
  const goBack = useGoBack('/profile')
  const notify = useNotify()
  const t = useTranslate()
  const { contentWidth, size } = useLayout()
  const refreshControl = useRefresh()

  const [email, setEmail] = useState('')
  const [pendingRemoval, setPendingRemoval] = useState(null)
  const [pendingRevoke, setPendingRevoke] = useState(null)
  const [leaving, setLeaving] = useState(false)

  const query = useFamily()

  // Each hook owns its own cache refresh and its own message; what stays here
  // is only the dialog each one has to close on the way out.
  const invite = useInviteFamilyMember()
  const revoke = useRevokeFamilyInvite()
  const remove = useRemoveFamilyMember()
  const leave = useLeaveFamily()
  const accept = useAcceptFamilyInvite()
  const decline = useDeclineFamilyInvite()

  const sendInvite = () =>
    invite.mutate(email.trim(), { onSuccess: () => setEmail('') })

  const inviteError = mutationErrors(invite.error)
  const busy = invite.isPending || revoke.isPending || remove.isPending

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
        <Text style={[styles.headerTitle, { fontSize: size(19) }]}>{t('m_family_title')}</Text>
        <View style={styles.back} />
      </View>

      <ScrollView
        refreshControl={refreshControl}
        contentContainerStyle={[styles.content, { width: contentWidth, alignSelf: 'center' }]}
        keyboardShouldPersistTaps="handled"
      >
        <QueryState
          query={query}
          skeleton={<RowSkeleton count={4} />}
          errorTitle={t('m_family_error')}
        >
          {(status) => {
            if (status.role === 'owner') {
              const seatsLeft = Math.max(0, (status.seatsTotal ?? 0) - (status.seatsUsed ?? 0))

              return (
                <>
                  <Animated.View entering={FadeInDown.duration(300)} style={styles.summary}>
                    <View style={styles.summaryIcon}>
                      <Users size={20} color={colors.primary[600]} strokeWidth={2.3} />
                    </View>
                    <View style={styles.summaryCopy}>
                      <Text style={styles.summaryTitle}>
                        {t('m_family_seats', { used: status.seatsUsed, total: status.seatsTotal })}
                      </Text>
                      <Text style={styles.summaryBody}>
                        {seatsLeft > 0
                          ? seatsLeft === 1
                            ? t('m_family_invite_1')
                            : t('m_family_invite_n', { n: seatsLeft })
                          : t('m_family_full')}
                      </Text>
                    </View>
                  </Animated.View>

                  <Text style={styles.sectionLabel}>{t('m_family_inv_head')}</Text>
                  <View style={styles.card}>
                    <TextField
                      label={t('m_family_email')}
                      placeholder="name@example.com"
                      value={email}
                      onChangeText={setEmail}
                      onSubmitEditing={() => email.trim() && sendInvite()}
                      autoCapitalize="none"
                      autoCorrect={false}
                      keyboardType="email-address"
                      returnKeyType="send"
                      editable={!invite.isPending}
                      error={inviteError.fieldErrors.email ?? inviteError.message}
                      style={styles.field}
                    />
                    <Button
                      label={t('m_family_send')}
                      onPress={sendInvite}
                      loading={invite.isPending}
                      disabled={!email.trim() || seatsLeft === 0}
                    />
                    <Text style={styles.hint}>
                      {t('m_family_inv_hint')}
                    </Text>
                  </View>

                  <Text style={styles.sectionLabel}>{t('m_family_members')}</Text>
                  {status.members?.length ? (
                    <View style={styles.card}>
                      {status.members.map((member, index) => (
                        <View
                          key={member.id}
                          style={[styles.row, index === status.members.length - 1 && styles.rowLast]}
                        >
                          <View style={styles.rowIcon}>
                            <UserRound size={17} color={colors.secondary[500]} strokeWidth={2.2} />
                          </View>
                          <View style={styles.rowCopy}>
                            <Text style={styles.rowTitle} numberOfLines={1}>
                              {member.fullName || member.email}
                            </Text>
                            <Text style={styles.rowMeta} numberOfLines={1}>
                              {member.fullName ? member.email : 'Joined'}
                              {member.joinedAt ? ` · ${t('m_family_joined', { date: formatDate(member.joinedAt) })}` : ''}
                            </Text>
                          </View>
                          <Pressable
                            accessibilityRole="button"
                            accessibilityLabel={`Remove ${member.fullName || member.email}`}
                            onPress={() => setPendingRemoval(member)}
                            disabled={busy}
                            hitSlop={8}
                            style={({ pressed }) => [styles.rowAction, pressed && styles.pressed]}
                          >
                            <Trash2 size={17} color={colors.danger[500]} strokeWidth={2.2} />
                          </Pressable>
                        </View>
                      ))}
                    </View>
                  ) : (
                    <Text style={styles.empty}>
                      {t('m_family_no_mem')}
                    </Text>
                  )}

                  {status.pendingInvites?.length ? (
                    <>
                      <Text style={styles.sectionLabel}>{t('m_family_pending')}</Text>
                      <View style={styles.card}>
                        {status.pendingInvites.map((pending, index) => (
                          <View
                            key={pending.id}
                            style={[
                              styles.row,
                              index === status.pendingInvites.length - 1 && styles.rowLast,
                            ]}
                          >
                            <View style={styles.rowIcon}>
                              <Clock size={17} color={colors.warning[600]} strokeWidth={2.2} />
                            </View>
                            <View style={styles.rowCopy}>
                              <Text style={styles.rowTitle} numberOfLines={1}>
                                {pending.email}
                              </Text>
                              <Text style={styles.rowMeta}>
                                {pending.expiresAt
                                  ? t('m_family_expires', { date: formatDate(pending.expiresAt) })
                                  : t('m_family_waiting')}
                              </Text>
                            </View>
                            <Pressable
                              accessibilityRole="button"
                              accessibilityLabel={`Revoke the invite to ${pending.email}`}
                              onPress={() => setPendingRevoke(pending)}
                              disabled={busy}
                              hitSlop={8}
                              style={({ pressed }) => [styles.rowAction, pressed && styles.pressed]}
                            >
                              <Trash2 size={17} color={colors.danger[500]} strokeWidth={2.2} />
                            </Pressable>
                          </View>
                        ))}
                      </View>
                    </>
                  ) : null}
                </>
              )
            }

            if (status.role === 'member') {
              return (
                <>
                  <Animated.View entering={FadeInDown.duration(300)} style={styles.summary}>
                    <View style={styles.summaryIcon}>
                      <Users size={20} color={colors.primary[600]} strokeWidth={2.3} />
                    </View>
                    <View style={styles.summaryCopy}>
                      <Text style={styles.summaryTitle}>
                        {t('m_family_on_plan', { name: status.owner?.fullName || status.owner?.email || '' })}
                      </Text>
                      <Text style={styles.summaryBody}>
                        {status.planActive
                          ? t('m_family_perks_on')
                          : t('m_family_perks_off')}
                      </Text>
                    </View>
                  </Animated.View>

                  <Button
                    label={t('m_family_leave')}
                    variant="dangerOutline"
                    onPress={() => setLeaving(true)}
                    style={styles.leave}
                  />
                </>
              )
            }

            if (status.role === 'invited') {
              return (
                <Animated.View entering={FadeInDown.duration(300)} style={styles.invitePanel}>
                  <View style={styles.summaryIcon}>
                    <Mail size={20} color={colors.primary[600]} strokeWidth={2.3} />
                  </View>
                  <Text style={styles.inviteTitle}>
                    {t('m_family_invited', { name: status.pendingInvite?.ownerName ?? '' })}
                  </Text>
                  <Text style={styles.inviteBody}>
                    {t('m_family_invited_b')}
                  </Text>

                  <Button
                    label={t('m_family_join')}
                    onPress={() => accept.mutate(status.pendingInvite.token)}
                    loading={accept.isPending}
                    disabled={decline.isPending}
                    style={styles.inviteAction}
                  />
                  <Button
                    label={t('m_family_no_thanks')}
                    variant="outline"
                    onPress={() => decline.mutate(status.pendingInvite.token)}
                    loading={decline.isPending}
                    disabled={accept.isPending}
                    style={styles.inviteAction}
                  />
                </Animated.View>
              )
            }

            return (
              <StateView
                icon="empty"
                title={t('m_family_none')}
                body={t('m_family_none_b')}
                actionLabel={t('m_family_see_plans')}
                onAction={() => router.replace('/shop')}
                inline
              />
            )
          }}
        </QueryState>
      </ScrollView>

      <ConfirmDialog
        visible={pendingRemoval !== null}
        title={t('m_family_rm_title', { name: pendingRemoval?.fullName || pendingRemoval?.email || '' })}
        body={t('m_family_rm_body')}
        confirmLabel={t('m_remove')}
        cancelLabel={t('m_keep_it')}
        destructive
        loading={remove.isPending}
        onConfirm={() =>
          remove.mutate(pendingRemoval.id, { onSettled: () => setPendingRemoval(null) })
        }
        onCancel={() => setPendingRemoval(null)}
      />

      <ConfirmDialog
        visible={pendingRevoke !== null}
        title={t('m_family_rev_title')}
        body={t('m_family_rev_body', { email: pendingRevoke?.email ?? '' })}
        confirmLabel={t('m_revoke')}
        cancelLabel={t('m_leave_it')}
        destructive
        loading={revoke.isPending}
        onConfirm={() =>
          revoke.mutate(pendingRevoke.id, { onSettled: () => setPendingRevoke(null) })
        }
        onCancel={() => setPendingRevoke(null)}
      />

      <ConfirmDialog
        visible={leaving}
        title={t('m_family_lv_title')}
        body={t('m_family_lv_body')}
        confirmLabel={t('m_family_lv_yes')}
        cancelLabel={t('m_stay')}
        destructive
        loading={leave.isPending}
        onConfirm={() => leave.mutate(undefined, { onSettled: () => setLeaving(false) })}
        onCancel={() => setLeaving(false)}
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
  summary: {
    flexDirection: 'row',
    gap: spacing.md,
    backgroundColor: colors.white,
    borderRadius: radii.xl,
    padding: spacing.md,
    ...shadows.card,
  },
  summaryIcon: {
    width: 40,
    height: 40,
    borderRadius: radii.pill,
    backgroundColor: colors.primary[50],
    alignItems: 'center',
    justifyContent: 'center',
  },
  summaryCopy: {
    flex: 1,
  },
  summaryTitle: {
    fontFamily: fonts.display,
    fontSize: 16,
    color: colors.secondary[900],
  },
  summaryBody: {
    fontFamily: fonts.body,
    fontSize: 13,
    lineHeight: 19,
    color: colors.secondary[500],
    marginTop: 3,
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
    padding: spacing.md,
    ...shadows.card,
  },
  field: {
    marginBottom: spacing.sm,
  },
  hint: {
    fontFamily: fonts.body,
    fontSize: 12,
    lineHeight: 18,
    color: colors.secondary[400],
    marginTop: spacing.sm,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: colors.secondary[100],
  },
  rowLast: {
    borderBottomWidth: 0,
    paddingBottom: 0,
  },
  rowIcon: {
    width: 34,
    height: 34,
    borderRadius: radii.pill,
    backgroundColor: colors.secondary[50],
    alignItems: 'center',
    justifyContent: 'center',
  },
  rowCopy: {
    flex: 1,
  },
  rowTitle: {
    fontFamily: fonts.bodyBold,
    fontSize: 14.5,
    color: colors.secondary[900],
  },
  rowMeta: {
    fontFamily: fonts.body,
    fontSize: 12,
    color: colors.secondary[400],
    marginTop: 1,
  },
  rowAction: {
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.sm,
  },
  empty: {
    fontFamily: fonts.body,
    fontSize: 13.5,
    lineHeight: 20,
    color: colors.secondary[400],
  },
  leave: {
    marginTop: spacing.xl,
  },
  invitePanel: {
    alignItems: 'center',
    backgroundColor: colors.white,
    borderRadius: radii.xl,
    padding: spacing.lg,
    ...shadows.card,
  },
  inviteTitle: {
    fontFamily: fonts.display,
    fontSize: 19,
    color: colors.secondary[900],
    textAlign: 'center',
    marginTop: spacing.md,
  },
  inviteBody: {
    fontFamily: fonts.body,
    fontSize: 14,
    lineHeight: 21,
    color: colors.secondary[500],
    textAlign: 'center',
    marginTop: spacing.sm,
    marginBottom: spacing.md,
  },
  inviteAction: {
    alignSelf: 'stretch',
    marginTop: spacing.sm,
  },
})
