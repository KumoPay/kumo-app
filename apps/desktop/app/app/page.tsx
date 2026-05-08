"use client"

import { useEffect, useState, type ReactNode } from "react"
import Link from "next/link"
import { useConnection, useWallet } from "@solana/wallet-adapter-react"
import { WalletModalButton } from "@solana/wallet-adapter-react-ui"
import { Connection, Transaction, VersionedTransaction } from "@solana/web3.js"
import bs58 from "bs58"
import { KumoMascot } from "@/components/kumo-mascot"
import type { PaymentIntent } from "@kumo/shared"
import { MobileFlow } from "./MobileFlow"
import {
  allContacts,
  displayName,
  loadContacts,
  resolveRecipient,
  saveContact,
  type ContactMap,
} from "@/lib/contacts"

type ScreenId = "connect" | "intent" | "sign" | "queued" | "settled"

const FLOW_SCREENS: Array<{ id: ScreenId; step: string; label: string }> = [
  { id: "connect", step: "01", label: "Connect" },
  { id: "intent", step: "02", label: "Intent" },
  { id: "sign", step: "03", label: "Sign offline" },
  { id: "queued", step: "04", label: "Queued" },
  { id: "settled", step: "05", label: "Delivered" },
]

// Recipient resolution is centralized in lib/contacts.ts (async because of SNS).

type Settlement = { signature: string; sessionId: string }

export default function RealAppPage() {
  const { connection } = useConnection()
  const { publicKey, connected, signMessage, signTransaction, wallet, disconnect } = useWallet()

  const [idx, setIdx] = useState(0)
  const [airplane, setAirplane] = useState(false)
  const [intent, setIntent] = useState<PaymentIntent | null>(null)
  const [intentHash, setIntentHash] = useState<string | null>(null)
  const [offlineSig, setOfflineSig] = useState<string | null>(null)
  const [settlement, setSettlement] = useState<Settlement | null>(null)
  const [errorMsg, setErrorMsg] = useState<string | null>(null)
  const [busy, setBusy] = useState(false)
  const [text, setText] = useState("pay alice 1 usdc privately")
  const [contacts, setContacts] = useState<ContactMap>({})
  const [lastRecipient, setLastRecipient] = useState<{ name: string; pubkey: string; via: string } | null>(null)
  const [mounted, setMounted] = useState(false)

  // Track when we're past hydration. Until then we treat the wallet as
  // disconnected so the SSR snapshot and the first client render agree.
  useEffect(() => {
    setMounted(true)
  }, [])

  // Load saved contacts from localStorage on mount (and when settlement saves a new one)
  useEffect(() => {
    setContacts(allContacts())
  }, [settlement])

  // Wallet values are unstable across SSR/CSR (autoConnect kicks in fast on the client).
  // Use null/false during the first render to match the server, then swap in real values.
  const safeWallet = mounted ? wallet : null
  const safePubkey = mounted ? publicKey : null
  const safeConnected = mounted && connected

  useEffect(() => {
    if (connected && idx === 0) setIdx(1)
  }, [connected, idx])

  useEffect(() => {
    if (FLOW_SCREENS[idx].id === "queued") setAirplane(true)
    if (FLOW_SCREENS[idx].id === "settled") setAirplane(false)
  }, [idx])

  // Fresh entry to /app: reset flow state (wallet connection persists via autoConnect).
  // Runs once per mount of this client component. If you stay connected we'll auto-advance
  // to step 1 via the effect above.
  // eslint-disable-next-line react-hooks/exhaustive-deps
  useEffect(() => {
    setIntent(null)
    setIntentHash(null)
    setOfflineSig(null)
    setSettlement(null)
    setErrorMsg(null)
    setAirplane(false)
    setText("pay alice 1 usdc privately")
    setIdx(0)
  }, [])

  const screen = FLOW_SCREENS[idx]

  async function callParse(text: string) {
    setErrorMsg(null)
    setBusy(true)
    try {
      const r = await fetch("/api/parse-intent", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ text }),
      })
      const j = await r.json()
      if (!j.ok) throw new Error(j.error)
      setIntent(j.intent)
      const canonical = JSON.stringify({
        recipient: j.intent.recipient,
        amount_usdc: j.intent.amount_usdc,
        private: j.intent.private,
        memo: j.intent.memo ?? "",
      })
      const buf = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(canonical))
      const hex = Array.from(new Uint8Array(buf))
        .map((b) => b.toString(16).padStart(2, "0"))
        .join("")
      setIntentHash(hex)
      setIdx(2)
    } catch (e) {
      setErrorMsg(e instanceof Error ? e.message : "parse failed")
    } finally {
      setBusy(false)
    }
  }

  async function callSignOffline() {
    if (!intent || !intentHash || !signMessage) {
      setErrorMsg("Wallet does not support signMessage. Try Phantom or Solflare.")
      return
    }
    setErrorMsg(null)
    setBusy(true)
    try {
      const message = new TextEncoder().encode(`Kumo offline intent: ${intentHash}`)
      const sig = await signMessage(message)
      setOfflineSig(bs58.encode(sig))
      setIdx(3)
    } catch (e) {
      setErrorMsg(e instanceof Error ? e.message : "sign cancelled")
    } finally {
      setBusy(false)
    }
  }

  async function callBroadcast() {
    if (!intent || !publicKey || !signTransaction) {
      setErrorMsg("Wallet does not support signTransaction.")
      return
    }
    setErrorMsg(null)
    setBusy(true)
    const resolved = await resolveRecipient(intent.recipient, connection)
    if (!resolved.ok) {
      setErrorMsg(resolved.reason)
      setBusy(false)
      return
    }
    const recipientPubkey = resolved.pubkey
    setLastRecipient({ name: intent.recipient, pubkey: recipientPubkey, via: resolved.via })
    try {
      const r = await fetch("/api/build-private-transfer", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          intent,
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
          ? new Connection(
              `${process.env.NEXT_PUBLIC_MAGICBLOCK_TEE_RPC ?? "https://devnet-tee.magicblock.app"}`,
              "confirmed",
            )
          : connection

      const signature = await conn.sendRawTransaction(signed.serialize())
      setSettlement({ signature, sessionId: j.validator ?? "no-validator" })
      setAirplane(false)
      setIdx(4)
    } catch (e) {
      setErrorMsg(e instanceof Error ? e.message : "broadcast failed")
    } finally {
      setBusy(false)
    }
  }

  function reset() {
    setIntent(null)
    setIntentHash(null)
    setOfflineSig(null)
    setSettlement(null)
    setErrorMsg(null)
    setAirplane(false)
    setIdx(connected ? 1 : 0)
  }

  async function switchWallet() {
    setIntent(null)
    setIntentHash(null)
    setOfflineSig(null)
    setSettlement(null)
    setErrorMsg(null)
    setAirplane(false)
    setIdx(0)
    try {
      await disconnect()
    } catch {
      /* swallow — user-cancellable, not an error worth surfacing */
    }
  }

  function onSaveContact(name: string, pubkey: string) {
    saveContact(name, pubkey)
    setContacts(allContacts())
    setLastRecipient(null)
  }

  const props: ScreenProps = {
    airplane, setAirplane,
    intent, intentHash, offlineSig, settlement,
    busy, errorMsg,
    walletLabel: safeWallet?.adapter.name ?? "wallet",
    walletPubkey: safePubkey?.toBase58() ?? null,
    connected: safeConnected,
    text, setText,
    contacts, lastRecipient,
    onSaveContact,
    onParse: callParse, onSignOffline: callSignOffline, onBroadcast: callBroadcast, onReset: reset,
  }

  let Body: (p: typeof props) => ReactNode
  switch (screen.id) {
    case "connect": Body = ScreenConnect; break
    case "intent": Body = ScreenIntent; break
    case "sign": Body = ScreenSign; break
    case "queued": Body = ScreenQueued; break
    case "settled": Body = ScreenSettled; break
  }

  return (
    <>
      {/* MOBILE — phone-app feel without a phone shell */}
      <MobileFlow
        idx={idx}
        setIdx={setIdx}
        airplane={airplane}
        setAirplane={setAirplane}
        intent={intent}
        intentHash={intentHash}
        offlineSig={offlineSig}
        settlement={settlement}
        busy={busy}
        errorMsg={errorMsg}
        walletLabel={safeWallet?.adapter.name ?? "wallet"}
        walletPubkey={safePubkey?.toBase58() ?? null}
        connected={safeConnected}
        text={text}
        setText={setText}
        contacts={contacts}
        lastRecipient={lastRecipient}
        onSaveContact={onSaveContact}
        onParse={callParse}
        onSignOffline={callSignOffline}
        onBroadcast={callBroadcast}
        onReset={reset}
        onSwitchWallet={switchWallet}
      />

      {/* DESKTOP — wizard layout (≥ lg) */}
      <div className="hidden lg:block min-h-screen bg-cream has-topnav relative">
      <div aria-hidden className="pointer-events-none fixed inset-0 overflow-hidden">
        <div className="absolute -top-12 -left-10 w-72 h-72 rounded-full bg-sky opacity-50 blur-3xl" />
        <div className="absolute top-40 -right-20 w-96 h-96 rounded-full bg-lilac opacity-30 blur-3xl" />
        <div className="absolute bottom-0 left-1/3 w-80 h-80 rounded-full bg-cyan opacity-30 blur-3xl" />
      </div>

      <main className="relative max-w-[1180px] mx-auto px-8 pt-10 pb-16">
        {/* Status strip across the top */}
        <div className="flex flex-wrap items-center justify-between gap-4 mb-6">
          <div>
            <div className="text-[11px] font-bold tracking-[0.18em] uppercase text-navy/50">Live demo · devnet</div>
            <h1 className="font-display font-black text-navy text-[28px] md:text-[32px] leading-tight tracking-[-0.02em] mt-1">
              Real wallet, real signatures.
            </h1>
          </div>
          <div className="flex items-center gap-3 flex-wrap">
            <NetworkPill airplane={airplane} setAirplane={setAirplane} />
            {safeConnected && safePubkey ? (
              <div className="card rounded-full px-4 py-2 softshadow-sm flex items-center gap-3">
                <span className="w-2 h-2 rounded-full bg-cyan" />
                <span className="font-display font-extrabold text-navy text-[12px]">
                  {safeWallet?.adapter.name}
                </span>
                <span className="font-mono text-[11px] text-navy/60">
                  {safePubkey.toBase58().slice(0, 5)}…{safePubkey.toBase58().slice(-4)}
                </span>
              </div>
            ) : (
              <div className="text-[12px] font-bold text-navy/55">Not connected</div>
            )}
          </div>
        </div>

        {/* Step chips — clicking back to "Connect" disconnects + resets */}
        <Stepper
          idx={idx}
          screens={FLOW_SCREENS}
          onSelect={(i) => {
            if (i === 0) {
              if (safeConnected) switchWallet()
              else setIdx(0)
            } else if (safeConnected) {
              setIdx(i)
            }
          }}
          connected={safeConnected}
        />

        {/* Main card + side notes */}
        <div className="grid lg:grid-cols-[2fr_1fr] gap-8 mt-8">
          <div className="card rounded-3xl softshadow p-8 md:p-10 min-h-[520px] relative overflow-hidden">
            <Body {...props} />
          </div>

          <SideNote screen={screen.id} />
        </div>

        {errorMsg && (
          <div className="mt-6 p-4 rounded-2xl bg-white border border-lilac/60 text-[13px] text-navy/80 leading-relaxed max-w-[680px]">
            <div className="font-bold uppercase tracking-[0.18em] text-[10px] mb-1 text-lilac">// error</div>
            {errorMsg}
          </div>
        )}

        <div className="mt-12 text-center text-[12px] text-navy/50 font-semibold">
          Looking for the visual walkthrough? <Link href="/flow" className="underline font-bold">Open /flow</Link>.
        </div>
      </main>
      </div>
    </>
  )
}

// ─────────────────────────────────────────────────────────────
// Top stepper
// ─────────────────────────────────────────────────────────────
function Stepper({
  idx,
  screens,
  onSelect,
  connected,
}: {
  idx: number
  screens: Array<{ id: ScreenId; step: string; label: string }>
  onSelect: (i: number) => void
  connected: boolean
}) {
  return (
    <div className="flex items-stretch gap-2 overflow-x-auto pb-2">
      {screens.map((s, i) => {
        const active = i === idx
        const done = i < idx
        const reachable = i === 0 || connected
        return (
          <button
            key={s.id}
            onClick={() => reachable && onSelect(i)}
            disabled={!reachable}
            className={[
              "flex-1 min-w-[140px] text-left rounded-2xl px-5 py-3 transition pressable flex items-center gap-3",
              active ? "bg-cyan softshadow" : done ? "bg-sky/40" : "bg-white softshadow-sm hover:bg-sky/30",
              !reachable ? "opacity-40 cursor-not-allowed" : "",
            ].join(" ")}
          >
            <span
              className={[
                "w-7 h-7 rounded-full flex items-center justify-center text-[12px] font-extrabold shrink-0",
                active ? "bg-navy text-cloud" : done ? "bg-cloud text-navy" : "bg-cream text-navy/60",
              ].join(" ")}
            >
              {s.step}
            </span>
            <span className="font-display font-extrabold text-navy text-[14px] leading-tight whitespace-nowrap">
              {s.label}
            </span>
          </button>
        )
      })}
    </div>
  )
}

function NetworkPill({ airplane, setAirplane }: { airplane: boolean; setAirplane: (v: boolean) => void }) {
  return (
    <button
      onClick={() => setAirplane(!airplane)}
      className="pressable inline-flex items-center gap-2 rounded-full px-4 py-2 font-display font-extrabold text-[12px]"
      style={{
        background: airplane ? "#C7B5FF" : "#B7F1FF",
        color: "#0B1020",
      }}
    >
      <span>{airplane ? "✈" : "●"}</span>
      {airplane ? "Airplane mode" : "Online"}
    </button>
  )
}

// ─────────────────────────────────────────────────────────────
// Screens (desktop)
// ─────────────────────────────────────────────────────────────
type ScreenProps = {
  airplane: boolean
  setAirplane: (v: boolean) => void
  intent: PaymentIntent | null
  intentHash: string | null
  offlineSig: string | null
  settlement: Settlement | null
  busy: boolean
  errorMsg: string | null
  walletLabel: string
  walletPubkey: string | null
  connected: boolean
  text: string
  setText: (t: string) => void
  contacts: ContactMap
  lastRecipient: { name: string; pubkey: string; via: string } | null
  onSaveContact: (name: string, pubkey: string) => void
  onParse: (text: string) => void
  onSignOffline: () => void
  onBroadcast: () => void
  onReset: () => void
}

function ScreenConnect({ connected }: ScreenProps) {
  return (
    <div className="grid md:grid-cols-[auto_1fr] gap-10 items-center">
      <div className="animate-breathe shrink-0 mx-auto md:mx-0">
        <KumoMascot size={220} expression="cheerful" waves />
      </div>
      <div>
        <div className="text-[11px] font-bold tracking-[0.18em] uppercase text-navy/50">Step 01</div>
        <h2 className="font-display font-black text-navy text-[40px] leading-tight tracking-[-0.02em] mt-1">
          Connect a real wallet.
        </h2>
        <p className="text-navy/70 text-[16px] leading-[1.6] mt-3 max-w-[540px]">
          Phantom, Solflare, or Backpack. Talks to <span className="font-bold">devnet</span> only.
          Your private keys stay in your wallet — Kumo never touches them.
        </p>
        <div className="mt-7 max-w-[360px]">
          <div className="kumo-wallet-btn">
            <WalletModalButton>{connected ? "Connected ✓" : "Connect wallet"}</WalletModalButton>
          </div>
          <div className="text-[12px] text-navy/55 mt-3 font-semibold">
            Need devnet USDC? Grab some from{" "}
            <a className="underline font-bold" href="https://faucet.circle.com" target="_blank" rel="noreferrer">
              faucet.circle.com
            </a>
            .
          </div>
        </div>
      </div>
    </div>
  )
}

function ScreenIntent({ airplane, busy, walletLabel, walletPubkey, text, setText, contacts, onParse }: ScreenProps) {
  const contactNames = Object.keys(contacts)
  return (
    <div className="grid md:grid-cols-[auto_1fr] gap-10">
      <div className="shrink-0 mx-auto md:mx-0">
        <KumoMascot size={160} expression="curious" />
      </div>
      <div className="min-w-0">
        <div className="text-[11px] font-bold tracking-[0.18em] uppercase text-navy/50">Step 02</div>
        <h2 className="font-display font-black text-navy text-[32px] leading-tight tracking-[-0.02em] mt-1">
          What payment, friend?
        </h2>
        <p className="text-navy/65 text-[14px] mt-2">
          Plain English. Kumo&apos;s on-device parser turns it into a structured intent. No cloud round-trip.
        </p>

        {walletPubkey && (
          <div className="mt-5 inline-flex items-center gap-2 bg-sky/50 px-3 py-1.5 rounded-full text-[12px] font-bold text-navy">
            <span className="w-2 h-2 rounded-full bg-cyan" />
            {walletLabel} · <span className="font-mono">{walletPubkey.slice(0, 6)}…{walletPubkey.slice(-4)}</span>
          </div>
        )}

        <textarea
          value={text}
          onChange={(e) => setText(e.target.value)}
          rows={3}
          placeholder="pay alice 1 usdc privately, or bob.sol, or paste a pubkey"
          className="w-full mt-5 p-5 rounded-2xl bg-white border-[1.5px] border-transparent outline-none resize-none text-[16px] text-navy softshadow-sm focus:border-cyan transition"
        />

        {contactNames.length > 0 && (
          <div className="mt-3">
            <div className="text-[10px] font-bold tracking-[0.18em] uppercase text-navy/50 mb-1.5">Your contacts</div>
            <div className="flex flex-wrap gap-2">
              {contactNames.map((name) => (
                <button
                  key={name}
                  type="button"
                  onClick={() => setText(`pay ${name} 1 usdc privately`)}
                  className="pressable inline-flex items-center gap-2 bg-white text-navy font-bold text-[12px] px-3 py-1.5 rounded-full"
                  style={{ boxShadow: "inset 0 0 0 1px #B7F1FF" }}
                  title={contacts[name]}
                >
                  <span className="w-1.5 h-1.5 rounded-full bg-cyan" />
                  {name}
                </button>
              ))}
            </div>
          </div>
        )}

        <div className="flex flex-wrap gap-2 mt-3">
          <Chip>🤖 qvac on-device</Chip>
          <Chip>🔒 no leaks</Chip>
          <Chip lilac>🌐 .sol resolution</Chip>
          {airplane && <Chip lilac>✈ airplane mode</Chip>}
        </div>

        <div className="mt-8 flex flex-wrap gap-3">
          <BigCTA primary onClick={() => onParse(text)} disabled={busy || !text.trim()}>
            {busy ? "Parsing…" : "Parse intent →"}
          </BigCTA>
        </div>
      </div>
    </div>
  )
}

function ScreenSign({ intent, busy, onSignOffline }: ScreenProps) {
  const recipient = intent?.recipient ?? "—"
  const amount = intent ? `$${intent.amount_usdc} USDC` : "—"
  const isPrivate = intent?.private ?? true

  return (
    <div className="grid md:grid-cols-[auto_1fr] gap-10">
      <div className="shrink-0 mx-auto md:mx-0">
        <KumoMascot size={160} expression="concentrating" />
      </div>
      <div className="min-w-0">
        <div className="text-[11px] font-bold tracking-[0.18em] uppercase text-navy/50">Step 03</div>
        <h2 className="font-display font-black text-navy text-[32px] leading-tight tracking-[-0.02em] mt-1">
          Sign your intent.
        </h2>
        <p className="text-navy/65 text-[14px] mt-2 max-w-[540px]">
          Your wallet pops up to sign the intent hash with <span className="font-mono font-bold">signMessage</span>. No
          RPC. This is what makes Kumo offline-first — the signature is generated on your device, period.
        </p>

        <div className="mt-6 grid sm:grid-cols-3 gap-4">
          <KV k="To" v={recipient} />
          <KV k="Amount" v={amount} big />
          <KV k="Privacy" v={isPrivate ? "🔒 Private" : "Public"} pillBg={isPrivate ? "#C7B5FF" : "#C4CCD8"} />
        </div>

        <div className="flex flex-wrap gap-2 mt-5">
          <Chip>💎 wallet signMessage</Chip>
          <Chip>📡 no rpc call</Chip>
          {isPrivate && <Chip lilac>🔒 confidential</Chip>}
        </div>

        <div className="mt-7 max-w-[420px]">
          <BigCTA primary onClick={onSignOffline} disabled={busy || !intent}>
            {busy ? "Awaiting signature…" : "Sign with wallet"}
          </BigCTA>
        </div>
      </div>
    </div>
  )
}

function ScreenQueued({ intent, intentHash, offlineSig, busy, onBroadcast }: ScreenProps) {
  return (
    <div className="grid md:grid-cols-[auto_1fr] gap-10 items-start">
      <div className="shrink-0 mx-auto md:mx-0">
        <KumoMascot size={170} expression="sleeping" sleepZ />
      </div>
      <div className="min-w-0">
        <div className="text-[11px] font-bold tracking-[0.18em] uppercase text-navy/50">Step 04</div>
        <h2 className="font-display font-black text-navy text-[32px] leading-tight tracking-[-0.02em] mt-1">
          Resting until you reconnect.
        </h2>
        <p className="text-navy/65 text-[14px] mt-2 max-w-[540px]">
          The intent is signed and held. Tap reconnect when you&apos;re back online — your wallet will sign the
          MagicBlock private transfer and submit it to devnet.
        </p>

        <div className="mt-6 grid sm:grid-cols-2 gap-4 max-w-[640px]">
          <KV k="Intent hash" v={intentHash ? `${intentHash.slice(0, 10)}…${intentHash.slice(-6)}` : "—"} mono />
          <KV k="Recipient" v={intent?.recipient ?? "—"} />
          <KV k="Offline signature" v={offlineSig ? `${offlineSig.slice(0, 10)}…${offlineSig.slice(-6)}` : "—"} mono />
          <KV k="Status" v="Sealed offline" pillBg="#C7B5FF" />
        </div>

        <div className="mt-7 max-w-[420px]">
          <BigCTA primary onClick={onBroadcast} disabled={busy}>
            {busy ? "Broadcasting…" : "Reconnect & broadcast →"}
          </BigCTA>
          <div className="text-[12px] text-navy/55 mt-2 font-semibold">
            Wallet popup will sign the on-chain MagicBlock tx.
          </div>
        </div>
      </div>
    </div>
  )
}

function ScreenSettled({ intent, settlement, lastRecipient, onSaveContact, onReset }: ScreenProps) {
  const sig = settlement?.signature
  const sigShort = sig ? `${sig.slice(0, 10)}…${sig.slice(-8)}` : "—"
  const showSavePrompt = lastRecipient?.via === "raw" || lastRecipient?.via === "sns"
  return (
    <div className="grid md:grid-cols-[auto_1fr] gap-10 items-start">
      <div className="shrink-0 mx-auto md:mx-0">
        <KumoMascot size={170} expression="celebrating" sparkles />
      </div>
      <div className="min-w-0">
        <div className="text-[11px] font-bold tracking-[0.18em] uppercase text-navy/50">Step 05</div>
        <h2 className="font-display font-black text-navy text-[36px] leading-tight tracking-[-0.02em] mt-1">
          Delivered. ✨
        </h2>
        <p className="text-navy/65 text-[14px] mt-2 max-w-[540px]">
          On-chain on devnet via MagicBlock. The public chain saw a heartbeat — amount and recipient stay
          sealed in the rollup.
        </p>

        <div className="mt-6 grid sm:grid-cols-2 gap-4 max-w-[640px]">
          <KV k="Recipient" v={intent?.recipient ?? "—"} />
          <KV k="Amount" v={intent ? `$${intent.amount_usdc} USDC` : "—"} big />
          <KV k="Signature" v={sigShort} mono />
          <KV k="Validator" v={settlement?.sessionId ? `${settlement.sessionId.slice(0, 8)}…` : "—"} mono />
        </div>

        {sig && (
          <div className="mt-5">
            <a
              href={`https://solscan.io/tx/${sig}?cluster=devnet`}
              target="_blank"
              rel="noreferrer"
              className="inline-flex items-center gap-2 font-display font-extrabold text-navy text-[14px] border-b-[1.5px] border-cyan pb-1"
            >
              View on Solscan ↗
            </a>
          </div>
        )}

        {showSavePrompt && lastRecipient && (
          <SaveContactPrompt
            defaultName={lastRecipient.via === "sns" ? lastRecipient.name.replace(/\.sol$/i, "") : ""}
            pubkey={lastRecipient.pubkey}
            onSave={(name) => onSaveContact(name, lastRecipient.pubkey)}
          />
        )}

        <div className="mt-8 flex flex-wrap gap-3">
          <BigCTA primary onClick={onReset}>Send another payment 💖</BigCTA>
          <Link href="/" className="pressable inline-flex items-center gap-2 bg-white text-navy font-display font-extrabold text-[15px] px-7 py-3 rounded-full" style={{ boxShadow: "inset 0 0 0 1.5px #0B1020" }}>
            Done
          </Link>
        </div>
      </div>
    </div>
  )
}

function SaveContactPrompt({
  defaultName,
  pubkey,
  onSave,
}: {
  defaultName: string
  pubkey: string
  onSave: (name: string) => void
}) {
  const [name, setName] = useState(defaultName)
  const [saved, setSaved] = useState(false)
  if (saved) {
    return (
      <div className="mt-5 p-3 rounded-2xl bg-cyan/30 text-[13px] font-bold text-navy">
        ✨ Saved as &ldquo;{name}&rdquo; — next time, just type the name.
      </div>
    )
  }
  return (
    <div className="mt-5 p-4 rounded-2xl bg-white border border-sky/60 max-w-[520px]">
      <div className="text-[10px] font-bold tracking-[0.18em] uppercase text-navy/50">Save this recipient?</div>
      <div className="font-mono text-[11px] text-navy/65 mt-1 break-all">{pubkey}</div>
      <div className="flex flex-wrap gap-2 mt-3">
        <input
          type="text"
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder="contact name"
          className="flex-1 min-w-[160px] px-4 py-2 rounded-full bg-cream border-[1.5px] border-transparent outline-none text-[13px] font-bold text-navy focus:border-cyan transition"
        />
        <button
          onClick={() => {
            const trimmed = name.trim()
            if (!trimmed) return
            onSave(trimmed)
            setSaved(true)
          }}
          disabled={!name.trim()}
          className="pressable px-5 py-2 rounded-full bg-cyan text-navy font-display font-extrabold text-[13px] disabled:opacity-50"
          style={{ boxShadow: "0 4px 12px rgba(127,232,255,0.4)" }}
        >
          Save contact
        </button>
      </div>
    </div>
  )
}

// ─────────────────────────────────────────────────────────────
// Right-side note
// ─────────────────────────────────────────────────────────────
function SideNote({ screen }: { screen: ScreenId }) {
  const notes: Record<ScreenId, { title: string; bullets: string[] }> = {
    connect: {
      title: "What's about to happen",
      bullets: [
        "Solana Wallet Adapter opens a modal with your installed wallets.",
        "We talk to devnet RPC only. Mainnet keys stay safe.",
        "Approving the connection just shares your pubkey — no signing yet.",
      ],
    },
    intent: {
      title: "On-device parsing",
      bullets: [
        "QVAC runs Llama 3.2 1B locally on :11434.",
        "The intent is structured: { recipient, amount_usdc, private, memo? }.",
        "Toggle airplane mode to feel the offline-first promise.",
      ],
    },
    sign: {
      title: "Signing without RPC",
      bullets: [
        "We hash the intent (sha256) and ask your wallet to signMessage.",
        "Pure ed25519. No transaction is built yet.",
        "You can do this in airplane mode — that's the headline feature.",
      ],
    },
    queued: {
      title: "What's held",
      bullets: [
        "Just the offline signature + intent hash. No tx broadcast.",
        "Reconnect calls MagicBlock to build a private SPL transfer.",
        "Your wallet signs that tx, then we submit to devnet.",
      ],
    },
    settled: {
      title: "What landed on-chain",
      bullets: [
        "A real Solana signature on devnet — verifiable on Solscan.",
        "MagicBlock's PER sealed amount + recipient inside the TEE.",
        "Public chain just shows the heartbeat tx.",
      ],
    },
  }
  const note = notes[screen]
  return (
    <div className="card rounded-3xl p-6 softshadow lg:sticky lg:top-28 self-start">
      <div className="text-[11px] font-bold tracking-[0.16em] uppercase text-navy/50">Behind the curtain</div>
      <h3 className="font-display font-black text-navy text-[20px] tracking-[-0.02em] mt-1 leading-tight">
        {note.title}
      </h3>
      <ul className="mt-4 space-y-3">
        {note.bullets.map((b, i) => (
          <li key={i} className="flex gap-3 text-[13px] text-navy/75 leading-snug">
            <span className="mt-1 w-1.5 h-1.5 rounded-full bg-cyan shrink-0" />
            <span>{b}</span>
          </li>
        ))}
      </ul>
    </div>
  )
}

// ─────────────────────────────────────────────────────────────
// Small atoms
// ─────────────────────────────────────────────────────────────
function BigCTA({
  primary,
  children,
  onClick,
  disabled,
}: {
  primary?: boolean
  children: ReactNode
  onClick?: () => void
  disabled?: boolean
}) {
  const bg = disabled ? "#C4CCD8" : primary ? "#7FE8FF" : "#fff"
  return (
    <button
      onClick={onClick}
      disabled={disabled}
      className="pressable inline-flex items-center gap-2 px-7 py-3 rounded-full font-display font-extrabold text-[15px]"
      style={{
        background: bg,
        color: "#0B1020",
        boxShadow: disabled ? "none" : primary ? "0 6px 18px rgba(127,232,255,0.45)" : "inset 0 0 0 1.5px #0B1020",
        opacity: disabled ? 0.7 : 1,
        cursor: disabled ? "not-allowed" : "pointer",
        border: "none",
      }}
    >
      {children}
    </button>
  )
}

function KV({
  k,
  v,
  big,
  mono,
  pillBg,
}: {
  k: string
  v: string
  big?: boolean
  mono?: boolean
  pillBg?: string
}) {
  return (
    <div className="bg-white rounded-2xl p-4 border border-sky/40">
      <div className="text-[10px] font-bold tracking-[0.18em] uppercase text-navy/50">{k}</div>
      {pillBg ? (
        <div
          className="mt-2 inline-block px-3 py-1 rounded-full text-[12px] font-extrabold"
          style={{ background: pillBg, color: "#0B1020" }}
        >
          {v}
        </div>
      ) : (
        <div
          className={[
            "mt-1 font-display font-black text-navy leading-tight break-all",
            big ? "text-[24px]" : "text-[16px]",
            mono ? "font-mono font-bold text-[13px]" : "",
          ].join(" ")}
        >
          {v}
        </div>
      )}
    </div>
  )
}

function Chip({ children, lilac }: { children: ReactNode; lilac?: boolean }) {
  return (
    <span
      style={{
        background: lilac ? "rgba(199,181,255,0.45)" : "rgba(127,232,255,0.35)",
        color: "#0B1020",
        fontWeight: 700,
        fontSize: 12,
        padding: "5px 12px",
        borderRadius: 999,
      }}
    >
      {children}
    </span>
  )
}
