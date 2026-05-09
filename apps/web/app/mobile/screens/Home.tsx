"use client"

import type { KeyboardEvent as ReactKeyboardEvent, ReactNode } from "react"
import Image from "next/image"

import { displayWalletAlias } from "../alias-utils"
import { useBalance } from "../use-balance"
import { useTxHistory } from "../use-tx-history"
import type { ScreenRenderer } from "./types"
import { DEMO_HISTORY } from "./mock-history"

const formatUsdc = (n: number) =>
  n.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })

/** Home dashboard — real USDC balance, real-on-chain history (with demo fallback). */
export const Home: ScreenRenderer = (ctx) => ({
  body: <HomeBody ctx={ctx} />,
  cta: (
    <div className="mx-auto w-full max-w-[320px]">
      <PayBar onPay={() => ctx.push("intent")} />
    </div>
  ),
})

function HomeBody({ ctx }: { ctx: Parameters<ScreenRenderer>[0] }) {
  const balance = useBalance(ctx.wallet?.pubkey ?? null)
  const history = useTxHistory(ctx.wallet?.pubkey ?? null, 8)

  const usdcDisplay = balance.usdc ?? 0
  const tokenDisplay = balance.usdc != null ? Math.floor(balance.usdc * 100) / 100 : null

  const liveEntries = history.entries.length > 0
  const slice = liveEntries ? history.entries.slice(0, 3) : DEMO_HISTORY.slice(0, 3)

  return (
    <div className="-mx-5 min-h-full bg-[#f9fafb] px-5 pb-2 pt-0">
      <div className="mx-auto w-full max-w-[320px]">
        <div className="pt-4">
          <h1 className="font-display font-black leading-none tracking-[-0.03em] text-[#141b2f] text-[26px]">
            Hello,&nbsp;
            <span className="lowercase">
              {displayWalletAlias(ctx.wallet?.displayName) || "friend"}
            </span>
            &nbsp;
            <span aria-hidden className="inline-block translate-y-[1px]">
              👋
            </span>
          </h1>
          <p className="mt-2 text-[14px] font-medium leading-snug text-[#6b7380]">
            Private payments, even offline.
          </p>
        </div>

        <div className="relative mt-6 flex w-full items-stretch overflow-hidden rounded-[28px] border border-[#eef0f3] bg-white shadow-[0_8px_30px_-12px_rgba(15,23,42,0.1)]">
          <div className="flex min-w-0 flex-1 flex-col justify-center py-6 pl-6 pr-3">
            <div className="text-[13px] font-medium leading-tight text-[#6b7280]">
              Available balance
            </div>
            <div className="mt-2 font-display font-black tabular-nums text-[clamp(30px,8vw,36px)] leading-none tracking-[-0.03em] text-[#111827]">
              {balance.loading && balance.usdc == null ? (
                <span className="inline-block w-[140px] h-[34px] rounded-md bg-slate-100 animate-pulse" />
              ) : (
                <>${formatUsdc(usdcDisplay)}</>
              )}
            </div>
            <p className="mt-1 text-[13px] font-semibold tabular-nums leading-tight tracking-tight text-[#6b7280]">
              {tokenDisplay == null ? "— USDC" : `${formatUsdc(tokenDisplay)} USDC`}
            </p>
            <div className="mt-4 inline-flex w-fit items-center gap-2 rounded-full border border-[#e5e7eb] bg-white px-3 py-1.5 shadow-[0_1px_2px_rgba(15,23,42,0.05)]">
              <span
                className="size-[7px] shrink-0 rounded-full"
                style={{ background: balance.error ? "#f59e0b" : "#10b981" }}
                aria-hidden
              />
              <span className="text-[12px] font-semibold leading-none text-[#6b7280]">
                {balance.error ? "Offline" : "Connected"}
              </span>
            </div>
          </div>

          <div
            aria-hidden
            className="relative flex w-[38%] min-w-[116px] max-w-[152px] shrink-0 items-end justify-end pr-5 pb-4 pt-6 pl-1"
          >
            <Image
              src="/state-06.png"
              alt=""
              width={400}
              height={400}
              priority
              draggable={false}
              className="h-[min(118px,31vw)] w-auto max-h-[124px] select-none object-contain object-bottom"
            />
          </div>
        </div>

        <div className="mt-4 grid grid-cols-3 gap-2.5">
          <DashboardTile
            label="Pay"
            tint="#ede9fe"
            iconStroke="#6847e8"
            onClick={() => ctx.push("intent")}
            icon={<ArrowUp />}
          />
          <DashboardTile
            label="Receive"
            tint="#dbefff"
            iconStroke="#0b7dd4"
            onClick={() => ctx.push("receive")}
            icon={<ArrowDown />}
          />
          <DashboardTile
            label="History"
            tint="#d8fae6"
            iconStroke="#0d8948"
            onClick={() => ctx.push("history")}
            icon={<ClockHistory />}
          />
        </div>

        <div className="mt-9">
          <div className="mb-3 flex items-baseline justify-between gap-4">
            <h2 className="font-display text-[19px] font-black tracking-[-0.02em] text-[#131b34]">
              Recent activity
            </h2>
            <button
              type="button"
              onClick={() => ctx.push("history")}
              className="shrink-0 text-[14px] font-bold text-[#7c5cff] transition-opacity hover:opacity-85"
            >
              View all
            </button>
          </div>

          <div className="overflow-hidden rounded-[24px] bg-white shadow-[0_10px_36px_-10px_rgba(15,23,42,0.09)] ring-1 ring-black/[0.03]">
            {slice.map((h, i) => {
              const initial = (h.counterparty.charAt(0) || "?").toUpperCase()
              const bg = h.direction === "out" ? "#e8e0ff" : "#d4f5e6"
              const title = h.direction === "out" ? `To ${h.counterparty}` : `From ${h.counterparty}`
              const amountPrefix = h.direction === "out" ? "−" : "+"
              const statusLabel = h.direction === "out" ? "sent" : "received"
              const statusColor = h.direction === "out" ? "#7c5cff" : "#1b9e5a"
              const amountText =
                h.amount == null ? "—" : `${amountPrefix}${formatUsdc(h.amount)} USDC`

              return (
                <div
                  key={h.id}
                  className={[
                    "flex items-center gap-3 px-4 py-[14px]",
                    i < slice.length - 1 ? "border-b border-[#eef0f3]" : "",
                  ].join(" ")}
                >
                  <div
                    className="flex size-11 shrink-0 items-center justify-center rounded-full text-[16px] font-extrabold text-[#131b34]"
                    style={{ backgroundColor: bg }}
                  >
                    {initial}
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="truncate text-[15px] font-extrabold leading-tight text-[#131b34]">
                      {title}
                    </div>
                    <div className="mt-1 text-[12px] font-semibold capitalize text-[#8b929d]">
                      {h.when || "—"}
                    </div>
                  </div>
                  <div className="shrink-0 text-right">
                    <div className="text-[15px] font-extrabold tabular-nums tracking-tight text-[#131b34]">
                      {amountText}
                    </div>
                    <div className="mt-0.5 text-[11px] font-bold capitalize" style={{ color: statusColor }}>
                      {statusLabel}
                    </div>
                  </div>
                </div>
              )
            })}
          </div>

          {!liveEntries && (
            <div className="mt-2 text-[11px] text-navy/45 text-center font-semibold">
              No on-chain activity yet — showing example entries.
            </div>
          )}
        </div>

        <div className="h-3" aria-hidden />
      </div>
    </div>
  )
}

function PayBar({ onPay }: { onPay: () => void }) {
  const onKeyDown = (e: ReactKeyboardEvent<HTMLButtonElement>) => {
    if (e.key === "Enter" || e.key === " ") onPay()
  }

  return (
    <button
      type="button"
      tabIndex={0}
      aria-label="New payment"
      onClick={onPay}
      onKeyDown={onKeyDown}
      className="pressable mx-auto flex w-full items-center justify-center gap-2.5 rounded-[18px] py-[17px] font-display text-[16px] font-bold text-white outline-none [&_svg]:text-white"
      style={{
        background: "#7c5cff",
        border: "none",
        boxShadow: "0 12px 28px -6px rgba(124,92,255,0.5)",
      }}
    >
      <IconPlane />
      New payment
    </button>
  )
}

function IconPlane() {
  return (
    <svg width={22} height={22} viewBox="0 0 24 24" fill="currentColor" aria-hidden className="shrink-0">
      <path d="M2.01 21 23 12 2.01 3 2 10l15 2-15 2-.99 9z" />
    </svg>
  )
}

function DashboardTile({
  label,
  icon,
  tint,
  iconStroke,
  onClick,
}: {
  label: string
  icon: ReactNode
  tint: string
  iconStroke: string
  onClick: () => void
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="pressable flex flex-col items-center rounded-[22px] bg-white pb-3 pt-6 shadow-[0_8px_28px_-12px_rgba(15,23,42,0.1)] outline-none ring-1 ring-black/[0.03]"
    >
      <span
        className="inline-flex items-center justify-center rounded-full px-[18px] py-[16px]"
        style={{ backgroundColor: tint }}
      >
        <span style={{ color: iconStroke }}>{icon}</span>
      </span>
      <span className="mt-2.5 px-1 text-center font-display text-[13px] font-extrabold leading-snug text-[#131b34]">
        {label}
      </span>
    </button>
  )
}

function ArrowUp() {
  return (
    <svg width={22} height={22} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2.2}>
      <path d="M12 19V5M12 5l-6 6M12 5l6 6" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  )
}

function ArrowDown() {
  return (
    <svg width={22} height={22} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2.2}>
      <path d="M12 5v14M12 19l6-6M12 19l-6-6M5 21h14" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  )
}

function ClockHistory() {
  return (
    <svg width={22} height={22} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2.2}>
      <circle cx={12} cy={12} r={9} />
      <path d="M12 7v6l4 3" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  )
}
