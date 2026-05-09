import { useEffect, useState, useCallback } from "react"
import AsyncStorage from "@react-native-async-storage/async-storage"

export type LocalHistoryEntry = {
  id: string
  direction: "out" | "in"
  counterparty: string
  amount: number
  signature: string
  status: "delivered" | "queued"
  sendTo?: "base" | "ephemeral"
  validator?: string
  createdAt: number // ms epoch
}

const KEY = "kumo.mobile.history.v1"
const MAX_ENTRIES = 200

function isEntry(v: unknown): v is LocalHistoryEntry {
  if (!v || typeof v !== "object") return false
  const o = v as Record<string, unknown>
  return (
    typeof o.id === "string" &&
    (o.direction === "out" || o.direction === "in") &&
    typeof o.counterparty === "string" &&
    typeof o.amount === "number" &&
    typeof o.signature === "string" &&
    typeof o.createdAt === "number"
  )
}

async function readAll(): Promise<LocalHistoryEntry[]> {
  try {
    const raw = await AsyncStorage.getItem(KEY)
    if (!raw) return []
    const arr: unknown = JSON.parse(raw)
    if (!Array.isArray(arr)) return []
    return arr.filter(isEntry)
  } catch {
    return []
  }
}

async function writeAll(list: LocalHistoryEntry[]): Promise<void> {
  await AsyncStorage.setItem(KEY, JSON.stringify(list.slice(0, MAX_ENTRIES))).catch(() => {})
}

export async function listHistory(): Promise<LocalHistoryEntry[]> {
  return (await readAll()).sort((a, b) => b.createdAt - a.createdAt)
}

export async function appendHistory(entry: Omit<LocalHistoryEntry, "id" | "createdAt"> & {
  id?: string
  createdAt?: number
}): Promise<LocalHistoryEntry> {
  const next: LocalHistoryEntry = {
    id: entry.id ?? entry.signature ?? `tx_${Math.random().toString(36).slice(2, 10)}`,
    createdAt: entry.createdAt ?? Date.now(),
    direction: entry.direction,
    counterparty: entry.counterparty,
    amount: entry.amount,
    signature: entry.signature,
    status: entry.status,
    sendTo: entry.sendTo,
    validator: entry.validator,
  }
  const existing = await readAll()
  await writeAll([next, ...existing.filter((e) => e.id !== next.id)])
  return next
}

export async function clearHistory(): Promise<void> {
  await AsyncStorage.removeItem(KEY).catch(() => {})
}

export function relativeTime(ts: number): string {
  const diff = Math.max(0, Date.now() - ts)
  if (diff < 60_000) return "just now"
  if (diff < 3_600_000) return `${Math.floor(diff / 60_000)} min ago`
  if (diff < 86_400_000) return `${Math.floor(diff / 3_600_000)} h ago`
  if (diff < 7 * 86_400_000) return `${Math.floor(diff / 86_400_000)} d ago`
  return `${Math.floor(diff / (7 * 86_400_000))} w ago`
}

export function useHistory(): {
  entries: LocalHistoryEntry[]
  loading: boolean
  refresh: () => Promise<void>
} {
  const [entries, setEntries] = useState<LocalHistoryEntry[]>([])
  const [loading, setLoading] = useState(true)
  const refresh = useCallback(async () => {
    setLoading(true)
    const list = await listHistory()
    setEntries(list)
    setLoading(false)
  }, [])
  useEffect(() => {
    void refresh()
  }, [refresh])
  return { entries, loading, refresh }
}
