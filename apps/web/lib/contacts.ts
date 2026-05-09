// apps/web/lib/contacts.ts
//
// Recipient resolution. In priority order:
//   1. localStorage Kumo contact book (user-managed)
//   2. Hardcoded demo contacts (alice/bob/carol — the standard crypto placeholders)
//   3. .sol domain → SNS lookup via @bonfida/spl-name-service
//   4. Raw base58 pubkey
//
// All async because SNS requires an RPC call.

"use client"

import { Connection, PublicKey } from "@solana/web3.js"
import { resolve as resolveSns } from "@bonfida/spl-name-service"

const STORAGE_KEY = "kumo:contacts"

export type ContactMap = Record<string, string>

export const DEMO_CONTACTS: ContactMap = {
  alice: "AMBTMn1TiX3jWcGh9BUnasBq1jix3ShJyu2QTGkSZZxQ",
  bob: "Znf1az6ZwwszgKHBTxvGQRcZaULmUMXSCkgRQhtrdQy",
  carol: "9dVFGHp5AEkan51Q6PVDxRn4tQByrwUdwkmtwkUsCi43",
}

export function loadContacts(): ContactMap {
  if (typeof window === "undefined") return {}
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    if (!raw) return {}
    const parsed = JSON.parse(raw)
    if (typeof parsed !== "object" || !parsed) return {}
    return parsed as ContactMap
  } catch {
    return {}
  }
}

export function saveContact(name: string, pubkey: string): ContactMap {
  if (typeof window === "undefined") return {}
  const key = name.toLowerCase().trim()
  if (!key) return loadContacts()
  // Validate the pubkey before saving
  try {
    new PublicKey(pubkey)
  } catch {
    return loadContacts()
  }
  const current = loadContacts()
  const next = { ...current, [key]: pubkey }
  localStorage.setItem(STORAGE_KEY, JSON.stringify(next))
  return next
}

export function removeContact(name: string): ContactMap {
  if (typeof window === "undefined") return {}
  const key = name.toLowerCase().trim()
  const current = loadContacts()
  if (!(key in current)) return current
  const next = { ...current }
  delete next[key]
  localStorage.setItem(STORAGE_KEY, JSON.stringify(next))
  return next
}

/** All contacts (saved + demos) merged. Saved entries override demo entries. */
export function allContacts(): ContactMap {
  return { ...DEMO_CONTACTS, ...loadContacts() }
}

/** Title-case a contact name for display ("alice" → "Alice", "bob.sol" → "Bob.sol"). */
export function displayName(name: string): string {
  if (!name) return name
  return name.charAt(0).toUpperCase() + name.slice(1)
}

export type ResolvedRecipient =
  | { ok: true; pubkey: string; via: "saved" | "demo" | "sns" | "raw" }
  | { ok: false; reason: string }

/**
 * Resolve a free-text recipient to a pubkey. Async because .sol domains hit
 * Solana RPC. Returns a tagged union so callers can show why a name wasn't
 * resolvable.
 */
export async function resolveRecipient(
  input: string,
  connection: Connection,
): Promise<ResolvedRecipient> {
  let trimmed = input.trim()
  if (!trimmed) return { ok: false, reason: "empty input" }

  // Normalize "<name> sol" or "<name> dot sol" → "<name>.sol".
  // Catches LLM output that drops the dot when transcribing speech-style input.
  trimmed = trimmed
    .replace(/^([a-z0-9_-]+)\s+dot\s+sol$/i, "$1.sol")
    .replace(/^([a-z0-9_-]+)\s+sol$/i, "$1.sol")

  const lower = trimmed.toLowerCase()

  // 1. Saved contacts (localStorage)
  const saved = loadContacts()
  if (lower in saved) return { ok: true, pubkey: saved[lower], via: "saved" }

  // 2. Demo contacts
  if (lower in DEMO_CONTACTS) return { ok: true, pubkey: DEMO_CONTACTS[lower], via: "demo" }

  // 3. .sol domain
  if (lower.endsWith(".sol")) {
    try {
      const owner = await resolveSns(connection, lower)
      return { ok: true, pubkey: owner.toBase58(), via: "sns" }
    } catch (e) {
      const msg = e instanceof Error ? e.message : "unknown error"
      return { ok: false, reason: `couldn't resolve ${lower} via SNS: ${msg}` }
    }
  }

  // 4. Raw base58 pubkey
  try {
    new PublicKey(trimmed)
    return { ok: true, pubkey: trimmed, via: "raw" }
  } catch {
    return {
      ok: false,
      reason:
        `"${trimmed}" isn't a saved contact, .sol domain, or valid pubkey. ` +
        `Known: ${Object.keys(allContacts()).join(", ") || "(none)"}.`,
    }
  }
}
