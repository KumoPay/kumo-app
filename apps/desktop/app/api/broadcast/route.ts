// apps/desktop/app/api/broadcast/route.ts
//
// Called when the device reconnects. Sends the pre-signed offline
// tx through MagicBlock PER for confidential settlement.

import { NextRequest, NextResponse } from "next/server"
import { PaymentIntentSchema } from "@kumo/shared"
import { privateTransfer } from "@/lib/magicblock-pmts"
import { loadDemoWallet } from "@/lib/wallet"

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
  const signedTxB58: string | undefined = body.signed_tx_b58
  if (!recipientPubkey) {
    return NextResponse.json(
      { ok: false, error: "Missing recipientPubkey" },
      { status: 400 },
    )
  }

  try {
    const payer = loadDemoWallet()
    const result = await privateTransfer({
      fromPubkey: payer.publicKey.toBase58(),
      toPubkey: recipientPubkey,
      amountUsdc: intent.amount_usdc,
      serializedTxB64: signedTxB58, // attach pre-signed tx for receipt
    })
    return NextResponse.json({
      ok: true,
      signature: result.signature,
      magicblock_session_id: result.sessionId,
    })
  } catch (e) {
    const msg = e instanceof Error ? e.message : "Broadcast failed"
    return NextResponse.json({ ok: false, error: msg }, { status: 502 })
  }
}
