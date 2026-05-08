// apps/desktop/app/api/build-tx/route.ts
//
// Build + sign a durable-nonce transaction OFFLINE. Returns the
// serialized signed tx so the client can stash it in IndexedDB and
// broadcast on reconnect.
//
// This route makes ZERO RPC calls — it relies entirely on a nonce
// value the user refreshed earlier (while online).

import { NextRequest, NextResponse } from "next/server"
import { PublicKey, TransactionInstruction } from "@solana/web3.js"
import bs58 from "bs58"
import {
  PaymentIntentSchema,
  hashIntent,
} from "@kumo/shared"
import { buildOfflineTx, type NonceCacheEntry } from "@/lib/durable-nonce"
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

  const cached = body.nonce as NonceCacheEntry | undefined
  if (!cached?.nonce || !cached.noncePubkey || !cached.authorityPubkey) {
    return NextResponse.json(
      {
        ok: false,
        error:
          "No cached durable nonce. Run the online setup flow first to fund a nonce account.",
      },
      { status: 412 },
    )
  }

  const recipientPubkey = body.recipientPubkey as string | undefined
  if (!recipientPubkey) {
    return NextResponse.json(
      { ok: false, error: "Missing recipientPubkey (resolved client-side from contact map)" },
      { status: 400 },
    )
  }

  const payer = loadDemoWallet()

  // The actual transfer is a placeholder for the prototype: a 1-lamport
  // SystemProgram transfer to the recipient. The REAL transfer happens
  // privately via MagicBlock PER on broadcast. The on-chain tx exists
  // only so there's a paper-trail signature to record on `record_settlement`.
  const placeholderIx = new TransactionInstruction({
    programId: new PublicKey("11111111111111111111111111111111"),
    keys: [
      { pubkey: payer.publicKey, isSigner: true, isWritable: true },
      { pubkey: new PublicKey(recipientPubkey), isSigner: false, isWritable: true },
    ],
    // SystemProgram::Transfer { lamports: 1 }
    data: Buffer.from([2, 0, 0, 0, 1, 0, 0, 0, 0, 0, 0, 0]),
  })

  const tx = buildOfflineTx({
    payerSigner: payer,
    cached,
    instructions: [placeholderIx],
  })
  const serialized = tx.serialize({ requireAllSignatures: true, verifySignatures: true })
  const intent_hash = await hashIntent(intent)

  return NextResponse.json({
    ok: true,
    signed_tx_b58: bs58.encode(serialized),
    intent,
    intent_hash,
    nonce: cached,
    signed_at: Date.now(),
  })
}
