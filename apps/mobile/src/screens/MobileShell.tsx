import { useCallback, useEffect, useMemo, useRef, useState } from "react"
import {
  ActivityIndicator,
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

import { K, SHADOW } from "./theme"
import { BackButton } from "./atoms"
import { ASSETS, walletLogoFor as walletLogoForBrand } from "./assets"
import { Connect } from "./Connect"
import { ChooseAlias } from "./ChooseAlias"
import { Home } from "./Home"
import { Intent } from "./Intent"
import { Sign } from "./Sign"
import { Queued } from "./Queued"
import { Settled } from "./Settled"
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
import { getNonceSetup } from "../lib/durable-nonce"
import { buildPublicTransferWithNonce } from "../lib/offline-build"
import { isLocalAIEnabled, isModelDownloaded, parseIntentLocal } from "../lib/qvac-local"
import { parseIntentRegex } from "../lib/regex-parser"
import { authenticateForAction, requireForSign } from "../lib/biometric"
import { useConnection } from "../hooks/use-connection"
import { useNetwork } from "../hooks/use-network"
import { useWalletAdapter } from "../hooks/use-wallet-adapter"
import { MAGICBLOCK_TEE_RPC } from "../lib/config"
import { getApiBaseUrl } from "../lib/runtime-config"

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
  intent: Intent,
  sign: Sign,
  queued: Queued,
  settled: Settled,
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

  const { connection } = useConnection()
  const adapter = useWalletAdapter()
  const { publicKey, connected, label, connect, disconnect, signMessage, signTransaction } = adapter

  // Bootstrap: read persisted wallet (alias only — fresh MWA auth happens on connect tap).
  useEffect(() => {
    void (async () => {
      const w = await readStoredWallet()
      if (w) {
        setWallet(w)
      }
      setBootstrapped(true)
    })()
  }, [])

  // After real MWA connect succeeds, sync wallet info + persist + advance.
  useEffect(() => {
    if (!connected || !publicKey) return
    setWallet((prev) => {
      const id = "mobile"
      const next: WalletInfo = {
        id,
        label: label || "Mobile wallet",
        brand: id,
        initial: (label || "M").charAt(0).toUpperCase(),
        pubkey: publicKey.toBase58(),
        displayName: prev?.displayName ?? "",
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
        } else {
          setStack(["home"])
          setShowAppSplash(true)
        }
      })()
    }
  }, [connected, publicKey, label, stack])

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
    setStack(["home", "intent"])
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
    try {
      const text = intentText.trim()
      let intent: PaymentIntent | null = null

      // Tier 1: on-device LLM (if user enabled it AND model is downloaded).
      const useLocal = (await isLocalAIEnabled()) && (await isModelDownloaded())
      if (useLocal) {
        try {
          intent = await parseIntentLocal(text)
        } catch (e) {
          console.warn("local parse failed, falling through:", e)
        }
      }

      // Tier 2: cloud QVAC server.
      if (!intent) {
        try {
          const r = await fetch(`${await getApiBaseUrl()}/api/parse-intent`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ text }),
          })
          const j = await r.json()
          if (j.ok) intent = j.intent as PaymentIntent
          else console.warn("cloud parse failed, falling through:", j.error)
        } catch (e) {
          console.warn("cloud parse network error, falling through:", e)
        }
      }

      // Tier 3: regex parser — last-resort, deterministic, no internet/model needed.
      if (!intent) {
        intent = parseIntentRegex(text)
      }

      if (!intent) {
        throw new Error(
          "I couldn't understand that. Try: 'pay <contact> 5 usdc privately' or paste a Solana address.",
        )
      }

      // The intent's `private` field is now decided by the UI toggle, not just the wording.
      // The toggle's default is `true` (MagicBlock private). User can flip to public anytime.
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
    }
  }, [intentText, privacyDefault])

  const signOffline = useCallback(async () => {
    if (!parsedIntent || !intentHash || !signMessage || !publicKey) {
      setError("Wallet does not support signMessage.")
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
      if (!network.online) {
        const setup = await getNonceSetup()
        if (!setup?.cached?.value) {
          throw new Error(
            "You're offline and offline payments aren't set up yet. Reconnect to set up, or try again online.",
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
      })
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
    setError(null)
    setBusy(true)
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
        const signature = await conn.sendRawTransaction(preSigned.tx)
        setSettlement({ signature, sendTo: preSigned.sendTo })
        const entry = await appendHistory({
          direction: "out",
          counterparty: parsedIntent.recipient,
          amount: parsedIntent.amount_usdc,
          signature,
          status: "queued",
          sendTo: preSigned.sendTo,
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
      const r = await fetch(`${await getApiBaseUrl()}/api/build-private-transfer`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          intent: parsedIntent,
          recipientPubkey,
          userPubkey: publicKey.toBase58(),
        }),
      })
      const j = await r.json()
      if (!j.ok) throw new Error(j.error)
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
    }
  }, [parsedIntent, publicKey, signTransaction, connection, network.online, setAirplane, intentHash])

  const ctx: NavCtx = useMemo(
    () => ({
      push, back, resetHome, goToNewPayment, airplane, setAirplane,
      privacyDefault, setPrivacyDefault,
      wallet, beginWalletConnect, disconnectWallet, completeAliasOnboarding,
      intentText, setIntentText, parsedIntent, intentHash, offlineSig, settlement,
      busy, error, parseIntent, signOffline, broadcast,
      signTransactionRaw: signTransaction,
    }),
    [
      push, back, resetHome, goToNewPayment, airplane, privacyDefault,
      wallet, beginWalletConnect, disconnectWallet, completeAliasOnboarding,
      intentText, parsedIntent, intentHash, offlineSig, settlement,
      busy, error, parseIntent, signOffline, broadcast,
      signTransaction,
    ],
  )

  // Auto-broadcast: when network flips false → true and we have pre-signed
  // intents queued, drain them in the background. Updates history live via the
  // confirmation poller; user sees status pill flip from pending → delivered.
  const wasOnlineRef = useRef(network.online)
  useEffect(() => {
    const wasOnline = wasOnlineRef.current
    wasOnlineRef.current = network.online
    if (wasOnline || !network.online || !publicKey) return
    void (async () => {
      const queue = await listQueue()
      const mine = queue.filter(
        (q) => q.signedTxBase64 && q.signerPubkey === publicKey.toBase58(),
      )
      for (const q of mine) {
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
          void awaitConfirmation({ signature, sendTo: q.sendTo ?? "base" }).then((res) => {
            if (res.ok) void updateHistoryStatus(entry.id, { status: "delivered" })
            else
              void updateHistoryStatus(entry.id, {
                status: "failed",
                failureReason: res.error,
              })
          })
        } catch (e) {
          console.warn("auto-broadcast failed for", q.id, e)
          // Leave in queue so the user can retry manually from the Queued screen.
        }
      }
    })()
  }, [network.online, publicKey, connection])

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
                  active ? { backgroundColor: K.navy } : done ? { backgroundColor: K.cyan } : { backgroundColor: K.sky50 },
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
