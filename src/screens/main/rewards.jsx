import { useState } from 'react'
import { ScrollView, StyleSheet, Text, View } from 'react-native'
import { useSafeAreaInsets } from 'react-native-safe-area-context'
import Animated, { FadeInDown } from 'react-native-reanimated'
import Check from 'lucide-react-native/icons/check'
import Gem from 'lucide-react-native/icons/gem'
import Gift from 'lucide-react-native/icons/gift'
import Lock from 'lucide-react-native/icons/lock'
import Target from 'lucide-react-native/icons/target'
import Zap from 'lucide-react-native/icons/zap'

import Button from '@/components/Button'
import QueryState from '@/components/QueryState'
import RewardModal from '@/components/RewardModal'
import { ChestSkeleton, QuestSkeleton } from '@/components/Skeleton'
import { TAB_BAR_OVERHANG } from '@/components/TabBar'
import {
  useChestStatus,
  useClaimDailyChest,
  useClaimQuest,
  useTodaysQuests,
} from '@/hooks/useRewards'
import { questDescription, questTitle } from '@/lib/contentNames'
import { useTranslate } from '@/lib/i18n'
import { useRefresh } from '@/lib/useRefresh'
import { useLayout } from '@/lib/responsive'
import { colors, fonts, radii, shadows, spacing } from '@/theme'

/** "4h 20m" / "12m" — the chest cooldown, no ticking clock. */
function formatCooldown(totalSeconds) {
  if (!totalSeconds || totalSeconds <= 0) return 'now'
  const hours = Math.floor(totalSeconds / 3600)
  const minutes = Math.floor((totalSeconds % 3600) / 60)
  if (hours > 0) return `${hours}h ${minutes}m`
  return `${Math.max(1, minutes)}m`
}

export default function Rewards() {
  const insets = useSafeAreaInsets()
  const refreshControl = useRefresh()
  const t = useTranslate()
  const { contentWidth, size } = useLayout()

  const chestQuery = useChestStatus()
  const questsQuery = useTodaysQuests()

  const daily = chestQuery.data?.daily
  const quests = questsQuery.data ?? []
  const doneCount = quests.filter((quest) => quest.completed).length
  const unclaimed = quests.filter((quest) => quest.completed && !quest.claimed).length

  /** The reward popup, shared by the chest and the quests. */
  const [celebration, setCelebration] = useState(null)

  // The hooks own the cache refresh and the failure message. What is left at
  // the call site is the celebration, which is this screen's alone.
  const openChest = useClaimDailyChest()
  const collect = useClaimQuest()

  const celebrate = (title, subtitle) => (result) =>
    setCelebration({
      title,
      subtitle,
      rewards: [
        { kind: 'gems', value: `+${result?.gems ?? 0}`, label: t('m_gems') },
        ...(result?.xp ? [{ kind: 'xp', value: `+${result.xp}`, label: t('m_xp') }] : []),
      ],
    })

  return (
    <ScrollView
      style={styles.screen}
      refreshControl={refreshControl}
      contentContainerStyle={[
        styles.content,
        { paddingTop: insets.top + spacing.lg, width: contentWidth, alignSelf: 'center' },
      ]}
    >
      <Text style={[styles.heading, { fontSize: size(26) }]}>{t('m_rewards_head')}</Text>
      <Text style={styles.subheading}>
        {t('m_rewards_sub', { done: doneCount, total: quests.length || 0 })}
        {unclaimed > 0 ? t('m_rewards_sub_ready', { n: unclaimed }) : ''}
      </Text>

      <QueryState
        query={chestQuery}
        skeleton={<ChestSkeleton />}
        errorTitle={t('m_chest_error')}
        inline
      >
        <View style={styles.chestCard}>
          <View style={[styles.chestBadge, !daily?.available && styles.chestBadgeLocked]}>
            <Gift size={30} color={daily?.available ? colors.white : colors.secondary[300]} strokeWidth={2} />
          </View>

          <Text style={styles.chestTitle}>
            {daily?.available ? t('m_chest_ready') : t('m_chest_opened')}
          </Text>
          <Text style={styles.chestBody}>
            {daily?.available
              ? t('m_chest_ready_body')
              : t('m_chest_wait_body', { time: formatCooldown(daily?.cooldownSeconds) })}
          </Text>

          <Button
            label={daily?.available ? t('m_chest_open') : t('m_chest_not_ready')}
            onPress={() =>
              openChest.mutate(undefined, {
                onSuccess: celebrate(t('m_chest_opened_title'), t('m_chest_opened_sub')),
              })
            }
            loading={openChest.isPending}
            disabled={!daily?.available}
            style={styles.chestAction}
          />
        </View>
      </QueryState>

      <Text style={styles.sectionLabel}>{t('m_quests_heading')}</Text>

      <QueryState
        query={questsQuery}
        skeleton={<QuestSkeleton count={3} />}
        errorTitle={t('m_quests_error')}
        isEmpty={(data) => (data?.length ?? 0) === 0}
        emptyTitle={t('m_quests_empty')}
        emptyBody={t('m_quests_empty_body')}
        inline
      >
        {(list) =>
          list.map((quest, index) => {
            const target = quest.targetCount ?? 1
            const progress = Math.min(quest.progress ?? 0, target)
            const percent = Math.round((progress / Math.max(1, target)) * 100)
            const ready = quest.completed && !quest.claimed

            return (
              <Animated.View
                key={quest.id}
                entering={FadeInDown.delay(index * 60).duration(300)}
                style={[
                  styles.questCard,
                  ready && styles.questCardReady,
                  quest.claimed && styles.questCardDone,
                ]}
              >
                <View style={styles.questHead}>
                  <View style={[styles.questIcon, quest.claimed && styles.questIconDone]}>
                    {quest.claimed ? (
                      <Check size={18} color={colors.success[600]} strokeWidth={2.8} />
                    ) : (
                      <Target size={18} color={colors.primary[500]} strokeWidth={2.2} />
                    )}
                  </View>

                  <View style={styles.questCopy}>
                    <Text style={styles.questTitle} numberOfLines={1}>
                      {questTitle(t, quest)}
                    </Text>
                    <Text style={styles.questDesc} numberOfLines={2}>
                      {questDescription(t, quest)}
                    </Text>
                  </View>

                  {/* What the quest actually pays. The API has sent this all
                      along and the screen never showed it, which made every
                      quest look equally worth doing. */}
                  <View style={styles.payout}>
                    {quest.gemsReward ? (
                      <View style={styles.payChip}>
                        <Gem size={11} color={colors.accent[600]} strokeWidth={2.4} />
                        <Text style={styles.payText}>{quest.gemsReward}</Text>
                      </View>
                    ) : null}
                    {quest.xpReward ? (
                      <View style={[styles.payChip, styles.payChipXp]}>
                        <Zap size={11} color={colors.warning[600]} strokeWidth={2.4} fill={colors.warning[600]} />
                        <Text style={[styles.payText, styles.payTextXp]}>{quest.xpReward}</Text>
                      </View>
                    ) : null}
                  </View>
                </View>

                <View style={styles.trackRow}>
                  <View style={styles.track}>
                    <View
                      style={[
                        styles.fill,
                        { width: `${Math.max(3, percent)}%` },
                        quest.completed && styles.fillDone,
                      ]}
                    />
                  </View>
                  <Text style={styles.count}>
                    {progress}/{target}
                  </Text>
                </View>

                {ready ? (
                  <Button
                    label={t('m_quest_collect_reward')}
                    onPress={() =>
                      collect.mutate(quest.id, {
                        onSuccess: celebrate(t('m_quest_done_title'), t('m_quest_done_sub')),
                      })
                    }
                    loading={collect.isPending && collect.variables === quest.id}
                    style={styles.collect}
                  />
                ) : null}
              </Animated.View>
            )
          })
        }
      </QueryState>

      {chestQuery.data?.streak?.unclaimedMilestone ? (
        <View style={styles.milestone}>
          <Lock size={16} color={colors.warning[600]} strokeWidth={2.2} />
          <Text style={styles.milestoneText}>
            {t('m_milestone_note')}
          </Text>
        </View>
      ) : null}

      <RewardModal
        visible={celebration !== null}
        title={celebration?.title}
        subtitle={celebration?.subtitle}
        rewards={celebration?.rewards ?? []}
        onClose={() => setCelebration(null)}
      />
    </ScrollView>
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
  heading: {
    fontFamily: fonts.display,
    color: colors.secondary[900],
  },
  subheading: {
    fontFamily: fonts.bodySemi,
    fontSize: 13,
    color: colors.secondary[400],
    marginTop: 3,
    marginBottom: spacing.lg,
  },
  chestCard: {
    backgroundColor: colors.white,
    borderRadius: radii.xl,
    padding: spacing.lg,
    alignItems: 'center',
    ...shadows.card,
  },
  chestBadge: {
    width: 68,
    height: 68,
    borderRadius: radii.pill,
    backgroundColor: colors.primary[500],
    alignItems: 'center',
    justifyContent: 'center',
  },
  chestBadgeLocked: {
    backgroundColor: colors.secondary[100],
  },
  chestTitle: {
    fontFamily: fonts.display,
    fontSize: 18,
    color: colors.secondary[900],
    marginTop: spacing.md,
    textAlign: 'center',
  },
  chestBody: {
    fontFamily: fonts.body,
    fontSize: 14,
    lineHeight: 20,
    color: colors.secondary[500],
    marginTop: 4,
    textAlign: 'center',
  },
  chestAction: {
    alignSelf: 'stretch',
    marginTop: spacing.lg,
  },
  sectionLabel: {
    fontFamily: fonts.bodyBold,
    fontSize: 12,
    letterSpacing: 1,
    color: colors.secondary[400],
    marginTop: spacing.xl,
    marginBottom: spacing.sm,
  },
  questCard: {
    backgroundColor: colors.white,
    borderRadius: radii.xl,
    padding: spacing.md,
    marginBottom: spacing.sm,
    ...shadows.card,
  },
  // A quest with a reward waiting is the only thing on this screen worth
  // tapping, so it is the only thing that draws a border.
  questCardReady: {
    borderWidth: 2,
    borderColor: colors.primary[300],
  },
  // Collected and finished with. It keeps its place in the list so the day's
  // progress is still readable, but drops the lift: a card raised off the page
  // reads as something still to be done.
  questCardDone: {
    shadowOpacity: 0,
    elevation: 0,
  },
  questIconDone: {
    backgroundColor: colors.success[50],
  },
  questDesc: {
    fontFamily: fonts.body,
    fontSize: 12.5,
    color: colors.secondary[400],
    marginTop: 1,
  },
  payout: {
    alignItems: 'flex-end',
    gap: 4,
  },
  payChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 3,
    backgroundColor: colors.accent[50],
    borderRadius: radii.pill,
    paddingHorizontal: 7,
    paddingVertical: 3,
  },
  payChipXp: {
    backgroundColor: colors.warning[50],
  },
  payText: {
    fontFamily: fonts.bodyBold,
    fontSize: 11,
    color: colors.accent[700],
  },
  payTextXp: {
    color: colors.warning[700],
  },
  trackRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    marginTop: spacing.sm,
  },
  count: {
    fontFamily: fonts.bodyBold,
    fontSize: 11.5,
    color: colors.secondary[400],
    minWidth: 34,
    textAlign: 'right',
  },
  fillDone: {
    backgroundColor: colors.success[500],
  },
  questHead: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
  },
  questIcon: {
    width: 36,
    height: 36,
    borderRadius: radii.pill,
    backgroundColor: colors.secondary[50],
    alignItems: 'center',
    justifyContent: 'center',
  },
  questCopy: {
    flex: 1,
  },
  questTitle: {
    fontFamily: fonts.bodyBold,
    fontSize: 15,
    color: colors.secondary[900],
  },
  questProgress: {
    fontFamily: fonts.body,
    fontSize: 13,
    color: colors.secondary[400],
    marginTop: 1,
  },
  collect: {
    marginTop: spacing.md,
  },
  claimed: {
    fontFamily: fonts.bodyBold,
    fontSize: 13,
    color: colors.success[600],
  },
  track: {
    flex: 1,
    height: 8,
    borderRadius: radii.pill,
    backgroundColor: colors.secondary[100],
    overflow: 'hidden',
  },
  fill: {
    height: '100%',
    borderRadius: radii.pill,
    backgroundColor: colors.primary[500],
  },
  milestone: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    backgroundColor: colors.warning[50],
    borderWidth: 2,
    borderColor: colors.warning[300],
    borderRadius: radii.lg,
    padding: spacing.md,
    marginTop: spacing.lg,
  },
  milestoneText: {
    flex: 1,
    fontFamily: fonts.bodySemi,
    fontSize: 13,
    lineHeight: 18,
    color: colors.warning[700],
  },
})
