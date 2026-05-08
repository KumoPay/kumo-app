// apps/desktop/lib/durable-nonce.ts
//
// The trick that makes Kumo work offline.
//
// A normal Solana tx requires `recentBlockhash` — a hash of a recent
// validator block, valid for ~150 slots (~60 seconds). Useless when
// the device has been offline for 30 minutes on a flight.
//
// A *durable nonce* is a special account whose stored value plays
// the role of `recentBlockhash`. It only advances when explicitly
// instructed via `SystemProgram.nonceAdvance`. So the user can:
//
//   1. (online, once)  Create + fund a nonce account
//   2. (online, before each flight) Refresh the nonce; cache its
//      value locally in IndexedDB
//   3. (offline) Sign a tx whose `recentBlockhash` is the cached
//      nonce value, with `nonceAdvance` as the FIRST instruction.
//   4. (online again) Broadcast.
//
// References:
//   - https://docs.solana.com/implemented-proposals/durable-tx-nonces
//   - SystemProgram.createNonceAccount / nonceAdvance
//
// The flow diagram lives in docs/OFFLINE_FLOW.md.

import {
  Connection,
  Keypair,
  NONCE_ACCOUNT_LENGTH,
  NonceAccount,
  PublicKey,
  SystemProgram,
  Transaction,
  TransactionInstruction,
} from "@solana/web3.js"

export type NonceCacheEntry = {
  noncePubkey: string
  nonce: string // base58 — used as recentBlockhash
  authorityPubkey: string
  refreshedAt: number
}

const NONCE_CACHE_KEY = "kumo:nonce"

// --- Cache (IndexedDB-friendly via localStorage stub for the prototype) ---

export function loadNonceCache(): NonceCacheEntry | null {
  if (typeof window === "undefined") return null
  const raw = window.localStorage.getItem(NONCE_CACHE_KEY)
  return raw ? (JSON.parse(raw) as NonceCacheEntry) : null
}

export function saveNonceCache(entry: NonceCacheEntry): void {
  if (typeof window === "undefined") return
  window.localStorage.setItem(NONCE_CACHE_KEY, JSON.stringify(entry))
}

// --- Setup (online, BEFORE going offline) ---

/**
 * Create + fund a new durable nonce account. Run ONCE per user, while
 * online. Returns the nonce account keypair so the caller can persist
 * it (encrypted) somewhere.
 */
export async function createDurableNonce(opts: {
  connection: Connection
  authority: Keypair
}): Promise<{ noncePubkey: PublicKey; nonceAccount: Keypair }> {
  const { connection, authority } = opts
  const nonceAccount = Keypair.generate()
  const lamports = await connection.getMinimumBalanceForRentExemption(NONCE_ACCOUNT_LENGTH)

  const tx = new Transaction().add(
    SystemProgram.createAccount({
      fromPubkey: authority.publicKey,
      newAccountPubkey: nonceAccount.publicKey,
      lamports,
      space: NONCE_ACCOUNT_LENGTH,
      programId: SystemProgram.programId,
    }),
    SystemProgram.nonceInitialize({
      noncePubkey: nonceAccount.publicKey,
      authorizedPubkey: authority.publicKey,
    }),
  )
  const { blockhash } = await connection.getLatestBlockhash()
  tx.recentBlockhash = blockhash
  tx.feePayer = authority.publicKey
  tx.sign(authority, nonceAccount)
  await connection.sendRawTransaction(tx.serialize())

  return { noncePubkey: nonceAccount.publicKey, nonceAccount }
}

/**
 * Read the current nonce value from chain. Cache it locally so the
 * offline signer can reuse it.
 */
export async function refreshNonceFromChain(opts: {
  connection: Connection
  noncePubkey: PublicKey
  authorityPubkey: PublicKey
}): Promise<NonceCacheEntry> {
  const { connection, noncePubkey, authorityPubkey } = opts
  const accInfo = await connection.getAccountInfo(noncePubkey, "confirmed")
  if (!accInfo) throw new Error("Nonce account not found: " + noncePubkey.toBase58())
  const nonceAccount = NonceAccount.fromAccountData(accInfo.data)
  const entry: NonceCacheEntry = {
    noncePubkey: noncePubkey.toBase58(),
    nonce: nonceAccount.nonce,
    authorityPubkey: authorityPubkey.toBase58(),
    refreshedAt: Date.now(),
  }
  saveNonceCache(entry)
  return entry
}

// --- Offline signing -------------------------------------------------------

/**
 * Build + sign a transaction OFFLINE using a cached durable nonce.
 * The first instruction is always `nonceAdvance`; the user-supplied
 * instructions follow.
 */
export function buildOfflineTx(opts: {
  payerSigner: Keypair
  cached: NonceCacheEntry
  instructions: TransactionInstruction[]
}): Transaction {
  const { payerSigner, cached, instructions } = opts
  const tx = new Transaction()
  tx.feePayer = payerSigner.publicKey
  tx.recentBlockhash = cached.nonce // <- the durable nonce's value plays the role of blockhash
  tx.add(
    SystemProgram.nonceAdvance({
      noncePubkey: new PublicKey(cached.noncePubkey),
      authorizedPubkey: new PublicKey(cached.authorityPubkey),
    }),
    ...instructions,
  )
  tx.sign(payerSigner)
  return tx
}

// --- Tx storage (IndexedDB stub) ------------------------------------------

const PENDING_TX_KEY = "kumo:pending-tx"

export function storePendingTx(serializedTxB64: string): void {
  if (typeof window === "undefined") return
  window.localStorage.setItem(PENDING_TX_KEY, serializedTxB64)
}

export function loadPendingTx(): string | null {
  if (typeof window === "undefined") return null
  return window.localStorage.getItem(PENDING_TX_KEY)
}

export function clearPendingTx(): void {
  if (typeof window === "undefined") return
  window.localStorage.removeItem(PENDING_TX_KEY)
}
