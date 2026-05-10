// apps/mobile/src/lib/magicblock-direct.ts
//
// Direct-from-device MagicBlock private-transfer build. Replaces the call to
// /api/build-private-transfer on Kumo's server. The user's wallet auth token
// (minted via magicblock-auth) is the only credential.

import { USDC_MINT_DEVNET } from "@kumo/shared"

import { getSession } from "./magicblock-auth"

const MAGICBLOCK_BASE_URL =
  process.env.EXPO_PUBLIC_MAGICBLOCK_BASE_URL ?? "https://payments.magicblock.app/v1"
const CLUSTER = process.env.EXPO_PUBLIC_SOLANA_CLUSTER ?? "devnet"

export type DirectBuiltTransfer = {
  transactionBase64: string
  version: "legacy" | "v0"
  sendTo: "base" | "ephemeral"
  recentBlockhash: string
  lastValidBlockHeight?: number
  instructionCount: number
  requiredSigners: string[]
  validator?: string
}

/**
 * Builds an unsigned private transfer via MagicBlock's REST API directly from
 * the device. Mints/refreshes the auth token via the user's wallet as needed.
 *
 * Public transfers via MagicBlock work too but aren't routed through here —
 * for public mode we use offline-build.ts so we never touch MagicBlock.
 */
export async function privateTransferDirect(opts: {
  fromPubkey: string
  toPubkey: string
  amountUsdc: number
  memo?: string
  signMessageRaw: (payload: Uint8Array) => Promise<Uint8Array>
}): Promise<DirectBuiltTransfer> {
  const amount = Math.round(opts.amountUsdc * 1_000_000)
  const body: Record<string, unknown> = {
    from: opts.fromPubkey,
    to: opts.toPubkey,
    mint: USDC_MINT_DEVNET,
    amount,
    visibility: "private",
    fromBalance: "base",
    toBalance: "base",
    cluster: CLUSTER,
    initIfMissing: true,
    initAtasIfMissing: true,
  }
  if (opts.memo) body.memo = opts.memo

  // Try with cached session first; on 401, mint fresh once and retry.
  let attempt = 0
  let session = await getSession({
    pubkey: opts.fromPubkey,
    signMessageRaw: opts.signMessageRaw,
  })
  while (true) {
    attempt += 1
    const res = await fetch(`${MAGICBLOCK_BASE_URL}/spl/transfer`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${session.token}`,
      },
      body: JSON.stringify(body),
    })
    if (res.status === 401 && attempt === 1) {
      session = await getSession({
        pubkey: opts.fromPubkey,
        signMessageRaw: opts.signMessageRaw,
        forceFresh: true,
      })
      continue
    }
    const json = await res.json().catch(() => null)
    if (!res.ok) {
      const msg = json?.error?.message ?? `HTTP ${res.status}`
      throw new Error(`MagicBlock private transfer failed: ${msg}`)
    }
    if (
      !json ||
      typeof json.transactionBase64 !== "string" ||
      typeof json.version !== "string"
    ) {
      throw new Error("MagicBlock returned an unexpected response shape.")
    }
    return {
      transactionBase64: json.transactionBase64,
      version: json.version,
      sendTo: json.sendTo,
      recentBlockhash: json.recentBlockhash,
      lastValidBlockHeight: json.lastValidBlockHeight,
      instructionCount: json.instructionCount ?? 0,
      requiredSigners: json.requiredSigners ?? [opts.fromPubkey],
      validator: json.validator,
    }
  }
}
