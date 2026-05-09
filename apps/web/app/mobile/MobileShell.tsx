"use client"

import { useCallback, useEffect, useMemo, useState } from "react"
import { AnimatePresence, motion, type PanInfo } from "framer-motion"
import Image from "next/image"
import bs58 from "bs58"
import { useConnection, useWallet } from "@solana/wallet-adapter-react"
import { Connection, Transaction, VersionedTransaction } from "@solana/web3.js"
import type { PaymentIntent } from "@kumo/shared"

import { AppOpenSplash } from "./AppOpenSplash"
import {
  readStoredCluster,
  writeStoredCluster,
  type SolanaClusterId,
} from "./cluster-preference"
import { MobileTabBar, type MobileTabId } from "./MobileTabBar"
import { WalletNetworkMenu } from "./WalletNetworkMenu"
import { BackButton } from "./screens/atoms"
import { Home } from "./screens/Home"
import { Contacts } from "./screens/Contacts"
import { History } from "./screens/History"
import { Receive } from "./screens/Receive"
import { Settings } from "./screens/Settings"
import { Connect } from "./screens/Connect"
import { ChooseAlias } from "./screens/ChooseAlias"
import { Intent } from "./screens/Intent"
import { Sign } from "./screens/Sign"
import { Queued } from "./screens/Queued"
import { Settled } from "./screens/Settled"
import {
  PAY_FLOW,
  type NavCtx,
  type PaymentSettlement,
  type ScreenId,
  type ScreenRenderer,
  type WalletInfo,
} from "./screens/types"
import { sanitizeKumoLocalPart, KUMO_ALIAS_MIN_LEN } from "./alias-utils"
import {
  clearMobilePersistedState,
  readAliasOnboardingComplete,
  readStoredWallet,
  writeAliasOnboardingComplete,
  writeStoredWallet,
} from "./wallet-storage"

const MAGICBLOCK_TEE_RPC =
  process.env.NEXT_PUBLIC_MAGICBLOCK_TEE_RPC ?? "https://devnet-tee.magicblock.app"

const SCREENS: Record<ScreenId, ScreenRenderer> = {
  home: Home,
  contacts: Contacts,
  history: History,
  receive: Receive,
  settings: Settings,
  connect: Connect,
  alias: ChooseAlias,
  intent: Intent,
  sign: Sign,
  queued: Queued,
  settled: Settled,
}

const slideVariants = {
  enter: (direction: 1 | -1) => ({
    x: direction === 1 ? "100%" : "-25%",
    opacity: direction === 1 ? 1 : 0.6,
  }),
  center: { x: 0, opacity: 1 },
  exit: (direction: 1 | -1) => ({
    x: direction === 1 ? "-25%" : "100%",
    opacity: direction === 1 ? 0.6 : 1,
  }),
}

const SWIPE_BACK_THRESHOLD = 80
const SWIPE_VELOCITY_THRESHOLD = 400

function adapterNameForBrand(brand: string): string {
  switch (brand) {
    case "phantom": return "Phantom"
    case "solflare": return "Solflare"
    case "backpack": return "Backpack"
    case "glow": return "Glow"
    default: return brand
  }
}

const DEMO_RECIPIENT_MAP: Record<string, string> = {
  alice: "AMBTMn1TiX3jWcGh9BUnasBq1jix3ShJyu2QTGkSZZxQ",
  bob: "Znf1az6ZwwszgKHBTxvGQRcZaULmUMXSCkgRQhtrdQy",
  carol: "9dVFGHp5AEkan51Q6PVDxRn4tQByrwUdwkmtwkUsCi43",
}

async function sha256Hex(text: string): Promise<string> {
  const buf = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(text))
  return Array.from(new Uint8Array(buf))
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("")
}

export function MobileShell() {
  const [bootstrapped, setBootstrapped] = useState(false)
  const [stack, setStack] = useState<ScreenId[]>(["connect"])
  const [direction, setDirection] = useState<1 | -1>(1)
  const [airplane, setAirplane] = useState(false)
  const [wallet, setWallet] = useState<WalletInfo | null>(null)
  const [showAppSplash, setShowAppSplash] = useState(false)
  const [solanaCluster, setSolanaClusterState] = useState<SolanaClusterId>("devnet")

  const [intentText, setIntentText] = useState("pay alice 1 usdc privately")
  const [parsedIntent, setParsedIntent] = useState<PaymentIntent | null>(null)
  const [intentHash, setIntentHash] = useState<string | null>(null)
  const [offlineSig, setOfflineSig] = useState<string | null>(null)
  const [settlement, setSettlement] = useState<PaymentSettlement | null>(null)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const { connection } = useConnection()
  const adapter = useWallet()
  const {
    publicKey,
    connected,
    wallet: activeWallet,
    select,
    connect,
    disconnect,
    signMessage,
    signTransaction,
    wallets,
  } = adapter

  useEffect(() => {
    setSolanaClusterState(readStoredCluster())
  }, [])

  const setSolanaCluster = useCallback((id: SolanaClusterId) => {
    writeStoredCluster(id)
    setSolanaClusterState(id)
  }, [])

  useEffect(() => {
    const w = readStoredWallet()
    if (w) {
      setWallet(w)
      if (!readAliasOnboardingComplete()) {
        setStack(["alias"])
      } else {
        setStack(["home"])
        setShowAppSplash(true)
      }
    }
    setBootstrapped(true)
  }, [])

  useEffect(() => {
    if (!connected || !publicKey || !activeWallet) return
    const adapterName = activeWallet.adapter.name
    const brand =
      adapterName.toLowerCase().includes("phantom") ? "phantom" :
      adapterName.toLowerCase().includes("solflare") ? "solflare" :
      adapterName.toLowerCase().includes("backpack") ? "backpack" :
      adapterName.toLowerCase().includes("glow") ? "glow" :
      adapterName.toLowerCase()
    setWallet((prev) => {
      const next: WalletInfo = {
        id: brand,
        label: adapterName,
        brand,
        initial: adapterName.charAt(0).toUpperCase(),
        pubkey: publicKey.toBase58(),
        displayName: prev?.displayName ?? "",
      }
      writeStoredWallet(next)
      return next
    })
  }, [connected, publicKey, activeWallet])

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

  const completeAliasOnboarding = useCallback((localHandle: string) => {
    const slug = sanitizeKumoLocalPart(localHandle)
    if (slug.length < KUMO_ALIAS_MIN_LEN) return
    setWallet((prev) => {
      if (!prev) return prev
      const next = { ...prev, displayName: slug }
      writeStoredWallet(next)
      return next
    })
    writeAliasOnboardingComplete()
    setDirection(1)
    setStack(["home"])
    setShowAppSplash(true)
  }, [])

  const beginWalletConnect = useCallback(
    async (brand: string) => {
      setError(null)
      setBusy(true)
      try {
        const adapterName = adapterNameForBrand(brand)
        const found = wallets.find(
          (w) => w.adapter.name.toLowerCase() === adapterName.toLowerCase(),
        )
        if (!found) {
          throw new Error(
            `${adapterName} isn't installed. Install it from the store and try again.`,
          )
        }
        select(found.adapter.name as unknown as Parameters<typeof select>[0])
        await new Promise((r) => setTimeout(r, 30))
        await connect()
      } catch (e) {
        const msg = e instanceof Error ? e.message : String(e)
        if (!/user rejected|reject|user cancelled/i.test(msg)) {
          setError(msg)
        }
      } finally {
        setBusy(false)
      }
    },
    [wallets, select, connect],
  )

  const disconnectWallet = useCallback(() => {
    void disconnect().catch(() => {})
    clearMobilePersistedState()
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
      const r = await fetch("/api/parse-intent", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ text: intentText.trim() }),
      })
      const j = await r.json()
      if (!j.ok) throw new Error(j.error)
      const intent = j.intent as PaymentIntent
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
  }, [intentText])

  const signOffline = useCallback(async () => {
    if (!parsedIntent || !intentHash || !signMessage) {
      setError("Wallet does not support signMessage. Try Phantom or Solflare.")
      return
    }
    setError(null)
    setBusy(true)
    try {
      const message = new TextEncoder().encode(`Kumo offline intent: ${intentHash}`)
      const sig = await signMessage(message)
      setOfflineSig(bs58.encode(sig))
      setDirection(1)
      setStack((s) => [...s, "queued"])
    } catch (e) {
      const msg = e instanceof Error ? e.message : String(e)
      if (!/user rejected|reject|user cancelled/i.test(msg)) {
        setError(msg)
      }
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
      const recipientName = parsedIntent.recipient.toLowerCase().trim()
      const recipientPubkey = DEMO_RECIPIENT_MAP[recipientName] ?? parsedIntent.recipient.trim()

      const r = await fetch("/api/build-private-transfer", {
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
      setSettlement({
        signature,
        validator: j.validator,
        sendTo: j.send_to,
      })
      setAirplane(false)
      setDirection(1)
      setStack((s) => [...s, "settled"])
    } catch (e) {
      const msg = e instanceof Error ? e.message : String(e)
      if (!/user rejected|reject|user cancelled/i.test(msg)) {
        setError(msg)
      }
    } finally {
      setBusy(false)
    }
  }, [parsedIntent, publicKey, signTransaction, connection])

  const ctx: NavCtx = useMemo(
    () => ({
      push,
      back,
      resetHome,
      goToNewPayment,
      airplane,
      setAirplane,
      wallet,
      beginWalletConnect,
      disconnectWallet,
      completeAliasOnboarding,
      solanaCluster,
      setSolanaCluster,
      intentText,
      setIntentText,
      parsedIntent,
      intentHash,
      offlineSig,
      settlement,
      busy,
      error,
      parseIntent,
      signOffline,
      broadcast,
    }),
    [
      push,
      back,
      resetHome,
      goToNewPayment,
      airplane,
      wallet,
      beginWalletConnect,
      disconnectWallet,
      completeAliasOnboarding,
      solanaCluster,
      setSolanaCluster,
      intentText,
      parsedIntent,
      intentHash,
      offlineSig,
      settlement,
      busy,
      error,
      parseIntent,
      signOffline,
      broadcast,
    ],
  )

  const dismissAppSplash = useCallback(() => {
    setShowAppSplash(false)
  }, [])

  useEffect(() => {
    if (!connected || !publicKey || !wallet) return
    if (stack[stack.length - 1] !== "connect") return
    setDirection(1)
    if (!readAliasOnboardingComplete()) {
      setStack(["alias"])
    } else {
      setStack(["home"])
      setShowAppSplash(true)
    }
  }, [connected, publicKey, wallet, stack])

  const slots = SCREENS[current](ctx)

  const handleDragEnd = (_e: unknown, info: PanInfo) => {
    if (!canGoBack) return
    const releasedRight =
      info.offset.x > SWIPE_BACK_THRESHOLD ||
      info.velocity.x > SWIPE_VELOCITY_THRESHOLD
    if (releasedRight) back()
  }

  const inPayFlow = PAY_FLOW.includes(current)
  const payIdx = PAY_FLOW.indexOf(current)
  const isHomeDashboard = current === "home" && !canGoBack
  const showSettingsHeader = wallet && current === "settings" && canGoBack
  const showHomeBrandHeader =
    wallet &&
    ((current === "home" && !canGoBack) ||
      (stack.length === 2 &&
        stack[0] === "home" &&
        ["contacts", "history", "receive"].includes(current)))
  const useBrandedPayHeader = wallet && (current === "sign" || current === "queued")
  const isAliasOnboarding = current === "alias"
  const isOnConnect = current === "connect"
  const isMinimalBackdrop = isOnConnect || isAliasOnboarding
  const showHeaderActions =
    wallet !== null && !isOnConnect && !isAliasOnboarding && !isHomeDashboard

  const showMainTabBar = Boolean(
    wallet && !isOnConnect && !isAliasOnboarding && !inPayFlow,
  )

  const activeTab: MobileTabId = useMemo(() => {
    if (current === "contacts") return "contactos"
    if (current === "settings") return "ajustes"
    if (current === "history") return "historial"
    if (PAY_FLOW.includes(current)) return "inicio"
    return "inicio"
  }, [current])

  const onTabInicio = useCallback(() => {
    resetHome()
  }, [resetHome])

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
    return (
      <div
        className="min-h-[100dvh] bg-[#ede9fe]"
        aria-busy="true"
        aria-label="Loading"
      />
    )
  }

  const shellTintBg =
    current === "home" ||
    (showMainTabBar &&
      ["home", "history", "receive", "contacts", "settings"].includes(current))

  return (
    <div
      className={["relative flex flex-col", shellTintBg ? "bg-[#f9fafb]" : ""].join(" ")}
      style={{ height: "100dvh", overflow: "hidden" }}
    >
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0 overflow-hidden"
      >
        <div
          className={`absolute top-20 -right-16 h-64 w-64 rounded-full bg-lilac blur-3xl ${isHomeDashboard ? "opacity-0" : isMinimalBackdrop ? "opacity-10" : "opacity-25"}`}
        />
        <div
          className={`absolute bottom-32 left-0 h-72 w-72 rounded-full bg-cyan blur-3xl ${isHomeDashboard ? "opacity-0" : isMinimalBackdrop ? "opacity-[0.08]" : "opacity-20"}`}
        />
      </div>

      <header className="relative z-20 flex flex-shrink-0 items-center justify-between gap-3 px-5 pb-2 pt-3">
        {showSettingsHeader ? (
          <div className="relative flex min-h-9 w-full min-w-0 items-center justify-center">
            <div className="absolute left-0 top-1/2 z-10 -translate-y-1/2">
              <BackButton onClick={back} />
            </div>
            <div className="flex items-center justify-center gap-0.5">
              <Image
                src="/favicon-32.png"
                alt=""
                width={32}
                height={32}
                className="size-8 shrink-0 rounded-full object-cover ring-1 ring-black/[0.06]"
                priority
              />
              <Image
                src="/logo-primary-02.png"
                alt="KUMO"
                width={480}
                height={120}
                className="h-[28px] w-auto max-w-[min(156px,48vw)] shrink-0 object-contain object-center"
                priority
              />
            </div>
          </div>
        ) : showHomeBrandHeader && wallet ? (
          <div className="flex w-full min-w-0 items-center justify-between gap-2">
            <div className="flex min-w-0 flex-1 items-center gap-0.5">
              <Image
                src="/favicon-32.png"
                alt=""
                width={32}
                height={32}
                className="size-8 shrink-0 rounded-full object-cover ring-1 ring-black/[0.06]"
                priority
              />
              <Image
                src="/logo-primary-02.png"
                alt="KUMO"
                width={480}
                height={120}
                className="h-[28px] w-auto max-w-[min(156px,48vw)] shrink-0 object-contain object-left"
                priority
              />
            </div>
            <WalletNetworkMenu
              wallet={wallet}
              cluster={solanaCluster}
              onClusterChange={setSolanaCluster}
            />
          </div>
        ) : current === "settled" && wallet ? (
          <div className="flex w-full min-w-0 items-center justify-between gap-2">
            <div className="flex min-w-0 flex-1 items-center gap-0.5">
              <Image
                src="/favicon-32.png"
                alt=""
                width={32}
                height={32}
                className="size-8 shrink-0 rounded-full object-cover ring-1 ring-black/[0.06]"
                priority
              />
              <Image
                src="/logo-primary-02.png"
                alt="KUMO"
                width={480}
                height={120}
                className="h-[28px] w-auto max-w-[min(156px,48vw)] shrink-0 object-contain object-left"
                priority
              />
            </div>
            <WalletNetworkMenu
              wallet={wallet}
              cluster={solanaCluster}
              onClusterChange={setSolanaCluster}
            />
          </div>
        ) : useBrandedPayHeader && wallet ? (
          <div className="flex w-full min-w-0 items-center justify-between gap-2">
            <div className="flex min-w-0 flex-1 items-center gap-0.5">
              <Image
                src="/favicon-32.png"
                alt=""
                width={32}
                height={32}
                className="size-8 shrink-0 rounded-full object-cover ring-1 ring-black/[0.06]"
                priority
              />
              <Image
                src="/logo-primary-02.png"
                alt="KUMO"
                width={480}
                height={120}
                className="h-[28px] w-auto max-w-[min(156px,48vw)] shrink-0 object-contain object-left"
                priority
              />
            </div>
            <div className="flex shrink-0 items-center gap-1.5">
              <WalletNetworkMenu
                wallet={wallet}
                cluster={solanaCluster}
                onClusterChange={setSolanaCluster}
              />
              <button
                type="button"
                onClick={() => setAirplane(!airplane)}
                aria-pressed={airplane}
                aria-label={airplane ? "Turn off airplane mode" : "Turn on airplane mode"}
                className={[
                  "pressable inline-flex h-8 w-8 shrink-0 items-center justify-center rounded-full",
                  airplane
                    ? "bg-[#C7B5FF] text-[#0B1020]"
                    : "bg-white text-[#0B1020]",
                ].join(" ")}
                style={{
                  boxShadow: "0 1px 2px rgba(11,16,32,0.06)",
                }}
              >
                <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor" aria-hidden>
                  <path d="M21 16v-2l-8-5V3.5c0-.83-.67-1.5-1.5-1.5S10 2.67 10 3.5V9l-8 5v2l8-2.5V19l-2 1.5V22l3.5-1 3.5 1v-1.5L13 19v-5.5l8 2.5z" />
                </svg>
              </button>
            </div>
          </div>
        ) : showHeaderActions && wallet ? (
          <div className="flex w-full min-w-0 items-center justify-between gap-2">
            <div className="flex min-w-0 flex-1 items-center gap-2">
              {canGoBack ? <BackButton onClick={back} /> : null}
              <span
                className={[
                  "min-w-0 truncate font-display font-extrabold tracking-[-0.02em] text-navy",
                  isOnConnect ? "text-[15px]" : "text-[18px]",
                ].join(" ")}
              >
                {isOnConnect ? "KUMO" : "Kumo"}
              </span>
            </div>
            <div className="flex shrink-0 items-center gap-1.5">
              <WalletNetworkMenu
                wallet={wallet}
                cluster={solanaCluster}
                onClusterChange={setSolanaCluster}
              />
              <button
                type="button"
                onClick={() => setAirplane(!airplane)}
                aria-pressed={airplane}
                aria-label={airplane ? "Turn off airplane mode" : "Turn on airplane mode"}
                className={[
                  "pressable inline-flex h-8 w-8 shrink-0 items-center justify-center rounded-full",
                  airplane
                    ? "bg-[#C7B5FF] text-[#0B1020]"
                    : "bg-white text-[#0B1020]",
                ].join(" ")}
                style={{
                  boxShadow: "0 1px 2px rgba(11,16,32,0.06)",
                }}
              >
                <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor" aria-hidden>
                  <path d="M21 16v-2l-8-5V3.5c0-.83-.67-1.5-1.5-1.5S10 2.67 10 3.5V9l-8 5v2l8-2.5V19l-2 1.5V22l3.5-1 3.5 1v-1.5L13 19v-5.5l8 2.5z" />
                </svg>
              </button>
            </div>
          </div>
        ) : (
          <div className="flex min-w-0 items-center gap-2">
            {canGoBack ? <BackButton onClick={back} /> : null}
            <span
              className={[
                "font-display font-extrabold tracking-[-0.02em] text-navy",
                isOnConnect ? "text-[15px]" : "text-[18px]",
              ].join(" ")}
            >
              {isOnConnect ? "KUMO" : "Kumo"}
            </span>
          </div>
        )}
      </header>

      {(current === "intent" ||
        current === "sign" ||
        current === "queued" ||
        current === "settled") && (
        <div className="relative z-20 mt-1 flex flex-shrink-0 items-center gap-1.5 px-5">
          {PAY_FLOW.map((id, i) => {
            const active = i === payIdx
            const done = i < payIdx
            return (
              <span
                key={id}
                className={[
                  "flex-1 rounded-full transition-colors duration-300",
                  "h-1.5",
                  active
                    ? "bg-[#a78bfa]"
                    : done
                      ? "bg-[#7dd3fc]"
                      : "bg-[#e2e8f0]",
                ].join(" ")}
                aria-label={id}
              />
            )
          })}
        </div>
      )}

      {slots.eyebrow && (
        <div className="relative z-20 flex-shrink-0 px-5 mt-2 text-[10px] font-bold tracking-[0.18em] uppercase text-navy/55">
          {slots.eyebrow}
        </div>
      )}

      <main
        className="relative flex-1 min-h-0 overflow-hidden"
        style={{ touchAction: "pan-y" }}
      >
        <AnimatePresence initial={false} custom={direction}>
          <motion.div
            key={current}
            custom={direction}
            variants={slideVariants}
            initial="enter"
            animate="center"
            exit="exit"
            transition={{
              type: "spring",
              stiffness: 380,
              damping: 38,
              mass: 0.9,
            }}
            drag={canGoBack ? "x" : false}
            dragDirectionLock
            dragConstraints={{ left: 0, right: 0 }}
            dragElastic={{ left: 0, right: 0.45 }}
            onDragEnd={handleDragEnd}
            className={[
              "absolute inset-0 overflow-y-auto px-5 pt-3",
              current === "queued" || current === "settled" ? "pb-4" : "pb-6",
              shellTintBg ? "bg-[#f9fafb]" : "",
            ].join(" ")}
            style={{ WebkitOverflowScrolling: "touch" }}
          >
            {slots.body}
          </motion.div>
        </AnimatePresence>
      </main>

      {slots.cta ? (
        <footer
          className={[
            "relative z-20 flex-shrink-0 px-5",
            current === "queued" || current === "settled" ? "pb-3 pt-2" : "pb-5 pt-3",
          ].join(" ")}
          style={
            shellTintBg
              ? {
                  background: "#f9fafb",
                  borderTop: "1px solid #eef0f3",
                }
              : {
                  background: "rgba(250,252,255,0.92)",
                  backdropFilter: "blur(8px) saturate(140%)",
                  WebkitBackdropFilter: "blur(8px) saturate(140%)",
                  borderTop: "0.5px solid rgba(183,241,255,1)",
                }
          }
        >
          {slots.cta}
        </footer>
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
      {showAppSplash ? <AppOpenSplash onDismiss={dismissAppSplash} /> : null}
    </div>
  )
}
