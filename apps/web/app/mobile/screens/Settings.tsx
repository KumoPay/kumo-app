"use client"

import { Eyebrow } from "./atoms"
import type { NavCtx, ScreenRenderer } from "./types"

export const Settings: ScreenRenderer = (ctx) => ({
  body: (
    <div>
      <div className="font-display font-black text-navy text-[28px] tracking-[-0.02em] leading-none mt-1">
        Settings
      </div>
      <div className="text-[13px] font-semibold text-navy/55 mt-1.5">
        Wallet, privacy, and local data.
      </div>

      {ctx.wallet && (
        <Section title="wallet">
          <div className="flex items-center gap-3 px-4 py-3.5">
            <div
              className="w-10 h-10 rounded-full flex items-center justify-center font-display font-black text-white text-[16px]"
              style={{ background: brandColor(ctx.wallet.brand) }}
            >
              {ctx.wallet.initial}
            </div>
            <div className="flex-1 min-w-0">
              <div className="font-extrabold text-navy text-[15px]">
                {ctx.wallet.label}
              </div>
              <div className="font-mono text-[11px] text-navy/55 truncate">
                {ctx.wallet.pubkey}
              </div>
            </div>
          </div>
          <ActionRow
            label="Switch wallet"
            onClick={() => {
              ctx.disconnectWallet()
            }}
          />
        </Section>
      )}

      <Section title="preferences">
        <ToggleRow
          label="Airplane mode"
          hint="Sign offline, broadcast later."
          checked={ctx.airplane}
          onChange={ctx.setAirplane}
        />
        <ToggleRow
          label="Private by default"
          hint="Use confidential transfers when available."
          checked={true}
          onChange={() => {}}
        />
      </Section>

      <Section title="network">
        <InfoRow label="Network" value="Solana devnet" />
        <InfoRow label="Cluster" value="api.devnet.solana.com" />
      </Section>

      <Section title="local data">
        <ActionRow
          label="Export transaction history"
          hint="Download a CSV of all your activity."
          onClick={() => onExport("history")}
        />
        <ActionRow
          label="Export wallet recovery"
          hint="Encrypted JSON keystore."
          onClick={() => onExport("wallet")}
        />
        <ActionRow
          label="Delete local data"
          hint="Wipes contacts, history, and preferences from this device."
          danger
          onClick={() => onDelete(ctx)}
        />
      </Section>

      <Section title="about">
        <InfoRow label="Version" value="0.1.0 — devnet" />
        <InfoRow label="Network" value="Solana devnet" />
      </Section>

      <div className="text-[11px] text-navy/45 text-center mt-5 mb-2 font-semibold">
        Made with ☁ by Kumo Labs
      </div>
    </div>
  ),
})

function brandColor(brand: string): string {
  switch (brand) {
    case "phantom": return "#AB9FF2"
    case "solflare": return "#FFB938"
    case "backpack": return "#E33E3F"
    case "glow": return "#7FE8FF"
    default: return "#7c5cff"
  }
}

function Section({
  title,
  children,
}: {
  title: string
  children: React.ReactNode
}) {
  return (
    <div className="mt-5">
      <Eyebrow>{title}</Eyebrow>
      <div className="mt-2 bg-white rounded-2xl softshadow-sm overflow-hidden">
        {children}
      </div>
    </div>
  )
}

function ToggleRow({
  label,
  hint,
  checked,
  onChange,
}: {
  label: string
  hint?: string
  checked: boolean
  onChange: (v: boolean) => void
}) {
  return (
    <button
      onClick={() => onChange(!checked)}
      className="w-full flex items-center gap-3 px-4 py-3.5 text-left border-b border-dashed border-navy/8 last:border-b-0"
    >
      <div className="flex-1 min-w-0">
        <div className="font-extrabold text-navy text-[14px]">{label}</div>
        {hint && (
          <div className="text-[11px] text-navy/55 font-semibold mt-0.5 leading-snug">
            {hint}
          </div>
        )}
      </div>
      <div
        className="relative w-11 h-6 rounded-full transition-colors"
        style={{ background: checked ? "#7FE8FF" : "#C4CCD8" }}
      >
        <div
          className="absolute top-0.5 w-5 h-5 rounded-full bg-white softshadow-sm transition-all"
          style={{ left: checked ? 22 : 2 }}
        />
      </div>
    </button>
  )
}

function ActionRow({
  label,
  hint,
  onClick,
  danger,
}: {
  label: string
  hint?: string
  onClick: () => void
  danger?: boolean
}) {
  return (
    <button
      onClick={onClick}
      className="pressable w-full flex items-center gap-3 px-4 py-3.5 text-left border-b border-dashed border-navy/8 last:border-b-0"
    >
      <div className="flex-1 min-w-0">
        <div
          className="font-extrabold text-[14px]"
          style={{ color: danger ? "#C2185B" : "#0B1020" }}
        >
          {label}
        </div>
        {hint && (
          <div className="text-[11px] text-navy/55 font-semibold mt-0.5 leading-snug">
            {hint}
          </div>
        )}
      </div>
      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" aria-hidden>
        <path
          d="M9 6l6 6-6 6"
          stroke={danger ? "#C2185B" : "#0B1020"}
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
          opacity={danger ? 0.7 : 0.4}
        />
      </svg>
    </button>
  )
}

function InfoRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-center justify-between gap-3 px-4 py-3 border-b border-dashed border-navy/8 last:border-b-0">
      <span className="text-[12px] font-bold text-navy/55 uppercase tracking-wide">
        {label}
      </span>
      <span className="font-extrabold text-navy text-[13px] truncate text-right max-w-[60%]">
        {value}
      </span>
    </div>
  )
}

function onExport(kind: "history" | "wallet") {
  const label = kind === "history" ? "transaction history" : "wallet recovery"
  if (typeof window !== "undefined") {
    window.alert(`Coming soon — would export ${label}.`)
  }
}

function onDelete(ctx: NavCtx) {
  if (typeof window === "undefined") return
  const ok = window.confirm(
    "Delete all local data?\n\nContacts, history, and preferences will be wiped from this device. This can't be undone.",
  )
  if (!ok) return
  ctx.disconnectWallet()
  window.alert("Local data deleted.")
}
