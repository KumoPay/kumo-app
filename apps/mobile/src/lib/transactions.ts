import { Buffer } from "buffer"
import { Connection, Transaction, VersionedTransaction } from "@solana/web3.js"
import type { BuiltTransfer } from "./api"
import { MAGICBLOCK_TEE_RPC, SOLANA_RPC } from "./config"

export function deserializeBuiltTransaction(built: BuiltTransfer): Transaction | VersionedTransaction {
  const txBytes = Buffer.from(built.transaction_b64, "base64")
  if (built.version === "v0") return VersionedTransaction.deserialize(txBytes)
  return Transaction.from(txBytes)
}

export async function submitSignedTransaction(opts: {
  built: BuiltTransfer
  signed: Transaction | VersionedTransaction
}): Promise<string> {
  const endpoint = opts.built.send_to === "ephemeral" ? MAGICBLOCK_TEE_RPC : SOLANA_RPC
  const conn = new Connection(endpoint, "confirmed")
  return conn.sendRawTransaction(opts.signed.serialize(), {
    skipPreflight: false,
    maxRetries: 3,
  })
}

export type ConfirmationOutcome =
  | { ok: true; slot: number | null }
  | { ok: false; error: string }

/**
 * Poll getSignatureStatuses until the tx confirms, fails on-chain, or we hit the
 * timeout budget. Returns ok:true on confirmed/finalized, ok:false on tx error
 * or budget exhaustion. Designed to be safe to fire-and-forget — never throws.
 */
export async function awaitConfirmation(opts: {
  signature: string
  sendTo: "base" | "ephemeral"
  timeoutMs?: number
  pollIntervalMs?: number
}): Promise<ConfirmationOutcome> {
  const endpoint = opts.sendTo === "ephemeral" ? MAGICBLOCK_TEE_RPC : SOLANA_RPC
  const conn = new Connection(endpoint, "confirmed")
  const deadline = Date.now() + (opts.timeoutMs ?? 90_000)
  const interval = opts.pollIntervalMs ?? 2_000
  while (Date.now() < deadline) {
    try {
      const r = await conn.getSignatureStatuses([opts.signature], {
        searchTransactionHistory: true,
      })
      const status = r.value[0]
      if (status) {
        if (status.err) {
          return { ok: false, error: JSON.stringify(status.err) }
        }
        const c = status.confirmationStatus
        if (c === "confirmed" || c === "finalized") {
          return { ok: true, slot: status.slot ?? null }
        }
      }
    } catch (e) {
      console.warn("confirmation poll error:", e)
    }
    await new Promise((r) => setTimeout(r, interval))
  }
  return { ok: false, error: "Confirmation timed out" }
}
