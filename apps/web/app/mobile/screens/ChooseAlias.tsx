"use client"

import { useMemo, useState } from "react"

import { KUMO_ALIAS_MIN_LEN, sanitizeKumoLocalPart } from "../alias-utils"
import { PrimaryCTA } from "./atoms"
import type { NavCtx, ScreenRenderer } from "./types"

function AliasForm({ ctx }: { ctx: NavCtx }) {
  const [value, setValue] = useState("")
  const slug = useMemo(() => sanitizeKumoLocalPart(value), [value])
  const valid = slug.length >= KUMO_ALIAS_MIN_LEN
  const preview = slug || "your-alias"

  return (
    <div className="pb-10">
      <div className="mt-6 text-center">
        <p className="text-[11px] font-bold uppercase tracking-[0.2em] text-navy/45">
          Welcome
        </p>
        <h1 className="font-display mt-2 text-[26px] font-extrabold leading-[1.15] tracking-[-0.03em] text-navy">
          Choose your alias
        </h1>
        <p className="mx-auto mt-2 max-w-[30ch] text-[14px] leading-snug text-navy/50">
          This is how your contacts will see you. Lowercase letters, numbers, and underscores only.
        </p>
      </div>

      <div className="mt-8 rounded-[22px] border border-navy/[0.08] bg-white/90 px-4 py-4 shadow-[0_12px_40px_rgba(15,23,42,0.06)] backdrop-blur-sm">
        <label
          htmlFor="kumo-alias"
          className="text-[11px] font-bold uppercase tracking-wide text-navy/45"
        >
          Your alias
        </label>
        <div className="mt-2 flex overflow-hidden rounded-2xl border-2 border-navy/[0.1] bg-cream px-4 py-[14px] focus-within:border-cyan focus-within:ring-4 focus-within:ring-cyan/25">
          <input
            id="kumo-alias"
            type="text"
            inputMode="text"
            autoComplete="nickname"
            autoCapitalize="none"
            spellCheck={false}
            aria-invalid={value.length > 0 && !valid}
            value={value}
            placeholder="lunadev"
            maxLength={32}
            className="min-w-0 flex-1 bg-transparent font-display text-[17px] font-bold text-navy outline-none placeholder:text-navy/25"
            onChange={(e) => setValue(e.target.value)}
          />
        </div>
        <p className="mt-3 truncate text-[13px] font-semibold text-navy/60">
          <span className="text-navy/40">Others will see you as:</span>{" "}
          <span className="break-all font-display text-[15px] font-black text-navy">
            {preview}
          </span>
        </p>
      </div>

      <div className="mt-12">
        <PrimaryCTA
          disabled={!valid}
          onClick={() =>
            slug.length >= KUMO_ALIAS_MIN_LEN &&
            ctx.completeAliasOnboarding(slug)
          }
        >
          Continue
        </PrimaryCTA>
      </div>
    </div>
  )
}

/** One-time onboarding: pick public alias (plain text, no domain). */
export const ChooseAlias: ScreenRenderer = (ctx) => ({
  body: <AliasForm ctx={ctx} />,
})
