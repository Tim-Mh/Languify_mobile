import Sound from 'react-native-sound'

/**
 * The lesson's sound effects, matching the web app's `src/lib/sounds.js`.
 *
 * The web synthesises these live with the Web Audio API. React Native has no
 * equivalent, so the same note sequences were rendered ahead of time into small
 * WAV files (see scratchpad/gen-sounds.js) and are shipped as assets. Same
 * notes, same envelopes, so a lesson sounds identical on both products.
 *
 * Players are created once and reused. Creating one per playback leaks native
 * audio sessions, and on Android you hear the effects start to lag and then cut
 * out entirely after a few dozen answers.
 */
const FILES = {
  click: require('@assets/sounds/click.wav'),
  select: require('@assets/sounds/select.wav'),
  correct: require('@assets/sounds/correct.wav'),
  incorrect: require('@assets/sounds/incorrect.wav'),
  complete: require('@assets/sounds/complete.wav'),
}

const players = {}
let configured = false

/**
 * Effects must not stop the learner's music, and on iOS they must still play
 * with the ringer switch set to silent — a language app that goes quiet in a
 * quiet room has lost the point of the audio.
 *
 * `Playback` is the iOS category that ignores the ringer switch, and the second
 * argument is the mix-with-others flag, so between them they say what
 * `setAudioModeAsync({ playsInSilentMode: true, interruptionMode: 'mixWithOthers' })`
 * said in the Expo build. Background playback stays off by simply not declaring
 * the audio background mode natively.
 */
function configure() {
  if (configured) return
  configured = true

  try {
    Sound.setCategory('Playback', true)
  } catch {
    // Android has no audio categories, so this is a no-op there and a native
    // module that disagrees must not take the lesson's audio down with it.
  }
}

/**
 * Creates the player for `name`.
 *
 * Decoding is asynchronous and reports failure through the callback, but
 * nothing waits on it: the very first tap of a given effect can land before the
 * file is ready, and a silent first click is a much better outcome than holding
 * the interface to guarantee it. Every later tap finds the player loaded.
 *
 * A file that will not decode drops itself from the pool rather than being
 * retried, so `play` simply finds nothing and stays quiet.
 */
function loadPlayer(name) {
  return new Sound(FILES[name], (error) => {
    if (error) delete players[name]
  })
}

function play(name) {
  try {
    configure()

    if (!players[name]) players[name] = loadPlayer(name)

    const player = players[name]
    if (!player) return

    // Rewind rather than resume: two right answers in quick succession should
    // each play the whole chime from the start, and a player left sitting at
    // the end of its clip would otherwise do nothing at all on the second call.
    player.setCurrentTime(0)
    player.play()
  } catch {
    // Audio is decoration. A device that refuses to play it (no output route,
    // a locked audio session) must never break the lesson.
  }
}

export const sounds = {
  click: () => play('click'),
  select: () => play('select'),
  correct: () => play('correct'),
  incorrect: () => play('incorrect'),
  complete: () => play('complete'),
}

/**
 * Frees the native players. Called when the lesson unmounts, so a long session
 * of opening and closing lessons does not accumulate audio sessions.
 */
export function releaseSounds() {
  for (const name of Object.keys(players)) {
    try {
      players[name].release()
    } catch {
      // Already gone; nothing to do.
    }
    delete players[name]
  }
  configured = false
}
