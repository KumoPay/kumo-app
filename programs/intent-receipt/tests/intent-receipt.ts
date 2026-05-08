// programs/intent-receipt/tests/intent-receipt.ts
//
// LiteSVM-based unit tests. Doesn't require a running validator — the
// program is loaded directly from target/deploy/intent_receipt.so after
// `anchor build`.
//
// Run with: pnpm vitest run -- tests/intent-receipt.ts
// (or `anchor test --skip-deploy` once the program is built)

import { describe, it, expect, beforeAll } from "vitest"
import { LiteSVM } from "litesvm"
import { Keypair, PublicKey, Transaction, TransactionInstruction, SystemProgram } from "@solana/web3.js"
import { createHash } from "node:crypto"
import * as fs from "node:fs"
import * as path from "node:path"
import { BorshCoder } from "@coral-xyz/anchor"
import { INTENT_RECEIPT_IDL, INTENT_RECEIPT_PROGRAM_ID, deriveIntentPda } from "@kumo/anchor-client"

// Helper — sha256 of a string
const sha256 = (s: string) => Uint8Array.from(createHash("sha256").update(s).digest())

describe("intent_receipt", () => {
  let svm: LiteSVM
  let user: Keypair
  let coder: BorshCoder

  beforeAll(() => {
    svm = new LiteSVM()
    const so = path.resolve(__dirname, "..", "target", "deploy", "intent_receipt.so")
    if (!fs.existsSync(so)) {
      throw new Error(
        `Run \`anchor build\` first. Missing program binary at ${so}.`,
      )
    }
    svm.addProgramFromFile(INTENT_RECEIPT_PROGRAM_ID, so)
    user = new Keypair()
    svm.airdrop(user.publicKey, BigInt(2_000_000_000)) // 2 SOL
    coder = new BorshCoder(INTENT_RECEIPT_IDL as any)
  })

  it("commits an intent and records settlement (happy path)", async () => {
    const intentHash = sha256("pay maria 50 usdc privately")
    const [intentPda] = deriveIntentPda(user.publicKey, intentHash)

    // commit_intent
    const commitData = coder.instruction.encode("commitIntent", {
      intentHash: Array.from(intentHash),
    })
    const commitIx = new TransactionInstruction({
      programId: INTENT_RECEIPT_PROGRAM_ID,
      keys: [
        { pubkey: user.publicKey, isSigner: true, isWritable: true },
        { pubkey: intentPda, isSigner: false, isWritable: true },
        { pubkey: SystemProgram.programId, isSigner: false, isWritable: false },
      ],
      data: commitData,
    })
    const tx1 = new Transaction().add(commitIx)
    tx1.recentBlockhash = svm.latestBlockhash()
    tx1.feePayer = user.publicKey
    tx1.sign(user)
    const res1 = svm.sendTransaction(tx1)
    expect(res1.toString()).not.toContain("error")

    // record_settlement
    const sig = new Uint8Array(64).fill(7) // canonical fake sig
    const settleData = coder.instruction.encode("recordSettlement", {
      settlementTx: Array.from(sig),
    })
    const settleIx = new TransactionInstruction({
      programId: INTENT_RECEIPT_PROGRAM_ID,
      keys: [
        { pubkey: user.publicKey, isSigner: true, isWritable: true },
        { pubkey: intentPda, isSigner: false, isWritable: true },
      ],
      data: settleData,
    })
    const tx2 = new Transaction().add(settleIx)
    tx2.recentBlockhash = svm.latestBlockhash()
    tx2.feePayer = user.publicKey
    tx2.sign(user)
    svm.sendTransaction(tx2)

    const acct = svm.getAccount(intentPda)
    expect(acct).not.toBeNull()
    const decoded = coder.accounts.decode("IntentCommitment", Buffer.from(acct!.data))
    expect(decoded.settled).toBe(true)
  })

  it("rejects double settlement", async () => {
    const intentHash = sha256("pay javier 12 usdc")
    const [intentPda] = deriveIntentPda(user.publicKey, intentHash)

    const commitData = coder.instruction.encode("commitIntent", {
      intentHash: Array.from(intentHash),
    })
    const commit = new Transaction().add(
      new TransactionInstruction({
        programId: INTENT_RECEIPT_PROGRAM_ID,
        keys: [
          { pubkey: user.publicKey, isSigner: true, isWritable: true },
          { pubkey: intentPda, isSigner: false, isWritable: true },
          { pubkey: SystemProgram.programId, isSigner: false, isWritable: false },
        ],
        data: commitData,
      }),
    )
    commit.recentBlockhash = svm.latestBlockhash()
    commit.feePayer = user.publicKey
    commit.sign(user)
    svm.sendTransaction(commit)

    const sig = new Uint8Array(64).fill(1)
    const settleData = coder.instruction.encode("recordSettlement", {
      settlementTx: Array.from(sig),
    })
    const buildSettle = () => {
      const t = new Transaction().add(
        new TransactionInstruction({
          programId: INTENT_RECEIPT_PROGRAM_ID,
          keys: [
            { pubkey: user.publicKey, isSigner: true, isWritable: true },
            { pubkey: intentPda, isSigner: false, isWritable: true },
          ],
          data: settleData,
        }),
      )
      t.recentBlockhash = svm.latestBlockhash()
      t.feePayer = user.publicKey
      t.sign(user)
      return t
    }
    svm.sendTransaction(buildSettle())
    const dbl = svm.sendTransaction(buildSettle())
    expect(dbl.toString().toLowerCase()).toMatch(/error|alreadysettled/)
  })

  it("rejects settlement from a different signer", async () => {
    const intentHash = sha256("send 5 usdc to bob")
    const [intentPda] = deriveIntentPda(user.publicKey, intentHash)

    const commitData = coder.instruction.encode("commitIntent", {
      intentHash: Array.from(intentHash),
    })
    const commit = new Transaction().add(
      new TransactionInstruction({
        programId: INTENT_RECEIPT_PROGRAM_ID,
        keys: [
          { pubkey: user.publicKey, isSigner: true, isWritable: true },
          { pubkey: intentPda, isSigner: false, isWritable: true },
          { pubkey: SystemProgram.programId, isSigner: false, isWritable: false },
        ],
        data: commitData,
      }),
    )
    commit.recentBlockhash = svm.latestBlockhash()
    commit.feePayer = user.publicKey
    commit.sign(user)
    svm.sendTransaction(commit)

    const attacker = new Keypair()
    svm.airdrop(attacker.publicKey, BigInt(1_000_000_000))
    const sig = new Uint8Array(64).fill(9)
    const settleData = coder.instruction.encode("recordSettlement", {
      settlementTx: Array.from(sig),
    })
    const t = new Transaction().add(
      new TransactionInstruction({
        programId: INTENT_RECEIPT_PROGRAM_ID,
        keys: [
          { pubkey: attacker.publicKey, isSigner: true, isWritable: true },
          { pubkey: intentPda, isSigner: false, isWritable: true },
        ],
        data: settleData,
      }),
    )
    t.recentBlockhash = svm.latestBlockhash()
    t.feePayer = attacker.publicKey
    t.sign(attacker)
    const out = svm.sendTransaction(t)
    expect(out.toString().toLowerCase()).toMatch(/error|wronguser|seeds/)
  })
})
