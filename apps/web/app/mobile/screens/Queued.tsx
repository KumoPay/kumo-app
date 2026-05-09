"use client"

import Image from "next/image"
import { Eyebrow, PrimaryCTA, Row } from "./atoms"
import type { ScreenRenderer } from "./types"

export const Queued: ScreenRenderer = (ctx) => {
  const intent = ctx.parsedIntent
  const hash = ctx.intentHash
  const sig = ctx.offlineSig
  return {
    eyebrow: "04 — queued",
    body: (
      <div>
        <div className="flex justify-center mt-1">
          <Image
            src="/state-03.png"
            alt="Kumo sleeping"
            width={170}
            height={170}
            priority
            style={{ width: 170, height: 170, objectFit: "contain" }}
          />
        </div>
        <div className="font-display font-black text-navy text-[20px] text-center mt-2 tracking-[-0.01em]">
          Resting until you reconnect…
        </div>
        <div className="text-[12px] text-navy/60 text-center mt-1 leading-relaxed px-2">
          Intent is signed and held. Tap reconnect when you&apos;re back online.
        </div>

        <div className="mt-5">
          <Eyebrow>held</Eyebrow>
          <div className="mt-2 bg-white rounded-2xl p-4 border border-sky/60">
            <span
              className="inline-block px-2.5 py-1 rounded-full font-extrabold text-[10px] text-navy mb-3"
              style={{ background: "#C7B5FF" }}
            >
              🔒 Held
            </span>
            <Row
              k="Hash"
              v={hash ? `${hash.slice(0, 6)}…${hash.slice(-4)}` : "—"}
            />
            <Row k="Recipient" v={intent?.recipient ?? "—"} />
            <Row
              k="Offline sig"
              v={sig ? `${sig.slice(0, 6)}…${sig.slice(-4)}` : "—"}
            />
          </div>
          <div className="text-[11px] text-navy/55 text-center mt-2">
            You are offline. Nothing is leaving.
          </div>
        </div>

        {ctx.error && (
          <div className="mt-3 p-3 rounded-xl bg-white border border-lilac/60 text-[12px] text-navy/80 leading-relaxed">
            <div className="font-bold uppercase tracking-[0.18em] text-[10px] mb-1 text-lilac">// error</div>
            {ctx.error}
          </div>
        )}
      </div>
    ),
    cta: (
      <PrimaryCTA disabled={ctx.busy} onClick={() => void ctx.broadcast()}>
        {ctx.busy ? "Broadcasting…" : "Reconnect & broadcast →"}
      </PrimaryCTA>
    ),
  }
}
