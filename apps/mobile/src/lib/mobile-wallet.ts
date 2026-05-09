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
      const account = auth.accounts[0]
      if (!account) throw new Error("Wallet returned no accounts.")
      const publicKey = addressToPublicKey(account.address)
      return {
        authToken: auth.auth_token,
        rawAddress: account.address,
        publicKey,
        label: account.label ?? "Mobile wallet",
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
  try {
    return await transact(async (mobileWallet) => {
      await authorize(mobileWallet, opts.wallet.authToken)
      const payload = new TextEncoder().encode(`Kumo offline intent: ${opts.intentHash}`)
      const signed = await mobileWallet.signMessages({
        addresses: [opts.wallet.rawAddress],
        payloads: [payload],
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
