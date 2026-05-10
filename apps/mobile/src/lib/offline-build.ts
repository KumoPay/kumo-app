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
  Connection,
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

/** Shared SPL transfer ix construction. Public USDC, ATA-create-if-missing, optional memo. */
function buildTransferIxs(opts: {
  from: PublicKey
  to: PublicKey
  mint: PublicKey
  amountBaseUnits: bigint
  memo?: string
  /** When set, prepended as ix[0] for durable-nonce txs. */
  prependNonceAdvance?: { noncePubkey: PublicKey; authority: PublicKey }
}): TransactionInstruction[] {
  const fromAta = getAssociatedTokenAddressSync(opts.mint, opts.from)
  const toAta = getAssociatedTokenAddressSync(opts.mint, opts.to)
  const ixs: TransactionInstruction[] = []
  if (opts.prependNonceAdvance) {
    ixs.push(
      SystemProgram.nonceAdvance({
        noncePubkey: opts.prependNonceAdvance.noncePubkey,
        authorizedPubkey: opts.prependNonceAdvance.authority,
      }),
    )
  }
  ixs.push(
    createAssociatedTokenAccountIdempotentInstruction(
      opts.from,
      toAta,
      opts.to,
      opts.mint,
      TOKEN_PROGRAM_ID,
      ASSOCIATED_TOKEN_PROGRAM_ID,
    ),
    createTransferInstruction(fromAta, toAta, opts.from, opts.amountBaseUnits, [], TOKEN_PROGRAM_ID),
  )
  if (opts.memo && opts.memo.trim().length > 0) {
    ixs.push(
      new TransactionInstruction({
        programId: MEMO_PROGRAM_ID,
        keys: [],
        data: Buffer.from(opts.memo, "utf8"),
      }),
    )
  }
  return ixs
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

  const ixs = buildTransferIxs({
    from,
    to,
    mint,
    amountBaseUnits: BigInt(Math.round(opts.amountUsdc * 1_000_000)),
    memo: opts.memo,
    prependNonceAdvance: {
      noncePubkey: new PublicKey(opts.nonce.pubkey),
      authority: new PublicKey(opts.nonce.authority),
    },
  })

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

/**
 * Online variant — fetches a fresh blockhash from RPC instead of using a nonce.
 * Use when the user is online and either has no nonce account, or doesn't want
 * to consume one for an immediately-broadcast tx.
 */
export async function buildPublicTransferFresh(opts: {
  connection: Connection
  fromPubkey: string
  toPubkey: string
  amountUsdc: number
  memo?: string
}): Promise<BuiltOfflineTransferLocal> {
  const from = new PublicKey(opts.fromPubkey)
  const to = new PublicKey(opts.toPubkey)
  const mint = new PublicKey(USDC_MINT_DEVNET)

  const { blockhash } = await opts.connection.getLatestBlockhash("confirmed")

  const ixs = buildTransferIxs({
    from,
    to,
    mint,
    amountBaseUnits: BigInt(Math.round(opts.amountUsdc * 1_000_000)),
    memo: opts.memo,
  })

  const tx = new Transaction()
  tx.recentBlockhash = blockhash
  tx.feePayer = from
  for (const ix of ixs) tx.add(ix)

  const serialized = tx.serialize({ requireAllSignatures: false, verifySignatures: false })
  return {
    transactionBase64: Buffer.from(serialized).toString("base64"),
    version: "legacy",
    sendTo: "base",
    recentBlockhash: blockhash,
    instructionCount: ixs.length,
    requiredSigners: [opts.fromPubkey],
  }
}
