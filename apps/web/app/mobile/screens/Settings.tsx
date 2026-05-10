"use client"

import Image from "next/image"
import type { ReactNode } from "react"
import { useCallback, useState } from "react"

import type { NavCtx, ScreenRenderer } from "./types"

const WALLET_CHOICES = [
  { name: "Phantom", tail: "P", id: "phantom", logoSrc: "/wallet-phantom.png" },
  { name: "Solflare", tail: "S", id: "solflare", logoSrc: "/wallet-solflare.png" },
  { name: "Backpack", tail: "B", id: "backpack", logoSrc: "/wallet-backpack.png" },
  { name: "Glow", tail: "G", id: "glow", logoSrc: "/wallet-glow.png" },
] as const

function walletBrandSrc(brand: string): string {
  switch (brand) {
    case "phantom":
      return "/wallet-phantom.png"
    case "solflare":
      return "/wallet-solflare.png"
    case "backpack":
      return "/wallet-backpack.png"
    case "glow":
      return "/wallet-glow.png"
    default:
      return "/wallet-phantom.png"
  }
}

export const Settings: ScreenRenderer = (ctx) => ({
  body: <SettingsBody ctx={ctx} />,
})

function SettingsBody({ ctx }: { ctx: NavCtx }) {
  const [privateByDefault, setPrivateByDefault] = useState(true)
  const [syncOnReconnect, setSyncOnReconnect] = useState(true)
  const [walletPickerOpen, setWalletPickerOpen] = useState(false)

  const pk = ctx.wallet?.pubkey ?? ""
  const truncated =
    pk.length > 14 ? `${pk.slice(0, 5)}...${pk.slice(-5)}` : pk

  const copyAddress = useCallback(() => {
    if (!pk) return
    void navigator.clipboard.writeText(pk).then(
      () => {
        if (typeof window !== "undefined") window.alert("Address copied")
      },
      () => {
        if (typeof window !== "undefined") {
          window.alert("Could not copy. Copy manually from the menu.")
        }
      },
    )
  }, [pk])

  if (!ctx.wallet) {
    return (
      <div className="mx-auto w-full max-w-[320px] py-8 text-center text-[14px] font-medium text-[#64748b]">
        Connect a wallet to see settings.
      </div>
    )
  }

  return (
    <>
      <div className="mx-auto w-full max-w-[320px] pb-3">
        <div className="mt-1 flex items-start justify-between gap-2">
          <div className="min-w-0 flex-1 pt-0.5">
            <h1 className="font-display text-[26px] font-black leading-tight tracking-[-0.02em] text-[#0f172a]">
              Settings
            </h1>
            <p className="mt-2 text-[14px] font-medium leading-snug text-[#64748b]">
              Privacy, wallet, and on-device data.
            </p>
          </div>
          <div className="relative -mr-1 shrink-0">
            <span
              aria-hidden
              className="pointer-events-none absolute -left-1 top-2 text-[11px] text-[#7dd3fc]"
            >
              ✦
            </span>
            <span
              aria-hidden
              className="pointer-events-none absolute -right-0.5 top-6 text-[9px] text-[#38bdf8]"
            >
              ✦
            </span>
            <Image
              src="/state-07.png"
              alt=""
              width={220}
              height={220}
              className="relative z-[1] h-[min(132px,34vw)] w-auto object-contain object-right drop-shadow-[0_8px_24px_rgba(15,23,42,0.08)]"
              draggable={false}
              priority
            />
          </div>
        </div>

        <SectionTitle>Wallet</SectionTitle>
        <div className="overflow-hidden rounded-[18px] border border-[#eef0f3] bg-white shadow-[0_8px_28px_-14px_rgba(15,23,42,0.1)]">
          <button
            type="button"
            onClick={() => setWalletPickerOpen(true)}
            className="pressable flex w-full items-center gap-3 border-b border-[#f1f5f9] px-4 py-4 text-left"
          >
            <div className="relative h-10 w-10 shrink-0 overflow-hidden rounded-full ring-1 ring-black/[0.06]">
              <Image
                src={walletBrandSrc(ctx.wallet.brand)}
                alt=""
                width={40}
                height={40}
                className="size-full object-cover"
                draggable={false}
              />
            </div>
            <div className="min-w-0 flex-1">
              <div className="font-extrabold text-[#0f172a]">Connected wallet</div>
            </div>
            <span className="shrink-0 text-[15px] font-extrabold text-[#7c5cff]">
              {ctx.wallet.label}
            </span>
            <ChevronRight className="shrink-0 text-[#94a3b8]" />
          </button>

          <div className="flex items-center gap-3 px-4 py-4">
            <IconBadge bg="#E0F2FE">
              <ClipboardGlyph />
            </IconBadge>
            <div className="min-w-0 flex-1">
              <div className="font-extrabold text-[#0f172a]">Address</div>
            </div>
            <span className="shrink-0 font-mono text-[13px] font-bold tabular-nums text-[#475569]">
              {truncated}
            </span>
            <button
              type="button"
              onClick={copyAddress}
              aria-label="Copy address"
              className="pressable inline-flex shrink-0 p-1 text-[#7c5cff]"
            >
              <CopyGlyph />
            </button>
          </div>
        </div>

        <SectionTitle className="mt-6">Preferences</SectionTitle>
        <div className="overflow-hidden rounded-[18px] border border-[#eef0f3] bg-white shadow-[0_8px_28px_-14px_rgba(15,23,42,0.1)]">
          <ToggleRow
            icon={
              <IconBadge bg="#DCFCE7">
                <LockGlyph />
              </IconBadge>
            }
            title="Private by default"
            hint="All payments will be private by default."
            checked={privateByDefault}
            onChange={setPrivateByDefault}
          />
          <ToggleRow
            icon={
              <IconBadge bg="#E0F2FE">
                <PlaneGlyph />
              </IconBadge>
            }
            title="Airplane mode"
            hint="Hide your status and sign offline."
            checked={ctx.airplane}
            onChange={ctx.setAirplane}
          />
          <ToggleRow
            icon={
              <IconBadge bg="#DCFCE7">
                <CloudSyncGlyph />
              </IconBadge>
            }
            title="Sync on reconnect"
            hint="Settle and sync automatically."
            checked={syncOnReconnect}
            onChange={setSyncOnReconnect}
            last
          />
        </div>

        <SectionTitle className="mt-6">Local data</SectionTitle>
        <div className="overflow-hidden rounded-[18px] border border-[#eef0f3] bg-white shadow-[0_8px_28px_-14px_rgba(15,23,42,0.1)]">
          <button
            type="button"
            onClick={() => onExportHistory()}
            className="pressable flex w-full items-center gap-3 border-b border-[#f1f5f9] px-4 py-4 text-left"
          >
            <IconBadge bg="#E0F2FE">
              <ExportGlyph />
            </IconBadge>
            <div className="min-w-0 flex-1">
              <div className="font-extrabold text-[#0f172a]">Export history</div>
              <div className="mt-1 text-[12px] font-semibold leading-snug text-[#64748b]">
                Download your payment and activity history.
              </div>
            </div>
            <ChevronRight className="shrink-0 text-[#94a3b8]" />
          </button>

          <button
            type="button"
            onClick={() => onDelete(ctx)}
            className="pressable flex w-full items-center gap-3 px-4 py-4 text-left"
          >
            <IconBadge bg="#FEE2E2">
              <TrashGlyph />
            </IconBadge>
            <div className="min-w-0 flex-1">
              <div className="font-extrabold text-[#DC2626]">Delete local data</div>
              <div className="mt-1 text-[12px] font-semibold leading-snug text-[#64748b]">
                Remove all information stored on this device.
              </div>
            </div>
            <ChevronRight className="shrink-0 text-[#DC2626]/60" />
          </button>
        </div>

        <SectionTitle className="mt-6">Session</SectionTitle>
        <div className="overflow-hidden rounded-[18px] border border-[#eef0f3] bg-white shadow-[0_8px_28px_-14px_rgba(15,23,42,0.1)]">
          <button
            type="button"
            onClick={() => onSignOut(ctx)}
            className="pressable flex w-full items-center gap-3 px-4 py-4 text-left"
          >
            <IconBadge bg="#EEF2FF">
              <LogoutGlyph />
            </IconBadge>
            <div className="min-w-0 flex-1">
              <div className="font-extrabold text-[#0f172a]">Sign out</div>
              <div className="mt-1 text-[12px] font-semibold leading-snug text-[#64748b]">
                Return to wallet connection and alias setup.
              </div>
            </div>
            <ChevronRight className="shrink-0 text-[#94a3b8]" />
          </button>
        </div>
      </div>

      <WalletSwitchSheet
        ctx={ctx}
        open={walletPickerOpen}
        onClose={() => setWalletPickerOpen(false)}
      />
    </>
  )
}

function WalletSwitchSheet({
  ctx,
  open,
  onClose,
}: {
  ctx: NavCtx
  open: boolean
  onClose: () => void
}) {
  if (!open || !ctx.wallet) return null

  return (
    <div className="fixed inset-0 z-[200] flex items-end justify-center">
      <button
        type="button"
        className="absolute inset-0 bg-[#0f172a]/40"
        aria-label="Close wallet picker"
        onClick={onClose}
      />
      <div
        className="relative z-10 w-full max-w-lg overflow-hidden rounded-t-[24px] border border-[#eef0f3] bg-white shadow-[0_-12px_48px_rgba(15,23,42,0.18)]"
        style={{
          paddingBottom: "max(20px, env(safe-area-inset-bottom))",
        }}
      >
        <div className="mx-auto w-full max-w-[320px] px-4 pt-3">
          <div className="mx-auto mb-3 h-1 w-10 rounded-full bg-[#e2e8f0]" aria-hidden />
          <p className="mb-1 text-center font-display text-[18px] font-black tracking-[-0.02em] text-[#0f172a]">
            Switch wallet
          </p>
          <p className="mb-4 text-center text-[13px] font-medium text-[#64748b]">
            Pick a wallet — your wallet app will pop up to confirm.
          </p>
          <div
            className="max-h-[min(340px,48dvh)] overflow-y-auto overflow-x-hidden rounded-[18px] border border-[#f1f5f9]"
            role="list"
          >
            {WALLET_CHOICES.map((w, i, arr) => {
              const isCurrent = ctx.wallet?.id === w.id
              return (
                <button
                  key={w.id}
                  type="button"
                  role="listitem"
                  disabled={isCurrent || ctx.busy}
                  onClick={() => {
                    void ctx.beginWalletConnect(w.id)
                    onClose()
                  }}
                  className={[
                    "flex w-full items-center gap-3 px-4 py-3.5 text-left pressable",
                    i < arr.length - 1 ? "border-b border-[#f1f5f9]" : "",
                    isCurrent ? "bg-[#f8fafc] cursor-default" : "hover:bg-[#f9fafb]",
                  ].join(" ")}
                >
                  <div className="relative flex size-11 shrink-0 overflow-hidden rounded-full shadow-[0_4px_14px_rgba(15,23,42,0.08)] ring-2 ring-white">
                    <Image
                      src={w.logoSrc}
                      alt=""
                      width={44}
                      height={44}
                      className="size-full object-cover"
                      draggable={false}
                    />
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="font-display text-[16px] font-extrabold text-[#0f172a]">
                      {w.name}
                    </div>
                  </div>
                  {isCurrent ? (
                    <span className="shrink-0 text-[12px] font-bold text-[#7c5cff]">Current</span>
                  ) : (
                    <ChevronRight className="shrink-0 text-[#cbd5e1]" />
                  )}
                </button>
              )
            })}
          </div>
        </div>
      </div>
    </div>
  )
}

function SectionTitle({
  children,
  className,
}: {
  children: ReactNode
  className?: string
}) {
  return (
    <div
      className={[
        "mb-2.5 px-1 text-[11px] font-bold uppercase tracking-[0.22em] text-[#94a3b8]",
        className ?? "",
      ].join(" ")}
    >
      {children}
    </div>
  )
}

function IconBadge({
  bg,
  children,
}: {
  bg: string
  children: ReactNode
}) {
  return (
    <div
      className="flex size-10 shrink-0 items-center justify-center rounded-full"
      style={{ background: bg }}
    >
      {children}
    </div>
  )
}

function ToggleRow({
  icon,
  title,
  hint,
  checked,
  onChange,
  last,
}: {
  icon: ReactNode
  title: string
  hint: string
  checked: boolean
  onChange: (v: boolean) => void
  last?: boolean
}) {
  return (
    <button
      type="button"
      onClick={() => onChange(!checked)}
      className={[
        "flex w-full items-center gap-3 px-4 py-4 text-left",
        last ? "" : "border-b border-[#f1f5f9]",
      ].join(" ")}
    >
      {icon}
      <div className="min-w-0 flex-1 pr-2">
        <div className="font-extrabold text-[#0f172a]">{title}</div>
        <div className="mt-1 text-[12px] font-semibold leading-snug text-[#64748b]">
          {hint}
        </div>
      </div>
      <Toggle checked={checked} />
    </button>
  )
}

function Toggle({ checked }: { checked: boolean }) {
  return (
    <span
      className="relative h-[31px] w-[51px] shrink-0 rounded-full transition-colors duration-200"
      style={{
        background: checked ? "#7c5cff" : "#CBD5E1",
        boxShadow: checked
          ? "inset 0 1px 2px rgba(0,0,0,0.06)"
          : "inset 0 1px 2px rgba(0,0,0,0.04)",
      }}
    >
      <span
        className="absolute top-[3px] size-[25px] rounded-full bg-white shadow-[0_2px_6px_rgba(15,23,42,0.12)] transition-[left] duration-200"
        style={{ left: checked ? 23 : 3 }}
      />
    </span>
  )
}

function ChevronRight({ className }: { className?: string }) {
  return (
    <svg
      width="18"
      height="18"
      viewBox="0 0 24 24"
      fill="none"
      className={className}
      aria-hidden
    >
      <path
        d="M9 6l6 6-6 6"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
        opacity={0.75}
      />
    </svg>
  )
}

function ClipboardGlyph() {
  return (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" aria-hidden>
      <rect
        x="8"
        y="3"
        width="8"
        height="5"
        rx="1.5"
        stroke="#0369a1"
        strokeWidth={1.75}
      />
      <path
        d="M6 8h12a2 2 0 0 1 2 2v10a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2V10a2 2 0 0 1 2-2z"
        stroke="#0369a1"
        strokeWidth={1.75}
      />
    </svg>
  )
}

function LockGlyph() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" aria-hidden>
      <rect x="5" y="11" width="14" height="10" rx="2" stroke="#166534" strokeWidth={1.85} />
      <path
        d="M8 11V7a4 4 0 0 1 8 0v4"
        stroke="#166534"
        strokeWidth={1.85}
        strokeLinecap="round"
      />
    </svg>
  )
}

function PlaneGlyph() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" aria-hidden>
      <path
        d="M21 16v-2l-8-5V3.5c0-.83-.67-1.5-1.5-1.5S10 2.67 10 3.5V9l-8 5v2l8-2.5V19l-2 1.5V22l3.5-1 3.5 1v-1.5L13 19v-5.5l8 2.5z"
        fill="#0369a1"
      />
    </svg>
  )
}

function CloudSyncGlyph() {
  return (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" aria-hidden>
      <path
        d="M18 10h1.5a3.5 3.5 0 0 1 0 7H16M6 17H5a3 3 0 0 1-.5-5.97M10 17V7m0 0l-3 3m3-3l3 3"
        stroke="#166534"
        strokeWidth={1.75}
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  )
}

function ExportGlyph() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" aria-hidden>
      <path
        d="M12 15V3m0 0l4 4m-4-4L8 7M4 19h16"
        stroke="#0369a1"
        strokeWidth={1.85}
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  )
}

function TrashGlyph() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" aria-hidden>
      <path
        d="M3 6h18M8 6V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2m3 0v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6h14zM10 11v6M14 11v6"
        stroke="#DC2626"
        strokeWidth={1.75}
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  )
}

function LogoutGlyph() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" aria-hidden>
      <path
        d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4M16 17l5-5-5-5M21 12H9"
        stroke="#4f46e5"
        strokeWidth={1.85}
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  )
}

function CopyGlyph() {
  return (
    <svg width="22" height="22" viewBox="0 0 24 24" fill="none" aria-hidden>
      <rect
        x="8"
        y="8"
        width="12"
        height="12"
        rx="2"
        stroke="currentColor"
        strokeWidth={1.85}
      />
      <path
        d="M6 16H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"
        stroke="currentColor"
        strokeWidth={1.85}
      />
    </svg>
  )
}

function onSignOut(ctx: NavCtx) {
  if (typeof window === "undefined") return
  const ok = window.confirm(
    "Sign out?\n\nYou'll return to connect your wallet and choose your alias again.",
  )
  if (!ok) return
  ctx.disconnectWallet()
}

function onExportHistory() {
  if (typeof window !== "undefined") {
    window.alert(
      "Coming soon — would download a CSV of your activity.",
    )
  }
}

function onDelete(ctx: NavCtx) {
  if (typeof window === "undefined") return
  const ok = window.confirm(
    "Delete local data?\n\nThis removes information stored on this device. This cannot be undone.",
  )
  if (!ok) return
  ctx.disconnectWallet()
  if (typeof window !== "undefined") window.alert("Local data deleted.")
}
