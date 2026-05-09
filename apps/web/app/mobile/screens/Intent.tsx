"use client"

import Image from "next/image"
import { useState } from "react"
import { Chip, Eyebrow, PrimaryCTA } from "./atoms"
import type { NavCtx, ScreenRenderer } from "./types"

export const Intent: ScreenRenderer = (ctx) => ({
  eyebrow: "02 — intent",
  body: <IntentBody ctx={ctx} />,
  cta: (
    <PrimaryCTA
      disabled={ctx.busy || !ctx.intentText.trim()}
      onClick={() => void ctx.parseIntent()}
    >
      {ctx.busy ? "Parsing…" : "Parse intent →"}
    </PrimaryCTA>
  ),
})

function IntentBody({ ctx }: { ctx: NavCtx }) {
  const [listening, setListening] = useState(false)

  return (
    <div>
      <div className="flex items-end gap-3 mb-4">
        <Image
          src="/state-00.png"
          alt=""
          width={72}
          height={72}
          style={{ width: 72, height: 72, objectFit: "contain" }}
        />
        <div className="bg-white rounded-2xl px-3 py-2 mb-1 softshadow-sm">
          <div className="font-semibold text-[13px] text-navy">
            What payment, friend?
          </div>
        </div>
      </div>

      {ctx.wallet && (
        <div className="inline-flex items-center gap-2 bg-sky/50 px-3 py-1.5 rounded-full text-[11px] font-bold text-navy mb-3">
          <span className="w-1.5 h-1.5 rounded-full bg-cyan" />
          {ctx.wallet.label} ·{" "}
          <span className="font-mono">
            {ctx.wallet.pubkey.slice(0, 5)}…{ctx.wallet.pubkey.slice(-4)}
          </span>
        </div>
      )}

      <Eyebrow>your intent</Eyebrow>

      <div className="relative mt-2">
        <textarea
          value={ctx.intentText}
          onChange={(e) => ctx.setIntentText(e.target.value)}
          rows={3}
          placeholder="pay alice 1 usdc privately"
          className="w-full p-4 pr-16 rounded-2xl bg-white outline-none resize-none text-[16px] text-navy softshadow-sm border-[1.5px] border-transparent focus:border-cyan transition"
          style={{ minHeight: 96 }}
        />
        <button
          onClick={() => setListening((v) => !v)}
          aria-label={listening ? "Stop recording" : "Start voice input"}
          className={[
            "pressable absolute right-3 bottom-3 w-11 h-11 rounded-full flex items-center justify-center",
            listening ? "kumo-mic-pulse" : "",
          ].join(" ")}
          style={{
            background: listening ? "#C7B5FF" : "#7FE8FF",
            boxShadow: listening
              ? "0 0 0 0 rgba(199,181,255,0.7)"
              : "0 6px 18px rgba(127,232,255,0.45)",
            border: "none",
          }}
        >
          {listening ? <StopIcon /> : <MicIcon />}
        </button>
      </div>

      <div className="mt-2 min-h-[18px] flex items-center gap-2">
        {listening && (
          <span className="inline-flex items-center gap-1.5 text-[11px] font-bold tracking-[0.18em] uppercase text-lilac">
            <span
              className="w-1.5 h-1.5 rounded-full"
              style={{ background: "#C7B5FF" }}
            />
            Listening… (voice input is a UI demo today)
          </span>
        )}
      </div>

      <div className="flex flex-wrap gap-1.5 mt-2">
        <Chip>🤖 qvac on-device</Chip>
        <Chip>🔒 no leaks</Chip>
        <Chip lilac>🎙 voice</Chip>
        {ctx.airplane && <Chip lilac>✈ airplane mode</Chip>}
      </div>

      {ctx.error && (
        <div className="mt-3 p-3 rounded-xl bg-white border border-lilac/60 text-[12px] text-navy/80 leading-relaxed">
          <div className="font-bold uppercase tracking-[0.18em] text-[10px] mb-1 text-lilac">// error</div>
          {ctx.error}
        </div>
      )}
    </div>
  )
}

function MicIcon() {
  return (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" aria-hidden>
      <rect x="9" y="3" width="6" height="11" rx="3" stroke="#0B1020" strokeWidth="2" />
      <path
        d="M5 11a7 7 0 0 0 14 0M12 18v3M9 21h6"
        stroke="#0B1020"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  )
}

function StopIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" aria-hidden>
      <rect x="6" y="6" width="12" height="12" rx="2" fill="#0B1020" />
    </svg>
  )
}
