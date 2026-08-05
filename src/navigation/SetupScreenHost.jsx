import { Redirect } from './router'
import SetupScreen from '../screens/setup/SetupScreen'
import { useAuth } from '../auth/AuthContext'
import { UNAUTHENTICATED } from '../routes'

/**
 * Setup runs after sign-up, so it is behind auth: every step writes to the
 * user's own profile.
 *
 * The Expo build wrapped this in a one-screen Stack purely to hang the guard
 * off a layout file. With no file-based routing there is nothing to lay out —
 * setup is a single screen hosting a horizontal pager — so the guard is the
 * whole component and the extra navigator is gone.
 */
export default function SetupScreenHost() {
  const { ready, isSignedIn } = useAuth()

  if (!ready) return null
  if (!isSignedIn) return <Redirect href={UNAUTHENTICATED} />

  return <SetupScreen />
}
