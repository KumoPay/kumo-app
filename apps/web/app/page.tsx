"use client";

import Image from "next/image";
import Link from "next/link";

import LandingNav from "@/components/landing-nav";
import { GetTheAppButton } from "@/components/get-app-stores";
import { usePathname } from "next/navigation";
import { useState, useLayoutEffect, useRef, useCallback, type MouseEvent, type PointerEvent } from "react";

const strokePurple = "#6d28d9";

/** Main heading — #privacy anchor targets this visual line */
const PRIVACY_SECTION_HEADLINE = "Privacy and control for every payment";

/** Line icons instead of emoji — 3-step flow */
function IconStepSay() {
  return (
    <svg width={26} height={26} viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <path
        d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2v10z"
        stroke={strokePurple}
        strokeWidth={1.65}
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <path d="M8 10h8M8 14h5" stroke={strokePurple} strokeWidth={1.65} strokeLinecap="round" />
    </svg>
  );
}

function IconStepSign() {
  return (
    <svg width={26} height={26} viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <path
        d="M17 3a2.828 2.828 0 1 1 4 4L7 21l-4 1 1-4 14-14z"
        stroke={strokePurple}
        strokeWidth={1.65}
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

function IconStepSettle() {
  return (
    <svg width={26} height={26} viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <circle cx="12" cy="12" r="9" stroke={strokePurple} strokeWidth={1.65} />
      <path d="m8 12 3 3 5.5-5.5" stroke={strokePurple} strokeWidth={1.65} strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

/** Feature tiles — color from parent via currentColor */
function IconFeatShield() {
  return (
    <svg width={22} height={22} viewBox="0 0 24 24" fill="none" aria-hidden="true" className="shrink-0">
      <path
        d="M12 22s8-4 8-10V6l-8-3-8 3v6c0 6 8 10 8 10z"
        stroke="currentColor"
        strokeWidth={1.65}
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

function IconFeatOffline() {
  return (
    <svg width={22} height={22} viewBox="0 0 24 24" fill="none" aria-hidden="true" className="shrink-0">
      <circle cx="12" cy="12" r="9" stroke="currentColor" strokeWidth={1.65} />
      <path d="m5 5 14 14" stroke="currentColor" strokeWidth={1.65} strokeLinecap="round" />
    </svg>
  );
}

function IconFeatSync() {
  return (
    <svg width={22} height={22} viewBox="0 0 24 24" fill="none" aria-hidden="true" className="shrink-0">
      <path
        d="M23 4v6h-6M14.93 17.93A10 10 0 0 1 4 17M1 20v-6h6M9.07 6.07A10 10 0 0 1 20 7"
        stroke="currentColor"
        strokeWidth={1.65}
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

export default function LandingPage() {
  const [kumoRevealed, setKumoRevealed] = useState(false);
  const [kumoPlayEntryAnimation, setKumoPlayEntryAnimation] = useState(true);
  const kumoRevealRef = useRef<HTMLDivElement>(null);
  const heroSectionRef = useRef<HTMLElement>(null);
  const heroGlowTargetRef = useRef({ x: 0.5, y: 0.42 });
  const heroGlowCurrentRef = useRef({ x: 0.5, y: 0.42 });
  const heroGlowRafRef = useRef<number | null>(null);
  const pathname = usePathname();
  const privacyHeadlineRef = useRef<HTMLHeadingElement>(null);
  const privacyTypeTimeoutRef = useRef<number | null>(null);

  const [privacyTypedChars, setPrivacyTypedChars] = useState("");
  const [privacyTypeDone, setPrivacyTypeDone] = useState(false);
  const [privacyTypePlaying, setPrivacyTypePlaying] = useState(false);

  const flushHeroGlowVars = useCallback(() => {
    const el = heroSectionRef.current;
    if (!el) return;
    const { x, y } = heroGlowCurrentRef.current;
    el.style.setProperty("--hero-glow-x", `${x * 100}%`);
    el.style.setProperty("--hero-glow-y", `${y * 100}%`);
  }, []);

  const tickHeroGlow = useCallback(() => {
    const cur = heroGlowCurrentRef.current;
    const tgt = heroGlowTargetRef.current;
    const k = 0.135;
    cur.x += (tgt.x - cur.x) * k;
    cur.y += (tgt.y - cur.y) * k;
    flushHeroGlowVars();
    const drift = Math.abs(tgt.x - cur.x) + Math.abs(tgt.y - cur.y);
    if (drift > 0.004) {
      heroGlowRafRef.current = requestAnimationFrame(tickHeroGlow);
    } else {
      heroGlowRafRef.current = null;
    }
  }, [flushHeroGlowVars]);

  const scheduleHeroGlow = useCallback(() => {
    if (heroGlowRafRef.current != null) return;
    heroGlowRafRef.current = requestAnimationFrame(tickHeroGlow);
  }, [tickHeroGlow]);

  const onHeroPointerMove = useCallback(
    (e: PointerEvent<HTMLElement>) => {
      if (typeof window === "undefined") return;
      if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
      if (!window.matchMedia("(pointer: fine)").matches) return;
      const el = heroSectionRef.current;
      if (!el) return;
      const rect = el.getBoundingClientRect();
      if (rect.width < 1 || rect.height < 1) return;
      heroGlowTargetRef.current = {
        x: Math.min(1, Math.max(0, (e.clientX - rect.left) / rect.width)),
        y: Math.min(1, Math.max(0, (e.clientY - rect.top) / rect.height)),
      };
      scheduleHeroGlow();
    },
    [scheduleHeroGlow]
  );

  const onHeroPointerLeave = useCallback(() => {
    heroGlowTargetRef.current = { x: 0.5, y: 0.42 };
    scheduleHeroGlow();
  }, [scheduleHeroGlow]);

  useLayoutEffect(() => {
    return () => {
      if (heroGlowRafRef.current != null) cancelAnimationFrame(heroGlowRafRef.current);
    };
  }, []);

  useLayoutEffect(() => {
    const mq = window.matchMedia("(prefers-reduced-motion: reduce)");
    if (mq.matches) {
      setKumoRevealed(true);
      setKumoPlayEntryAnimation(false);
      return;
    }
    const el = kumoRevealRef.current;
    if (!el) return;

    const io = new IntersectionObserver(
      (entries) => {
        const e = entries[0];
        if (!e?.isIntersecting) return;
        setKumoRevealed(true);
        io.disconnect();
      },
      {
        threshold: 0.05,
        rootMargin: "0px 0px -8% 0px",
      }
    );

    io.observe(el);
    return () => io.disconnect();
  }, []);

  useLayoutEffect(() => {
    const el = privacyHeadlineRef.current;
    if (!el || typeof window === "undefined") return undefined;

    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) {
      setPrivacyTypedChars(PRIVACY_SECTION_HEADLINE);
      setPrivacyTypeDone(true);
      return undefined;
    }

    const cancelPendingType = () => {
      if (privacyTypeTimeoutRef.current != null) {
        clearTimeout(privacyTypeTimeoutRef.current);
        privacyTypeTimeoutRef.current = null;
      }
    };

    const queueTypeStep = (fn: () => void, ms: number) => {
      cancelPendingType();
      privacyTypeTimeoutRef.current = window.setTimeout(fn, ms);
    };

    const io = new IntersectionObserver(
      (entries) => {
        const e = entries[0];
        if (!e?.isIntersecting) return;
        io.disconnect();

        let i = -1;
        setPrivacyTypePlaying(true);

        const tick = () => {
          i += 1;
          if (i >= PRIVACY_SECTION_HEADLINE.length) {
            setPrivacyTypedChars(PRIVACY_SECTION_HEADLINE);
            setPrivacyTypeDone(true);
            setPrivacyTypePlaying(false);
            cancelPendingType();
            return;
          }
          setPrivacyTypedChars(PRIVACY_SECTION_HEADLINE.slice(0, i + 1));
          const ch = PRIVACY_SECTION_HEADLINE.charAt(i);
          let delay = 42;
          if (i === 0) delay = 240;
          else if (/[.]/.test(ch)) delay = 130;
          else if (/\s/.test(ch)) delay = 88;
          else if (/[’']/.test(ch)) delay = 55;
          queueTypeStep(tick, delay);
        };

        queueTypeStep(tick, 140);
      },
      {
        threshold: 0.45,
        rootMargin: "0px 0px -10% 0px",
      }
    );

    io.observe(el);
    return () => {
      cancelPendingType();
      io.disconnect();
    };
  }, []);

  const goMain = (e: MouseEvent<HTMLAnchorElement>) => {
    if (pathname === "/") {
      e.preventDefault();
      window.scrollTo({ top: 0, behavior: "smooth" });
    }
  };

  return (
    <div
      className="landing-page landing-page-motion min-h-screen bg-white selection:bg-[#ede9fe] selection:text-[#1e1b4b]"
      style={{ fontFamily: "'DM Sans', 'Nunito', 'Segoe UI', sans-serif" }}
    >
      {/* NAVBAR */}
      <LandingNav />

      {/* HERO */}
      <section
        ref={heroSectionRef}
        onPointerMove={onHeroPointerMove}
        onPointerLeave={onHeroPointerLeave}
        className="[--hero-glow-x:50%] [--hero-glow-y:42%]"
        style={{
          paddingTop: 76,
          position: "relative",
          background: "linear-gradient(160deg, #ffffff 0%, #f5f3ff 60%, #ede9fe 100%)",
          overflow: "hidden",
        }}
      >
        <div
          aria-hidden
          className="pointer-events-none absolute inset-0 z-0"
          style={{
            background:
              "radial-gradient(ellipse 116% 96% at var(--hero-glow-x) var(--hero-glow-y), rgba(109, 40, 217, 0.28) 0%, rgba(139, 92, 246, 0.16) 32%, rgba(221, 214, 254, 0.1) 50%, rgba(237, 233, 254, 0.05) 65%, transparent 80%)",
          }}
        />
        <div
          style={{ maxWidth: 1100, margin: "0 auto", padding: "16px 20px 4px", position: "relative", zIndex: 15 }}
          className="flex flex-col lg:flex-row items-center gap-6 lg:gap-8"
        >

          <div className="w-full shrink-0 pt-10 sm:pt-12 lg:pt-[3.75rem] text-center lg:flex-1 lg:max-w-[480px] lg:text-left">
            <h1 className="transition-[color] duration-200 ease-out" style={{ fontSize: "clamp(34px, 4.75vw, 54px)", fontWeight: 900, color: "#0f0e1a", lineHeight: 1.12, marginBottom: 14, letterSpacing: "-1.5px" }}>
              Private payments,<br />
              even{" "}
              <span className="cursor-default text-[#6366f1] transition-[color,text-shadow] duration-200 ease-out hover:text-[#4f46e5] hover:drop-shadow-sm">
                offline.
              </span>
            </h1>
            <p className="mx-auto max-w-[400px] lg:mx-0" style={{ fontSize: 17, color: "#64748b", lineHeight: 1.65, marginBottom: 22 }}>
              Write a payment in plain language, sign it without a connection, and settle it privately when you&apos;re online again.
            </p>
            <div className="flex justify-center lg:justify-start">
              <GetTheAppButton density="comfortable" />
            </div>
          </div>
          {/* Empty column — keeps typography balanced on wide screens */}
          <div className="hidden min-h-0 w-full lg:block lg:flex-1" aria-hidden />
        </div>

        {/* Mascot + wave — negative margin tuned for hero without demo cards */}
        <div className="-mt-[3.35rem] md:-mt-[4.5rem] lg:-mt-[6.35rem]" style={{ display: "flex", flexDirection: "column", alignItems: "center", paddingBottom: 0, width: "100%", position: "relative", zIndex: 1 }}>
          <div style={{ display: "flex", justifyContent: "center", position: "relative", zIndex: 3, transform: "translate(clamp(2rem, 21vw, 12.75rem), -76px)", marginBottom: "clamp(-9.35rem, -23vw, -5.95rem)" }}>
            <div
              ref={kumoRevealRef}
              className={`group/kumo landing-kumo-from-fold ${!kumoRevealed ? "landing-kumo-fold-pending" : ""}${kumoRevealed && kumoPlayEntryAnimation ? " landing-kumo-from-fold--in" : ""}`}
              style={{ position: "relative", display: "inline-block", transformOrigin: "center bottom", zIndex: 20 }}
            >
              <span className="transition-opacity duration-300 group-hover/kumo:opacity-95" style={{ position: "absolute", left: -56, top: "50%", transform: "translateY(-50%)", fontSize: 44, color: "#c4b5fd", opacity: 0.7, userSelect: "none", zIndex: 40 }}>❨</span>
              <span className="transition-opacity duration-300 group-hover/kumo:opacity-90" style={{ position: "absolute", left: -34, top: "50%", transform: "translateY(-50%)", fontSize: 36, color: "#a78bfa", opacity: 0.5, userSelect: "none", zIndex: 40 }}>❨</span>
              <span className="transition-opacity duration-300 group-hover/kumo:opacity-95" style={{ position: "absolute", right: -56, top: "50%", transform: "translateY(-50%)", fontSize: 44, color: "#c4b5fd", opacity: 0.7, userSelect: "none", zIndex: 40 }}>❩</span>
              <span className="transition-opacity duration-300 group-hover/kumo:opacity-90" style={{ position: "absolute", right: -34, top: "50%", transform: "translateY(-50%)", fontSize: 36, color: "#a78bfa", opacity: 0.5, userSelect: "none", zIndex: 40 }}>❩</span>
              <Image
                src="/state-05.png"
                alt="Kumo"
                width={560}
                height={560}
                className="mx-auto block cursor-default transition-[transform,filter] duration-300 ease-[cubic-bezier(0.34,1.2,0.64,1)] group-hover/kumo:-translate-y-1 hover:brightness-[1.03]"
                style={{
                  width: "min(404px, 92vw)",
                  height: "auto",
                  filter: "drop-shadow(0 18px 40px rgba(109,40,217,0.22))",
                }}
                priority
              />
            </div>
          </div>
          <div aria-hidden style={{ width: "100%", lineHeight: 0, position: "relative", zIndex: 1, marginTop: "clamp(-4.65rem, -11.75vw, -1.45rem)", marginBottom: "clamp(-2rem, -4.5vw, -0.75rem)" }}>
            <svg viewBox="0 0 1440 72" fill="none" xmlns="http://www.w3.org/2000/svg" style={{ width: "100%", display: "block" }}>
              <path d="M0 32 Q720 54 1440 32 L1440 72 L0 72 Z" fill="#f8f8ff" />
            </svg>
          </div>
        </div>
      </section>

      {/* 3 steps */}
      <section id="features" style={{ background: "#f8f8ff", padding: "52px 20px" }}>
        <div style={{ maxWidth: 860, margin: "0 auto" }}>
          <div className="flex flex-col md:flex-row items-center justify-between gap-8" style={{ position: "relative" }}>
            <div className="hidden md:block" style={{ position: "absolute", top: 28, left: "18%", right: "18%", borderTop: "2px dashed #c4b5fd", zIndex: 0 }} />
            {[
              { Icon: IconStepSay, num: "1", title: "Say it", desc: "Describe your payment in plain language. Kumo understands and creates the intent." },
              { Icon: IconStepSign, num: "2", title: "Sign offline", desc: "Kumo signs your payment offline and stores it encrypted on your device." },
              { Icon: IconStepSettle, num: "3", title: "Settle privately", desc: "When you’re back online, Kumo settles your payment privately and verifiably." },
            ].map(({ Icon, num, title, desc }) => (
              <div key={num} className="group/step cursor-default px-3 py-5 transition-[transform] duration-300 ease-[cubic-bezier(0.34,1.2,0.64,1)] hover:-translate-y-1 md:px-2 md:py-4" style={{ flex: 1, display: "flex", flexDirection: "column", alignItems: "center", textAlign: "center", position: "relative", zIndex: 1 }}>
                <div className="transition-[transform,box-shadow] duration-300 ease-[cubic-bezier(0.34,1.2,0.64,1)] group-hover/step:-translate-y-0.5 group-hover/step:shadow-[0_12px_32px_rgba(109,40,217,0.14)]" style={{ width: 64, height: 64, borderRadius: "50%", background: "#ede9fe", border: "4px solid #fff", boxShadow: "0 4px 16px rgba(109,40,217,0.12)", display: "flex", alignItems: "center", justifyContent: "center", marginBottom: 16 }}>
                  <Icon />
                </div>
                <h3 style={{ fontWeight: 800, fontSize: 16, color: "#1a1a2e", marginBottom: 8 }}>{num}. {title}</h3>
                <p style={{ fontSize: 14, color: "#64748b", lineHeight: 1.6, maxWidth: 200 }}>{desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* FEATURES */}
      <section id="docs" style={{ background: "#fff", padding: "52px 20px" }}>
        <div style={{ maxWidth: 860, margin: "0 auto" }}>
          <div style={{ textAlign: "center", marginBottom: 36 }}>
            <h2
              ref={privacyHeadlineRef}
              id="privacy"
              className="tracking-tight"
              style={{
                fontSize: 30,
                fontWeight: 900,
                color: "#0f0e1a",
                marginBottom: 10,
                letterSpacing: "-1px",
                lineHeight: 1.22,
              }}
            >
              <span className="sr-only">{PRIVACY_SECTION_HEADLINE}</span>
              <span className="relative block" aria-hidden>
                {/* Reserve wrapped layout so CLS stays minimal */}
                <span className="block select-none whitespace-pre-wrap text-transparent">{PRIVACY_SECTION_HEADLINE}</span>
                <span className="absolute left-0 top-0 block w-full whitespace-pre-wrap text-[#0f0e1a]">
                  {privacyTypedChars}
                  {privacyTypePlaying && !privacyTypeDone && (
                    <span
                      aria-hidden
                      className="landing-typewriter-caret ml-px inline-block h-[0.9em] w-[3px] translate-y-[2px] rounded-sm bg-[#6d28d9]/85 align-middle"
                    />
                  )}
                </span>
              </span>
            </h2>
            <p style={{ fontSize: 16, color: "#64748b", lineHeight: 1.6 }}>KumoPay pairs cryptography with a simple flow<br />so you can pay exactly how you want.</p>
          </div>
          <div className="grid md:grid-cols-3 gap-5 lg:gap-6">
            {[
              {
                Icon: IconFeatShield,
                title: "Verifiable privacy",
                desc: "Your data is guarded with hashes, audit trails, and cryptographic signatures.",
                palette: {
                  wrap: "from-indigo-50/95 to-white",
                  iconRing: "ring-indigo-200/55",
                  iconBg: "bg-gradient-to-br from-indigo-100/90 to-white",
                  iconFg: "#3730a3",
                },
              },
              {
                Icon: IconFeatOffline,
                title: "Offline, still fine",
                desc: "Sign and park your payments safely until you’re online again.",
                palette: {
                  wrap: "from-violet-50/98 to-white",
                  iconRing: "ring-violet-300/45",
                  iconBg: "bg-gradient-to-br from-violet-100/90 to-purple-50/40",
                  iconFg: "#5b21b6",
                },
              },
              {
                Icon: IconFeatSync,
                title: "Ready to sync",
                desc: "When you reconnect, Kumo syncs and settles on-chain in a private, efficient way.",
                palette: {
                  wrap: "from-[#eef2ff]/98 to-white",
                  iconRing: "ring-indigo-200/45",
                  iconBg: "bg-gradient-to-br from-indigo-100/70 to-[#ede9fe]/65",
                  iconFg: "#4f46e5",
                },
              },
            ].map(({ Icon: FeatIcon, palette, title, desc }) => (
              <div
                key={title}
                className={`group/feature relative cursor-default overflow-hidden rounded-2xl border border-slate-200/65 bg-gradient-to-br p-6 shadow-[0_1px_2px_rgba(15,23,42,.04)] transition-[transform,border-color,box-shadow] duration-300 ease-[cubic-bezier(0.33,1,0.68,1)] hover:-translate-y-[5px] hover:border-violet-200/95 hover:shadow-[0_22px_48px_-16px_rgba(109,40,217,0.15)] active:-translate-y-0.5 ${palette.wrap}`}
              >
                {/* subtle spotlight on hover */}
                <span
                  className="pointer-events-none absolute -right-px -top-px h-[11rem] w-[11rem] rounded-full bg-violet-200/15 opacity-0 blur-3xl transition-opacity duration-500 group-hover/feature:opacity-100"
                  aria-hidden
                />
                <span
                  className="pointer-events-none absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-violet-200/65 to-transparent opacity-75"
                  aria-hidden
                />

                <div className="relative flex gap-4">
                  <div
                    className={`flex size-[52px] shrink-0 items-center justify-center rounded-xl ring-1 transition-[transform,color,filter] duration-300 ease-[cubic-bezier(0.33,1,0.68,1)] group-hover/feature:scale-[1.05] ${palette.iconBg} ${palette.iconRing}`}
                    style={{ color: palette.iconFg }}
                  >
                    <FeatIcon />
                  </div>
                  <div className="min-w-0 pt-0.5">
                    <h4 className="text-[15px] font-bold tracking-tight text-[#14121f]" style={{ marginBottom: "0.375rem", lineHeight: 1.3 }}>
                      {title}
                    </h4>
                    <p className="text-[13.25px] leading-relaxed tracking-[0.01em] text-slate-500 transition-colors duration-300 ease-out group-hover/feature:text-slate-600">{desc}</p>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Bottom CTA */}
      <section id="about" style={{ padding: "52px 20px" }}>
        <div style={{ maxWidth: 860, margin: "0 auto" }}>
          <div className="group/cta-banner cursor-default rounded-[28px] border border-transparent shadow-[inset_0_1px_0_rgba(255,255,255,0.35)] transition-[transform,box-shadow,border-color] duration-[420ms] ease-[cubic-bezier(0.34,1.15,0.64,1)] hover:-translate-y-1 hover:border-[rgba(147,139,229,0.45)] hover:shadow-[inset_0_1px_0_rgba(255,255,255,0.48),0_28px_72px_-14px_rgba(109,40,217,0.24)]" style={{ background: "linear-gradient(135deg, #ede9fe 0%, #e0e7ff 100%)", padding: "38px 32px", display: "flex", flexWrap: "wrap", alignItems: "center", justifyContent: "space-between", gap: 24, position: "relative", overflow: "hidden" }}>
            {[[40, 20], [60, 15], [80, 30]].map(([r, t], i) => (
              <div key={i} style={{ position: "absolute", right: `${r}px`, top: `${t}px`, width: 8 + i * 4, height: 8 + i * 4, borderRadius: "50%", background: "#c4b5fd", opacity: 0.4 }} />
            ))}
            <div style={{ maxWidth: 380 }}>
              <h2 style={{ fontSize: 30, fontWeight: 900, color: "#1a1a2e", lineHeight: 1.2, marginBottom: 12, letterSpacing: "-1px" }}>
                Built to keep paying<br />even when<br /><span style={{ color: "#3b82f6" }}>the signal dies.</span>
              </h2>
              <p style={{ fontSize: 15, color: "#64748b", marginBottom: 22 }}>Kumo stores, signs, and protects your payments until you reconnect.</p>
              <GetTheAppButton density="comfortable" showArrow />
            </div>
            <div className="transition-transform duration-[420ms] ease-[cubic-bezier(0.34,1.2,0.64,1)] group-hover/cta-banner:-translate-y-[3px]" style={{ position: "relative", flexShrink: 0 }}>
              <span className="transition-opacity duration-300 group-hover/cta-banner:opacity-70" style={{ position: "absolute", left: -36, top: "50%", transform: "translateY(-50%)", fontSize: 32, color: "#a78bfa", opacity: 0.5 }}>❨</span>
              <span className="transition-opacity duration-300 group-hover/cta-banner:opacity-70" style={{ position: "absolute", right: -36, top: "50%", transform: "translateY(-50%)", fontSize: 32, color: "#a78bfa", opacity: 0.5 }}>❩</span>
              <span className="landing-cta-kumo-wave-animation inline-flex">
                <Image
                  src="/state-03.png"
                  alt="Kumo waving hello"
                  width={560}
                  height={560}
                  className="block"
                  style={{
                    width: "min(278px, 58vw)",
                    height: "auto",
                    filter: "drop-shadow(0 14px 36px rgba(109,40,217,0.22))",
                  }}
                />
              </span>
            </div>
          </div>
        </div>
      </section>

      {/* FOOTER */}
      <footer style={{ background: "#fff", borderTop: "1px solid #f1f0ff", padding: "36px 20px 28px" }}>
        <div style={{ maxWidth: 1100, margin: "0 auto" }} className="flex flex-col md:flex-row justify-between gap-10">
          <div style={{ maxWidth: 280 }}>
            <Link href="/" onClick={goMain} className="mb-4 flex cursor-pointer items-center gap-3 rounded-xl py-2 no-underline outline-none transition-[opacity,transform,box-shadow] duration-[260ms] ease-[cubic-bezier(0.34,1.25,0.64,1)] hover:bg-violet-50/40 hover:opacity-[0.93] hover:shadow-sm focus-visible:ring-2 focus-visible:ring-[#a78bfa] focus-visible:ring-offset-2 active:translate-y-[0.5px] active:scale-[0.99]" title="Back to home" aria-label="KumoPay — home">
              <span
                style={{
                  width: 38,
                  height: 38,
                  borderRadius: "50%",
                  overflow: "hidden",
                  flexShrink: 0,
                  border: "1px solid #e5e7eb",
                  background: "#fff",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                }}
              >
                <Image src="/favicon-32.png" alt="" width={38} height={38} style={{ objectFit: "cover", width: "100%", height: "100%" }} />
              </span>
              <Image src="/logo-sec-02.png" alt="KumoPay" width={240} height={52} style={{ height: 42, width: "auto" }} />
            </Link>
            <p style={{ fontSize: 13, color: "#94a3b8", marginBottom: 6 }}>Pay when the signal disappears.</p>
            <p style={{ fontSize: 12, color: "#cbd5e1" }}>© {new Date().getFullYear()} KumoPay. All rights reserved.</p>
          </div>
          <div style={{ display: "flex", gap: 56, fontSize: 14 }}>
            {([
              {
                title: "Product",
                links: [
                  { label: "Features", href: "#features" },
                  { label: "Docs", href: "#docs" },
                  { label: "Flow", href: "/flow" },
                ],
              },
              {
                title: "Resources",
                links: [
                  { label: "Privacy", href: "#privacy" },
                  { label: "About", href: "#about" },
                ],
              },
              { title: "Legal", links: [{ label: "Terms", href: "#" }, { label: "Privacy policy", href: "#" }] },
            ] as const).map((col) => (
              <div key={col.title}>
                <p style={{ fontWeight: 700, color: "#1a1a2e", marginBottom: 14 }}>{col.title}</p>
                <ul style={{ listStyle: "none", padding: 0, margin: 0, display: "flex", flexDirection: "column", gap: 10 }}>
                  {col.links.map((l) => (
                    <li key={l.label}>
                      {l.href.startsWith("/") ? (
                        <Link href={l.href} className="rounded-sm text-slate-400 no-underline outline-none ring-offset-2 transition-colors duration-200 ease-out hover:bg-violet-50/55 hover:text-[#6d28d9] focus-visible:text-[#6d28d9] focus-visible:ring-2 focus-visible:ring-[#c4b5fd]">{l.label}</Link>
                      ) : (
                        <a href={l.href} className="rounded-sm text-slate-400 no-underline outline-none ring-offset-2 transition-colors duration-200 ease-out hover:bg-violet-50/55 hover:text-[#6d28d9] focus-visible:text-[#6d28d9] focus-visible:ring-2 focus-visible:ring-[#c4b5fd]">{l.label}</a>
                      )}
                    </li>
                  ))}
                </ul>
              </div>
            ))}
          </div>
          <div className="flex items-start gap-5 text-xl text-slate-400">
            <a
              href="#"
              className="rounded-md p-[3px] leading-none text-inherit no-underline outline-none transition-[color,background-color,transform] duration-200 ease-out hover:-translate-y-px hover:bg-slate-100/80 hover:text-navy focus-visible:ring-2 focus-visible:ring-[#cbd5f5] active:translate-y-0"
            >
              𝕏
            </a>
            <a
              href="https://github.com/KumoPay"
              className="group/git inline-flex rounded-md p-[3px] text-inherit no-underline outline-none transition-[color,background-color,transform] duration-200 ease-out hover:-translate-y-px hover:bg-slate-100/80 hover:text-navy focus-visible:ring-2 focus-visible:ring-[#cbd5f5] active:translate-y-0"
            >
              <svg className="block transition-transform duration-200 ease-out group-hover/git:scale-110" width="20" height="20" viewBox="0 0 24 24" fill="currentColor">
                <path d="M12 2C6.477 2 2 6.484 2 12.017c0 4.425 2.865 8.18 6.839 9.504.5.092.682-.217.682-.483 0-.237-.008-.868-.013-1.703-2.782.605-3.369-1.343-3.369-1.343-.454-1.158-1.11-1.466-1.11-1.466-.908-.62.069-.608.069-.608 1.003.07 1.531 1.032 1.531 1.032.892 1.53 2.341 1.088 2.91.832.092-.647.35-1.088.636-1.338-2.22-.253-4.555-1.113-4.555-4.951 0-1.093.39-1.988 1.029-2.688-.103-.253-.446-1.272.098-2.65 0 0 .84-.27 2.75 1.026A9.564 9.564 0 0112 6.844c.85.004 1.705.115 2.504.337 1.909-1.296 2.747-1.027 2.747-1.027.546 1.379.202 2.398.1 2.651.64.7 1.028 1.595 1.028 2.688 0 3.848-2.339 4.695-4.566 4.943.359.309.678.92.678 1.855 0 1.338-.012 2.419-.012 2.747 0 .268.18.58.688.482A10.019 10.019 0 0022 12.017C22 6.484 17.522 2 12 2z" />
              </svg>
            </a>
          </div>
        </div>
      </footer>
    </div>
  );
}
