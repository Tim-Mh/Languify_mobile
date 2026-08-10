import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native'
import { useSafeAreaInsets } from 'react-native-safe-area-context'
import { useRouter } from '@/navigation'
import Animated, { FadeIn } from 'react-native-reanimated'
import ChevronLeft from 'lucide-react-native/icons/chevron-left'
import Volume2 from 'lucide-react-native/icons/volume-2'

import QueryState from '@/components/QueryState'
import { AlphabetSkeleton } from '@/components/Skeleton'
import StateView from '@/components/StateView'
import { TAB_BAR_OVERHANG } from '@/components/TabBar'
import { useAlphabet } from '@/hooks/useCourses'
import { useTranslate } from '@/lib/i18n'
import { hasVoiceFor, speak } from '@/lib/speak'
import { useAuth } from '@/auth/AuthContext'
import { useRefresh } from '@/lib/useRefresh'
import { useGoBack } from '@/lib/useGoBack'
import { useLayout } from '@/lib/responsive'
import { colors, fonts, radii, shadows, spacing } from '@/theme'

/**
 * Which voice reads a letter out. Copied from the web's LearnAlphabet so both
 * products pronounce the same character the same way.
 */

const SCRIPT_GROUP_KEYS = {
  hiragana: 'm_alphabet_hiragana',
  katakana: 'm_alphabet_katakana',
  consonant: 'm_alphabet_consonants',
  vowel: 'm_alphabet_vowels',
}

/**
 * For Korean and Japanese, the closest single English letter a character's
 * sound starts with ("ch" -> C, "g/k" -> G). The letters are already seeded in
 * alphabetical-by-romanization order, so same-letter characters end up adjacent.
 */
function startingLetterOf(romanization) {
  if (!romanization) return null
  const primary = romanization.split('/')[0].trim()
  return primary.charAt(0).toUpperCase() || null
}

/** Ported from the web's groupLetters so both lay the chart out identically. */
function groupLetters(letters) {
  const scriptGroups = []
  const byScript = {}

  letters.forEach((letter) => {
    const scriptKey = letter.scriptGroup ?? '_default'

    if (!byScript[scriptKey]) {
      byScript[scriptKey] = { key: scriptKey, subgroups: [], bySub: {} }
      scriptGroups.push(byScript[scriptKey])
    }

    const scriptGroup = byScript[scriptKey]
    // Only a syllabary gets sub-headers; see the web's LearnAlphabet for why.
    // Grouping an ALPHABET by its romanization reorders it, which is how the
    // Arabic chart stopped reading ا…ي.
    const subKey = scriptKey === '_default' ? '_flat' : (startingLetterOf(letter.romanization) ?? '?')

    if (!scriptGroup.bySub[subKey]) {
      scriptGroup.bySub[subKey] = { key: subKey === '_flat' ? null : subKey, letters: [] }
      scriptGroup.subgroups.push(scriptGroup.bySub[subKey])
    }

    scriptGroup.bySub[subKey].letters.push(letter)
  })

  return scriptGroups
}

export default function Alphabet() {
  const insets = useSafeAreaInsets()
  const refreshControl = useRefresh()
  const router = useRouter()
  const goBack = useGoBack('/home')
  const { user } = useAuth()
  const t = useTranslate()
  const { contentWidth, size, isCompact } = useLayout()

  const query = useAlphabet({ enabled: Boolean(user?.learningLanguage) })

  const columns = isCompact ? 4 : 5

  return (
    <View style={styles.screen}>
      <View style={[styles.header, { paddingTop: insets.top + spacing.sm }]}>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Go back"
          onPress={goBack}
          hitSlop={10}
          style={({ pressed }) => [styles.back, pressed && styles.pressed]}
        >
          <ChevronLeft size={22} color={colors.secondary[600]} strokeWidth={2.4} />
        </Pressable>

        <Text style={[styles.headerTitle, { fontSize: size(19) }]} numberOfLines={1}>
          {user?.learningLanguage
            ? t('m_alphabet_title', { language: user.learningLanguage.name })
            : t('m_alphabet_generic')}
        </Text>
      </View>

      <ScrollView
        style={styles.scroll}
        refreshControl={refreshControl}
        contentContainerStyle={[
          styles.content,
          // Clears the tab bar's raised centre button, which overhangs the scene.
          { width: contentWidth, alignSelf: 'center', paddingBottom: spacing.xxl + TAB_BAR_OVERHANG },
        ]}
      >
        {!user?.learningLanguage ? (
          <StateView
            icon="empty"
            title={t('m_home_no_course')}
            body={t('m_home_no_course_body')}
            inline
          />
        ) : (
          <QueryState
            query={query}
            skeleton={<AlphabetSkeleton columns={columns} />}
            errorTitle={t('m_alphabet_error')}
            isEmpty={(data) => (data?.letters?.length ?? 0) === 0}
            emptyTitle={t('m_alphabet_none')}
            emptyBody={t('m_alphabet_none_body')}
            inline
          >
            {/* Function form, because everything below reads the response. As
                plain children this is built before QueryState can decide to show
                the skeleton, and throws while data is still undefined. */}
            {(data) => (
              <>
                {/* A device with no voice installed for this language stays
                    silent and reports nothing, so the screen has to say so
                    itself — otherwise every tap looks broken. */}
                <View style={styles.hint}>
                  <Volume2 size={15} color={colors.primary[600]} strokeWidth={2.3} />
                  <Text style={styles.hintText}>
                    {hasVoiceFor(data.language?.code)
                      ? t('m_alphabet_tap_hint')
                      : t('m_alphabet_no_voice', { language: data.language?.name ?? '' })}
                  </Text>
                </View>

                {groupLetters(data.letters).map((scriptGroup) => (
                  <View key={scriptGroup.key}>
                    {SCRIPT_GROUP_KEYS[scriptGroup.key] ? (
                      <Text style={styles.scriptHeading}>
                        {t(SCRIPT_GROUP_KEYS[scriptGroup.key])}
                      </Text>
                    ) : null}

                    {scriptGroup.subgroups.map((subgroup) => (
                      /* The sound's initial sits in a gutter beside its row
                         rather than on a line of its own. Most syllabary
                         subgroups hold one or two characters, so a stacked
                         header spent a whole row to label a single tile. */
                      <View key={subgroup.key ?? '_flat'} style={styles.subRow}>
                        {subgroup.key ? (
                          <Text style={styles.subGutter}>{subgroup.key}</Text>
                        ) : null}

                        <View style={styles.grid}>
                          {subgroup.letters.map((letter) => (
                            <Animated.View
                              key={letter.id}
                              entering={FadeIn.duration(220)}
                              style={{ width: `${100 / columns}%` }}
                            >
                              <Pressable
                                accessibilityRole="button"
                                accessibilityLabel={
                                  letter.romanization
                                    ? `${letter.character}, said ${letter.romanization}`
                                    : letter.character
                                }
                                onPress={() => speak(letter.character, data.language?.code)}
                                style={({ pressed }) => [styles.tile, pressed && styles.tilePressed]}
                              >
                                <Text
                                  style={[styles.character, { fontSize: size(isCompact ? 22 : 24) }]}
                                  numberOfLines={1}
                                  adjustsFontSizeToFit
                                >
                                  {letter.character}
                                </Text>

                                {/* Two lines, because a few names are long
                                    ("doo-bluh-veh" for W). Wrapped items in a
                                    flex row stretch to the tallest in their
                                    line, so the grid stays aligned. */}
                                {letter.romanization ? (
                                  <Text style={styles.romanization} numberOfLines={2}>
                                    {letter.romanization}
                                  </Text>
                                ) : null}

                                {/* The web fetches exampleWord and never shows
                                    it. On a phone it is the one thing that turns
                                    a letter into something you can use. */}
                                {letter.exampleWord ? (
                                  <Text style={styles.example} numberOfLines={1}>
                                    {letter.exampleWord}
                                  </Text>
                                ) : null}
                              </Pressable>
                            </Animated.View>
                          ))}
                        </View>
                      </View>
                    ))}
                  </View>
                ))}
              </>
            )}
          </QueryState>
        )}
      </ScrollView>
    </View>
  )
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: colors.secondary[50],
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    paddingHorizontal: spacing.lg,
    paddingBottom: spacing.sm,
  },
  back: {
    width: 40,
    height: 40,
    borderRadius: radii.pill,
    backgroundColor: colors.white,
    alignItems: 'center',
    justifyContent: 'center',
    ...shadows.card,
  },
  pressed: {
    opacity: 0.75,
  },
  headerTitle: {
    flex: 1,
    fontFamily: fonts.display,
    color: colors.secondary[900],
  },
  scroll: {
    flex: 1,
  },
  content: {
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.sm,
  },
  hint: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginBottom: spacing.md,
  },
  hintText: {
    fontFamily: fonts.bodySemi,
    fontSize: 13,
    color: colors.secondary[400],
  },
  scriptHeading: {
    fontFamily: fonts.display,
    fontSize: 17,
    color: colors.secondary[900],
    marginTop: spacing.md,
    marginBottom: spacing.xs,
  },
  subRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
  },
  subGutter: {
    width: 18,
    fontFamily: fonts.bodyBold,
    fontSize: 12,
    color: colors.secondary[300],
    marginTop: spacing.md + 6,
  },
  grid: {
    flex: 1,
    flexDirection: 'row',
    flexWrap: 'wrap',
    // Negative gutter so the tiles' own margins line the grid up flush with the
    // screen padding on both edges.
    marginHorizontal: -4,
  },
  tile: {
    backgroundColor: colors.white,
    borderRadius: radii.lg,
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: spacing.sm,
    paddingHorizontal: 4,
    margin: 4,
    minHeight: 78,
    ...shadows.card,
  },
  tilePressed: {
    backgroundColor: colors.primary[50],
  },
  character: {
    fontFamily: fonts.display,
    color: colors.secondary[900],
  },
  romanization: {
    fontFamily: fonts.bodySemi,
    fontSize: 11,
    color: colors.secondary[400],
    marginTop: 2,
  },
  example: {
    fontFamily: fonts.body,
    fontSize: 10,
    color: colors.primary[500],
    marginTop: 1,
  },
})
