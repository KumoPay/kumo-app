import { useCallback, useState } from "react"
import { PublicKey, Transaction, VersionedTransaction } from "@solana/web3.js"
import {
  connectWallet,
  signArbitraryMessage,
  signIntentMessage,
  signTransactionWithWallet,
  type ConnectedWallet,
} from "../lib/mobile-wallet"

/**
 * Mobile equivalent of `@solana/wallet-adapter-react`'s `useWallet` — wraps MWA
 * (`transact()`) in a hook that exposes the same surface MobileShell uses.
 *
 * Differences vs web:
 * - There is no `select(brand)` — MWA picks the installed wallet for us.
 * - `connect` re-uses a stored `auth_token` if still valid (silent re-auth).
 * - `signMessage` and `signTransaction` each open a fresh MWA session under the
 *   hood; that's fine, MWA is designed for short-lived calls.
 */
export type MobileWalletAdapter = {
  publicKey: PublicKey | null
  connected: boolean
  label: string
  connect: () => Promise<void>
  disconnect: () => Promise<void>
  signMessage: ((message: Uint8Array) => Promise<Uint8Array>) | undefined
  /** Generic sign — accepts arbitrary payload bytes. Returns the raw 64-byte
   *  signature (so callers can bs58-encode for MagicBlock auth, etc.). */
  signMessageRaw: ((payload: Uint8Array) => Promise<Uint8Array>) | undefined
  signTransaction:
    | (<T extends Transaction | VersionedTransaction>(tx: T) => Promise<T>)
    | undefined
}

export function useWalletAdapter(): MobileWalletAdapter {
  const [wallet, setWallet] = useState<ConnectedWallet | null>(null)

  const connect = useCallback(async () => {
    const w = await connectWallet(wallet?.authToken)
    setWallet(w)
  }, [wallet])

  const disconnect = useCallback(async () => {
    setWallet(null)
  }, [])

  const signMessage = useCallback(
    async (message: Uint8Array): Promise<Uint8Array> => {
      if (!wallet) throw new Error("Wallet not connected")
      // signIntentMessage expects an intent_hash hex string and prefixes it with
      // "Kumo offline intent: ". For arbitrary message bytes we'd need a generic
      // signer — but MobileShell only ever signs an intent hash, so we extract it.
      const decoded = new TextDecoder().decode(message)
      const m = decoded.match(/Kumo offline intent: ([0-9a-f]{64})/i)
      if (!m) throw new Error("Unsupported sign payload (expected Kumo offline intent)")
      const sigBs58 = await signIntentMessage({ wallet, intentHash: m[1] })
      // MobileShell wraps with bs58.encode again; return raw bytes by decoding.
      const { default: bs58 } = await import("bs58")
      return bs58.decode(sigBs58)
    },
    [wallet],
  )

  const signMessageRaw = useCallback(
    async (payload: Uint8Array): Promise<Uint8Array> => {
      if (!wallet) throw new Error("Wallet not connected")
      const sigBs58 = await signArbitraryMessage({ wallet, payload })
      const { default: bs58 } = await import("bs58")
      return bs58.decode(sigBs58)
    },
    [wallet],
  )

  const signTransaction = useCallback(
    async <T extends Transaction | VersionedTransaction>(tx: T): Promise<T> => {
      if (!wallet) throw new Error("Wallet not connected")
      const signed = await signTransactionWithWallet({ wallet, transaction: tx })
      return signed as T
    },
    [wallet],
  )

  return {
    publicKey: wallet?.publicKey ?? null,
    connected: wallet != null,
    label: wallet?.label ?? "",
    connect,
    disconnect,
    signMessage: wallet ? signMessage : undefined,
    signMessageRaw: wallet ? signMessageRaw : undefined,
    signTransaction: wallet ? signTransaction : undefined,
  }
}
