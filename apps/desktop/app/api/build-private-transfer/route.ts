// apps/desktop/app/api/build-private-transfer/route.ts
//
// For the real-wallet /app flow: build an unsigned MagicBlock private
// transfer tx and return the base64 to the client. The client signs
// with their own wallet (Phantom/Solflare/Backpack) and submits.
//
// Distinct from /api/broadcast which signs server-side with the demo
// wallet — keep that one for /flow.

import { NextRequest, NextResponse } from "next/server"
import { PaymentIntentSchema } from "@kumo/shared"
import { privateTransfer } from "@/lib/magicblock-pmts"

export const runtime = "nodejs"
export const dynamic = "force-dynamic"

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
