"use client"

import { useState } from "react"

import type { NavCtx, ScreenRenderer } from "./types"

export const Intent: ScreenRenderer = (ctx) => ({
  body: <IntentBody ctx={ctx} />,
  cta: (
    <div className="mx-auto w-full max-w-[320px]">
      <button
        type="button"
        disabled={ctx.busy || !ctx.intentText.trim()}
        onClick={() => void ctx.parseIntent()}
        className="pressable mx-auto flex w-full items-center justify-center rounded-[18px] py-[17px] font-display text-[16px] font-bold text-white outline-none disabled:opacity-60 disabled:cursor-not-allowed"
        style={{
          background: "#7c5cff",
          border: "none",
          boxShadow: "0 12px 28px -6px rgba(124,92,255,0.5)",
        }}
      >
        {ctx.busy ? "Parsing…" : "Create intent"}
      </button>
    </div>
  ),
})

function IntentBody({ ctx }: { ctx: NavCtx }) {
  const [listening, setListening] = useState(false)

  const toggleVoice = () => setListening((v) => !v)

  return (
    <div className="mx-auto w-full max-w-[320px] pb-2">
      <h1 className="font-display text-[28px] font-black leading-tight tracking-[-0.03em] text-[#0f172a]">
        New payment
      </h1>
      <p className="mt-2 text-[14px] font-medium leading-snug text-[#6b7280]">
        Describe the payment in plain language.
      </p>

      <div className="relative mt-6 rounded-[24px] border border-black/[0.04] bg-white p-4 shadow-[0_10px_36px_-14px_rgba(15,23,42,0.12)]">
        <textarea
          value={ctx.intentText}
          onChange={(e) => ctx.setIntentText(e.target.value)}
          rows={4}
          placeholder="pay alice 1 usdc privately"
          className="min-h-[112px] w-full resize-none bg-transparent font-display text-[16px] font-semibold leading-relaxed text-[#111827] outline-none placeholder:text-[#94a3b8]"
        />
        <div className="mt-3 flex items-center justify-between gap-3">
          <button
            type="button"
            onClick={() => ctx.push("contacts")}
            className="pressable inline-flex items-center gap-2 rounded-full border border-[#c4b5fd]/80 bg-[#ede9fe]/80 px-3 py-2 text-[12px] font-bold text-[#131b34] outline-none ring-offset-2 focus-visible:ring-2 focus-visible:ring-[#7c5cff]"
          >
            <IconUserSmall />
            Choose contact
          </button>
          <button
            type="button"
            onClick={toggleVoice}
            aria-label={listening ? "Stop dictation" : "Voice dictation"}
            aria-pressed={listening}
            className={[
              "pressable flex h-11 w-11 shrink-0 items-center justify-center rounded-full outline-none",
              listening ? "kumo-mic-pulse" : "",
            ].join(" ")}
            style={{
              background: listening ? "#C7B5FF" : "#dbefff",
              boxShadow: listening
                ? "0 0 0 0 rgba(199,181,255,0.5)"
                : "0 4px 14px rgba(59,130,246,0.18)",
            }}
          >
            {listening ? <StopIcon /> : <MicIcon />}
          </button>
        </div>
      </div>

      <div className="mt-4 flex flex-wrap gap-2">
        <button
          type="button"
          onClick={() => ctx.setAirplane(!ctx.airplane)}
          className="pressable inline-flex items-center gap-1.5 rounded-full px-3 py-2 text-[11px] font-extrabold text-[#131b34]"
          style={{
            background: ctx.airplane ? "rgba(199,181,255,0.55)" : "rgba(237,233,254,0.95)",
            boxShadow: ctx.airplane ? "inset 0 0 0 1.5px #a78bfa" : "none",
          }}
        >
          <IconWifiOff />
          offline
        </button>
        <span
          className="inline-flex items-center gap-1.5 rounded-full px-3 py-2 text-[11px] font-extrabold text-[#131b34]"
          style={{ background: "rgba(186, 230, 253, 0.65)" }}
        >
          <IconLockSmall />
          private
        </span>
        <button
          type="button"
          onClick={toggleVoice}
          className="pressable inline-flex items-center gap-1.5 rounded-full px-3 py-2 text-[11px] font-extrabold text-[#131b34]"
          style={{
            background: listening ? "rgba(199,181,255,0.55)" : "rgba(237,233,254,0.95)",
            boxShadow: listening ? "inset 0 0 0 1.5px #a78bfa" : "none",
          }}
        >
          <IconMicSmall />
          voice
        </button>
      </div>

      {listening ? (
        <p className="mt-2 text-center text-[11px] font-bold uppercase tracking-[0.14em] text-[#7c5cff]">
          Listening… (voice input is a UI demo today)
        </p>
      ) : null}

      <div className="mt-8 flex gap-3 rounded-[20px] border border-[#eef0f3] bg-white p-4 shadow-[0_4px_20px_-8px_rgba(15,23,42,0.08)]">
        <div
          className="flex size-11 shrink-0 items-center justify-center rounded-full"
          style={{ background: "#dbefff" }}
        >
          <IconLockPrivacy />
        </div>
        <div className="min-w-0 flex-1">
          <p className="font-display text-[15px] font-black leading-tight tracking-[-0.02em] text-[#131b34]">
            Private by default
          </p>
          <p className="mt-1.5 text-[13px] font-medium leading-snug text-[#6b7280]">
            Kumo protects your metadata by default. No one can see what you pay or to whom.
          </p>
        </div>
      </div>

      {ctx.error ? (
        <div className="mt-3 rounded-xl border border-lilac/60 bg-white p-3 text-[12px] leading-relaxed text-navy/80">
          <div className="mb-1 text-[10px] font-bold uppercase tracking-[0.18em] text-lilac">
            // error
          </div>
          {ctx.error}
        </div>
      ) : null}
    </div>
  )
}

function IconUserSmall() {
  return (
    <svg width={16} height={16} viewBox="0 0 24 24" fill="none" aria-hidden>
      <path
        d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2M12 11a4 4 0 1 0 0-8 4 4 0 0 0 0 8z"
        stroke="#131b34"
        strokeWidth={1.8}
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  )
}

function MicIcon() {
  return (
    <svg width={20} height={20} viewBox="0 0 24 24" fill="none" aria-hidden>
      <rect x="9" y="3" width="6" height="11" rx="3" stroke="#0f172a" strokeWidth="2" />
      <path
        d="M5 11a7 7 0 0 0 14 0M12 18v3M9 21h6"
        stroke="#0f172a"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  )
}

function StopIcon() {
  return (
    <svg width={16} height={16} viewBox="0 0 24 24" aria-hidden>
      <rect x="6" y="6" width="12" height="12" rx="2" fill="#0f172a" />
    </svg>
  )
}

function IconWifiOff() {
  return (
    <svg width={14} height={14} viewBox="0 0 24 24" fill="none" aria-hidden>
      <path
        d="M1 1l22 22M16.72 11.06a10.94 10.94 0 0 1 1.74 2.12M21 8.5a15.88 15.88 0 0 1-2.35 2.35M5 14.17A10.94 10.94 0 0 1 8.5 12m3.64-1.29c.24-.1.49-.18.76-.23M12 20h.01M8.53 16.53A6 6 0 0 1 12 15"
        stroke="currentColor"
        strokeWidth={1.75}
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  )
}

function IconLockSmall() {
  return (
    <svg width={14} height={14} viewBox="0 0 24 24" fill="none" aria-hidden>
      <rect x={5} y={11} width={14} height={10} rx={2} stroke="currentColor" strokeWidth={1.75} />
      <path
        d="M8 11V7a4 4 0 0 1 8 0v4"
        stroke="currentColor"
        strokeWidth={1.75}
        strokeLinecap="round"
      />
    </svg>
  )
}

function IconMicSmall() {
  return (
    <svg width={14} height={14} viewBox="0 0 24 24" fill="none" aria-hidden>
      <rect x={9} y={2} width={6} height={11} rx={3} stroke="currentColor" strokeWidth={1.75} />
      <path
        d="M19 10v1a7 7 0 0 1-14 0v-1M12 18v4M9 22h6"
        stroke="currentColor"
        strokeWidth={1.75}
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  )
}

function IconLockPrivacy() {
  return (
    <svg width={22} height={22} viewBox="0 0 24 24" fill="none" aria-hidden>
      <rect x={5} y={11} width={14} height={10} rx={2} stroke="#0369a1" strokeWidth={1.85} />
      <path
        d="M8 11V7a4 4 0 0 1 8 0v4"
        stroke="#0369a1"
        strokeWidth={1.85}
        strokeLinecap="round"
      />
    </svg>
  )
}
