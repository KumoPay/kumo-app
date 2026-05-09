// apps/web/lib/wallet.ts
import { Keypair } from "@solana/web3.js"
import bs58 from "bs58"

/**
 * Load the demo wallet from env. Devnet only — DO NOT use mainnet
 * keys here. Falls back to a deterministic ephemeral keypair if the
 * env var is missing, so the dev experience doesn't crash.
 */
export function loadDemoWallet(): Keypair {
  const secret = process.env.DEMO_WALLET_SECRET_KEY
  if (!secret) {
    // ephemeral fallback — same key each process start so caches line up
    return Keypair.fromSeed(new Uint8Array(32).fill(7))
  }
  // Accept either base58 (preferred) or JSON-array (solana-keygen format)
  if (secret.trim().startsWith("[")) {
    return Keypair.fromSecretKey(Uint8Array.from(JSON.parse(secret)))
  }
  return Keypair.fromSecretKey(bs58.decode(secret))
}
