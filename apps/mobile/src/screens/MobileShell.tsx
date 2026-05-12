import { useCallback, useEffect, useMemo, useRef, useState } from "react"
import {
  ActivityIndicator,
  AppState,
  Image,
  Pressable,
  ScrollView,
  StatusBar,
  StyleSheet,
  Text,
  View,
} from "react-native"
import { SafeAreaView } from "react-native-safe-area-context"
import { MotiView, AnimatePresence } from "moti"
import AsyncStorage from "@react-native-async-storage/async-storage"
import bs58 from "bs58"
import { Buffer } from "buffer"
import { Transaction, VersionedTransaction, Connection } from "@solana/web3.js"
import type { PaymentIntent } from "@kumo/shared"
import { parseIntentPayload } from "@kumo/shared"

import { K, SHADOW } from "./theme"
import { BackButton } from "./atoms"
import { ASSETS, brandFor, brandFromLabel, walletLogoFor as walletLogoForBrand } from "./assets"
import { Connect } from "./Connect"
import { ChooseAlias } from "./ChooseAlias"
import { ChooseMode } from "./ChooseMode"
import { Home } from "./Home"
import { Intent } from "./Intent"
import { Sign } from "./Sign"
import { Queued } from "./Queued"
import { Settled } from "./Settled"
import { Scan } from "./Scan"
import { Contacts } from "./Contacts"
import { History } from "./History"
import { Receive } from "./Receive"
import { Settings } from "./Settings"
import { EnableLocalAI } from "./EnableLocalAI"
import { EnableOfflinePay } from "./EnableOfflinePay"
import { EnableWhisper } from "./EnableWhisper"
import { AppOpenSplash } from "./AppOpenSplash"
import { MobileTabBar, type MobileTabId } from "./MobileTabBar"
import {
  PAY_FLOW,
  type NavCtx,
  type PaymentSettlement,
  type QvacStreamState,
  type ScreenId,
  type ScreenRenderer,
  type WalletInfo,
} from "./types"
import { sanitizeKumoLocalPart, KUMO_ALIAS_MIN_LEN } from "./alias-utils"
import {
  clearMobilePersistedState,
  readAliasOnboardingComplete,
  readStoredWallet,
  writeAliasOnboardingComplete,
  writeStoredWallet,
} from "./wallet-storage"
import { resolveRecipientToPubkey } from "./contacts-store"
import { appendHistory, updateHistoryStatus } from "./history-store"
import { enqueueIntent, listQueue, removeFromQueue } from "./queue-store"
import { awaitConfirmation } from "../lib/transactions"
import { getNonceSetup, refreshNonceFromChain } from "../lib/durable-nonce"
import {
  buildPublicTransferFresh,
  buildPublicTransferWithNonce,
} from "../lib/offline-build"
import { privateTransferDirect } from "../lib/magicblock-direct"
import {
  isLocalAIEnabled,
  isModelDownloaded,
  parseIntentLocal,
  prewarmInference,
} from "../lib/qvac-local"
import { prewarmWhisper } from "../lib/whisper-local"
import { parseIntentRegex } from "../lib/regex-parser"
import { authenticateForAction, requireForSign } from "../lib/biometric"
import { useConnection } from "../hooks/use-connection"
import { useNetwork } from "../hooks/use-network"
import { useWalletAdapter } from "../hooks/use-wallet-adapter"
import { MAGICBLOCK_TEE_RPC } from "../lib/config"
import { registerBroadcastTask } from "../lib/background-broadcast"
import {
  clearAwaitingConnection,
  notifyAwaitingConnection,
  notifyPaymentFailed,
  notifyPaymentSent,
} from "../lib/notify"

const SCREENS: Record<ScreenId, ScreenRenderer> = {
  home: Home,
  contacts: Contacts,
  history: History,
  receive: Receive,
  settings: Settings,
  connect: Connect,
  alias: ChooseAlias,
  enableLocalAI: EnableLocalAI,
  enableWhisper: EnableWhisper,
  enableOfflinePay: EnableOfflinePay,
  chooseMode: ChooseMode,
  intent: Intent,
  sign: Sign,
  queued: Queued,
  settled: Settled,
  scan: Scan,
}

async function sha256Hex(text: string): Promise<string> {
  const bytes = new TextEncoder().encode(text)
  const buf = await crypto.subtle.digest("SHA-256", bytes as BufferSource)
  return Array.from(new Uint8Array(buf))
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("")
}

export function MobileShell() {
  const [bootstrapped, setBootstrapped] = useState(false)
  const [stack, setStack] = useState<ScreenId[]>(["connect"])
  const [direction, setDirection] = useState<1 | -1>(1)
  const [airplaneOverride, setAirplaneOverride] = useState(false)
  const [privacyDefault, setPrivacyDefault] = useState(true)
  const [wallet, setWallet] = useState<WalletInfo | null>(null)
  const [showAppSplash, setShowAppSplash] = useState(false)

  const network = useNetwork()
  /** True when offline by either real connectivity OR user-forced airplane toggle. */
  const airplane = airplaneOverride || !network.online

  /** Auto-prompt to set up nonce account the first time the user toggles airplane on. */
  const setAirplane = useCallback(
    (v: boolean) => {
      setAirplaneOverride(v)
      if (v) {
        void (async () => {
          const seen = await AsyncStorage.getItem("kumo.offlinePay.promptSeen").catch(() => null)
          if (seen === "1") return
          const setup = await getNonceSetup()
          if (setup?.cached) return
          await AsyncStorage.setItem("kumo.offlinePay.promptSeen", "1").catch(() => {})
          setDirection(1)
          setStack((s) => [...s, "enableOfflinePay"])
        })()
      }
    },
    [],
  )

  const [intentText, setIntentText] = useState("")
  const [parsedIntent, setParsedIntent] = useState<PaymentIntent | null>(null)
  const [intentHash, setIntentHash] = useState<string | null>(null)
  const [offlineSig, setOfflineSig] = useState<string | null>(null)
  const [settlement, setSettlement] = useState<PaymentSettlement | null>(null)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [qvacStream, setQvacStream] = useState<QvacStreamState | null>(null)
  // intent hashes currently being broadcast — guards against the auto-broadcast
  // useEffect and a user tap on "Reconnect & broadcast" racing to send the same
  // signed tx. Second caller is short-circuited.
  const inflightHashesRef = useRef<Set<string>>(new Set())

  const { connection } = useConnection()
  const adapter = useWalletAdapter()
  const {
    publicKey,
    connected,
    label,
    walletUriBase,
    authToken,
    connect,
    disconnect,
    signMessage,
    signMessageRaw,
    signTransaction,
  } = adapter

  // Bootstrap: read persisted wallet (alias only — fresh MWA auth happens on connect tap).
  useEffect(() => {
    void (async () => {
      const w = await readStoredWallet()
      if (w) {
        // Migrate legacy entries that stored a generic brand (id "mobile"); re-derive
        // from walletUriBase (preferred) or label. Won't be perfectly accurate for
        // legacy records that lack walletUriBase — those need a reconnect to populate
        // the field via authorize(). After that, future bootstraps are accurate.
        const migrated =
          w.brand === "mobile" || w.brand === w.id
            ? { ...w, brand: brandFor({ walletUriBase: w.walletUriBase, label: w.label }) }
            : w
        setWallet(migrated)
      }
      setBootstrapped(true)
    })()
    void registerBroadcastTask()
    // Pre-warm on-device inference contexts so the first parse / transcribe
    // doesn't pay the cold-start cost (~500ms-1s for llama, ~200-400ms for
    // whisper). Both are idempotent and no-op if the model isn't present.
    // Fire-and-forget — bootstrap should not block on these.
    void prewarmInference()
    void prewarmWhisper()
  }, [])

  // After real MWA connect succeeds, sync wallet info + persist + advance.
  useEffect(() => {
    if (!connected || !publicKey) return
    setWallet((prev) => {
      const id = "mobile"
      const next: WalletInfo = {
        id,
        label: label || "Mobile wallet",
        brand: brandFor({ walletUriBase, authToken, label }),
        initial: (label || "M").charAt(0).toUpperCase(),
        pubkey: publicKey.toBase58(),
        displayName: prev?.displayName ?? "",
        walletUriBase: walletUriBase ?? null,
      }
      if (__DEV__) {
        console.log("[Kumo] wallet connected:", {
          label,
          walletUriBase,
          derivedBrand: next.brand,
          authTokenPrefix: authToken?.slice(0, 16),
        })
      }
      void writeStoredWallet(next)
      return next
    })
    if (stack[stack.length - 1] === "connect") {
      void (async () => {
        const onboarded = await readAliasOnboardingComplete()
        setDirection(1)
        if (!onboarded) {
          setStack(["alias"])
          return
        }
        // If there are queued offline intents from a prior session, restore the
        // most recent one so the user lands on Queued screen ready to broadcast.
        const queued = await listQueue()
        const mine = queued.filter((q) => q.signerPubkey === publicKey.toBase58())
        if (mine.length > 0) {
          const latest = mine[mine.length - 1]
          setParsedIntent(latest.intent)
          setIntentHash(latest.intentHash)
          setOfflineSig(latest.offlineSig)
          setStack(["home", "queued"])
          return
        }
        // First-time setup: if we're online and the user has no durable nonce
        // account yet, route to EnableOfflinePay so they're ready to sign while
        // offline later. They can still skip.
        if (network.online) {
          const setup = await getNonceSetup()
          if (!setup?.cached) {
            setStack(["home", "enableOfflinePay"])
            return
          }
        }
        setStack(["home"])
        setShowAppSplash(true)
      })()
    }
  }, [connected, publicKey, label, stack, network.online])

  const current = stack[stack.length - 1]
  const canGoBack = stack.length > 1

  const push = useCallback((id: ScreenId) => {
    setDirection(1)
    setStack((s) => [...s, id])
  }, [])

  const back = useCallback(() => {
    setStack((s) => {
      if (s.length <= 1) return s
      setDirection(-1)
      return s.slice(0, -1)
    })
  }, [])

  const resetHome = useCallback(() => {
    setDirection(-1)
    setStack(["home"])
    setParsedIntent(null)
    setIntentHash(null)
    setOfflineSig(null)
    setSettlement(null)
    setError(null)
  }, [])

  const goToNewPayment = useCallback(() => {
    setDirection(1)
    setStack(["home", "chooseMode"])
    setParsedIntent(null)
    setIntentHash(null)
    setOfflineSig(null)
    setSettlement(null)
    setError(null)
  }, [])

  const completeAliasOnboarding = useCallback(
    (localHandle: string) => {
      const slug = sanitizeKumoLocalPart(localHandle)
      if (slug.length < KUMO_ALIAS_MIN_LEN) return
      setWallet((prev) => {
        if (!prev) return prev
        const next = { ...prev, displayName: slug }
        void writeStoredWallet(next)
        return next
      })
      void writeAliasOnboardingComplete()
      setDirection(1)
      // After alias onboarding, prompt for on-device AI download (one-time).
      setStack(["enableLocalAI"])
    },
    [],
  )

  const beginWalletConnect = useCallback(async () => {
    setError(null)
    setBusy(true)
    try {
      await connect()
    } catch (e) {
      const msg = e instanceof Error ? e.message : String(e)
      if (!/cancel|reject/i.test(msg)) setError(msg)
    } finally {
      setBusy(false)
    }
  }, [connect])

  const disconnectWallet = useCallback(() => {
    void disconnect().catch(() => {})
    void clearMobilePersistedState()
    setWallet(null)
    setDirection(-1)
    setStack(["connect"])
    setShowAppSplash(false)
    setParsedIntent(null)
    setIntentHash(null)
    setOfflineSig(null)
    setSettlement(null)
    setError(null)
  }, [disconnect])

  const parseIntent = useCallback(async () => {
    setError(null)
    setBusy(true)
    setQvacStream(null)
    try {
      const text = intentText.trim()
      let intent: PaymentIntent | null = null

      // Tier 1: on-device LLM (if user enabled it AND model is downloaded).
      const useLocal = (await isLocalAIEnabled()) && (await isModelDownloaded())
      if (useLocal) {
        try {
          intent = await parseIntentLocal(text, (ev) => {
            setQvacStream({
              tokenCount: ev.tokenCount,
              tokensPerSec: ev.tokensPerSec,
              elapsedMs: ev.elapsedMs,
              text: ev.text,
            })
          })
        } catch (e) {
          console.warn("local parse failed, falling through:", e)
        }
      }

      // Tier 2: regex parser — deterministic, fully on-device, no model needed.
      // (The legacy /api/parse-intent cloud fallback is intentionally skipped —
      //  Kumo runs without a backend.)
      if (!intent) {
        intent = parseIntentRegex(text)
      }

      if (!intent) {
        throw new Error(
          "I couldn't understand that. Try: 'pay <contact> 5 usdc privately' or paste a Solana address.",
        )
      }

      // The UI toggle overrides whatever `private` value the parser inferred
      // from the wording — the toggle is the source of truth.
      intent = { ...intent, private: privacyDefault }
      setParsedIntent(intent)
      const canonical = JSON.stringify({
        recipient: intent.recipient,
        amount_usdc: intent.amount_usdc,
        private: intent.private,
        memo: intent.memo ?? "",
      })
      const hash = await sha256Hex(canonical)
      setIntentHash(hash)
      setOfflineSig(null)
      setSettlement(null)
      setDirection(1)
      setStack((s) => [...s, "sign"])
    } catch (e) {
      setError(e instanceof Error ? e.message : "parse failed")
    } finally {
      setBusy(false)
      // Hold the final stream snapshot briefly so the user can read the final
      // token count and tokens/sec before the panel disappears.
      setTimeout(() => setQvacStream(null), 1200)
    }
  }, [intentText, privacyDefault])

  const signOffline = useCallback(async () => {
    if (!parsedIntent || !intentHash || !signMessage || !publicKey) {
      setError("Wallet does not support signMessage.")
      return
    }
    // Durable nonce is single-use until advanced on-chain. Allow only one
    // offline-signed payment in the queue at a time so the cached nonce can't
    // be reused for two txs that would race for the same slot.
    const existingQueue = await listQueue()
    const myPending = existingQueue.filter(
      (q) => q.signerPubkey === publicKey.toBase58() && q.signedTxBase64,
    )
    if (myPending.length > 0) {
      setError(
        "You already have a pending offline payment. Broadcast or clear it before signing another.",
      )
      return
    }
    setError(null)
    setBusy(true)
    try {
      if (await requireForSign()) {
        const ok = await authenticateForAction(
          `Sign intent · ${parsedIntent.amount_usdc} USDC to ${parsedIntent.recipient}`,
        )
        if (!ok) {
          setError("Biometric not approved.")
          return
        }
      }

      // Always produce the proof-of-intent signature (signMessage of intent hash).
      // Works offline because it's pure ed25519 in the wallet app.
      const message = new TextEncoder().encode(`Kumo offline intent: ${intentHash}`)
      const sig = await signMessage(message)
      const offlineSigB58 = bs58.encode(sig)
      setOfflineSig(offlineSigB58)

      // Offline + nonce ready → build the actual SPL transfer locally and pre-sign
      // it so broadcast later requires only sendRawTransaction. Forces public mode.
      let signedTxBase64: string | undefined
      let txVersion: "legacy" | "v0" | undefined
      let sendTo: "base" | "ephemeral" | undefined
      let offlineSetup: Awaited<ReturnType<typeof getNonceSetup>> | null = null
      if (!network.online) {
        offlineSetup = await getNonceSetup()
        const setup = offlineSetup
        if (!setup?.cached?.value) {
          throw new Error(
            "You're offline and offline payments aren't set up yet. Reconnect to set up, or try again online.",
          )
        }
        if (setup.authority !== publicKey.toBase58()) {
          throw new Error(
            `Offline-pay was set up for wallet ${setup.authority.slice(0, 4)}…${setup.authority.slice(-4)} and the on-chain nonce only accepts signatures from that wallet. Reconnect that wallet, or reset offline-pay in New Payment to set up fresh.`,
          )
        }
        const recipientPubkey = await resolveRecipientToPubkey(parsedIntent.recipient)
        if (!recipientPubkey) {
          throw new Error(
            `No contact "${parsedIntent.recipient}" found. Add them in Contacts first or paste a Solana address.`,
          )
        }
        const built = buildPublicTransferWithNonce({
          fromPubkey: publicKey.toBase58(),
          toPubkey: recipientPubkey,
          amountUsdc: parsedIntent.amount_usdc,
          memo: parsedIntent.memo,
          nonce: {
            pubkey: setup.noncePubkey,
            authority: setup.authority,
            value: setup.cached.value,
          },
        })
        if (!signTransaction) {
          throw new Error("Wallet does not support signTransaction.")
        }
        const txBytes = Buffer.from(built.transactionBase64, "base64")
        const tx = Transaction.from(txBytes)
        const signed = await signTransaction(tx)
        signedTxBase64 = Buffer.from(signed.serialize()).toString("base64")
        txVersion = built.version
        sendTo = built.sendTo
      }

      // Persist (with pre-signed tx if we built one) so it survives app restart.
      await enqueueIntent({
        intent: parsedIntent,
        intentHash,
        offlineSig: offlineSigB58,
        signerPubkey: publicKey.toBase58(),
        signedTxBase64,
        txVersion,
        sendTo,
        noncePubkey: offlineSetup?.noncePubkey,
        nonceValue: offlineSetup?.cached?.value,
      })
      if (!network.online) {
        void notifyAwaitingConnection({
          amountUsdc: parsedIntent.amount_usdc,
          recipient: parsedIntent.recipient,
          intentHash,
        })
      }
      setDirection(1)
      setStack((s) => [...s, "queued"])
    } catch (e) {
      const msg = e instanceof Error ? e.message : String(e)
      if (!/cancel|reject/i.test(msg)) setError(msg)
    } finally {
      setBusy(false)
    }
  }, [parsedIntent, intentHash, signMessage, publicKey, network.online, signTransaction])

  const broadcast = useCallback(async () => {
    if (!parsedIntent || !publicKey || !signTransaction) {
      setError("Wallet does not support signTransaction.")
      return
    }
    if (!network.online) {
      setError("You're offline. Connect to a network to broadcast.")
      return
    }
    if (intentHash && inflightHashesRef.current.has(intentHash)) {
      // Auto-broadcast already in flight for this intent. Don't fire a second
      // sendRawTransaction — the first will land or fail on its own.
      return
    }
    setError(null)
    setBusy(true)
    if (intentHash) inflightHashesRef.current.add(intentHash)
    try {
      // Fast path: a pre-signed offline tx is already queued for THIS intent.
      // No biometric, no rebuild, no resign — just submit.
      let preSigned: { tx: Buffer; sendTo: "base" | "ephemeral"; version: "legacy" | "v0" } | null = null
      if (intentHash) {
        const queue = await listQueue()
        const match = queue.find((q) => q.intentHash === intentHash && q.signedTxBase64)
        if (match?.signedTxBase64) {
          preSigned = {
            tx: Buffer.from(match.signedTxBase64, "base64"),
            sendTo: match.sendTo ?? "base",
            version: match.txVersion ?? "legacy",
          }
        }
      }

      if (preSigned) {
        const conn =
          preSigned.sendTo === "ephemeral"
            ? new Connection(MAGICBLOCK_TEE_RPC, "confirmed")
            : connection
        let signature: string
        try {
          signature = await conn.sendRawTransaction(preSigned.tx)
        } catch (e) {
          const reason = e instanceof Error ? e.message : String(e)
          // Pre-signed tx points at a nonce that's already been advanced. The
          // signed bytes can't be revived — drop the queue entry, refresh the
          // cached nonce, and ask the user to sign a fresh one.
          if (/Blockhash not found|nonce/i.test(reason) && intentHash) {
            const pending = await listQueue()
            for (const q of pending) {
              if (q.intentHash === intentHash) await removeFromQueue(q.id)
            }
            const setup = await getNonceSetup()
            if (setup?.noncePubkey) {
              await refreshNonceFromChain({
                connection,
                noncePubkey: setup.noncePubkey,
              }).catch(() => {})
            }
            throw new Error(
              "This offline payment expired (durable nonce was already used). Sign a fresh one.",
            )
          }
          throw e
        }
        setSettlement({ signature, sendTo: preSigned.sendTo })
        const entry = await appendHistory({
          direction: "out",
          counterparty: parsedIntent.recipient,
          amount: parsedIntent.amount_usdc,
          signature,
          status: "queued",
          sendTo: preSigned.sendTo,
        })
        if (intentHash) void clearAwaitingConnection(intentHash)
        void notifyPaymentSent({
          amountUsdc: parsedIntent.amount_usdc,
          recipient: parsedIntent.recipient,
          signature,
        })
        void awaitConfirmation({ signature, sendTo: preSigned.sendTo }).then((res) => {
          if (res.ok) void updateHistoryStatus(entry.id, { status: "delivered" })
          else
            void updateHistoryStatus(entry.id, {
              status: "failed",
              failureReason: res.error,
            })
        })
        if (intentHash) {
          const pending = await listQueue()
          for (const q of pending) {
            if (q.intentHash === intentHash) await removeFromQueue(q.id)
          }
        }
        setAirplane(false)
        setDirection(1)
        setStack((s) => [...s, "settled"])
        return
      }

      // Standard path: build + sign + submit.
      if (await requireForSign()) {
        const ok = await authenticateForAction(
          `Confirm payment · ${parsedIntent.amount_usdc} USDC to ${parsedIntent.recipient}`,
        )
        if (!ok) {
          setError("Biometric not approved.")
          return
        }
      }
      const recipientPubkey = await resolveRecipientToPubkey(parsedIntent.recipient)
      if (!recipientPubkey) {
        throw new Error(
          `No contact "${parsedIntent.recipient}" found. Add them in Contacts first or paste a Solana address.`,
        )
      }

      // Build directly on-device. Public = local SPL builder (no network); Private = MagicBlock REST.
      type Built = {
        transaction_b64: string
        version: "legacy" | "v0"
        send_to: "base" | "ephemeral"
        validator?: string
      }
      let j: Built
      if (parsedIntent.private) {
        if (!signMessageRaw) {
          throw new Error("Wallet does not support signMessage.")
        }
        const built = await privateTransferDirect({
          fromPubkey: publicKey.toBase58(),
          toPubkey: recipientPubkey,
          amountUsdc: parsedIntent.amount_usdc,
          memo: parsedIntent.memo,
          signMessageRaw,
        })
        j = {
          transaction_b64: built.transactionBase64,
          version: built.version,
          send_to: built.sendTo,
          validator: built.validator,
        }
      } else {
        const built = await buildPublicTransferFresh({
          connection,
          fromPubkey: publicKey.toBase58(),
          toPubkey: recipientPubkey,
          amountUsdc: parsedIntent.amount_usdc,
          memo: parsedIntent.memo,
        })
        j = {
          transaction_b64: built.transactionBase64,
          version: built.version,
          send_to: built.sendTo,
        }
      }

      const txBytes = Buffer.from(j.transaction_b64, "base64")
      let signed: Transaction | VersionedTransaction
      if (j.version === "v0") {
        const vtx = VersionedTransaction.deserialize(txBytes)
        signed = await signTransaction(vtx)
      } else {
        const tx = Transaction.from(txBytes)
        signed = await signTransaction(tx)
      }
      const conn =
        j.send_to === "ephemeral"
          ? new Connection(MAGICBLOCK_TEE_RPC, "confirmed")
          : connection
      const signature = await conn.sendRawTransaction(signed.serialize())
      setSettlement({ signature, validator: j.validator, sendTo: j.send_to })
      // Persist as queued; the poller below upgrades to delivered/failed.
      const entry = await appendHistory({
        direction: "out",
        counterparty: parsedIntent.recipient,
        amount: parsedIntent.amount_usdc,
        signature,
        status: "queued",
        sendTo: j.send_to,
        validator: j.validator,
      })
      void notifyPaymentSent({
        amountUsdc: parsedIntent.amount_usdc,
        recipient: parsedIntent.recipient,
        signature,
      })
      // Fire-and-forget confirmation poll. Updates status when chain confirms.
      void awaitConfirmation({ signature, sendTo: j.send_to }).then((res) => {
        if (res.ok) {
          void updateHistoryStatus(entry.id, { status: "delivered" })
        } else {
          void updateHistoryStatus(entry.id, {
            status: "failed",
            failureReason: res.error,
          })
        }
      })
      // Drain any queued intent for this exact intent hash (broadcast consumed it).
      if (intentHash) {
        const pending = await listQueue()
        for (const q of pending) {
          if (q.intentHash === intentHash) {
            await removeFromQueue(q.id)
          }
        }
      }
      setAirplane(false)
      setDirection(1)
      setStack((s) => [...s, "settled"])
    } catch (e) {
      const msg = e instanceof Error ? e.message : String(e)
      if (!/cancel|reject/i.test(msg)) setError(msg)
    } finally {
      setBusy(false)
      if (intentHash) inflightHashesRef.current.delete(intentHash)
    }
  }, [
    parsedIntent,
    publicKey,
    signTransaction,
    signMessageRaw,
    connection,
    network.online,
    setAirplane,
    intentHash,
  ])

  // Broadcast someone else's offline-signed intent (scanned QR or pasted URI).
  // The chain enforces the original signer's signature; this device is just a relay.
  const relayIntent = useCallback(
    async (payloadUri: string): Promise<string> => {
      const payload = parseIntentPayload(payloadUri)
      if (!payload.signedTx) {
        throw new Error("Intent has no signed transaction — cannot relay.")
      }
      const txBytes = Buffer.from(payload.signedTx, "base64")
      const conn =
        payload.sendTo === "ephemeral"
          ? new Connection(MAGICBLOCK_TEE_RPC, "confirmed")
          : connection
      const signature = await conn.sendRawTransaction(txBytes)
      const entry = await appendHistory({
        direction: "out",
        counterparty: payload.intent.recipient,
        amount: payload.intent.amount_usdc,
        signature,
        status: "queued",
        sendTo: payload.sendTo ?? "base",
      })
      void awaitConfirmation({ signature, sendTo: payload.sendTo ?? "base" }).then((res) => {
        if (res.ok) void updateHistoryStatus(entry.id, { status: "delivered" })
        else
          void updateHistoryStatus(entry.id, {
            status: "failed",
            failureReason: res.error,
          })
      })
      return signature
    },
    [connection],
  )

  const ctx: NavCtx = useMemo(
    () => ({
      push, back, resetHome, goToNewPayment, airplane, setAirplane,
      privacyDefault, setPrivacyDefault,
      wallet, beginWalletConnect, disconnectWallet, completeAliasOnboarding,
      intentText, setIntentText, parsedIntent, intentHash, offlineSig, settlement,
      busy, error, qvacStream, parseIntent, signOffline, broadcast, relayIntent,
      signTransactionRaw: signTransaction,
    }),
    [
      push, back, resetHome, goToNewPayment, airplane, privacyDefault,
      wallet, beginWalletConnect, disconnectWallet, completeAliasOnboarding,
      intentText, parsedIntent, intentHash, offlineSig, settlement,
      busy, error, qvacStream, parseIntent, signOffline, broadcast, relayIntent,
      signTransaction,
    ],
  )

  // Auto-broadcast: drain any pre-signed queued intents and update history
  // live. Called from two triggers: (1) the network flipping offline → online
  // while the app is foregrounded; (2) the app coming back to foreground from
  // background, where the OS may have reconnected the network without firing
  // a NetInfo event we received. Both call the same drainer; the in-flight
  // lock prevents the two from racing each other.
  const drainQueue = useCallback(async () => {
    if (!publicKey || !network.online) return
    const setup = await getNonceSetup()
    if (setup?.noncePubkey) {
      await refreshNonceFromChain({
        connection,
        noncePubkey: setup.noncePubkey,
      }).catch(() => {})
    }
    const queue = await listQueue()
    const mine = queue.filter(
      (q) => q.signedTxBase64 && q.signerPubkey === publicKey.toBase58(),
    )
    for (const q of mine) {
      // Same intent might already be in flight via a user tap on the Queued
      // screen's "Reconnect & broadcast" button. Skip — first caller wins.
      if (q.intentHash && inflightHashesRef.current.has(q.intentHash)) continue
      if (q.intentHash) inflightHashesRef.current.add(q.intentHash)
      try {
        const txBytes = Buffer.from(q.signedTxBase64!, "base64")
        const conn =
          q.sendTo === "ephemeral"
            ? new Connection(MAGICBLOCK_TEE_RPC, "confirmed")
            : connection
        const signature = await conn.sendRawTransaction(txBytes)
        const entry = await appendHistory({
          direction: "out",
          counterparty: q.intent.recipient,
          amount: q.intent.amount_usdc,
          signature,
          status: "queued",
          sendTo: q.sendTo ?? "base",
        })
        await removeFromQueue(q.id)
        if (q.intentHash) void clearAwaitingConnection(q.intentHash)
        void notifyPaymentSent({
          amountUsdc: q.intent.amount_usdc,
          recipient: q.intent.recipient,
          signature,
        })
        // If the user is currently staring at the Queued screen for this
        // exact intent, push them to Settled so they don't see a stale
        // "Reconnect & broadcast" CTA — and so they can't double-trigger
        // a broadcast they don't realize already landed.
        if (q.intentHash && q.intentHash === intentHash) {
          setSettlement({ signature, sendTo: q.sendTo ?? "base" })
          setDirection(1)
          setStack((s) =>
            s[s.length - 1] === "queued" ? [...s, "settled"] : s,
          )
        }
        void awaitConfirmation({ signature, sendTo: q.sendTo ?? "base" }).then((res) => {
          if (res.ok) void updateHistoryStatus(entry.id, { status: "delivered" })
          else
            void updateHistoryStatus(entry.id, {
              status: "failed",
              failureReason: res.error,
            })
        })
        // A successful public-rail broadcast advances the durable nonce on
        // chain. Refresh the cache before the next iteration so any
        // remaining queue entry signed against the *previous* value gets
        // flagged stale by the local check instead of silently failing.
        if (q.sendTo !== "ephemeral" && setup?.noncePubkey) {
          await refreshNonceFromChain({
            connection,
            noncePubkey: setup.noncePubkey,
          }).catch(() => {})
        }
      } catch (e) {
        console.warn("auto-broadcast failed for", q.id, e)
        const reason = e instanceof Error ? e.message : String(e)
        // Stale durable nonce means the pre-signed tx is permanently invalid.
        // Drop it from the queue so the user can re-sign cleanly, and leave
        // a "failed" history row so the demo / debug surface shows what
        // happened instead of the intent silently disappearing.
        if (/Blockhash not found|nonce/i.test(reason)) {
          await removeFromQueue(q.id)
          if (q.intentHash) void clearAwaitingConnection(q.intentHash)
          await appendHistory({
            direction: "out",
            counterparty: q.intent.recipient,
            amount: q.intent.amount_usdc,
            signature: `expired_${q.id}`,
            status: "failed",
            sendTo: q.sendTo ?? "base",
            failureReason: "Durable nonce expired before broadcast",
          }).catch(() => {})
        }
        void notifyPaymentFailed({
          amountUsdc: q.intent.amount_usdc,
          recipient: q.intent.recipient,
          reason,
        })
      } finally {
        if (q.intentHash) inflightHashesRef.current.delete(q.intentHash)
      }
    }
  }, [network.online, publicKey, connection, intentHash])

  // Trigger 1: network flipped offline → online while app is foregrounded.
  const wasOnlineRef = useRef(network.online)
  useEffect(() => {
    const wasOnline = wasOnlineRef.current
    wasOnlineRef.current = network.online
    if (wasOnline || !network.online) return
    void drainQueue()
  }, [network.online, drainQueue])

  // Trigger 2: app coming back to foreground. Network may have reconnected
  // while we were backgrounded (Android doesn't reliably deliver NetInfo
  // events to a sleeping JS thread). Fire drain unconditionally on resume —
  // the in-flight lock + empty-queue early-return keep it safe.
  useEffect(() => {
    const sub = AppState.addEventListener("change", (state) => {
      if (state === "active") void drainQueue()
    })
    return () => sub.remove()
  }, [drainQueue])

  const slots = SCREENS[current](ctx)

  const inPayFlow = PAY_FLOW.includes(current)
  const payIdx = PAY_FLOW.indexOf(current)
  const isHomeDashboard = current === "home" && !canGoBack
  const isAliasOnboarding = current === "alias"
  const isOnboardingFlow =
    isAliasOnboarding ||
    current === "enableLocalAI" ||
    current === "enableWhisper"
  const isOnConnect = current === "connect"

  const showMainTabBar =
    Boolean(wallet) && !isOnConnect && !isOnboardingFlow && !inPayFlow

  const activeTab: MobileTabId = (() => {
    if (current === "contacts") return "contactos"
    if (current === "settings") return "ajustes"
    if (current === "history") return "historial"
    return "inicio"
  })()

  const onTabInicio = useCallback(() => resetHome(), [resetHome])
  const onTabHistorial = useCallback(() => {
    if (current === "history") return
    setDirection(1)
    setStack(["home", "history"])
  }, [current])
  const onTabContactos = useCallback(() => {
    if (current === "contacts") return
    setDirection(1)
    setStack(["home", "contacts"])
  }, [current])
  const onTabAjustes = useCallback(() => {
    if (current === "settings") return
    setDirection(1)
    setStack(["home", "settings"])
  }, [current])

  if (!bootstrapped) {
    return <SafeAreaView style={[styles.safe, { backgroundColor: "#ede9fe" }]} />
  }

  return (
    <SafeAreaView style={[styles.safe, isHomeDashboard ? styles.bgHome : styles.bgPage]}>
      <StatusBar barStyle="dark-content" />

      <View style={styles.header}>
        {wallet && (isHomeDashboard || (current === "history" || current === "contacts" || current === "receive" || current === "settled")) ? (
          <>
            <View style={styles.headerLeft}>
              <Image source={ASSETS.favicon32} style={styles.headerFavicon} resizeMode="cover" />
              <Image source={ASSETS.logoPrimary02} style={styles.headerLogo} resizeMode="contain" />
            </View>
            <Pressable
              onPress={() => push("settings")}
              style={({ pressed }) => [styles.walletPill, SHADOW.pill, pressed && { opacity: 0.85 }]}
            >
              <Image
                source={walletLogoForBrand(wallet.brand)}
                style={styles.walletPillAvatar}
                resizeMode="cover"
              />
              <Text style={styles.walletPillText} numberOfLines={1}>
                {wallet?.label || ""}
              </Text>
              <View style={styles.greenDot} />
            </Pressable>
          </>
        ) : (
          <>
            <View style={styles.headerLeft}>
              {canGoBack ? <BackButton onPress={back} /> : null}
              <Text style={[styles.brand, isOnConnect && { fontSize: 15 }]}>
                {isOnConnect ? "KUMO" : "Kumo"}
              </Text>
            </View>
            {wallet && !isOnConnect && !isOnboardingFlow ? (
              <View style={styles.headerRight}>
                <Pressable
                  onPress={() => setAirplane(!airplane)}
                  accessibilityRole="button"
                  accessibilityLabel={airplane ? "Turn off airplane mode" : "Turn on airplane mode"}
                  style={({ pressed }) => [
                    styles.airplaneIconBtn,
                    { backgroundColor: airplane ? K.lilac : K.white },
                    pressed && { opacity: 0.85 },
                  ]}
                >
                  <Text style={{ color: K.navy, fontSize: 14, fontWeight: "800" }}>✈</Text>
                </Pressable>
              </View>
            ) : null}
          </>
        )}
      </View>

      {inPayFlow && (
        <View style={styles.stepRow}>
          {PAY_FLOW.map((id, i) => {
            const active = i === payIdx
            const done = i < payIdx
            return (
              <View
                key={id}
                style={[
                  styles.stepDot,
                  active ? { backgroundColor: "#a78bfa" } : done ? { backgroundColor: "#7dd3fc" } : { backgroundColor: K.slate200 },
                ]}
              />
            )
          })}
        </View>
      )}

      {slots.eyebrow && <Text style={styles.eyebrow}>{slots.eyebrow}</Text>}

      <View style={styles.bodyWrap}>
        <AnimatePresence>
          <MotiView
            key={current}
            from={{ opacity: 0, translateX: direction === 1 ? 24 : -24 }}
            animate={{ opacity: 1, translateX: 0 }}
            exit={{ opacity: 0, translateX: direction === 1 ? -24 : 24 }}
            transition={{ type: "timing", duration: 240 }}
            style={StyleSheet.absoluteFillObject}
          >
            <ScrollView
              style={{ flex: 1 }}
              contentContainerStyle={styles.bodyContent}
              keyboardShouldPersistTaps="handled"
            >
              {slots.body}
            </ScrollView>
          </MotiView>
        </AnimatePresence>
      </View>

      {slots.cta ? (
        <View style={[styles.footer, isHomeDashboard ? styles.footerHome : styles.footerSticky]}>
          {slots.cta}
        </View>
      ) : null}

      {showMainTabBar ? (
        <MobileTabBar
          activeTab={activeTab}
          onInicio={onTabInicio}
          onHistorial={onTabHistorial}
          onContactos={onTabContactos}
          onAjustes={onTabAjustes}
        />
      ) : null}

      {showAppSplash ? <AppOpenSplash onDismiss={() => setShowAppSplash(false)} /> : null}
    </SafeAreaView>
  )
}

const styles = StyleSheet.create({
  safe: { flex: 1 },
  bgHome: { backgroundColor: K.pageBg },
  bgPage: { backgroundColor: K.white },
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 20,
    paddingTop: 12,
    paddingBottom: 8,
    gap: 12,
  },
  headerLeft: { flexDirection: "row", alignItems: "center", gap: 10, flexShrink: 1 },
  headerRight: { flexDirection: "row", alignItems: "center", gap: 6 },
  brand: {
    fontSize: 18,
    fontWeight: "900",
    letterSpacing: -0.5,
    color: K.navy,
  },
  brandSm: {
    fontSize: 15,
    fontWeight: "900",
    letterSpacing: 0.6,
    color: K.navy,
  },
  walletPill: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    paddingHorizontal: 11,
    paddingVertical: 8,
    backgroundColor: K.panelGray,
    borderColor: K.navy05,
    borderWidth: StyleSheet.hairlineWidth,
    borderRadius: 999,
    maxWidth: 200,
  },
  walletPillText: {
    fontSize: 13,
    fontWeight: "700",
    color: "#141b2f",
  },
  walletPillAvatar: { width: 22, height: 22, borderRadius: 999 },
  headerMascot: { width: 30, height: 30 },
  headerFavicon: { width: 28, height: 28, borderRadius: 999 },
  headerLogo: { height: 22, width: 80 },
  airplaneIconBtn: {
    width: 32,
    height: 32,
    borderRadius: 999,
    alignItems: "center",
    justifyContent: "center",
  },
  greenDot: { width: 8, height: 8, borderRadius: 4, backgroundColor: K.green },
  airplaneBtn: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 999,
  },
  airplaneText: { color: K.navy, fontSize: 11, fontWeight: "800" },
  gearBtn: {
    width: 32,
    height: 32,
    borderRadius: 999,
    backgroundColor: K.white,
    alignItems: "center",
    justifyContent: "center",
  },
  stepRow: {
    flexDirection: "row",
    paddingHorizontal: 20,
    marginTop: 4,
    gap: 6,
  },
  stepDot: {
    flex: 1,
    height: 6,
    borderRadius: 999,
  },
  eyebrow: {
    paddingHorizontal: 20,
    marginTop: 8,
    fontSize: 10,
    fontWeight: "700",
    letterSpacing: 1.8,
    textTransform: "uppercase",
    color: K.navy55,
  },
  bodyWrap: { flex: 1, position: "relative" },
  bodyContent: {
    paddingHorizontal: 20,
    paddingTop: 12,
    paddingBottom: 24,
  },
  footer: {
    paddingHorizontal: 20,
    paddingTop: 12,
    paddingBottom: 20,
    borderTopWidth: StyleSheet.hairlineWidth,
  },
  footerHome: { backgroundColor: K.pageBg, borderTopColor: K.divider },
  footerSticky: { backgroundColor: "rgba(250,252,255,0.95)", borderTopColor: K.sky },
})
