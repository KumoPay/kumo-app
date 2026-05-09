import { z } from "zod"
import { PaymentIntentSchema, type PaymentIntent } from "@kumo/shared"
import { KUMO_API_BASE_URL } from "./config"

const ParseIntentResponseSchema = z.union([
  z.object({ ok: z.literal(true), intent: PaymentIntentSchema }),
  z.object({ ok: z.literal(false), error: z.string() }),
])

export const BuiltTransferSchema = z.object({
  ok: z.literal(true),
  transaction_b64: z.string(),
  send_to: z.enum(["base", "ephemeral"]),
  version: z.enum(["legacy", "v0"]),
  required_signers: z.array(z.string()),
  validator: z.string().optional(),
  last_valid_block_height: z.number().optional(),
})

const BuildTransferResponseSchema = z.union([
  BuiltTransferSchema,
  z.object({ ok: z.literal(false), error: z.string() }),
])

export type BuiltTransfer = z.infer<typeof BuiltTransferSchema>

function apiUrl(path: string): string {
  return new URL(path, KUMO_API_BASE_URL).toString()
}

export async function parseIntent(text: string): Promise<PaymentIntent> {
  const res = await fetch(apiUrl("/api/parse-intent"), {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ text }),
  })
  const json = await res.json().catch(() => null)
  const parsed = ParseIntentResponseSchema.safeParse(json)
  if (!parsed.success) {
    throw new Error(`Parser returned an unexpected response (HTTP ${res.status})`)
  }
  if (!parsed.data.ok) throw new Error(parsed.data.error)
  return parsed.data.intent
}

export async function buildPrivateTransfer(opts: {
  intent: PaymentIntent
  recipientPubkey: string
  userPubkey: string
}): Promise<BuiltTransfer> {
  const res = await fetch(apiUrl("/api/build-private-transfer"), {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(opts),
  })
  const json = await res.json().catch(() => null)
  const parsed = BuildTransferResponseSchema.safeParse(json)
  if (!parsed.success) {
    throw new Error(`Transfer builder returned an unexpected response (HTTP ${res.status})`)
  }
  if (!parsed.data.ok) throw new Error(parsed.data.error)
  return parsed.data
}
