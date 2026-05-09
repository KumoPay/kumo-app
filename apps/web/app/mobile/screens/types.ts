import type { ReactNode } from "react"
import type { PaymentIntent } from "@kumo/shared"

import type { SolanaClusterId } from "../cluster-preference"

export type ScreenId =
  | "home"
  | "contacts"
  | "history"
  | "receive"
  | "settings"
  | "connect"
  | "alias"
  | "intent"
  | "sign"
  | "queued"
  | "settled"

export const PAY_FLOW: ScreenId[] = ["intent", "sign", "queued", "settled"]

export type WalletInfo = {
  /** Internal id ("phantom" / "solflare" / "backpack" / "glow"). */
  id: string
  /** Display label ("Phantom"). */
  label: string
  /** Brand color/string (matches `id` for now). */
  brand: string
  /** Single-character avatar fallback. */
  initial: string
  /** Real Solana base58 pubkey from the connected adapter. */
  pubkey: string
  /** User-chosen alias (set after one-time onboarding). Defaults to "" until chosen. */
  displayName: string
}

export type PaymentSettlement = {
  signature: string
  validator?: string
  sendTo: "base" | "ephemeral"
}

export type NavCtx = {
  push: (id: ScreenId) => void
  back: () => void
  /** Reset the stack back to home (used by Settled when payment finishes). */
  resetHome: () => void
  /** Jump to a new payment intent (home → intent); use tiles or in-app CTAs, not the tab bar. */
  goToNewPayment: () => void
  airplane: boolean
  setAirplane: (v: boolean) => void
  /** Currently connected wallet, or null on the connect screen. */
  wallet: WalletInfo | null
  /** Trigger the real Solana wallet adapter for a specific brand. */
  beginWalletConnect: (brand: string) => Promise<void>
  disconnectWallet: () => void
  /** Finishes one-time onboarding: saves alias and continues to Home + splash. */
  completeAliasOnboarding: (localHandle: string) => void
  /** Active Solana cluster for RPC / display (persisted locally). */
  solanaCluster: SolanaClusterId
  setSolanaCluster: (id: SolanaClusterId) => void

  // Payment flow state — shared across intent/sign/queued/settled
  intentText: string
  setIntentText: (s: string) => void
  parsedIntent: PaymentIntent | null
  intentHash: string | null
  offlineSig: string | null
  settlement: PaymentSettlement | null
  busy: boolean
  error: string | null
  /** POST /api/parse-intent and advance to "sign". */
  parseIntent: () => Promise<void>
  /** Wallet signMessage(intent_hash) and advance to "queued". */
  signOffline: () => Promise<void>
  /** /api/build-private-transfer + sign + submit, advance to "settled". */
  broadcast: () => Promise<void>
}

export type ScreenSlots = {
  /** Body content rendered in the scrollable area between header and bottom CTA. */
  body: ReactNode
  /** Sticky bottom-bar content. Omit to render no bottom bar (e.g. wallet picker). */
  cta?: ReactNode
  /** Optional eyebrow shown in the top status bar. */
  eyebrow?: string
}

export type ScreenRenderer = (ctx: NavCtx) => ScreenSlots
