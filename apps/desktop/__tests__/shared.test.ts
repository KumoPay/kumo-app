import { describe, it, expect } from "vitest"
import { PaymentIntentSchema, hashIntent } from "@kumo/shared"

describe("PaymentIntent schema", () => {
  it("accepts a minimum valid intent", () => {
    expect(PaymentIntentSchema.parse({ recipient: "x", amount_usdc: 1, private: false })).toBeDefined()
  })
  it("rejects negative amounts", () => {
    expect(() =>
      PaymentIntentSchema.parse({ recipient: "x", amount_usdc: -1, private: false }),
    ).toThrow()
  })
})

describe("hashIntent", () => {
  it("produces a stable hex digest", async () => {
    const a = await hashIntent({ recipient: "maria", amount_usdc: 50, private: true })
    const b = await hashIntent({ recipient: "maria", amount_usdc: 50, private: true })
    expect(a).toBe(b)
    expect(a).toMatch(/^[0-9a-f]{64}$/)
  })
  it("changes when memo changes", async () => {
    const a = await hashIntent({ recipient: "maria", amount_usdc: 50, private: true })
    const b = await hashIntent({ recipient: "maria", amount_usdc: 50, private: true, memo: "rent" })
    expect(a).not.toBe(b)
  })
})
