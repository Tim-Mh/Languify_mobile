import { useEffect, useState } from 'react'
import NetInfo from '@react-native-community/netinfo'

/**
 * Whether the device currently has usable internet.
 *
 * `isInternetReachable` matters as much as `isConnected`: a phone joined to a
 * captive-portal Wi-Fi, or to a router with no upstream, reports connected while
 * nothing actually resolves. It is null until the first probe finishes, and null
 * is treated as online so the app does not flash an offline screen on launch.
 */
export function useConnection() {
  const [state, setState] = useState({ online: true, type: null, checked: false })

  useEffect(() => {
    const apply = (info) =>
      setState({
        online: Boolean(info.isConnected) && info.isInternetReachable !== false,
        type: info.type,
        checked: true,
      })

    // Fetch once for the current value, then subscribe: the listener alone does
    // not fire until something changes, which could be never.
    NetInfo.fetch().then(apply).catch(() => setState((s) => ({ ...s, checked: true })))

    return NetInfo.addEventListener(apply)
  }, [])

  return state
}

/** Imperative check, for deciding whether a retry is even worth attempting. */
export async function isOnline() {
  try {
    const info = await NetInfo.fetch()
    return Boolean(info.isConnected) && info.isInternetReachable !== false
  } catch {
    // If we cannot tell, assume we are online and let the request produce the
    // real error.
    return true
  }
}
