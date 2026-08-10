import { Platform } from 'react-native'
import Tts from 'react-native-tts'

/**
 * Reading content aloud.
 *
 * Ported from the web's `src/lib/speech.js` so both products pronounce the same
 * word the same way, including the deliberately slow rate: this is a learner
 * hearing a word for the first time, not a screen reader.
 *
 * There are no audio files anywhere in this project. The `audio_url` the API
 * emits on `listen_select` has never pointed at a real file, and the web
 * ignores it too — everything is synthesised on the device.
 *
 * ---
 *
 * **The full locale now goes to both platforms.** The Expo build had to send
 * Android a bare language code (`ja`, not `ja-JP`), because `expo-speech`'s
 * Android module built its Locale with `Locale(String)` — the language-only
 * constructor — so `Locale("ja-JP")` had a language of `"ja-jp"`, was reported
 * as unsupported, and silently fell back to the device's own voice. That is why
 * Japanese, Korean and German produced no sound at all.
 *
 * `react-native-tts` splits the tag first:
 *
 *     // react-native-tts/android/.../TextToSpeechModule.java
 *     if (language.indexOf("-") != -1) {
 *       String[] parts = language.split("-");
 *       locale = new Locale(parts[0], parts[1]);   // Locale("ja", "JP")
 *     }
 *
 * which is the language-and-country constructor and a valid Locale, so the
 * workaround is not needed here. Sending the full tag is also more precise:
 * `es-ES` and `es-MX` are different voices, and the bare code could not ask for
 * either.
 */
const SPEECH_LOCALES = {
  en: 'en-US',
  es: 'es-ES',
  fr: 'fr-FR',
  de: 'de-DE',
  ja: 'ja-JP',
  ko: 'ko-KR',
  tr: 'tr-TR',
  ru: 'ru-RU',
  ar: 'ar-SA',
  az: 'az-AZ',
}

/**
 * Matches the web: 85% of normal speed. Normal is too fast to imitate.
 *
 * Sent with `skipTransform` so it reaches each engine untouched, which is the
 * only way to get the same speed out of both. The two platforms scale rate
 * differently — Android's `setSpeechRate` treats 1.0 as normal, while iOS hands
 * it to `AVSpeechUtterance`, whose normal is `AVSpeechUtteranceDefaultSpeechRate`
 * of 0.5 — so 85% is a different number on each.
 */
const RATE = Platform.OS === 'android' ? 0.85 : 0.425

/** `ja-JP` -> `ja`. */
function baseLanguage(value) {
  return String(value ?? '')
    .toLowerCase()
    .replace('_', '-')
    .split('-')[0]
}

function localeFor(languageCode) {
  return SPEECH_LOCALES[languageCode] ?? 'en-US'
}

/**
 * The device's installed voices, read once in the background.
 *
 * Only used to answer `hasVoiceFor()`, never on the tap path. Enumerating
 * voices is a slow bridge call — awaiting it before every utterance is what
 * made tapping a word take seconds — and it is not needed to speak: setting a
 * valid language lets the engine choose its own best installed voice, which it
 * can do better than we can.
 *
 * `notInstalled` is the one thing worth filtering. Android lists voices it
 * merely knows about alongside the ones actually downloaded, and a listed but
 * absent voice is exactly the case `hasVoiceFor` exists to catch.
 */
let voices = null

/**
 * Android's engine is not usable until it reports ready, and every call before
 * then rejects. iOS resolves this immediately.
 *
 * Wrapped because this runs at import time, and the alphabet screen imports
 * this module. `getInitStatus` rejects on a device with no speech engine, which
 * the catch handles — but on a build where the native module is missing
 * entirely it throws synchronously instead, and an exception at module scope
 * takes the screen down before it renders rather than just leaving it silent.
 */
const ready = (() => {
  try {
    return Tts.getInitStatus().catch(() => null)
  } catch {
    return Promise.resolve(null)
  }
})()

ready
  .then(() => Tts.voices())
  .then((list) => {
    voices = Array.isArray(list) ? list.filter((voice) => !voice.notInstalled) : []
  })
  .catch(() => {
    // An engine that cannot enumerate its voices can usually still speak, so a
    // failure here must not make `hasVoiceFor` claim there is nothing.
    voices = []
  })

// The rate never changes, so it is set once rather than per utterance.
ready.then(() => Tts.setDefaultRate(RATE, true)).catch(() => {})

/**
 * Whether the device can actually say anything in this language.
 *
 * Asking for a language with no voice installed does **not** throw: the call
 * returns, nothing is heard, and the failure arrives on a callback nobody was
 * listening to. Screens use this to say so out loud rather than appearing
 * broken.
 *
 * Optimistic while the enumeration is still in flight, and optimistic if it
 * failed — a wrong "no voice" warning is worse than a missing one.
 */
export function hasVoiceFor(languageCode) {
  if (voices === null || voices.length === 0) return true

  const wanted = baseLanguage(localeFor(languageCode))

  return voices.some((voice) => baseLanguage(voice.language) === wanted)
}

/**
 * The language the engine is currently set to, so an utterance in the language
 * already selected does not pay for a second bridge call to say so again.
 *
 * This matters because the language is engine state rather than an argument:
 * `react-native-tts` has no per-utterance language, so it must be set first and
 * left set. A learner stays in one language for a whole lesson, so this is set
 * once and every tap after that speaks immediately.
 */
let selectedLocale = null

/**
 * Speaks `text`, replacing anything already playing.
 *
 * Deliberately not awaited by callers. Every bridge round trip here is time the
 * learner spends with a finger on the word waiting for a sound, and an earlier
 * version awaited both the voice list and the speaking state before it even
 * started — seconds, on the first tap.
 *
 * `stop()` first is required, not defensive: the Android engine queues with
 * `TextToSpeech.QUEUE_ADD`, so without it four taps play four words back to
 * back long after the learner has moved on.
 */
export function speak(text, languageCode) {
  if (!text) return

  const locale = localeFor(languageCode)
  const utterance = String(text)

  const say = () => {
    Tts.stop()
    Tts.speak(utterance)
  }

  if (selectedLocale === locale) {
    say()
    return
  }

  ready
    .then(() => Tts.setDefaultLanguage(locale))
    .then(() => {
      selectedLocale = locale
      say()
    })
    .catch(() => {
      // A device with no voice for this language, or no engine at all. Silence
      // is the right fallback; a failed pronunciation must never take the
      // exercise down. `selectedLocale` stays as it was so the next tap tries
      // again rather than assuming the language was set.
    })
}

export function stopSpeaking() {
  try {
    Tts.stop()
  } catch {
    // Nothing was playing.
  }
}
