"use client"

import { PrimaryCTA } from "./atoms"
import type { ScreenRenderer } from "./types"
import { DEMO_CONTACTS } from "./mock-history"

export const Contacts: ScreenRenderer = (ctx) => ({
  body: (
    <div>
      <div className="font-display font-black text-navy text-[28px] tracking-[-0.02em] leading-none mt-1">
        Contacts
      </div>
      <div className="text-[13px] font-semibold text-navy/55 mt-1.5">
        Tap someone to start a payment.
      </div>

      {/* Search (visual only) */}
      <div className="mt-4 bg-white rounded-2xl softshadow-sm flex items-center gap-2 px-4 py-3">
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none">
          <circle cx="11" cy="11" r="7" stroke="#0B1020" strokeWidth="2" opacity="0.45" />
          <path d="M20 20l-3.5-3.5" stroke="#0B1020" strokeWidth="2" strokeLinecap="round" opacity="0.45" />
        </svg>
        <span className="text-[14px] text-navy/45 font-semibold">Search by name or @handle</span>
      </div>

      <div className="mt-4 bg-white rounded-2xl softshadow-sm overflow-hidden">
        {DEMO_CONTACTS.map((c, i) => (
          <button
            key={c.id}
            onClick={() => {
              ctx.setIntentText(`pay ${c.id} 1 usdc privately`)
              ctx.push("intent")
            }}
            className={[
              "pressable w-full flex items-center gap-3 px-4 py-3 text-left",
              i < DEMO_CONTACTS.length - 1 ? "border-b border-dashed border-navy/8" : "",
            ].join(" ")}
          >
            <div
              className="w-10 h-10 rounded-full flex items-center justify-center font-display font-black text-navy text-[16px]"
              style={{ background: c.bg }}
            >
              {c.initial}
            </div>
            <div className="flex-1 min-w-0">
              <div className="font-extrabold text-navy text-[14px] truncate">{c.name}</div>
              <div className="text-[12px] text-navy/55 font-semibold truncate">{c.handle}</div>
            </div>
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" aria-hidden>
              <path
                d="M9 6l6 6-6 6"
                stroke="#0B1020"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
                opacity="0.4"
              />
            </svg>
          </button>
        ))}
      </div>
    </div>
  ),
  cta: <PrimaryCTA onClick={() => ctx.push("intent")}>New payment →</PrimaryCTA>,
})
