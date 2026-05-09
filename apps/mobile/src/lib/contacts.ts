import { PublicKey } from "@solana/web3.js"

export const DEMO_CONTACTS: Record<string, string> = {
  alice: "AMBTMn1TiX3jWcGh9BUnasBq1jix3ShJyu2QTGkSZZxQ",
  bob: "Znf1az6ZwwszgKHBTxvGQRcZaULmUMXSCkgRQhtrdQy",
  carol: "9dVFGHp5AEkan51Q6PVDxRn4tQByrwUdwkmtwkUsCi43",
}

export type ResolvedRecipient =
  | { ok: true; pubkey: string; via: "demo" | "raw" }
  | { ok: false; reason: string }

export function resolveRecipient(input: string): ResolvedRecipient {
  const trimmed = input
    .trim()
    .replace(/^([a-z0-9_-]+)\s+dot\s+sol$/i, "$1.sol")
    .replace(/^([a-z0-9_-]+)\s+sol$/i, "$1.sol")
  if (!trimmed) return { ok: false, reason: "Recipient is empty." }

  const lower = trimmed.toLowerCase()
  if (lower in DEMO_CONTACTS) {
    return { ok: true, pubkey: DEMO_CONTACTS[lower], via: "demo" }
  }

  if (lower.endsWith(".sol")) {
    return {
      ok: false,
      reason: ".sol resolution is deferred in mobile v1. Use alice, bob, carol, or paste a pubkey.",
    }
  }

  try {
    new PublicKey(trimmed)
    return { ok: true, pubkey: trimmed, via: "raw" }
  } catch {
    return {
      ok: false,
      reason: `"${trimmed}" is not a demo contact or valid Solana pubkey.`,
    }
  }
}
