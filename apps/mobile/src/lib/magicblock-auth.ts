// apps/mobile/src/lib/magicblock-auth.ts
//
// Direct-from-device MagicBlock challenge / sign / login flow. No Kumo server
// involved. The user's wallet signs the challenge via MWA; the bearer token
// returned by /v1/spl/login is cached in AsyncStorage keyed by pubkey.
//
// Used by magicblock-direct.ts for private-transfer builds.

import AsyncStorage from "@react-native-async-storage/async-storage"
import bs58 from "bs58"

const MAGICBLOCK_BASE_URL =
  process.env.EXPO_PUBLIC_MAGICBLOCK_BASE_URL ?? "https://payments.magicblock.app/v1"

type CachedSession = {
  token: string
  /** ms epoch */
  mintedAt: number
  /** ISO from MagicBlock or null if not provided */
  expiresAt: string | null
}

function cacheKey(pubkey: string): string {
  return `kumo.mb.session.v1:${pubkey}`
}

async function readSession(pubkey: string): Promise<CachedSession | null> {
  try {
    const raw = await AsyncStorage.getItem(cacheKey(pubkey))
    if (!raw) return null
    const parsed: unknown = JSON.parse(raw)
    if (
      parsed &&
      typeof parsed === "object" &&
      typeof (parsed as CachedSession).token === "string"
    ) {
      return parsed as CachedSession
    }
  } catch {
    /* ignore */
  }
  return null
}

async function writeSession(pubkey: string, session: CachedSession): Promise<void> {
  await AsyncStorage.setItem(cacheKey(pubkey), JSON.stringify(session)).catch(() => {})
}

export async function clearSession(pubkey: string): Promise<void> {
  await AsyncStorage.removeItem(cacheKey(pubkey)).catch(() => {})
}

/**
 * Mint a fresh session token for the given pubkey. Always opens the wallet to
 * sign the challenge — call only when the cache is empty or known-stale.
 */
export async function mintSession(opts: {
  pubkey: string
  signMessageRaw: (payload: Uint8Array) => Promise<Uint8Array>
}): Promise<CachedSession> {
  const { pubkey, signMessageRaw } = opts

  const challengeRes = await fetch(
    `${MAGICBLOCK_BASE_URL}/spl/challenge?pubkey=${encodeURIComponent(pubkey)}`,
  )
  const challengeJson = await challengeRes.json().catch(() => null)
  if (!challengeRes.ok || !challengeJson?.challenge) {
    throw new Error(
      `MagicBlock challenge failed (HTTP ${challengeRes.status}): ${
        challengeJson ? JSON.stringify(challengeJson) : "(no body)"
      }`,
    )
  }

  const challengeBytes = new TextEncoder().encode(challengeJson.challenge)
  const sigBytes = await signMessageRaw(challengeBytes)

  const loginRes = await fetch(`${MAGICBLOCK_BASE_URL}/spl/login`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      pubkey,
      challenge: challengeJson.challenge,
      signature: bs58.encode(sigBytes),
    }),
  })
  const loginJson = await loginRes.json().catch(() => null)
  if (!loginRes.ok || !loginJson?.token) {
    throw new Error(
      `MagicBlock login failed (HTTP ${loginRes.status}): ${
        loginJson ? JSON.stringify(loginJson) : "(no body)"
      }`,
    )
  }

  const session: CachedSession = {
    token: loginJson.token,
    mintedAt: Date.now(),
    expiresAt: loginJson.expires_at ?? null,
  }
  await writeSession(pubkey, session)
  return session
}

/**
 * Get a session token. Returns the cached one if present (no wallet popup);
 * mints a fresh one only if missing. Caller should retry with `forceFresh: true`
 * if the downstream call returns 401.
 */
export async function getSession(opts: {
  pubkey: string
  signMessageRaw: (payload: Uint8Array) => Promise<Uint8Array>
  forceFresh?: boolean
}): Promise<CachedSession> {
  if (!opts.forceFresh) {
    const cached = await readSession(opts.pubkey)
    if (cached) return cached
  }
  return mintSession({ pubkey: opts.pubkey, signMessageRaw: opts.signMessageRaw })
}
