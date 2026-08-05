import { useCallback, useRef, useState } from 'react'
import {
  Image,
  Pressable,
  StyleSheet,
  Text,
  View,
  useWindowDimensions,
} from 'react-native'
import { useSafeAreaInsets } from 'react-native-safe-area-context'
import { useRouter } from '@/navigation'
import Animated, {
  Extrapolation,
  interpolate,
  runOnJS,
  useAnimatedReaction,
  useAnimatedScrollHandler,
  useAnimatedStyle,
  useSharedValue,
} from 'react-native-reanimated'

import Button from '@/components/Button'
import slides from '@/onboardingSlides'
import { useTranslate } from '@/lib/i18n'
import { useLayout } from '@/lib/responsive'
import { colors, fonts, radii, spacing } from '@/theme'
import { AFTER_ONBOARDING, HAS_ACCOUNT } from '@/routes'

const LAST_INDEX = slides.length - 1

function Slide({ slide, index, scrollX, width, art, titleSize }) {
  const t = useTranslate()
  // Art and copy drift at different rates as you swipe, which gives the pages
  // a little depth instead of moving as one flat sheet.
  const artStyle = useAnimatedStyle(() => {
    const range = [(index - 1) * width, index * width, (index + 1) * width]
    return {
      transform: [
        { translateX: interpolate(scrollX.value, range, [width * 0.3, 0, -width * 0.3], Extrapolation.CLAMP) },
        { scale: interpolate(scrollX.value, range, [0.82, 1, 0.82], Extrapolation.CLAMP) },
      ],
      opacity: interpolate(scrollX.value, range, [0, 1, 0], Extrapolation.CLAMP),
    }
  })

  const copyStyle = useAnimatedStyle(() => {
    const range = [(index - 1) * width, index * width, (index + 1) * width]
    return {
      transform: [
        { translateY: interpolate(scrollX.value, range, [26, 0, 26], Extrapolation.CLAMP) },
      ],
      opacity: interpolate(scrollX.value, range, [0, 1, 0], Extrapolation.CLAMP),
    }
  })

  return (
    <View style={[styles.slide, { width }]}>
      <View style={[styles.artArea, { height: art.area }]}>
        <View
          style={[
            styles.artBackdrop,
            { backgroundColor: slide.tint, width: art.backdrop, height: art.backdrop },
          ]}
        />
        <Animated.View style={artStyle}>
          <Image
            source={slide.image}
            style={{ width: art.image, height: art.image }}
            resizeMode="contain"
          />
        </Animated.View>
      </View>

      <Animated.View style={[styles.copy, copyStyle]}>
        <Text style={[styles.title, { fontSize: titleSize, lineHeight: titleSize * 1.26 }]}>
          {t(slide.titleKey)}
        </Text>
        <Text style={styles.body}>{t(slide.bodyKey)}</Text>
      </Animated.View>
    </View>
  )
}

function Dot({ index, scrollX, width }) {
  // The active dot stretches into a pill rather than just changing colour.
  const style = useAnimatedStyle(() => {
    const range = [(index - 1) * width, index * width, (index + 1) * width]
    return {
      width: interpolate(scrollX.value, range, [8, 26, 8], Extrapolation.CLAMP),
      opacity: interpolate(scrollX.value, range, [0.35, 1, 0.35], Extrapolation.CLAMP),
    }
  })

  return <Animated.View style={[styles.dot, style]} />
}

export default function Onboarding() {
  const t = useTranslate()
  const router = useRouter()
  const insets = useSafeAreaInsets()
  const { width } = useWindowDimensions()
  const { height, size, isShort } = useLayout()
  const listRef = useRef(null)
  const scrollX = useSharedValue(0)
  const [index, setIndex] = useState(0)

  // Art is sized from the screen, not fixed: on a short phone it has to give up
  // room so the title, body and button all stay above the fold.
  const art = (() => {
    const image = Math.round(Math.min(width * 0.5, height * (isShort ? 0.2 : 0.26)))
    return { image, backdrop: Math.round(image * 1.1), area: Math.round(image * 1.25) }
  })()

  const onScroll = useAnimatedScrollHandler({
    onScroll: (event) => {
      scrollX.value = event.contentOffset.x
    },
  })

  // Derived from the scroll position rather than onMomentumScrollEnd, which
  // does not fire for a slow drag-and-release on every platform and would
  // leave the button reading "Next" on the last slide.
  useAnimatedReaction(
    () => Math.round(scrollX.value / width),
    (page, previous) => {
      if (page !== previous && page >= 0 && page <= LAST_INDEX) {
        runOnJS(setIndex)(page)
      }
    },
    [width],
  )

  // Nothing is persisted here: the intro reappears on every launch until there
  // is an account to skip it for.
  const finish = useCallback(
    (destination = AFTER_ONBOARDING) => router.replace(destination),
    [router],
  )

  const goNext = useCallback(() => {
    if (index >= LAST_INDEX) {
      finish()
      return
    }
    listRef.current?.scrollToOffset({ offset: (index + 1) * width, animated: true })
  }, [finish, index, width])

  const onLastSlide = index === LAST_INDEX

  return (
    <View style={[styles.screen, { paddingTop: insets.top }]}>
      <View style={styles.header}>
        <Text style={styles.brand}>Languify</Text>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Skip onboarding"
          onPress={() => finish()}
          hitSlop={12}
          style={({ pressed }) => [styles.skip, pressed && styles.skipPressed]}
        >
          <Text style={styles.skipLabel}>{t('m_skip')}</Text>
        </Pressable>
      </View>

      <Animated.FlatList
        ref={listRef}
        data={slides}
        keyExtractor={(item) => item.key}
        renderItem={({ item, index: i }) => (
          <Slide
            slide={item}
            index={i}
            scrollX={scrollX}
            width={width}
            art={art}
            titleSize={size(30)}
          />
        )}
        horizontal
        pagingEnabled
        bounces={false}
        showsHorizontalScrollIndicator={false}
        onScroll={onScroll}
        scrollEventThrottle={16}
        getItemLayout={(_, i) => ({ length: width, offset: width * i, index: i })}
      />

      <View style={[styles.footer, { paddingBottom: insets.bottom + spacing.lg }]}>
        <View style={styles.dots}>
          {slides.map((slide, i) => (
            <Dot key={slide.key} index={i} scrollX={scrollX} width={width} />
          ))}
        </View>

        <Button label={onLastSlide ? 'Get started' : 'Next'} onPress={goNext} />

        <Pressable
          accessibilityRole="button"
          onPress={() => finish(HAS_ACCOUNT)}
          hitSlop={8}
          style={({ pressed }) => [styles.signIn, pressed && styles.skipPressed]}
        >
          <Text style={styles.signInLabel}>{t('m_onb_have_account')}</Text>
        </Pressable>
      </View>
    </View>
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
    justifyContent: 'space-between',
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
  },
  brand: {
    fontFamily: fonts.display,
    fontSize: 20,
    color: colors.secondary[900],
  },
  skip: {
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.xs,
  },
  skipPressed: {
    opacity: 0.55,
  },
  skipLabel: {
    fontFamily: fonts.bodySemi,
    fontSize: 15,
    color: colors.secondary[400],
  },
  slide: {
    flex: 1,
    alignItems: 'center',
    // Centres the art-plus-copy group. With `flex: 1` on the art area instead,
    // all the spare height collects between the copy and the footer.
    justifyContent: 'center',
  },
  artArea: {
    // Height comes from the screen (see `art` in the component) so the art sits
    // at the same place on every slide while still adapting to the device.
    width: '100%',
    alignItems: 'center',
    justifyContent: 'center',
  },
  artBackdrop: {
    position: 'absolute',
    borderRadius: radii.pill,
  },
  copy: {
    paddingHorizontal: spacing.xl,
    alignItems: 'center',
    minHeight: 190,
  },
  title: {
    fontFamily: fonts.display,
    textAlign: 'center',
    color: colors.secondary[900],
  },
  body: {
    fontFamily: fonts.body,
    fontSize: 16,
    lineHeight: 24,
    textAlign: 'center',
    color: colors.secondary[500],
    marginTop: spacing.md,
  },
  footer: {
    paddingHorizontal: spacing.lg,
  },
  dots: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    marginBottom: spacing.lg,
  },
  dot: {
    height: 8,
    borderRadius: radii.pill,
    backgroundColor: colors.primary[500],
  },
  signIn: {
    alignSelf: 'center',
    marginTop: spacing.md,
    paddingVertical: spacing.sm,
  },
  signInLabel: {
    fontFamily: fonts.bodyBold,
    fontSize: 15,
    color: colors.secondary[600],
  },
})
