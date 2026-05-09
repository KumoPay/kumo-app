import { useCallback, useEffect, useState } from "react"
import AsyncStorage from "@react-native-async-storage/async-storage"
import type { PaymentIntent } from "@kumo/shared"

/**
 * Persisted queue of signed-but-not-yet-broadcast intents. When the user signs
 * an intent while offline (or simply chooses to defer broadcast), it lands here
 * and is drained the next time they tap "Reconnect & broadcast" online.
 */
export type QueuedIntent = {
  id: string
  intent: PaymentIntent
  intentHash: string
  /** base58 ed25519 signature of `Kumo offline intent: <hash>` from the user's wallet. */
  offlineSig: string
  /** Wallet pubkey at the time of signing. */
  signerPubkey: string
  createdAt: number
  /** When set, this entry was signed offline using a durable nonce. The signed
   *  tx is ready to broadcast as-is — no rebuild, no re-sign. */
  signedTxBase64?: string
  txVersion?: "legacy" | "v0"
  sendTo?: "base" | "ephemeral"
}

const KEY = "kumo.mobile.queue.v1"

function isQueuedIntent(v: unknown): v is QueuedIntent {
  if (!v || typeof v !== "object") return false
  const o = v as Record<string, unknown>
  return (
    typeof o.id === "string" &&
    typeof o.intentHash === "string" &&
    typeof o.offlineSig === "string" &&
    typeof o.signerPubkey === "string" &&
    typeof o.createdAt === "number" &&
    Boolean(o.intent) &&
    typeof o.intent === "object"
  )
}

async function readAll(): Promise<QueuedIntent[]> {
  try {
    const raw = await AsyncStorage.getItem(KEY)
    if (!raw) return []
    const arr: unknown = JSON.parse(raw)
    if (!Array.isArray(arr)) return []
    return arr.filter(isQueuedIntent)
  } catch {
    return []
  }
}

async function writeAll(list: QueuedIntent[]): Promise<void> {
  await AsyncStorage.setItem(KEY, JSON.stringify(list)).catch(() => {})
}

export async function listQueue(): Promise<QueuedIntent[]> {
  return (await readAll()).sort((a, b) => a.createdAt - b.createdAt)
}

export async function enqueueIntent(
  entry: Omit<QueuedIntent, "id" | "createdAt"> & { id?: string; createdAt?: number },
): Promise<QueuedIntent> {
  const next: QueuedIntent = {
    id: entry.id ?? `q_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 6)}`,
    createdAt: entry.createdAt ?? Date.now(),
    intent: entry.intent,
    intentHash: entry.intentHash,
    offlineSig: entry.offlineSig,
    signerPubkey: entry.signerPubkey,
    signedTxBase64: entry.signedTxBase64,
    txVersion: entry.txVersion,
    sendTo: entry.sendTo,
  }
  const all = await readAll()
  await writeAll([...all, next])
  return next
}

export async function removeFromQueue(id: string): Promise<void> {
  const all = await readAll()
  await writeAll(all.filter((q) => q.id !== id))
}

export async function clearQueue(): Promise<void> {
  await AsyncStorage.removeItem(KEY).catch(() => {})
}

export function useQueue(): {
  queue: QueuedIntent[]
  loading: boolean
  refresh: () => Promise<void>
} {
  const [queue, setQueue] = useState<QueuedIntent[]>([])
  const [loading, setLoading] = useState(true)
  const refresh = useCallback(async () => {
    setLoading(true)
    const list = await listQueue()
    setQueue(list)
    setLoading(false)
  }, [])
  useEffect(() => {
    void refresh()
  }, [refresh])
  return { queue, loading, refresh }
}
