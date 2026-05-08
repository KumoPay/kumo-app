"use client"

import { useEffect, useMemo, useRef, useState } from "react"
import type { PaymentIntent } from "@kumo/shared"

/**
 * Kumo — single-page state machine.
 *
 * STATES:
 *   idle      → no intent yet
 *   parsing   → calling /api/parse-intent (QVAC, on-device)
 *   parsed    → intent visible, ready to sign
 *   signing   → calling /api/build-tx (offline, durable nonce)
 *   signed    → tx in localStorage, waiting for reconnect
 *   broadcasting → calling /api/broadcast (MagicBlock PER)
 *   settled   → done; show signature + session id
 *
 * Network status (online/offline) is read from navigator.onLine
 * and updated via 'online'/'offline' events. The status indicator
 * turning red the moment Wi-Fi disconnects is the demo's drama.
 */

type Phase = "idle" | "parsing" | "parsed" | "signing" | "signed" | "broadcasting" | "settled" | "error"

const DEMO_RECIPIENT_MAP: Record<string, string> = {
  // Resolves friendly names → Solana pubkey. In production this is encrypted
  // contact storage. For the demo we ship two devnet pubkeys.
  maria: "Marian1y6E1t4fzAU9w1pHUv4PbRctSkzQK9wyfVGJoP",
  javier: "Javb98z7oN2YtLuufvmksUqK7XK9CdNWnehkFaR2cR9",
}

export default function HomePage() {
  const [online, setOnline] = useState(true)
  const [phase, setPhase] = useState<Phase>("idle")
  const [text, setText] = useState("pay maria 50 usdc privately")
  const [intent, setIntent] = useState<PaymentIntent | null>(null)
  const [signedTxB58, setSignedTxB58] = useState<string | null>(null)
  const [intentHash, setIntentHash] = useState<string | null>(null)
  const [settlement, setSettlement] = useState<{ signature: string; sessionId: string } | null>(null)
  const [errorMsg, setErrorMsg] = useState<string | null>(null)
  const [logLines, setLogLines] = useState<string[]>([])
  const logRef = useRef<HTMLDivElement | null>(null)

  // --- Online/offline tracking -------------------------------------------
  useEffect(() => {
    const update = () => setOnline(typeof navigator !== "undefined" ? navigator.onLine : true)
    update()
    window.addEventListener("online", update)
    window.addEventListener("offline", update)
    return () => {
      window.removeEventListener("online", update)
      window.removeEventListener("offline", update)
    }
  }, [])

  // --- Restore persisted state on mount ---------------------------------
  useEffect(() => {
    try {
      const tx = localStorage.getItem("kumo:pending-tx")
      const it = localStorage.getItem("kumo:pending-intent")
      const ih = localStorage.getItem("kumo:pending-intent-hash")
      if (tx && it) {
        setSignedTxB58(tx)
        setIntent(JSON.parse(it))
        setIntentHash(ih)
        setPhase("signed")
        log("RECOVERED pending tx from local cache")
      }
    } catch {}
  }, [])

  function log(line: string) {
    setLogLines((prev) => [...prev.slice(-30), `[${new Date().toLocaleTimeString()}] ${line}`])
    queueMicrotask(() => {
      logRef.current?.scrollTo({ top: 99999 })
    })
  }

  // --- Demo nonce cache ---------------------------------------------------
  // For the prototype we ship a faux nonce so /api/build-tx works without
  // a real devnet round-trip. Replace with output of the online setup flow
  // (see README → `Setup`).
  const fauxNonce = useMemo(
    () => ({
      noncePubkey: "NoNcEAccnt1111111111111111111111111111111111",
      nonce: "11111111111111111111111111111111",
      authorityPubkey: "AutHor1tY1111111111111111111111111111111111",
      refreshedAt: Date.now(),
    }),
    [],
  )

  // --- Actions -----------------------------------------------------------

  async function onParse() {
    setErrorMsg(null)
    setPhase("parsing")
    log("PARSE → POST /api/parse-intent (QVAC, localhost:11434)")
    try {
      const r = await fetch("/api/parse-intent", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ text }),
      })
      const j = await r.json()
      if (!j.ok) throw new Error(j.error)
      setIntent(j.intent)
      setPhase("parsed")
      log(`OK → intent parsed: ${JSON.stringify(j.intent)}`)
    } catch (e) {
      setErrorMsg(e instanceof Error ? e.message : "parse failed")
      setPhase("error")
      log("ERR → " + (e instanceof Error ? e.message : "parse failed"))
    }
  }

  async function onSign() {
    if (!intent) return
    setErrorMsg(null)
    setPhase("signing")
    log("SIGN → POST /api/build-tx (offline, durable nonce)")
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
      localStorage.setItem("kumo:pending-tx", j.signed_tx_b58)
      localStorage.setItem("kumo:pending-intent", JSON.stringify(intent))
      localStorage.setItem("kumo:pending-intent-hash", j.intent_hash)
      setPhase("signed")
      log(`OK → tx signed, hash=${j.intent_hash.slice(0, 16)}…`)
    } catch (e) {
      setErrorMsg(e instanceof Error ? e.message : "sign failed")
      setPhase("error")
      log("ERR → " + (e instanceof Error ? e.message : "sign failed"))
    }
  }

  async function onBroadcast() {
    if (!intent || !signedTxB58) return
    setErrorMsg(null)
    setPhase("broadcasting")
    log("BROADCAST → POST /api/broadcast (MagicBlock PER)")
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
      setPhase("settled")
      localStorage.removeItem("kumo:pending-tx")
      localStorage.removeItem("kumo:pending-intent")
      localStorage.removeItem("kumo:pending-intent-hash")
      log(`OK → settled. sig=${j.signature.slice(0, 16)}…`)
    } catch (e) {
      setErrorMsg(e instanceof Error ? e.message : "broadcast failed")
      setPhase("error")
      log("ERR → " + (e instanceof Error ? e.message : "broadcast failed"))
    }
  }

  function reset() {
    setIntent(null)
    setSignedTxB58(null)
    setIntentHash(null)
    setSettlement(null)
    setErrorMsg(null)
    setPhase("idle")
    localStorage.removeItem("kumo:pending-tx")
    localStorage.removeItem("kumo:pending-intent")
    localStorage.removeItem("kumo:pending-intent-hash")
  }

  // --- Render ------------------------------------------------------------

  return (
    <main className="crt min-h-screen px-6 md:px-14 py-10">
      {/* HEADER */}
      <header className="flex items-baseline justify-between gap-6 pb-6 rule mb-8">
        <div>
          <div className="text-[10px] tracking-[0.4em] text-ghost mb-1">// KUMO ↯ <span className="text-signal">雲</span> v0.1</div>
          <h1 className="font-display text-3xl md:text-5xl leading-none">
            offline.<span className="text-signal">confidential.</span>cross-chain.
          </h1>
        </div>
        <NetworkBadge online={online} />
      </header>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
        {/* LEFT: the action column */}
        <section className="lg:col-span-7 space-y-8">
          {/* INTENT INPUT */}
          <Step n="01" label="Speak the intent" active={phase === "idle" || phase === "parsing"}>
            <textarea
              value={text}
              onChange={(e) => setText(e.target.value)}
              rows={3}
              className="w-full bg-transparent border border-[#27241e] focus:border-signal outline-none p-4 font-mono text-lg resize-none"
              placeholder="pay maria 50 usdc privately"
              spellCheck={false}
            />
            <div className="flex items-center gap-3 mt-3 text-xs text-ghost">
              <span className="badge">qvac · llama-3.2-1b</span>
              <span className="badge">on-device</span>
              <span className="badge">↯ no egress</span>
            </div>
            <button
              onClick={onParse}
              disabled={phase === "parsing" || !text.trim()}
              className="mt-6 group inline-flex items-center gap-3 border border-paper px-6 py-3 hover:bg-signal hover:border-signal hover:text-ink transition-colors disabled:opacity-30"
            >
              <span className="font-display tracking-widest">{phase === "parsing" ? "PARSING…" : "PARSE INTENT"}</span>
              <span className="group-hover:translate-x-1 transition-transform">→</span>
            </button>
          </Step>

          {/* PARSED INTENT */}
          {intent && (
            <Step n="02" label="Sign offline" active={phase === "parsed" || phase === "signing"}>
              <pre className="bg-[#0d0e0f] border border-[#27241e] p-4 text-sm text-paper overflow-x-auto">
{JSON.stringify(intent, null, 2)}
              </pre>
              <div className="flex flex-wrap items-center gap-3 mt-3 text-xs">
                <span className="badge">durable nonce</span>
                <span className="badge">no rpc call</span>
                {intent.private && <span className="badge text-signal border-signal">PRIVATE</span>}
              </div>
              <button
                onClick={onSign}
                disabled={phase === "signing" || !!signedTxB58}
                className="mt-6 inline-flex items-center gap-3 border border-paper px-6 py-3 hover:bg-signal hover:border-signal hover:text-ink transition-colors disabled:opacity-30"
              >
                <span className="font-display tracking-widest">
                  {phase === "signing" ? "SIGNING…" : signedTxB58 ? "SIGNED ✓" : "SIGN OFFLINE"}
                </span>
              </button>
            </Step>
          )}

          {/* PENDING / BROADCAST */}
          {signedTxB58 && (
            <Step n="03" label="Broadcast on reconnect" active={phase === "signed" || phase === "broadcasting" || phase === "settled"}>
              <div className="space-y-2 text-sm text-ghost">
                <div className="flex items-center gap-2">
                  <span className="text-paper">tx hash</span>
                  <code className="text-signal break-all">{intentHash?.slice(0, 32)}…</code>
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-paper">tx bytes</span>
                  <code className="break-all">{signedTxB58.slice(0, 48)}…</code>
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-paper">status</span>
                  {phase === "settled" ? (
                    <span className="text-signal">SETTLED via MagicBlock PER</span>
                  ) : online ? (
                    <span className="animate-pulse-soft">READY — awaiting your tap to broadcast</span>
                  ) : (
                    <span className="text-signal">QUEUED — waiting for reconnect</span>
                  )}
                </div>
              </div>

              <div className="flex gap-3 mt-6">
                <button
                  onClick={onBroadcast}
                  disabled={!online || phase === "broadcasting" || phase === "settled"}
                  className="inline-flex items-center gap-3 border border-signal text-signal px-6 py-3 hover:bg-signal hover:text-ink transition-colors disabled:opacity-30 disabled:hover:bg-transparent disabled:hover:text-signal"
                >
                  <span className="font-display tracking-widest">
                    {phase === "broadcasting"
                      ? "BROADCASTING…"
                      : phase === "settled"
                      ? "SETTLED ✓"
                      : "BROADCAST"}
                  </span>
                </button>
                {phase === "settled" && (
                  <button onClick={reset} className="px-6 py-3 text-ghost hover:text-paper transition-colors">
                    new payment ↻
                  </button>
                )}
              </div>

              {settlement && (
                <div className="mt-6 border-l-2 border-signal pl-4 text-sm">
                  <div><span className="text-ghost">signature:</span> <code>{settlement.signature}</code></div>
                  <div><span className="text-ghost">session:</span> <code>{settlement.sessionId}</code></div>
                  <div className="text-ghost mt-2">
                    public chain shows: nonceAdvance + 1-lamport placeholder. amount &amp; recipient sealed inside MagicBlock&apos;s PER (Intel TDX).
                  </div>
                </div>
              )}
            </Step>
          )}

          {/* CROSS-CHAIN */}
          <Step n="—" label="Fund from Base (LI.FI)" active={false}>
            <p className="text-ghost text-sm leading-relaxed max-w-prose">
              No Solana balance? Bridge USDC from Base. Settlement takes 60s–4min via Mayan/CCTP — the demo shows
              the route &amp; receipt; final landing happens off-camera.
            </p>
            <button
              disabled
              className="mt-4 inline-flex items-center gap-3 border border-[#27241e] text-ghost px-6 py-3 cursor-not-allowed"
            >
              <span className="font-display tracking-widest">FUND FROM BASE</span>
              <span className="text-[10px] uppercase tracking-widest">stub</span>
            </button>
          </Step>
        </section>

        {/* RIGHT: the diagnostic column */}
        <aside className="lg:col-span-5 space-y-6">
          <div className="border border-[#27241e] p-5">
            <div className="flex items-center justify-between mb-3">
              <span className="text-[10px] tracking-[0.3em] text-ghost">// FLIGHT LOG</span>
              <span className={`text-[10px] tracking-[0.3em] ${online ? "text-paper" : "text-signal animate-pulse-soft"}`}>
                {online ? "↑ ONLINE" : "↓ OFFLINE"}
              </span>
            </div>
            <div ref={logRef} className="h-72 overflow-y-auto text-[12px] leading-relaxed font-mono text-ghost space-y-1">
              {logLines.length === 0 && <div className="opacity-50">no events yet · type an intent &amp; press parse</div>}
              {logLines.map((l, i) => (
                <div key={i} className="whitespace-pre-wrap">{l}</div>
              ))}
            </div>
          </div>

          <div className="border border-[#27241e] p-5 text-[12px] leading-relaxed">
            <div className="text-[10px] tracking-[0.3em] text-ghost mb-3">// PRIMITIVES</div>
            <ul className="space-y-2">
              <li><span className="text-signal">QVAC</span> · on-device intent parser, OpenAI-compatible HTTP @ <code>localhost:11434</code></li>
              <li><span className="text-signal">DURABLE NONCE</span> · sign while offline, broadcast on reconnect</li>
              <li><span className="text-signal">MAGICBLOCK PER</span> · TEE-backed confidential settlement (Intel TDX)</li>
              <li><span className="text-signal">LI.FI</span> · cross-chain inbound (Base → Solana via Mayan/CCTP)</li>
              <li><span className="text-signal">ANCHOR</span> · intent commitment + post-settlement receipt</li>
            </ul>
          </div>

          {errorMsg && (
            <div className="border border-signal text-signal p-4 text-sm">
              <div className="text-[10px] tracking-[0.3em] mb-2">// ERROR</div>
              {errorMsg}
            </div>
          )}
        </aside>
      </div>

      <footer className="mt-16 pt-6 rule flex items-center justify-between text-[11px] text-ghost">
        <span>↯ devnet · 72-hour build · Dev3Pack 2026 + Solana Frontier sidetracks</span>
        <span className="animate-blink">█</span>
      </footer>
    </main>
  )
}

// --- helpers --------------------------------------------------------------

function Step(props: { n: string; label: string; active: boolean; children: React.ReactNode }) {
  return (
    <div className={`border-l-2 pl-6 transition-colors ${props.active ? "border-signal" : "border-[#27241e]"}`}>
      <div className="flex items-baseline gap-3 mb-3">
        <span className="font-display text-2xl text-ghost">{props.n}</span>
        <span className="text-[10px] tracking-[0.4em] text-ghost uppercase">{props.label}</span>
      </div>
      {props.children}
    </div>
  )
}

function NetworkBadge({ online }: { online: boolean }) {
  return (
    <div className={`flex items-center gap-3 border px-3 py-2 ${online ? "border-paper" : "border-signal text-signal"}`}>
      <span className={`block w-2 h-2 rounded-full ${online ? "bg-paper" : "bg-signal animate-pulse-soft"}`} />
      <span className="text-[11px] tracking-[0.3em] uppercase">
        {online ? "online" : "offline / airplane mode"}
      </span>
    </div>
  )
}
