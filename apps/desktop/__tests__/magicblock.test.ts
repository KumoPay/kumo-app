import { describe, it, expect, vi, beforeEach, afterEach } from "vitest"

beforeEach(() => {
  process.env.MAGICBLOCK_SESSION_KEY = "test-session-jwt"
  process.env.NEXT_PUBLIC_MAGICBLOCK_BASE_URL = "https://payments.magicblock.app/v1"
})

afterEach(() => {
  vi.unstubAllGlobals()
})

describe("MagicBlock private payments", () => {
  it("sends a transfer with USDC 6-decimal scaling", async () => {
    const fetchMock = vi.fn().mockResolvedValue({
      json: async () => ({
        ok: true,
        signature: "5VfS...sig",
        session_id: "sess_abc",
      }),
    })
    vi.stubGlobal("fetch", fetchMock)

    const { privateTransfer } = await import("@/lib/magicblock-pmts")
    const out = await privateTransfer({
      fromPubkey: "Frm111",
      toPubkey: "Tox222",
      amountUsdc: 50, // → 50_000_000 base units
    })
    expect(out.signature).toBe("5VfS...sig")
    expect(out.sessionId).toBe("sess_abc")

    const [, init] = fetchMock.mock.calls[0]
    const body = JSON.parse(init.body)
    expect(body.amount).toBe("50000000")
    expect(init.headers.Authorization).toBe("Bearer test-session-jwt")
  })

  it("surfaces server errors", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue({ json: async () => ({ ok: false, error: "rate-limited" }) }),
    )
    const { privateTransfer } = await import("@/lib/magicblock-pmts")
    await expect(
      privateTransfer({ fromPubkey: "a", toPubkey: "b", amountUsdc: 1 }),
    ).rejects.toThrow(/rate-limited/)
  })

  it("throws if MAGICBLOCK_SESSION_KEY is missing", async () => {
    delete process.env.MAGICBLOCK_SESSION_KEY
    const { privateTransfer } = await import("@/lib/magicblock-pmts")
    await expect(
      privateTransfer({ fromPubkey: "a", toPubkey: "b", amountUsdc: 1 }),
    ).rejects.toThrow(/MAGICBLOCK_SESSION_KEY/)
  })
})
