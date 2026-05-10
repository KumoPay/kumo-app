"use client"

import LandingNav from "@/components/landing-nav"
import { useEffect, useMemo, useState, type ReactNode } from "react"
import Link from "next/link"
import { KumoMascot, KumoMark } from "@/components/kumo-mascot"
import type { PaymentIntent } from "@kumo/shared"

type ScreenId = "connect" | "intent" | "sign" | "queued" | "settled"

const FLOW_SCREENS: Array<{ id: ScreenId; step: string; label: string }> = [
  { id: "connect", step: "01 — connect", label: "Wallet connect" },
  { id: "intent", step: "02 — intent", label: "Speak intent" },
  { id: "sign", step: "03 — sign", label: "Sign with Face ID" },
  { id: "queued", step: "04 — queued", label: "Resting offline" },
  { id: "settled", step: "05 — arrived", label: "Delivered" },
]

const DEMO_RECIPIENT_MAP: Record<string, string> = {
  maria: "AMBTMn1TiX3jWcGh9BUnasBq1jix3ShJyu2QTGkSZZxQ",
  javier: "Znf1az6ZwwszgKHBTxvGQRcZaULmUMXSCkgRQhtrdQy",
}

type Settlement = { signature: string; sessionId: string }

export default function FlowPage() {
  const [idx, setIdx] = useState(0)
  const [airplane, setAirplane] = useState(false)
  const [intent, setIntent] = useState<PaymentIntent | null>(null)
  const [signedTxB58, setSignedTxB58] = useState<string | null>(null)
  const [intentHash, setIntentHash] = useState<string | null>(null)
  const [settlement, setSettlement] = useState<Settlement | null>(null)
  const [errorMsg, setErrorMsg] = useState<string | null>(null)
  const [busy, setBusy] = useState(false)

  // Sync airplane indicator with screen
  useEffect(() => {
    if (FLOW_SCREENS[idx].id === "queued") setAirplane(true)
    if (FLOW_SCREENS[idx].id === "settled") setAirplane(false)
  }, [idx])

  const screen = FLOW_SCREENS[idx]

  // Faux nonce for offline build (real online setup would replace this)
  const fauxNonce = useMemo(
    () => ({
      noncePubkey: "AMBTMn1TiX3jWcGh9BUnasBq1jix3ShJyu2QTGkSZZxQ",
      nonce: "11111111111111111111111111111111",
      authorityPubkey: "AMBTMn1TiX3jWcGh9BUnasBq1jix3ShJyu2QTGkSZZxQ",
      refreshedAt: Date.now(),
    }),
    [],
  )

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
      setIdx(2)
    } catch (e) {
      setErrorMsg(e instanceof Error ? e.message : "parse failed")
    } finally {
      setBusy(false)
    }
  }

  async function callSign() {
    if (!intent) return
    setErrorMsg(null)
    setBusy(true)
    try {
      const recipientPubkey =
        DEMO_RECIPIENT_MAP[intent.recipient.toLowerCase()] ?? intent.recipient
      const r = await fetch("/api/build-tx", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ intent, nonce: fauxNonce, recipientPubkey }),
      })
      const j = await r.json()
      if (!j.ok) throw new Error(j.error)
      setSignedTxB58(j.signed_tx_b58)
      setIntentHash(j.intent_hash)
      setIdx(3)
    } catch (e) {
      setErrorMsg(e instanceof Error ? e.message : "sign failed")
    } finally {
      setBusy(false)
    }
  }

  async function callBroadcast() {
    if (!intent || !signedTxB58) return
    setErrorMsg(null)
    setBusy(true)
    try {
      const recipientPubkey =
        DEMO_RECIPIENT_MAP[intent.recipient.toLowerCase()] ?? intent.recipient
      const r = await fetch("/api/broadcast", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ intent, recipientPubkey, signed_tx_b58: signedTxB58 }),
      })
      const j = await r.json()
      if (!j.ok) throw new Error(j.error)
      setSettlement({ signature: j.signature, sessionId: j.magicblock_session_id })
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
    setSignedTxB58(null)
    setIntentHash(null)
    setSettlement(null)
    setErrorMsg(null)
    setAirplane(false)
    setIdx(0)
  }

  const screenProps = {
    airplane,
    setAirplane,
    intent,
    intentHash,
    settlement,
    busy,
    errorMsg,
    onParse: callParse,
    onSign: callSign,
    onBroadcast: callBroadcast,
    onNext: () => setIdx((i) => Math.min(FLOW_SCREENS.length - 1, i + 1)),
    onReset: reset,
  }

  let Body: (p: typeof screenProps) => ReactNode
  switch (screen.id) {
    case "connect": Body = ScreenConnect; break
    case "intent": Body = ScreenIntent; break
    case "sign": Body = ScreenSign; break
    case "queued": Body = ScreenQueued; break
    case "settled": Body = ScreenSettled; break
  }

  return (
    <div
      className="landing-page landing-page-motion relative min-h-screen overflow-x-hidden selection:bg-[#ede9fe] selection:text-[#1e1b4b]"
      style={{
        fontFamily: "'DM Sans', 'Nunito', 'Segoe UI', sans-serif",
        background: "linear-gradient(180deg, #ffffff 0%, #fafbff 52%, #f5f3ff 100%)",
      }}
    >
      <LandingNav anchorsRelativeToHome={false} />

      <main className="relative mx-auto grid max-w-[1100px] items-start gap-10 px-5 pb-20 pt-[max(5.75rem,calc(5rem+env(safe-area-inset-top,0px)))] md:gap-12 md:px-8 lg:grid-cols-[minmax(0,340px)_1fr] lg:gap-14 lg:pb-24">
        {/* Left: step list */}
        <aside className="lg:sticky lg:top-28">
          <div className="mb-3 text-[11px] font-bold uppercase tracking-[0.18em] text-slate-500">Interactive flow</div>
          <h1 className="mb-2 text-[clamp(28px,3.8vw,40px)] font-black tracking-tight leading-tight text-[#1a1a2e]">
            Walk with Kumo through the offline payment.
          </h1>
          <p className="mb-8 max-w-[28rem] text-[15px] leading-relaxed text-[#64748b]">
            Five connected screens. Tap a step or use the arrows under the phone to move forward — same product story as on the homepage.
          </p>

          <ol className="space-y-2">
            {FLOW_SCREENS.map((s, i) => {
              const active = i === idx
              const done = i < idx
              return (
                <li key={s.id}>
                  <button
                    onClick={() => setIdx(i)}
                    className={[
                      "flex w-full items-center gap-3 rounded-[18px] border px-4 py-3 text-left outline-none ring-offset-2 transition-[box-shadow,border-color,background-color,transform] duration-200 ease-out focus-visible:ring-2 focus-visible:ring-[#6d28d9] active:scale-[0.99]",
                      active
                        ? "border-transparent bg-[#ede9fe] shadow-[0_10px_32px_rgba(109,40,217,0.16)] ring-2 ring-[#c7b8ff]/50"
                        : done
                          ? "border-[#ebe9fc] bg-violet-50/65 hover:bg-violet-100/55"
                          : "border-[#eef0ff] bg-white shadow-[0_6px_24px_rgba(109,40,217,0.07)] hover:border-[#dcd6fe]",
                    ].join(" ")}
                  >
                    <span
                      className={[
                        "flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-[12px] font-extrabold",
                        active
                          ? "bg-[#6d28d9] text-white shadow-sm"
                          : done
                            ? "bg-[#e0e7ff] text-[#5b21b6]"
                            : "bg-[#f4f4f5] text-slate-500",
                      ].join(" ")}
                    >
                      {i + 1}
                    </span>
                    <div className="min-w-0 flex-1">
                      <div className="text-[15px] font-bold leading-tight text-[#1a1a2e]">{s.label}</div>
                      <div className="text-[11px] font-bold uppercase tracking-[0.14em] text-slate-500">{s.step}</div>
                    </div>
                    {active ? <span className="text-[#6d28d9]" aria-hidden="true">●</span> : null}
                  </button>
                </li>
              )
            })}
          </ol>

          {errorMsg && (
            <div className="mt-6 rounded-2xl border border-red-100 bg-red-50/85 p-4 text-[13px] leading-relaxed text-red-900">
              <div className="mb-1 text-[10px] font-bold uppercase tracking-[0.14em] text-red-700">Error</div>
              {errorMsg}
            </div>
          )}
        </aside>

        {/* Center: phone frame */}
        <div className="flex flex-col items-center lg:justify-self-center">
          <div className="relative">
            <PhoneShell>
              <Body {...screenProps} />
            </PhoneShell>
          </div>

          {/* Walker */}
          <div className="mt-8 flex items-center gap-3">
            <button
              onClick={() => setIdx((i) => Math.max(0, i - 1))}
              disabled={idx === 0}
              type="button"
              className="flex h-12 w-12 items-center justify-center rounded-full border border-[#eef0f8] bg-white shadow-[0_6px_20px_rgba(109,40,217,0.10)] outline-none ring-offset-2 transition-[opacity,transform,box-shadow] duration-200 ease-out hover:border-[#dcd6fe] focus-visible:ring-2 focus-visible:ring-[#6d28d9] disabled:opacity-35 active:scale-[0.98]"
            >
              <svg width="18" height="18" viewBox="0 0 18 18" fill="none" stroke="#1a1a2e" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round">
                <path d="M11 4 L5 9 L11 14" />
              </svg>
            </button>
            <div className="min-w-[132px] rounded-full border border-[#eef0ff] bg-white px-4 py-2 text-center text-[12px] font-bold shadow-[0_4px_16px_rgba(109,40,217,0.08)]">
              <span className="text-[#6d28d9]">{idx + 1}</span>
              <span className="text-slate-400"> / </span>
              <span>{FLOW_SCREENS.length}</span>
              <span className="block truncate text-[11px] font-semibold text-slate-600">{FLOW_SCREENS[idx].label}</span>
            </div>
            <button
              onClick={() => setIdx((i) => Math.min(FLOW_SCREENS.length - 1, i + 1))}
              disabled={idx === FLOW_SCREENS.length - 1}
              type="button"
              className="flex h-12 w-12 items-center justify-center rounded-full bg-[#6d28d9] shadow-[0_8px_22px_rgba(109,40,217,0.28)] outline-none ring-offset-2 transition-[background-color,transform,opacity] duration-200 ease-out hover:bg-[#5b21b6] focus-visible:ring-2 focus-visible:ring-[#6d28d9] disabled:opacity-35 active:scale-[0.98]"
            >
              <svg width="18" height="18" viewBox="0 0 18 18" fill="none" stroke="#fff" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round">
                <path d="M7 4 L13 9 L7 14" />
              </svg>
            </button>
          </div>
        </div>
      </main>
    </div>
  )
}

// ─────────────────────────────────────────────────────────────
// Phone shell + chrome
// ─────────────────────────────────────────────────────────────
function PhoneShell({ children }: { children: ReactNode }) {
  return (
    <div
      style={{
        width: 380,
        height: 800,
        borderRadius: 56,
        background: "#0B1020",
        padding: 12,
        boxShadow: "0 30px 80px rgba(11,16,32,0.20), inset 0 0 0 2px rgba(255,255,255,0.05)",
      }}
    >
      <div
        style={{
          width: "100%",
          height: "100%",
          borderRadius: 46,
          background: "#fff",
          overflow: "hidden",
          position: "relative",
          display: "flex",
          flexDirection: "column",
        }}
      >
        {children}
      </div>
    </div>
  )
}

function PhoneStatusBar({ airplane }: { airplane?: boolean }) {
  return (
    <div
      style={{
        height: 44,
        padding: "0 22px",
        display: "flex",
        alignItems: "center",
        justifyContent: "space-between",
        color: "#0B1020",
        fontSize: 14,
        fontWeight: 700,
        flexShrink: 0,
      }}
    >
      <span>9:41</span>
      <div
        style={{
          position: "absolute",
          left: "50%",
          top: 12,
          transform: "translateX(-50%)",
          width: 92,
          height: 24,
          borderRadius: 999,
          background: "#0B1020",
        }}
      />
      <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
        {airplane ? (
          <svg width="14" height="14" viewBox="0 0 14 14" fill="#C7B5FF">
            <path d="M13 7l-5-1-1-5h-1l-1 5L0 7v1l5 1v3l-1 1h4l-1-1V9l5-1z" />
          </svg>
        ) : (
          <>
            <svg width="14" height="10" viewBox="0 0 14 10" fill="#0B1020">
              <path d="M7 9.5 L0.5 3.5 a9 9 0 0113 0z" />
            </svg>
            <svg width="14" height="10" viewBox="0 0 14 10" fill="#0B1020">
              <path d="M13 9.5 V0.5 L1 9.5z" />
            </svg>
          </>
        )}
        <svg width="22" height="11" viewBox="0 0 22 11">
          <rect x="0.5" y="0.5" width="18" height="10" rx="2" fill="none" stroke="#0B1020" />
          <rect x="2" y="2" width="14" height="7" rx="1" fill="#0B1020" />
          <rect x="19" y="3.5" width="2" height="4" rx="0.5" fill="#0B1020" />
        </svg>
      </div>
    </div>
  )
}

function PhoneHomeIndicator() {
  return (
    <div style={{ height: 24, display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
      <div style={{ width: 124, height: 4, borderRadius: 999, background: "#0B1020", opacity: 0.5 }} />
    </div>
  )
}

function CompactHeader({ airplane, status = "Online" }: { airplane?: boolean; status?: "Online" | "Airplane" | "Held" }) {
  const pillBg = airplane || status === "Airplane" ? "#C7B5FF" : status === "Held" ? "#C4CCD8" : "#B7F1FF"
  const pillText = airplane || status === "Airplane" ? "Airplane" : status === "Held" ? "Queued" : "Online"
  return (
    <div
      style={{
        height: 64,
        padding: "16px 22px 0",
        display: "flex",
        alignItems: "center",
        justifyContent: "space-between",
        borderBottom: "0.5px solid #B7F1FF",
        flexShrink: 0,
      }}
    >
      <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
        <KumoMark size={28} />
        <span className="font-display" style={{ fontWeight: 800, fontSize: 20, color: "#0B1020", letterSpacing: "-0.01em" }}>
          Kumo
        </span>
      </div>
      <div style={{ background: pillBg, padding: "6px 12px", borderRadius: 999, fontSize: 11, fontWeight: 700, color: "#0B1020" }}>
        {airplane ? "✈ " : "● "}
        {pillText}
      </div>
    </div>
  )
}

function PrimaryCTA({ children, onClick, disabled }: { children: ReactNode; onClick?: () => void; disabled?: boolean }) {
  return (
    <button
      onClick={onClick}
      disabled={disabled}
      className="pressable"
      style={{
        width: "100%",
        padding: "14px 28px",
        borderRadius: 999,
        background: disabled ? "#C4CCD8" : "#7FE8FF",
        color: "#0B1020",
        fontWeight: 800,
        fontSize: 16,
        opacity: disabled ? 0.7 : 1,
        boxShadow: disabled ? "none" : "0 6px 18px rgba(127,232,255,0.45)",
        cursor: disabled ? "not-allowed" : "pointer",
        border: "none",
      }}
    >
      {children}
    </button>
  )
}

function SecondaryCTA({ children, onClick }: { children: ReactNode; onClick?: () => void }) {
  return (
    <button
      onClick={onClick}
      className="pressable"
      style={{
        width: "100%",
        padding: "13px 28px",
        borderRadius: 999,
        background: "#fff",
        color: "#0B1020",
        fontWeight: 800,
        fontSize: 16,
        boxShadow: "inset 0 0 0 1.5px #0B1020",
        cursor: "pointer",
        border: "none",
      }}
    >
      {children}
    </button>
  )
}

function Eyebrow({ children }: { children: ReactNode }) {
  return (
    <div style={{ fontSize: 11, fontWeight: 700, letterSpacing: "0.16em", textTransform: "uppercase", color: "#0B1020", opacity: 0.5 }}>
      {children}
    </div>
  )
}

// ─────────────────────────────────────────────────────────────
// Screens
// ─────────────────────────────────────────────────────────────
type ScreenProps = {
  airplane: boolean
  setAirplane: (v: boolean) => void
  intent: PaymentIntent | null
  intentHash: string | null
  settlement: Settlement | null
  busy: boolean
  errorMsg: string | null
  onParse: (text: string) => void
  onSign: () => void
  onBroadcast: () => void
  onNext: () => void
  onReset: () => void
}

function ScreenConnect({ onNext }: ScreenProps) {
  return (
    <>
      <PhoneStatusBar />
      <div style={{ flex: 1, padding: "0 22px 0", overflow: "auto" }}>
        <div style={{ paddingTop: 10, display: "flex", flexDirection: "column", alignItems: "center" }}>
          <div className="animate-breathe">
            <KumoMascot size={210} expression="cheerful" waves />
          </div>
          <div className="font-display" style={{ fontWeight: 900, fontSize: 38, color: "#0B1020", letterSpacing: "-0.02em", marginTop: 4 }}>
            Kumo
          </div>
          <div style={{ fontSize: 13, color: "#0B1020", opacity: 0.55, fontWeight: 600, marginTop: 4, textAlign: "center" }}>
            Pay when the signal disappears.
          </div>
        </div>

        <div style={{ marginTop: 22, display: "flex", flexDirection: "column", gap: 10 }}>
          {[
            { name: "Phantom Mobile", glyph: <PhantomGlyph /> },
            { name: "Solflare", glyph: <SolflareGlyph /> },
            { name: "Backpack", glyph: <BackpackGlyph /> },
          ].map((w) => (
            <button
              key={w.name}
              onClick={onNext}
              className="pressable"
              style={{
                background: "#B7F1FF",
                borderRadius: 18,
                padding: "14px 16px",
                display: "flex",
                alignItems: "center",
                gap: 12,
                border: "none",
                cursor: "pointer",
                boxShadow: "0 1px 2px rgba(11,16,32,0.04)",
              }}
            >
              <div style={{ width: 36, height: 36, borderRadius: 12, background: "#fff", display: "flex", alignItems: "center", justifyContent: "center" }}>
                {w.glyph}
              </div>
              <div style={{ fontWeight: 800, fontSize: 15, color: "#0B1020", flex: 1, textAlign: "left" }}>{w.name}</div>
              <div style={{ color: "#0B1020", fontWeight: 800 }}>→</div>
            </button>
          ))}
        </div>

        <div style={{ marginTop: 16, display: "flex", alignItems: "center", justifyContent: "center", gap: 6, color: "#C7B5FF", fontSize: 12, fontWeight: 700 }}>
          <CloudTinyGlyph color="#C7B5FF" /> Secured by Saga Seed Vault
        </div>
      </div>

      <div style={{ padding: "16px 22px 24px", flexShrink: 0 }}>
        <PrimaryCTA onClick={onNext}>Connect wallet</PrimaryCTA>
      </div>
      <PhoneHomeIndicator />
    </>
  )
}

function ScreenIntent({ airplane, setAirplane, busy, onParse }: ScreenProps) {
  const [text, setText] = useState("pay maria 50 usdc privately")
  return (
    <>
      <PhoneStatusBar airplane={airplane} />
      <CompactHeader airplane={airplane} />

      <div style={{ flex: 1, padding: "20px 22px 0", overflow: "auto" }}>
        <div style={{ display: "flex", alignItems: "flex-end", gap: 10, marginBottom: 22 }}>
          <KumoMascot size={84} expression="curious" />
          <div
            style={{
              background: "#fff",
              borderRadius: 16,
              padding: "10px 14px",
              boxShadow: "0 4px 12px rgba(11,16,32,0.08)",
              position: "relative",
              marginBottom: 8,
            }}
          >
            <div style={{ fontWeight: 600, fontSize: 14, color: "#0B1020" }}>What payment, friend?</div>
            <div
              style={{
                position: "absolute",
                left: -6,
                bottom: 12,
                width: 0,
                height: 0,
                borderTop: "6px solid transparent",
                borderBottom: "6px solid transparent",
                borderRight: "8px solid #fff",
              }}
            />
          </div>
        </div>

        <Eyebrow>01 — your intent</Eyebrow>
        <textarea
          value={text}
          onChange={(e) => setText(e.target.value)}
          rows={3}
          placeholder="pay maria 50 usdc privately"
          style={{
            width: "100%",
            marginTop: 8,
            padding: 18,
            borderRadius: 16,
            background: "#fff",
            border: "1.5px solid transparent",
            outline: "none",
            resize: "none",
            fontSize: 16,
            color: "#0B1020",
            fontFamily: "inherit",
            boxShadow: "0 2px 8px rgba(11,16,32,0.06)",
          }}
          onFocus={(e) => (e.target.style.borderColor = "#7FE8FF")}
          onBlur={(e) => (e.target.style.borderColor = "transparent")}
        />

        <div style={{ display: "flex", gap: 8, marginTop: 14, flexWrap: "wrap" }}>
          <Chip>🤖 qvac on-device</Chip>
          <Chip>🔒 no leaks</Chip>
          <Chip>✨ on-device AI</Chip>
        </div>

        <div
          style={{
            marginTop: 22,
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            padding: "12px 14px",
            background: "#fff",
            borderRadius: 16,
            boxShadow: "0 1px 2px rgba(11,16,32,0.04)",
          }}
        >
          <div>
            <div style={{ fontSize: 13, fontWeight: 800, color: "#0B1020" }}>Airplane mode</div>
            <div style={{ fontSize: 11, color: "#0B1020", opacity: 0.55 }}>Try it — Kumo signs offline.</div>
          </div>
          <button
            onClick={() => setAirplane(!airplane)}
            style={{
              width: 44,
              height: 26,
              borderRadius: 999,
              background: airplane ? "#C7B5FF" : "#C4CCD8",
              border: "none",
              cursor: "pointer",
              position: "relative",
              transition: "background 0.2s",
            }}
            aria-label="toggle airplane mode"
          >
            <span
              style={{
                position: "absolute",
                top: 3,
                left: airplane ? 21 : 3,
                width: 20,
                height: 20,
                borderRadius: 999,
                background: "#fff",
                boxShadow: "0 1px 3px rgba(0,0,0,0.2)",
                transition: "left 0.2s",
              }}
            />
          </button>
        </div>
      </div>

      <div style={{ padding: "16px 22px 24px", flexShrink: 0 }}>
        <PrimaryCTA onClick={() => onParse(text)} disabled={busy || !text.trim()}>
          {busy ? "Parsing…" : "Parse intent →"}
        </PrimaryCTA>
      </div>
      <PhoneHomeIndicator />
    </>
  )
}

function ScreenSign({ airplane, intent, busy, onSign }: ScreenProps) {
  const [holding, setHolding] = useState(false)
  const startHold = () => {
    setHolding(true)
    setTimeout(() => {
      setHolding(false)
      onSign()
    }, 700)
  }

  const recipient = intent?.recipient ?? "—"
  const amount = intent ? `$${intent.amount_usdc} USDC` : "—"
  const isPrivate = intent?.private ?? true

  return (
    <>
      <PhoneStatusBar airplane={airplane} />
      <CompactHeader airplane={airplane} />

      <div style={{ flex: 1, padding: "16px 22px 0", overflow: "auto" }}>
        <div style={{ display: "flex", alignItems: "flex-end", gap: 10, marginBottom: 18 }}>
          <KumoMascot size={72} expression="concentrating" />
          <div
            style={{
              background: "#fff",
              borderRadius: 16,
              padding: "10px 14px",
              boxShadow: "0 4px 12px rgba(11,16,32,0.08)",
              position: "relative",
              marginBottom: 6,
            }}
          >
            <div style={{ fontWeight: 600, fontSize: 14, color: "#0B1020" }}>I read it! Sign with your face?</div>
          </div>
        </div>

        <Eyebrow>02 — sign offline</Eyebrow>

        <div
          style={{
            marginTop: 8,
            background: "#fff",
            borderRadius: 18,
            padding: 18,
            border: "1px solid #B7F1FF",
            boxShadow: "0 1px 2px rgba(11,16,32,0.05)",
          }}
        >
          <Row k="To" v={recipient} />
          <Row k="Amount" v={amount} big />
          <RowPill
            k="Privacy"
            pill={
              <span
                style={{
                  background: isPrivate ? "#C7B5FF" : "#C4CCD8",
                  color: "#0B1020",
                  fontWeight: 800,
                  fontSize: 11,
                  padding: "4px 10px",
                  borderRadius: 999,
                }}
              >
                {isPrivate ? "🔒 Private mode" : "Public"}
              </span>
            }
          />
        </div>

        <div style={{ display: "flex", gap: 8, marginTop: 12, flexWrap: "wrap" }}>
          <Chip>💎 durable nonce</Chip>
          <Chip>📡 no rpc call</Chip>
          {isPrivate && <Chip lilac>🔒 confidential</Chip>}
        </div>

        <div
          style={{
            marginTop: 14,
            padding: 18,
            borderRadius: 18,
            background: "rgba(127,232,255,0.12)",
            border: "1.5px solid #B7F1FF",
            textAlign: "center",
          }}
        >
          <div style={{ display: "flex", justifyContent: "center", marginBottom: 8 }}>
            <FaceIdGlyph active={holding || busy} />
          </div>
          <div style={{ fontWeight: 700, fontSize: 15, color: "#0B1020" }}>Hold to sign with Face ID</div>
          <div style={{ fontSize: 12, color: "#0B1020", opacity: 0.6, marginTop: 4 }}>
            Your phone is offline. That&apos;s the point. ✨
          </div>
        </div>
      </div>

      <div style={{ padding: "14px 22px 22px", flexShrink: 0 }}>
        <PrimaryCTA onClick={startHold} disabled={busy || !intent}>
          {busy ? "Signing…" : holding ? "Signing…" : "Sign with Face ID"}
        </PrimaryCTA>
      </div>
      <PhoneHomeIndicator />
    </>
  )
}

function ScreenQueued({ intent, intentHash, busy, onBroadcast }: ScreenProps) {
  return (
    <>
      <PhoneStatusBar airplane />
      <CompactHeader airplane status="Airplane" />

      <div style={{ flex: 1, padding: "12px 22px 0", overflow: "auto" }}>
        <div style={{ display: "flex", justifyContent: "center", position: "relative", marginTop: 4 }}>
          <KumoMascot size={170} expression="sleeping" sleepZ />
        </div>

        <div
          className="font-display"
          style={{ fontWeight: 900, fontSize: 22, color: "#0B1020", textAlign: "center", marginTop: 4, letterSpacing: "-0.01em" }}
        >
          Resting until you reconnect…
        </div>
        <div style={{ fontSize: 13, color: "#0B1020", opacity: 0.55, textAlign: "center", marginTop: 6, lineHeight: 1.6, padding: "0 6px" }}>
          Your payment is sealed and safe. Kumo will deliver it the moment you&apos;re back online.
        </div>

        <div style={{ marginTop: 18 }}>
          <Eyebrow>03 — queued</Eyebrow>
          <div
            style={{
              marginTop: 8,
              background: "#fff",
              borderRadius: 18,
              padding: 18,
              border: "0.5px solid #B7F1FF",
              boxShadow: "0 1px 2px rgba(11,16,32,0.05)",
            }}
          >
            <span
              style={{
                background: "#C7B5FF",
                color: "#0B1020",
                fontWeight: 800,
                fontSize: 11,
                padding: "4px 10px",
                borderRadius: 999,
                display: "inline-block",
                marginBottom: 12,
              }}
            >
              🔒 Held
            </span>
            <Row k="Hash" v={intentHash ? `${intentHash.slice(0, 4)}…${intentHash.slice(-4)}` : "—"} />
            <Row k="Recipient" v={intent?.recipient ?? "—"} />
            <Row k="Status" v="Sealed offline" />
          </div>
          <div style={{ fontSize: 12, color: "#0B1020", opacity: 0.5, marginTop: 10, textAlign: "center" }}>
            You are offline. Nothing is leaving.
          </div>
        </div>
      </div>

      <div style={{ padding: "16px 22px 18px", flexShrink: 0, display: "flex", flexDirection: "column", gap: 8 }}>
        <PrimaryCTA onClick={onBroadcast} disabled={busy}>
          {busy ? "Broadcasting…" : "Reconnect & broadcast →"}
        </PrimaryCTA>
        <span className="text-center text-[11px] text-navy/50 font-semibold">
          Tap to simulate reconnect (devnet broadcast via MagicBlock)
        </span>
      </div>
      <PhoneHomeIndicator />
    </>
  )
}

function ScreenSettled({ intent, settlement, onReset }: ScreenProps) {
  const sig = settlement?.signature
  const sigShort = sig ? `${sig.slice(0, 4)}…${sig.slice(-4)}` : "—"
  const session = settlement?.sessionId ? `${settlement.sessionId.slice(0, 8)}…` : "—"

  return (
    <>
      <PhoneStatusBar />
      <CompactHeader />

      <div style={{ flex: 1, padding: "12px 22px 0", overflow: "auto" }}>
        <div style={{ display: "flex", justifyContent: "center", marginTop: 6 }}>
          <KumoMascot size={170} expression="celebrating" sparkles />
        </div>

        <div
          className="font-display"
          style={{ fontWeight: 900, fontSize: 28, color: "#0B1020", textAlign: "center", marginTop: 4, letterSpacing: "-0.02em" }}
        >
          Delivered! ✨
        </div>
        <div style={{ fontSize: 13, color: "#0B1020", opacity: 0.6, textAlign: "center", marginTop: 6, lineHeight: 1.6, padding: "0 4px" }}>
          Your payment is sealed and settled. The chain saw a heartbeat — nothing else.
        </div>

        <div style={{ marginTop: 18 }}>
          <Eyebrow>03 — arrived</Eyebrow>
          <div
            style={{
              marginTop: 8,
              background: "#fff",
              borderRadius: 18,
              padding: 18,
              border: "1px solid #7FE8FF",
              boxShadow: "0 1px 2px rgba(11,16,32,0.05)",
            }}
          >
            <span
              style={{
                background: "#7FE8FF",
                color: "#0B1020",
                fontWeight: 800,
                fontSize: 11,
                padding: "4px 10px",
                borderRadius: 999,
                display: "inline-block",
                marginBottom: 12,
              }}
            >
              ✨ Delivered
            </span>
            <Row k="Recipient" v={intent?.recipient ?? "—"} />
            <Row k="Amount" v={intent ? `$${intent.amount_usdc} USDC` : "—"} />
            <Row k="Signature" v={sigShort} />
            <Row k="Session" v={session} />
            {sig && (
              <a
                href={`https://solscan.io/tx/${sig}?cluster=devnet`}
                target="_blank"
                rel="noreferrer"
                style={{
                  color: "#0B1020",
                  fontWeight: 800,
                  fontSize: 13,
                  textDecoration: "none",
                  marginTop: 8,
                  display: "inline-block",
                  borderBottom: "1.5px solid #7FE8FF",
                  paddingBottom: 1,
                }}
              >
                View on Solscan ↗
              </a>
            )}
          </div>
          <div style={{ fontSize: 11, color: "#0B1020", opacity: 0.55, marginTop: 10, fontStyle: "italic", lineHeight: 1.5 }}>
            What&apos;s on the public chain? Just a heartbeat. Amount and recipient stay sealed in the rollup.
          </div>
        </div>
      </div>

      <div style={{ padding: "14px 22px 14px", flexShrink: 0, display: "flex", flexDirection: "column", gap: 8 }}>
        <PrimaryCTA onClick={onReset}>Send another payment 💖</PrimaryCTA>
        <Link href="/" style={{ display: "block" }}>
          <SecondaryCTA>Done</SecondaryCTA>
        </Link>
        <div style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: 6, marginTop: 4, fontSize: 11, fontWeight: 700, color: "#0B1020", opacity: 0.5 }}>
          <KumoMark size={16} /> kumopay.app · Built for Solana Mobile
        </div>
      </div>
      <PhoneHomeIndicator />
    </>
  )
}

// ─────────────────────────────────────────────────────────────
// Helpers
// ─────────────────────────────────────────────────────────────
function Row({ k, v, big }: { k: string; v: string; big?: boolean }) {
  return (
    <div
      style={{
        display: "flex",
        alignItems: "baseline",
        justifyContent: "space-between",
        padding: "6px 0",
        borderBottom: "0.5px dashed rgba(11,16,32,0.08)",
        gap: 8,
      }}
    >
      <span style={{ fontSize: 12, fontWeight: 700, color: "#0B1020", opacity: 0.5, letterSpacing: "0.04em" }}>{k}</span>
      <span style={{ fontSize: big ? 20 : 14, fontWeight: 800, color: "#0B1020", textAlign: "right", maxWidth: "60%", overflow: "hidden", textOverflow: "ellipsis" }}>
        {v}
      </span>
    </div>
  )
}

function RowPill({ k, pill }: { k: string; pill: ReactNode }) {
  return (
    <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "8px 0 2px" }}>
      <span style={{ fontSize: 12, fontWeight: 700, color: "#0B1020", opacity: 0.5, letterSpacing: "0.04em" }}>{k}</span>
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
        padding: "5px 12px",
        borderRadius: 999,
      }}
    >
      {children}
    </span>
  )
}

function FaceIdGlyph({ active }: { active?: boolean }) {
  const c = active ? "#7FE8FF" : "#0B1020"
  return (
    <svg width="44" height="44" viewBox="0 0 44 44" fill="none" stroke={c} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M6 14 V10 a4 4 0 014 -4 H14" />
      <path d="M30 6 H34 a4 4 0 014 4 V14" />
      <path d="M38 30 V34 a4 4 0 01-4 4 H30" />
      <path d="M14 38 H10 a4 4 0 01-4 -4 V30" />
      <path d="M16 18 V20" />
      <path d="M28 18 V20" />
      <path d="M22 18 V24 L20 25" />
      <path d="M16 28 q6 4 12 0" />
    </svg>
  )
}

function PhantomGlyph() {
  return (
    <svg width="22" height="22" viewBox="0 0 24 24" fill="#AB9FF2">
      <path d="M22 12c0 5.5-4.5 10-10 10S2 17.5 2 12 6.5 2 12 2s10 4.5 10 10zm-7 1.5c0 .8.6 1.5 1.5 1.5S17 14.3 17 13.5v-2c0-2.5-2-4.5-4.5-4.5h-3C7 7 5 9 5 11.5v.5c0 .3.2.5.5.5h2c.3 0 .5-.2.5-.5v-.5C8 10.1 9.1 9 10.5 9h3c1.4 0 2.5 1.1 2.5 2.5v2z" />
    </svg>
  )
}

function SolflareGlyph() {
  return (
    <svg width="22" height="22" viewBox="0 0 24 24">
      <circle cx="12" cy="12" r="5" fill="#FFB938" />
      <g stroke="#FC7A1E" strokeWidth="1.5" strokeLinecap="round">
        <line x1="12" y1="2" x2="12" y2="5" />
        <line x1="12" y1="19" x2="12" y2="22" />
        <line x1="2" y1="12" x2="5" y2="12" />
        <line x1="19" y1="12" x2="22" y2="12" />
        <line x1="5" y1="5" x2="7" y2="7" />
        <line x1="17" y1="17" x2="19" y2="19" />
        <line x1="19" y1="5" x2="17" y2="7" />
        <line x1="7" y1="17" x2="5" y2="19" />
      </g>
    </svg>
  )
}

function BackpackGlyph() {
  return (
    <svg width="22" height="22" viewBox="0 0 24 24" fill="#E33E3F">
      <rect x="5" y="7" width="14" height="13" rx="3" />
      <path d="M9 7 V5 a3 3 0 016 0 V7" stroke="#E33E3F" strokeWidth="2" fill="none" />
      <rect x="9" y="12" width="6" height="3" fill="#fff" />
    </svg>
  )
}

function CloudTinyGlyph({ color = "#C7B5FF" }: { color?: string }) {
  return (
    <svg width="14" height="10" viewBox="0 0 20 14">
      <path
        d="M3 11 c0 -3 3 -5 6 -4 c1 -2.5 5 -3 6 -1 c2.5 0 4 2 3 4 c1 1 0 3 -1.5 3 l-12 0 c-2 0 -2 -1 -1.5 -2 z"
        fill={color}
      />
    </svg>
  )
}
