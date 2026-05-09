// Deterministic regex-based fallback parser for "pay <recipient> <amount> usdc [privately]"
// style intents. Used only when both on-device and cloud LLMs are unavailable.
//
// Coverage goal: ~80% of structured demo grammar. By design, won't handle freeform
// natural language ("uh hey send like 12 bucks to bob"). When the parser can't match,
// returns null so the caller can show a clear error.

import { PaymentIntentSchema, type PaymentIntent } from "@kumo/shared"

const VERBS = /^(pay|send|transfer|move)\s+/i
const PRIVACY = /\b(privately|private|confidentially|confidential|off[\s-]?the[\s-]?record)\b/gi
const MEMO = /\b(?:for|memo:?|note:?)\s+(.+)$/i
const CURRENCY = /\b(\d+(?:[.,]\d+)?)\s*(?:usdc?|dollars?|bucks?|\$)?\b/i
const TO_PREP = /\bto\b/gi
// Match "<name> sol" or "<name> dot sol" → resolved to "<name>.sol" (matches QVAC's prompt rule).
const NAME_SOL = /\b([a-z0-9_-]+)\s+(?:dot\s+)?sol\b/gi

export function parseIntentRegex(input: string): PaymentIntent | null {
  if (!input || !input.trim()) return null
  const original = input.trim()
  const isPrivate = PRIVACY.test(original)
  PRIVACY.lastIndex = 0

  // Extract amount before stripping anything else.
  const amountMatch = original.match(CURRENCY)
  if (!amountMatch) return null
  const amount = Number(amountMatch[1].replace(",", "."))
  if (!Number.isFinite(amount) || amount <= 0) return null

  let working = original

  // Memo: "for X" / "memo: X" / "note: X" — capture, then strip from the working string.
  let memo: string | undefined
  const memoMatch = working.match(MEMO)
  if (memoMatch) {
    memo = memoMatch[1].trim().replace(/[.,;]+$/, "")
    working = working.slice(0, memoMatch.index).trim()
  }

  // Strip verb prefix, privacy modifiers, currency+amount, "to" prepositions.
  working = working.replace(VERBS, "")
  working = working.replace(PRIVACY, "")
  working = working.replace(CURRENCY, "")
  working = working.replace(TO_PREP, " ")
  // Normalize "<name> sol" → "<name>.sol" before final whitespace collapse.
  working = working.replace(NAME_SOL, "$1.sol")

  const recipient = working.replace(/[^\w.\-]+/g, " ").replace(/\s+/g, " ").trim()
  if (!recipient) return null

  // If recipient looks like multiple words after cleanup, treat the longest token as the name.
  // (e.g. "alice the cat" → "alice"). For pubkey-like (base58 32+ char) tokens, prefer that.
  const tokens = recipient.split(" ")
  const pubkeyLike = tokens.find((t) => /^[1-9A-HJ-NP-Za-km-z]{32,44}$/.test(t))
  const dotSol = tokens.find((t) => /\.sol$/i.test(t))
  const finalRecipient = pubkeyLike ?? dotSol ?? tokens[0] ?? recipient

  const candidate = {
    recipient: finalRecipient,
    amount_usdc: amount,
    private: isPrivate,
    ...(memo ? { memo } : {}),
  }

  const parsed = PaymentIntentSchema.safeParse(candidate)
  return parsed.success ? parsed.data : null
}
