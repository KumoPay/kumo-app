// apps/mobile/src/lib/offline-build.ts
//
// Client-side mirror of apps/web/lib/build-public-transfer.ts. Builds the
// unsigned SPL USDC transfer locally — no server call, no network — so that
// signOffline can produce a fully-signed tx with zero connectivity.
//
// Required path for the truly-offline demo: open app on a plane, type a
// payment, sign it, queue it, broadcast it when you land.

import { Buffer } from "buffer"
import {
  PublicKey,
  SystemProgram,
  Transaction,
  TransactionInstruction,
} from "@solana/web3.js"
import {
  TOKEN_PROGRAM_ID,
  ASSOCIATED_TOKEN_PROGRAM_ID,
  createAssociatedTokenAccountIdempotentInstruction,
  createTransferInstruction,
  getAssociatedTokenAddressSync,
} from "@solana/spl-token"
import { USDC_MINT_DEVNET } from "@kumo/shared"

const MEMO_PROGRAM_ID = new PublicKey(
  "MemoSq4gqABAXKb96qnH8TysNcWxMyWCqXgDLGmfcHr",
)

export type LocalNonceParams = {
  pubkey: string
  authority: string
  /** Cached current nonce value (base58) — used as the durable blockhash. */
  value: string
}

export type BuiltOfflineTransferLocal = {
  transactionBase64: string
  version: "legacy"
  sendTo: "base"
  recentBlockhash: string
  instructionCount: number
  requiredSigners: string[]
}

export function buildPublicTransferWithNonce(opts: {
  fromPubkey: string
  toPubkey: string
  amountUsdc: number
  memo?: string
  nonce: LocalNonceParams
}): BuiltOfflineTransferLocal {
  const from = new PublicKey(opts.fromPubkey)
  const to = new PublicKey(opts.toPubkey)
  const mint = new PublicKey(USDC_MINT_DEVNET)
  const nonceAccount = new PublicKey(opts.nonce.pubkey)
  const nonceAuthority = new PublicKey(opts.nonce.authority)

  const baseUnits = BigInt(Math.round(opts.amountUsdc * 1_000_000))
  const fromAta = getAssociatedTokenAddressSync(mint, from)
  const toAta = getAssociatedTokenAddressSync(mint, to)

  const ixs: TransactionInstruction[] = [
    SystemProgram.nonceAdvance({
      noncePubkey: nonceAccount,
      authorizedPubkey: nonceAuthority,
    }),
    createAssociatedTokenAccountIdempotentInstruction(
      from,
      toAta,
      to,
      mint,
      TOKEN_PROGRAM_ID,
      ASSOCIATED_TOKEN_PROGRAM_ID,
    ),
    createTransferInstruction(fromAta, toAta, from, baseUnits, [], TOKEN_PROGRAM_ID),
  ]

  if (opts.memo && opts.memo.trim().length > 0) {
    ixs.push(
      new TransactionInstruction({
        programId: MEMO_PROGRAM_ID,
        keys: [],
        data: Buffer.from(opts.memo, "utf8"),
      }),
    )
  }

  const tx = new Transaction()
  tx.recentBlockhash = opts.nonce.value
  tx.feePayer = from
  for (const ix of ixs) tx.add(ix)

  const serialized = tx.serialize({ requireAllSignatures: false, verifySignatures: false })
  return {
    transactionBase64: Buffer.from(serialized).toString("base64"),
    version: "legacy",
    sendTo: "base",
    recentBlockhash: opts.nonce.value,
    instructionCount: ixs.length,
    requiredSigners: [opts.fromPubkey],
  }
}
