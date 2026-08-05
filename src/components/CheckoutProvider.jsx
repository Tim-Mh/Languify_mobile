import { createContext, useCallback, useContext, useMemo, useRef, useState } from 'react'
import { ActivityIndicator, Modal, Pressable, StyleSheet, Text, View } from 'react-native'
import { useSafeAreaInsets } from 'react-native-safe-area-context'
import { WebView } from 'react-native-webview'
import Lock from 'lucide-react-native/icons/lock'
import X from 'lucide-react-native/icons/x'

import ConfirmDialog from './ConfirmDialog'
import { useTranslate } from '../lib/i18n'
import { colors, fonts, radii, spacing } from '../theme'

const CheckoutContext = createContext(null)

/**
 * Stripe Checkout, inside the app.
 *
 * This replaces `WebBrowser.openAuthSessionAsync`. That opens a Custom Tab on
 * Android and a Safari view on iOS — both of which wear the browser's chrome,
 * its address bar and its branding, so paying looked like leaving the app for
 * Chrome. Here the same hosted Checkout page is rendered in a `WebView` inside
 * a modal we own, so the learner never sees a browser at all.
 *
 * The contract is deliberately identical to the one it replaces:
 * `openCheckout(url)` resolves `{ type: 'success', url }` when the page reaches
 * the return URL, or `{ type: 'cancel' }` if the learner backs out. Call sites
 * read the session id off `url` and verify it server-side exactly as before —
 * nothing about the money path changed, only where the page is drawn.
 *
 * Note on native SDKs: Stripe's own React Native SDK would give a fully native
 * payment sheet, but it is a native module and this project is pinned to Expo
 * Go (see AGENTS.md), where it cannot load. A WebView is the in-app option that
 * survives that constraint. It also means Apple Pay and Google Pay are not
 * offered — card entry is.
 */
export function CheckoutProvider({ children }) {
  const t = useTranslate()
  const insets = useSafeAreaInsets()

  /** `{ url, returnPrefix }` while a checkout is up, else null. */
  const [session, setSession] = useState(null)
  const [loading, setLoading] = useState(true)
  const [confirmingCancel, setConfirmingCancel] = useState(false)

  /** Resolver for the promise handed to the caller. */
  const resolver = useRef(null)
  /** Guards against resolving twice — the return URL can fire more than once. */
  const settled = useRef(false)

  const finish = useCallback((result) => {
    if (settled.current) return
    settled.current = true

    setSession(null)
    setConfirmingCancel(false)
    resolver.current?.(result)
    resolver.current = null
  }, [])

  /**
   * Opens `url` and resolves once the page navigates to something starting with
   * `returnPrefix`. Stripe will not redirect to a custom scheme, so the return
   * is the web app's own origin, which we intercept rather than ever load.
   */
  const openCheckout = useCallback((url, returnPrefix) => {
    settled.current = false
    setLoading(true)
    setSession({ url, returnPrefix })

    return new Promise((resolve) => {
      resolver.current = resolve
    })
  }, [])

  const value = useMemo(() => ({ openCheckout }), [openCheckout])

  /**
   * Called for every navigation the page attempts. Returning false stops the
   * WebView from actually loading the return URL — there is nothing useful
   * there for a phone, and loading it would flash the web app's store page
   * before we closed.
   */
  const intercept = useCallback(
    (request) => {
      if (!session?.returnPrefix) return true
      if (!request.url?.startsWith(session.returnPrefix)) return true

      finish({ type: 'success', url: request.url })
      return false
    },
    [session, finish],
  )

  return (
    <CheckoutContext.Provider value={value}>
      {children}

      <Modal
        visible={session !== null}
        animationType="slide"
        presentationStyle="fullScreen"
        // Android back: treated as an attempt to abandon a payment, which is
        // worth one question rather than silently dropping the checkout.
        onRequestClose={() => setConfirmingCancel(true)}
      >
        <View style={[styles.screen, { paddingTop: insets.top }]}>
          <View style={styles.bar}>
            <Pressable
              accessibilityRole="button"
              accessibilityLabel={t('m_co_cancel_lbl')}
              onPress={() => setConfirmingCancel(true)}
              hitSlop={12}
              style={({ pressed }) => [styles.close, pressed && styles.pressed]}
            >
              <X size={20} color={colors.secondary[600]} strokeWidth={2.4} />
            </Pressable>

            {/* Says who is taking the payment. Inside an app there is no address
                bar to check, so the app has to say it. */}
            <View style={styles.secure}>
              <Lock size={13} color={colors.success[600]} strokeWidth={2.6} />
              <Text style={styles.secureText}>{t('m_co_secure')}</Text>
            </View>
          </View>

          <View style={styles.body}>
            {session ? (
              <WebView
                source={{ uri: session.url }}
                onShouldStartLoadWithRequest={intercept}
                // iOS runs the check above for main-frame loads only when this
                // is also wired, because a redirect chain can settle without a
                // fresh request event.
                onNavigationStateChange={(navState) => {
                  if (
                    session?.returnPrefix &&
                    navState.url?.startsWith(session.returnPrefix)
                  ) {
                    finish({ type: 'success', url: navState.url })
                  }
                }}
                onLoadEnd={() => setLoading(false)}
                // Stripe stores its session in cookies and localStorage, and 3D
                // Secure challenges load in a nested frame from the bank.
                javaScriptEnabled
                domStorageEnabled
                thirdPartyCookiesEnabled
                sharedCookiesEnabled
                setSupportMultipleWindows={false}
                style={styles.web}
              />
            ) : null}

            {loading ? (
              <View style={styles.loading}>
                <ActivityIndicator color={colors.primary[500]} size="large" />
                <Text style={styles.loadingText}>{t('m_co_opening')}</Text>
              </View>
            ) : null}
          </View>
        </View>

        <ConfirmDialog
          visible={confirmingCancel}
          title={t('m_co_cancel_t')}
          body={t('m_co_cancel_b')}
          confirmLabel={t('m_co_cancel_yes')}
          cancelLabel={t('m_co_cancel_no')}
          destructive
          onConfirm={() => finish({ type: 'cancel' })}
          onCancel={() => setConfirmingCancel(false)}
        />
      </Modal>
    </CheckoutContext.Provider>
  )
}

export function useCheckout() {
  const context = useContext(CheckoutContext)
  if (!context) throw new Error('useCheckout must be used inside a CheckoutProvider')
  return context
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: colors.white,
  },
  bar: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    borderBottomWidth: 1,
    borderBottomColor: colors.secondary[100],
  },
  close: {
    width: 36,
    height: 36,
    borderRadius: radii.pill,
    alignItems: 'center',
    justifyContent: 'center',
  },
  pressed: {
    opacity: 0.6,
  },
  secure: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 5,
    // Balances the close button so the label sits centred in the bar.
    paddingRight: 36,
  },
  secureText: {
    fontFamily: fonts.bodySemi,
    fontSize: 12.5,
    color: colors.secondary[500],
  },
  body: {
    flex: 1,
  },
  web: {
    flex: 1,
  },
  loading: {
    ...StyleSheet.absoluteFillObject,
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.md,
    backgroundColor: colors.white,
  },
  loadingText: {
    fontFamily: fonts.bodySemi,
    fontSize: 14,
    color: colors.secondary[400],
  },
})
