import { Pressable, StyleSheet, Text, View } from 'react-native'
import { useSafeAreaInsets } from 'react-native-safe-area-context'
import Animated, { useAnimatedStyle, useSharedValue, withTiming } from 'react-native-reanimated'

import { colors, fonts, radii, shadows } from '../theme'

const AnimatedPressable = Animated.createAnimatedComponent(Pressable)

/** How far the centre button lifts out of the bar. */
const CENTRE_LIFT = 26
const CENTRE_SIZE = 62
const BAR_HEIGHT = 62

/**
 * How far the raised centre button hangs above the bar and over the screen.
 *
 * The bar itself sits below the scene, so a screen never has to reserve room for
 * it — but the circle overhangs into the scene and will sit on top of whatever
 * is at the bottom of the content. Every scrolling screen adds this to its
 * bottom padding so the last card can always be scrolled out from under it.
 */
export const TAB_BAR_OVERHANG = CENTRE_LIFT + 10

/**
 * Custom tab bar with the primary destination raised into a floating circle in
 * the middle, per the supplied design.
 *
 * Hand-written rather than styled from React Navigation's default because that
 * bar clips anything drawn outside its bounds, so the circle could not overhang
 * the top edge.
 */
export default function TabBar({ state, descriptors, navigation }) {
  const insets = useSafeAreaInsets()

  const activeRoute = state.routes[state.index]
  const activeOptions = descriptors[activeRoute?.key]?.options

  // Screens that take over completely (the lesson player) drop the bar entirely
  // rather than just dimming it.
  if (activeOptions?.hideTabBar) return null

  // Screens pushed on top of a tab (the chapter path, the shop, the alphabet)
  // are not tabs themselves, so nothing in the bar would light up while you are
  // on one. Each declares which tab it belongs to and that tab stays lit, so the
  // bar always says where in the app you are.
  const activeTabName = activeOptions?.tabBarParent ?? activeRoute?.name

  return (
    <View
      style={[
        styles.host,
        {
          // The bar owns the bottom inset so its background reaches the screen
          // edge, while the touch targets stay above the gesture area.
          paddingBottom: insets.bottom,
          height: BAR_HEIGHT + insets.bottom,
        },
      ]}
    >
      {state.routes.map((route, index) => {
        const { options } = descriptors[route.key]

        // Screens reached from somewhere else (Shop, from the gem counter)
        // still live in this navigator but must not appear in the bar. Keyed
        // off our own option, which a custom tabBar receives untouched.
        if (options.tabBarHidden) return null

        // Lit when you are on this tab *or* on a screen pushed from it.
        const focused = route.name === activeTabName
        // Whether this tab is literally the screen on show, which is the only
        // case where pressing it should do nothing. Pressing the lit tab from a
        // pushed screen is how you get back out to it.
        const isCurrentScreen = state.index === index
        const isCentre = options.tabBarCentre === true
        const color = focused ? colors.primary[600] : colors.secondary[300]

        const onPress = () => {
          const event = navigation.emit({ type: 'tabPress', target: route.key, canPreventDefault: true })
          if (!isCurrentScreen && !event.defaultPrevented) navigation.navigate(route.name)
        }

        if (isCentre) {
          return (
            <CentreTab
              key={route.key}
              label={options.title ?? route.name}
              // The icon takes the same white either way — it is the circle
              // behind it that says whether this tab is the one you are on.
              icon={options.tabBarIcon?.({ color: colors.white, focused })}
              focused={focused}
              onPress={onPress}
            />
          )
        }

        return (
          <Pressable
            key={route.key}
            accessibilityRole="tab"
            accessibilityState={{ selected: focused }}
            accessibilityLabel={options.title ?? route.name}
            onPress={onPress}
            style={({ pressed }) => [styles.tab, pressed && styles.pressed]}
          >
            {options.tabBarIcon?.({ color, focused })}
            <Text style={[styles.label, { color }]} numberOfLines={1}>
              {options.title ?? route.name}
            </Text>
          </Pressable>
        )
      })}
    </View>
  )
}

function CentreTab({ label, icon, focused, onPress }) {
  const press = useSharedValue(1)

  const style = useAnimatedStyle(() => ({ transform: [{ scale: press.value }] }))

  return (
    <View style={styles.centreSlot}>
      <AnimatedPressable
        accessibilityRole="tab"
        accessibilityState={{ selected: focused }}
        accessibilityLabel={label}
        onPress={onPress}
        onPressIn={() => {
          press.value = withTiming(0.92, { duration: 90 })
        }}
        onPressOut={() => {
          press.value = withTiming(1, { duration: 120 })
        }}
        style={[styles.centreButton, style]}
      >
        {/* The pale ring is what separates the circle from the bar behind it. */}
        <View style={[styles.centreRing, !focused && styles.centreRingIdle]} />
        {/* Unfocused is muted, not primary. Painted primary unconditionally, the
            raised circle read as "selected" from every other tab — so the bar
            appeared to say you were on Learn no matter where you were. */}
        <View style={[styles.centreFace, !focused && styles.centreFaceIdle]}>{icon}</View>
      </AnimatedPressable>
    </View>
  )
}

const styles = StyleSheet.create({
  host: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    backgroundColor: colors.white,
    borderTopWidth: 1,
    borderTopColor: colors.secondary[100],
  },
  tab: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 3,
    paddingTop: 9,
    height: BAR_HEIGHT,
  },
  pressed: {
    opacity: 0.6,
  },
  label: {
    fontFamily: fonts.bodyBold,
    fontSize: 10.5,
  },
  centreSlot: {
    flex: 1,
    alignItems: 'center',
  },
  centreButton: {
    // Pulled up out of the bar. The parent must not clip, which is why this is
    // a custom bar rather than the default one.
    marginTop: -CENTRE_LIFT,
    width: CENTRE_SIZE + 10,
    height: CENTRE_SIZE + 10,
    alignItems: 'center',
    justifyContent: 'center',
  },
  centreRing: {
    position: 'absolute',
    width: CENTRE_SIZE + 10,
    height: CENTRE_SIZE + 10,
    borderRadius: radii.pill,
    backgroundColor: colors.primary[100],
  },
  centreRingIdle: {
    backgroundColor: colors.secondary[100],
  },
  centreFace: {
    width: CENTRE_SIZE,
    height: CENTRE_SIZE,
    borderRadius: radii.pill,
    backgroundColor: colors.primary[500],
    alignItems: 'center',
    justifyContent: 'center',
    ...shadows.lifted,
  },
  centreFaceIdle: {
    backgroundColor: colors.secondary[300],
  },
})
