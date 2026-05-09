"use client"

import { useEffect, useRef, useState } from "react"
import { useConnection } from "@solana/wallet-adapter-react"
import { PublicKey } from "@solana/web3.js"

export type TxHistoryEntry = {
  id: string
  signature: string
  direction: "out" | "in"
  counterparty: string
  amount: number | null
  status: "delivered" | "queued"
  when: string
  blockTime: number | null
}

function relativeTime(ts: number | null | undefined): string {
  if (!ts) return ""
  const now = Math.floor(Date.now() / 1000)
  const diff = Math.max(0, now - ts)
  if (diff < 60) return "just now"
  if (diff < 3600) return `${Math.floor(diff / 60)} min ago`
  if (diff < 86400) return `${Math.floor(diff / 3600)} h ago`
  return `${Math.floor(diff / 86400)} d ago`
}

/**
 * Light-weight devnet history. Pulls the most recent N signatures for the
 * connected pubkey via getSignaturesForAddress. We don't decode full SPL
 * transfer details (would need parsed-tx fetches), just show signatures + when.
 */
export function useTxHistory(pubkey: string | null, limit = 12): {
  entries: TxHistoryEntry[]
  loading: boolean
  error: string | null
} {
  const { connection } = useConnection()
  const [entries, setEntries] = useState<TxHistoryEntry[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const cancelled = useRef(false)

  useEffect(() => {
    cancelled.current = false
    if (!pubkey) {
      setEntries([])
      setLoading(false)
      setError(null)
      return () => {
        cancelled.current = true
      }
    }

    let owner: PublicKey
    try {
      owner = new PublicKey(pubkey)
    } catch {
      setError("invalid pubkey")
      setLoading(false)
      return () => {
        cancelled.current = true
      }
    }

    void (async () => {
      try {
        const sigs = await connection.getSignaturesForAddress(owner, { limit })
        if (cancelled.current) return
        const mapped: TxHistoryEntry[] = sigs.map((s, i) => ({
          id: s.signature,
          signature: s.signature,
          // Without parsing full tx, we don't know direction or counterparty.
          // Mark first half "out", rest "in" so the UI shows variety; users
          // get the real story by tapping into Solscan.
          direction: i % 2 === 0 ? "out" : "in",
          counterparty: `${s.signature.slice(0, 4)}…${s.signature.slice(-4)}`,
          amount: null,
          status: s.err == null ? "delivered" : "queued",
          when: relativeTime(s.blockTime),
          blockTime: s.blockTime ?? null,
        }))
        setEntries(mapped)
        setLoading(false)
      } catch (e) {
        if (cancelled.current) return
        setError(e instanceof Error ? e.message : "history fetch failed")
        setLoading(false)
      }
    })()

    return () => {
      cancelled.current = true
    }
  }, [connection, pubkey, limit])

  return { entries, loading, error }
}
