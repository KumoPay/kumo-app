"use client"

import type { ScreenRenderer } from "./types"
import { mock } from "./mock"

const purple = "#7c5cff"

export const Contacts: ScreenRenderer = (ctx) => ({
  body: (
    <div className="mx-auto w-full max-w-[320px] pb-1">
      <h1 className="font-display text-[26px] font-black leading-tight tracking-[-0.02em] text-[#1a1c3d]">
        Contacts
      </h1>
      <p className="mt-2 text-[14px] font-medium leading-snug text-[#64748b]">
        Choose who to pay.
      </p>

      <div className="mt-5 flex items-center gap-3 rounded-[18px] border border-[#e8eaed] bg-white px-4 py-3.5 shadow-[0_2px_12px_rgba(15,23,42,0.06)]">
        <svg
          width="18"
          height="18"
          viewBox="0 0 24 24"
          fill="none"
          className="shrink-0 text-[#94a3b8]"
          aria-hidden
        >
          <circle cx="11" cy="11" r="7" stroke="currentColor" strokeWidth={2} />
          <path
            d="M20 20l-3.5-3.5"
            stroke="currentColor"
            strokeWidth={2}
            strokeLinecap="round"
          />
        </svg>
        <span className="text-[14px] font-semibold text-[#94a3b8]">
          Search by name or handle
        </span>
      </div>

      <div className="mt-4 flex flex-col gap-3">
        {mock.contacts.map((c) => (
          <button
            key={c.id}
            type="button"
            onClick={() => ctx.push("intent")}
            className="pressable flex w-full items-center gap-3 rounded-[18px] border border-[#eef0f3] bg-white px-4 py-3.5 text-left shadow-[0_8px_24px_-12px_rgba(15,23,42,0.1)]"
          >
            <div
              className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full font-display text-[17px] font-black text-[#0f172a]"
              style={{ background: c.bg }}
            >
              {c.initial}
            </div>
            <div className="min-w-0 flex-1">
              <div className="truncate font-extrabold text-[15px] text-[#1a1c3d]">
                {c.name}
              </div>
              <div className="mt-0.5 truncate text-[13px] font-semibold text-[#64748b]">
                {c.handle}
              </div>
            </div>
            <svg
              width="18"
              height="18"
              viewBox="0 0 24 24"
              fill="none"
              className="shrink-0 text-[#cbd5e1]"
              aria-hidden
            >
              <path
                d="M9 6l6 6-6 6"
                stroke="currentColor"
                strokeWidth={2}
                strokeLinecap="round"
                strokeLinejoin="round"
              />
            </svg>
          </button>
        ))}
      </div>
    </div>
  ),
  cta: (
    <div className="mx-auto w-full max-w-[320px]">
      <button
        type="button"
        onClick={() => ctx.push("intent")}
        className="pressable w-full rounded-[18px] py-[17px] font-display text-[16px] font-bold text-white outline-none"
        style={{
          background: purple,
          border: "none",
          boxShadow: "0 12px 28px -6px rgba(124,92,255,0.5)",
        }}
      >
        New payment
      </button>
    </div>
  ),
})
