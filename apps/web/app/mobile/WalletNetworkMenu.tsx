"use client"

import Image from "next/image"
import { useEffect, useRef, useState } from "react"

import {
  SOLANA_CLUSTERS,
  type SolanaClusterId,
} from "./cluster-preference"
import type { WalletInfo } from "./screens/types"

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

export function WalletNetworkMenu({
  wallet,
  cluster,
  onClusterChange,
  variant = "default",
}: {
  wallet: WalletInfo
  cluster: SolanaClusterId
  onClusterChange: (id: SolanaClusterId) => void
  /** Cyan pill for secondary headers; menu opens centered under the control. */
  variant?: "default" | "compactCyan"
}) {
  const [open, setOpen] = useState(false)
  const wrapRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (!open) return
    const onDoc = (e: MouseEvent) => {
      if (wrapRef.current?.contains(e.target as Node)) return
      setOpen(false)
    }
    document.addEventListener("mousedown", onDoc)
    return () => document.removeEventListener("mousedown", onDoc)
  }, [open])

  const isCyan = variant === "compactCyan"
  const triggerIconClass = isCyan
    ? "size-[18px] shrink-0 rounded-full object-cover ring-[1.5px] ring-white"
    : "size-[22px] shrink-0 rounded-full object-cover ring-[2px] ring-white"

  return (
    <div className="relative shrink-0" ref={wrapRef}>
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        aria-expanded={open}
        aria-haspopup="listbox"
        aria-label="Wallet and network"
        className={
          isCyan
            ? "pressable inline-flex max-w-[min(200px,42vw)] shrink-0 items-center gap-1.5 rounded-full bg-[#B7F1FF] px-2.5 py-1.5 text-left font-display font-extrabold text-[11px] text-[#0B1020] shadow-[0_1px_2px_rgba(11,16,32,0.06)] outline-none ring-offset-2 focus-visible:ring-2 focus-visible:ring-[#7c5cff]"
            : "pressable inline-flex max-w-[200px] shrink-0 items-center gap-1.5 rounded-full border border-black/[0.05] bg-[#f6f7f9] px-[11px] py-2 text-left shadow-[0_1px_2px_rgba(11,16,32,0.06)] outline-none ring-offset-2 focus-visible:ring-2 focus-visible:ring-[#7c5cff]"
        }
      >
        <Image
          src={walletBrandSrc(wallet.brand)}
          alt=""
          width={44}
          height={44}
          className={triggerIconClass}
          priority
        />
        <span
          className={
            isCyan
              ? "min-w-0 flex-1 truncate capitalize"
              : "min-w-0 flex-1 truncate text-[13px] font-semibold capitalize tracking-tight text-[#141b2f]"
          }
        >
          {wallet.label}
        </span>
        {!isCyan ? (
          <span className="size-2 shrink-0 rounded-full bg-[#22c58a]" aria-hidden />
        ) : null}
        <svg
          width={isCyan ? 11 : 12}
          height={isCyan ? 11 : 12}
          viewBox="0 0 24 24"
          fill="none"
          className={`shrink-0 transition-transform ${open ? "rotate-180" : ""} ${isCyan ? "text-[#0B1020]/55" : "text-[#64748b]"}`}
          aria-hidden
        >
          <path d="M6 9l6 6 6-6" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" />
        </svg>
      </button>

      {open ? (
        <div
          className={[
            "absolute top-[calc(100%+6px)] z-[100] w-[min(260px,calc(100vw-2.5rem))] overflow-hidden rounded-2xl border border-[#eef0f3] bg-white py-2 shadow-[0_16px_40px_-12px_rgba(15,23,42,0.22)]",
            isCyan ? "left-1/2 -translate-x-1/2" : "right-0",
          ].join(" ")}
          role="listbox"
          aria-label="Choose network"
        >
          <div className="px-3 pb-1.5 pt-0.5 text-[10px] font-bold uppercase tracking-[0.12em] text-[#6b7280]">
            Network
          </div>
          {SOLANA_CLUSTERS.map((c) => {
            const selected = cluster === c.id
            return (
              <button
                key={c.id}
                type="button"
                role="option"
                aria-selected={selected}
                onClick={() => {
                  onClusterChange(c.id)
                  setOpen(false)
                }}
                className="flex w-full items-start justify-between gap-2 px-3 py-2.5 text-left pressable hover:bg-[#f9fafb]"
              >
                <span className="min-w-0">
                  <span className="block font-display text-[14px] font-extrabold text-[#131b34]">
                    {c.label}
                  </span>
                  <span className="mt-0.5 block font-mono text-[11px] leading-snug text-[#6b7280]">
                    {c.endpoint}
                  </span>
                </span>
                {selected ? (
                  <svg
                    className="mt-0.5 shrink-0 text-[#7c5cff]"
                    width={18}
                    height={18}
                    viewBox="0 0 24 24"
                    fill="none"
                    aria-hidden
                  >
                    <path
                      d="M20 6L9 17l-5-5"
                      stroke="currentColor"
                      strokeWidth={2.5}
                      strokeLinecap="round"
                      strokeLinejoin="round"
                    />
                  </svg>
                ) : (
                  <span className="size-[18px] shrink-0" aria-hidden />
                )}
              </button>
            )
          })}
        </div>
      ) : null}
    </div>
  )
}
