"use client"

import { useCallback, useState } from "react"

import { displayWalletAlias } from "../alias-utils"
import { clusterDisplayLabel } from "../cluster-preference"
import type { NavCtx, ScreenRenderer } from "./types"
import { mock } from "./mock"

const brandPurple = "#7B61FF"

function networkLine(cluster: string): string {
  const c = cluster.toLowerCase()
  if (c === "mainnet") return "Solana mainnet"
  return `Solana ${c}`
}

export const Receive: ScreenRenderer = (ctx) => ({
  body: <ReceiveView ctx={ctx} />,
})

function ReceiveView({ ctx }: { ctx: NavCtx }) {
  const [copied, setCopied] = useState(false)
  const pubkey = ctx.wallet?.pubkey ?? mock.walletPubkey
  const clusterLabel = clusterDisplayLabel(ctx.solanaCluster)
  const aliasBase =
    displayWalletAlias(ctx.wallet?.displayName) || mock.walletDisplayName
  const handleDisplay = `${aliasBase}.kumo`

  const copyAddress = useCallback(async () => {
    try {
      await navigator.clipboard.writeText(pubkey)
      setCopied(true)
      window.setTimeout(() => setCopied(false), 2500)
    } catch {
      /* ignore */
    }
  }, [pubkey])

  return (
    <div className="relative mx-auto w-full max-w-[320px] pb-2">
      {copied ? (
        <div
          role="status"
          className="fixed left-1/2 top-[88px] z-[200] -translate-x-1/2 rounded-full bg-[#0f172a] px-4 py-2.5 text-[13px] font-semibold text-white shadow-lg"
        >
          Copied
        </div>
      ) : null}

      <h1 className="font-display text-center text-[26px] font-black leading-tight tracking-[-0.02em] text-[#1a1c3d]">
        Receive
      </h1>
      <p className="mt-2 text-center text-[14px] font-medium leading-snug text-[#64748b]">
        Show this code to get paid.
      </p>

      <div className="mt-6 rounded-[22px] border border-[#eef2f6] bg-white p-5 shadow-[0_12px_40px_-18px_rgba(15,23,42,0.12)]">
        <div
          className="flex justify-center rounded-2xl p-4"
          style={{ background: "#FAFCFF" }}
        >
          <MockQR />
        </div>
        <div className="mt-5 text-center font-display text-[18px] font-black tracking-[-0.01em] text-[#1a1c3d]">
          {handleDisplay}
        </div>
      </div>

      <div className="mt-4 rounded-[18px] border border-[#eef2f6] bg-white p-5 shadow-[0_8px_28px_-12px_rgba(15,23,42,0.1)]">
        <DetailRow label="Network" value={networkLine(clusterLabel)} />
        <DetailRow label="Token" value="USDC" />
        <DetailRow
          label="Wallet"
          value={ctx.wallet?.label ?? mock.walletLabel}
          last
        />
      </div>

      <button
        type="button"
        onClick={copyAddress}
        className="pressable mt-6 flex w-full items-center justify-center gap-2 rounded-[18px] py-[17px] font-display text-[16px] font-bold text-white outline-none"
        style={{
          background: brandPurple,
          border: "none",
          boxShadow: "0 12px 28px -6px rgba(123,97,255,0.45)",
        }}
      >
        <svg
          width="20"
          height="20"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth={2.2}
          strokeLinecap="round"
          strokeLinejoin="round"
          aria-hidden
        >
          <rect x="9" y="9" width="13" height="13" rx="2" />
          <path d="M5 15H4a2 2 0 01-2-2V4a2 2 0 012-2h9a2 2 0 012 2v1" />
        </svg>
        Copy address
      </button>
    </div>
  )
}

function DetailRow({
  label,
  value,
  last,
}: {
  label: string
  value: string
  last?: boolean
}) {
  return (
    <div
      className={[
        "flex items-center justify-between gap-3 py-3.5",
        last ? "" : "border-b border-[#f1f5f9]",
      ].join(" ")}
    >
      <span className="text-[13px] font-semibold text-[#64748b]">{label}</span>
      <span className="text-right text-[14px] font-extrabold text-[#1a1c3d]">
        {value}
      </span>
    </div>
  )
}

function MockQR() {
  const SIZE = 21
  const cells: boolean[][] = []
  for (let y = 0; y < SIZE; y++) {
    const row: boolean[] = []
    for (let x = 0; x < SIZE; x++) {
      const inFinder =
        (x < 7 && y < 7) ||
        (x >= SIZE - 7 && y < 7) ||
        (x < 7 && y >= SIZE - 7)
      if (inFinder) {
        const fx = x < 7 ? x : SIZE - 1 - x
        const fy = y < 7 ? y : SIZE - 1 - y
        const onRing = fx === 0 || fx === 6 || fy === 0 || fy === 6
        const inCore = fx >= 2 && fx <= 4 && fy >= 2 && fy <= 4
        row.push(onRing || inCore)
        continue
      }
      const v = Math.sin((x * 73 + y * 131 + 17) * 0.5) * 10000
      row.push((v - Math.floor(v)) > 0.55)
    }
    cells.push(row)
  }

  const cell = 8
  const dot = 5.5
  const navy = "#1a1c3d"
  return (
    <svg
      width={SIZE * cell}
      height={SIZE * cell}
      viewBox={`0 0 ${SIZE * cell} ${SIZE * cell}`}
      aria-hidden
    >
      {cells.map((row, y) =>
        row.map((on, x) =>
          on ? (
            <circle
              key={`${x}-${y}`}
              cx={x * cell + cell / 2}
              cy={y * cell + cell / 2}
              r={dot / 2}
              fill={navy}
            />
          ) : null,
        ),
      )}
    </svg>
  )
}
