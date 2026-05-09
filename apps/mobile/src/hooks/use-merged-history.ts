import { useMemo } from "react"

import { useHistory, type LocalHistoryEntry } from "../screens/history-store"
import { useOnchainHistory, type OnchainEntry } from "./use-onchain-history"

export type MergedHistoryEntry = {
  id: string
  signature: string
  direction: "out" | "in"
  counterparty: string
  amount: number | null
  status: "delivered" | "queued" | "failed"
  /** ms epoch — local entries use createdAt; on-chain entries use blockTime*1000. */
  ts: number
  /** True for on-chain-only entries (sent from another app); these have null amount + synthetic counterparty. */
  external: boolean
  failureReason?: string
}

function fromLocal(e: LocalHistoryEntry): MergedHistoryEntry {
  return {
    id: e.id,
    signature: e.signature,
    direction: e.direction,
    counterparty: e.counterparty,
    amount: e.amount,
    status: e.status,
    ts: e.createdAt,
    external: false,
    failureReason: e.failureReason,
  }
}

function fromOnchain(o: OnchainEntry): MergedHistoryEntry {
  return {
    id: o.signature,
    signature: o.signature,
    direction: "out", // unknown without tx parsing — assume out so the UI shows a neutral label
    counterparty: `${o.signature.slice(0, 4)}…${o.signature.slice(-4)}`,
    amount: null,
    status: o.status,
    ts: (o.blockTime ?? Math.floor(Date.now() / 1000)) * 1000,
    external: true,
  }
}

/**
 * Local store ∪ on-chain signatures, deduped by signature, sorted newest-first.
 * Local entries always win (richer metadata). On-chain entries fill in payments
 * the user made from another app on the same wallet.
 */
export function useMergedHistory(pubkey: string | null, limit = 25): {
  entries: MergedHistoryEntry[]
  loading: boolean
} {
  const local = useHistory()
  const onchain = useOnchainHistory(pubkey, limit)

  const entries = useMemo(() => {
    const localEntries = local.entries.map(fromLocal)
    const localSigs = new Set(localEntries.map((e) => e.signature))
    const onchainOnly = onchain.entries
      .filter((o) => !localSigs.has(o.signature))
      .map(fromOnchain)
    return [...localEntries, ...onchainOnly].sort((a, b) => b.ts - a.ts)
  }, [local.entries, onchain.entries])

  return {
    entries,
    loading: local.loading || onchain.loading,
  }
}
