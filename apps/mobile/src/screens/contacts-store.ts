import { useEffect, useState, useCallback } from "react"
import AsyncStorage from "@react-native-async-storage/async-storage"

export type Contact = {
  id: string
  name: string
  handle: string
  pubkey: string
  bg: string
  initial: string
  createdAt: number
}

const KEY = "kumo.mobile.contacts.v1"

const PALETTE = ["#7FE8FF", "#C7B5FF", "#B7F1FF", "#FFD8B7", "#C7F1B7", "#FFB7C7"]

function isContact(v: unknown): v is Contact {
  if (!v || typeof v !== "object") return false
  const o = v as Record<string, unknown>
  return (
    typeof o.id === "string" &&
    typeof o.name === "string" &&
    typeof o.handle === "string" &&
    typeof o.pubkey === "string"
  )
}

async function readAll(): Promise<Contact[]> {
  try {
    const raw = await AsyncStorage.getItem(KEY)
    if (!raw) return []
    const arr: unknown = JSON.parse(raw)
    if (!Array.isArray(arr)) return []
    return arr.filter(isContact)
  } catch {
    return []
  }
}

async function writeAll(list: Contact[]): Promise<void> {
  await AsyncStorage.setItem(KEY, JSON.stringify(list)).catch(() => {})
}

export async function listContacts(): Promise<Contact[]> {
  return (await readAll()).sort((a, b) => b.createdAt - a.createdAt)
}

export async function addContact(input: {
  name: string
  handle: string
  pubkey: string
}): Promise<Contact> {
  const id = input.name.toLowerCase().replace(/[^a-z0-9]/g, "").slice(0, 32) ||
             `c_${Math.random().toString(36).slice(2, 8)}`
  const all = await readAll()
  const next: Contact = {
    id,
    name: input.name.trim(),
    handle: input.handle.trim() || `@${id}`,
    pubkey: input.pubkey.trim(),
    bg: PALETTE[all.length % PALETTE.length],
    initial: (input.name.trim().charAt(0) || "?").toUpperCase(),
    createdAt: Date.now(),
  }
  await writeAll([next, ...all.filter((c) => c.id !== id)])
  return next
}

export async function deleteContact(id: string): Promise<void> {
  const all = await readAll()
  await writeAll(all.filter((c) => c.id !== id))
}

/** Resolve a recipient string (name, handle, or raw pubkey) to a Solana pubkey. */
export async function resolveRecipientToPubkey(query: string): Promise<string | null> {
  const q = query.trim().toLowerCase().replace(/^@/, "")
  if (!q) return null
  if (/^[1-9A-HJ-NP-Za-km-z]{32,44}$/.test(query.trim())) return query.trim()
  const all = await listContacts()
  const hit = all.find(
    (c) =>
      c.id.toLowerCase() === q ||
      c.name.toLowerCase().replace(/\s+/g, "") === q ||
      c.handle.toLowerCase().replace(/^@/, "") === q,
  )
  return hit?.pubkey ?? null
}

/** React hook: subscribes to local contacts. Re-fetches via refresh(). */
export function useContacts(): {
  contacts: Contact[]
  loading: boolean
  refresh: () => Promise<void>
} {
  const [contacts, setContacts] = useState<Contact[]>([])
  const [loading, setLoading] = useState(true)
  const refresh = useCallback(async () => {
    setLoading(true)
    const list = await listContacts()
    setContacts(list)
    setLoading(false)
  }, [])
  useEffect(() => {
    void refresh()
  }, [refresh])
  return { contacts, loading, refresh }
}
