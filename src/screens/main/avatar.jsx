import { memo, useCallback, useEffect, useMemo, useState } from 'react'
import { FlatList, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native'
import { useSafeAreaInsets } from 'react-native-safe-area-context'
import { useFocusEffect, useRouter } from '@/navigation'
import { SvgXml } from 'react-native-svg'
import Animated, { FadeIn } from 'react-native-reanimated'
import Check from 'lucide-react-native/icons/check'
import ChevronLeft from 'lucide-react-native/icons/chevron-left'
import Gem from 'lucide-react-native/icons/gem'
import Lock from 'lucide-react-native/icons/lock'

import Avatar from '@/components/Avatar'
import Button from '@/components/Button'
import ConfirmDialog from '@/components/ConfirmDialog'
import QueryState from '@/components/QueryState'
import { AvatarEditorSkeleton } from '@/components/Skeleton'
import { TAB_BAR_OVERHANG } from '@/components/TabBar'
import { useAuth } from '@/auth/AuthContext'
import {
  useAvatar,
  useAvatarOptions,
  useSaveAvatar,
  useUnlockAvatarOption,
} from '@/hooks/useAvatar'
import { useGameState } from '@/hooks/useGame'
import { DEFAULT_AVATAR_CONFIG } from '@/lib/avatar'
import { thumbnailSvg } from '@/lib/avatarThumbnails'
import { useGoBack } from '@/lib/useGoBack'
import { useTranslate } from '@/lib/i18n'
import { useLayout } from '@/lib/responsive'
import { colors, fonts, radii, shadows, spacing } from '@/theme'

/**
 * The same seven attributes the web's CreateAvatar edits, in the same order.
 * `isColor` picks the tile: a colour is its own swatch, everything else needs a
 * rendered face to be recognisable.
 */
const TABS = [
  { key: 'skinColor', labelKey: 'm_tab_face', isColor: true },
  { key: 'hair', labelKey: 'm_tab_hair', isColor: false },
  { key: 'hairColor', labelKey: 'm_tab_haircolor', isColor: true },
  { key: 'eyes', labelKey: 'm_tab_eyes', isColor: false },
  { key: 'eyebrows', labelKey: 'm_tab_brows', isColor: false },
  { key: 'mouth', labelKey: 'm_tab_mouth', isColor: false },
  { key: 'backgroundColor', labelKey: 'm_tab_bg', isColor: true },
]

/** Four tiles a row, matching the web grid. */
const COLUMNS = 4

/** Space between tiles, split either side of each cell. */
const CELL_GAP = 8

/** The selected-tile ring: its thickness, and the gap it leaves around the tile. */
const RING_WIDTH = 2
const RING_GAP = 2

/**
 * A saved avatar leaves fields it never customised as null. Spreading those
 * straight over the defaults lets the null win and renders a bald, mouthless
 * face, so only real values are merged.
 */
function withDefaults(saved) {
  const merged = { ...DEFAULT_AVATAR_CONFIG }
  if (!saved) return merged

  for (const key of Object.keys(DEFAULT_AVATAR_CONFIG)) {
    if (saved[key] !== null && saved[key] !== undefined) merged[key] = saved[key]
  }

  return merged
}

/** Only the fields the backend stores, so nothing extra is posted. */
function payload(config) {
  return TABS.reduce((body, tab) => ({ ...body, [tab.key]: config[tab.key] ?? null }), {})
}

/**
 * One option in the grid.
 *
 * The face is drawn by `SvgXml`, which builds a few hundred native shape nodes
 * per tile, and this grid holds up to forty-five of them. That view-tree cost —
 * not generating the faces, which measures 0.2ms each — is what makes the
 * editor the slowest screen in the app to open.
 *
 * The Expo build avoided it by handing the same markup to `expo-image` as a
 * data URI and letting it decode natively to a cached bitmap. Nothing in a bare
 * project rasterises SVG, so that route is closed and this is now the only way
 * to draw a face (see `lib/avatarThumbnails.js`).
 *
 * Memoisation is what keeps it usable: a tap, or a mutation's pending flag,
 * re-renders one tile rather than reconciling every tile on the screen.
 */
const OptionTile = memo(function OptionTile({
  value,
  priceGems,
  locked,
  selected,
  isColor,
  thumbnail,
  size,
  disabled,
  onPress,
}) {
  // Every box here is an explicit pixel square, computed once from the content
  // width. Percentage widths plus `aspectRatio` left the tiles sizing off
  // whatever their content happened to measure, which is what let the face fill
  // three quarters of its box and the padlock sit in a band underneath it
  // instead of over it.
  const box = { width: size, height: size }

  return (
    <View style={[styles.cell, { width: size + CELL_GAP }]}>
      <Pressable
        accessibilityRole="button"
        accessibilityLabel={locked ? `${value}, locked, ${priceGems} gems` : value}
        accessibilityState={{ selected, disabled }}
        disabled={disabled}
        onPress={() => onPress(value)}
        // The ring sits outside the tile rather than as a border on it, so a
        // selected swatch is not visibly smaller than its neighbours — the same
        // ring-offset the web uses.
        style={({ pressed }) => [
          styles.ring,
          selected && styles.ringOn,
          pressed && styles.pressed,
        ]}
      >
        <View
          style={[styles.tile, box, isColor ? { backgroundColor: `#${value}` } : styles.tileFace]}
        >
          {isColor || !thumbnail ? null : (
            <SvgXml xml={thumbnail} width={size} height={size} />
          )}

          {/* Covers the whole tile, as on the web: a translucent scrim with the
              padlock and the price centred on it. Written out rather than
              spread from `absoluteFillObject` and left to elevation to order,
              because that is what produced a small opaque box floating in the
              middle of the swatch instead of a wash over all of it. */}
          {locked ? (
            <View style={[styles.overlay, box]}>
              <Lock size={16} color={colors.white} strokeWidth={2.4} />
              <View style={styles.lockPrice}>
                <Gem size={11} color={colors.white} strokeWidth={2.4} />
                <Text style={styles.lockPriceText}>{priceGems}</Text>
              </View>
            </View>
          ) : selected ? (
            <View style={[styles.overlay, styles.overlayClear, box]}>
              <Check size={22} color={colors.white} strokeWidth={3} />
            </View>
          ) : null}
        </View>
      </Pressable>
    </View>
  )
})

export default function AvatarEditor() {
  const insets = useSafeAreaInsets()
  const router = useRouter()
  const goBack = useGoBack('/profile')
  const { user } = useAuth()
  const t = useTranslate()
  const { contentWidth, size } = useLayout()

  const avatarQuery = useAvatar()
  const optionsQuery = useAvatarOptions()
  const { data: state } = useGameState()

  /** The face being edited. Null until the saved one has been copied in. */
  const [config, setConfig] = useState(null)
  const [activeTab, setActiveTab] = useState(TABS[0].key)
  /** The locked option waiting on a "spend the gems?" answer. */
  const [pendingUnlock, setPendingUnlock] = useState(null)
  // One number the whole grid is built from. The list is `contentWidth` wide
  // with `spacing.lg` of padding either side; the rest divides into four.
  const tileSize = Math.floor((contentWidth - spacing.lg * 2) / COLUMNS) - CELL_GAP

  const seed = user?.id ? String(user.id) : ''
  const options = optionsQuery.data ?? {}
  const tab = TABS.find((entry) => entry.key === activeTab) ?? TABS[0]
  const optionsForTab = options[activeTab] ?? []

  // Every screen in this group is one entry in a single tab navigator, so this
  // component stays mounted after you leave it. Without clearing the draft on
  // the way out, opening the editor a second time shows the face you had last
  // time rather than the one that is actually saved.
  useFocusEffect(
    useCallback(() => {
      return () => setConfig(null)
    }, []),
  )

  // Seeded from the saved config. Guarded on `config === null` rather than on
  // the query, so a background refetch never throws away edits in progress.
  useEffect(() => {
    if (!avatarQuery.isPending && config === null) setConfig(withDefaults(avatarQuery.data))
  }, [avatarQuery.isPending, avatarQuery.data, config])

  /**
   * The visible tab's thumbnails. Built inline rather than in a background
   * queue: generating a face measures 0.2ms, so all forty-five cost about 7ms
   * together — cheaper than the bookkeeping that scheduling them would need.
   * The expensive half is mounting them, which the memoised tiles keep to the
   * one tile that actually changed.
   */
  const thumbnails = useMemo(() => {
    if (!config || tab.isColor) return {}

    const map = {}
    for (const option of optionsForTab) {
      const svg = thumbnailSvg({ attribute: activeTab, value: option.value, config, seed })
      if (svg) map[option.value] = svg
    }

    return map
  }, [config, tab.isColor, optionsForTab, activeTab, seed])

  const unlock = useUnlockAvatarOption()
  const save = useSaveAvatar()

  const busy = save.isPending || unlock.isPending

  const chooseOption = useCallback(
    (value) => {
      const option = (options[activeTab] ?? []).find((entry) => entry.value === value)
      if (!option) return

      if (option.unlocked) {
        setConfig((current) => ({ ...current, [activeTab]: value }))
        return
      }

      setPendingUnlock({ attributeType: activeTab, value, priceGems: option.priceGems })
    },
    [options, activeTab],
  )

  const renderItem = useCallback(
    ({ item }) => (
      <OptionTile
        value={item.value}
        priceGems={item.priceGems}
        locked={!item.unlocked}
        selected={config?.[activeTab] === item.value}
        isColor={tab.isColor}
        thumbnail={thumbnails[item.value]}
        size={tileSize}
        disabled={busy}
        onPress={chooseOption}
      />
    ),
    [config, activeTab, tab.isColor, thumbnails, tileSize, busy, chooseOption],
  )

  const header = (
    <>
      <Animated.View entering={FadeIn.duration(260)} style={styles.preview}>
        <Avatar
          config={config}
          seed={user?.id}
          name={user?.fullName}
          size={size(124)}
          ring={colors.primary[200]}
        />
        <Text style={[styles.previewTitle, { fontSize: size(20) }]}>{t('m_avatar_express')}</Text>
        <Text style={styles.previewBody}>
          {t('m_avatar_body')}
        </Text>
      </Animated.View>

      <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.tabs}>
        {TABS.map((entry) => {
          const active = entry.key === activeTab

          return (
            <Pressable
              key={entry.key}
              accessibilityRole="tab"
              accessibilityState={{ selected: active }}
              accessibilityLabel={t(entry.labelKey)}
              onPress={() => setActiveTab(entry.key)}
              style={({ pressed }) => [styles.tab, active && styles.tabActive, pressed && styles.pressed]}
            >
              <Text style={[styles.tabLabel, active && styles.tabLabelActive]}>{t(entry.labelKey)}</Text>
            </Pressable>
          )
        })}
      </ScrollView>
    </>
  )

  return (
    <View style={styles.screen}>
      <View style={[styles.topBar, { paddingTop: insets.top + spacing.sm, width: contentWidth }]}>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Back to profile"
          onPress={goBack}
          hitSlop={10}
          style={({ pressed }) => [styles.back, pressed && styles.pressed]}
        >
          <ChevronLeft size={20} color={colors.secondary[600]} strokeWidth={2.4} />
        </Pressable>

        <Text style={styles.topTitle}>{t('m_avatar_title')}</Text>

        {/* What is in the wallet, because half this screen costs gems. */}
        <View style={styles.wallet}>
          <Gem size={14} color={colors.accent[500]} strokeWidth={2.4} />
          <Text style={styles.walletValue}>{state?.gems ?? '–'}</Text>
        </View>
      </View>

      <QueryState
        query={optionsQuery}
        skeleton={<AvatarEditorSkeleton />}
        errorTitle={t('m_avatar_opt_err')}
      >
        {() =>
          config === null ? (
            <AvatarEditorSkeleton />
          ) : (
            /* A FlatList rather than a mapped grid inside a ScrollView. Hair
               alone has 45 options, and mounting 45 parsed SVGs at once — then
               keeping them mounted while you scroll — is what actually made
               this screen slow, more than the rendering did. Virtualised, only
               the handful on screen exist at any moment. */
            <FlatList
              data={optionsForTab}
              keyExtractor={(item) => item.value}
              renderItem={renderItem}
              numColumns={COLUMNS}
              ListHeaderComponent={header}
              ListFooterComponent={
                <Button
                  label={t('m_avatar_save')}
                  onPress={() =>
                save.mutate(payload(config), { onSuccess: () => router.replace('/profile') })
              }
                  loading={save.isPending}
                  disabled={unlock.isPending}
                  style={styles.save}
                />
              }
              style={styles.grid}
              contentContainerStyle={[styles.list, { width: contentWidth, alignSelf: 'center' }]}
              showsVerticalScrollIndicator={false}
              initialNumToRender={12}
              maxToRenderPerBatch={8}
              windowSize={5}
              removeClippedSubviews
            />
          )
        }
      </QueryState>

      <ConfirmDialog
        visible={pendingUnlock !== null}
        title={t('m_avatar_unlock_t')}
        body={t('m_avatar_unlock_b', { n: pendingUnlock?.priceGems ?? 0 })}
        confirmLabel={t('m_avatar_unlock')}
        cancelLabel={t('m_not_now')}
        loading={unlock.isPending}
        onConfirm={() => {
          const target = pendingUnlock
          setPendingUnlock(null)
          if (target) {
            unlock.mutate(
              { attributeType: target.attributeType, value: target.value },
              // Equipping what was just bought is this screen's job; the hook
              // only knows that the wallet and the catalogue moved.
              { onSuccess: () => setConfig((c) => ({ ...c, [target.attributeType]: target.value })) },
            )
          }
        }}
        onCancel={() => setPendingUnlock(null)}
      />
    </View>
  )
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: colors.secondary[50],
  },
  // Without this the list sizes to its content inside the flex column and the
  // last rows fall off the bottom of the screen instead of scrolling.
  grid: {
    flex: 1,
  },
  list: {
    paddingHorizontal: spacing.lg - CELL_GAP / 2,
    paddingBottom: spacing.xxl + TAB_BAR_OVERHANG,
  },
  topBar: {
    flexDirection: 'row',
    alignItems: 'center',
    alignSelf: 'center',
    gap: spacing.sm,
    paddingHorizontal: spacing.lg,
    paddingBottom: spacing.md,
  },
  back: {
    width: 38,
    height: 38,
    borderRadius: radii.pill,
    backgroundColor: colors.white,
    alignItems: 'center',
    justifyContent: 'center',
    ...shadows.card,
  },
  topTitle: {
    flex: 1,
    fontFamily: fonts.display,
    fontSize: 17,
    color: colors.secondary[900],
  },
  wallet: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    backgroundColor: colors.white,
    borderRadius: radii.pill,
    paddingHorizontal: spacing.sm,
    paddingVertical: 6,
    ...shadows.card,
  },
  walletValue: {
    fontFamily: fonts.bodyBold,
    fontSize: 13,
    color: colors.secondary[800],
  },
  pressed: {
    opacity: 0.7,
  },
  preview: {
    alignItems: 'center',
    backgroundColor: colors.white,
    borderRadius: 26,
    padding: spacing.lg,
    ...shadows.card,
  },
  previewTitle: {
    fontFamily: fonts.display,
    color: colors.secondary[900],
    marginTop: spacing.md,
  },
  previewBody: {
    fontFamily: fonts.body,
    fontSize: 13,
    lineHeight: 19,
    color: colors.secondary[400],
    textAlign: 'center',
    marginTop: 4,
  },
  tabs: {
    gap: spacing.sm,
    paddingVertical: spacing.md,
    // The row is a horizontal scroller inside a padded parent; without this the
    // last pill sits flush against the screen edge when scrolled to the end.
    paddingRight: spacing.sm,
  },
  tab: {
    borderRadius: radii.pill,
    backgroundColor: colors.primary[50],
    paddingHorizontal: 14,
    paddingVertical: 9,
  },
  tabActive: {
    backgroundColor: colors.primary[500],
  },
  tabLabel: {
    fontFamily: fonts.bodyBold,
    fontSize: 12.5,
    color: colors.primary[600],
  },
  tabLabelActive: {
    color: colors.white,
  },
  cell: {
    paddingHorizontal: CELL_GAP / 2,
    paddingBottom: CELL_GAP,
  },
  // Transparent until selected, so selecting does not resize the tile inside
  // it. This is the ring-offset gap in the web's design.
  //
  // The radius is the tile's plus everything between it and the ring — the
  // 2pt gap and the 2pt border itself. Anything else leaves the two curves
  // non-concentric, which shows up as the ring clipping the corners of the
  // swatch on one side and floating away from it on the other.
  ring: {
    borderRadius: radii.lg + RING_GAP + RING_WIDTH,
    borderWidth: RING_WIDTH,
    borderColor: 'transparent',
    padding: RING_GAP,
  },
  ringOn: {
    borderColor: colors.primary[500],
  },
  tile: {
    borderRadius: radii.lg,
    overflow: 'hidden',
    alignItems: 'center',
    justifyContent: 'center',
  },
  tileFace: {
    backgroundColor: colors.white,
  },
  overlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 1,
    // Light enough that the face or the colour underneath is still legible: a
    // locked option has to look worth buying, not blanked out.
    backgroundColor: 'rgba(0, 0, 0, 0.34)',
    // Both, because the two platforms decide sibling order differently, and the
    // image beneath is a native view.
    zIndex: 2,
    elevation: 2,
  },
  // The tick needs no wash behind it — nothing is being hidden.
  overlayClear: {
    backgroundColor: 'rgba(0, 0, 0, 0.18)',
  },
  lockPrice: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 2,
  },
  lockPriceText: {
    fontFamily: fonts.bodyBold,
    fontSize: 11,
    color: colors.white,
  },
  save: {
    marginTop: spacing.lg,
  },
})
