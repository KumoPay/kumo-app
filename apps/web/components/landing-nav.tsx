"use client";

import Image from "next/image";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useState, type MouseEvent } from "react";

import { GetTheAppButton } from "@/components/get-app-stores";

type Props = {
  /** On `/`: `#features`. On other pages (`/flow`), use `false` so links go `/#features`. */
  anchorsRelativeToHome?: boolean;
};

const NAV_H = 72;

export default function LandingNav({ anchorsRelativeToHome = true }: Props) {
  const [scrolled, setScrolled] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);
  const pathname = usePathname();

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 20);
    window.addEventListener("scroll", onScroll);
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  useEffect(() => {
    if (!mobileOpen) return;
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    const onEsc = (e: KeyboardEvent) => {
      if (e.key === "Escape") setMobileOpen(false);
    };
    window.addEventListener("keydown", onEsc);
    return () => {
      document.body.style.overflow = prev;
      window.removeEventListener("keydown", onEsc);
    };
  }, [mobileOpen]);

  useEffect(() => {
    setMobileOpen(false);
  }, [pathname]);

  const hash = (id: string) => (anchorsRelativeToHome ? `#${id}` : `/#${id}`);

  const goHome = (e: MouseEvent<HTMLAnchorElement>) => {
    if (pathname === "/") {
      e.preventDefault();
      window.scrollTo({ top: 0, behavior: "smooth" });
    }
  };

  const navLinkInactive =
    "rounded-lg px-1 py-1 text-[15px] font-medium text-slate-500 no-underline outline-none transition-colors duration-200 ease-out hover:bg-violet-50/55 hover:text-[#6d28d9] focus-visible:text-[#6d28d9] focus-visible:ring-2 focus-visible:ring-[#6d28d9] focus-visible:ring-offset-2";
  const navLinkFlowActive =
    "rounded-lg px-1 py-1 text-[15px] font-semibold text-[#6d28d9] no-underline outline-none transition-colors duration-200 ease-out hover:bg-violet-50/55 focus-visible:text-[#6d28d9] focus-visible:ring-2 focus-visible:ring-[#6d28d9] focus-visible:ring-offset-2 bg-violet-50/40";
  const mobileRow =
    "flex w-full items-center rounded-xl px-3 py-3.5 text-left text-[16px] font-semibold text-slate-700 no-underline outline-none transition-colors active:bg-violet-50/80";

  const flowHighlighted = pathname === "/flow" || pathname?.startsWith("/flow/");

  return (
    <nav
      className="fixed top-0 left-0 right-0 z-50 transition-all duration-300"
      style={{
        background: scrolled ? "rgba(255,255,255,0.92)" : "#fff",
        backdropFilter: scrolled ? "blur(12px)" : "none",
        borderBottom: scrolled ? "1px solid #eef0f8" : "1px solid transparent",
        paddingTop: "env(safe-area-inset-top, 0px)",
      }}
    >
      <div
        className="flex w-full min-h-[72px] items-center justify-between gap-2 md:pr-5"
        style={{
          paddingLeft: "max(12px, env(safe-area-inset-left))",
          paddingRight: "max(12px, env(safe-area-inset-right))",
        }}
      >
        <Link
          href="/"
          onClick={goHome}
          className="flex min-w-0 shrink items-center gap-px rounded-xl outline-none ring-offset-2 transition-[opacity,transform,box-shadow] duration-300 ease-[cubic-bezier(0.4,0,0.2,1)] hover:bg-violet-50/40 hover:opacity-95 focus-visible:bg-violet-50/50 focus-visible:ring-2 focus-visible:ring-[#6d28d9] active:scale-[0.99]"
          style={{ textDecoration: "none", marginRight: 4 }}
          title="Back to home"
          aria-label="KumoPay — home"
        >
          <span
            style={{
              width: 40,
              height: 40,
              borderRadius: "50%",
              overflow: "hidden",
              flexShrink: 0,
              border: "1px solid #e5e7eb",
              background: "#fff",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
            }}
            className="sm:w-11 sm:h-11"
          >
            <Image src="/favicon-32.png" alt="" width={44} height={44} style={{ objectFit: "cover", width: "100%", height: "100%" }} />
          </span>
          <Image
            src="/logo-sec-02.png"
            alt="KumoPay"
            width={260}
            height={56}
            className="-ml-0.5 max-sm:max-h-9 max-sm:max-w-[min(160px,44vw)] sm:-ml-1"
            style={{ height: 48, width: "auto", maxWidth: "min(230px, 48vw)" }}
            priority
          />
        </Link>

        <div className="hidden flex-1 md:flex md:items-center md:justify-center md:gap-6 lg:gap-8">
          <a href={hash("features")} className={navLinkInactive}>
            Features
          </a>
          <Link href="/flow" className={flowHighlighted ? navLinkFlowActive : navLinkInactive}>
            Flow
          </Link>
          <a href={hash("docs")} className={navLinkInactive}>
            Docs
          </a>
          <a href={hash("privacy")} className={navLinkInactive}>
            Privacy
          </a>
          <a href={hash("about")} className={navLinkInactive}>
            About
          </a>
        </div>

        <div className="flex shrink-0 items-center gap-1.5 sm:gap-2">
          <button
            type="button"
            className="inline-flex h-11 w-11 items-center justify-center rounded-xl text-[#1a1a2e] outline-none ring-offset-2 transition-colors hover:bg-violet-50/70 focus-visible:ring-2 focus-visible:ring-[#6d28d9] md:hidden"
            aria-expanded={mobileOpen}
            aria-controls="landing-mobile-nav"
            aria-label={mobileOpen ? "Close menu" : "Open menu"}
            onClick={() => setMobileOpen((o) => !o)}
          >
            {mobileOpen ? (
              <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" aria-hidden>
                <path d="M6 6l12 12M18 6L6 18" />
              </svg>
            ) : (
              <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" aria-hidden>
                <path d="M4 7h16M4 12h16M4 17h16" />
              </svg>
            )}
          </button>
          <GetTheAppButton density="compact" />
        </div>
      </div>

      {mobileOpen ? (
        <>
          <button
            type="button"
            className="fixed inset-x-0 bottom-0 z-[55] bg-slate-900/35 md:hidden"
            style={{ top: `calc(${NAV_H}px + env(safe-area-inset-top, 0px))` }}
            aria-label="Close menu"
            onClick={() => setMobileOpen(false)}
          />
          <div
            id="landing-mobile-nav"
            className="fixed left-0 right-0 z-[56] max-h-[min(78dvh,calc(100dvh-72px))] overflow-y-auto overscroll-contain border-b border-[#eef0f8] bg-white shadow-xl md:hidden"
            style={{
              top: `calc(${NAV_H}px + env(safe-area-inset-top, 0px))`,
              paddingBottom: "max(12px, env(safe-area-inset-bottom))",
            }}
          >
            <div className="flex flex-col px-2 py-1">
              <a href={hash("features")} className={mobileRow} onClick={() => setMobileOpen(false)}>
                Features
              </a>
              <Link
                href="/flow"
                className={[mobileRow, flowHighlighted ? "bg-violet-50/50 text-[#6d28d9]" : ""].join(" ")}
                onClick={() => setMobileOpen(false)}
              >
                Flow
              </Link>
              <a href={hash("docs")} className={mobileRow} onClick={() => setMobileOpen(false)}>
                Docs
              </a>
              <a href={hash("privacy")} className={mobileRow} onClick={() => setMobileOpen(false)}>
                Privacy
              </a>
              <a href={hash("about")} className={mobileRow} onClick={() => setMobileOpen(false)}>
                About
              </a>
            </div>
          </div>
        </>
      ) : null}
    </nav>
  );
}
