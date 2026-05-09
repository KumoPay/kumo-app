import { useEffect, useState } from "react"
import NetInfo, { type NetInfoState } from "@react-native-community/netinfo"

/**
 * Subscribes to real device connectivity. `online` is true only when the device
 * has an active network and has reached the internet (NetInfo's `isInternetReachable`
 * may be null briefly while it probes; we treat null as "assume online" so we
 * don't false-flag at boot).
 */
export function useNetwork(): { online: boolean; type: string | null } {
  const [state, setState] = useState<NetInfoState | null>(null)

  useEffect(() => {
    const unsub = NetInfo.addEventListener(setState)
    void NetInfo.fetch().then(setState)
    return unsub
  }, [])

  if (!state) return { online: true, type: null }
  const reachable =
    state.isInternetReachable === null ? state.isConnected : state.isInternetReachable
  return { online: Boolean(reachable), type: state.type }
}
