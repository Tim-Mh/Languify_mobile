import { useEffect } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'

import * as shopApi from '../api/shop'
import * as subscriptionApi from '../api/subscription'
import { useAuth } from '../auth/AuthContext'
import { useCheckout } from '../components/CheckoutProvider'
import { useNotify } from '../components/NotificationProvider'
import { WEB_URL_OVERRIDE } from '../lib/env'
import {
  APPLE_IAP,
  appleAvailablePurchases,
  appleGemsProductId,
  appleSubProductId,
  buyWithApple,
  finalizeApplePurchase,
  loadApplePrices,
  onOrphanPurchase,
} from '../lib/iap'
import { useTranslate } from '../lib/i18n'
import { invalidateAll, queryKeys } from './keys'

/**
 * Stripe will not redirect to a custom app scheme, so checkout returns to the
 * web app's own store page. It is never loaded: the in-app checkout sheet
 * watches for this prefix and closes the moment it appears, handing back the
 * URL so the session id can be read off it.
 *
 * Read through `lib/env` rather than `process.env`. Metro inlined
 * `EXPO_PUBLIC_*` at bundle time under Expo; there is no such substitution
 * here, so the old expression was `undefined` in every build and quietly took
 * the production fallback — which is right in production and wrong the moment
 * anyone points a dev build at a local web app.
 */
const RETURN_BASE = WEB_URL_OVERRIDE ?? 'https://languify.us'
const SUCCESS_URL = `${RETURN_BASE}/store?checkout=success`
const CANCEL_URL = `${RETURN_BASE}/store?checkout=cancelled`

/** Stripe appends the session id to whichever URL it returns to. */
function sessionIdFrom(url) {
  const match = String(url ?? '').match(/[?&]session_id=([^&#]+)/)
  return match ? decodeURIComponent(match[1]) : null
}

export function useShopCatalog() {
  return useQuery({
    queryKey: queryKeys.shopCatalog,
    queryFn: shopApi.catalog,
  })
}

export function useSubscriptionStatus() {
  return useQuery({
    queryKey: queryKeys.subscriptionStatus,
    queryFn: subscriptionApi.status,
    staleTime: 5 * 60_000,
  })
}

/**
 * Everything a plan change moves. A plan sets the heart cap and the gem bonus
 * as well as the ad-free flag, so the whole game state is stale, not just the
 * subscription — and `hasActiveAppAccess` lives on the profile.
 */
function useEntitlementRefresh() {
  const queryClient = useQueryClient()
  const { refreshUser } = useAuth()

  return async () => {
    await invalidateAll(queryClient, [queryKeys.subscriptionStatus, queryKeys.gameState])
    await refreshUser()
  }
}

/**
 * Buys a gem pack: opens checkout in-app, then verifies the session
 * server-side. Verified here and now rather than trusting the redirect, and
 * separately from Stripe's webhook, which cannot reach a phone.
 *
 * Resolves `{ cancelled: true }` when the learner backs out, so callers can
 * tell "nothing happened" from "payment failed" without an error path.
 */
export function useBuyGemPack() {
  const queryClient = useQueryClient()
  const { openCheckout } = useCheckout()
  const notify = useNotify()
  const t = useTranslate()

  return useMutation({
    mutationFn: async (pack) => {
      // On iOS Apple bills (guideline 3.1.1 — Stripe checkout was rejected
      // by App Review). The transaction is finished only after the backend
      // has verified and credited it; unfinished ones are redelivered by
      // StoreKit on the next launch, so a network failure between the two
      // can delay gems but never lose them.
      if (APPLE_IAP) {
        const result = await buyWithApple({ sku: appleGemsProductId(pack.key), type: 'in-app' })
        if (result.cancelled) return { cancelled: true }

        const credited = await shopApi.verifyApplePurchase(result.purchase.purchaseToken)
        await finalizeApplePurchase(result.purchase)

        return { ...credited, pack }
      }

      const { checkoutUrl } = await shopApi.checkoutGems({
        packKey: pack.key,
        successUrl: SUCCESS_URL,
        cancelUrl: CANCEL_URL,
      })

      const result = await openCheckout(checkoutUrl, RETURN_BASE)
      if (result.type !== 'success') return { cancelled: true }

      const sessionId = sessionIdFrom(result.url)
      if (!sessionId) return { cancelled: true }

      return { ...(await shopApi.verifyGemsCheckout(sessionId)), pack }
    },
    onSuccess: (result) => {
      if (result?.cancelled) return
      queryClient.invalidateQueries({ queryKey: queryKeys.gameState })
    },
    onError: (error) => notify.error(error.message),
  })
}

export function useRefillHearts() {
  const queryClient = useQueryClient()
  const notify = useNotify()
  const t = useTranslate()

  return useMutation({
    mutationFn: (tier) => shopApi.refillHearts(tier.key),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: queryKeys.gameState }),
    // The backend 422s when hearts are already full, when the plan has
    // unlimited hearts, or when the balance is short. Its message says which,
    // and is far more useful than anything guessed here.
    onError: (error) => notify.error(error.message),
  })
}

/** Buys or switches a plan. Same in-app checkout and same verification. */
export function useStartSubscriptionCheckout() {
  const refreshEntitlements = useEntitlementRefresh()
  const { openCheckout } = useCheckout()
  const notify = useNotify()
  const t = useTranslate()

  return useMutation({
    mutationFn: async (planKey) => {
      // Apple bills on iOS; see useBuyGemPack for the ordering rationale.
      if (APPLE_IAP) {
        const result = await buyWithApple({ sku: appleSubProductId(planKey), type: 'subs' })
        if (result.cancelled) return { cancelled: true }

        const credited = await shopApi.verifyApplePurchase(result.purchase.purchaseToken)
        await finalizeApplePurchase(result.purchase)

        return credited
      }

      const { checkoutUrl } = await subscriptionApi.checkoutSubscription({
        planKey,
        successUrl: SUCCESS_URL,
        cancelUrl: CANCEL_URL,
      })

      const result = await openCheckout(checkoutUrl, RETURN_BASE)
      if (result.type !== 'success') return { cancelled: true }

      const sessionId = sessionIdFrom(result.url)
      if (!sessionId) return { cancelled: true }

      return subscriptionApi.verifyCheckout(sessionId)
    },
    onSuccess: async (result) => {
      if (result?.cancelled) return
      // 'activated'/'already_active' are Stripe's vocabulary, 'completed' is
      // the Apple verify endpoint's.
      if (['activated', 'already_active', 'completed'].includes(result?.status)) {
        await refreshEntitlements()
      }
    },
    onError: (error) => notify.error(error.message),
  })
}

/**
 * Apple's localized prices for everything in the catalog, keyed by product
 * id. Also the shop's IAP bootstrap: while mounted, any purchase StoreKit
 * redelivers (one whose backend credit was interrupted) is verified and
 * finished in the background.
 *
 * Resolves to an empty map off iOS and for products App Store Connect does
 * not know, so the shop can simply not offer what has no price.
 */
export function useApplePrices(catalog) {
  const queryClient = useQueryClient()
  const { refreshUser } = useAuth()

  useEffect(() => {
    if (!APPLE_IAP) return undefined

    onOrphanPurchase(async (purchase) => {
      try {
        await shopApi.verifyApplePurchase(purchase.purchaseToken)
        await finalizeApplePurchase(purchase)
        await invalidateAll(queryClient, [queryKeys.subscriptionStatus, queryKeys.gameState])
        await refreshUser()
      } catch {
        // Still unfinished; StoreKit will redeliver again next launch.
      }
    })

    return () => onOrphanPurchase(null)
  }, [queryClient, refreshUser])

  const subKeys = (catalog?.subscriptionPlans ?? []).map((plan) => plan.key)
  const gemKeys = (catalog?.gemPacks ?? []).map((pack) => pack.key)

  return useQuery({
    queryKey: [...queryKeys.shopCatalog, 'apple-prices', ...subKeys, ...gemKeys],
    queryFn: () => loadApplePrices({ subKeys, gemKeys }),
    enabled: APPLE_IAP && subKeys.length + gemKeys.length > 0,
    staleTime: 10 * 60_000,
  })
}

/**
 * Re-checks every purchase StoreKit still holds against the backend. Apple
 * requires a Restore Purchases control wherever IAP is offered; this is what
 * it does — reinstalls and new devices recover subscriptions this way.
 */
export function useRestoreApplePurchases() {
  const refreshEntitlements = useEntitlementRefresh()
  const notify = useNotify()
  const t = useTranslate()

  return useMutation({
    mutationFn: async () => {
      const purchases = await appleAvailablePurchases()

      let restored = 0

      for (const purchase of purchases) {
        if (!purchase?.purchaseToken) continue

        const result = await shopApi.verifyApplePurchase(purchase.purchaseToken)

        if (['completed', 'already_completed'].includes(result?.status)) restored += 1
      }

      return { restored }
    },
    onSuccess: async ({ restored }) => {
      await refreshEntitlements()
      notify.info(restored > 0 ? t('m_shop_restored') : t('m_shop_nothing_restore'))
    },
    onError: (error) => notify.error(error.message),
  })
}

export function useSetAutoRenew() {
  const queryClient = useQueryClient()
  const notify = useNotify()
  const t = useTranslate()

  return useMutation({
    mutationFn: subscriptionApi.setAutoRenew,
    onSuccess: async (_result, enabled) => {
      await queryClient.invalidateQueries({ queryKey: queryKeys.subscriptionStatus })
      notify.success(enabled ? t('m_plan_ar_on_msg') : t('m_plan_ar_off_msg'))
    },
    onError: () => notify.error(t('m_plan_failed')),
  })
}

/** One-way by design: there is no resume endpoint. */
export function useCancelSubscription() {
  const refreshEntitlements = useEntitlementRefresh()
  const notify = useNotify()
  const t = useTranslate()

  return useMutation({
    mutationFn: subscriptionApi.cancelSubscription,
    onSuccess: async () => {
      await refreshEntitlements()
      notify.success(t('m_plan_ended'))
    },
    onError: () => notify.error(t('m_plan_failed')),
  })
}
