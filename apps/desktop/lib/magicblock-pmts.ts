// apps/desktop/lib/magicblock-pmts.ts
//
// Client for MagicBlock's Private Payments REST API.
//
// Endpoints used:
//   POST /spl/private-balance
//   POST /spl/deposit
//   POST /spl/transfer
//   POST /spl/withdraw
//
// Auth model (session keys via signature challenge):
//   1. Client requests a nonce from POST /auth/challenge
//   2. Client signs the nonce with their wallet keypair (ed25519)
//   3. Client POSTs { signature, pubkey, nonce } to /auth/session
//   4. Server returns a session JWT, valid ~24h. Stored in env var
//      MAGICBLOCK_SESSION_KEY for the prototype.
//
// In production we'd refresh the session inline. For the demo we
// pre-mint one and let the user paste it into .env.
//
// IMPORTANT: in tests we mock global fetch — see __tests__/magicblock.test.ts.

import { z } from "zod"
import { USDC_MINT_DEVNET } from "@kumo/shared"

const MPP_BASE =
  process.env.NEXT_PUBLIC_MAGICBLOCK_BASE_URL ?? "https://payments.magicblock.app/v1"

function authHeaders(): HeadersInit {
  const key = process.env.MAGICBLOCK_SESSION_KEY
  if (!key)
    throw new Error(
      "MAGICBLOCK_SESSION_KEY is missing. Run the session challenge once and paste it into .env.",
    )
  return { Authorization: `Bearer ${key}`, "Content-Type": "application/json" }
}

// --- Schemas --------------------------------------------------------------

const BalanceSchema = z.object({
  ok: z.literal(true),
  balance: z.string(), // string for big-int safety
  mint: z.string(),
})

const TransferResponseSchema = z.object({
  ok: z.literal(true),
  signature: z.string(),
  session_id: z.string(),
})

const ApiErrorSchema = z.object({ ok: z.literal(false), error: z.string() })

// --- Public API -----------------------------------------------------------

export async function getPrivateBalance(opts: {
  pubkey: string
  mint?: string
}): Promise<bigint> {
  const res = await fetch(`${MPP_BASE}/spl/private-balance`, {
    method: "POST",
    headers: authHeaders(),
    body: JSON.stringify({ pubkey: opts.pubkey, mint: opts.mint ?? USDC_MINT_DEVNET }),
  })
  const json = await res.json()
  const parsed = BalanceSchema.safeParse(json)
  if (!parsed.success) {
    const err = ApiErrorSchema.safeParse(json)
    throw new Error(err.success ? err.data.error : "Bad MagicBlock response")
  }
  return BigInt(parsed.data.balance)
}

/**
 * Settle a private transfer via MagicBlock's PER. The recipient
 * sees the amount; the public chain does not.
 *
 * `serializedTxB64` is optional — if provided, MagicBlock can attach
 * the user's pre-signed durable-nonce tx to its receipt for auditability.
 */
export async function privateTransfer(opts: {
  fromPubkey: string
  toPubkey: string
  amountUsdc: number // human-readable (e.g. 50 for 50 USDC)
  mint?: string
  serializedTxB64?: string
}): Promise<{ signature: string; sessionId: string }> {
  // USDC has 6 decimals
  const amount = BigInt(Math.round(opts.amountUsdc * 1_000_000)).toString()
  const res = await fetch(`${MPP_BASE}/spl/transfer`, {
    method: "POST",
    headers: authHeaders(),
    body: JSON.stringify({
      from: opts.fromPubkey,
      to: opts.toPubkey,
      amount,
      mint: opts.mint ?? USDC_MINT_DEVNET,
      pre_signed_tx: opts.serializedTxB64,
    }),
  })
  const json = await res.json()
  const parsed = TransferResponseSchema.safeParse(json)
  if (!parsed.success) {
    const err = ApiErrorSchema.safeParse(json)
    throw new Error(err.success ? err.data.error : "MagicBlock transfer failed")
  }
  return { signature: parsed.data.signature, sessionId: parsed.data.session_id }
}
