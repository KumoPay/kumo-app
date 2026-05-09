"use client"

import Image from "next/image"

import { useTxHistory } from "../use-tx-history"
import type { ScreenRenderer } from "./types"
import { mock, type HistoryEntry } from "./mock"

const purple = "#7B61FF"

function formatAmount(n: number) {
  return Number.isInteger(n) ? String(n) : n.toFixed(1).replace(/\.0$/, "")
}

function statusLabel(status: HistoryEntry["status"]) {
  return status === "queued" ? "pending" : "delivered"
}

function statusColor(status: HistoryEntry["status"]) {
  return status === "queued" ? "#ea580c" : "#16a34a"
}

function initialForEntry(h: HistoryEntry) {
  const c = mock.contacts.find((x) => x.id === h.counterparty)
  return c?.initial ?? h.counterparty.charAt(0).toUpperCase()
}

export const History: ScreenRenderer = (ctx) => ({
  body: <HistoryBody ctx={ctx} />,
  cta: (
    <div className="mx-auto w-full max-w-[320px]">
      <button
        type="button"
        onClick={() => ctx.resetHome()}
        className="pressable flex w-full items-center justify-center gap-2 rounded-[18px] border-2 bg-white py-[15px] font-display text-[15px] font-bold outline-none"
        style={{ borderColor: purple, color: purple }}
      >
        <svg
          width="20"
          height="20"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth={2}
          aria-hidden
        >
          <path d="M3 10.5 12 3l9 7.5V20a1 1 0 0 1-1 1h-5v-6H9v6H4a1 1 0 0 1-1-1v-9.5Z" />
        </svg>
        Back to home
      </button>
    </div>
  ),
})

function HistoryBody({ ctx }: { ctx: Parameters<ScreenRenderer>[0] }) {
  const live = useTxHistory(ctx.wallet?.pubkey ?? null, 25)
  const liveEntries: HistoryEntry[] = live.entries.map((e) => ({
    id: e.id,
    direction: e.direction,
    counterparty: e.counterparty,
    amount: e.amount ?? 0,
    status: "delivered",
    when: e.when || "—",
  }))
  const entries: HistoryEntry[] = liveEntries.length > 0 ? liveEntries : mock.history
  const isLive = liveEntries.length > 0

  return (
    <div className="mx-auto w-full max-w-[320px] pb-2">
      <h1 className="font-display text-[26px] font-black leading-tight tracking-[-0.02em] text-[#1a1c3d]">
        History
      </h1>
      <p className="mt-2 text-[14px] font-medium leading-snug text-[#64748b]">
        Review your sent and received payments.
      </p>

      <div className="relative z-0 mx-auto mt-5 flex min-h-[min(220px,52vw)] w-full items-end justify-center px-1">
        <Image
          src="/state-05.png"
          alt=""
          width={640}
          height={640}
          priority
          draggable={false}
          sizes="(max-width: 420px) 92vw, 320px"
          className="relative z-0 h-[min(280px,72vw)] w-auto max-w-[min(340px,94vw)] select-none object-contain object-bottom drop-shadow-[0_12px_32px_rgba(15,23,42,0.08)]"
        />
      </div>

      <div className="relative z-[1] -mt-16 overflow-hidden rounded-[18px] border border-[#eef2f6] bg-white pt-2 shadow-[0_12px_40px_-18px_rgba(15,23,42,0.12)]">
        {entries.map((h, i) => {
          const isOut = h.direction === "out"
          const label = isOut ? `To ${h.counterparty}` : `From ${h.counterparty}`
          const initial = initialForEntry(h)
          const bgOut = "#ede9fe"
          const fgOut = "#5b21b6"
          const bgIn = "#dcfce7"
          const fgIn = "#166534"
          return (
            <div
              key={h.id}
              className={[
                "flex items-center gap-3 px-4 py-3.5",
                i < entries.length - 1 ? "border-b border-[#f1f5f9]" : "",
              ].join(" ")}
            >
              <div
                className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full font-display text-[16px] font-black"
                style={{
                  background: isOut ? bgOut : bgIn,
                  color: isOut ? fgOut : fgIn,
                }}
              >
                {initial}
              </div>
              <div className="min-w-0 flex-1">
                <div className="truncate font-extrabold lowercase text-[#1a1c3d]">
                  {label}
                </div>
                <div className="text-[12px] font-semibold lowercase text-[#94a3b8]">
                  {h.when}
                </div>
              </div>
              <div className="shrink-0 text-right">
                <div className="font-extrabold text-[15px] text-[#1a1c3d]">
                  {isOut ? "−" : "+"}
                  {formatAmount(h.amount)} USDC
                </div>
                <div
                  className="mt-0.5 text-[12px] font-bold capitalize"
                  style={{ color: statusColor(h.status) }}
                >
                  {statusLabel(h.status)}
                </div>
              </div>
            </div>
          )
        })}
      </div>

      {!isLive ? (
        <p className="mt-2 text-center text-[11px] font-semibold text-navy/45">
          No on-chain activity yet — showing example entries.
        </p>
      ) : null}
    </div>
  )
}
