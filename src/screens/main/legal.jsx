import { useMemo } from 'react'
import { StyleSheet, Text, View } from 'react-native'
import { useSafeAreaInsets } from 'react-native-safe-area-context'
import { useQuery } from '@tanstack/react-query'
import { WebView } from 'react-native-webview'
import ChevronLeft from 'lucide-react-native/icons/chevron-left'
import { Pressable } from 'react-native'
import { useLocalSearchParams } from '@/navigation'

import QueryState from '@/components/QueryState'
import { legalPage } from '@/api/pages'
import { openInAppBrowser } from '@/lib/browser'
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
        {(page) => <PageBody html={page?.content ?? ''} />}
      </QueryState>
    </View>
  )
}

/**
 * The admin's HTML, wrapped in the app's typography.
 *
 * The stylesheet is injected rather than applied to the WebView, because the
 * content is a fragment: it has no `<head>` of its own to style, and without a
 * viewport meta tag Android renders it at desktop width and the learner has to
 * pinch to read anything.
 */
function PageBody({ html }) {
  const document = useMemo(
    () => `<!DOCTYPE html>
<html>
<head>
<meta charset="utf-8">
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
  ul, ol { padding-left: 1.25em; margin: 0 0 1em; }
  li { margin-bottom: 0.4em; }
  strong { color: ${colors.secondary[800]}; }
  hr { border: 0; border-top: 1px solid ${colors.secondary[100]}; margin: 1.5em 0; }
  table { width: 100%; border-collapse: collapse; margin: 0 0 1em; }
  td, th { border: 1px solid ${colors.secondary[100]}; padding: 8px; text-align: left; }
  img { max-width: 100%; height: auto; }
</style>
</head>
<body>${html}</body>
</html>`,
    [html],
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
      // back to it.
      onShouldStartLoadWithRequest={(request) => {
        if (request.url === 'about:blank' || request.url.startsWith('data:')) return true

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
