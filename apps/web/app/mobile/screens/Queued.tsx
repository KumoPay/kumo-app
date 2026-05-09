"use client"

import Image from "next/image"
import type { ReactNode } from "react"

import type { ScreenRenderer } from "./types"

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

function IconClock() {
  const c = "#0284c7"
  return (
    <svg width={18} height={18} viewBox="0 0 24 24" fill="none" aria-hidden>
      <circle cx="12" cy="12" r="7.5" stroke={c} strokeWidth={1.75} />
      <path d="M12 8v4.25l2.5 1.5" stroke={c} strokeWidth={1.75} strokeLinecap="round" />
    </svg>
  )
}

function IconHash() {
  const c = "#7c3aed"
  return (
    <svg width={18} height={18} viewBox="0 0 24 24" fill="none" aria-hidden>
      <path
        d="M10 4L8 20M16 4l-2 16M5 9h15M4 15h15"
        stroke={c}
        strokeWidth={1.85}
        strokeLinecap="round"
      />
    </svg>
  )
}

function IconUser() {
  const c = "#0284c7"
  return (
    <svg width={18} height={18} viewBox="0 0 24 24" fill="none" aria-hidden>
      <circle cx="12" cy="8" r="3.25" stroke={c} strokeWidth={1.75} />
      <path
        d="M6 20c0-3.3 2.7-6 6-6s6 2.7 6 6"
        stroke={c}
        strokeWidth={1.75}
        strokeLinecap="round"
      />
    </svg>
  )
}

function IconShield() {
  const c = "#16a34a"
  return (
    <svg width={18} height={18} viewBox="0 0 24 24" fill="none" aria-hidden>
      <path
        d="M12 21s7-4.5 7-11V6l-7-3-7 3v4c0 6.5 7 11 7 11z"
        stroke={c}
        strokeWidth={1.75}
        strokeLinejoin="round"
      />
      <path
        d="M9.5 12.5l2 2 3.5-3.5"
        stroke={c}
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
      <div className="min-w-0 max-w-[min(168px,52%)] shrink-0 text-right">{value}</div>
    </div>
  )
}

export const Queued: ScreenRenderer = (ctx) => {
  const intent = ctx.parsedIntent
  const hash = ctx.intentHash
  const sig = ctx.offlineSig
  const hashPreview = hash ? `${hash.slice(0, 7)}...${hash.slice(-4)}` : "—"
  const sigPreview = sig ? `${sig.slice(0, 6)}...${sig.slice(-3)}` : "—"
  const recipient = intent?.recipient?.trim() || "—"

  return {
    body: (
      <div className="mx-auto w-full max-w-[320px] pb-2">
        <div className="mb-5 flex flex-col items-center">
          <div className="relative" style={{ width: 248, height: 248 }}>
            <div
              aria-hidden
              className="pointer-events-none absolute left-[-8px] top-[58%] z-0 -translate-y-1/2 opacity-55"
            >
              <svg
                width={78}
                height={132}
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
              </svg>
            </div>
            <div
              aria-hidden
              className="pointer-events-none absolute right-[-8px] top-[58%] z-0 -translate-y-1/2 scale-x-[-1] opacity-55"
            >
              <svg
                width={78}
                height={132}
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
              </svg>
            </div>
            <Image
              src="/state-03.png"
              alt=""
              width={248}
              height={248}
              className="relative z-[1] mx-auto"
              style={{ width: 248, height: 248, objectFit: "contain" }}
              priority
              draggable={false}
            />
          </div>
          <h1 className="mt-3 text-center font-display text-[22px] font-black leading-tight tracking-[-0.02em] text-[#0f172a]">
            Resting until reconnect
          </h1>
          <p className="mt-2 px-1 text-center text-[14px] font-medium leading-snug text-[#64748b]">
            Your payment was signed and stored securely until you reconnect.
          </p>
        </div>

        <div className="rounded-[18px] border border-[#eef2f6] bg-white p-5 shadow-[0_12px_40px_-18px_rgba(15,23,42,0.14)]">
          <DetailLine
            iconBadge={
              <IconBadge bg="#e0f2fe">
                <IconClock />
              </IconBadge>
            }
            label="Status"
            value={
              <span className="rounded-full bg-[#dbeafe] px-3 py-1.5 text-[12px] font-bold text-[#1d4ed8]">
                Pending
              </span>
            }
          />
          <DetailLine
            iconBadge={
              <IconBadge bg="#ede9fe">
                <IconHash />
              </IconBadge>
            }
            label="Hash"
            value={
              <span className="max-w-[min(160px,48vw)] truncate font-mono text-[13px] font-extrabold tabular-nums text-[#0f172a]">
                {hashPreview}
              </span>
            }
          />
          <DetailLine
            iconBadge={
              <IconBadge bg="#e0f2fe">
                <IconUser />
              </IconBadge>
            }
            label="Destination"
            value={
              <span className="text-[14px] font-extrabold text-[#0f172a]">
                {recipient}
              </span>
            }
          />
          <DetailLine
            iconBadge={
              <IconBadge bg="#dcfce7">
                <IconShield />
              </IconBadge>
            }
            label="Signature"
            value={
              <span className="max-w-[min(160px,48vw)] truncate font-mono text-[13px] font-extrabold tabular-nums text-[#0f172a]">
                {sigPreview}
              </span>
            }
          />
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
      <div className="-mt-1 mx-auto flex w-full max-w-[320px] flex-col gap-2.5">
        <div className="mt-1 flex justify-center">
          <span className="inline-flex items-center gap-2 rounded-full bg-[#f3e8ff] px-3.5 py-2 text-[12px] font-bold text-[#6d28d9] shadow-sm">
            <svg
              width="15"
              height="15"
              viewBox="0 0 24 24"
              fill="none"
              className="shrink-0 text-[#7c3aed]"
              aria-hidden
            >
              <path
                d="M4 20V9l8-5 8 5v11"
                stroke="currentColor"
                strokeWidth={2}
                strokeLinejoin="round"
              />
              <path d="M9 20V12h6v8" stroke="currentColor" strokeWidth={2} />
            </svg>
            Saved locally
          </span>
        </div>
        <button
          type="button"
          disabled={ctx.busy}
          onClick={() => void ctx.broadcast()}
          className="pressable flex w-full items-center justify-center rounded-[18px] py-[17px] font-display text-[16px] font-bold text-white outline-none disabled:opacity-60 disabled:cursor-not-allowed"
          style={{
            background: "#7c5cff",
            border: "none",
            boxShadow: "0 12px 28px -6px rgba(124,92,255,0.5)",
          }}
        >
          {ctx.busy ? "Broadcasting…" : "Reconnect & broadcast"}
        </button>
      </div>
    ),
  }
}
