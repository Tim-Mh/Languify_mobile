import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native'
import { useSafeAreaInsets } from 'react-native-safe-area-context'
import { useRouter } from '@/navigation'
import Animated, { FadeInDown } from 'react-native-reanimated'
import BookOpenText from 'lucide-react-native/icons/book-open-text'
import Calculator from 'lucide-react-native/icons/calculator'
import Check from 'lucide-react-native/icons/check'
import ChevronRight from 'lucide-react-native/icons/chevron-right'
import FlaskConical from 'lucide-react-native/icons/flask-conical'
import Gem from 'lucide-react-native/icons/gem'
import Heart from 'lucide-react-native/icons/heart'
import InfinityIcon from 'lucide-react-native/icons/infinity'
import Trophy from 'lucide-react-native/icons/trophy'

import QueryState from '@/components/QueryState'
import { TopicSkeleton } from '@/components/Skeleton'
import StateView from '@/components/StateView'
import { TAB_BAR_OVERHANG } from '@/components/TabBar'
import { useTriviaTopics } from '@/hooks/useRewards'
import {
  triviaTopicDescription,
  triviaTopicTitle,
} from '@/lib/contentNames'
import { useTranslate } from '@/lib/i18n'
import { useRefresh } from '@/lib/useRefresh'
import { useLayout } from '@/lib/responsive'
import { sounds } from '@/lib/sounds'
import { colors, fonts, radii, shadows, spacing } from '@/theme'

/**
 * Keyed by the `icon` the API sends with each topic, matching the web's own
 * mapping in TriviaQuestion.jsx so a topic wears the same face in both products.
 */
const TOPIC_ICONS = {
  flask: FlaskConical,
  calculator: Calculator,
  'book-o': BookOpenText,
  'book-open-text': BookOpenText,
}

/** A different tint per topic, so the list reads as a set rather than a stack. */
const TINTS = [
  { bg: colors.accent[50], fg: colors.accent[600] },
  { bg: colors.primary[50], fg: colors.primary[600] },
  { bg: colors.warning[50], fg: colors.warning[700] },
  { bg: colors.success[50], fg: colors.success[700] },
]

export default function Trivia() {
  const insets = useSafeAreaInsets()
  const refreshControl = useRefresh()
  const router = useRouter()
  const t = useTranslate()
  const { contentWidth, size } = useLayout()

  const query = useTriviaTopics()
  const unlocked = query.data?.unlocked

  return (
    <ScrollView
      style={styles.screen}
      refreshControl={refreshControl}
      contentContainerStyle={[
        styles.content,
        { paddingTop: insets.top + spacing.lg, width: contentWidth, alignSelf: 'center' },
      ]}
    >
      <View style={styles.hero}>
        <View style={styles.heroIcon}>
          <Trophy size={26} color={colors.white} strokeWidth={2.2} />
        </View>
        <Text style={[styles.heading, { fontSize: size(26) }]}>{t('m_trivia_title')}</Text>
        <Text style={styles.subheading}>
          {t('m_trivia_intro')}
        </Text>

        {/* The two things worth knowing before starting, rather than buried in
            a paragraph under the list. */}
        <View style={styles.facts}>
          <View style={styles.fact}>
            <Gem size={13} color={colors.accent[600]} strokeWidth={2.4} />
            <Text style={styles.factText}>{t('m_trivia_fact_gems')}</Text>
          </View>
          <View style={styles.fact}>
            <InfinityIcon size={13} color={colors.primary[600]} strokeWidth={2.4} />
            <Text style={styles.factText}>{t('m_trivia_fact_perfect')}</Text>
          </View>
          <View style={styles.fact}>
            <Heart size={13} color={colors.danger[500]} strokeWidth={2.4} fill={colors.danger[500]} />
            <Text style={styles.factText}>{t('m_trivia_fact_heart')}</Text>
          </View>
        </View>
      </View>

      <QueryState
        query={query}
        skeleton={<TopicSkeleton count={4} />}
        errorTitle={t('m_trivia_load_error')}
        isEmpty={(data) => (data?.topics?.length ?? 0) === 0}
        emptyTitle={t('m_trivia_none')}
        emptyBody={t('m_trivia_none_body')}
        inline
      >
        {(data) => {
          if (!unlocked) {
            return (
              <StateView
                icon="session"
                tone="warning"
                title={t('m_trivia_locked')}
                body={t('m_trivia_locked_body')}
                inline
              />
            )
          }

          return (data.topics ?? []).map((topic, index) => {
            const Icon = TOPIC_ICONS[topic.icon] ?? Trophy
            const tint = TINTS[index % TINTS.length]

            return (
              <Animated.View
                key={topic.key}
                entering={FadeInDown.delay(index * 60).duration(300)}
              >
                <Pressable
                  accessibilityRole="button"
                  accessibilityLabel={`${topic.title}, ${topic.questionsCount} questions${topic.completed ? ', completed' : ''}`}
                  onPress={() => {
                    sounds.click()
                    router.push({
                      pathname: '/trivia/[topic]',
                      params: { topic: topic.key, title: topic.title },
                    })
                  }}
                  style={({ pressed }) => [styles.card, pressed && styles.pressed]}
                >
                  <View style={[styles.icon, { backgroundColor: tint.bg }]}>
                    <Icon size={22} color={tint.fg} strokeWidth={2.2} />
                  </View>

                  <View style={styles.copy}>
                    <View style={styles.titleRow}>
                      <Text style={styles.title} numberOfLines={1}>
                        {triviaTopicTitle(t, topic)}
                      </Text>
                      {topic.completed ? (
                        <View style={styles.doneTag}>
                          <Check size={10} color={colors.success[700]} strokeWidth={3.2} />
                          <Text style={styles.doneTagText}>{t('m_trivia_done')}</Text>
                        </View>
                      ) : null}
                    </View>

                    <Text style={styles.body} numberOfLines={2}>
                      {triviaTopicDescription(t, topic)}
                    </Text>

                    <Text style={styles.meta}>
                      {topic.questionsCount === 1
                        ? t('m_trivia_q_one')
                        : t('m_trivia_q_many', { n: topic.questionsCount })}
                      {topic.completed ? t('m_trivia_replay') : ''}
                    </Text>
                  </View>

                  <ChevronRight size={20} color={colors.secondary[300]} strokeWidth={2.2} />
                </Pressable>
              </Animated.View>
            )
          })
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
  hero: {
    alignItems: 'center',
    marginBottom: spacing.lg,
  },
  heroIcon: {
    width: 56,
    height: 56,
    borderRadius: radii.pill,
    backgroundColor: colors.primary[500],
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: spacing.sm,
    ...shadows.card,
  },
  heading: {
    fontFamily: fonts.display,
    color: colors.secondary[900],
  },
  subheading: {
    fontFamily: fonts.body,
    fontSize: 14,
    lineHeight: 20,
    color: colors.secondary[500],
    textAlign: 'center',
    marginTop: 4,
  },
  facts: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'center',
    gap: spacing.sm,
    marginTop: spacing.md,
  },
  fact: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: colors.white,
    borderRadius: radii.pill,
    paddingHorizontal: 10,
    paddingVertical: 5,
  },
  factText: {
    fontFamily: fonts.bodyBold,
    fontSize: 11,
    color: colors.secondary[600],
  },
  card: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    backgroundColor: colors.white,
    borderRadius: radii.xl,
    padding: spacing.md,
    marginBottom: spacing.sm,
    ...shadows.card,
  },
  pressed: {
    opacity: 0.75,
  },
  icon: {
    width: 48,
    height: 48,
    borderRadius: radii.lg,
    alignItems: 'center',
    justifyContent: 'center',
  },
  copy: {
    flex: 1,
  },
  titleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
  },
  title: {
    flexShrink: 1,
    fontFamily: fonts.display,
    fontSize: 16,
    color: colors.secondary[900],
  },
  doneTag: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 3,
    backgroundColor: colors.success[50],
    borderRadius: radii.pill,
    paddingHorizontal: 7,
    paddingVertical: 2,
  },
  doneTagText: {
    fontFamily: fonts.bodyBold,
    fontSize: 9.5,
    color: colors.success[700],
  },
  body: {
    fontFamily: fonts.body,
    fontSize: 13,
    lineHeight: 18,
    color: colors.secondary[500],
    marginTop: 2,
  },
  meta: {
    fontFamily: fonts.bodySemi,
    fontSize: 11.5,
    color: colors.secondary[400],
    marginTop: 4,
  },
})
