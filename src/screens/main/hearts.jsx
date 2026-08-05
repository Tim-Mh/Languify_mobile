import { useEffect, useState } from 'react'
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native'
import { useSafeAreaInsets } from 'react-native-safe-area-context'
import { useRouter } from '@/navigation'
import { useQueryClient } from '@tanstack/react-query'
import Animated, { FadeInDown } from 'react-native-reanimated'
import ChevronLeft from 'lucide-react-native/icons/chevron-left'
import Gem from 'lucide-react-native/icons/gem'
import Heart from 'lucide-react-native/icons/heart'
import InfinityIcon from 'lucide-react-native/icons/infinity'
import Info from 'lucide-react-native/icons/info'

import { useNotify } from '@/components/NotificationProvider'
import QueryState from '@/components/QueryState'
import { ShopSkeleton } from '@/components/Skeleton'
import { TAB_BAR_OVERHANG } from '@/components/TabBar'
import { useGameState } from '@/hooks/useGame'
import { useRefillHearts, useShopCatalog } from '@/hooks/useShop'
import { queryKeys } from '@/hooks/keys'
import { useRefresh } from '@/lib/useRefresh'
import { useGoBack } from '@/lib/useGoBack'
import { useTranslate } from '@/lib/i18n'
import { useLayout } from '@/lib/responsive'
import { colors, fonts, radii, shadows, spacing } from '@/theme'

/** A heart comes back every 15 minutes, so the countdown is always under an hour. */
function clock(seconds) {
  const safe = Math.max(0, seconds)
  const minutes = Math.floor(safe / 60)
  const rest = safe % 60
  return `${minutes}:${String(rest).padStart(2, '0')}`
}

/**
 * Counts a server-provided number of seconds down locally, and tells the caller
 * once when it reaches zero so the real state can be refetched. Ticking in the
 * client rather than polling keeps this to one request per refill.
 */
function useCountdown(seconds, onDone) {
  const [left, setLeft] = useState(seconds ?? 0)

  useEffect(() => {
    setLeft(seconds ?? 0)
  }, [seconds])

  useEffect(() => {
    if (!left) return undefined

    const id = setInterval(() => {
      setLeft((value) => {
        if (value <= 1) {
          clearInterval(id)
          onDone?.()
          return 0
        }
        return value - 1
      })
    }, 1000)

    return () => clearInterval(id)
    // onDone is a stable callback from the caller; re-subscribing on every tick
    // would restart the interval and the clock would never move.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [left > 0])

  return left
}

export default function Hearts() {
  const insets = useSafeAreaInsets()
  const refreshControl = useRefresh()
  const router = useRouter()
  const goBack = useGoBack('/home')
  const notify = useNotify()
  const queryClient = useQueryClient()
  const t = useTranslate()
  const { contentWidth, size } = useLayout()

  const stateQuery = useGameState()
  const catalogQuery = useShopCatalog()

  const state = stateQuery.data
  // The countdowns below refetch when they reach zero, which is a plain cache
  // read rather than anything the hooks layer owns.
  const refreshState = () => queryClient.invalidateQueries({ queryKey: queryKeys.gameState })

  const regenLeft = useCountdown(state?.heartsRegenSecondsRemaining, refreshState)
  const infiniteLeft = useCountdown(state?.infiniteHeartsSecondsRemaining, refreshState)

  const refill = useRefillHearts()

  const unlimited = state?.infiniteHeartsActive === true
  const full = state?.maxHearts != null && state?.hearts >= state.maxHearts
  // A Family plan reports no cap at all, so there is nothing to refill.
  const uncapped = state != null && state.maxHearts == null

  return (
    <View style={styles.screen}>
      <View style={[styles.header, { paddingTop: insets.top + spacing.sm }]}>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Go back"
          onPress={goBack}
          hitSlop={10}
          style={({ pressed }) => [styles.back, pressed && styles.pressed]}
        >
          <ChevronLeft size={22} color={colors.secondary[600]} strokeWidth={2.4} />
        </Pressable>

        <Text style={[styles.headerTitle, { fontSize: size(19) }]} numberOfLines={1}>
          Hearts
        </Text>

        <View style={styles.balance}>
          <Gem size={14} color={colors.accent[500]} strokeWidth={2.3} />
          <Text style={styles.balanceValue}>{state?.gems ?? '–'}</Text>
        </View>
      </View>

      <ScrollView
        style={styles.scroll}
        refreshControl={refreshControl}
        contentContainerStyle={[
          styles.content,
          // Clears the tab bar's raised centre button, which overhangs the scene.
          { width: contentWidth, alignSelf: 'center', paddingBottom: spacing.xxl + TAB_BAR_OVERHANG },
        ]}
      >
        <Animated.View entering={FadeInDown.duration(300)} style={styles.statusCard}>
          {unlimited ? (
            <>
              <View style={styles.statusIcon}>
                <InfinityIcon size={30} color={colors.danger[500]} strokeWidth={2.2} />
              </View>
              <Text style={[styles.statusValue, { fontSize: size(26) }]}>{t('m_unlimited_hearts')}</Text>
              <Text style={styles.statusMeta}>
                {state?.infiniteHeartsPermanent
                  ? 'Your plan includes them, so you never run out.'
                  : `${clock(infiniteLeft)} left`}
              </Text>
            </>
          ) : (
            <>
              {/* A row of hearts only reads at the free tier's cap of five. The
                  subscriber cap is a hundred, where a hundred icons is noise. */}
              {state?.maxHearts != null && state.maxHearts <= 5 ? (
                <View style={styles.heartRow}>
                  {Array.from({ length: state.maxHearts }, (_, i) => (
                    <Heart
                      key={i}
                      size={size(28)}
                      color={colors.danger[500]}
                      fill={i < state.hearts ? colors.danger[500] : 'transparent'}
                      strokeWidth={2.2}
                    />
                  ))}
                </View>
              ) : (
                <View style={styles.statusIcon}>
                  <Heart
                    size={30}
                    color={colors.danger[500]}
                    fill={colors.danger[500]}
                    strokeWidth={2.2}
                  />
                </View>
              )}

              <Text style={[styles.statusValue, { fontSize: size(26) }]}>
                {state ? `${state.hearts}${uncapped ? '' : ` / ${state.maxHearts}`}` : '–'}
              </Text>

              <Text style={styles.statusMeta}>
                {full || uncapped
                  ? t('m_hearts_full')
                  : regenLeft > 0
                    ? t('m_hearts_next', { time: clock(regenLeft) })
                    : t('m_hearts_coming')}
              </Text>
            </>
          )}
        </Animated.View>

        {!unlimited && !uncapped ? (
          <>
            <Text style={styles.sectionLabel}>{t('m_hearts_refill')}</Text>

            <QueryState
              query={catalogQuery}
              skeleton={<ShopSkeleton count={3} />}
              errorTitle={t('m_hearts_opt_err')}
              inline
            >
              {/* Function form: everything below reads the catalog, and plain
                  children are built before QueryState can show the skeleton. */}
              {(catalog) =>
                (catalog.heartRefillTiers ?? []).map((tier, index) => {
                  const tooPoor = (state?.gems ?? 0) < tier.priceGems

                  return (
                    <Animated.View
                      key={tier.key}
                      entering={FadeInDown.delay(60 * (index + 1)).duration(300)}
                    >
                      <View style={styles.tier}>
                        <View style={styles.tierIcon}>
                          <Heart
                            size={19}
                            color={colors.danger[500]}
                            fill={colors.danger[500]}
                            strokeWidth={2.2}
                          />
                        </View>

                        <View style={styles.tierCopy}>
                          <Text style={styles.tierTitle} numberOfLines={1}>
                            {tier.title}
                          </Text>
                          {tier.subtitle ? (
                            <Text style={styles.tierSub} numberOfLines={1}>
                              {tier.subtitle}
                            </Text>
                          ) : null}
                        </View>

                        <Pressable
                          accessibilityRole="button"
                          accessibilityLabel={`${tier.title} for ${tier.priceGems} gems`}
                          disabled={full || refill.isPending}
                          onPress={() =>
                            // The hook owns the cache refresh and the error
                            // message; the confirmation is this screen's, since
                            // it names the number of hearts you ended up with.
                            refill.mutate(tier, {
                              onSuccess: (result) =>
                                notify.success(t('m_hearts_refilled', { n: result.hearts })),
                            })
                          }
                          style={({ pressed }) => [
                            styles.buy,
                            (full || refill.isPending) && styles.buyInert,
                            tooPoor && !full && styles.buyShort,
                            pressed && styles.pressed,
                          ]}
                        >
                          <Gem size={13} color={colors.white} strokeWidth={2.4} />
                          <Text style={styles.buyPrice}>{tier.priceGems}</Text>
                        </Pressable>
                      </View>
                    </Animated.View>
                  )
                })
              }
            </QueryState>

            {full ? (
              <Text style={styles.fullNote}>
                {t('m_hearts_nothing')}
              </Text>
            ) : null}
          </>
        ) : null}

        <View style={styles.about}>
          <Info size={17} color={colors.accent[700]} strokeWidth={2.2} />
          <Text style={styles.aboutText}>
            You lose a heart for a wrong answer and get one back every 15 minutes, up to{' '}
            {state?.maxHearts ?? 5}. Gems refill them instantly, and a plan raises the cap.
          </Text>
        </View>
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
    gap: spacing.sm,
    paddingHorizontal: spacing.lg,
    paddingBottom: spacing.sm,
  },
  back: {
    width: 40,
    height: 40,
    borderRadius: radii.pill,
    backgroundColor: colors.white,
    alignItems: 'center',
    justifyContent: 'center',
    ...shadows.card,
  },
  pressed: {
    opacity: 0.75,
  },
  headerTitle: {
    flex: 1,
    fontFamily: fonts.display,
    color: colors.secondary[900],
  },
  balance: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    backgroundColor: colors.white,
    borderRadius: radii.pill,
    paddingHorizontal: spacing.sm,
    paddingVertical: 7,
    ...shadows.card,
  },
  balanceValue: {
    fontFamily: fonts.display,
    fontSize: 14,
    color: colors.secondary[900],
  },
  scroll: {
    flex: 1,
  },
  content: {
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.sm,
  },
  statusCard: {
    alignItems: 'center',
    backgroundColor: colors.white,
    borderRadius: radii.xl,
    padding: spacing.lg,
    ...shadows.card,
  },
  statusIcon: {
    width: 58,
    height: 58,
    borderRadius: radii.pill,
    backgroundColor: colors.danger[50],
    alignItems: 'center',
    justifyContent: 'center',
  },
  heartRow: {
    flexDirection: 'row',
    gap: 6,
  },
  statusValue: {
    fontFamily: fonts.display,
    color: colors.secondary[900],
    marginTop: spacing.sm,
  },
  statusMeta: {
    fontFamily: fonts.bodySemi,
    fontSize: 13.5,
    color: colors.secondary[400],
    marginTop: 2,
    textAlign: 'center',
  },
  sectionLabel: {
    fontFamily: fonts.bodyBold,
    fontSize: 11,
    letterSpacing: 1,
    color: colors.secondary[400],
    marginTop: spacing.xl,
    marginBottom: spacing.sm,
  },
  tier: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    backgroundColor: colors.white,
    borderRadius: radii.lg,
    padding: spacing.md,
    marginBottom: spacing.sm,
    ...shadows.card,
  },
  tierIcon: {
    width: 40,
    height: 40,
    borderRadius: radii.pill,
    backgroundColor: colors.danger[50],
    alignItems: 'center',
    justifyContent: 'center',
  },
  tierCopy: {
    flex: 1,
  },
  tierTitle: {
    fontFamily: fonts.display,
    fontSize: 15.5,
    color: colors.secondary[900],
  },
  tierSub: {
    fontFamily: fonts.body,
    fontSize: 12.5,
    color: colors.secondary[400],
    marginTop: 1,
  },
  buy: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    backgroundColor: colors.primary[500],
    borderRadius: radii.pill,
    paddingHorizontal: spacing.md,
    paddingVertical: 9,
  },
  buyInert: {
    opacity: 0.45,
  },
  // Still tappable when gems are short: the backend's "not enough gems" reply
  // is a clearer answer than a dead button with no explanation.
  buyShort: {
    backgroundColor: colors.secondary[400],
  },
  buyPrice: {
    fontFamily: fonts.display,
    fontSize: 14,
    color: colors.white,
  },
  fullNote: {
    fontFamily: fonts.body,
    fontSize: 13,
    color: colors.secondary[400],
    textAlign: 'center',
    marginTop: spacing.xs,
  },
  about: {
    flexDirection: 'row',
    gap: spacing.sm,
    backgroundColor: colors.accent[50],
    borderRadius: radii.lg,
    padding: spacing.md,
    marginTop: spacing.xl,
  },
  aboutText: {
    flex: 1,
    fontFamily: fonts.body,
    fontSize: 13,
    lineHeight: 19,
    color: colors.accent[700],
  },
})
