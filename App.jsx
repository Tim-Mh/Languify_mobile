import { useState } from 'react'
import { StatusBar } from 'react-native'
import { GestureHandlerRootView } from 'react-native-gesture-handler'
import { SafeAreaProvider } from 'react-native-safe-area-context'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'

import { AuthProvider } from './src/auth/AuthContext'
import { CheckoutProvider } from './src/components/CheckoutProvider'
import { NotificationProvider } from './src/components/NotificationProvider'
import { PushProvider } from './src/components/PushProvider'
import RootNavigator from './src/navigation/RootNavigator'
import { SPLASH_BACKGROUND } from './src/theme'

/**
 * The provider stack, and the app.
 *
 * This is what `app/_layout.jsx` was under Expo Router. Two things that were
 * here are gone:
 *
 *  - **The font gate.** `useFonts` had to resolve before anything could render,
 *    because the fonts were loaded at runtime. They are bundled into the native
 *    app now (see `react-native.config.js`), so they are available on the first
 *    frame and there is nothing to wait for.
 *  - **The splash calls.** `react-native-bootsplash` shows the native splash
 *    from the moment the process starts and keeps it up until it is told to
 *    hide, so there is no auto-hide to pre-empt. `SplashScreen.jsx` hides it,
 *    for the same reason it did before: the splash should give way to real
 *    content rather than to a blank frame.
 */
export default function App() {
  // Created once per app launch. Building it inline would hand every render a
  // brand-new client and throw away the cache.
  const [queryClient] = useState(
    () =>
      new QueryClient({
        defaultOptions: {
          queries: {
            // Phones lose connectivity constantly; one quiet retry is worth it,
            // but do not sit there retrying a 401 or a 422.
            retry: (failureCount, error) =>
              failureCount < 1 && (error?.status ?? 0) >= 500,
            staleTime: 30_000,
          },
        },
      }),
  )

  return (
    <GestureHandlerRootView style={{ flex: 1, backgroundColor: SPLASH_BACKGROUND }}>
      <QueryClientProvider client={queryClient}>
        <AuthProvider>
          {/* Inside SafeAreaProvider because the toast needs the top inset, and
              outside the navigator so it floats above whatever screen is
              showing. */}
          <SafeAreaProvider>
            <NotificationProvider>
              {/* Inside NotificationProvider because a push that arrives while
                  the app is open is shown as a toast rather than a system
                  banner, and below AuthProvider because a device is only
                  enrolled once there is a session to attach it to. */}
              <PushProvider>
                {/* Above the navigator so the payment sheet covers whichever
                    screen started it, and inside NotificationProvider so a
                    toast fired when it closes still lands on top. */}
                <CheckoutProvider>
                  {/* Dark glyphs on the pale brand surface. `translucent` with
                      a transparent background is what lets a screen's own
                      gradient run up behind the status bar, which several of
                      them do. */}
                  <StatusBar
                    barStyle="dark-content"
                    backgroundColor="transparent"
                    translucent
                  />
                  <RootNavigator />
                </CheckoutProvider>
              </PushProvider>
            </NotificationProvider>
          </SafeAreaProvider>
        </AuthProvider>
      </QueryClientProvider>
    </GestureHandlerRootView>
  )
}
