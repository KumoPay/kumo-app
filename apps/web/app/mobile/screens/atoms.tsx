"use client"

import type { ReactNode } from "react"

export function PrimaryCTA({
  children,
  onClick,
  disabled,
}: {
  children: ReactNode
  onClick?: () => void
  disabled?: boolean
}) {
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

export function SecondaryCTA({
  children,
  onClick,
}: {
  children: ReactNode
  onClick?: () => void
}) {
  return (
    <button
      onClick={onClick}
      className="pressable w-full px-7 py-3 rounded-full bg-white text-navy font-display font-extrabold text-[15px]"
      style={{ boxShadow: "inset 0 0 0 1.5px #0B1020" }}
    >
      {children}
    </button>
  )
}

export function Eyebrow({ children }: { children: ReactNode }) {
  return (
    <div className="text-[10px] font-bold tracking-[0.18em] uppercase text-navy/50">
      {children}
    </div>
  )
}

export function Row({
  k,
  v,
  big,
}: {
  k: string
  v: string
  big?: boolean
}) {
  return (
    <div className="flex items-baseline justify-between gap-2 py-1.5 border-b border-dashed border-navy/10 last:border-b-0">
      <span className="text-[11px] font-bold text-navy/55 tracking-wide uppercase">{k}</span>
      <span
        className={[
          "font-extrabold text-navy text-right truncate max-w-[60%]",
          big ? "text-[18px]" : "text-[13px]",
        ].join(" ")}
      >
        {v}
      </span>
    </div>
  )
}

export function RowPill({ k, pill }: { k: string; pill: ReactNode }) {
  return (
    <div className="flex items-center justify-between py-2">
      <span className="text-[11px] font-bold text-navy/55 tracking-wide uppercase">{k}</span>
      {pill}
    </div>
  )
}

export function Chip({
  children,
  lilac,
}: {
  children: ReactNode
  lilac?: boolean
}) {
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

export function BackButton({ onClick }: { onClick: () => void }) {
  return (
    <button
      onClick={onClick}
      aria-label="Back"
      className="pressable inline-flex items-center justify-center rounded-full bg-white text-navy"
      style={{
        width: 36,
        height: 36,
        boxShadow: "0 1px 2px rgba(11,16,32,0.06)",
      }}
    >
      <svg width="18" height="18" viewBox="0 0 24 24" fill="none">
        <path d="M15 18l-6-6 6-6" stroke="#0B1020" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
      </svg>
    </button>
  )
}
