"use client"

import Image from "next/image"
import type { ReactNode } from "react"

import type { ScreenRenderer } from "./types"

const accent = "#38bdf8"

function IconUser() {
  return (
    <svg
      width={18}
      height={18}
      viewBox="0 0 24 24"
      fill="none"
      className="shrink-0"
      aria-hidden
    >
      <circle cx="12" cy="8" r="3.5" stroke={accent} strokeWidth={2} />
      <path
        d="M6 20c0-3.3 2.7-6 6-6s6 2.7 6 6"
        stroke={accent}
        strokeWidth={2}
        strokeLinecap="round"
      />
    </svg>
  )
}

function IconDollar() {
  return (
    <svg
      width={18}
      height={18}
      viewBox="0 0 24 24"
      fill="none"
      className="shrink-0"
      aria-hidden
    >
      <path
        d="M12 4v16M15 8.5c0-1.38-1.34-2.5-3-2.5S9 7.12 9 8.5s1.34 2.5 3 2.5 3 1.12 3 2.5-1.34 2.5-3 2.5-3-1.12-3-2.5"
        stroke={accent}
        strokeWidth={2}
        strokeLinecap="round"
      />
    </svg>
  )
}

function IconBubble() {
  return (
    <svg
      width={18}
      height={18}
      viewBox="0 0 24 24"
      fill="none"
      className="shrink-0"
      aria-hidden
    >
      <path
        d="M6 9.5C6 6.75 8.57 4.5 11.73 4.5c1.96 0 3.67.78 4.8 2.02a4.23 4.23 0 011.24 3H18C19.66 9.52 21 11.02 21 12.85c0 2.18-2.03 3.95-4.64 3.95h-.73l-2.08 2.12a.6.6 0 01-1-.43v-1.69H11C8.2 15.8 6 13.48 6 10.5V9.5z"
        stroke={accent}
        strokeWidth={1.75}
        strokeLinejoin="round"
      />
    </svg>
  )
}

function IconLock() {
  return (
    <svg
      width={18}
      height={18}
      viewBox="0 0 24 24"
      fill="none"
      className="shrink-0"
      aria-hidden
    >
      <rect
        x="5"
        y="10"
        width="14"
        height="10"
        rx="2"
        stroke={accent}
        strokeWidth={2}
      />
      <path
        d="M8 10V8a4 4 0 118 0v2"
        stroke={accent}
        strokeWidth={2}
        strokeLinecap="round"
      />
    </svg>
  )
}

function DetailRow({
  icon,
  label,
  value,
  big,
}: {
  icon: ReactNode
  label: string
  value: string
  big?: boolean
}) {
  return (
    <div className="flex items-center justify-between gap-3 border-b border-dashed border-navy/[0.08] py-2.5 last:border-b-0">
      <div className="flex min-w-0 items-center gap-2">
        {icon}
        <span className="text-[11px] font-bold uppercase tracking-wide text-navy/55">
          {label}
        </span>
      </div>
      <span
        className={[
          "max-w-[58%] truncate text-right font-extrabold text-navy",
          big ? "text-[18px]" : "text-[14px]",
        ].join(" ")}
      >
        {value}
      </span>
    </div>
  )
}

export const Sign: ScreenRenderer = (ctx) => {
  const intent = ctx.parsedIntent
  const recipient = intent?.recipient?.trim() || "—"
  const amount = intent && intent.amount_usdc > 0 ? `${intent.amount_usdc} USDC` : "—"
  const memo = intent?.memo?.trim() || "—"
  const isPrivate = Boolean(intent?.private)

  return {
    body: (
      <div className="mx-auto w-full max-w-[320px] pb-1">
        <div className="mb-6 flex flex-col items-center">
          <div className="relative mb-2" style={{ width: 132, height: 132 }}>
            <div
              aria-hidden
              className="pointer-events-none absolute left-[2px] top-[58%] z-0 -translate-y-1/2 opacity-55"
            >
              <svg
                width={56}
                height={92}
                viewBox="0 0 58 96"
                fill="none"
                xmlns="http://www.w3.org/2000/svg"
              >
                <path
                  d="M6 18C18 38 26 54 31 71"
                  stroke="#7FD4FF"
                  strokeWidth={3}
                  strokeLinecap="round"
                  opacity={0.85}
                  style={{ strokeDasharray: "4 62" }}
                />
                <path
                  d="M2 42C13 53 21 61 31 71"
                  stroke="#9EE3FF"
                  strokeWidth={2.5}
                  strokeLinecap="round"
                  opacity={0.75}
                  style={{ strokeDasharray: "3 50" }}
                />
                <path
                  d="M1 61C13 61 26 71 31 78"
                  stroke="#B7F1FF"
                  strokeWidth={2}
                  strokeLinecap="round"
                  opacity={0.65}
                  style={{ strokeDasharray: "2 40" }}
                />
              </svg>
            </div>
            <Image
              src="/state-00.png"
              alt=""
              width={120}
              height={120}
              className="relative z-[1] mx-auto"
              style={{ width: 120, height: 120, objectFit: "contain" }}
              draggable={false}
            />
          </div>
          <h1 className="font-display text-center text-[26px] font-black leading-tight tracking-[-0.03em] text-[#0f172a]">
            Review intent
          </h1>
          <p className="mt-2 text-center text-[14px] font-medium leading-snug text-[#6b7280]">
            Confirm the payment details before signing offline.
          </p>
        </div>

        <div className="rounded-[20px] border border-[#eef0f3] bg-white p-4 shadow-[0_8px_28px_-12px_rgba(15,23,42,0.1)]">
          <DetailRow icon={<IconUser />} label="To" value={recipient} />
          <DetailRow icon={<IconDollar />} label="Amount" value={amount} big />
          <DetailRow icon={<IconBubble />} label="Memo" value={memo} />
          <div className="flex items-center justify-between pt-2">
            <div className="flex min-w-0 items-center gap-2">
              <IconLock />
              <span className="text-[11px] font-bold uppercase tracking-wide text-navy/55">
                Privacy
              </span>
            </div>
            {isPrivate ? (
              <span
                className="shrink-0 rounded-full px-2.5 py-1 text-[11px] font-extrabold text-[#0B1020]"
                style={{ background: "#C7B5FF" }}
              >
                Private
              </span>
            ) : (
              <span className="shrink-0 rounded-full bg-slate-200 px-2.5 py-1 text-[11px] font-extrabold text-navy">
                Public
              </span>
            )}
          </div>
        </div>

        <div
          className="mt-4 flex gap-3 rounded-[18px] border border-[#e9e3ff] p-3.5"
          style={{ background: "rgba(199,181,255,0.14)" }}
        >
          <div
            className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full"
            style={{ background: "rgba(167,139,250,0.35)" }}
            aria-hidden
          >
            <svg
              width="20"
              height="20"
              viewBox="0 0 24 24"
              fill="none"
              className="text-[#5b21b6]"
            >
              <path
                d="M12 3L4 7v6c0 5 3.5 9.5 8 10 4.5-.5 8-5 8-10V7l-8-4z"
                fill="currentColor"
                opacity="0.9"
              />
              <path
                d="M10.5 12.5l1.5 1.5 3-3"
                stroke="#faf5ff"
                strokeWidth={2}
                strokeLinecap="round"
                strokeLinejoin="round"
              />
            </svg>
          </div>
          <div className="min-w-0">
            <div className="font-display text-[14px] font-extrabold leading-snug text-[#0f172a]">
              Sign with your wallet
            </div>
            <p className="mt-1 text-[12px] font-medium leading-relaxed text-[#64748b]">
              Your wallet signs locally. No network required.
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
    ),
    cta: (
      <div className="mx-auto flex w-full max-w-[320px] flex-col gap-2.5">
        <button
          type="button"
          onClick={() => ctx.back()}
          className="pressable flex w-full items-center justify-center rounded-[14px] border border-[#e5e7eb] bg-white py-3.5 font-display text-[15px] font-bold text-[#0f172a] shadow-[0_1px_2px_rgba(15,23,42,0.05)] outline-none"
        >
          Back
        </button>
        <button
          type="button"
          disabled={ctx.busy || !intent}
          onClick={() => void ctx.signOffline()}
          className="pressable mx-auto flex w-full items-center justify-center rounded-[18px] py-[17px] font-display text-[16px] font-bold text-white outline-none disabled:opacity-60 disabled:cursor-not-allowed"
          style={{
            background: "#7c5cff",
            border: "none",
            boxShadow: "0 12px 28px -6px rgba(124,92,255,0.5)",
          }}
        >
          {ctx.busy ? "Awaiting signature…" : "Sign offline"}
        </button>
      </div>
    ),
  }
}
