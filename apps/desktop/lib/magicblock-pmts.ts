// apps/desktop/lib/magicblock-pmts.ts
//
// Thin REST client for MagicBlock's Private Payments API. The API is
// stateless — it builds unsigned transactions; we sign and submit on
// the caller side (see app/api/broadcast/route.ts).
//
// Spec: ~/.claude/skills/magicblock/private-payments.md
//
// Auth flow (only needed for /spl/private-balance and ER-touching transfers):
//   1. GET  /v1/spl/challenge?pubkey=<wallet>   -> { challenge }
//   2. wallet signs the challenge (ed25519)
//   3. POST /v1/spl/login { pubkey, challenge, signature } -> { token }
//   4. Authorization: Bearer <token>
//
// scripts/mint-magicblock-session.ts runs this flow once and prints
// the token for pasting into MAGICBLOCK_SESSION_KEY.

import { z } from "zod"
import { USDC_MINT_DEVNET } from "@kumo/shared"

const MPP_BASE =
  process.env.NEXT_PUBLIC_MAGICBLOCK_BASE_URL ?? "https://payments.magicblock.app/v1"

const CLUSTER = process.env.NEXT_PUBLIC_SOLANA_CLUSTER ?? "devnet"

function authHeaders(includeAuth: boolean): HeadersInit {
  const headers: Record<string, string> = { "Content-Type": "application/json" }
  if (includeAuth) {
    const key = process.env.MAGICBLOCK_SESSION_KEY
    if (!key)
      throw new Error(
        "MAGICBLOCK_SESSION_KEY is missing. Run scripts/mint-magicblock-session.ts and paste the result into .env.",
      )
    headers["Authorization"] = `Bearer ${key}`
  }
  return headers
}

// --- Schemas --------------------------------------------------------------

const BalanceSchema = z.object({
  address: z.string(),
  mint: z.string(),
  ata: z.string(),
  location: z.enum(["base", "ephemeral"]),
  balance: z.string(),
})

const BuildTxSchema = z.object({
  kind: z.string(),
  version: z.enum(["legacy", "v0"]),
  transactionBase64: z.string(),
  sendTo: z.enum(["base", "ephemeral"]),
  recentBlockhash: z.string(),
  lastValidBlockHeight: z.number(),
  instructionCount: z.number(),
  requiredSigners: z.array(z.string()),
  validator: z.string().optional(),
})

const ApiErrorSchema = z.object({
  error: z.object({
    code: z.string(),
    message: z.string(),
  }),
})

async function unwrap<T>(
  res: Response,
  schema: z.ZodSchema<T>,
  label: string,
): Promise<T> {
  const json = await res.json().catch(() => null)
  const parsed = schema.safeParse(json)
  if (parsed.success) return parsed.data
  const err = ApiErrorSchema.safeParse(json)
  throw new Error(
    err.success
      ? `${label} failed (${err.data.error.code}): ${err.data.error.message}`
      : `${label} returned unexpected payload (HTTP ${res.status}): ${JSON.stringify(json).slice(0, 200)}`,
  )
}

// --- Public API -----------------------------------------------------------

export type BuiltTransaction = z.infer<typeof BuildTxSchema>

export async function getPrivateBalance(opts: {
  pubkey: string
  mint?: string
}): Promise<bigint> {
  const url = new URL(`${MPP_BASE}/spl/private-balance`)
  url.searchParams.set("address", opts.pubkey)
  url.searchParams.set("mint", opts.mint ?? USDC_MINT_DEVNET)
  url.searchParams.set("cluster", CLUSTER)

  const res = await fetch(url.toString(), { headers: authHeaders(true) })
  const data = await unwrap(res, BalanceSchema, "private-balance")
  return BigInt(data.balance)
}

/**
 * Build an unsigned private SPL transfer transaction. The caller signs
 * with each pubkey in `requiredSigners` and submits to the cluster
 * indicated by `sendTo` ("base" = Solana RPC, "ephemeral" = ER RPC).
 *
 * `base → base` private transfers don't need auth; ER routes do.
 */
export async function privateTransfer(opts: {
  fromPubkey: string
  toPubkey: string
  amountUsdc: number
  mint?: string
  fromBalance?: "base" | "ephemeral"
  toBalance?: "base" | "ephemeral"
  memo?: string
  legacy?: boolean
}): Promise<BuiltTransaction> {
  const amount = BigInt(Math.round(opts.amountUsdc * 1_000_000)).toString()
  const fromBalance = opts.fromBalance ?? "base"
  const toBalance = opts.toBalance ?? "base"

  const body: Record<string, unknown> = {
    from: opts.fromPubkey,
    to: opts.toPubkey,
    mint: opts.mint ?? USDC_MINT_DEVNET,
    amount,
    visibility: "private",
    fromBalance,
    toBalance,
    cluster: CLUSTER,
    initIfMissing: true,
    initAtasIfMissing: true,
    initVaultIfMissing: true,
  }
  if (opts.memo) body.memo = opts.memo
  if (opts.legacy) body.legacy = true

  const needsAuth = fromBalance === "ephemeral" || toBalance === "ephemeral"
  const res = await fetch(`${MPP_BASE}/spl/transfer`, {
    method: "POST",
    headers: authHeaders(needsAuth),
    body: JSON.stringify(body),
  })
  return unwrap(res, BuildTxSchema, "transfer")
}
