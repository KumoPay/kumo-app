"use client"

import Image from "next/image"
import { Eyebrow, PrimaryCTA, Row, SecondaryCTA } from "./atoms"
import type { ScreenRenderer } from "./types"

export const Settled: ScreenRenderer = (ctx) => {
  const intent = ctx.parsedIntent
  const settle = ctx.settlement
  const sig = settle?.signature
  return {
    eyebrow: "05 — delivered",
    body: (
      <div>
        <div className="flex justify-center mt-1">
          <Image
            src="/state-05.png"
            alt="Kumo celebrating"
            width={170}
            height={170}
            priority
            style={{ width: 170, height: 170, objectFit: "contain" }}
          />
        </div>
        <div className="font-display font-black text-navy text-[26px] text-center mt-2 tracking-[-0.02em]">
          Delivered! ✨
        </div>
        <div className="text-[12px] text-navy/60 text-center mt-1 leading-relaxed px-2">
          On-chain on devnet via MagicBlock.
        </div>

        <div className="mt-5">
          <Eyebrow>arrived</Eyebrow>
          <div className="mt-2 bg-white rounded-2xl p-4 border border-cyan">
            <span
              className="inline-block px-2.5 py-1 rounded-full font-extrabold text-[10px] text-navy mb-3"
              style={{ background: "#7FE8FF" }}
            >
              ✨ Delivered
            </span>
            <Row k="Recipient" v={intent?.recipient ?? "—"} />
            <Row k="Amount" v={intent ? `$${intent.amount_usdc} USDC` : "—"} />
            <Row
              k="Signature"
              v={sig ? `${sig.slice(0, 6)}…${sig.slice(-4)}` : "—"}
            />
            <Row
              k="Validator"
              v={settle?.validator ? `${settle.validator.slice(0, 8)}…` : "base RPC"}
            />
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
        </div>
      </div>
    ),
    cta: (
      <div className="flex flex-col gap-2">
        <PrimaryCTA onClick={ctx.resetHome}>Send another payment 💖</PrimaryCTA>
        <SecondaryCTA onClick={ctx.resetHome}>Done</SecondaryCTA>
      </div>
    ),
  }
}
