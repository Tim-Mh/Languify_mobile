import { NavigationContainer } from '@react-navigation/native'
import { createNativeStackNavigator } from '@react-navigation/native-stack'

import AuthStack from './AuthStack'
import MainTabs from './MainTabs'
import SetupScreenHost from './SetupScreenHost'
import { navigationRef } from './navigationRef'
import { flushPendingNavigation } from './router'
import { ROOT } from './routeMap'
import OnboardingScreen from '../screens/onboarding'
import SplashScreen from '../screens/SplashScreen'
import { SPLASH_BACKGROUND } from '../theme'

const Stack = createNativeStackNavigator()

/**
 * The whole app's navigation tree.
 *
 * Launch sequence is splash then onboarding then register, every launch until
 * signed in. There is no persisted "seen the intro" flag on purpose; being
 * signed in is the only thing that skips it, which is why Splash is always the
 * initial route and decides where to go from there.
 *
 * `fade` matches the Expo build's screen animation, so moving between the
 * intro, auth and the app looks the same as it did.
 */
export default function RootNavigator({ onReady }) {
  return (
    <NavigationContainer
      ref={navigationRef}
      onReady={() => {
        // Anything that asked to navigate before the ref was usable runs now.
        // Without this a screen that routes from its own mount effect — the
        // splash does — is silently ignored, because a child's effects run
        // before its parent's.
        flushPendingNavigation()
        onReady?.()
      }}
    >
      <Stack.Navigator
        initialRouteName={ROOT.SPLASH}
        screenOptions={{
          headerShown: false,
          contentStyle: { backgroundColor: SPLASH_BACKGROUND },
          animation: 'fade',
        }}
      >
        <Stack.Screen name={ROOT.SPLASH} component={SplashScreen} />
        <Stack.Screen name={ROOT.ONBOARDING} component={OnboardingScreen} />
        <Stack.Screen name={ROOT.AUTH} component={AuthStack} />
        <Stack.Screen name={ROOT.SETUP} component={SetupScreenHost} />
        <Stack.Screen name={ROOT.MAIN} component={MainTabs} />
      </Stack.Navigator>
    </NavigationContainer>
  )
}
