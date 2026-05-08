// apps/desktop/lib/qvac-client.ts
//
// QVAC (Tether's on-device LLM runtime) exposes an OpenAI-compatible
// HTTP server when you run `qvac serve`. We deliberately avoid the
// `@qvac/sdk` JS bindings — they're <30 days old and have very thin
// docs — and use the standard `openai` SDK pointed at localhost.
//
// IMPORTANT: this file makes ZERO outbound calls. The base URL is
// http://localhost:11434/v1, which is the loopback. Even if the
// device is in airplane mode, this works.

import OpenAI from "openai"
import {
  PaymentIntent,
  PaymentIntentSchema,
  SYSTEM_PROMPT_INTENT_PARSER,
} from "@kumo/shared"

const QVAC_BASE_URL = process.env.QVAC_BASE_URL ?? "http://localhost:11434/v1"
const QVAC_MODEL = process.env.QVAC_MODEL ?? "llama-3.2-1b-instruct"

export const qvac = new OpenAI({
  baseURL: QVAC_BASE_URL,
  apiKey: "qvac-local", // ignored by qvac, but the SDK requires a string
  dangerouslyAllowBrowser: false,
})

export class QvacUnreachableError extends Error {
  constructor(cause?: unknown) {
    super(
      "QVAC server unreachable at " +
        QVAC_BASE_URL +
        ". Run `qvac serve` in a separate terminal before using Kumo.",
    )
    this.name = "QvacUnreachableError"
    if (cause) (this as { cause?: unknown }).cause = cause
  }
}

/**
 * Parse a natural-language payment instruction into a structured
 * PaymentIntent. Pure on-device — no network egress.
 */
export async function parseIntent(text: string): Promise<PaymentIntent> {
  let raw: string
  try {
    const completion = await qvac.chat.completions.create({
      model: QVAC_MODEL,
      messages: [
        { role: "system", content: SYSTEM_PROMPT_INTENT_PARSER },
        { role: "user", content: text },
      ],
      response_format: { type: "json_object" },
      temperature: 0,
    })
    raw = completion.choices[0]?.message?.content ?? ""
  } catch (e) {
    throw new QvacUnreachableError(e)
  }

  let parsed: unknown
  try {
    parsed = JSON.parse(raw)
  } catch {
    throw new Error("QVAC returned non-JSON: " + raw.slice(0, 120))
  }
  return PaymentIntentSchema.parse(parsed)
}
