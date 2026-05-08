// apps/desktop/lib/lifi-bridge.ts
//
// LI.FI v3 cross-chain quote builder. Used when the user's source
// funds are on Base (or another EVM chain) and they need USDC on
// Solana to fund the Kumo flow.
//
// We pin @lifi/sdk@3.15.3 — 4.0-alpha breaks the createConfig() shape.

import { createConfig, EVM, Solana, getQuote } from "@lifi/sdk"
import {
  BASE_USDC,
  LIFI_SOLANA_CHAIN_ID,
  USDC_MINT_DEVNET,
} from "@kumo/shared"

let configured = false
function ensureConfigured() {
  if (configured) return
  createConfig({
    integrator: process.env.LIFI_INTEGRATOR ?? "Kumo",
    apiKey: process.env.LIFI_API_KEY,
    providers: [EVM(), Solana()],
  })
  configured = true
}

/**
 * Quote a route bringing USDC from Base into the user's Solana wallet.
 * The quote is purely informational; route execution is left to the
 * EVM wallet adapter (out of scope for the prototype).
 *
 * @returns A quote object with estimated arrival time, fees, and the
 *          transaction request the EVM wallet needs to sign.
 */
export async function quoteFromBase(opts: {
  fromAmount: bigint
  fromAddress: string // EVM 0x...
  toAddress: string // Solana base58
}) {
  ensureConfigured()
  return await getQuote({
    fromChain: 8453, // Base mainnet
    toChain: LIFI_SOLANA_CHAIN_ID,
    fromToken: BASE_USDC,
    toToken: USDC_MINT_DEVNET, // mainnet USDC mint EPjF... in production
    fromAddress: opts.fromAddress,
    toAddress: opts.toAddress,
    fromAmount: opts.fromAmount.toString(),
  })
}
