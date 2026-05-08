"use client"

import { useState, type ReactNode } from "react"
import Link from "next/link"
import { WalletModalButton } from "@solana/wallet-adapter-react-ui"
import { KumoMascot, KumoMark } from "@/components/kumo-mascot"
import type { PaymentIntent } from "@kumo/shared"

export type ScreenId = "connect" | "intent" | "sign" | "queued" | "settled"
export type Settlement = { signature: string; sessionId: string }

export type SharedProps = {
  idx: number
  setIdx: (i: number) => void
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
  contacts: Record<string, string>
  lastRecipient: { name: string; pubkey: string; via: string } | null
  onSaveContact: (name: string, pubkey: string) => void
  onParse: (text: string) => void
  onSignOffline: () => void
  onBroadcast: () => void
  onReset: () => void
  onSwitchWallet: () => void
}

const SCREENS: ScreenId[] = ["connect", "intent", "sign", "queued", "settled"]

/**
 * Mobile layout for /app — full-viewport, no simulated phone shell.
 * Top bar with brand + status pill, scrollable body, sticky bottom CTA.
 */
export function MobileFlow(p: SharedProps) {
  const screen = SCREENS[p.idx]

  let Body: ReactNode
  let CTA: ReactNode = null
  switch (screen) {
    case "connect":
      Body = <MConnect />
      CTA = (
        <div className="kumo-wallet-btn">
          <WalletModalButton>{p.connected ? "Connected ✓" : "Connect wallet"}</WalletModalButton>
        </div>
      )
      break
    case "intent":
      Body = <MIntent {...p} />
      CTA = (
        <PrimaryCTA disabled={p.busy || !p.text.trim()} onClick={() => p.onParse(p.text)}>
          {p.busy ? "Parsing…" : "Parse intent →"}
        </PrimaryCTA>
      )
      break
    case "sign":
      Body = <MSign {...p} />
      CTA = (
        <PrimaryCTA disabled={p.busy || !p.intent} onClick={p.onSignOffline}>
          {p.busy ? "Awaiting signature…" : "Sign with wallet"}
        </PrimaryCTA>
      )
      break
    case "queued":
      Body = <MQueued {...p} />
      CTA = (
        <PrimaryCTA disabled={p.busy} onClick={p.onBroadcast}>
          {p.busy ? "Broadcasting…" : "Reconnect & broadcast →"}
        </PrimaryCTA>
      )
      break
    case "settled":
      Body = <MSettled {...p} />
      CTA = (
        <div className="flex flex-col gap-2">
          <PrimaryCTA onClick={p.onReset}>Send another payment 💖</PrimaryCTA>
          <Link
            href="/"
            className="pressable text-center w-full px-7 py-3 rounded-full bg-white text-navy font-display font-extrabold text-[15px]"
            style={{ boxShadow: "inset 0 0 0 1.5px #0B1020" }}
          >
            Done
          </Link>
        </div>
      )
      break
  }

  return (
    <div className="lg:hidden min-h-screen bg-cream has-topnav relative pb-32">
      {/* Decorative blobs (lighter on mobile) */}
      <div aria-hidden className="pointer-events-none fixed inset-0 overflow-hidden">
        <div className="absolute top-20 -right-16 w-64 h-64 rounded-full bg-lilac opacity-25 blur-3xl" />
        <div className="absolute bottom-32 left-0 w-72 h-72 rounded-full bg-cyan opacity-20 blur-3xl" />
      </div>

      {/* In-app header (under top nav) */}
      <div className="relative px-5 pt-4 pb-2 flex items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          <KumoMark size={28} />
          <span className="font-display font-extrabold text-navy text-[18px] tracking-[-0.01em]">Kumo</span>
        </div>
        <button
          onClick={() => p.setAirplane(!p.airplane)}
          className="pressable inline-flex items-center gap-1.5 rounded-full px-3 py-1.5 font-display font-extrabold text-[11px]"
          style={{ background: p.airplane ? "#C7B5FF" : "#B7F1FF", color: "#0B1020" }}
        >
          {p.airplane ? "✈" : "●"} {p.airplane ? "Airplane" : p.walletLabel || "Online"}
        </button>
      </div>

      {/* Progress dots — clicking "Connect" disconnects + resets */}
      <div className="relative px-5 mt-2 flex items-center justify-between gap-2">
        {SCREENS.map((id, i) => {
          const active = i === p.idx
          const done = i < p.idx
          const reachable = i === 0 || p.connected
          const onClick = () => {
            if (i === 0) {
              if (p.connected) p.onSwitchWallet()
              else p.setIdx(0)
            } else if (reachable) {
              p.setIdx(i)
            }
          }
          return (
            <button
              key={id}
              onClick={onClick}
              disabled={!reachable}
              className={[
                "flex-1 h-1.5 rounded-full transition",
                active ? "bg-navy" : done ? "bg-cyan" : "bg-sky/50",
                !reachable ? "opacity-40" : "",
              ].join(" ")}
              aria-label={id}
            />
          )
        })}
      </div>
      <div className="relative px-5 mt-2 text-[10px] font-bold tracking-[0.18em] uppercase text-navy/55">
        Step {p.idx + 1} / {SCREENS.length} · {SCREENS[p.idx]}
      </div>

      {/* Body */}
      <div className="relative px-5 pt-4">{Body}</div>

      {p.errorMsg && (
        <div className="relative mx-5 mt-4 p-3 rounded-2xl bg-white border border-lilac/60 text-[12px] text-navy/80 leading-relaxed">
          <div className="font-bold uppercase tracking-[0.18em] text-[10px] mb-1 text-lilac">// error</div>
          {p.errorMsg}
        </div>
      )}

      {/* Sticky bottom CTA */}
      <div
        className="fixed bottom-0 left-0 right-0 px-5 py-4 bg-cream/95 z-50"
        style={{
          backdropFilter: "blur(8px)",
          WebkitBackdropFilter: "blur(8px)",
          borderTop: "0.5px solid rgba(183,241,255,1)",
        }}
      >
        {CTA}
      </div>
    </div>
  )
}

// ─────────────────────────────────────────────────────────────
// Mobile screens
// ─────────────────────────────────────────────────────────────
function MConnect() {
  return (
    <div className="text-center pt-2">
      <div className="animate-breathe inline-block">
        <KumoMascot size={180} expression="cheerful" waves />
      </div>
      <div className="font-display font-black text-navy text-[36px] tracking-[-0.02em] mt-2 leading-none">Kumo</div>
      <div className="text-[13px] font-semibold text-navy/55 mt-2">Pay when the signal disappears.</div>

      <div className="mt-6 mx-auto max-w-[320px] p-4 bg-sky/50 rounded-2xl">
        <div className="font-display font-extrabold text-navy text-[14px]">Connect a real wallet</div>
        <div className="text-[12px] text-navy/65 mt-1.5 leading-relaxed">
          Phantom, Solflare, or Backpack. We talk to <span className="font-bold">devnet</span> only.
        </div>
      </div>

      <div className="text-[11px] text-navy/55 mt-4 font-semibold">
        Need devnet USDC? <a className="underline font-bold" href="https://faucet.circle.com" target="_blank" rel="noreferrer">faucet.circle.com</a>
      </div>
    </div>
  )
}

function MIntent({ airplane, walletLabel, walletPubkey, text, setText, contacts }: SharedProps) {
  const contactNames = Object.keys(contacts)
  return (
    <div>
      <div className="flex items-end gap-3 mb-4">
        <KumoMascot size={72} expression="curious" />
        <div className="bg-white rounded-2xl px-3 py-2 mb-1 softshadow-sm">
          <div className="font-semibold text-[13px] text-navy">What payment, friend?</div>
        </div>
      </div>

      {walletPubkey && (
        <div className="inline-flex items-center gap-2 bg-sky/50 px-3 py-1.5 rounded-full text-[11px] font-bold text-navy mb-3">
          <span className="w-1.5 h-1.5 rounded-full bg-cyan" />
          {walletLabel} · <span className="font-mono">{walletPubkey.slice(0, 5)}…{walletPubkey.slice(-4)}</span>
        </div>
      )}

      <Eyebrow>01 — your intent</Eyebrow>
      <textarea
        value={text}
        onChange={(e) => setText(e.target.value)}
        rows={3}
        placeholder="pay alice 1 usdc privately, or bob.sol"
        className="w-full mt-2 p-4 rounded-2xl bg-white border-[1.5px] border-transparent outline-none resize-none text-[16px] text-navy softshadow-sm focus:border-cyan transition"
      />

      {contactNames.length > 0 && (
        <div className="mt-3">
          <div className="text-[9px] font-bold tracking-[0.16em] uppercase text-navy/50 mb-1.5">Contacts</div>
          <div className="flex flex-wrap gap-1.5">
            {contactNames.map((name) => (
              <button
                key={name}
                type="button"
                onClick={() => setText(`pay ${name} 1 usdc privately`)}
                className="pressable inline-flex items-center gap-1.5 bg-white text-navy font-bold text-[11px] px-2.5 py-1 rounded-full"
                style={{ boxShadow: "inset 0 0 0 1px #B7F1FF" }}
              >
                <span className="w-1 h-1 rounded-full bg-cyan" />
                {name}
              </button>
            ))}
          </div>
        </div>
      )}

      <div className="flex flex-wrap gap-1.5 mt-3">
        <Chip>🤖 qvac on-device</Chip>
        <Chip>🔒 no leaks</Chip>
        <Chip lilac>🌐 .sol</Chip>
        {airplane && <Chip lilac>✈ airplane mode</Chip>}
      </div>
    </div>
  )
}

function MSign({ intent }: SharedProps) {
  const recipient = intent?.recipient ?? "—"
  const amount = intent ? `$${intent.amount_usdc} USDC` : "—"
  const isPrivate = intent?.private ?? true

  return (
    <div>
      <div className="flex items-end gap-3 mb-4">
        <KumoMascot size={64} expression="concentrating" />
        <div className="bg-white rounded-2xl px-3 py-2 mb-1 softshadow-sm">
          <div className="font-semibold text-[13px] text-navy">I read it! Sign to lock it in?</div>
        </div>
      </div>

      <Eyebrow>02 — sign offline</Eyebrow>

      <div className="mt-2 bg-white rounded-2xl p-4 border border-sky">
        <Row k="To" v={recipient} />
        <Row k="Amount" v={amount} big />
        <RowPill k="Privacy" pill={
          <span style={{ background: isPrivate ? "#C7B5FF" : "#C4CCD8", color: "#0B1020", fontWeight: 800, fontSize: 11, padding: "4px 10px", borderRadius: 999 }}>
            {isPrivate ? "🔒 Private mode" : "Public"}
          </span>
        } />
      </div>

      <div className="flex flex-wrap gap-1.5 mt-3">
        <Chip>💎 wallet signMessage</Chip>
        <Chip>📡 no rpc call</Chip>
        {isPrivate && <Chip lilac>🔒 confidential</Chip>}
      </div>

      <div className="mt-4 p-4 rounded-2xl border-[1.5px] border-sky" style={{ background: "rgba(127,232,255,0.12)" }}>
        <div className="font-bold text-[14px] text-navy">Sign with your wallet</div>
        <div className="text-[12px] text-navy/65 mt-1 leading-relaxed">
          Your wallet will pop up to sign the intent hash. No RPC required.
        </div>
      </div>
    </div>
  )
}

function MQueued({ intent, intentHash, offlineSig }: SharedProps) {
  return (
    <div>
      <div className="flex justify-center mt-1">
        <KumoMascot size={140} expression="sleeping" sleepZ />
      </div>
      <div className="font-display font-black text-navy text-[20px] text-center mt-2 tracking-[-0.01em]">
        Resting until you reconnect…
      </div>
      <div className="text-[12px] text-navy/60 text-center mt-1 leading-relaxed px-2">
        Intent is signed and held. Tap reconnect when you&apos;re back online.
      </div>

      <div className="mt-5">
        <Eyebrow>03 — held</Eyebrow>
        <div className="mt-2 bg-white rounded-2xl p-4 border border-sky/60">
          <span className="inline-block px-2.5 py-1 rounded-full font-extrabold text-[10px] text-navy mb-3" style={{ background: "#C7B5FF" }}>🔒 Held</span>
          <Row k="Hash" v={intentHash ? `${intentHash.slice(0, 6)}…${intentHash.slice(-4)}` : "—"} />
          <Row k="Recipient" v={intent?.recipient ?? "—"} />
          <Row k="Offline sig" v={offlineSig ? `${offlineSig.slice(0, 6)}…${offlineSig.slice(-4)}` : "—"} />
        </div>
        <div className="text-[11px] text-navy/55 text-center mt-2">You are offline. Nothing is leaving.</div>
      </div>
    </div>
  )
}

function MSettled({ intent, settlement, lastRecipient, onSaveContact }: SharedProps) {
  const sig = settlement?.signature
  const showSavePrompt = lastRecipient?.via === "raw" || lastRecipient?.via === "sns"
  return (
    <div>
      <div className="flex justify-center mt-1">
        <KumoMascot size={140} expression="celebrating" sparkles />
      </div>
      <div className="font-display font-black text-navy text-[26px] text-center mt-2 tracking-[-0.02em]">
        Delivered! ✨
      </div>
      <div className="text-[12px] text-navy/60 text-center mt-1 leading-relaxed px-2">
        On-chain on devnet via MagicBlock.
      </div>

      <div className="mt-5">
        <Eyebrow>04 — arrived</Eyebrow>
        <div className="mt-2 bg-white rounded-2xl p-4 border border-cyan">
          <span className="inline-block px-2.5 py-1 rounded-full font-extrabold text-[10px] text-navy mb-3" style={{ background: "#7FE8FF" }}>✨ Delivered</span>
          <Row k="Recipient" v={intent?.recipient ?? "—"} />
          <Row k="Amount" v={intent ? `$${intent.amount_usdc} USDC` : "—"} />
          <Row k="Signature" v={sig ? `${sig.slice(0, 6)}…${sig.slice(-4)}` : "—"} />
          <Row k="Validator" v={settlement?.sessionId ? `${settlement.sessionId.slice(0, 8)}…` : "—"} />
          {sig && (
            <a
              href={`https://solscan.io/tx/${sig}?cluster=devnet`}
              target="_blank"
              rel="noreferrer"
              className="inline-block mt-3 font-display font-extrabold text-navy text-[13px] border-b-[1.5px] border-cyan pb-0.5"
            >
              View on Solscan ↗
            </a>
          )}
        </div>

        {showSavePrompt && lastRecipient && (
          <MSaveContactPrompt
            defaultName={lastRecipient.via === "sns" ? lastRecipient.name.replace(/\.sol$/i, "") : ""}
            pubkey={lastRecipient.pubkey}
            onSave={(name) => onSaveContact(name, lastRecipient.pubkey)}
          />
        )}
      </div>
    </div>
  )
}

function MSaveContactPrompt({
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
      <div className="mt-4 p-3 rounded-xl bg-cyan/30 text-[12px] font-bold text-navy text-center">
        ✨ Saved as &ldquo;{name}&rdquo;
      </div>
    )
  }
  return (
    <div className="mt-4 p-3 rounded-xl bg-white border border-sky/60">
      <div className="text-[10px] font-bold tracking-[0.18em] uppercase text-navy/50">Save recipient?</div>
      <div className="font-mono text-[10px] text-navy/65 mt-0.5 break-all">{pubkey.slice(0, 24)}…</div>
      <div className="flex gap-2 mt-2">
        <input
          type="text"
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder="name"
          className="flex-1 min-w-0 px-3 py-1.5 rounded-full bg-cream border-[1.5px] border-transparent outline-none text-[12px] font-bold text-navy focus:border-cyan transition"
        />
        <button
          onClick={() => {
            const t = name.trim()
            if (!t) return
            onSave(t)
            setSaved(true)
          }}
          disabled={!name.trim()}
          className="pressable px-3 py-1.5 rounded-full bg-cyan text-navy font-display font-extrabold text-[12px] disabled:opacity-50"
        >
          Save
        </button>
      </div>
    </div>
  )
}

// ─────────────────────────────────────────────────────────────
// Atoms
// ─────────────────────────────────────────────────────────────
function PrimaryCTA({ children, onClick, disabled }: { children: ReactNode; onClick?: () => void; disabled?: boolean }) {
  return (
    <button
      onClick={onClick}
      disabled={disabled}
      className="pressable w-full px-6 py-3.5 rounded-full font-display font-extrabold text-[15px]"
      style={{
        background: disabled ? "#C4CCD8" : "#7FE8FF",
        color: "#0B1020",
        boxShadow: disabled ? "none" : "0 6px 18px rgba(127,232,255,0.45)",
        opacity: disabled ? 0.7 : 1,
        cursor: disabled ? "not-allowed" : "pointer",
        border: "none",
      }}
    >
      {children}
    </button>
  )
}

function Eyebrow({ children }: { children: ReactNode }) {
  return (
    <div className="text-[10px] font-bold tracking-[0.18em] uppercase text-navy/50">{children}</div>
  )
}

function Row({ k, v, big }: { k: string; v: string; big?: boolean }) {
  return (
    <div className="flex items-baseline justify-between gap-2 py-1.5 border-b border-dashed border-navy/10 last:border-b-0">
      <span className="text-[11px] font-bold text-navy/55 tracking-wide uppercase">{k}</span>
      <span className={["font-extrabold text-navy text-right truncate max-w-[60%]", big ? "text-[18px]" : "text-[13px]"].join(" ")}>{v}</span>
    </div>
  )
}

function RowPill({ k, pill }: { k: string; pill: ReactNode }) {
  return (
    <div className="flex items-center justify-between py-2">
      <span className="text-[11px] font-bold text-navy/55 tracking-wide uppercase">{k}</span>
      {pill}
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
        fontSize: 11,
        padding: "4px 10px",
        borderRadius: 999,
      }}
    >
      {children}
    </span>
  )
}
