import { describe, it, expect, vi, beforeEach } from "vitest"

// Use vi.hoisted so the mock state is available at mock-factory time.
const { createMock } = vi.hoisted(() => ({ createMock: vi.fn() }))

vi.mock("openai", () => ({
  default: class MockOpenAI {
    chat = { completions: { create: createMock } }
    constructor(_opts: unknown) {}
  },
}))

import { parseIntent, QvacUnreachableError } from "@/lib/qvac-client"

beforeEach(() => createMock.mockReset())

describe("parseIntent (QVAC)", () => {
  it("parses a private payment intent into the canonical schema", async () => {
    createMock.mockResolvedValueOnce({
      choices: [{ message: { content: '{"recipient":"maria","amount_usdc":50,"private":true}' } }],
    })
    const intent = await parseIntent("pay maria 50 usdc privately")
    expect(intent).toEqual({ recipient: "maria", amount_usdc: 50, private: true })
  })

  it("attaches a memo when explicitly stated", async () => {
    createMock.mockResolvedValueOnce({
      choices: [
        {
          message: {
            content: '{"recipient":"javier","amount_usdc":12.5,"private":false,"memo":"groceries"}',
          },
        },
      ],
    })
    const intent = await parseIntent("send 12.50 to javier for groceries")
    expect(intent.memo).toBe("groceries")
  })

  it("throws QvacUnreachableError when the local server is down", async () => {
    createMock.mockRejectedValueOnce(new Error("ECONNREFUSED 127.0.0.1:11434"))
    await expect(parseIntent("pay anyone 1 usdc")).rejects.toBeInstanceOf(QvacUnreachableError)
  })

  it("rejects malformed JSON from the LLM", async () => {
    createMock.mockResolvedValueOnce({
      choices: [{ message: { content: "i think you should pay maria" } }],
    })
    await expect(parseIntent("…")).rejects.toThrow(/non-JSON/)
  })

  it("rejects schema-violating output", async () => {
    createMock.mockResolvedValueOnce({
      choices: [{ message: { content: '{"recipient":"maria","amount_usdc":-1,"private":true}' } }],
    })
    await expect(parseIntent("…")).rejects.toThrow()
  })
})
