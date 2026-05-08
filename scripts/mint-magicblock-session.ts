// scripts/mint-magicblock-session.ts
//
// One-shot helper to mint a MagicBlock Private Payments session JWT.
// Usage:
//   pnpm dlx tsx scripts/mint-magicblock-session.ts
//
// Reads DEMO_WALLET_SECRET_KEY (base58) and NEXT_PUBLIC_MAGICBLOCK_BASE_URL
// from .env, runs the challenge → sign → session flow, prints the JWT.
// Paste the result into MAGICBLOCK_SESSION_KEY in your .env.

import nacl from "tweetnacl"
import bs58 from "bs58"
import { config } from "dotenv"

config()

const BASE = process.env.NEXT_PUBLIC_MAGICBLOCK_BASE_URL ?? "https://payments.magicblock.app/v1"
const SECRET = process.env.DEMO_WALLET_SECRET_KEY

if (!SECRET) {
  console.error("DEMO_WALLET_SECRET_KEY missing in .env")
  process.exit(1)
}

async function main() {
  const secretBytes = bs58.decode(SECRET!)
  const kp = nacl.sign.keyPair.fromSecretKey(secretBytes)
  const pubkey = bs58.encode(kp.publicKey)

  console.error(`Pubkey: ${pubkey}`)
  console.error(`GET ${BASE}/spl/challenge?pubkey=${pubkey} ...`)

  const challengeRes = await fetch(
    `${BASE}/spl/challenge?pubkey=${encodeURIComponent(pubkey)}`,
  )
  const challenge = await challengeRes.json().catch(() => null)
  if (!challengeRes.ok || !challenge?.challenge) {
    console.error(`Challenge failed (HTTP ${challengeRes.status}):`, challenge)
    process.exit(1)
  }

  const signature = nacl.sign.detached(
    new TextEncoder().encode(challenge.challenge),
    kp.secretKey,
  )

  console.error(`POST ${BASE}/spl/login ...`)
  const sessionRes = await fetch(`${BASE}/spl/login`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      pubkey,
      challenge: challenge.challenge,
      signature: bs58.encode(signature),
    }),
  })
  const session = await sessionRes.json().catch(() => null)
  if (!sessionRes.ok || !session?.token) {
    console.error(`Session mint failed (HTTP ${sessionRes.status}):`, session)
    process.exit(1)
  }

  console.error("\nPaste this into .env as MAGICBLOCK_SESSION_KEY:\n")
  console.log(session.token)
  console.error(`\n(expires: ${session.expires_at ?? "~24h"})`)
}

main().catch((err) => {
  console.error("Mint script crashed:", err)
  process.exit(1)
})
