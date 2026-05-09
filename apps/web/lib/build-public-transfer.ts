// apps/web/lib/build-public-transfer.ts
//
// Local builder for **public** SPL USDC transfers that the user signs offline.
// Bypasses MagicBlock entirely. Uses a durable nonce as the recentBlockhash so
// the signed tx remains valid hours/days later.
//
// Returns the same shape as MagicBlock's transfer endpoint so the route handler
// can return a single response shape regardless of path.

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

const SOLANA_RPC =
  process.env.NEXT_PUBLIC_SOLANA_RPC_URL ?? "https://api.devnet.solana.com"
const MEMO_PROGRAM_ID = new PublicKey(
  "MemoSq4gqABAXKb96qnH8TysNcWxMyWCqXgDLGmfcHr",
)

export type DurableNonceParams = {
  /** Pubkey of the durable nonce account. */
  pubkey: string
  /** Authority allowed to advance the nonce (almost always the user's wallet). */
  authority: string
  /** Cached current nonce value (base58). Plays the role of recentBlockhash. */
  value: string
}

export type BuiltOfflineTransfer = {
  transactionBase64: string
  version: "legacy"
  sendTo: "base"
  recentBlockhash: string
  /** lastValidBlockHeight is meaningless with a durable nonce; we omit it. */
  lastValidBlockHeight?: number
  instructionCount: number
  requiredSigners: string[]
}

/**
 * Build a public SPL USDC transfer that uses a durable nonce as the
 * recentBlockhash. The first instruction MUST be `nonceAdvance`.
 *
 * The recipient may not have an ATA yet, so we prepend an idempotent
 * createATA. The user (fromPubkey) pays the rent if the ATA needs to be
 * created — costs ~0.002 SOL one-time per recipient.
 */
export async function buildPublicTransferWithNonce(opts: {
  fromPubkey: string
  toPubkey: string
  amountUsdc: number
  memo?: string
  nonce: DurableNonceParams
}): Promise<BuiltOfflineTransfer> {
  const from = new PublicKey(opts.fromPubkey)
  const to = new PublicKey(opts.toPubkey)
  const mint = new PublicKey(USDC_MINT_DEVNET)
  const nonceAccount = new PublicKey(opts.nonce.pubkey)
  const nonceAuthority = new PublicKey(opts.nonce.authority)

  // USDC has 6 decimals — convert to base units.
  const baseUnits = BigInt(Math.round(opts.amountUsdc * 1_000_000))

  const fromAta = getAssociatedTokenAddressSync(mint, from)
  const toAta = getAssociatedTokenAddressSync(mint, to)

  const ixs: TransactionInstruction[] = [
    // Required first instruction when using a durable nonce as blockhash.
    SystemProgram.nonceAdvance({
      noncePubkey: nonceAccount,
      authorizedPubkey: nonceAuthority,
    }),
    // Idempotent so this is safe whether the recipient ATA exists or not.
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

  // Serialize unsigned. The user's wallet (MWA) signs offline; nonce authority
  // is the same wallet so a single signature covers fee + nonceAdvance auth.
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

/** Read the current nonce value from chain (for refresh from server side, if ever needed). */
export async function readNonceFromChain(noncePubkey: string): Promise<string> {
  const conn = new Connection(SOLANA_RPC, "confirmed")
  const info = await conn.getAccountInfo(new PublicKey(noncePubkey), "confirmed")
  if (!info) throw new Error("Nonce account not found")
  // NonceAccount.fromAccountData lives in @solana/web3.js
  const { NonceAccount } = await import("@solana/web3.js")
  const acc = NonceAccount.fromAccountData(info.data)
  return acc.nonce
}
