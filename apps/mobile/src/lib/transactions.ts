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
