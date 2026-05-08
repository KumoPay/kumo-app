import { describe, it, expect, beforeEach } from "vitest"
import { Keypair, PublicKey, SystemProgram, TransactionInstruction } from "@solana/web3.js"
import { buildOfflineTx, type NonceCacheEntry } from "@/lib/durable-nonce"

// Stub localStorage on global so the module's storage helpers don't crash
beforeEach(() => {
  const store: Record<string, string> = {}
  ;(globalThis as unknown as { window: { localStorage: Storage } }).window = {
    localStorage: {
      get length() {
        return Object.keys(store).length
      },
      clear() {
        for (const k of Object.keys(store)) delete store[k]
      },
      key(i: number) {
        return Object.keys(store)[i] ?? null
      },
      getItem(k: string) {
        return store[k] ?? null
      },
      setItem(k: string, v: string) {
        store[k] = v
      },
      removeItem(k: string) {
        delete store[k]
      },
    } satisfies Storage,
  }
})

describe("buildOfflineTx", () => {
  it("inserts nonceAdvance as the FIRST instruction", () => {
    const payer = Keypair.generate()
    const auth = Keypair.generate()
    const nonceAcc = Keypair.generate()

    const cached: NonceCacheEntry = {
      noncePubkey: nonceAcc.publicKey.toBase58(),
      authorityPubkey: auth.publicKey.toBase58(),
      // 32-byte zero hash → valid base58 fake recentBlockhash
      nonce: "11111111111111111111111111111111",
      refreshedAt: Date.now(),
    }

    // Make payer be the nonce authority so the tx signs cleanly
    cached.authorityPubkey = payer.publicKey.toBase58()

    const recipient = Keypair.generate()
    const userIx = SystemProgram.transfer({
      fromPubkey: payer.publicKey,
      toPubkey: recipient.publicKey,
      lamports: 1,
    })

    const tx = buildOfflineTx({
      payerSigner: payer,
      cached,
      instructions: [userIx],
    })

    expect(tx.instructions.length).toBe(2)
    // First instruction must be SystemProgram nonceAdvance
    expect(tx.instructions[0].programId.equals(SystemProgram.programId)).toBe(true)
    // Second is the user instruction
    expect(tx.instructions[1].programId.equals(SystemProgram.programId)).toBe(true)
    // recentBlockhash must be the cached nonce
    expect(tx.recentBlockhash).toBe(cached.nonce)
    expect(tx.feePayer?.equals(payer.publicKey)).toBe(true)
    // Signature present
    expect(tx.signatures[0].signature).not.toBeNull()
  })
})
