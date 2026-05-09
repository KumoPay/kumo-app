// apps/web/app/api/build-private-transfer/route.ts
//
// Builds an unsigned transfer tx for the client to sign with their wallet.
// Two paths depending on the request:
//
//   1. ONLINE PRIVATE — visibility=private (no nonce). Delegates to MagicBlock's
//      Private Payments API for ER-routed confidential transfer.
//
//   2. OFFLINE PUBLIC — body.nonce present + visibility=public. Builds a plain
//      SPL USDC transfer locally with `nonceAdvance` as ix0 and the cached
//      nonce as recentBlockhash. The client signs once (offline OK because
//      ed25519 happens in the wallet app) and broadcasts whenever they
//      reconnect — the durable nonce keeps the tx valid indefinitely.

import { NextRequest, NextResponse } from "next/server"
import { z } from "zod"
import { PaymentIntentSchema } from "@kumo/shared"
import { privateTransfer } from "@/lib/magicblock-pmts"
import { buildPublicTransferWithNonce } from "@/lib/build-public-transfer"

export const runtime = "nodejs"
export const dynamic = "force-dynamic"

const NonceParamsSchema = z.object({
  pubkey: z.string().min(32),
  authority: z.string().min(32),
  value: z.string().min(32),
})

export async function POST(req: NextRequest) {
  const body = await req.json().catch(() => null)
  if (!body) return NextResponse.json({ ok: false, error: "no body" }, { status: 400 })

  const intentParse = PaymentIntentSchema.safeParse(body.intent)
  if (!intentParse.success) {
    return NextResponse.json(
      { ok: false, error: "Invalid intent: " + intentParse.error.message },
      { status: 400 },
    )
  }
  const intent = intentParse.data

  const recipientPubkey: string | undefined = body.recipientPubkey
  const userPubkey: string | undefined = body.userPubkey
  if (!recipientPubkey || !userPubkey) {
    return NextResponse.json(
      { ok: false, error: "Missing recipientPubkey or userPubkey" },
      { status: 400 },
    )
  }

  // Optional durable-nonce path. When present + visibility=public we build
  // locally instead of going through MagicBlock.
  const nonceParam = body.nonce
  if (nonceParam !== undefined) {
    const nonceParse = NonceParamsSchema.safeParse(nonceParam)
    if (!nonceParse.success) {
      return NextResponse.json(
        { ok: false, error: "Invalid nonce: " + nonceParse.error.message },
        { status: 400 },
      )
    }
    if (intent.private) {
      return NextResponse.json(
        {
          ok: false,
          error:
            "Private transfers cannot use a durable nonce — MagicBlock requires a fresh blockhash.",
        },
        { status: 400 },
      )
    }
    try {
      console.log("[build-private-transfer] OFFLINE-PUBLIC req:", {
        from: userPubkey,
        to: recipientPubkey,
        amount_usdc: intent.amount_usdc,
        nonce: nonceParse.data.pubkey,
      })
      const built = await buildPublicTransferWithNonce({
        fromPubkey: userPubkey,
        toPubkey: recipientPubkey,
        amountUsdc: intent.amount_usdc,
        memo: intent.memo,
        nonce: nonceParse.data,
      })
      return NextResponse.json({
        ok: true,
        transaction_b64: built.transactionBase64,
        send_to: built.sendTo,
        version: built.version,
        required_signers: built.requiredSigners,
      })
    } catch (e) {
      const msg = e instanceof Error ? e.message : "build failed"
      console.error("[build-private-transfer] OFFLINE-PUBLIC FAILED:", msg)
      return NextResponse.json({ ok: false, error: msg }, { status: 502 })
    }
  }

  // Regular (online) flow — through MagicBlock for either public or private.
  try {
    console.log("[build-private-transfer] req:", {
      from: userPubkey,
      to: recipientPubkey,
      amount_usdc: intent.amount_usdc,
      private: intent.private,
    })
    const built = await privateTransfer({
      fromPubkey: userPubkey,
      toPubkey: recipientPubkey,
      amountUsdc: intent.amount_usdc,
      memo: intent.memo,
      visibility: intent.private ? "private" : "public",
    })
    return NextResponse.json({
      ok: true,
      transaction_b64: built.transactionBase64,
      send_to: built.sendTo,
      version: built.version,
      required_signers: built.requiredSigners,
      validator: built.validator,
      last_valid_block_height: built.lastValidBlockHeight,
    })
  } catch (e) {
    const msg = e instanceof Error ? e.message : "build failed"
    console.error("[build-private-transfer] FAILED:", msg)
    return NextResponse.json({ ok: false, error: msg }, { status: 502 })
  }
}
