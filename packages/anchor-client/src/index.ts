import { AnchorProvider, BN, Idl, Program, web3 } from "@coral-xyz/anchor"
import { PublicKey } from "@solana/web3.js"

// The IDL below is the compiled Anchor IDL for programs/intent-receipt.
// On a real local build the user runs `anchor build` and copies
// target/idl/intent_receipt.json over this constant. The shape here
// mirrors what Anchor 0.31.1 emits for the program in lib.rs.

export const INTENT_RECEIPT_IDL = {
  version: "0.1.0",
  name: "intent_receipt",
  instructions: [
    {
      name: "commitIntent",
      accounts: [
        { name: "user", isMut: true, isSigner: true },
        { name: "intent", isMut: true, isSigner: false },
        { name: "systemProgram", isMut: false, isSigner: false },
      ],
      args: [{ name: "intentHash", type: { array: ["u8", 32] } }],
    },
    {
      name: "recordSettlement",
      accounts: [
        { name: "user", isMut: true, isSigner: true },
        { name: "intent", isMut: true, isSigner: false },
      ],
      args: [{ name: "settlementTx", type: { array: ["u8", 64] } }],
    },
  ],
  accounts: [
    {
      name: "IntentCommitment",
      type: {
        kind: "struct",
        fields: [
          { name: "user", type: "publicKey" },
          { name: "intentHash", type: { array: ["u8", 32] } },
          { name: "createdAt", type: "i64" },
          { name: "settled", type: "bool" },
          { name: "settlementTx", type: { option: { array: ["u8", 64] } } },
        ],
      },
    },
  ],
  errors: [
    { code: 6000, name: "AlreadySettled", msg: "This intent has already been settled." },
    { code: 6001, name: "WrongUser", msg: "Only the original committer can record settlement." },
  ],
} as const

// Program ID — replace after `solana-keygen new -o target/deploy/intent_receipt-keypair.json`
// and `anchor keys sync`. Placeholder for the prototype.
export const INTENT_RECEIPT_PROGRAM_ID = new PublicKey(
  "KuMoIntntRcpt1111111111111111111111111111111",
)

export function deriveIntentPda(user: PublicKey, intentHash: Uint8Array): [PublicKey, number] {
  if (intentHash.length !== 32) throw new Error("intentHash must be 32 bytes")
  return PublicKey.findProgramAddressSync(
    [Buffer.from("intent"), user.toBuffer(), Buffer.from(intentHash)],
    INTENT_RECEIPT_PROGRAM_ID,
  )
}

export function buildProgram(provider: AnchorProvider): Program {
  return new Program(INTENT_RECEIPT_IDL as unknown as Idl, INTENT_RECEIPT_PROGRAM_ID, provider)
}

export { BN, web3 }
