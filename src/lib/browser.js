import { Linking } from 'react-native'
import InAppBrowser from 'react-native-inappbrowser-reborn'

import { colors } from '../theme'

/**
 * Opens a URL in an in-app browser.
 *
 * This stands in for `WebBrowser.openBrowserAsync`. In-app rather than a
 * hand-off to Chrome or Safari, because the only thing that opens a link here
 * is a sponsored creative shown mid-flow, with a lesson path still waiting
 * behind it — sending the learner out to another app loses that.
 *
 * Tinted to the brand so the Custom Tab reads as part of Languify rather than
 * as a bare browser window.
 *
 * Falls back to handing the URL to the system when no browser supports the
 * in-app presentation, which is rare but real on a stripped-down Android build.
 * Never throws: a link that will not open is not worth interrupting anyone for.
 */
export async function openInAppBrowser(url) {
  if (!url) return false

  try {
    if (await InAppBrowser.isAvailable()) {
      await InAppBrowser.open(url, {
        toolbarColor: colors.primary[500],
        preferredBarTintColor: colors.primary[500],
        preferredControlTintColor: colors.white,
        secondaryToolbarColor: colors.secondary[600],
        showTitle: true,
        enableUrlBarHiding: true,
        enableDefaultShare: false,
      })

      return true
    }

    await Linking.openURL(url)

    return true
  } catch {
    return false
  }
}

export default openInAppBrowser
