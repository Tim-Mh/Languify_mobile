import { useState } from 'react'
import { ActivityIndicator, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native'
import { useSafeAreaInsets } from 'react-native-safe-area-context'
import Animated, { FadeInDown } from 'react-native-reanimated'
import Gem from 'lucide-react-native/icons/gem'
import Heart from 'lucide-react-native/icons/heart'

import ConfirmDialog from '@/components/ConfirmDialog'
import { useNotify } from '@/components/NotificationProvider'
import PlanManager from '@/components/PlanManager'
import QueryState from '@/components/QueryState'
import RewardModal from '@/components/RewardModal'
import { ShopSkeleton } from '@/components/Skeleton'
import { TAB_BAR_OVERHANG } from '@/components/TabBar'
import { useGameState } from '@/hooks/useGame'
import { useBuyGemPack, useRefillHearts, useShopCatalog } from '@/hooks/useShop'
import { contentPhrase, gemPackTitle, heartTierTitle } from '@/lib/contentNames'
import { useTranslate } from '@/lib/i18n'
import { useRefresh } from '@/lib/useRefresh'
import { useLayout } from '@/lib/responsive'
import { sounds } from '@/lib/sounds'
import { colors, fonts, radii, shadows, spacing } from '@/theme'

function money(cents) {
  return `$${(cents / 100).toFixed(2)}`
}

export default function Shop() {
  const insets = useSafeAreaInsets()
  const refreshControl = useRefresh()
  const notify = useNotify()
  const t = useTranslate()
  const { contentWidth, size } = useLayout()

  const query = useShopCatalog()
  const { data: state } = useGameState()

  const [celebration, setCelebration] = useState(null)
  /** The heart tier awaiting confirmation — gems are spent, so it is asked first. */
  const [pendingTier, setPendingTier] = useState(null)

  // Both hooks own the checkout, the verification and the cache refresh. What
  // is left here is the celebration, which names the pack or the tier and so
  // could only ever be written at the call site.
  const buyGems = useBuyGemPack()
  const buyHearts = useRefillHearts()

  const celebrateGems = (result) => {
    if (result?.cancelled) return

    if (result?.status === 'completed' || result?.status === 'already_completed') {
      sounds.complete()
      setCelebration({
        title: t('m_shop_gems_added'),
        subtitle: t('m_shop_gems_added_s', { pack: gemPackTitle(t, result.pack) }),
        rewards: [
          { kind: 'gems', value: `+${result.pack?.gems ?? 0}`, label: t('m_gems') },
          ...(result.gems != null
            ? [{ kind: 'badge', value: result.gems, label: t('m_shop_new_balance') }]
            : []),
        ],
      })
      return
    }

    notify.info(t('m_shop_not_completed'))
  }

  const celebrateHearts = (tier) => () => {
    sounds.complete()
    setCelebration({
      title: t('m_shop_hearts_done'),
      subtitle: t('m_shop_hearts_sub'),
      rewards: [
        { kind: 'badge', value: `+${tier.hearts}`, label: tier.hearts === 1 ? 'Heart' : 'Hearts' },
        { kind: 'gems', value: `-${tier.priceGems}`, label: t('m_shop_gems_spent') },
      ],
    })
  }

  const gems = state?.gems ?? 0

  return (
    <ScrollView
      style={styles.screen}
      refreshControl={refreshControl}
      contentContainerStyle={[
        styles.content,
        { paddingTop: insets.top + spacing.lg, width: contentWidth, alignSelf: 'center' },
      ]}
    >
      <View style={styles.headerRow}>
        <Text style={[styles.heading, { fontSize: size(26) }]}>{t('m_shop_title')}</Text>
        <View style={styles.balance}>
          <Gem size={15} color={colors.accent[500]} strokeWidth={2.3} />
          <Text style={styles.balanceValue}>{state?.gems ?? '–'}</Text>
        </View>
      </View>

      <QueryState
        query={query}
        skeleton={<ShopSkeleton count={3} />}
        errorTitle={t('m_shop_error')}
        inline
      >
        {/* Function form, because everything below reads the catalog. As plain
            children this is built before QueryState can decide to show the
            skeleton, and throws while data is still undefined. */}
        {(catalog) => (
          <>
            <Text style={styles.sectionLabel}>{t('m_shop_plans')}</Text>
            <PlanManager plans={catalog.subscriptionPlans ?? []} />

            <Text style={styles.sectionLabel}>{t('m_shop_gems')}</Text>
            {/* One compact row per pack with the price as a tappable pill,
                matching the refill rows on the Hearts screen. A full-width
                stacked card per pack turned a five-item list into five screens
                of scrolling, and the two screens sold the same things in two
                different shapes. */}
            {(catalog.gemPacks ?? []).map((pack, index) => {
              const busy = buyGems.isPending && buyGems.variables?.key === pack.key

              return (
                <Animated.View
                  key={pack.key}
                  entering={FadeInDown.delay(index * 50).duration(280)}
                  style={[styles.row, pack.badgeLabel && styles.rowFeatured]}
                >
                  <View style={styles.gemIcon}>
                    <Gem size={19} color={colors.accent[600]} strokeWidth={2.2} />
                  </View>

                  <View style={styles.rowCopy}>
                    <Text style={styles.rowTitle} numberOfLines={1}>
                      {gemPackTitle(t, pack)}
                    </Text>
                    <Text style={styles.rowSub} numberOfLines={1}>
                      {pack.badgeLabel
                        ? `${t('m_shop_gems_count', { n: pack.gems })} · ${contentPhrase(t, pack.badgeLabel)}`
                        : (pack.description ?? t('m_shop_gems_count', { n: pack.gems }))}
                    </Text>
                  </View>

                  <Pressable
                    accessibilityRole="button"
                    accessibilityLabel={`${pack.title} for ${money(pack.amountCents)}`}
                    disabled={buyGems.isPending}
                    onPress={() => {
                      sounds.click()
                      buyGems.mutate(pack, { onSuccess: celebrateGems })
                    }}
                    style={({ pressed }) => [
                      styles.buy,
                      buyGems.isPending && styles.buyInert,
                      pressed && styles.pressed,
                    ]}
                  >
                    {busy ? (
                      <ActivityIndicator color={colors.white} size="small" />
                    ) : (
                      <Text style={styles.buyPrice}>{money(pack.amountCents)}</Text>
                    )}
                  </Pressable>
                </Animated.View>
              )
            })}

            <Text style={styles.sectionLabel}>{t('m_shop_refills')}</Text>
            {/* Identical rows to the Hearts screen's, down to the gem pill and
                its short-of-gems colour, because they are the same purchase. */}
            {(catalog.heartRefillTiers ?? []).map((tier, index) => {
              const busy = buyHearts.isPending && buyHearts.variables?.key === tier.key
              const short = gems < tier.priceGems

              return (
                <Animated.View
                  key={tier.key}
                  entering={FadeInDown.delay(index * 50).duration(280)}
                  style={[styles.row, tier.badgeLabel && styles.rowFeatured]}
                >
                  <View style={styles.heartIcon}>
                    <Heart size={19} color={colors.danger[500]} strokeWidth={2.2} fill={colors.danger[500]} />
                  </View>

                  <View style={styles.rowCopy}>
                    <Text style={styles.rowTitle} numberOfLines={1}>
                      {heartTierTitle(t, tier)}
                    </Text>
                    {tier.subtitle || tier.badgeLabel ? (
                      <Text style={styles.rowSub} numberOfLines={1}>
                        {[tier.subtitle, tier.badgeLabel]
                          .filter(Boolean)
                          .map((phrase) => contentPhrase(t, phrase))
                          .join(' · ')}
                      </Text>
                    ) : null}
                  </View>

                  {/* Still tappable when gems are short: the backend's reply
                      names the reason, which beats a dead button. */}
                  <Pressable
                    accessibilityRole="button"
                    accessibilityLabel={`${tier.title} for ${tier.priceGems} gems`}
                    disabled={buyHearts.isPending}
                    onPress={() => {
                      sounds.click()
                      setPendingTier(tier)
                    }}
                    style={({ pressed }) => [
                      styles.buy,
                      buyHearts.isPending && styles.buyInert,
                      short && styles.buyShort,
                      pressed && styles.pressed,
                    ]}
                  >
                    {busy ? (
                      <ActivityIndicator color={colors.white} size="small" />
                    ) : (
                      <>
                        <Gem size={13} color={colors.white} strokeWidth={2.4} />
                        <Text style={styles.buyPrice}>{tier.priceGems}</Text>
                      </>
                    )}
                  </Pressable>
                </Animated.View>
              )
            })}
          </>
        )}
      </QueryState>

      {/* Spending gems is not reversible, so it is confirmed. Buying a pack is
          not — Stripe's own checkout is the confirmation there. */}
      <ConfirmDialog
        visible={pendingTier !== null}
        title={
          pendingTier?.hearts === 1
            ? t('m_shop_confirm_one')
            : t('m_shop_confirm_title', { n: pendingTier?.hearts ?? '' })
        }
        body={t('m_shop_confirm_body', { price: pendingTier?.priceGems ?? 0, balance: gems })}
        confirmLabel={t('m_shop_refill_now')}
        cancelLabel={t('m_not_now')}
        onConfirm={() => {
          const tier = pendingTier
          setPendingTier(null)
          if (tier) buyHearts.mutate(tier, { onSuccess: celebrateHearts(tier) })
        }}
        onCancel={() => setPendingTier(null)}
      />

      <RewardModal
        visible={celebration !== null}
        title={celebration?.title}
        subtitle={celebration?.subtitle}
        rewards={celebration?.rewards ?? []}
        actionLabel={t('m_nice')}
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
  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  heading: {
    fontFamily: fonts.display,
    color: colors.secondary[900],
  },
  balance: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    backgroundColor: colors.white,
    borderRadius: radii.pill,
    paddingHorizontal: spacing.md,
    paddingVertical: 8,
    ...shadows.card,
  },
  balanceValue: {
    fontFamily: fonts.display,
    fontSize: 15,
    color: colors.secondary[900],
  },
  sectionLabel: {
    fontFamily: fonts.bodyBold,
    fontSize: 12,
    letterSpacing: 1,
    color: colors.secondary[400],
    marginTop: spacing.xl,
    marginBottom: spacing.sm,
  },
  // Same row as the Hearts screen's refill tiers: icon, copy, price pill.
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    backgroundColor: colors.white,
    borderRadius: radii.lg,
    padding: spacing.md,
    marginBottom: spacing.sm,
    ...shadows.card,
  },
  rowFeatured: {
    borderWidth: 2,
    borderColor: colors.primary[200],
  },
  gemIcon: {
    width: 40,
    height: 40,
    borderRadius: radii.pill,
    backgroundColor: colors.accent[50],
    alignItems: 'center',
    justifyContent: 'center',
  },
  heartIcon: {
    width: 40,
    height: 40,
    borderRadius: radii.pill,
    backgroundColor: colors.danger[50],
    alignItems: 'center',
    justifyContent: 'center',
  },
  rowCopy: {
    flex: 1,
  },
  rowTitle: {
    fontFamily: fonts.display,
    fontSize: 15.5,
    color: colors.secondary[900],
  },
  rowSub: {
    fontFamily: fonts.body,
    fontSize: 12.5,
    color: colors.secondary[400],
    marginTop: 1,
  },
  buy: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 5,
    backgroundColor: colors.primary[500],
    borderRadius: radii.pill,
    paddingHorizontal: spacing.md,
    paddingVertical: 9,
    // Holds its width while the spinner is in it, so the row does not twitch
    // when a purchase starts.
    minWidth: 74,
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
  pressed: {
    opacity: 0.75,
  },
})
