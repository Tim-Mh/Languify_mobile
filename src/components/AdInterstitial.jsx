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
           * Rendered directly, with no entering animation around it.
           *
           * It used to sit inside an `Animated.View entering={FadeIn}`, which
           * meant the creative was only visible once that animation had run. A
           * layout animation on a view mounted by a whole-screen swap — which
           * is what this is, the player early-returns straight to the
           * interstitial — does not reliably fire, and when it does not the
           * view is left at its starting opacity of zero. The result was an
           * empty screen with the AD tag, the sponsor line and an enabled
           * Continue button drawn over it, and no error anywhere, because the
           * image had loaded perfectly well and simply could not be seen.
           *
           * A fade is not worth a creative that sometimes fails to appear.
           */
          <Image
            source={{ uri: ad.url }}
            style={StyleSheet.absoluteFill}
            resizeMode="contain"
            onError={() => setFailed(true)}
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
  canvas: {
    ...StyleSheet.absoluteFillObject,
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
    borderColor: 'rgba(255,255,255,0.45)',
    backgroundColor: 'rgba(0,0,0,0.55)',
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
    backgroundColor: 'rgba(20, 13, 28, 0.82)',
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
