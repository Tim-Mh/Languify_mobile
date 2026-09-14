import { Platform } from 'react-native'
import Sound from 'react-native-sound'
import Tts from 'react-native-tts'

import { API_URL } from '../api/client'

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
 * Whether the **device** can say this language, which is what decides whether
 * to use the engine or ask the backend for audio.
 *
 * Asking the engine for a language with no voice installed does **not** throw:
 * the call returns, nothing is heard, and the failure arrives on a callback
 * nobody was listening to. So this has to be checked up front — there is no
 * error to fall back from afterwards.
 *
 * Optimistic while the enumeration is still in flight, and optimistic if it
 * failed: an engine that cannot list its voices can usually still speak, and
 * routing every language to the backend because of that would replace good
 * device voices with a synthetic one for no reason.
 */
function deviceHasVoice(languageCode) {
  if (voices === null || voices.length === 0) return true

  const wanted = baseLanguage(localeFor(languageCode))

  return voices.some((voice) => baseLanguage(voice.language) === wanted)
}

/**
 * Whether the learner will hear anything at all in this language, from either
 * source. Screens use this to say so out loud rather than appearing broken.
 *
 * Stays true unless the backend has actually failed, because a wrong "no voice"
 * warning is worse than a missing one.
 */
export function hasVoiceFor(languageCode) {
  return deviceHasVoice(languageCode) || serverSpeechWorks !== false
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
/* --------------------------------------------------------------- server */

/**
 * Audio rendered by our own backend, for the languages this device cannot say.
 *
 * Most phones ship voice data only for the languages they were set up in, so
 * Arabic, Turkish and Azerbaijani are commonly missing — and asking for a
 * missing one is silent rather than an error, which is what made the speaker
 * button look dead. The backend renders those with eSpeak NG and caches the
 * result, so this is a plain audio file over HTTP.
 *
 * `react-native-sound` takes a URL directly: it checks `startsWith("http")` on
 * the filename and treats it as a network resource, which is why no basePath is
 * given here (see the note in `sounds.js`, where the opposite case bit us).
 */
function speechUrl(text, languageCode) {
  return `${API_URL}/speech?lang=${encodeURIComponent(languageCode)}&text=${encodeURIComponent(text)}`
}

/**
 * Whether the backend has managed to speak for us yet.
 *
 * Null until something has been tried, and optimistic on purpose: the "no voice
 * on this device" warning must not appear before we have actually failed to get
 * audio, because for almost everyone we will not.
 */
let serverSpeechWorks = null

// Loaded players, keyed by URL, so a word is fetched from the network once and
// replayed from memory afterwards.
//
// This is the whole reason a tap is fast. `new Sound(url)` downloads before it
// can play, and the round trip to our server is the better part of two seconds
// — so without this, every tap waited, including a second tap on a word just
// heard. Prefetching fills this map while the learner is still reading, which
// is what makes even the first tap immediate.
//
// Capped and evicted oldest-first: each entry holds a native player, and a
// learner working through a long lesson would otherwise accumulate one per
// distinct word with no bound.
const MAX_CACHED_SOUNDS = 40
const soundCache = new Map()

/** The player currently making noise, so the next tap can silence it. */
let playing = null

function stopPlayback() {
  if (!playing) return

  try {
    playing.stop()
  } catch {
    // Already stopped, or released by eviction.
  }

  playing = null
}

function remember(url, sound) {
  soundCache.set(url, sound)

  while (soundCache.size > MAX_CACHED_SOUNDS) {
    const [oldestUrl, oldest] = soundCache.entries().next().value

    soundCache.delete(oldestUrl)

    if (oldest === playing) playing = null

    try {
      oldest.stop()
      oldest.release()
    } catch {
      // Already gone.
    }
  }
}

/**
 * A loaded player for this URL, from cache when we have one.
 *
 * Resolves null rather than rejecting: every caller's fallback is the same —
 * stay silent — and a failed word must not take the lesson down with it.
 */
function loadSound(url) {
  const cached = soundCache.get(url)

  if (cached) {
    // Re-inserted so the most recently used entry is the last to be evicted.
    soundCache.delete(url)
    soundCache.set(url, cached)

    return Promise.resolve(cached)
  }

  return new Promise((resolve) => {
    const sound = new Sound(url, null, (error) => {
      if (error) {
        // Could not load it at all: no engine on the server, or no network.
        serverSpeechWorks = false

        try {
          sound.release()
        } catch {
          // Never allocated.
        }

        resolve(null)

        return
      }

      serverSpeechWorks = true
      remember(url, sound)
      resolve(sound)
    })
  })
}

let categorySet = false

function ensureAudioCategory() {
  // iOS mutes the default category when the ringer switch is on silent, and a
  // pronunciation that goes quiet in a quiet room has lost the point. `sounds.js`
  // sets the same category for the effects; it is a static, idempotent call, and
  // relying on the effects having played first would be a race.
  if (categorySet) return

  categorySet = true

  try {
    Sound.setCategory('Playback', true)
  } catch {
    // Android has no audio categories.
  }
}

function playFromServer(text, languageCode) {
  ensureAudioCategory()
  stopPlayback()

  const url = speechUrl(text, languageCode)

  loadSound(url).then((sound) => {
    if (!sound) return

    // A newer tap may have started while this was loading; it owns the audio
    // now, so this one is dropped rather than played over the top.
    if (playing) return

    playing = sound

    // Cached players keep their playhead at the end of the last play, so a
    // replay has to rewind first or it finishes instantly and silently.
    sound.setCurrentTime(0)
    sound.play(() => {
      if (playing === sound) playing = null
    })
  })
}

/**
 * Load a lesson's words before the learner taps any of them.
 *
 * For a language the backend speaks, this downloads each word into the player
 * cache, so a tap plays from memory instead of waiting on the network. It is
 * the difference between a tap that sounds instantly and one that waits the
 * better part of two seconds.
 *
 * For a language the device speaks, there is nothing to download, but the
 * engine still has to be told which language to use — a bridge call that
 * otherwise lands on the first tap. Doing it here means that tap is free too.
 *
 * Loads a few at a time: a long lesson can hold dozens of distinct words, and
 * allocating a native player for all of them at once is a lot of pressure for
 * audio nobody has asked for yet.
 *
 * Deliberately fire-and-forget, and deliberately not awaited by the caller: a
 * word that fails to warm costs one slow tap, which is exactly what happened
 * before this existed.
 */
const PREFETCH_CONCURRENCY = 4

export function prefetchSpeech(texts, languageCode) {
  if (!SPEECH_LOCALES[languageCode]) return

  // A language the device says itself never touches the backend. Warm the
  // engine instead, so the first tap does not pay for the language switch.
  if (deviceHasVoice(languageCode)) {
    primeEngine(localeFor(languageCode))

    return
  }

  const queue = [...new Set((texts ?? []).filter(Boolean).map(String))]
    // Anything already cached is a tap that is fast already.
    .map((text) => speechUrl(text, languageCode))
    .filter((url) => !soundCache.has(url))

  const next = () => {
    const url = queue.shift()

    if (!url) return

    loadSound(url).then(next, next)
  }

  for (let i = 0; i < PREFETCH_CONCURRENCY; i += 1) next()
}

/**
 * Tells the engine which language to speak, ahead of the first utterance.
 *
 * Shared by `prefetchSpeech` and `speak` so the language is only ever set once
 * per lesson, whichever of them gets there first.
 */
function primeEngine(locale) {
  if (selectedLocale === locale || primingLocale === locale) return Promise.resolve(false)

  primingLocale = locale

  return ready
    .then(() => Tts.setDefaultLanguage(locale))
    .then(() => {
      selectedLocale = locale
      primingLocale = null

      return true
    })
    .catch(() => {
      primingLocale = null

      return false
    })
}

let primingLocale = null

export function speak(text, languageCode) {
  if (!text) return

  const locale = localeFor(languageCode)
  const utterance = String(text)

  // No voice on the device: the backend is the only way this language is heard.
  // Checked before the engine call rather than after, because asking the engine
  // to speak a language it does not have returns happily and plays nothing, so
  // there is no failure to fall back from.
  if (!deviceHasVoice(languageCode)) {
    playFromServer(utterance, languageCode)

    return
  }

  const say = () => {
    stopPlayback()
    Tts.stop()
    Tts.speak(utterance)
  }

  // Already on this language — the common case once a lesson is under way, and
  // the one that has to stay free of bridge round trips.
  if (selectedLocale === locale) {
    say()
    return
  }

  primeEngine(locale).then((ok) => {
    if (ok) {
      say()
      return
    }

    // The engine rejected the language after all, so take the same route as a
    // device with no voice for it. `selectedLocale` stays as it was, so the
    // next tap tries the engine again rather than assuming it was set.
    playFromServer(utterance, languageCode)
  })
}

export function stopSpeaking() {
  stopPlayback()

  try {
    Tts.stop()
  } catch {
    // Nothing was playing.
  }
}
