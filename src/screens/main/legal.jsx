import { useMemo } from 'react'
import { StyleSheet, Text, View } from 'react-native'
import { useSafeAreaInsets } from 'react-native-safe-area-context'
import { useQuery } from '@tanstack/react-query'
import { WebView } from 'react-native-webview'
import ChevronLeft from 'lucide-react-native/icons/chevron-left'
import { Pressable } from 'react-native'
import { useLocalSearchParams, useRouter } from '@/navigation'

import QueryState from '@/components/QueryState'
import { legalPage } from '@/api/pages'
import { openInAppBrowser } from '@/lib/browser'
import { WEB_URL_OVERRIDE } from '@/lib/env'
import { useLanguageCode, useTranslate } from '@/lib/i18n'
import { useLayout } from '@/lib/responsive'
import { useGoBack } from '@/lib/useGoBack'
import { colors, fonts, radii, spacing } from '@/theme'

/**
 * Terms and Conditions, and the Privacy Policy.
 *
 * The copy is written in the admin panel with a WYSIWYG editor and stored as
 * HTML, so this screen renders whatever was last saved rather than shipping a
 * copy that drifts. One screen serves both: the slug arrives as a route param.
 *
 * A `WebView` rather than a hand-rolled HTML parser, because the admin can use
 * the whole editor — headings, lists, links, bold — and reimplementing that in
 * React Native components would go wrong the first time somebody pasted a
 * table. The markup is wrapped in the app's own typography below so it reads as
 * part of the app rather than a web page bolted into it.
 */
export default function LegalScreen() {
  const t = useTranslate()
  const insets = useSafeAreaInsets()
  const { size } = useLayout()
  const goBack = useGoBack('/profile')

  const { slug } = useLocalSearchParams()
  const pageSlug = slug === 'privacy' ? 'privacy' : 'terms'

  // The learner's own language, not the one they are learning: this is the
  // app talking to them, not content to study.
  const locale = useLanguageCode()

  const query = useQuery({
    // Keyed on the locale too, or switching language would show the previous
    // language's cached page.
    queryKey: ['legalPage', pageSlug, locale],
    queryFn: () => legalPage(pageSlug, locale),
    // Legal copy changes a few times a year at most, so re-reading it on every
    // visit is wasted traffic on a phone.
    staleTime: 60 * 60 * 1000,
  })

  return (
    <View style={styles.screen}>
      <View style={[styles.header, { paddingTop: insets.top + spacing.sm }]}>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel={t('m_back')}
          onPress={goBack}
          hitSlop={10}
          style={({ pressed }) => [styles.back, pressed && styles.pressed]}
        >
          <ChevronLeft size={22} color={colors.secondary[600]} strokeWidth={2.4} />
        </Pressable>
        <Text style={[styles.headerTitle, { fontSize: size(19) }]} numberOfLines={1}>
          {query.data?.title ??
            (pageSlug === 'privacy' ? t('m_profile_privacy') : t('m_profile_terms'))}
        </Text>
      </View>

      <QueryState query={query} errorTitle={t('m_legal_error')}>
        {/* The locale the API actually served, not the one asked for: a
            language nobody has translated yet comes back as English, and that
            English must not be laid out right to left. */}
        {(page) => <PageBody html={page?.content ?? ''} locale={page?.locale ?? 'en'} />}
      </QueryState>
    </View>
  )
}

/**
 * Languages written right to left.
 *
 * Declared rather than inferred: `dir="auto"` reads the first strong character
 * in the document, and these pages open with the product name, which is Latin.
 * That would lay an entire Arabic page out left to right on the strength of one
 * word.
 */
const RTL_LOCALES = new Set(['ar'])

/**
 * What a relative link in the admin's HTML resolves against.
 *
 * The document is handed to the WebView as a string, so it has no address of
 * its own and a relative `href="/contact"` resolves to nothing at all. That is
 * why the Contact link at the bottom of the Terms did nothing when tapped. A
 * `<base>` gives every relative link a real address, which also makes them
 * recognisable below.
 */
const WEB_ORIGIN = WEB_URL_OVERRIDE ?? 'https://languify.us'

/**
 * Paths that exist as screens in this app, so a link to one stays inside the
 * app instead of throwing the learner out to the website. Keyed by the web
 * path, valued by the route this app knows it as.
 */
const IN_APP_PATHS = {
  '/contact': '/contact',
}

/** The path part of a link into our own website, or null for anywhere else. */
function webPathOf(url) {
  if (!url.startsWith(WEB_ORIGIN)) return null

  const path = url.slice(WEB_ORIGIN.length).split('?')[0].split('#')[0]

  // `/contact` and `/contact/` are the same page.
  return path.length > 1 && path.endsWith('/') ? path.slice(0, -1) : path
}

/**
 * The admin's HTML, wrapped in the app's typography.
 *
 * The stylesheet is injected rather than applied to the WebView, because the
 * content is a fragment: it has no `<head>` of its own to style, and without a
 * viewport meta tag Android renders it at desktop width and the learner has to
 * pinch to read anything.
 *
 * Sides are logical rather than physical — `padding-inline-start`, `text-align:
 * start` — so the same stylesheet mirrors itself for Arabic instead of leaving
 * list bullets and table cells stranded on the wrong edge.
 */
function PageBody({ html, locale }) {
  const router = useRouter()

  const document = useMemo(
    () => `<!DOCTYPE html>
<html lang="${locale}" dir="${RTL_LOCALES.has(locale) ? 'rtl' : 'ltr'}">
<head>
<meta charset="utf-8">
<base href="${WEB_ORIGIN}/">
<meta name="viewport" content="width=device-width, initial-scale=1, maximum-scale=1">
<style>
  :root { color-scheme: light; }
  body {
    margin: 0;
    padding: ${spacing.lg}px;
    background: ${colors.surface};
    color: ${colors.secondary[700]};
    font-family: -apple-system, Roboto, sans-serif;
    font-size: 15px;
    line-height: 1.65;
    -webkit-text-size-adjust: 100%;
  }
  h1, h2, h3 { color: ${colors.secondary[800]}; line-height: 1.3; margin: 1.4em 0 0.5em; }
  h1 { font-size: 21px; } h2 { font-size: 18px; } h3 { font-size: 16px; }
  h1:first-child, h2:first-child, h3:first-child { margin-top: 0; }
  p { margin: 0 0 1em; }
  a { color: ${colors.primary[600]}; }
  ul, ol { padding-inline-start: 1.25em; margin: 0 0 1em; }
  li { margin-bottom: 0.4em; }
  strong { color: ${colors.secondary[800]}; }
  hr { border: 0; border-top: 1px solid ${colors.secondary[100]}; margin: 1.5em 0; }
  table { width: 100%; border-collapse: collapse; margin: 0 0 1em; }
  td, th { border: 1px solid ${colors.secondary[100]}; padding: 8px; text-align: start; }
  img { max-width: 100%; height: auto; }
</style>
</head>
<body>${html}</body>
</html>`,
    [html, locale],
  )

  return (
    <WebView
      originWhitelist={['*']}
      source={{ html: document }}
      style={styles.web}
      // The page is our own markup on our own background; the default white
      // flash before it paints is the only thing this avoids.
      backgroundColor={colors.surface}
      // A link in the terms goes to the in-app browser rather than replacing
      // the page the learner is reading, which would leave them with no way
      // back to it. A link to a screen this app already has goes there instead.
      onShouldStartLoadWithRequest={(request) => {
        if (request.url === 'about:blank' || request.url.startsWith('data:')) return true

        // The Contact link at the foot of the Terms points at the website, but
        // this app has that screen already. Sending the learner to the app's own
        // Contact form keeps them signed in and inside the app.
        const inApp = IN_APP_PATHS[webPathOf(request.url)]

        if (inApp) {
          router.push(inApp)
          return false
        }

        openInAppBrowser(request.url)
        return false
      }}
    />
  )
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: colors.surface,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    paddingHorizontal: spacing.md,
    paddingBottom: spacing.sm,
    borderBottomWidth: 1,
    borderBottomColor: colors.secondary[100],
  },
  back: {
    width: 36,
    height: 36,
    borderRadius: radii.pill,
    alignItems: 'center',
    justifyContent: 'center',
  },
  pressed: {
    opacity: 0.6,
  },
  headerTitle: {
    flex: 1,
    fontFamily: fonts.display,
    color: colors.secondary[800],
  },
  web: {
    flex: 1,
    backgroundColor: colors.surface,
  },
})
