import { useState } from 'react'
import { Pressable, StyleSheet, Text, View } from 'react-native'
import { useRouter } from '@/navigation'
import Calendar from 'lucide-react-native/icons/calendar'
import Check from 'lucide-react-native/icons/check'
import ChevronRight from 'lucide-react-native/icons/chevron-right'
import Crown from 'lucide-react-native/icons/crown'
import Star from 'lucide-react-native/icons/star'
import TriangleAlert from 'lucide-react-native/icons/triangle-alert'
import Users from 'lucide-react-native/icons/users'

import Button from './Button'
import ConfirmDialog from './ConfirmDialog'
import { useNotify } from './NotificationProvider'
import RewardModal from './RewardModal'
import { contentPhrase, planInterval, planTitle } from '../lib/contentNames'
import { useTranslate } from '../lib/i18n'
import {
  useCancelSubscription,
  useSetAutoRenew,
  useStartSubscriptionCheckout,
  useSubscriptionStatus,
} from '../hooks/useShop'
import { colors, fonts, radii, shadows, spacing } from '../theme'

const PLAN_ICONS = {
  monthly: Calendar,
  yearly: Star,
  family: Users,
}

function money(cents) {
  return `$${(cents / 100).toFixed(cents % 100 === 0 ? 0 : 2)}`
}

function formatDate(value) {
  return new Date(value).toLocaleDateString(undefined, {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  })
}

/**
 * The whole plans section: current-plan card, its management controls, and the
 * list of plans to buy or switch to. Mirrors the web Store's plan half so the
 * two products behave the same, including cancelling being one-way.
 */
export default function PlanManager({ plans = [] }) {
  const notify = useNotify()
  const router = useRouter()
  const t = useTranslate()

  const [celebration, setCelebration] = useState(null)
  const [confirmCancel, setConfirmCancel] = useState(false)
  const [pendingPlanKey, setPendingPlanKey] = useState(null)

  const statusQuery = useSubscriptionStatus()
  const subscription = statusQuery.data?.subscription ?? null
  const lapsed = statusQuery.data?.lapsed ?? null

  const isFamilyMember = subscription?.isFamilyMember === true
  const activePlanKey =
    subscription?.status === 'active' || subscription?.status === 'trialing'
      ? subscription.planKey
      : null

  const autoRenewOn = subscription?.autoRenew === true
  const cancelScheduled = subscription?.cancelAtPeriodEnd === true
  // Deliberately cancelled, as opposed to just having auto-renew switched off.
  // Final: every management control disappears and coming back means buying a
  // plan again.
  const planCanceled = subscription?.canceled === true
  const canManagePlan = !isFamilyMember && subscription?.manageable === true && !planCanceled
  const canRenewSoon = !isFamilyMember && subscription?.renewalPromptDue === true
  const daysRemaining = subscription?.daysRemaining ?? null

  const findPlan = (key) => plans.find((plan) => plan.key === key)
  const currentPlanTitle = activePlanKey
    ? (planTitle(t, findPlan(activePlanKey)) || activePlanKey)
    : null

  // Each hook owns the entitlement refresh — a plan change moves the heart cap
  // and the gem bonus as well as the plan itself — and its own failure message.
  const startCheckout = useStartSubscriptionCheckout()
  const autoRenew = useSetAutoRenew()
  const cancel = useCancelSubscription()

  const busy = startCheckout.isPending || autoRenew.isPending || cancel.isPending

  /**
   * Starts a checkout and celebrates the plan by name afterwards. The naming is
   * why this stays here: the hook knows a plan was activated, but only this
   * component has the catalogue that turns a key into a title.
   */
  const buyPlan = (planKey) =>
    startCheckout.mutate(planKey, {
      onSuccess: (result) => {
        if (result?.cancelled) return
        if (result?.status === 'activated' || result?.status === 'already_active') {
          setCelebration(findPlan(result.planKey)?.title ?? 'Premium')
        } else {
          notify.info(t('m_shop_not_completed'))
        }
      },
    })

  const choosePlan = (planKey) => {
    // Buying while already subscribed is a switch, and the learner should know
    // the current plan is replaced before Stripe takes over the screen.
    if (activePlanKey && activePlanKey !== planKey) setPendingPlanKey(planKey)
    else buyPlan(planKey)
  }

  return (
    <>
      {!activePlanKey && lapsed ? (
        <View style={styles.lapsed}>
          <View style={styles.noticeRow}>
            <TriangleAlert size={16} color={colors.warning[600]} strokeWidth={2.4} />
            <Text style={styles.lapsedTitle}>
              {t('m_plan_expired', { plan: planTitle(t, findPlan(lapsed.planKey)) || lapsed.planKey })}
            </Text>
          </View>
          <Text style={styles.lapsedBody}>
            {lapsed.endedAt
              ? t('m_plan_ended_on', { date: formatDate(lapsed.endedAt) })
              : t('m_plan_renew_back')}
          </Text>
          {lapsed.wasFamilyOwner && lapsed.affectedMembers > 0 ? (
            <Text style={styles.lapsedBody}>
              {t('m_plan_fam_lost', { n: lapsed.affectedMembers })}
            </Text>
          ) : null}
          <Button
            label={t('m_plan_renew')}
            onPress={() => buyPlan(lapsed.planKey)}
            loading={startCheckout.isPending}
            disabled={busy}
            style={styles.lapsedAction}
          />
        </View>
      ) : null}

      {/* Someone on no plan is still on a plan: the free one. Showing nothing
          here left the section opening straight into a wall of prices, with no
          answer to "what am I on right now?". */}
      {!activePlanKey && !statusQuery.isPending ? (
        <View style={styles.current}>
          <View style={styles.currentHead}>
            <View style={styles.currentCopy}>
              <Text style={styles.currentLabel}>{t('m_plan_current')}</Text>
              <Text style={styles.currentPlan} numberOfLines={1}>
                {t('m_plan_free')}
              </Text>
            </View>
            <View style={styles.freeBadge}>
              <Text style={styles.freeBadgeText}>{t('m_plan_free')}</Text>
            </View>
          </View>

          <Text style={styles.currentMeta}>
            {t('m_plan_free_body')}
          </Text>
        </View>
      ) : null}

      {activePlanKey ? (
        <View style={styles.current}>
          <View style={styles.currentHead}>
            <View style={styles.currentCopy}>
              <Text style={styles.currentLabel}>{t('m_plan_current')}</Text>
              <Text style={styles.currentPlan} numberOfLines={1}>
                {currentPlanTitle}
              </Text>
            </View>
            <View style={styles.activeBadge}>
              <Text style={styles.activeBadgeText}>{t('m_plan_active')}</Text>
            </View>
          </View>

          {isFamilyMember ? (
            <Text style={styles.currentMeta}>
              {t('m_plan_via_family', { name: subscription.familyOwnerName })}
            </Text>
          ) : subscription.currentPeriodEnd ? (
            <Text style={styles.currentMeta}>
              {/* The same date means two different things depending on the
                  auto-renew flag: the next charge, or the day access stops. */}
              {cancelScheduled
                ? t('m_plan_ends_on', { date: formatDate(subscription.currentPeriodEnd) })
                : t('m_plan_renews_on', { date: formatDate(subscription.currentPeriodEnd) })}
            </Text>
          ) : null}

          {/* The owner of a Family plan has people to add, so the plan card is
              where that lives. A member gets the same link, because leaving is
              the one control they have. */}
          {activePlanKey === 'family' || isFamilyMember ? (
            <Pressable
              accessibilityRole="button"
              accessibilityLabel="Manage your family plan"
              onPress={() => router.push('/family')}
              style={({ pressed }) => [styles.manageFamily, pressed && styles.renewRowPressed]}
            >
              <Users size={17} color={colors.primary[600]} strokeWidth={2.3} />
              <Text style={styles.manageFamilyLabel}>
                {isFamilyMember ? t('m_plan_your_fam') : t('m_plan_manage_fam')}
              </Text>
              <ChevronRight size={17} color={colors.primary[400]} strokeWidth={2.2} />
            </Pressable>
          ) : null}

          {canManagePlan ? (
            <Pressable
              onPress={() => !busy && autoRenew.mutate(!autoRenewOn)}
              accessibilityRole="switch"
              accessibilityState={{ checked: autoRenewOn, disabled: busy }}
              accessibilityLabel="Auto-renew"
              style={({ pressed }) => [styles.renewRow, pressed && styles.renewRowPressed]}
            >
              <View style={styles.renewCopy}>
                <Text style={styles.renewLabel}>{t('m_plan_autorenew')}</Text>
                <Text style={styles.renewHint}>
                  {autoRenewOn
                    ? t('m_plan_ar_on')
                    : t('m_plan_ar_off')}
                </Text>
              </View>
              {/* Hand-rolled rather than the platform Switch, so it matches the
                  web's pill and the app's own palette on both platforms. */}
              <View style={[styles.track, autoRenewOn && styles.trackOn, busy && styles.trackBusy]}>
                <View style={[styles.knob, autoRenewOn && styles.knobOn]} />
              </View>
            </Pressable>
          ) : null}

          {planCanceled ? (
            <View style={styles.noticeRow}>
              <TriangleAlert size={15} color={colors.primary[600]} strokeWidth={2.4} />
              <Text style={styles.notice}>
                {t('m_plan_cancelled')}
              </Text>
            </View>
          ) : cancelScheduled && daysRemaining != null ? (
            <View style={styles.noticeRow}>
              <TriangleAlert size={15} color={colors.primary[600]} strokeWidth={2.4} />
              <Text style={styles.notice}>
                {daysRemaining === 1
                  ? t('m_plan_day_left')
                  : t('m_plan_days_left', { n: daysRemaining })}
              </Text>
            </View>
          ) : null}

          {canRenewSoon ? (
            <Button
              label={t('m_plan_renew')}
              onPress={() => buyPlan(activePlanKey)}
              loading={startCheckout.isPending}
              disabled={busy}
              style={styles.manageAction}
            />
          ) : null}

          {/* No resume anywhere: cancelling is final, so the only way back is
              buying a plan again from the list below. */}
          {canManagePlan ? (
            <Button
              label={t('m_plan_cancel')}
              variant="outline"
              onPress={() => setConfirmCancel(true)}
              disabled={busy}
              style={styles.manageAction}
            />
          ) : null}
        </View>
      ) : null}

      {/* Family members ride on someone else's plan and have nothing to buy. */}
      {!isFamilyMember
        ? plans.map((plan) => {
            const Icon = PLAN_ICONS[plan.key] ?? Crown
            const isActive = activePlanKey === plan.key

            return (
              <View key={plan.key} style={[styles.card, isActive && styles.cardActive]}>
                <View style={styles.cardHead}>
                  <View style={styles.planIcon}>
                    <Icon size={16} color={colors.primary[600]} strokeWidth={2.3} />
                  </View>
                  {isActive ? (
                    <View style={styles.cardBadge}>
                      <Text style={styles.cardBadgeText}>{t('m_plan_current')}</Text>
                    </View>
                  ) : plan.badgeLabel ? (
                    <View style={styles.cardBadgeMuted}>
                      <Text style={styles.cardBadgeMutedText}>{contentPhrase(t, plan.badgeLabel)}</Text>
                    </View>
                  ) : null}
                </View>

                <Text style={styles.cardTitle}>{planTitle(t, plan)}</Text>
                <Text style={styles.price}>
                  {money(plan.amountCents)}
                  <Text style={styles.interval}>/{planInterval(t, plan.interval)}</Text>
                </Text>

                {plan.savingsLabel ? (
                  <View style={styles.savings}>
                    <Text style={styles.savingsText}>{contentPhrase(t, plan.savingsLabel)}</Text>
                  </View>
                ) : null}

                {plan.description ? <Text style={styles.cardBody}>{plan.description}</Text> : null}

                {(plan.features ?? []).map((feature) => (
                  <View key={feature} style={styles.featureRow}>
                    <Check size={14} color={colors.success[600]} strokeWidth={2.6} />
                    <Text style={styles.feature}>{contentPhrase(t, feature)}</Text>
                  </View>
                ))}

                <Button
                  label={
                    isActive
                      ? t('m_plan_cur_title')
                      : activePlanKey
                        ? t('m_plan_switch_to')
                        : t('m_plan_choose')
                  }
                  variant={isActive ? 'outline' : 'primary'}
                  onPress={() => choosePlan(plan.key)}
                  disabled={isActive || busy}
                  loading={startCheckout.isPending && startCheckout.variables === plan.key}
                  style={styles.planAction}
                />
              </View>
            )
          })
        : null}

      <ConfirmDialog
        visible={confirmCancel}
        title={t('m_plan_cx_title')}
        body={
          subscription?.currentPeriodEnd
            ? t('m_plan_cx_body', { date: formatDate(subscription.currentPeriodEnd) })
            : t('m_plan_cx_body2')
        }
        confirmLabel={t('m_plan_cx_yes')}
        cancelLabel={t('m_plan_cx_no')}
        destructive
        loading={cancel.isPending}
        onConfirm={() => cancel.mutate(undefined, { onSettled: () => setConfirmCancel(false) })}
        onCancel={() => setConfirmCancel(false)}
      />

      <ConfirmDialog
        visible={pendingPlanKey !== null}
        title={t('m_plan_sw_title')}
        body={t('m_plan_sw_body', {
          current: currentPlanTitle ?? '',
          next: planTitle(t, findPlan(pendingPlanKey)),
        })}
        confirmLabel={t('m_plan_sw_yes')}
        cancelLabel={t('m_cancel')}
        onConfirm={() => {
          const key = pendingPlanKey
          setPendingPlanKey(null)
          buyPlan(key)
        }}
        onCancel={() => setPendingPlanKey(null)}
      />

      <RewardModal
        visible={celebration !== null}
        title={t('m_plan_unlocked', { plan: celebration ?? '' })}
        subtitle={t('m_plan_unlocked_b')}
        actionLabel={t('m_plan_lets_go')}
        onClose={() => setCelebration(null)}
      />
    </>
  )
}

const styles = StyleSheet.create({
  lapsed: {
    backgroundColor: colors.warning[50],
    borderRadius: radii.xl,
    borderWidth: 1,
    borderColor: colors.warning[300],
    padding: spacing.md,
    marginBottom: spacing.md,
  },
  lapsedTitle: {
    fontFamily: fonts.display,
    fontSize: 16,
    color: colors.secondary[900],
    flexShrink: 1,
  },
  lapsedBody: {
    fontFamily: fonts.body,
    fontSize: 13,
    lineHeight: 19,
    color: colors.secondary[500],
    marginTop: 4,
  },
  lapsedAction: {
    marginTop: spacing.md,
  },
  current: {
    backgroundColor: colors.white,
    borderRadius: radii.xl,
    padding: spacing.md,
    marginBottom: spacing.md,
    ...shadows.card,
  },
  currentHead: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: spacing.sm,
  },
  currentCopy: {
    flexShrink: 1,
  },
  currentLabel: {
    fontFamily: fonts.bodyBold,
    fontSize: 10.5,
    letterSpacing: 1,
    color: colors.secondary[400],
  },
  currentPlan: {
    fontFamily: fonts.display,
    fontSize: 18,
    color: colors.secondary[900],
    marginTop: 1,
  },
  activeBadge: {
    backgroundColor: colors.primary[100],
    borderRadius: radii.pill,
    paddingHorizontal: spacing.sm,
    paddingVertical: 4,
  },
  activeBadgeText: {
    fontFamily: fonts.bodyBold,
    fontSize: 11,
    color: colors.primary[600],
  },
  freeBadge: {
    backgroundColor: colors.secondary[100],
    borderRadius: radii.pill,
    paddingHorizontal: spacing.sm,
    paddingVertical: 4,
  },
  freeBadgeText: {
    fontFamily: fonts.bodyBold,
    fontSize: 11,
    color: colors.secondary[600],
  },
  currentMeta: {
    fontFamily: fonts.body,
    fontSize: 13,
    color: colors.secondary[400],
    marginTop: 6,
  },
  renewRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    backgroundColor: colors.secondary[50],
    borderRadius: radii.lg,
    padding: spacing.sm,
    marginTop: spacing.md,
  },
  renewRowPressed: {
    opacity: 0.75,
  },
  manageFamily: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    backgroundColor: colors.primary[50],
    borderRadius: radii.lg,
    paddingHorizontal: spacing.md,
    paddingVertical: 13,
    marginTop: spacing.md,
  },
  manageFamilyLabel: {
    flex: 1,
    fontFamily: fonts.bodyBold,
    fontSize: 14,
    color: colors.primary[700],
  },
  renewCopy: {
    flex: 1,
  },
  renewLabel: {
    fontFamily: fonts.bodyBold,
    fontSize: 14,
    color: colors.secondary[900],
  },
  renewHint: {
    fontFamily: fonts.body,
    fontSize: 12,
    lineHeight: 17,
    color: colors.secondary[400],
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
  trackBusy: {
    opacity: 0.5,
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
  noticeRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 6,
    marginTop: spacing.sm,
  },
  notice: {
    fontFamily: fonts.bodySemi,
    fontSize: 13,
    lineHeight: 18,
    color: colors.primary[600],
    flexShrink: 1,
  },
  manageAction: {
    marginTop: spacing.sm,
  },
  card: {
    backgroundColor: colors.white,
    borderRadius: radii.xl,
    padding: spacing.md,
    marginBottom: spacing.sm,
    ...shadows.card,
  },
  cardActive: {
    borderWidth: 2,
    borderColor: colors.primary[300],
  },
  cardHead: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  planIcon: {
    width: 34,
    height: 34,
    borderRadius: radii.pill,
    backgroundColor: colors.primary[100],
    alignItems: 'center',
    justifyContent: 'center',
  },
  cardBadge: {
    backgroundColor: colors.primary[500],
    borderRadius: radii.pill,
    paddingHorizontal: spacing.sm,
    paddingVertical: 4,
  },
  cardBadgeText: {
    fontFamily: fonts.bodyBold,
    fontSize: 10,
    letterSpacing: 0.6,
    color: colors.white,
  },
  cardBadgeMuted: {
    backgroundColor: colors.secondary[100],
    borderRadius: radii.pill,
    paddingHorizontal: spacing.sm,
    paddingVertical: 4,
  },
  cardBadgeMutedText: {
    fontFamily: fonts.bodyBold,
    fontSize: 10,
    letterSpacing: 0.6,
    color: colors.secondary[600],
  },
  cardTitle: {
    fontFamily: fonts.display,
    fontSize: 17,
    color: colors.secondary[900],
    marginTop: spacing.sm,
  },
  price: {
    fontFamily: fonts.display,
    fontSize: 22,
    color: colors.secondary[900],
    marginTop: 1,
  },
  interval: {
    fontFamily: fonts.body,
    fontSize: 13,
    color: colors.secondary[400],
  },
  savings: {
    alignSelf: 'flex-start',
    backgroundColor: colors.success[50],
    borderRadius: radii.pill,
    paddingHorizontal: spacing.sm,
    paddingVertical: 3,
    marginTop: 6,
  },
  savingsText: {
    fontFamily: fonts.bodyBold,
    fontSize: 11,
    color: colors.success[600],
  },
  cardBody: {
    fontFamily: fonts.body,
    fontSize: 13,
    lineHeight: 19,
    color: colors.secondary[400],
    marginTop: 6,
  },
  featureRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginTop: 5,
  },
  feature: {
    fontFamily: fonts.body,
    fontSize: 13,
    color: colors.secondary[600],
    flexShrink: 1,
  },
  planAction: {
    marginTop: spacing.md,
  },
})
