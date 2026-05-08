import { describe, it, expect, vi, beforeEach, afterEach } from "vitest"

beforeEach(() => {
  process.env.MAGICBLOCK_SESSION_KEY = "test-session-jwt"
  process.env.NEXT_PUBLIC_MAGICBLOCK_BASE_URL = "https://payments.magicblock.app/v1"
  process.env.NEXT_PUBLIC_SOLANA_CLUSTER = "devnet"
  vi.resetModules()
})

afterEach(() => {
  vi.unstubAllGlobals()
})

const validBuildResponse = {
  kind: "transfer",
  version: "legacy" as const,
  transactionBase64: "AQID",
  sendTo: "base" as const,
  recentBlockhash: "abc",
  lastValidBlockHeight: 1,
  instructionCount: 3,
  requiredSigners: ["Frm111"],
  validator: "VAL111",
}

describe("MagicBlock private payments", () => {
  it("posts a private transfer with USDC 6-decimal scaling and the spec field shape", async () => {
    const fetchMock = vi.fn().mockResolvedValue({
      ok: true,
      status: 200,
      json: async () => validBuildResponse,
    })
    vi.stubGlobal("fetch", fetchMock)

    const { privateTransfer } = await import("@/lib/magicblock-pmts")
    const out = await privateTransfer({
      fromPubkey: "Frm111",
      toPubkey: "Tox222",
      amountUsdc: 50,
    })

    expect(out.transactionBase64).toBe("AQID")
    expect(out.sendTo).toBe("base")
    expect(out.requiredSigners).toEqual(["Frm111"])
    expect(out.validator).toBe("VAL111")

    const [url, init] = fetchMock.mock.calls[0]
    expect(url).toBe("https://payments.magicblock.app/v1/spl/transfer")
    expect(init.method).toBe("POST")

    const body = JSON.parse(init.body)
    expect(body.amount).toBe("50000000")
    expect(body.visibility).toBe("private")
    expect(body.fromBalance).toBe("base")
    expect(body.toBalance).toBe("base")
    expect(body.cluster).toBe("devnet")
    // base → base does not require auth per the spec
    expect(init.headers.Authorization).toBeUndefined()
  })

  it("attaches Authorization when the route hits the ephemeral rollup", async () => {
    const fetchMock = vi.fn().mockResolvedValue({
      ok: true,
      status: 200,
      json: async () => validBuildResponse,
    })
    vi.stubGlobal("fetch", fetchMock)

    const { privateTransfer } = await import("@/lib/magicblock-pmts")
    await privateTransfer({
      fromPubkey: "Frm111",
      toPubkey: "Tox222",
      amountUsdc: 1,
      toBalance: "ephemeral",
    })

    const [, init] = fetchMock.mock.calls[0]
    expect(init.headers.Authorization).toBe("Bearer test-session-jwt")
  })

  it("issues GET for /spl/private-balance with auth", async () => {
    const fetchMock = vi.fn().mockResolvedValue({
      ok: true,
      status: 200,
      json: async () => ({
        address: "Frm111",
        mint: "USDC",
        ata: "ATA",
        location: "ephemeral",
        balance: "1000000",
      }),
    })
    vi.stubGlobal("fetch", fetchMock)

    const { getPrivateBalance } = await import("@/lib/magicblock-pmts")
    const balance = await getPrivateBalance({ pubkey: "Frm111" })
    expect(balance).toBe(1_000_000n)

    const [url, init] = fetchMock.mock.calls[0]
    expect(String(url)).toContain("/spl/private-balance")
    expect(String(url)).toContain("address=Frm111")
    expect(init.method ?? "GET").toBe("GET")
    expect(init.headers.Authorization).toBe("Bearer test-session-jwt")
  })

  it("surfaces the spec error envelope", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue({
        ok: false,
        status: 422,
        json: async () => ({
          error: { code: "VALIDATION_ERROR", message: "bad amount" },
        }),
      }),
    )
    const { privateTransfer } = await import("@/lib/magicblock-pmts")
    await expect(
      privateTransfer({ fromPubkey: "a", toPubkey: "b", amountUsdc: 1 }),
    ).rejects.toThrow(/VALIDATION_ERROR.*bad amount/)
  })

  it("throws if MAGICBLOCK_SESSION_KEY is missing on an auth-required call", async () => {
    delete process.env.MAGICBLOCK_SESSION_KEY
    const { getPrivateBalance } = await import("@/lib/magicblock-pmts")
    await expect(getPrivateBalance({ pubkey: "a" })).rejects.toThrow(
      /MAGICBLOCK_SESSION_KEY/,
    )
  })
})
