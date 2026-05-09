import { useEffect, useRef, useState } from "react"
import { PublicKey } from "@solana/web3.js"

import { useConnection } from "./use-connection"

export type OnchainEntry = {
  signature: string
  status: "delivered" | "failed"
  blockTime: number | null
}

/**
 * Fetch the most recent N tx signatures for a wallet via getSignaturesForAddress.
 * Lightweight — does NOT decode tx contents (no amount/recipient parsing). Mobile
 * merges this against the local history-store, where richer details live.
 */
export function useOnchainHistory(
  pubkey: string | null,
  limit = 20,
): { entries: OnchainEntry[]; loading: boolean; error: string | null } {
  const { connection } = useConnection()
  const [entries, setEntries] = useState<OnchainEntry[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const cancelledRef = useRef(false)

  useEffect(() => {
    cancelledRef.current = false
    if (!pubkey) {
      setEntries([])
      setLoading(false)
      setError(null)
      return () => {
        cancelledRef.current = true
      }
    }

    let owner: PublicKey
    try {
      owner = new PublicKey(pubkey)
    } catch {
      setError("invalid pubkey")
      setLoading(false)
      return () => {
        cancelledRef.current = true
      }
    }

    void (async () => {
      try {
        const sigs = await connection.getSignaturesForAddress(owner, { limit })
        if (cancelledRef.current) return
        setEntries(
          sigs.map((s) => ({
            signature: s.signature,
            status: s.err == null ? "delivered" : "failed",
            blockTime: s.blockTime ?? null,
          })),
        )
        setError(null)
        setLoading(false)
      } catch (e) {
        if (cancelledRef.current) return
        setError(e instanceof Error ? e.message : "history fetch failed")
        setLoading(false)
      }
    })()

    return () => {
      cancelledRef.current = true
    }
  }, [connection, pubkey, limit])

  return { entries, loading, error }
}
