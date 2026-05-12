import { z } from "zod"

// Output of QVAC's natural-language → structured intent parser.
// Kept tiny on purpose: any extra field would just give the LLM more rope.

export const PaymentIntentSchema = z.object({
  recipient: z.string().min(1).max(64),
  amount_usdc: z.number().positive().max(1_000_000),
  private: z.boolean(),
  memo: z.string().max(120).optional(),
})
export type PaymentIntent = z.infer<typeof PaymentIntentSchema>
