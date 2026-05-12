import { describe, it, expect } from "vitest"
import {
  buildIntentPayload,
  parseIntentPayload,
  INTENT_PAYLOAD_PREFIX,
  IntentPayloadSchema,
  type IntentPayloadInput,
  type IntentPayloadWalletInput,
} from "@kumo/shared"

const SIGNER = "BtpUtiFBeHnsJcSTVDZUvFxE5fb4pXiZ5yfpeUMiEGie"
const WALLET: IntentPayloadWalletInput = {
  label: "Phantom Mobile",
  pubkey: SIGNER,
  brand: "phantom",
}

function fixtureEntry(overrides: Partial<IntentPayloadInput> = {}): IntentPayloadInput {
  return {
    intent: {
      recipient: "maria",
      amount_usdc: 5,
      private: false,
      memo: "lunch",
    },
    intentHash: "a".repeat(64),
    offlineSig: "5J3MqLh2g7s5x3kK1B5y8c4Z7n9pQrST2vWXYZabcdefGHJK6m",
    signerPubkey: SIGNER,
    createdAt: 1736942400,
    signedTxBase64: "AVJ0bX...truncated",
    txVersion: "legacy",
    sendTo: "base",
    ...overrides,
  }
}

describe("buildIntentPayload — prefix & encoding", () => {
  it("starts with the kumo:intent:v1: prefix", () => {
    const out = buildIntentPayload(fixtureEntry(), WALLET)
    expect(out.startsWith(INTENT_PAYLOAD_PREFIX)).toBe(true)
  })

  it("encodes the body as base64 of UTF-8 JSON", () => {
    const out = buildIntentPayload(fixtureEntry(), WALLET)
    const b64 = out.slice(INTENT_PAYLOAD_PREFIX.length)
    const json = Buffer.from(b64, "base64").toString("utf8")
    const parsed = JSON.parse(json)
    expect(parsed.kind).toBe("kumo.intent")
    expect(parsed.v).toBe(1)
  })
})

describe("buildIntentPayload ↔ parseIntentPayload — round trip", () => {
  it("recovers all fields exactly", () => {
    const entry = fixtureEntry()
    const out = parseIntentPayload(buildIntentPayload(entry, WALLET))
    expect(out.v).toBe(1)
    expect(out.kind).toBe("kumo.intent")
    expect(out.wallet).toEqual(WALLET)
    expect(out.intent).toEqual(entry.intent)
    expect(out.intentHash).toBe(entry.intentHash)
    expect(out.offlineSig).toBe(entry.offlineSig)
    expect(out.signedTx).toBe(entry.signedTxBase64)
    expect(out.txVersion).toBe(entry.txVersion)
    expect(out.sendTo).toBe(entry.sendTo)
    expect(out.createdAt).toBe(entry.createdAt)
  })

  it("preserves a UTF-8 memo through encode/decode", () => {
    const entry = fixtureEntry({
      intent: {
        recipient: "maría",
        amount_usdc: 7.5,
        private: true,
        memo: "café · 한글 · 🥷",
      },
    })
    const out = parseIntentPayload(buildIntentPayload(entry, WALLET))
    expect(out.intent.recipient).toBe("maría")
    expect(out.intent.memo).toBe("café · 한글 · 🥷")
  })
})

describe("wallet attribution", () => {
  it("includes label/pubkey/brand when wallet is provided", () => {
    const out = parseIntentPayload(buildIntentPayload(fixtureEntry(), WALLET))
    expect(out.wallet.label).toBe("Phantom Mobile")
    expect(out.wallet.brand).toBe("phantom")
    expect(out.wallet.pubkey).toBe(SIGNER)
  })

  it("falls back to signerPubkey when wallet is null", () => {
    const entry = fixtureEntry()
    const out = parseIntentPayload(buildIntentPayload(entry, null))
    expect(out.wallet.pubkey).toBe(entry.signerPubkey)
    expect(out.wallet.label).toBeUndefined()
    expect(out.wallet.brand).toBeUndefined()
  })

  it("omits empty label/brand instead of writing empty strings", () => {
    const out = parseIntentPayload(
      buildIntentPayload(fixtureEntry(), {
        pubkey: SIGNER,
        label: "",
        brand: "",
      }),
    )
    expect(out.wallet.label).toBeUndefined()
    expect(out.wallet.brand).toBeUndefined()
    expect(out.wallet.pubkey).toBe(SIGNER)
  })
})

describe("optional fields", () => {
  it("nulls signedTx when entry has no signedTxBase64 (online flow)", () => {
    const entry = fixtureEntry({
      signedTxBase64: undefined,
      txVersion: undefined,
      sendTo: undefined,
    })
    const out = parseIntentPayload(buildIntentPayload(entry, WALLET))
    expect(out.signedTx).toBeNull()
    expect(out.txVersion).toBeNull()
    expect(out.sendTo).toBeNull()
  })

  it("still round-trips an intent with no memo", () => {
    const entry = fixtureEntry({
      intent: { recipient: "bob", amount_usdc: 1, private: true },
    })
    const out = parseIntentPayload(buildIntentPayload(entry, WALLET))
    expect(out.intent.memo).toBeUndefined()
  })
})

describe("parseIntentPayload — rejection", () => {
  it("rejects a payload without the prefix", () => {
    expect(() => parseIntentPayload("not-a-kumo-uri")).toThrow(/prefix/i)
  })

  it("rejects invalid base64", () => {
    expect(() => parseIntentPayload(`${INTENT_PAYLOAD_PREFIX}!!!not-base64!!!`)).toThrow()
  })

  it("rejects a payload missing required fields", () => {
    const bad = Buffer.from(JSON.stringify({ v: 1, kind: "kumo.intent" }), "utf8").toString(
      "base64",
    )
    expect(() => parseIntentPayload(`${INTENT_PAYLOAD_PREFIX}${bad}`)).toThrow()
  })

  it("rejects a payload with the wrong version", () => {
    const out = buildIntentPayload(fixtureEntry(), WALLET)
    const b64 = out.slice(INTENT_PAYLOAD_PREFIX.length)
    const json = JSON.parse(Buffer.from(b64, "base64").toString("utf8"))
    json.v = 2
    const tampered = Buffer.from(JSON.stringify(json), "utf8").toString("base64")
    expect(() => parseIntentPayload(`${INTENT_PAYLOAD_PREFIX}${tampered}`)).toThrow()
  })

  it("rejects an intentHash that isn't 64 hex chars", () => {
    const out = buildIntentPayload(fixtureEntry({ intentHash: "deadbeef" }), WALLET)
    expect(() => parseIntentPayload(out)).toThrow()
  })
})

describe("IntentPayloadSchema (direct)", () => {
  it("rejects negative amount via embedded PaymentIntentSchema", () => {
    expect(() =>
      IntentPayloadSchema.parse({
        v: 1,
        kind: "kumo.intent",
        wallet: { pubkey: SIGNER },
        intent: { recipient: "x", amount_usdc: -1, private: false },
        intentHash: "a".repeat(64),
        offlineSig: "sig",
        signedTx: null,
        txVersion: null,
        sendTo: null,
        createdAt: 0,
      }),
    ).toThrow()
  })
})
