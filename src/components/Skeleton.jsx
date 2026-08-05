import { useEffect } from 'react'
import { StyleSheet, View } from 'react-native'
import Animated, {
  Easing,
  useAnimatedStyle,
  useSharedValue,
  withRepeat,
  withTiming,
} from 'react-native-reanimated'

import { colors, radii } from '../theme'

/**
 * A pulsing placeholder in the shape of the content that is coming.
 *
 * Preferred over a spinner because it keeps the layout the same size before and
 * after loading, so nothing jumps when the data lands. The pulse runs on the UI
 * thread via Reanimated, so it stays smooth even while the JS thread is busy
 * parsing the response.
 */
export default function Skeleton({ width, height, radius = radii.lg, style }) {
  const pulse = useSharedValue(0.45)

  useEffect(() => {
    pulse.value = withRepeat(
      withTiming(0.85, { duration: 750, easing: Easing.inOut(Easing.quad) }),
      -1,
      true,
    )
  }, [pulse])

  const animated = useAnimatedStyle(() => ({ opacity: pulse.value }))

  return (
    <Animated.View
      style={[styles.base, { width, height, borderRadius: radius }, animated, style]}
    />
  )
}

/** Home's section rail: node in the gutter, slim card beside it. */
export function ChapterSkeleton({ count = 4 }) {
  return (
    <View>
      {Array.from({ length: count }, (_, i) => (
        <View key={i} style={styles.railRow}>
          <Skeleton width={30} height={30} radius={radii.pill} />
          <View style={styles.railCard}>
            {/* Descending widths read as section names of differing length
                rather than a stack of identical bars. */}
            <Skeleton width={`${64 - i * 7}%`} height={16} radius={6} />
            <Skeleton width="34%" height={11} radius={6} style={styles.gap} />
          </View>
        </View>
      ))}
    </View>
  )
}

/** The alphabet grid, at the tile size and column count the real one uses. */
export function AlphabetSkeleton({ columns = 5, count = 20 }) {
  return (
    <View>
      {/* Stands in for the "tap a letter to hear it" line, so the grid does not
          jump down the moment the letters land. */}
      <Skeleton width={150} height={13} radius={6} style={styles.alphabetHint} />

      <View style={styles.alphabetGrid}>
        {Array.from({ length: count }, (_, i) => (
          <View key={i} style={[styles.alphabetCell, { width: `${100 / columns}%` }]}>
            <Skeleton height={78} radius={radii.lg} />
          </View>
        ))}
      </View>
    </View>
  )
}

/** Compact list rows, for any simple ranked list. */
export function RowSkeleton({ count = 6 }) {
  return (
    <View>
      {Array.from({ length: count }, (_, i) => (
        <View key={i} style={styles.row}>
          <Skeleton width={22} height={16} radius={6} />
          {/* Descending widths read as names of differing length rather than a
              stack of identical bars. */}
          <Skeleton width={`${58 - i * 4}%`} height={15} radius={6} />
          <View style={styles.spacer} />
          <Skeleton width={48} height={14} radius={6} />
        </View>
      ))}
    </View>
  )
}

/**
 * The league screen: gradient banner, promotion card, podium, then the pack.
 *
 * Measured against the real page rather than approximated — 84pt tier art, a
 * 66/54pt podium, 26pt rank chips, 40pt avatars, the same paddings — so the
 * layout does not resize under the learner when the data lands. A skeleton that
 * is merely "some grey boxes" causes exactly the jump it exists to prevent.
 */
export function LeagueSkeleton({ count = 5 }) {
  return (
    <View>
      <View style={styles.leagueBanner}>
        <Skeleton width={84} height={84} radius={radii.pill} />
        <Skeleton width={170} height={24} radius={8} style={styles.gap} />
        <View style={styles.leagueFacts}>
          <Skeleton width={92} height={24} radius={radii.pill} />
          <Skeleton width={92} height={24} radius={radii.pill} />
        </View>
      </View>

      {/* Promotion card. */}
      <View style={styles.leagueCard}>
        <Skeleton width={110} height={15} radius={6} />
        <Skeleton width="88%" height={13} radius={6} style={styles.gapSmall} />
        <Skeleton width="100%" height={9} radius={radii.pill} style={styles.gap} />
      </View>

      {/* Podium: second, first, third, at their real heights. */}
      <View style={styles.podium}>
        {[2, 1, 3].map((rank) => (
          <View key={rank} style={styles.podiumSlot}>
            <Skeleton
              width={rank === 1 ? 66 : 54}
              height={rank === 1 ? 66 : 54}
              radius={radii.pill}
            />
            <Skeleton width={54} height={12} radius={6} style={styles.gapSmall} />
            <Skeleton width={38} height={11} radius={6} style={styles.gapTiny} />
            <Skeleton
              width="100%"
              height={rank === 1 ? 74 : rank === 2 ? 56 : 44}
              radius={0}
              style={styles.plinth}
            />
          </View>
        ))}
      </View>

      <Skeleton width={140} height={12} radius={6} style={styles.sectionLabel} />

      {Array.from({ length: count }, (_, i) => (
        <View key={i} style={styles.leagueRow}>
          <Skeleton width={26} height={26} radius={radii.pill} />
          <Skeleton width={40} height={40} radius={radii.pill} />
          <Skeleton width={`${52 - i * 4}%`} height={15} radius={6} />
          <View style={styles.spacer} />
          <Skeleton width={46} height={14} radius={6} />
        </View>
      ))}
    </View>
  )
}

/**
 * The profile header card and the badge ladders below it.
 *
 * Sized against the real screen: the gradient header is 32pt of padding around
 * a 94pt avatar, the name and the email, then three badge cards with 76×87pt
 * artwork and a progress bar. The badge rows are the tallest thing on the page,
 * so leaving them out of the skeleton is what made the whole screen lurch when
 * game state arrived.
 */
export function ProfileSkeleton() {
  return (
    <View>
      <View style={styles.profileHead}>
        <Skeleton width={94} height={94} radius={radii.pill} />
        <Skeleton width={160} height={22} radius={8} style={styles.gap} />
        <Skeleton width={200} height={14} radius={6} style={styles.gapSmall} />
      </View>

      <Skeleton width={72} height={12} radius={6} style={styles.sectionLabel} />

      {Array.from({ length: 3 }, (_, i) => (
        <View key={i} style={styles.badgeCard}>
          {/* The artwork is 160×183, so a square placeholder stands the card at
              the wrong height and it settles by ~11pt when the art lands. */}
          <Skeleton width={76} height={87} radius={radii.lg} />
          <View style={styles.badgeCopy}>
            <Skeleton width="46%" height={13} radius={6} />
            <Skeleton width="66%" height={15} radius={6} style={styles.gapSmall} />
            <Skeleton width="100%" height={10} radius={radii.pill} style={styles.gap} />
          </View>
        </View>
      ))}
    </View>
  )
}

/**
 * The avatar editor: preview card, the row of attribute pills, then the option
 * grid at its real four-per-row tile size.
 */
export function AvatarEditorSkeleton({ tiles = 12 }) {
  return (
    <View>
      <View style={styles.avatarPreview}>
        <Skeleton width={124} height={124} radius={radii.pill} />
        <Skeleton width={180} height={20} radius={8} style={styles.gap} />
        <Skeleton width="86%" height={13} radius={6} style={styles.gapSmall} />
      </View>

      <View style={styles.avatarTabs}>
        {[64, 52, 92, 58, 78].map((width, i) => (
          <Skeleton key={i} width={width} height={34} radius={radii.pill} />
        ))}
      </View>

      <View style={styles.avatarGrid}>
        {Array.from({ length: tiles }, (_, i) => (
          <View key={i} style={styles.avatarCell}>
            <Skeleton height={76} radius={radii.lg} />
          </View>
        ))}
      </View>
    </View>
  )
}

/**
 * A trivia topic row: 48pt tinted icon tile, title, description, meta line.
 */
export function TopicSkeleton({ count = 4 }) {
  return (
    <View>
      {Array.from({ length: count }, (_, i) => (
        <View key={i} style={styles.topicCard}>
          <Skeleton width={48} height={48} radius={radii.lg} />
          <View style={styles.topicCopy}>
            <Skeleton width={`${58 - i * 6}%`} height={16} radius={6} />
            <Skeleton width="92%" height={13} radius={6} style={styles.gapSmall} />
            <Skeleton width="40%" height={11} radius={6} style={styles.gapSmall} />
          </View>
          <Skeleton width={20} height={20} radius={6} />
        </View>
      ))}
    </View>
  )
}

/**
 * A question and its answer tiles, for the lesson player and a trivia round.
 *
 * The instruction line, the mascot strip and the prompt all sit above the
 * options in the real screen; leaving them out made the options load in at the
 * wrong height and then jump.
 */
export function ExerciseSkeleton({ options = 4, mascot = true, chip = false }) {
  return (
    <View style={styles.exercise}>
      {chip ? (
        <Skeleton width={140} height={22} radius={radii.pill} style={styles.gapBottom} />
      ) : (
        <Skeleton width="52%" height={15} radius={6} style={styles.gapBottom} />
      )}

      {/* The rotating encouragement pill. */}
      {mascot ? (
        <View style={styles.mascotRow}>
          <Skeleton width={36} height={36} radius={radii.pill} />
          <Skeleton width="62%" height={13} radius={6} />
        </View>
      ) : null}

      {/* The word or sentence being asked about. */}
      <Skeleton width="74%" height={26} radius={8} style={styles.promptGap} />

      {Array.from({ length: options }, (_, i) => (
        <Skeleton key={i} width="100%" height={54} radius={radii.lg} style={styles.optionGap} />
      ))}
    </View>
  )
}

/**
 * A daily quest card: icon, title and description, reward chips, bar.
 */
export function QuestSkeleton({ count = 3 }) {
  return (
    <View>
      {Array.from({ length: count }, (_, i) => (
        <View key={i} style={styles.questCard}>
          <View style={styles.questHead}>
            <Skeleton width={36} height={36} radius={radii.pill} />
            <View style={styles.questCopy}>
              <Skeleton width={`${62 - i * 8}%`} height={15} radius={6} />
              <Skeleton width="78%" height={12} radius={6} style={styles.gapSmall} />
            </View>
            <View style={styles.questPay}>
              <Skeleton width={44} height={19} radius={radii.pill} />
              <Skeleton width={44} height={19} radius={radii.pill} style={styles.gapTiny} />
            </View>
          </View>
          <View style={styles.questTrackRow}>
            <Skeleton width="86%" height={8} radius={radii.pill} />
            <Skeleton width={30} height={11} radius={6} />
          </View>
        </View>
      ))}
    </View>
  )
}

/**
 * The daily chest panel: round badge, two lines of copy, full-width button.
 */
export function ChestSkeleton() {
  return (
    <View style={styles.chestCard}>
      <Skeleton width={68} height={68} radius={radii.pill} />
      <Skeleton width="72%" height={18} radius={8} style={styles.gap} />
      <Skeleton width="88%" height={13} radius={6} style={styles.gapSmall} />
      <Skeleton width="100%" height={56} radius={radii.lg} style={styles.chestAction} />
    </View>
  )
}

/**
 * A shop panel: 46pt icon, title and subtitle, price, then a full-width button.
 */
export function ShopSkeleton({ count = 3 }) {
  return (
    <View>
      {Array.from({ length: count }, (_, i) => (
        <View key={i} style={styles.shopCard}>
          <View style={styles.shopTop}>
            <Skeleton width={46} height={46} radius={radii.pill} />
            <View style={styles.shopCopy}>
              <Skeleton width={`${56 - i * 6}%`} height={16} radius={6} />
              <Skeleton width="44%" height={13} radius={6} style={styles.gapSmall} />
            </View>
            <Skeleton width={54} height={16} radius={6} />
          </View>
          <Skeleton width="100%" height={56} radius={radii.lg} style={styles.gap} />
        </View>
      ))}
    </View>
  )
}

/**
 * A unit banner and the snaking lesson path beneath it.
 *
 * The path is the whole screen, and standing it in with flat cards was the
 * worst mismatch in the app: the real one leaves 138pt between nodes, so the
 * page grew by hundreds of points the moment the lessons arrived.
 */
export function UnitPathSkeleton({ units = 1, nodes = 4, banner = true }) {
  return (
    <View style={styles.unitWrap}>
      {Array.from({ length: units }, (_, u) => (
        <View key={u} style={styles.unit}>
          {banner ? <Skeleton width="100%" height={72} radius={radii.xl} /> : null}

          <View style={styles.path}>
            {Array.from({ length: nodes }, (_, i) => (
              <View
                key={i}
                style={[
                  styles.pathNode,
                  // Centre, right, centre, left — the same order the real path
                  // walks, so the column does not visibly re-flow.
                  { alignSelf: ['center', 'flex-end', 'center', 'flex-start'][i % 4] },
                ]}
              >
                <Skeleton width={84} height={84} radius={radii.pill} />
              </View>
            ))}
          </View>
        </View>
      ))}
    </View>
  )
}

const styles = StyleSheet.create({
  base: {
    backgroundColor: colors.secondary[200],
  },
  railRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 16,
  },
  railCard: {
    flex: 1,
    backgroundColor: colors.white,
    borderRadius: radii.lg,
    paddingHorizontal: 16,
    paddingVertical: 13,
    marginBottom: 8,
  },
  gap: {
    marginTop: 8,
  },
  gapSmall: {
    marginTop: 5,
  },
  gapTiny: {
    marginTop: 4,
  },
  gapBottom: {
    marginBottom: 16,
  },
  leagueBanner: {
    alignItems: 'center',
    backgroundColor: colors.white,
    borderRadius: 26,
    paddingVertical: 24,
    paddingHorizontal: 16,
  },
  leagueFacts: {
    flexDirection: 'row',
    gap: 8,
    marginTop: 16,
  },
  leagueCard: {
    backgroundColor: colors.white,
    borderRadius: radii.xl,
    padding: 16,
    marginTop: 16,
  },
  podium: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    justifyContent: 'center',
    gap: 8,
    marginTop: 32,
  },
  podiumSlot: {
    flex: 1,
    alignItems: 'center',
  },
  plinth: {
    marginTop: 6,
    borderTopLeftRadius: radii.md,
    borderTopRightRadius: radii.md,
  },
  topicCard: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 16,
    backgroundColor: colors.white,
    borderRadius: radii.xl,
    padding: 16,
    marginBottom: 8,
  },
  topicCopy: {
    flex: 1,
  },
  exercise: {
    paddingHorizontal: 24,
    paddingTop: 24,
  },
  mascotRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: colors.white,
    borderRadius: radii.pill,
    padding: 5,
    paddingRight: 16,
    marginBottom: 24,
  },
  promptGap: {
    marginBottom: 24,
  },
  optionGap: {
    marginBottom: 8,
  },
  questCard: {
    backgroundColor: colors.white,
    borderRadius: radii.xl,
    padding: 16,
    marginBottom: 8,
  },
  questHead: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  questCopy: {
    flex: 1,
  },
  questPay: {
    alignItems: 'flex-end',
  },
  questTrackRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 8,
    marginTop: 8,
  },
  chestCard: {
    backgroundColor: colors.white,
    borderRadius: radii.xl,
    padding: 24,
    alignItems: 'center',
  },
  chestAction: {
    marginTop: 24,
  },
  shopCard: {
    backgroundColor: colors.white,
    borderRadius: radii.xl,
    padding: 16,
    marginBottom: 8,
  },
  shopTop: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 16,
  },
  shopCopy: {
    flex: 1,
  },
  unitWrap: {
    width: '100%',
    alignItems: 'center',
  },
  unit: {
    width: '100%',
    maxWidth: 340,
    marginBottom: 32,
  },
  path: {
    marginTop: 8,
  },
  // Matches SnakePath's NODE_SPACING, so the column stands at the height it
  // will actually be.
  pathNode: {
    height: 138,
    justifyContent: 'center',
  },

  leagueHero: {
    alignItems: 'center',
    marginBottom: 24,
  },
  leagueRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: colors.white,
    borderRadius: radii.lg,
    paddingHorizontal: 8,
    paddingVertical: 10,
    marginBottom: 8,
  },
  sectionLabel: {
    marginTop: 32,
    marginBottom: 8,
  },
  badgeCard: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 16,
    backgroundColor: colors.white,
    borderRadius: radii.xl,
    padding: 16,
    marginBottom: 8,
  },
  badgeCopy: {
    flex: 1,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 16,
    backgroundColor: colors.white,
    borderRadius: radii.lg,
    paddingHorizontal: 16,
    paddingVertical: 17,
    marginBottom: 8,
  },
  spacer: {
    flex: 1,
  },
  panel: {
    marginBottom: 8,
  },
  // Stands in for the gradient header card, at its real padding, so the badges
  // below do not slide up when the profile lands.
  profileHead: {
    alignItems: 'center',
    backgroundColor: colors.white,
    borderRadius: 26,
    paddingVertical: 32,
    paddingHorizontal: 24,
    marginBottom: 8,
  },
  grid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  gridCell: {
    marginBottom: 0,
  },
  avatarPreview: {
    alignItems: 'center',
    backgroundColor: colors.white,
    borderRadius: 26,
    padding: 24,
  },
  avatarTabs: {
    flexDirection: 'row',
    gap: 8,
    paddingVertical: 16,
  },
  avatarGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    marginHorizontal: -4,
  },
  avatarCell: {
    width: '25%',
    padding: 4,
  },
  // Margin rather than gap: percentage-width cells plus a flex gap overflow the
  // row and drop the last tile onto its own line.
  alphabetGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    marginHorizontal: -4,
  },
  alphabetCell: {
    padding: 4,
  },
  alphabetHint: {
    marginBottom: 16,
  },
})
