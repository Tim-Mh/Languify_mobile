import { createBottomTabNavigator } from '@react-navigation/bottom-tabs'
import Gift from 'lucide-react-native/icons/gift'
import Map from 'lucide-react-native/icons/map'
import Medal from 'lucide-react-native/icons/medal'
import Trophy from 'lucide-react-native/icons/trophy'
import UserRound from 'lucide-react-native/icons/user-round'

import { Redirect } from './router'
import TabBar from '../components/TabBar'
import { useAuth } from '../auth/AuthContext'
import { useTranslate } from '../lib/i18n'
import { needsSetup, SETUP_ROUTE } from '../auth/setupState'
import { UNAUTHENTICATED } from '../routes'
import { colors } from '../theme'

import AddCourseScreen from '../screens/main/add-course'
import AlphabetScreen from '../screens/main/alphabet'
import AvatarScreen from '../screens/main/avatar'
import ChapterScreen from '../screens/main/ChapterScreen'
import CoursesScreen from '../screens/main/courses'
import FamilyScreen from '../screens/main/family'
import HeartsScreen from '../screens/main/hearts'
import HomeScreen from '../screens/main/home'
import LeaderboardScreen from '../screens/main/leaderboard'
import LessonScreen from '../screens/main/LessonScreen'
import NotificationsScreen from '../screens/main/notifications'
import ProfileScreen from '../screens/main/profile'
import RewardsScreen from '../screens/main/rewards'
import ShopScreen from '../screens/main/shop'
import StreakScreen from '../screens/main/streak'
import TriviaRoundScreen from '../screens/main/TriviaRoundScreen'
import TriviaScreen from '../screens/main/trivia'

const Tab = createBottomTabNavigator()

/** Same Lucide set the web app uses, so the two products share iconography. */
const ICON_SIZE = 23
const CENTRE_ICON_SIZE = 27

export default function MainTabs() {
  const { ready, isSignedIn, user } = useAuth()
  // The bar reads `options.title`, so the tab labels are translated here rather
  // than inside TabBar — it never sees an untranslated string.
  const t = useTranslate()

  // The splash holds the screen until `ready`, so this only guards a token that
  // expired while the app was open, or a deep link straight into a tab.
  if (!ready) return null
  if (!isSignedIn) return <Redirect href={UNAUTHENTICATED} />

  // Someone who quit halfway through signup would otherwise land on a home
  // screen with no course on it.
  if (needsSetup(user)) return <Redirect href={SETUP_ROUTE} />

  return (
    <Tab.Navigator
      tabBar={(props) => <TabBar {...props} />}
      // Home is the centre button and the app's real starting point, so a reset
      // that lands on this navigator without naming a tab opens there.
      initialRouteName="home"
      // Every screen in the app is a sibling in this one navigator, so the
      // Android back button is this navigator's back. The default,
      // `firstRoute`, sends it to the first tab declared — which is why back
      // from anywhere at all landed on Leagues. `history` sends it to the
      // screen you were actually on before, which is what back means.
      backBehavior="history"
      screenOptions={{
        headerShown: false,
        sceneStyle: { backgroundColor: colors.secondary[50] },
      }}
    >
      {/* Order is the visual order. Learn sits third of five so it lands in the
          middle, raised out of the bar. */}
      <Tab.Screen
        name="leaderboard"
        component={LeaderboardScreen}
        options={{
          title: t('m_nav_leagues'),
          tabBarIcon: ({ color }) => <Medal size={ICON_SIZE} color={color} strokeWidth={2} />,
        }}
      />
      <Tab.Screen
        name="trivia"
        component={TriviaScreen}
        options={{
          title: t('m_nav_trivia'),
          tabBarIcon: ({ color }) => <Trophy size={ICON_SIZE} color={color} strokeWidth={2} />,
        }}
      />
      <Tab.Screen
        name="home"
        component={HomeScreen}
        options={{
          title: t('m_nav_learn'),
          tabBarCentre: true,
          tabBarIcon: ({ color }) => <Map size={CENTRE_ICON_SIZE} color={color} strokeWidth={2.2} />,
        }}
      />
      <Tab.Screen
        name="rewards"
        component={RewardsScreen}
        options={{
          title: t('m_nav_rewards'),
          tabBarIcon: ({ color }) => <Gift size={ICON_SIZE} color={color} strokeWidth={2} />,
        }}
      />
      <Tab.Screen
        name="profile"
        component={ProfileScreen}
        options={{
          title: t('m_nav_profile'),
          tabBarIcon: ({ color }) => <UserRound size={ICON_SIZE} color={color} strokeWidth={2} />,
        }}
      />

      {/* Reached from the gem counter on Home, not from the bar. */}
      <Tab.Screen
        name="shop"
        component={ShopScreen}
        options={{ title: 'Shop', tabBarHidden: true, tabBarParent: 'home' }}
      />
      {/* The avatar editor is opened from Profile, so Profile stays lit. */}
      <Tab.Screen
        name="avatar"
        component={AvatarScreen}
        options={{ title: 'Avatar', tabBarHidden: true, tabBarParent: 'profile' }}
      />
      {/* Reached from the Shop's plan section and from Profile. */}
      <Tab.Screen
        name="family"
        component={FamilyScreen}
        options={{ title: 'Family plan', tabBarHidden: true, tabBarParent: 'home' }}
      />

      {/* Pushed on top of a tab, so they must not become tabs themselves.
          `tabBarParent` is which tab stays lit while you are on one of these.
          Without it the bar shows five unlit tabs and stops telling you where
          you are the moment you open anything. All of these are reached from
          Learn, so that is the tab that owns them. */}
      <Tab.Screen
        name="chapter/[id]"
        component={ChapterScreen}
        options={{ tabBarHidden: true, tabBarParent: 'home' }}
      />
      {/* Reached from Profile now that the drawer is gone. */}
      <Tab.Screen
        name="courses"
        component={CoursesScreen}
        options={{ title: 'Courses', tabBarHidden: true, tabBarParent: 'profile' }}
      />
      {/* Settings, opened from Profile, so Profile stays lit. */}
      <Tab.Screen
        name="notifications"
        component={NotificationsScreen}
        options={{ title: 'Notifications', tabBarHidden: true, tabBarParent: 'profile' }}
      />
      {/* A wizard, like signup's: the bar would offer a way out mid-decision
          that leaves nothing saved. */}
      <Tab.Screen
        name="add-course"
        component={AddCourseScreen}
        options={{ title: 'Add a course', tabBarHidden: true, hideTabBar: true }}
      />
      <Tab.Screen
        name="alphabet"
        component={AlphabetScreen}
        options={{ title: 'Alphabet', tabBarHidden: true, tabBarParent: 'home' }}
      />
      <Tab.Screen
        name="streak"
        component={StreakScreen}
        options={{ title: 'Streak', tabBarHidden: true, tabBarParent: 'home' }}
      />
      <Tab.Screen
        name="hearts"
        component={HeartsScreen}
        options={{ title: 'Hearts', tabBarHidden: true, tabBarParent: 'home' }}
      />
      {/* A lesson or a trivia round takes over the screen: tabbing away
          mid-question would lose the answer, and the bar eats room the
          exercise needs. */}
      <Tab.Screen
        name="lesson/[id]"
        component={LessonScreen}
        options={{ tabBarHidden: true, hideTabBar: true }}
      />
      <Tab.Screen
        name="trivia/[topic]"
        component={TriviaRoundScreen}
        options={{ tabBarHidden: true, hideTabBar: true }}
      />
    </Tab.Navigator>
  )
}
