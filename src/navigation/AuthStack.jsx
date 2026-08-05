import { createNativeStackNavigator } from '@react-navigation/native-stack'

import ForgotPasswordScreen from '../screens/auth/forgot-password'
import LoginScreen from '../screens/auth/login'
import RegisterScreen from '../screens/auth/register'
import ResetPasswordScreen from '../screens/auth/reset-password'
import VerifyOtpScreen from '../screens/auth/verify-otp'
import { AUTH_SCREENS } from './routeMap'
import { colors } from '../theme'

const Stack = createNativeStackNavigator()

/**
 * Sign-up, sign-in and password recovery.
 *
 * Register is the initial route because the intro lets out here (`routes.js`),
 * and someone who already has an account gets to Login from the link on it.
 */
export default function AuthStack() {
  return (
    <Stack.Navigator
      initialRouteName={AUTH_SCREENS.REGISTER}
      screenOptions={{
        headerShown: false,
        contentStyle: { backgroundColor: colors.surface },
      }}
    >
      <Stack.Screen name={AUTH_SCREENS.REGISTER} component={RegisterScreen} />
      <Stack.Screen name={AUTH_SCREENS.LOGIN} component={LoginScreen} />
      <Stack.Screen name={AUTH_SCREENS.FORGOT_PASSWORD} component={ForgotPasswordScreen} />
      <Stack.Screen name={AUTH_SCREENS.RESET_PASSWORD} component={ResetPasswordScreen} />
      <Stack.Screen name={AUTH_SCREENS.VERIFY_OTP} component={VerifyOtpScreen} />
    </Stack.Navigator>
  )
}
