import { useCallback, useEffect, useMemo, useState } from "react"
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
import { appendHistory } from "./history-store"
import { isLocalAIEnabled, isModelDownloaded, parseIntentLocal } from "../lib/qvac-local"
import { parseIntentRegex } from "../lib/regex-parser"
import { authenticateForAction, requireForSign } from "../lib/biometric"
import { useConnection } from "../hooks/use-connection"
import { useWalletAdapter } from "../hooks/use-wallet-adapter"
import { KUMO_API_BASE_URL, MAGICBLOCK_TEE_RPC } from "../lib/config"

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
  const [airplane, setAirplane] = useState(false)
  const [privacyDefault, setPrivacyDefault] = useState(true)
  const [wallet, setWallet] = useState<WalletInfo | null>(null)
  const [showAppSplash, setShowAppSplash] = useState(false)

  const [intentText, setIntentText] = useState("pay alice 1 usdc privately")
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
          const r = await fetch(`${KUMO_API_BASE_URL}/api/parse-intent`, {
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
          "I couldn't understand that. Try: 'pay alice 1 usdc privately' or 'send 5 to bob'.",
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
    if (!parsedIntent || !intentHash || !signMessage) {
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
      const message = new TextEncoder().encode(`Kumo offline intent: ${intentHash}`)
      const sig = await signMessage(message)
      setOfflineSig(bs58.encode(sig))
      setDirection(1)
      setStack((s) => [...s, "queued"])
    } catch (e) {
      const msg = e instanceof Error ? e.message : String(e)
      if (!/cancel|reject/i.test(msg)) setError(msg)
    } finally {
      setBusy(false)
    }
  }, [parsedIntent, intentHash, signMessage])

  const broadcast = useCallback(async () => {
    if (!parsedIntent || !publicKey || !signTransaction) {
      setError("Wallet does not support signTransaction.")
      return
    }
    setError(null)
    setBusy(true)
    try {
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
      const r = await fetch(`${KUMO_API_BASE_URL}/api/build-private-transfer`, {
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
      // Persist to local history so it shows up on Home/History without needing on-chain re-fetch.
      void appendHistory({
        direction: "out",
        counterparty: parsedIntent.recipient,
        amount: parsedIntent.amount_usdc,
        signature,
        status: "delivered",
        sendTo: j.send_to,
        validator: j.validator,
      })
      setAirplane(false)
      setDirection(1)
      setStack((s) => [...s, "settled"])
    } catch (e) {
      const msg = e instanceof Error ? e.message : String(e)
      if (!/cancel|reject/i.test(msg)) setError(msg)
    } finally {
      setBusy(false)
    }
  }, [parsedIntent, publicKey, signTransaction, connection])

  const ctx: NavCtx = useMemo(
    () => ({
      push, back, resetHome, goToNewPayment, airplane, setAirplane,
      privacyDefault, setPrivacyDefault,
      wallet, beginWalletConnect, disconnectWallet, completeAliasOnboarding,
      intentText, setIntentText, parsedIntent, intentHash, offlineSig, settlement,
      busy, error, parseIntent, signOffline, broadcast,
    }),
    [
      push, back, resetHome, goToNewPayment, airplane, privacyDefault,
      wallet, beginWalletConnect, disconnectWallet, completeAliasOnboarding,
      intentText, parsedIntent, intentHash, offlineSig, settlement,
      busy, error, parseIntent, signOffline, broadcast,
    ],
  )

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
