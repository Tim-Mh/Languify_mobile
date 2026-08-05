import { colors } from './theme'

/**
 * Four slides, each pointing at one thing the app actually does: the course
 * catalogue, the lesson format, streaks, and leagues. Artwork is the same
 * mascot set the web app uses.
 */
const slides = [
  {
    key: 'languages',
    image: require('../assets/onboarding-1.png'),
    titleKey: 'm_onb_1_title',
    bodyKey: 'm_onb_1_body',
    tint: colors.primary[100],
  },
  {
    key: 'lessons',
    image: require('../assets/onboarding-2.png'),
    titleKey: 'm_onb_2_title',
    bodyKey: 'm_onb_2_body',
    tint: colors.accent[100],
  },
  {
    key: 'streaks',
    image: require('../assets/onboarding-3.png'),
    titleKey: 'm_onb_3_title',
    bodyKey: 'm_onb_3_body',
    tint: colors.warning[100],
  },
  {
    key: 'leagues',
    image: require('../assets/onboarding-4.png'),
    titleKey: 'm_onb_4_title',
    bodyKey: 'm_onb_4_body',
    tint: colors.secondary[100],
  },
]

export default slides
