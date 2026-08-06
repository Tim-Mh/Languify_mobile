/**
 * The app's shared styling layer.
 *
 * `theme` holds the raw design tokens — colours, spacing, radii, shadows, font
 * families — copied verbatim from the web app's `src/index.css` so the two
 * products read as one. Everything else here is built from those tokens and
 * never hardcodes a value of its own:
 *
 *   - `typography` — the type ramp as ready-made text styles
 *   - `common`     — the layout shapes that repeat across screens
 *
 * `marks` is the exception and is deliberately **not** built from the theme: it
 * holds colours we do not own, like national flags and Google's sign-in mark,
 * which must never move when the palette does.
 *
 * Screens still keep a local `StyleSheet.create` for whatever is specific to
 * them; these exist so the shapes that would otherwise be retyped in thirty
 * files have one definition. Import the tokens directly when composing
 * something new:
 *
 *     import { colors, spacing } from '@/styles'
 */
export { colors, fonts, spacing, radii, shadows, SPLASH_BACKGROUND } from '../theme'
export { default as theme } from '../theme'
export { typography } from './typography'
export { common } from './common'
export { flag, google } from './marks'
