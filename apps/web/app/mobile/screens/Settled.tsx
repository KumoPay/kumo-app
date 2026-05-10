"use client"

import Image from "next/image"
import type { ReactNode } from "react"

import type { ScreenRenderer } from "./types"

const blue = "#0284c7"
const brandPurple = "#7B61FF"

function IconBadge({
  bg,
  children,
}: {
  bg: string
  children: ReactNode
}) {
  return (
    <div
      className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full"
      style={{ background: bg }}
    >
      {children}
    </div>
  )
}

function IconUser() {
  return (
    <svg width={18} height={18} viewBox="0 0 24 24" fill="none" aria-hidden>
      <circle cx="12" cy="8" r="3.25" stroke={blue} strokeWidth={1.75} />
      <path
        d="M6 20c0-3.3 2.7-6 6-6s6 2.7 6 6"
        stroke={blue}
        strokeWidth={1.75}
        strokeLinecap="round"
      />
    </svg>
  )
}

function IconDollar() {
  return (
    <svg width={18} height={18} viewBox="0 0 24 24" fill="none" aria-hidden>
      <path
        d="M12 4v16M15 8.5c0-1.38-1.34-2.5-3-2.5S9 7.12 9 8.5s1.34 2.5 3 2.5 3 1.12 3 2.5-1.34 2.5-3 2.5-3-1.12-3-2.5"
        stroke={blue}
        strokeWidth={2}
        strokeLinecap="round"
      />
    </svg>
  )
}

function IconPen() {
  return (
    <svg width={18} height={18} viewBox="0 0 24 24" fill="none" aria-hidden>
      <path
        d="M12 20h9M16.5 3.5a2.12 2.12 0 013 3L8 18l-4 1 1-4L16.5 3.5z"
        stroke={blue}
        strokeWidth={1.75}
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  )
}

function DetailLine({
  iconBadge,
  label,
  value,
}: {
  iconBadge: ReactNode
  label: string
  value: ReactNode
}) {
  return (
    <div className="flex items-center justify-between gap-3 border-b border-[#f1f5f9] py-3.5 last:border-b-0">
      <div className="flex min-w-0 flex-1 items-center gap-3">
        {iconBadge}
        <span className="text-[13px] font-semibold text-[#64748b]">{label}</span>
      </div>
      <div className="min-w-0 max-w-[min(168px,52%)] shrink-0 text-right">
        {value}
      </div>
    </div>
  )
}

export const Settled: ScreenRenderer = (ctx) => {
  const intent = ctx.parsedIntent
  const settle = ctx.settlement
  const sig = settle?.signature
  const sigPreview = sig ? `${sig.slice(0, 6)}...${sig.slice(-4)}` : "—"
  const recipient = intent?.recipient?.trim() || "—"
  const amount = intent && intent.amount_usdc > 0 ? `${intent.amount_usdc} USDC` : "—"

  return {
    body: (
      <div className="mx-auto w-full max-w-[320px] pb-2">
        <div className="mb-6 flex flex-col items-center">
          <div
            className="relative mx-auto flex w-full max-w-[min(300px,88vw)] items-center justify-center py-1"
            style={{ minHeight: 260 }}
          >
            <div
              aria-hidden
              className="pointer-events-none absolute left-0 top-1/2 z-[2] flex -translate-y-1/2 flex-col items-center gap-4"
            >
              <span className="text-[22px] leading-none text-[#a78bfa] motion-safe:animate-pulse drop-shadow-sm">
                ✦
              </span>
              <span
                className="text-[18px] leading-none text-[#38bdf8] motion-safe:animate-pulse drop-shadow-sm"
                style={{ animationDelay: "0.35s" }}
              >
                ✧
              </span>
              <span className="text-[14px] leading-none text-[#c4b5fd] motion-safe:animate-pulse drop-shadow-sm">
                ★
              </span>
            </div>
            <div
              aria-hidden
              className="pointer-events-none absolute right-0 top-1/2 z-[2] flex -translate-y-1/2 flex-col items-center gap-4"
            >
              <span
                className="text-[20px] leading-none text-[#38bdf8] motion-safe:animate-pulse drop-shadow-sm"
                style={{ animationDelay: "0.2s" }}
              >
                ✦
              </span>
              <span className="text-[16px] leading-none text-[#e9d5ff] motion-safe:animate-pulse drop-shadow-sm">
                ★
              </span>
              <span
                className="text-[18px] leading-none text-[#a78bfa] motion-safe:animate-pulse drop-shadow-sm"
                style={{ animationDelay: "0.45s" }}
              >
                ✧
              </span>
            </div>

            <div className="relative mx-auto" style={{ width: 240, height: 240 }}>
              <div className="pointer-events-none absolute left-[-6px] top-[50%] z-0 -translate-y-1/2 opacity-[0.5]">
                <svg
                  width={64}
                  height={100}
                  viewBox="0 0 58 96"
                  fill="none"
                  xmlns="http://www.w3.org/2000/svg"
                >
                  <path
                    d="M6 18C18 38 26 54 31 71"
                    stroke="#7FD4FF"
                    strokeWidth={3}
                    strokeLinecap="round"
                    opacity={0.9}
                    style={{ strokeDasharray: "4 62" }}
                  />
                  <path
                    d="M2 42C13 53 21 61 31 71"
                    stroke="#9EE3FF"
                    strokeWidth={2.5}
                    strokeLinecap="round"
                    opacity={0.8}
                    style={{ strokeDasharray: "3 50" }}
                  />
                </svg>
              </div>
              <div className="pointer-events-none absolute right-[-6px] top-[50%] z-0 -translate-y-1/2 scale-x-[-1] opacity-[0.5]">
                <svg
                  width={64}
                  height={100}
                  viewBox="0 0 58 96"
                  fill="none"
                  xmlns="http://www.w3.org/2000/svg"
                >
                  <path
                    d="M6 18C18 38 26 54 31 71"
                    stroke="#7FD4FF"
                    strokeWidth={3}
                    strokeLinecap="round"
                    opacity={0.9}
                    style={{ strokeDasharray: "4 62" }}
                  />
                  <path
                    d="M2 42C13 53 21 61 31 71"
                    stroke="#9EE3FF"
                    strokeWidth={2.5}
                    strokeLinecap="round"
                    opacity={0.8}
                    style={{ strokeDasharray: "3 50" }}
                  />
                </svg>
              </div>
              <Image
                src="/state-07.png"
                alt=""
                width={240}
                height={240}
                className="relative z-[1] mx-auto drop-shadow-[0_8px_24px_rgba(15,23,42,0.08)]"
                style={{ width: 240, height: 240, objectFit: "contain" }}
                priority
                draggable={false}
              />
            </div>
          </div>
          <h1 className="mt-4 text-center font-display text-[26px] font-black leading-tight tracking-[-0.02em] text-[#1a1c3d]">
            Payment delivered
          </h1>
          <p className="mt-2 px-1 text-center text-[14px] font-medium leading-snug text-[#64748b]">
            The payment synced and settled privately.
          </p>
        </div>

        <div className="rounded-[18px] border border-[#eef2f6] bg-white p-5 shadow-[0_12px_40px_-18px_rgba(15,23,42,0.14)]">
          <DetailLine
            iconBadge={
              <IconBadge bg="#e0f2fe">
                <IconUser />
              </IconBadge>
            }
            label="To:"
            value={
              <span className="text-[14px] font-extrabold text-[#0f172a]">
                {recipient}
              </span>
            }
          />
          <DetailLine
            iconBadge={
              <IconBadge bg="#e0f2fe">
                <IconDollar />
              </IconBadge>
            }
            label="Amount:"
            value={
              <span className="text-[14px] font-extrabold text-[#0f172a]">
                {amount}
              </span>
            }
          />
          <DetailLine
            iconBadge={
              <IconBadge bg="#e0f2fe">
                <IconPen />
              </IconBadge>
            }
            label="Signature:"
            value={
              sig ? (
                <a
                  href={`https://solscan.io/tx/${sig}?cluster=devnet`}
                  target="_blank"
                  rel="noreferrer"
                  className="block max-w-full truncate font-mono text-[13px] font-extrabold tabular-nums text-[#0f172a] underline decoration-cyan underline-offset-2"
                >
                  {sigPreview}
                </a>
              ) : (
                <span className="max-w-full truncate font-mono text-[13px] font-extrabold tabular-nums text-[#0f172a]">
                  —
                </span>
              )
            }
          />
          <div
            className="mt-4 flex w-full items-center justify-center gap-2.5 rounded-full py-3"
            style={{ background: "#E6F6F0" }}
          >
            <span
              className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-white"
              style={{ background: "#2D9D78" }}
              aria-hidden
            >
              <svg
                width="18"
                height="18"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth={2.5}
                strokeLinecap="round"
                strokeLinejoin="round"
              >
                <path d="M20 6L9 17l-5-5" />
              </svg>
            </span>
            <span
              className="text-[14px] font-extrabold"
              style={{ color: "#2D9D78" }}
            >
              Delivered
            </span>
          </div>
        </div>
      </div>
    ),
    cta: (
      <div className="mx-auto flex w-full max-w-[320px] flex-col gap-2.5">
        <button
          type="button"
          onClick={() => ctx.goToNewPayment()}
          className="pressable w-full rounded-[18px] py-[17px] font-display text-[16px] font-bold text-white outline-none"
          style={{
            background: brandPurple,
            border: "none",
            boxShadow: `0 12px 28px -6px rgba(123,97,255,0.45)`,
          }}
        >
          Make another payment
        </button>
        <button
          type="button"
          onClick={() => ctx.resetHome()}
          className="pressable w-full rounded-[18px] border-2 border-[#7B61FF] bg-white py-[15px] font-display text-[16px] font-bold outline-none"
          style={{ color: brandPurple }}
        >
          Go home
        </button>
      </div>
    ),
  }
}
