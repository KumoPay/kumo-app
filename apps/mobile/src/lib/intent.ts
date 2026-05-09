import * as Crypto from "expo-crypto"
import type { PaymentIntent } from "@kumo/shared"

export async function hashIntentForMobile(intent: PaymentIntent): Promise<string> {
  const canonical = JSON.stringify({
    recipient: intent.recipient,
    amount_usdc: intent.amount_usdc,
    private: intent.private,
    memo: intent.memo ?? "",
  })
  return Crypto.digestStringAsync(Crypto.CryptoDigestAlgorithm.SHA256, canonical, {
    encoding: Crypto.CryptoEncoding.HEX,
  })
}
