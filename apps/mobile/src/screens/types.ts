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
  | "chooseMode"
  | "intent"
  | "sign"
  | "queued"
  | "settled"
  | "scan"

export const PAY_FLOW: ScreenId[] = ["chooseMode", "intent", "sign", "queued", "settled"]
/** Progress dots / breadcrumb steps shown to the user. `chooseMode` is a
 *  pre-step that picks the rail; the visible numbered progress starts at intent. */
export const PAY_PROGRESS_STEPS: ScreenId[] = ["intent", "sign", "queued", "settled"]

export type WalletInfo = {
  id: string
  label: string
  brand: string
  initial: string
  pubkey: string
  displayName: string
  /** MWA's `wallet_uri_base` from the most recent authorize() (e.g.
   *  "https://phantom.app"). Persisted so we can re-derive brand on bootstrap
   *  even when the per-account label is generic ("Main Wallet"). May be null
   *  for legacy records or wallet implementations that don't expose it. */
  walletUriBase?: string | null
}

export type PaymentSettlement = {
  signature: string
  validator?: string
  sendTo: "base" | "ephemeral"
}

/** Live progress state for the on-device LLM parsing pipeline, updated per
 *  token. Surfaced in the UI to show inference is running locally. */
export type QvacStreamState = {
  /** Number of tokens emitted so far. */
  tokenCount: number
  /** Tokens per second, computed against the local wall clock. */
  tokensPerSec: number
  /** Wall-clock ms since the completion started. */
  elapsedMs: number
  /** Decoded text accumulated so far. */
  text: string
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
  /** Live progress of the on-device LLM while parsing the current intent.
   *  Non-null only while QVAC is actively decoding; cleared on completion. */
  qvacStream: QvacStreamState | null
  parseIntent: () => Promise<void>
  signOffline: () => Promise<void>
  broadcast: () => Promise<void>
  /** Broadcast someone else's offline-signed intent payload (scanned QR or pasted URI).
   *  Returns the transaction signature on success. */
  relayIntent: (payloadUri: string) => Promise<string>
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
