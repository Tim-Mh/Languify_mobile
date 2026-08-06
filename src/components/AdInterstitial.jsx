import { useEffect, useState } from 'react'
import { Image, Pressable, StyleSheet, Text, View } from 'react-native'
import { useSafeAreaInsets } from 'react-native-safe-area-context'
import ImageOff from 'lucide-react-native/icons/image-off'

import Button from './Button'
import { openInAppBrowser } from '../lib/browser'
import { useTranslate } from '../lib/i18n'
import { useLayout } from '../lib/responsive'
import { colors, fonts, radii, spacing } from '../theme'

/**
 * The sponsored break between finishing a lesson and getting back to the path.
 *
 * Full-bleed portrait: the creative fills the screen edge to edge and the only
 * chrome is the AD tag, the sponsor line and the button pinned to the bottom.
 * It was a letterboxed 1.45 landscape card floating in the middle of the
 * screen — the same crop the web sidebar uses — which on a phone left most of
 * the screen empty and made the ad look like a mistake rather than a placement.
 * Mobile creatives are their own admin section for exactly this reason: they
 * are a different shape.
 *
 * The creative and the countdown are both admin-managed: the pool comes from
 * `GET /ads` under the mobile lesson-complete placement and the duration from
 * `settings.interstitialSeconds`, so nobody needs a release to change either.
 * Subscribers never get here — the caller decides that.
 *
 * Continue is disabled until the countdown runs out. That is the whole point of
 * an interstitial, but it also means the button must never be the only way out
 * of a broken state, which is why a creative that fails to load still counts
 * down and still releases the button.
 */
export default function AdInterstitial({ ad, seconds = 10, onContinue }) {
  const t = useTranslate()
  const insets = useSafeAreaInsets()
  const { column, size } = useLayout()
  const [remaining, setRemaining] = useState(seconds)
  const [failed, setFailed] = useState(false)

  useEffect(() => {
    if (remaining <= 0) return undefined
    const timer = setTimeout(() => setRemaining((count) => count - 1), 1000)
    return () => clearTimeout(timer)
  }, [remaining])

  const openTarget = () => {
    if (!ad?.targetUrl) return
    // In-app browser rather than a hand-off to Chrome: the learner is mid-flow
    // and has a lesson path still waiting behind this.
    openInAppBrowser(ad.targetUrl)
  }

  return (
    <View style={styles.screen}>
      {/* The creative itself is the screen. `contain` rather than `cover` so an
          uploaded portrait is never cropped into by the safe areas — the
          backdrop behind it absorbs whatever is left over. */}
      <Pressable
        accessibilityRole={ad?.targetUrl ? 'link' : 'image'}
        accessibilityLabel={
          ad?.productName
            ? t('m_ad_a11y', { name: ad.productName })
            : t('m_ad_a11y_plain')
        }
        onPress={openTarget}
        disabled={!ad?.targetUrl}
        style={styles.canvas}
      >
        {failed || !ad?.url ? (
          <View style={styles.fallback}>
            <ImageOff size={40} color={colors.secondary[300]} strokeWidth={1.6} />
          </View>
        ) : (
          /*
           * Sized by flex, not by `StyleSheet.absoluteFill`.
           *
           * Two things have made this creative invisible. It first sat inside an
           * `Animated.View entering={FadeIn}`, so it only appeared once that
           * animation had run — and a layout animation on a view mounted by a
           * whole-screen swap, which is what this is, does not reliably fire,
           * leaving the view at its starting opacity of zero.
           *
           * With that gone it was still absolutely positioned inside an
           * absolutely positioned parent. That nesting is legal but it gives
           * the image no intrinsic box to lay out against, and on Android a
           * remote image whose bounds resolve late can end up measured at zero
           * and never painted. A plain `flex: 1` inside a flex parent is one
           * fewer thing that can resolve to nothing.
           *
           * `onLoad` and `onError` both report, because the failure mode here
           * has twice been "looks broken, says nothing".
           */
          <Image
            source={{ uri: ad.url }}
            style={styles.creative}
            resizeMode="contain"
            onLoad={({ nativeEvent }) => {
              if (__DEV__) {
                const { width, height } = nativeEvent?.source ?? {}
                console.log(`[ad] loaded ${width}x${height} ${ad.url}`)
              }
            }}
            onError={({ nativeEvent }) => {
              if (__DEV__) console.warn(`[ad] failed ${ad.url}`, nativeEvent?.error)
              setFailed(true)
            }}
            accessibilityIgnoresInvertColors
          />
        )}
      </Pressable>

      {/* Labelled as advertising on the creative itself, not just in the footer,
          so it is still marked if the image is all a learner looks at. */}
      <View style={[styles.adTag, { top: insets.top + spacing.sm }]}>
        <Text style={styles.adTagText}>AD</Text>
      </View>

      <View style={[styles.footer, { paddingBottom: insets.bottom + spacing.lg }]}>
        <View style={column}>
          <View style={styles.sponsorRow}>
            <Text style={styles.sponsor} numberOfLines={1}>
              {ad?.productName || t('m_ad_sponsored')}
            </Text>
            {ad?.targetUrl ? (
              <Pressable accessibilityRole="link" onPress={openTarget} hitSlop={8}>
                <Text style={styles.learnMore}>{t('m_ad_learn_more')}</Text>
              </Pressable>
            ) : null}
          </View>

          <Button
            label={remaining > 0 ? t('m_ad_continue_in', { n: remaining }) : t('m_continue')}
            onPress={onContinue}
            disabled={remaining > 0}
          />
          <Text style={[styles.note, { fontSize: size(12) }]}>{t('m_ad_go_ad_free')}</Text>
        </View>
      </View>
    </View>
  )
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    // Dark, so a creative that does not match the screen's aspect ratio reads
    // as a full-screen placement rather than as a picture on a white page.
    backgroundColor: colors.secondary[900],
  },
  /**
   * Fills the screen by flex rather than by absolute insets, so the image
   * inside it has a real box to size against. The AD tag and the footer are
   * still absolute and sit on top of this.
   */
  canvas: {
    flex: 1,
  },
  creative: {
    flex: 1,
    width: '100%',
  },
  fallback: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  adTag: {
    position: 'absolute',
    left: spacing.md,
    borderRadius: 4,
    borderWidth: 1,
    borderColor: colors.overlay.lightStrong,
    backgroundColor: colors.overlay.plate,
    paddingHorizontal: 6,
    paddingVertical: 2,
  },
  adTagText: {
    fontFamily: fonts.bodyBold,
    fontSize: 9,
    letterSpacing: 1,
    color: colors.white,
  },
  footer: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 0,
    alignItems: 'center',
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.lg,
    // Sits over the bottom of the creative, so the button is always reachable
    // and always legible whatever the artwork is doing behind it.
    backgroundColor: colors.overlay.plateDeep,
    borderTopLeftRadius: radii.xl,
    borderTopRightRadius: radii.xl,
  },
  sponsorRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    marginBottom: spacing.md,
  },
  sponsor: {
    flex: 1,
    fontFamily: fonts.bodySemi,
    fontSize: 13,
    color: colors.secondary[200],
  },
  learnMore: {
    fontFamily: fonts.bodyBold,
    fontSize: 13,
    color: colors.primary[300],
  },
  note: {
    fontFamily: fonts.body,
    color: colors.secondary[300],
    textAlign: 'center',
    marginTop: spacing.sm,
  },
})
