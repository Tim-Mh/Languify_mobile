import { Platform } from 'react-native'
import {
  fetchProducts,
  finishTransaction,
  getAvailablePurchases,
  initConnection,
  purchaseErrorListener,
  purchaseUpdatedListener,
} from 'react-native-iap'

/**
 * Apple In-App Purchase, StoreKit 2 via react-native-iap.
 *
 * iOS only, and the reason the iOS shop exists at all: App Review rejected
 * Stripe checkout under guideline 3.1.1, so on this platform Apple bills and
 * the backend verifies. The flow per purchase:
 *
 *   1. `buyWithApple` opens the native payment sheet.
 *   2. StoreKit hands back a signed transaction (a JWS).
 *   3. The caller posts it to `POST /shop/apple/verify`, which checks the
 *      signature against Apple's root certificates and credits the account.
 *   4. Only after the backend has credited does `finalizeApplePurchase` tell
 *      StoreKit the transaction is finished. Finishing first would lose the
 *      purchase if the network died in between; unfinished transactions are
 *      redelivered by StoreKit on the next launch, so nothing is ever lost.
 *
 * Product ids are the contract with App Store Connect and the backend:
 *
 *     us.languify.app.sub.{plan_key}      auto-renewable subscriptions
 *     us.languify.app.gems.{pack_key}     consumable gem packs
 */

const SUB_PREFIX = 'us.languify.app.sub.'
const GEMS_PREFIX = 'us.languify.app.gems.'

export function appleSubProductId(planKey) {
  return `${SUB_PREFIX}${planKey}`
}

export function appleGemsProductId(packKey) {
  return `${GEMS_PREFIX}${packKey}`
}

let connected = false
let listenersAttached = false

/** Purchases we are waiting on, keyed by product id. */
const pending = new Map()

function settle(productId, outcome) {
  const waiter = pending.get(productId)

  if (!waiter) return

  pending.delete(productId)
  waiter(outcome)
}

function attachListeners() {
  if (listenersAttached) return
  listenersAttached = true

  // Kept for the app's lifetime on purpose. StoreKit can deliver a purchase
  // at any moment — including one that never got finished on a previous
  // launch — and a listener that comes and goes with a screen would miss it.
  purchaseUpdatedListener((purchase) => {
    const hadWaiter = pending.has(purchase.productId)

    settle(purchase.productId, { purchase })

    // A redelivery nobody was waiting on (an interrupted earlier purchase).
    // Handed to the recovery callback so it still reaches the backend.
    if (!hadWaiter && orphanHandler) {
      orphanHandler(purchase)
    }
  })

  purchaseErrorListener((error) => {
    const cancelled = error?.code === 'user-cancelled'

    // The error does not say which product it was for, so it settles every
    // waiter — there is only ever one payment sheet at a time anyway.
    for (const productId of [...pending.keys()]) {
      settle(productId, cancelled ? { cancelled: true } : { error })
    }
  })
}

let orphanHandler = null

/**
 * Registers the recovery path for purchases delivered outside a buy call —
 * StoreKit redelivering a transaction whose backend credit never happened.
 */
export function onOrphanPurchase(handler) {
  orphanHandler = handler
}

async function ensureConnection() {
  attachListeners()

  if (!connected) {
    await initConnection()
    connected = true
  }
}

/**
 * Whether purchasing is available in this build. False everywhere but iOS —
 * Android keeps Stripe checkout.
 */
export const APPLE_IAP = Platform.OS === 'ios'

/**
 * Apple's localized prices for the given product ids, as
 * `{ [productId]: displayPrice }`. Ids Apple does not know are absent —
 * a product not yet configured in App Store Connect simply is not offered.
 */
export async function loadApplePrices({ subKeys = [], gemKeys = [] }) {
  await ensureConnection()

  const skus = [...subKeys.map(appleSubProductId), ...gemKeys.map(appleGemsProductId)]

  if (skus.length === 0) return {}

  const prices = {}

  // Subscriptions and consumables are fetched per type; a sku queried under
  // the wrong type just comes back empty.
  for (const type of ['subs', 'in-app']) {
    const wanted = type === 'subs' ? subKeys.map(appleSubProductId) : gemKeys.map(appleGemsProductId)

    if (wanted.length === 0) continue

    try {
      const products = await fetchProducts({ skus: wanted, type })

      for (const product of products ?? []) {
        prices[product.id] = product.displayPrice
      }
    } catch {
      // Store unreachable — the shop renders without Apple prices and the
      // buttons stay disabled rather than the screen failing.
    }
  }

  return prices
}

/**
 * Opens the payment sheet and resolves with the signed transaction.
 *
 * Resolves `{ cancelled: true }` when the learner backs out, matching the
 * Stripe hooks' convention, and rejects on a real failure.
 */
export async function buyWithApple({ sku, type }) {
  await ensureConnection()

  // Loaded lazily so requestPurchase's module is only touched on iOS.
  const { requestPurchase } = require('react-native-iap')

  const outcome = await new Promise((resolve) => {
    pending.set(sku, resolve)

    requestPurchase({ request: { apple: { sku } }, type }).catch((error) => {
      settle(sku, error?.code === 'user-cancelled' ? { cancelled: true } : { error })
    })
  })

  if (outcome.cancelled) return { cancelled: true }
  if (outcome.error) throw outcome.error

  return outcome
}

/**
 * Tells StoreKit the purchase reached the backend and is settled. Consumables
 * must say so or the same gem pack could never be bought twice.
 */
export async function finalizeApplePurchase(purchase) {
  const isConsumable = String(purchase.productId ?? '').startsWith(GEMS_PREFIX)

  await finishTransaction({ purchase, isConsumable })
}

/**
 * Every purchase StoreKit still considers current — active subscriptions and
 * any transaction never finished. Used by Restore Purchases, which Apple
 * requires wherever In-App Purchase is offered.
 */
export async function appleAvailablePurchases() {
  await ensureConnection()

  return (await getAvailablePurchases()) ?? []
}
