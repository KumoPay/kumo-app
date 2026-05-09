"use client"

import { useCallback, useEffect, useMemo, useState } from "react"
import { AnimatePresence, motion, type PanInfo } from "framer-motion"
import Image from "next/image"
import bs58 from "bs58"
import { useConnection, useWallet } from "@solana/wallet-adapter-react"
import { Connection, Transaction, VersionedTransaction } from "@solana/web3.js"
import type { PaymentIntent } from "@kumo/shared"

import { AppOpenSplash } from "./AppOpenSplash"
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
import {
  readStoredCluster,
  writeStoredCluster,
  type SolanaClusterId,
} from "./cluster-preference"

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

function walletBrandSrc(brand: string): string {
  switch (brand) {
    case "phantom":
      return "/wallet-phantom.png"
    case "solflare":
      return "/wallet-solflare.png"
    case "backpack":
      return "/wallet-backpack.png"
    case "glow":
      return "/wallet-glow.png"
    default:
      return "/wallet-phantom.png"
  }
}

function adapterNameForBrand(brand: string): string {
  // Adapter `wallet.adapter.name` matches these strings.
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
  const [solanaCluster, setSolanaClusterState] =
    useState<SolanaClusterId>(readStoredCluster)
  const [wallet, setWallet] = useState<WalletInfo | null>(null)
  const [showAppSplash, setShowAppSplash] = useState(false)

  // Payment flow state
  const [intentText, setIntentText] = useState("pay alice 1 usdc privately")
  const [parsedIntent, setParsedIntent] = useState<PaymentIntent | null>(null)
  const [intentHash, setIntentHash] = useState<string | null>(null)
  const [offlineSig, setOfflineSig] = useState<string | null>(null)
  const [settlement, setSettlement] = useState<PaymentSettlement | null>(null)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)

  // Real wallet adapter
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

  // Restore previous session (alias + brand). Real connection is established
  // separately via wallet-adapter `autoConnect`.
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

  // Sync wallet info to whatever wallet-adapter currently reports.
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
    setIntentText("")
    setParsedIntent(null)
    setIntentHash(null)
    setOfflineSig(null)
    setSettlement(null)
    setError(null)
    setStack(["home", "intent"])
  }, [])

  const setSolanaCluster = useCallback((id: SolanaClusterId) => {
    setSolanaClusterState(id)
    writeStoredCluster(id)
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
        // wallet-adapter wants the WalletName branded type — cast through unknown.
        select(found.adapter.name as unknown as Parameters<typeof select>[0])
        // Wait one tick for the selected wallet to propagate.
        await new Promise((r) => setTimeout(r, 30))
        await connect()
      } catch (e) {
        const msg = e instanceof Error ? e.message : String(e)
        // User cancelled the wallet popup — don't surface as error.
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
      solanaCluster,
      setSolanaCluster,
      wallet,
      beginWalletConnect,
      disconnectWallet,
      completeAliasOnboarding,
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
      solanaCluster,
      setSolanaCluster,
      wallet,
      beginWalletConnect,
      disconnectWallet,
      completeAliasOnboarding,
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

  // After successful real connect, advance from /connect → /alias or /home.
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
  const isAliasOnboarding = current === "alias"
  const isOnConnect = current === "connect"
  const isMinimalBackdrop = isOnConnect || isAliasOnboarding
  const showHeaderActions =
    wallet !== null && !isOnConnect && !isAliasOnboarding && !isHomeDashboard

  if (!bootstrapped) {
    return (
      <div
        className="min-h-[100dvh] bg-[#ede9fe]"
        aria-busy="true"
        aria-label="Loading"
      />
    )
  }

  return (
    <div
      className={["relative flex flex-col", current === "home" ? "bg-[#f9fafb]" : ""].join(" ")}
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
        {isHomeDashboard ? (
          <>
            <div className="flex min-w-0 items-center gap-2.5">
              <Image
                src="/state-00.png"
                alt=""
                width={34}
                height={34}
                className="size-[34px] shrink-0 object-contain"
                priority
              />
              <span className="font-display text-[15px] font-extrabold tracking-[0.04em] text-navy">KUMO</span>
            </div>
            <button
              type="button"
              onClick={() => push("settings")}
              aria-label="Wallet & settings"
              className="pressable inline-flex max-w-[200px] shrink-0 items-center gap-2 rounded-full border border-black/[0.05] bg-[#f6f7f9] px-[11px] py-2 shadow-[0_1px_2px_rgba(11,16,32,0.06)] outline-none ring-offset-2 focus-visible:ring-2 focus-visible:ring-[#7c5cff]"
            >
              <Image
                src={walletBrandSrc(wallet?.brand ?? "phantom")}
                alt=""
                width={44}
                height={44}
                className="size-[22px] shrink-0 rounded-full object-cover ring-[2px] ring-white"
                priority
              />
              <span className="truncate text-[13px] font-semibold capitalize tracking-tight text-[#141b2f]">
                {wallet?.label ?? ""}
              </span>
              <span className="size-2 shrink-0 rounded-full bg-[#22c58a]" aria-hidden />
            </button>
          </>
        ) : (
          <>
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
            {showHeaderActions ? (
              <div className="flex items-center gap-1.5">
                <button
                  type="button"
                  onClick={() => setAirplane(!airplane)}
                  className="pressable inline-flex items-center gap-1.5 rounded-full px-3 py-1.5 font-display font-extrabold text-[11px]"
                  style={{
                    background: airplane ? "#C7B5FF" : "#B7F1FF",
                    color: "#0B1020",
                  }}
                >
                  {airplane ? "✈ Airplane" : `● ${wallet?.label ?? ""}`}
                </button>
                <button
                  type="button"
                  onClick={() => push("settings")}
                  aria-label="Settings"
                  className="pressable inline-flex h-8 w-8 items-center justify-center rounded-full bg-white"
                  style={{
                    boxShadow: "0 1px 2px rgba(11,16,32,0.06)",
                  }}
                >
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none">
                    <circle cx="12" cy="12" r="3" stroke="#0B1020" strokeWidth="2" />
                    <path
                      d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 1 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 1 1-4 0v-.09a1.65 1.65 0 0 0-1-1.51 1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 1 1-2.83-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 1 1 0-4h.09a1.65 1.65 0 0 0 1.51-1 1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 1 1 2.83-2.83l.06.06a1.65 1.65 0 0 0 1.82.33h.01a1.65 1.65 0 0 0 1-1.51V3a2 2 0 1 1 4 0v.09a1.65 1.65 0 0 0 1 1.51h.01a1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 1 1 2.83 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82v.01a1.65 1.65 0 0 0 1.51 1H21a2 2 0 1 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1z"
                      stroke="#0B1020"
                      strokeWidth="1.6"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                    />
                  </svg>
                </button>
              </div>
            ) : null}
          </>
        )}
      </header>

      {/* Progress dots — only in pay sub-flow */}
      {inPayFlow && (
        <div className="relative z-20 flex-shrink-0 px-5 mt-1 flex items-center gap-1.5">
          {PAY_FLOW.map((id, i) => {
            const active = i === payIdx
            const done = i < payIdx
            return (
              <span
                key={id}
                className={[
                  "flex-1 h-1.5 rounded-full transition-colors duration-300",
                  active ? "bg-navy" : done ? "bg-cyan" : "bg-sky/50",
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

      {/* Scrollable body with stack-style transitions */}
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
              "absolute inset-0 overflow-y-auto px-5 pb-6 pt-3",
              current === "home" ? "bg-[#f9fafb]" : "",
            ].join(" ")}
            style={{ WebkitOverflowScrolling: "touch" }}
          >
            {slots.body}
          </motion.div>
        </AnimatePresence>
      </main>

      {/* Sticky bottom CTA — only when the screen provides one */}
      {slots.cta ? (
        <footer
          className="relative z-20 flex-shrink-0 px-5 pb-5 pt-3"
          style={
            current === "home"
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
      {showAppSplash ? <AppOpenSplash onDismiss={dismissAppSplash} /> : null}
    </div>
  )
}
