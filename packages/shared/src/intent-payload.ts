import { z } from "zod"
import { PaymentIntentSchema, type PaymentIntent } from "./payment-intent"

/**
 * URI prefix for Kumo intent payloads. Lets receivers detect a Kumo intent
 * inside any text channel (QR scan, Telegram message, AirDrop body, SMS).
 */
export const INTENT_PAYLOAD_PREFIX = "kumo:intent:v1:"

export const IntentPayloadWalletSchema = z.object({
  label: z.string().optional(),
  pubkey: z.string().min(32),
  brand: z.string().optional(),
})
export type IntentPayloadWallet = z.infer<typeof IntentPayloadWalletSchema>

export const IntentPayloadSchema = z.object({
  v: z.literal(1),
  kind: z.literal("kumo.intent"),
  wallet: IntentPayloadWalletSchema,
  intent: PaymentIntentSchema,
  intentHash: z.string().regex(/^[0-9a-f]{64}$/i),
  offlineSig: z.string().min(1),
  signedTx: z.string().nullable(),
  txVersion: z.enum(["legacy", "v0"]).nullable(),
  sendTo: z.enum(["base", "ephemeral"]).nullable(),
  createdAt: z.number().int().nonnegative(),
})
export type IntentPayload = z.infer<typeof IntentPayloadSchema>

export type IntentPayloadInput = {
  intent: PaymentIntent
  intentHash: string
  offlineSig: string
  signerPubkey: string
  createdAt: number
  signedTxBase64?: string | null
  txVersion?: "legacy" | "v0" | null
  sendTo?: "base" | "ephemeral" | null
}

export type IntentPayloadWalletInput = {
  label?: string | null
  pubkey: string
  brand?: string | null
}

/**
 * Build a self-contained, transport-agnostic intent payload that carries the
 * actual broadcastable tx + the wallet identity that signed it. Encoded as
 * `kumo:intent:v1:<base64-json>` so it survives QR, AirDrop, SMS, Telegram.
 *
 * Wallet attribution: when `wallet` is provided, its `label/pubkey/brand`
 * travel in the payload. When `wallet` is null (e.g. queue entry restored
 * after a fresh launch before MWA reconnect), we fall back to `signerPubkey`
 * from the queue entry — the signature is what the chain enforces, not the
 * display label.
 */
export function buildIntentPayload(
  entry: IntentPayloadInput,
  wallet: IntentPayloadWalletInput | null,
): string {
  const walletPayload: IntentPayloadWallet = wallet
    ? {
        ...(wallet.label ? { label: wallet.label } : {}),
        pubkey: wallet.pubkey,
        ...(wallet.brand ? { brand: wallet.brand } : {}),
      }
    : { pubkey: entry.signerPubkey }

  const payload: IntentPayload = {
    v: 1,
    kind: "kumo.intent",
    wallet: walletPayload,
    intent: entry.intent,
    intentHash: entry.intentHash,
    offlineSig: entry.offlineSig,
    signedTx: entry.signedTxBase64 ?? null,
    txVersion: entry.txVersion ?? null,
    sendTo: entry.sendTo ?? null,
    createdAt: entry.createdAt,
  }
  const json = JSON.stringify(payload)
  return `${INTENT_PAYLOAD_PREFIX}${base64Encode(json)}`
}

/**
 * Inverse of `buildIntentPayload`. Validates with zod — throws on a malformed
 * or unsigned payload, returns a typed `IntentPayload` on success.
 */
export function parseIntentPayload(uri: string): IntentPayload {
  if (!uri.startsWith(INTENT_PAYLOAD_PREFIX)) {
    throw new Error("Not a Kumo intent payload: missing kumo:intent:v1: prefix")
  }
  const b64 = uri.slice(INTENT_PAYLOAD_PREFIX.length)
  let json: string
  try {
    json = base64Decode(b64)
  } catch {
    throw new Error("Not a Kumo intent payload: invalid base64")
  }
  let data: unknown
  try {
    data = JSON.parse(json)
  } catch {
    throw new Error("Not a Kumo intent payload: invalid JSON")
  }
  return IntentPayloadSchema.parse(data)
}

type BufferLike = {
  from(data: string, encoding: "utf8" | "base64"): { toString(encoding: "utf8" | "base64"): string }
}
function bufferGlobal(): BufferLike | undefined {
  return (globalThis as { Buffer?: BufferLike }).Buffer
}

function base64Encode(s: string): string {
  const B = bufferGlobal()
  if (B) return B.from(s, "utf8").toString("base64")
  return btoa(
    Array.from(new TextEncoder().encode(s))
      .map((b) => String.fromCharCode(b))
      .join(""),
  )
}

function base64Decode(b64: string): string {
  const B = bufferGlobal()
  if (B) return B.from(b64, "base64").toString("utf8")
  const bin = atob(b64)
  const bytes = new Uint8Array(bin.length)
  for (let i = 0; i < bin.length; i++) bytes[i] = bin.charCodeAt(i)
  return new TextDecoder().decode(bytes)
}
