"use client"

import Image from "next/image"

import type { ScreenRenderer } from "./types"

const WALLETS = [
  { name: "Phantom",  id: "phantom",  initial: "P", logoSrc: "/wallet-phantom.png" },
  { name: "Solflare", id: "solflare", initial: "S", logoSrc: "/wallet-solflare.png" },
  { name: "Backpack", id: "backpack", initial: "B", logoSrc: "/wallet-backpack.png" },
  { name: "Glow",     id: "glow",     initial: "G", logoSrc: "/wallet-glow.png" },
] as const

/** Connect wallet landing — polished mobile welcome + wallet picker. */
export const Connect: ScreenRenderer = (ctx) => ({
  body: (
    <div className="-mx-5 mt-[-2px] min-h-[min(72dvh,720px)] bg-gradient-to-b from-white via-[#f9fbff] to-[#ecf0fb] px-5 pb-10 pt-1">
      {/* Hero */}
      <div className="flex flex-col items-center pb-8 pt-6 text-center">
        <div
          className="relative mx-auto w-[88%] max-w-[295px]"
          style={{ aspectRatio: "1 / 0.94" }}
        >
          {/* Signal arcs — cyan curves to the mascot's left */}
          <div
            aria-hidden
            className="pointer-events-none absolute left-[-6%] top-[52%] -translate-y-1/2"
          >
            <svg
              width={58}
              height={96}
              viewBox="0 0 58 96"
              fill="none"
              xmlns="http://www.w3.org/2000/svg"
              className="opacity-[0.55]"
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

          <div className="motion-safe:animate-breathe flex h-full items-end justify-center">
            <Image
              src="/state-05.png"
              alt="Kumo friendly mascot waving"
              width={340}
              height={340}
              priority
              className="relative z-[1] w-[calc(76vw-32px)] max-w-[278px] h-auto translate-y-[2px]"
              draggable={false}
            />
          </div>
        </div>

        <h1 className="font-display relative z-[1] mt-4 max-w-[18ch] text-[clamp(28px,7.4vw,34px)] font-extrabold leading-[1.12] tracking-[-0.03em] text-[#0f131c]">
          Welcome to Kumo
        </h1>
        <p className="relative z-[1] mt-2 max-w-[22ch] text-[15px] leading-snug text-slate-500">
          Pay when the signal disappears.
        </p>
      </div>

      <p className="mb-2 text-center text-[11px] font-semibold uppercase tracking-[0.18em] text-slate-400">
        Choose a wallet
      </p>

      <div
        className="overflow-hidden rounded-[26px] border border-slate-100/80 bg-white shadow-[0_14px_44px_rgba(15,23,42,0.09)]"
        role="list"
      >
        {WALLETS.map((w, i, arr) => (
          <button
            key={w.id}
            type="button"
            role="listitem"
            disabled={ctx.busy}
            onClick={() => {
              void ctx.beginWalletConnect(w.id)
            }}
            className={[
              "flex w-full items-center gap-3 px-[18px] py-[15px] text-left outline-none ring-inset motion-safe:transition-colors",
              "cursor-pointer hover:bg-slate-50/90 active:bg-slate-100/90 disabled:opacity-60 disabled:cursor-wait",
              "focus-visible:bg-slate-50 focus-visible:ring-2 focus-visible:ring-black/25",
              i < arr.length - 1 ? "border-b border-slate-100" : "",
            ].join(" ")}
          >
            <div
              className="relative flex size-11 flex-none shrink-0 items-center justify-center overflow-hidden rounded-full shadow-[0_12px_30px_-12px_rgba(22,59,138,0.35)] ring-4 ring-black/[0.04]"
              aria-hidden
            >
              <Image
                src={w.logoSrc}
                alt=""
                width={44}
                height={44}
                className="size-full object-cover"
                draggable={false}
              />
            </div>
            <div className="flex min-w-0 flex-1 flex-col gap-0.5">
              <span className="truncate text-[16px] font-bold leading-none text-black">
                {w.name}
              </span>
              <span className="text-[12px] leading-tight text-slate-400">
                Detected · Tap to connect
              </span>
            </div>
            <span
              className="flex-none shrink-0 pr-1 text-[18px] font-semibold tabular-nums text-slate-300"
              aria-hidden
            >
              ›
            </span>
          </button>
        ))}
      </div>

      {ctx.error ? (
        <p className="mt-4 px-4 text-center text-[12px] font-semibold text-[#b91c1c]">
          {ctx.error}
        </p>
      ) : null}

      <p className="mt-5 px-4 text-center text-[12px] text-slate-500">
        Devnet only. No real funds will move.
      </p>
      <p className="mt-2 px-4 text-center text-[13px] font-semibold">
        <a
          href="https://faucet.circle.com/"
          target="_blank"
          rel="noopener noreferrer"
          className="text-[#6d28d9] underline decoration-[#d8b4fe] underline-offset-[3px] transition-colors hover:text-[#5b21b6]"
        >
          Need devnet USDC? faucet.circle.com
        </a>
      </p>
    </div>
  ),
})
