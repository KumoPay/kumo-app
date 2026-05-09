import type { ReactNode } from "react"
import type { Transaction, VersionedTransaction } from "@solana/web3.js"
import type { PaymentIntent } from "@kumo/shared"

export type ScreenId =
  | "home"
  | "contacts"
  | "history"
  | "receive"
  | "settings"
  | "connect"
  | "alias"
  | "enableLocalAI"
  | "enableWhisper"
  | "enableOfflinePay"
  | "intent"
  | "sign"
  | "queued"
  | "settled"

export const PAY_FLOW: ScreenId[] = ["intent", "sign", "queued", "settled"]

export type WalletInfo = {
  id: string
  label: string
  brand: string
  initial: string
  pubkey: string
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
  resetHome: () => void
  /** Jump to a new payment intent (home → intent); use tiles or in-app CTAs, not the tab bar. */
  goToNewPayment: () => void
  airplane: boolean
  setAirplane: (v: boolean) => void
  /** Default privacy mode for parsed intents (Public SPL vs MagicBlock private). */
  privacyDefault: boolean
  setPrivacyDefault: (v: boolean) => void
  wallet: WalletInfo | null
  beginWalletConnect: (brand: string) => Promise<void>
  disconnectWallet: () => void
  completeAliasOnboarding: (localHandle: string) => void

  intentText: string
  setIntentText: (s: string) => void
  parsedIntent: PaymentIntent | null
  intentHash: string | null
  offlineSig: string | null
  settlement: PaymentSettlement | null
  busy: boolean
  error: string | null
  parseIntent: () => Promise<void>
  signOffline: () => Promise<void>
  broadcast: () => Promise<void>
  /** Raw MWA signTransaction passthrough. Screens that need to sign their own
   *  one-off txs (e.g. EnableOfflinePay creating a nonce account) call this. */
  signTransactionRaw?: <T extends Transaction | VersionedTransaction>(tx: T) => Promise<T>
}

export type ScreenSlots = {
  body: ReactNode
  cta?: ReactNode
  eyebrow?: string
}

export type ScreenRenderer = (ctx: NavCtx) => ScreenSlots
