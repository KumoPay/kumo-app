import { z } from "zod"

export * from "./payment-intent"
import { PaymentIntentSchema, type PaymentIntent } from "./payment-intent"

// --- SignedOfflineTx ------------------------------------------------------
// What the offline signer hands to the broadcast endpoint after reconnect.

export const SignedOfflineTxSchema = z.object({
  intent: PaymentIntentSchema,
  intent_hash: z.string().regex(/^[0-9a-f]{64}$/i), // sha256 hex
  serialized_tx_b64: z.string(), // bs58 or base64-encoded signed Solana tx
  nonce_account: z.string(),
  signed_at: z.number().int().nonnegative(),
})
export type SignedOfflineTx = z.infer<typeof SignedOfflineTxSchema>

// --- BroadcastResult ------------------------------------------------------

export const BroadcastResultSchema = z.object({
  ok: z.boolean(),
  signature: z.string().optional(),
  magicblock_session_id: z.string().optional(),
  error: z.string().optional(),
})
export type BroadcastResult = z.infer<typeof BroadcastResultSchema>

// --- Constants ------------------------------------------------------------

export const USDC_MINT_DEVNET = "4zMMC9srt5Ri5X14GAgXhaHii3GnPAEERYPJgZJDncDU"
export const USDC_MINT_MAINNET = "EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v"
export const BASE_USDC = "0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913"

// LI.FI's chain identifier for Solana. Source: docs.li.fi/api-reference/chains
// (Confirm in `@lifi/sdk` `ChainId.SOL` at install time.)
export const LIFI_SOLANA_CHAIN_ID = 1151111081099710

export const SYSTEM_PROMPT_INTENT_PARSER = `You are a strict JSON intent parser for Kumo, an offline-first payments app.
You output ONLY a single JSON object matching this TypeScript type:
  { recipient: string; amount_usdc: number; private: boolean; memo?: string }

Rules:
- "private", "privately", "confidential", "off the record" => private: true
- Default private to false if not stated.
- recipient is the name/label as said. Do not invent pubkeys. Do not add prefixes.
- If the user says "<name> sol" or "<name> dot sol" they mean a Solana Name Service domain — output it as "<name>.sol" with a dot.
- amount_usdc is a number in USDC. Strip currency symbols, words like "dollars", "USDC".
- memo only if the user explicitly attaches one ("for rent", "note: thanks").
- NEVER output prose. NEVER wrap in markdown. NEVER add fields not in the schema.

Examples:

User: pay alice 50 usdc privately
JSON: {"recipient":"alice","amount_usdc":50,"private":true}

User: send 12.5 to bob for groceries
JSON: {"recipient":"bob","amount_usdc":12.5,"private":false,"memo":"groceries"}

User: confidential 100 usdc to wallet 9wR... for rent april
JSON: {"recipient":"9wR...","amount_usdc":100,"private":true,"memo":"rent april"}

User: pay carol sol 5 usdc privately
JSON: {"recipient":"carol.sol","amount_usdc":5,"private":true}

User: send 2 usdc to bob.sol
JSON: {"recipient":"bob.sol","amount_usdc":2,"private":false}
`

// --- helpers --------------------------------------------------------------

export function hashIntent(intent: PaymentIntent): Promise<string> {
  // SHA-256 hex of canonical JSON. Used as the on-chain commitment key.
  const canonical = JSON.stringify({
    recipient: intent.recipient,
    amount_usdc: intent.amount_usdc,
    private: intent.private,
    memo: intent.memo ?? "",
  })
  // Works in both Node 20+ and the browser (Web Crypto).
  const enc = new TextEncoder().encode(canonical)
  return crypto.subtle.digest("SHA-256", enc as BufferSource).then((buf) => {
    return Array.from(new Uint8Array(buf))
      .map((b) => b.toString(16).padStart(2, "0"))
      .join("")
  })
}

export * from "./intent-payload"
