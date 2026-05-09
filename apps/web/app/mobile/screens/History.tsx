"use client"

import { SecondaryCTA } from "./atoms"
import type { ScreenRenderer } from "./types"
import { DEMO_HISTORY } from "./mock-history"
import { useTxHistory } from "../use-tx-history"

const formatUsdc = (n: number) =>
  n.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })

export const History: ScreenRenderer = (ctx) => ({
  body: <HistoryBody ctx={ctx} />,
  cta: <SecondaryCTA onClick={ctx.back}>Back to home</SecondaryCTA>,
})

function HistoryBody({ ctx }: { ctx: Parameters<ScreenRenderer>[0] }) {
  const live = useTxHistory(ctx.wallet?.pubkey ?? null, 20)
  const liveEntries = live.entries.length > 0
  const list = liveEntries ? live.entries : DEMO_HISTORY
  return (
    <div>
      <div className="font-display font-black text-navy text-[28px] tracking-[-0.02em] leading-none mt-1">
        History
      </div>
      <div className="text-[13px] font-semibold text-navy/55 mt-1.5">
        Every Kumo you&apos;ve sent and received.
      </div>

      <div className="mt-4 bg-white rounded-2xl softshadow-sm overflow-hidden">
        {list.map((h, i) => (
          <a
            key={h.id}
            href={
              "signature" in h && h.signature
                ? `https://solscan.io/tx/${h.signature}?cluster=devnet`
                : undefined
            }
            target={"signature" in h ? "_blank" : undefined}
            rel={"signature" in h ? "noreferrer" : undefined}
            className={[
              "flex items-center gap-3 px-4 py-3.5",
              i < list.length - 1 ? "border-b border-dashed border-navy/8" : "",
              "signature" in h ? "hover:bg-sky/20 transition-colors" : "",
            ].join(" ")}
          >
            <div
              className="w-9 h-9 rounded-full flex items-center justify-center font-extrabold text-[15px] text-navy"
              style={{ background: h.direction === "out" ? "#C7B5FF" : "#7FE8FF" }}
            >
              {h.direction === "out" ? "↑" : "↓"}
            </div>
            <div className="flex-1 min-w-0">
              <div className="font-extrabold text-navy text-[14px] truncate">
                {h.direction === "out" ? `Sent ${h.counterparty}` : `From ${h.counterparty}`}
              </div>
              <div className="text-[11px] text-navy/55 font-semibold">{h.when || "—"}</div>
            </div>
            <div className="text-right">
              <div className="font-extrabold text-navy text-[15px]">
                {h.amount == null
                  ? "—"
                  : `${h.direction === "out" ? "−" : "+"}$${formatUsdc(h.amount)}`}
              </div>
              <div
                className="text-[10px] font-bold uppercase tracking-wide mt-0.5"
                style={{
                  color: h.status === "queued" ? "#7B6CC9" : "#0B1020",
                  opacity: h.status === "queued" ? 1 : 0.55,
                }}
              >
                {h.status}
              </div>
            </div>
          </a>
        ))}
      </div>

      {!liveEntries && (
        <div className="text-[11px] text-navy/55 text-center mt-4 font-semibold">
          No on-chain activity yet — showing example entries.
        </div>
      )}
      {live.error && (
        <div className="text-[11px] text-navy/55 text-center mt-2 font-semibold">
          Couldn&apos;t reach RPC: {live.error}
        </div>
      )}
    </div>
  )
}
