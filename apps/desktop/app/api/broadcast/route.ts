// apps/desktop/app/api/broadcast/route.ts
//
// Called when the device reconnects. Asks MagicBlock to build a private
// SPL transfer (unsigned), signs it with the demo wallet, and submits.
// Returns the resulting Solana signature for the receipt.

import { NextRequest, NextResponse } from "next/server"
import {
  Connection,
  Transaction,
  VersionedTransaction,
} from "@solana/web3.js"
import { PaymentIntentSchema } from "@kumo/shared"
import { privateTransfer } from "@/lib/magicblock-pmts"
import { loadDemoWallet } from "@/lib/wallet"

export const runtime = "nodejs"
export const dynamic = "force-dynamic"

const SOLANA_RPC =
  process.env.NEXT_PUBLIC_SOLANA_RPC_URL ?? "https://api.devnet.solana.com"

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
  if (!recipientPubkey) {
    return NextResponse.json(
      { ok: false, error: "Missing recipientPubkey" },
      { status: 400 },
    )
  }

  try {
    const payer = loadDemoWallet()

    const built = await privateTransfer({
      fromPubkey: payer.publicKey.toBase58(),
      toPubkey: recipientPubkey,
      amountUsdc: intent.amount_usdc,
      memo: intent.memo,
    })

    const txBytes = Buffer.from(built.transactionBase64, "base64")
    const conn = new Connection(SOLANA_RPC, "confirmed")

    let signature: string
    if (built.version === "v0") {
      const vtx = VersionedTransaction.deserialize(txBytes)
      vtx.sign([payer])
      signature = await conn.sendRawTransaction(vtx.serialize())
    } else {
      const tx = Transaction.from(txBytes)
      tx.partialSign(payer)
      signature = await conn.sendRawTransaction(tx.serialize())
    }

    return NextResponse.json({
      ok: true,
      signature,
      magicblock_session_id: built.validator ?? "no-validator",
      send_to: built.sendTo,
    })
  } catch (e) {
    const msg = e instanceof Error ? e.message : "Broadcast failed"
    return NextResponse.json({ ok: false, error: msg }, { status: 502 })
  }
}
