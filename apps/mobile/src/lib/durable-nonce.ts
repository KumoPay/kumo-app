import {
  Connection,
  Keypair,
  NONCE_ACCOUNT_LENGTH,
  NonceAccount,
  PublicKey,
  SystemProgram,
  Transaction,
} from "@solana/web3.js"
import AsyncStorage from "@react-native-async-storage/async-storage"

import { SOLANA_RPC } from "./config"

/**
 * MWA-flavored durable nonce setup.
 *
 * The standard Solana SDK assumes you have a local Keypair to sign with. With
 * MWA, the user's signing key lives in the wallet app — we never see it. So:
 *
 *   1. We generate a fresh Keypair locally for the *nonce account* itself.
 *      This key only needs to sign the create-account tx ONCE; after that, the
 *      authority (the user's wallet pubkey) is the only signer required.
 *   2. The user's wallet pays rent + signs as fee payer via MWA.
 *   3. After init, the nonce account exists on-chain and can be advanced by the
 *      authority (the user's wallet) for offline payments.
 *
 * We persist only the nonce account's *pubkey* — the keypair's secret is no
 * longer needed after init.
 */

const KEY_NONCE_PUBKEY = "kumo.nonce.pubkey.v1"
const KEY_NONCE_AUTHORITY = "kumo.nonce.authority.v1"
const KEY_CACHED_NONCE = "kumo.nonce.cached.v1"
const KEY_CACHED_AT = "kumo.nonce.cachedAt.v1"

export type NonceSetup = {
  noncePubkey: string
  authority: string
  cached: { value: string; refreshedAt: number } | null
}

export async function getNonceSetup(): Promise<NonceSetup | null> {
  const noncePubkey = await AsyncStorage.getItem(KEY_NONCE_PUBKEY).catch(() => null)
  if (!noncePubkey) return null
  const authority = await AsyncStorage.getItem(KEY_NONCE_AUTHORITY).catch(() => null)
  if (!authority) return null
  const value = await AsyncStorage.getItem(KEY_CACHED_NONCE).catch(() => null)
  const refreshedAtRaw = await AsyncStorage.getItem(KEY_CACHED_AT).catch(() => null)
  const refreshedAt = refreshedAtRaw ? Number(refreshedAtRaw) : 0
  return {
    noncePubkey,
    authority,
    cached: value ? { value, refreshedAt } : null,
  }
}

export async function isNonceReady(): Promise<boolean> {
  const setup = await getNonceSetup()
  return Boolean(setup?.cached?.value)
}

/**
 * If the locally-cached nonce account was set up by a different wallet than
 * the one currently connected, return the cached authority. Returns null
 * when the nonce belongs to the connected wallet, or when no nonce is set
 * up yet.
 *
 * The nonce account's on-chain `authority` is what gates `nonceAdvance` —
 * only that wallet can sign a tx that consumes the nonce. Trying to sign
 * with a different wallet produces a tx Solana will reject on broadcast.
 * Detecting the mismatch locally lets us block the bad sign attempt and
 * prompt the user before they queue an unbroadcastable intent.
 */
export async function getWalletNonceMismatch(
  connectedPubkey: string | null,
): Promise<{ cachedAuthority: string; cachedNoncePubkey: string } | null> {
  if (!connectedPubkey) return null
  const setup = await getNonceSetup()
  if (!setup) return null
  if (setup.authority === connectedPubkey) return null
  return { cachedAuthority: setup.authority, cachedNoncePubkey: setup.noncePubkey }
}

export type LocalNonceStatus =
  | { ready: true; value: string; ageMs: number; queueDepth: 0 }
  | {
      ready: false
      reason: "no-setup" | "no-cache" | "queue-conflict"
      value: string | null
      ageMs: number | null
      /** Number of queued, unbroadcast intents already signed against the cached value. */
      queueDepth: number
    }

/**
 * Decide whether the locally-cached nonce can be safely used to sign a new
 * offline intent — without making a network call. The cached value is the
 * authoritative on-chain nonce *as of the last refresh*; only the wallet
 * (sole `authority`) can advance it. So the only way a cached nonce
 * becomes stale locally is if we ourselves enqueue an unbroadcast intent
 * against it — the next intent signed against the same value would
 * conflict when the first one broadcasts.
 */
export async function getLocalNonceStatus(opts: {
  /** Currently-queued intents (output of `listQueue()`). Pass it in so this
   *  module doesn't take a screen-store dependency. */
  queue: Array<{ noncePubkey?: string; nonceValue?: string }>
}): Promise<LocalNonceStatus> {
  const setup = await getNonceSetup()
  if (!setup) {
    return { ready: false, reason: "no-setup", value: null, ageMs: null, queueDepth: 0 }
  }
  const cached = setup.cached
  if (!cached?.value) {
    return { ready: false, reason: "no-cache", value: null, ageMs: null, queueDepth: 0 }
  }
  const ageMs = Date.now() - cached.refreshedAt
  const queueDepth = opts.queue.filter(
    (q) => q.noncePubkey === setup.noncePubkey && q.nonceValue === cached.value,
  ).length
  if (queueDepth > 0) {
    return {
      ready: false,
      reason: "queue-conflict",
      value: cached.value,
      ageMs,
      queueDepth,
    }
  }
  return { ready: true, value: cached.value, ageMs, queueDepth: 0 }
}

export async function clearNonce(): Promise<void> {
  await AsyncStorage.multiRemove([
    KEY_NONCE_PUBKEY,
    KEY_NONCE_AUTHORITY,
    KEY_CACHED_NONCE,
    KEY_CACHED_AT,
  ]).catch(() => {})
}

async function persistSetup(noncePubkey: string, authority: string): Promise<void> {
  await AsyncStorage.multiSet([
    [KEY_NONCE_PUBKEY, noncePubkey],
    [KEY_NONCE_AUTHORITY, authority],
  ]).catch(() => {})
}

async function persistCachedNonce(value: string): Promise<void> {
  await AsyncStorage.multiSet([
    [KEY_CACHED_NONCE, value],
    [KEY_CACHED_AT, String(Date.now())],
  ]).catch(() => {})
}

export type CreateNonceResult = {
  noncePubkey: string
  signature: string
  cachedNonce: string
}

/**
 * One-time setup. Creates a nonce account on-chain, paid for and authorized by
 * the user's wallet, and caches the initial nonce value locally.
 *
 * Caller must provide a `signTransaction` that adds the user's signature via
 * MWA. We sign the new nonce account's keypair locally first (partialSign).
 */
export async function createNonceAccount(opts: {
  connection: Connection
  walletPubkey: PublicKey
  signTransaction: (tx: Transaction) => Promise<Transaction>
}): Promise<CreateNonceResult> {
  const { connection, walletPubkey, signTransaction } = opts
  const nonceAccount = Keypair.generate()
  const lamports = await connection.getMinimumBalanceForRentExemption(NONCE_ACCOUNT_LENGTH)

  const { blockhash, lastValidBlockHeight } = await connection.getLatestBlockhash("confirmed")

  const tx = new Transaction()
  tx.feePayer = walletPubkey
  tx.recentBlockhash = blockhash
  tx.add(
    SystemProgram.createAccount({
      fromPubkey: walletPubkey,
      newAccountPubkey: nonceAccount.publicKey,
      lamports,
      space: NONCE_ACCOUNT_LENGTH,
      programId: SystemProgram.programId,
    }),
    SystemProgram.nonceInitialize({
      noncePubkey: nonceAccount.publicKey,
      authorizedPubkey: walletPubkey,
    }),
  )

  // Local sign with the nonce keypair first — wallet (MWA) adds user sig next.
  tx.partialSign(nonceAccount)
  const fullySigned = await signTransaction(tx)

  const signature = await connection.sendRawTransaction(fullySigned.serialize(), {
    skipPreflight: false,
    maxRetries: 3,
  })

  // Wait for the create tx to confirm before reading the nonce value.
  await connection.confirmTransaction(
    { signature, blockhash, lastValidBlockHeight },
    "confirmed",
  )

  const noncePubkeyB58 = nonceAccount.publicKey.toBase58()
  await persistSetup(noncePubkeyB58, walletPubkey.toBase58())

  const cachedNonce = await refreshNonceFromChain({
    connection,
    noncePubkey: noncePubkeyB58,
  })

  return {
    noncePubkey: noncePubkeyB58,
    signature,
    cachedNonce,
  }
}

/**
 * Read the current nonce value from chain and cache it. Call this while online,
 * before going offline. Returns the new cached value.
 */
export async function refreshNonceFromChain(opts: {
  connection: Connection
  noncePubkey: string
}): Promise<string> {
  const { connection, noncePubkey } = opts
  const info = await connection.getAccountInfo(new PublicKey(noncePubkey), "confirmed")
  if (!info) throw new Error("Nonce account not found on chain")
  const acc = NonceAccount.fromAccountData(info.data)
  await persistCachedNonce(acc.nonce)
  return acc.nonce
}

/** Returns the rent-exemption cost in lamports for the create-nonce tx. */
export async function getNonceRentLamports(connection: Connection): Promise<number> {
  return connection.getMinimumBalanceForRentExemption(NONCE_ACCOUNT_LENGTH)
}

/** Convenience: build a Connection from the configured RPC. */
export function defaultConnection(): Connection {
  return new Connection(SOLANA_RPC, "confirmed")
}
