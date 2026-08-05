import { Image, ScrollView, StyleSheet, Text, View } from 'react-native'
import { useSafeAreaInsets } from 'react-native-safe-area-context'
import { LinearGradient } from 'react-native-linear-gradient'
import Animated, { FadeInDown } from 'react-native-reanimated'
import ChevronUp from 'lucide-react-native/icons/chevron-up'
import Crown from 'lucide-react-native/icons/crown'
import Timer from 'lucide-react-native/icons/timer'
import Users from 'lucide-react-native/icons/users'

import Avatar from '@/components/Avatar'
import QueryState from '@/components/QueryState'
import { LeagueSkeleton } from '@/components/Skeleton'
import StateView from '@/components/StateView'
import { TAB_BAR_OVERHANG } from '@/components/TabBar'
import { useLeague } from '@/hooks/useProfile'
import { useTranslate } from '@/lib/i18n'
import { useRefresh } from '@/lib/useRefresh'
import { useLayout } from '@/lib/responsive'
import { colors, fonts, radii, shadows, spacing } from '@/theme'

/** The web's `/public/league-badges` art, downscaled. Metro needs literal paths. */
const TIER_ART = {
  bronze: require('@assets/leagues/bronze.png'),
  silver: require('@assets/leagues/silver.png'),
  gold: require('@assets/leagues/gold.png'),
  sapphire: require('@assets/leagues/sapphire.png'),
  diamond: require('@assets/leagues/diamond.png'),
}

function tierArt(tierName) {
  return TIER_ART[String(tierName ?? '').toLowerCase()] ?? null
}

/** "2d 4h" / "4h 20m" / "12m" — enough precision to be useful, no ticking clock. */
function formatCountdown(totalSeconds) {
  if (!totalSeconds || totalSeconds <= 0) return 'any moment'

  const days = Math.floor(totalSeconds / 86400)
  const hours = Math.floor((totalSeconds % 86400) / 3600)
  const minutes = Math.floor((totalSeconds % 3600) / 60)

  if (days > 0) return `${days}d ${hours}h`
  if (hours > 0) return `${hours}h ${minutes}m`
  return `${minutes}m`
}

/** Gold, silver and bronze, for the podium and the medal rings. */
const MEDALS = {
  1: { ring: '#FFD700', chip: '#FFB800', text: colors.secondary[900] },
  2: { ring: '#C0C0C0', chip: '#B8B8B8', text: colors.secondary[900] },
  3: { ring: '#CD7F32', chip: '#B4692C', text: colors.white },
}

/** Visual order of the podium: runner-up, winner, third. */
const PODIUM_ORDER = [2, 1, 3]
const PLINTH_HEIGHT = { 1: 74, 2: 56, 3: 44 }

export default function Leaderboard() {
  const insets = useSafeAreaInsets()
  const refreshControl = useRefresh()
  const t = useTranslate()
  const { contentWidth, size } = useLayout()
  const query = useLeague()

  return (
    <ScrollView
      style={styles.screen}
      refreshControl={refreshControl}
      contentContainerStyle={[
        styles.content,
        { paddingTop: insets.top + spacing.lg, width: contentWidth, alignSelf: 'center' },
      ]}
    >
      {/* Children as a function, not JSX: the parent builds JSX children before
          QueryState decides what to render, so anything reading `league.members`
          would run while the data is still undefined. */}
      <QueryState
        query={query}
        skeleton={<LeagueSkeleton />}
        errorTitle={t('m_league_error')}
        inline
      >
        {(league) => {
          if (!league?.enrolled) {
            return (
              <StateView
                icon="empty"
                title={t('m_league_not_enrolled')}
                body={t('m_league_auto_join')}
                inline
              />
            )
          }

          const art = tierArt(league.tierName)
          const members = league.members ?? []
          const podium = PODIUM_ORDER.map((rank) =>
            members.find((member) => member.rank === rank),
          ).filter(Boolean)
          const rest = members.filter((member) => member.rank > 3)

          // Derived rather than hardcoded: the backend's promotion threshold is
          // whatever these two add up to, so changing it there needs no change
          // here.
          const threshold = (league.leaguePoints ?? 0) + (league.pointsToNextTier ?? 0)
          const pointsPercent =
            threshold > 0 ? Math.min(100, ((league.leaguePoints ?? 0) / threshold) * 100) : 0

          return (
            <>
              {/* The banner carries the tier and the two facts that frame the
                  week: how long is left, and how many people you are up against. */}
              <LinearGradient
                colors={[colors.secondary[700], colors.primary[600]]}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 1 }}
                style={styles.banner}
              >
                {art ? <Image source={art} style={styles.tierArt} resizeMode="contain" /> : null}

                <Text style={[styles.tierName, { fontSize: size(24) }]} numberOfLines={1}>
                  {t('m_league_banner', { tier: league.tierName })}
                </Text>

                <View style={styles.bannerFacts}>
                  <View style={styles.bannerFact}>
                    <Timer size={13} color="rgba(255,255,255,0.9)" strokeWidth={2.4} />
                    <Text style={styles.bannerFactText}>
                      {t('m_league_time_left', {
                        time: formatCountdown(league.secondsUntilRollover),
                      })}
                    </Text>
                  </View>
                  <View style={styles.bannerFact}>
                    <Users size={13} color="rgba(255,255,255,0.9)" strokeWidth={2.4} />
                    <Text style={styles.bannerFactText}>
                      {t('m_league_learners', { n: league.cohortSize })}
                    </Text>
                  </View>
                </View>
              </LinearGradient>

              {league.tierChangeNotice ? (
                <View style={styles.notice}>
                  <Text style={styles.noticeText}>{league.tierChangeNotice}</Text>
                </View>
              ) : null}

              {/* How close promotion is. The API has always sent these numbers
                  and the screen never used them, so the league read as a
                  scoreboard with no stakes attached to it. */}
              <View style={styles.progressCard}>
                <View style={styles.progressHead}>
                  <ChevronUp size={16} color={colors.primary[600]} strokeWidth={2.6} />
                  <Text style={styles.progressTitle}>
                    {league.isHighestTier ? t('m_league_top') : t('m_league_promotion2')}
                  </Text>
                  {league.currentUserRank ? (
                    <Text style={styles.yourRank}>
                      {t('m_league_you_are', { rank: league.currentUserRank })}
                    </Text>
                  ) : null}
                </View>

                <Text style={styles.progressBody}>
                  {league.isHighestTier
                    ? t('m_league_top_body')
                    : league.pointsToNextTier > 0
                      ? league.pointsToNextTier === 1
                        ? t('m_league_points_one')
                        : t('m_league_points_many', { n: league.pointsToNextTier })
                      : t('m_league_enough')}
                </Text>

                {!league.isHighestTier ? (
                  <View style={styles.progressTrack}>
                    <View
                      style={[styles.progressFill, { width: `${Math.max(3, pointsPercent)}%` }]}
                    />
                  </View>
                ) : null}
              </View>

              {members.length === 0 ? (
                <StateView
                  icon="empty"
                  title={t('m_league_nobody')}
                  body={t('m_league_empty_body')}
                  inline
                />
              ) : (
                <>
                  {/* The top three as an actual podium. A flat ranked list makes
                      first and third look like the same achievement. */}
                  {podium.length > 0 ? (
                    <View style={styles.podium}>
                      {podium.map((member) => {
                        const medal = MEDALS[member.rank]

                        return (
                          <Animated.View
                            key={member.userId}
                            entering={FadeInDown.delay(member.rank * 70).duration(320)}
                            style={styles.podiumSlot}
                          >
                            {member.rank === 1 ? (
                              <Crown
                                size={20}
                                color={medal.ring}
                                strokeWidth={2.4}
                                fill={medal.ring}
                              />
                            ) : null}

                            <Avatar
                              config={member.avatar}
                              seed={member.userId}
                              name={member.fullName}
                              size={member.rank === 1 ? 66 : 54}
                              ring={medal.ring}
                              style={styles.podiumAvatar}
                            />

                            <Text style={styles.podiumName} numberOfLines={1}>
                              {member.isCurrentUser
                                ? t('m_league_you_short')
                                : (member.fullName ?? t('m_learner'))}
                            </Text>
                            <Text style={styles.podiumXp}>{t('m_league_xp', { xp: member.weeklyXp })}</Text>

                            <View
                              style={[
                                styles.plinth,
                                { height: PLINTH_HEIGHT[member.rank], backgroundColor: medal.chip },
                                member.isCurrentUser && styles.plinthMe,
                              ]}
                            >
                              <Text style={[styles.plinthRank, { color: medal.text }]}>
                                {member.rank}
                              </Text>
                            </View>
                          </Animated.View>
                        )
                      })}
                    </View>
                  ) : null}

                  {rest.length > 0 ? (
                    <Text style={styles.sectionLabel}>{t('m_league_the_rest')}</Text>
                  ) : null}

                  {rest.map((member, index) => (
                    <Animated.View
                      key={member.userId}
                      entering={FadeInDown.delay(Math.min(index, 8) * 40).duration(280)}
                      style={[styles.row, member.isCurrentUser && styles.rowMe]}
                    >
                      <View style={styles.rankChip}>
                        <Text style={styles.rankText}>{member.rank}</Text>
                      </View>

                      <Avatar
                        config={member.avatar}
                        seed={member.userId}
                        name={member.fullName}
                        size={40}
                      />

                      <Text
                        style={[styles.name, member.isCurrentUser && styles.nameMe]}
                        numberOfLines={1}
                      >
                        {member.fullName ?? 'Learner'}
                        {member.isCurrentUser ? t('m_league_you_suffix') : ''}
                      </Text>

                      <Text style={styles.xp}>{t('m_league_xp', { xp: member.weeklyXp })}</Text>
                    </Animated.View>
                  ))}
                </>
              )}
            </>
          )
        }}
      </QueryState>
    </ScrollView>
  )
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: colors.secondary[50],
  },
  content: {
    paddingHorizontal: spacing.lg,
    // Clears the tab bar's raised centre button, which overhangs the scene.
    paddingBottom: spacing.xxl + TAB_BAR_OVERHANG,
  },
  banner: {
    borderRadius: 26,
    alignItems: 'center',
    paddingVertical: spacing.lg,
    paddingHorizontal: spacing.md,
    ...shadows.lifted,
  },
  tierArt: {
    width: 84,
    height: 84,
    marginBottom: spacing.sm,
  },
  tierName: {
    fontFamily: fonts.display,
    color: colors.white,
    textAlign: 'center',
  },
  bannerFacts: {
    flexDirection: 'row',
    gap: spacing.sm,
    marginTop: spacing.md,
  },
  bannerFact: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    backgroundColor: 'rgba(255,255,255,0.18)',
    borderRadius: radii.pill,
    paddingHorizontal: 10,
    paddingVertical: 5,
  },
  bannerFactText: {
    fontFamily: fonts.bodyBold,
    fontSize: 11.5,
    color: colors.white,
  },
  notice: {
    backgroundColor: colors.warning[50],
    borderWidth: 2,
    borderColor: colors.warning[300],
    borderRadius: radii.lg,
    padding: spacing.md,
    marginTop: spacing.md,
  },
  noticeText: {
    fontFamily: fonts.bodySemi,
    fontSize: 14,
    color: colors.warning[700],
  },
  progressCard: {
    backgroundColor: colors.white,
    borderRadius: radii.xl,
    padding: spacing.md,
    marginTop: spacing.md,
    ...shadows.card,
  },
  progressHead: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  progressTitle: {
    fontFamily: fonts.display,
    fontSize: 15.5,
    color: colors.secondary[900],
  },
  yourRank: {
    marginLeft: 'auto',
    fontFamily: fonts.bodyBold,
    fontSize: 12,
    color: colors.primary[600],
  },
  progressBody: {
    fontFamily: fonts.body,
    fontSize: 13,
    lineHeight: 19,
    color: colors.secondary[500],
    marginTop: 4,
  },
  progressTrack: {
    height: 9,
    borderRadius: radii.pill,
    backgroundColor: colors.secondary[100],
    overflow: 'hidden',
    marginTop: spacing.sm,
  },
  progressFill: {
    height: '100%',
    borderRadius: radii.pill,
    backgroundColor: colors.primary[500],
  },
  podium: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    justifyContent: 'center',
    gap: spacing.sm,
    marginTop: spacing.xl,
  },
  podiumSlot: {
    flex: 1,
    alignItems: 'center',
  },
  podiumAvatar: {
    marginTop: 4,
  },
  podiumName: {
    fontFamily: fonts.bodyBold,
    fontSize: 12.5,
    color: colors.secondary[800],
    marginTop: 6,
    maxWidth: '100%',
  },
  podiumXp: {
    fontFamily: fonts.display,
    fontSize: 12,
    color: colors.secondary[500],
    marginBottom: 6,
  },
  plinth: {
    width: '100%',
    borderTopLeftRadius: radii.md,
    borderTopRightRadius: radii.md,
    alignItems: 'center',
    paddingTop: 6,
  },
  plinthMe: {
    borderWidth: 2,
    borderBottomWidth: 0,
    borderColor: colors.primary[500],
  },
  plinthRank: {
    fontFamily: fonts.display,
    fontSize: 17,
  },
  sectionLabel: {
    fontFamily: fonts.bodyBold,
    fontSize: 12,
    letterSpacing: 1,
    color: colors.secondary[400],
    marginTop: spacing.xl,
    marginBottom: spacing.sm,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    backgroundColor: colors.white,
    borderRadius: radii.lg,
    paddingHorizontal: spacing.sm,
    paddingVertical: 10,
    marginBottom: spacing.sm,
    ...shadows.card,
  },
  rowMe: {
    borderWidth: 2,
    borderColor: colors.primary[400],
    backgroundColor: colors.primary[50],
  },
  rankChip: {
    width: 26,
    height: 26,
    borderRadius: radii.pill,
    backgroundColor: colors.secondary[100],
    alignItems: 'center',
    justifyContent: 'center',
  },
  rankText: {
    fontFamily: fonts.display,
    fontSize: 12.5,
    color: colors.secondary[600],
  },
  name: {
    flex: 1,
    fontFamily: fonts.bodyBold,
    fontSize: 14.5,
    color: colors.secondary[800],
  },
  nameMe: {
    color: colors.primary[700],
  },
  xp: {
    fontFamily: fonts.display,
    fontSize: 14,
    color: colors.secondary[600],
  },
})
