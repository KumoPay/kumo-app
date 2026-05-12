import { useEffect, useState } from "react"
import { AppState } from "react-native"
import NetInfo, { type NetInfoState } from "@react-native-community/netinfo"

/**
 * Subscribes to real device connectivity. `online` reflects whether we can
 * actually reach the internet right now.
 *
 * Why the two-signal check: NetInfo exposes both `isConnected` (radio/link
 * state, updates immediately on airplane mode and Wi-Fi disconnect) and
 * `isInternetReachable` (an active probe that runs on NetInfo's own schedule,
 * lags real state changes). On airplane mode toggle, isConnected flips to
 * false instantly but isInternetReachable can stay cached at true for several
 * seconds. So isConnected === false must be treated as definitive — if the
 * radio is off, there is no internet, no matter what the stale probe says.
 */
export function useNetwork(): { online: boolean; type: string | null } {
  const [state, setState] = useState<NetInfoState | null>(null)

  useEffect(() => {
    const unsub = NetInfo.addEventListener(setState)
    void NetInfo.fetch().then(setState)
    // App resume can land us back with a stale snapshot if the device's radio
    // changed while backgrounded. Refetch on every foreground.
    const appSub = AppState.addEventListener("change", (next) => {
      if (next === "active") void NetInfo.fetch().then(setState)
    })
    return () => {
      unsub()
      appSub.remove()
    }
  }, [])

  if (!state) return { online: true, type: null }
  if (state.isConnected === false) return { online: false, type: state.type }
  // Connected at the link layer; treat null reachability as "assume online"
  // so we don't false-flag at boot before the first probe completes.
  const reachable =
    state.isInternetReachable === null ? true : state.isInternetReachable
  return { online: Boolean(reachable), type: state.type }
}
