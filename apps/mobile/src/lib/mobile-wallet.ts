import { Buffer } from "buffer"
import bs58 from "bs58"
import { PublicKey, Transaction, VersionedTransaction } from "@solana/web3.js"
import {
  transact,
  type Web3MobileWallet,
} from "@solana-mobile/mobile-wallet-adapter-protocol-web3js"
import { APP_IDENTITY } from "./config"

export type ConnectedWallet = {
  authToken: string
  rawAddress: string
  publicKey: PublicKey
  label: string
  /** Wallet app's base URI from MWA (e.g. "https://phantom.app"). Used to detect
   *  the actual wallet brand — `label` is only the per-account name. */
  walletUriBase: string | null
}

function addressToPublicKey(address: string): PublicKey {
  try {
    return new PublicKey(address)
  } catch {
    return new PublicKey(Buffer.from(address, "base64"))
  }
}

function userMessage(error: unknown): string {
  const msg = error instanceof Error ? error.message : String(error)
  if (/not.?found|wallet/i.test(msg)) return "No compatible Solana mobile wallet was found."
  if (/cancel|reject|not signed/i.test(msg)) return "Wallet request was cancelled."
  if (/timeout/i.test(msg)) return "Wallet did not respond in time."
  return msg
}

async function authorize(wallet: Web3MobileWallet, authToken?: string) {
  if (authToken) {
    try {
      return await wallet.reauthorize({
        auth_token: authToken,
        identity: APP_IDENTITY,
      })
    } catch {
      // Fall back to a fresh authorization below.
    }
  }

  return wallet.authorize({
    identity: APP_IDENTITY,
    chain: "solana:devnet",
  })
}

export async function connectWallet(authToken?: string): Promise<ConnectedWallet> {
  try {
    return await transact(async (wallet) => {
      const auth = await authorize(wallet, authToken)
      if (__DEV__) {
        // Dev-only diagnostic: not every MWA wallet implementation populates
        // wallet_uri_base, and label is often generic ("Main Wallet"). The
        // dump helps narrow down which wallet brand connected.
        console.log("[Kumo] MWA authorize response:", {
          keys: Object.keys(auth),
          wallet_uri_base: (auth as { wallet_uri_base?: unknown }).wallet_uri_base ?? null,
          auth_token_prefix: auth.auth_token?.slice(0, 32) ?? null,
          first_account: auth.accounts[0]
            ? {
                keys: Object.keys(auth.accounts[0]),
                label: auth.accounts[0].label,
                address_prefix: auth.accounts[0].address?.slice(0, 16),
                icon: (auth.accounts[0] as { icon?: unknown }).icon ?? null,
                chains: (auth.accounts[0] as { chains?: unknown }).chains ?? null,
                features: (auth.accounts[0] as { features?: unknown }).features ?? null,
              }
            : null,
        })
      }
      const account = auth.accounts[0]
      if (!account) throw new Error("Wallet returned no accounts.")
      const publicKey = addressToPublicKey(account.address)
      return {
        authToken: auth.auth_token,
        rawAddress: account.address,
        publicKey,
        label: account.label ?? "Mobile wallet",
        walletUriBase: auth.wallet_uri_base ?? null,
      }
    })
  } catch (e) {
    throw new Error(userMessage(e))
  }
}

export async function signIntentMessage(opts: {
  wallet: ConnectedWallet
  intentHash: string
}): Promise<string> {
  const payload = new TextEncoder().encode(`Kumo offline intent: ${opts.intentHash}`)
  return signArbitraryMessage({ wallet: opts.wallet, payload })
}

/** Generic signMessage path. Some MWA implementations prepend metadata to the
 *  signed bytes; we always trim back to the trailing 64-byte ed25519 sig. */
export async function signArbitraryMessage(opts: {
  wallet: ConnectedWallet
  payload: Uint8Array
}): Promise<string> {
  try {
    return await transact(async (mobileWallet) => {
      await authorize(mobileWallet, opts.wallet.authToken)
      const signed = await mobileWallet.signMessages({
        addresses: [opts.wallet.rawAddress],
        payloads: [opts.payload],
      })
      const bytes = signed[0]
      if (!bytes) throw new Error("Wallet returned no signature.")
      const signature = bytes.length > 64 ? bytes.slice(bytes.length - 64) : bytes
      return bs58.encode(signature)
    })
  } catch (e) {
    throw new Error(userMessage(e))
  }
}

export async function signTransactionWithWallet(opts: {
  wallet: ConnectedWallet
  transaction: Transaction | VersionedTransaction
}): Promise<Transaction | VersionedTransaction> {
  try {
    return await transact(async (mobileWallet) => {
      await authorize(mobileWallet, opts.wallet.authToken)
      const [signed] = await mobileWallet.signTransactions({
        transactions: [opts.transaction],
      })
      if (!signed) throw new Error("Wallet returned no signed transaction.")
      return signed
    })
  } catch (e) {
    throw new Error(userMessage(e))
  }
}
