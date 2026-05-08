import Image from "next/image"
import Link from "next/link"
import { KumoMascot, KumoMark } from "@/components/kumo-mascot"

const HOW_STEPS: Array<[string, string, string]> = [
  ["01", "Connect", "Tap into Phantom, Solflare, or Backpack via Saga Seed Vault."],
  ["02", "Speak intent", "Type a payment in plain words. On-device AI parses it."],
  ["03", "Sign offline", "Face ID seals a durable-nonce transaction. No RPC needed."],
  ["04", "Wait with Kumo", "Airplane mode? Kumo naps with your queued payment."],
  ["05", "Delivered", "Reconnect and Kumo settles confidentially via MagicBlock."],
]

const FEATURES: Array<[string, string]> = [
  ["💎", "Durable nonce signing"],
  ["🔒", "Confidential settlement"],
  ["📡", "No RPC while offline"],
  ["✨", "On-device AI"],
]

export default function HomePage() {
  return (
    <div className="min-h-screen bg-cream has-topnav relative">
      {/* Decorative background blobs + sprinkled clouds */}
      <div aria-hidden className="pointer-events-none fixed inset-0 overflow-hidden">
        <div className="absolute -top-12 -left-10 w-72 h-72 rounded-full bg-sky opacity-50 blur-3xl" />
        <div className="absolute top-40 -right-20 w-96 h-96 rounded-full bg-lilac opacity-30 blur-3xl" />
        <div className="absolute bottom-0 left-1/3 w-80 h-80 rounded-full bg-cyan opacity-30 blur-3xl" />
        <CloudGlyph className="absolute top-32 left-[12%] opacity-50" size={48} />
        <CloudGlyph className="absolute top-[58%] left-[7%] opacity-40" size={36} />
        <CloudGlyph className="absolute top-24 right-[14%] opacity-50" size={56} />
        <CloudGlyph className="absolute bottom-24 right-[20%] opacity-40" size={40} />
        <Sparkle className="absolute top-44 left-[28%] animate-twinkle" size={20} color="#C7B5FF" />
        <Sparkle className="absolute top-[55%] right-[28%] animate-twinkle [animation-delay:0.6s]" size={16} color="#7FE8FF" />
        <Sparkle className="absolute bottom-32 left-[42%] animate-twinkle [animation-delay:1.2s]" size={14} color="#C7B5FF" />
      </div>

      <main className="relative max-w-[1180px] mx-auto px-8 pt-16 pb-24">
        {/* Hero */}
        <div className="grid lg:grid-cols-[1.1fr_1fr] gap-16 items-center min-h-[calc(100vh-180px)]">
          {/* Left: copy */}
          <div>
            <div className="mb-8">
              <Image
                src="/logo-sec-01.png"
                alt="KumoPay"
                width={300}
                height={72}
                style={{ height: 72, width: "auto" }}
                priority
              />
            </div>

            <h1 className="font-display font-black text-navy text-[64px] leading-[1.02] tracking-[-0.02em] mb-6">
              Pay when the<br />signal disappears.
            </h1>

            <div className="inline-flex items-center gap-2 bg-white softshadow-sm rounded-full px-3 py-1.5 text-[12px] font-bold text-navy mb-7">
              <span className="w-2 h-2 rounded-full bg-cyan" />
              Built for Solana Mobile · Saga Seed Vault
            </div>

            <p className="text-navy/70 text-[18px] leading-[1.6] max-w-[520px] mb-9">
              Kumo is your offline-first companion for confidential USDC payments on Solana.
              Sign while you&apos;re in the air, on the subway, or off-grid — Kumo waits with you,
              then delivers the moment you reconnect.
            </p>

            <div className="flex flex-wrap gap-3 mb-10">
              <Link
                href="/app"
                className="pressable inline-flex items-center gap-2 bg-cyan text-navy font-display font-extrabold text-[15px] px-7 py-4 rounded-full softshadow"
              >
                <PlayGlyph /> Try the demo
              </Link>
              <a
                href="#how"
                className="pressable inline-flex items-center gap-2 bg-white text-navy font-display font-extrabold text-[15px] px-7 py-4 rounded-full"
                style={{ boxShadow: "inset 0 0 0 1.5px #0B1020" }}
              >
                <DownloadGlyph /> Learn more
              </a>
            </div>

            <div className="flex flex-wrap gap-2">
              {FEATURES.map(([e, t]) => (
                <span
                  key={t}
                  className="inline-flex items-center gap-2 bg-sky/60 text-navy font-bold text-[12px] px-3 py-1.5 rounded-full"
                >
                  <span>{e}</span>
                  {t}
                </span>
              ))}
            </div>
          </div>

          {/* Right: mascot card */}
          <div className="relative">
            <div
              className="relative card softshadow rounded-[36px] p-10 overflow-hidden"
              style={{ minHeight: 480 }}
            >
              <div
                className="absolute inset-x-0 top-0 h-32 bg-sky/40"
                style={{ borderRadius: "36px 36px 60% 60% / 36px 36px 100% 100%" }}
              />
              <CloudGlyph className="absolute top-6 left-8 opacity-70" size={28} />
              <CloudGlyph className="absolute top-12 right-10 opacity-60" size={22} />

              <div className="relative flex flex-col items-center pt-6">
                <div className="animate-breathe">
                  <Image
                    src="/kumo-mascot.png"
                    alt="Kumo mascot"
                    width={260}
                    height={260}
                    style={{ width: 260, height: "auto" }}
                    priority
                  />
                </div>
                <div className="mt-6 text-center">
                  <div className="font-display font-black text-navy text-[40px] tracking-[-0.02em] leading-none">
                    Kumo
                  </div>
                  <div className="text-navy/60 text-[14px] mt-2 font-semibold">
                    your offline payment companion
                  </div>
                </div>
                <div className="mt-7 grid grid-cols-3 gap-3 w-full">
                  <StatTile k="USDC" v="$24M+" s="settled offline" />
                  <StatTile k="Avg" v="0.4s" s="sign latency" />
                  <StatTile k="Privacy" v="100%" s="amount sealed" />
                </div>
              </div>
            </div>

            <div
              className="absolute -left-6 top-12 bg-white card px-4 py-3 rounded-2xl text-[13px] font-bold text-navy"
              style={{ boxShadow: "0 10px 30px rgba(11,16,32,0.10)" }}
            >
              <span className="text-cyan mr-2">●</span>What payment, friend?
            </div>
            <div
              className="absolute -right-4 bottom-16 bg-white card px-4 py-3 rounded-2xl text-[13px] font-bold text-navy"
              style={{ boxShadow: "0 10px 30px rgba(11,16,32,0.10)" }}
            >
              <span className="mr-2">✈️</span>Resting until you reconnect…
            </div>
          </div>
        </div>

        {/* How it works */}
        <section className="mt-32" id="how">
          <div className="text-[11px] font-bold tracking-[0.18em] uppercase text-navy/50 mb-3">How it works</div>
          <h2 className="font-display font-black text-navy text-[40px] leading-tight tracking-[-0.02em] mb-12 max-w-[640px]">
            Five gentle steps. Even when the world goes dark.
          </h2>
          <div className="grid md:grid-cols-5 gap-4">
            {HOW_STEPS.map(([n, t, d]) => (
              <div key={n} className="card p-5 rounded-2xl">
                <div className="font-display font-extrabold text-cyan text-[12px] tracking-[0.18em]">{n}</div>
                <div className="font-display font-extrabold text-navy text-[18px] mt-2">{t}</div>
                <div className="text-navy/60 text-[13px] mt-2 leading-snug">{d}</div>
              </div>
            ))}
          </div>
        </section>

        {/* CTA strip pointing to flow */}
        <section className="mt-24" id="flow-cta">
          <div className="card rounded-[28px] p-10 lg:p-12 flex flex-col lg:flex-row items-center gap-10 overflow-hidden relative">
            <div aria-hidden className="absolute -top-12 -right-10 w-72 h-72 rounded-full bg-cyan/40 blur-3xl" />
            <div className="relative shrink-0">
              <KumoMascot size={140} expression="curious" />
            </div>
            <div className="relative flex-1">
              <div className="text-[11px] font-bold tracking-[0.18em] uppercase text-navy/50 mb-2">Live walkthrough</div>
              <h3 className="font-display font-black text-navy text-[28px] leading-tight tracking-[-0.02em] mb-2">
                Take Kumo for a walk through the offline flow.
              </h3>
              <p className="text-navy/70 max-w-[520px]">
                Step through five connected screens — wallet connect, intent, Face ID, queued, and settled — wired to the real
                devnet APIs.
              </p>
            </div>
            <Link
              href="/flow"
              className="pressable inline-flex items-center gap-2 bg-navy text-cloud font-display font-extrabold text-[15px] px-7 py-4 rounded-full softshadow shrink-0"
            >
              Open the flow →
            </Link>
          </div>
        </section>

        <footer className="mt-24 flex items-center justify-between text-navy/50 text-[12px] font-semibold">
          <div className="flex items-center gap-2">
            <KumoMark size={20} /> kumopay.app · Built for Solana Mobile
          </div>
          <div>© 2026 Kumo Labs</div>
        </footer>
      </main>
    </div>
  )
}

function StatTile({ k, v, s }: { k: string; v: string; s: string }) {
  return (
    <div className="bg-cream rounded-2xl p-3 text-center">
      <div className="text-[10px] font-bold tracking-[0.16em] uppercase text-navy/50">{k}</div>
      <div className="font-display font-black text-navy text-[20px] leading-tight mt-1">{v}</div>
      <div className="text-[11px] text-navy/60 mt-0.5">{s}</div>
    </div>
  )
}

function CloudGlyph({ className = "", size = 40 }: { className?: string; size?: number }) {
  return (
    <svg className={className} width={size} height={size * 0.7} viewBox="0 0 60 42" xmlns="http://www.w3.org/2000/svg">
      <path
        d="M10 30 c0 -10 9 -16 18 -14 c2 -8 13 -10 18 -3 c8 -1 12 7 8 12 c5 3 2 11 -3 11 l-36 0 c-7 0 -8 -3 -5 -6 z"
        fill="#fff"
        stroke="#0B1020"
        strokeWidth="1.5"
        strokeLinejoin="round"
        opacity="0.95"
      />
    </svg>
  )
}

function Sparkle({
  className = "",
  size = 20,
  color = "#C7B5FF",
}: {
  className?: string
  size?: number
  color?: string
}) {
  return (
    <svg className={className} width={size} height={size} viewBox="-10 -10 20 20">
      <path d="M0 -7 L2 -2 L7 0 L2 2 L0 7 L-2 2 L-7 0 L-2 -2 Z" fill={color} />
    </svg>
  )
}

function PlayGlyph() {
  return (
    <svg width="14" height="14" viewBox="0 0 14 14">
      <path d="M3 2 L11 7 L3 12 Z" fill="#0B1020" />
    </svg>
  )
}

function DownloadGlyph() {
  return (
    <svg width="14" height="14" viewBox="0 0 14 14" fill="none" stroke="#0B1020" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
      <path d="M7 1 V9 M3 6 L7 10 L11 6 M2 12 H12" />
    </svg>
  )
}
