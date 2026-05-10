import type { Metadata } from "next"
import Link from "next/link"

import LandingNav from "@/components/landing-nav"

export const metadata: Metadata = {
  title: "Privacy Policy — Kumo",
  description: "Privacy Policy for Kumo — offline-first USDC payments on Solana.",
}

const LAST_UPDATED = "May 10, 2026"

export default function PrivacyPage() {
  return (
    <div
      className="min-h-screen bg-cream"
      style={{ fontFamily: "'DM Sans', 'Nunito', 'Segoe UI', sans-serif" }}
    >
      <LandingNav />
      <main className="mx-auto max-w-[760px] px-5 pb-24 pt-[calc(5.75rem+env(safe-area-inset-top,0px))] md:px-8">
        <p className="mb-3 text-[11px] font-bold uppercase tracking-[0.18em] text-slate-500">
          Compliance
        </p>
        <h1
          className="mb-3 text-[clamp(28px,3.8vw,40px)] font-black leading-tight tracking-tight text-[#1a1a2e]"
          style={{ letterSpacing: "-0.5px" }}
        >
          Privacy Policy
        </h1>
        <p className="mb-10 text-[14px] text-slate-500">Last updated {LAST_UPDATED}.</p>

        <Section title="Summary">
          Kumo is designed to be private by default. We do not create accounts,
          we do not collect personal information, and we do not track you. Most
          of what the App does runs locally on your device and never reaches our
          servers.
        </Section>

        <Section title="1. Information we do NOT collect">
          We do not collect or store: your name, email, phone number, IP address
          for analytics, device identifiers, location, contacts, photos, or
          biometric data. There are no accounts to create and no sign-ups.
        </Section>

        <Section title="2. Information stored on your device">
          The App stores the following on your device only:
          <ul className="mt-3 list-disc space-y-1.5 pl-5">
            <li>Your chosen alias and connected wallet&rsquo;s public key.</li>
            <li>Your local payment history (signatures, amounts, recipients).</li>
            <li>Your local contacts list.</li>
            <li>Queued offline payment intents (until broadcast).</li>
            <li>Optional on-device AI and voice models you choose to download.</li>
            <li>App preferences (airplane mode, privacy default, biometric prompt).</li>
          </ul>
          <span className="mt-3 block">
            This data never leaves your device unless you explicitly broadcast a
            transaction or use a feature that requires the network.
          </span>
        </Section>

        <Section title="3. Information sent to third parties">
          When you broadcast a payment, the following information is sent to
          public infrastructure:
          <ul className="mt-3 list-disc space-y-1.5 pl-5">
            <li>
              <strong>Solana RPC providers</strong> receive signed transactions
              for inclusion on-chain. Public payments are visible on Solana
              Explorer; private payments are processed via MagicBlock&rsquo;s
              private payments API.
            </li>
            <li>
              <strong>Mobile Wallet Adapter</strong> connects to the wallet you
              choose (Phantom, Solflare, Backpack, Glow, etc.). Your wallet
              receives signing requests and returns signatures. Your private
              keys never leave your wallet.
            </li>
            <li>
              <strong>Optional cloud intent parsing</strong>: if on-device AI is
              not enabled, the text you type may be sent to a stateless server
              that returns a parsed intent. The server does not log requests.
            </li>
          </ul>
        </Section>

        <Section title="4. On-chain data">
          Solana is a public blockchain. Any payment you broadcast becomes
          permanently visible to anyone, including amounts, addresses, and
          timestamps for public SPL transfers. Private transfers via MagicBlock
          conceal amounts and counterparties from third parties but the
          transaction itself is still recorded on-chain. We cannot delete or
          modify on-chain data.
        </Section>

        <Section title="5. Permissions">
          The App may request the following Android permissions:
          <ul className="mt-3 list-disc space-y-1.5 pl-5">
            <li><strong>Internet</strong>: to broadcast transactions and query balances.</li>
            <li><strong>Microphone</strong>: only if you enable voice input.</li>
            <li><strong>Biometric</strong>: only if you enable biometric prompts before signing.</li>
            <li><strong>Notifications</strong>: only to confirm completed payments.</li>
          </ul>
          <span className="mt-3 block">
            All permissions are optional and you can revoke them in your device settings.
          </span>
        </Section>

        <Section title="6. Cookies and analytics">
          The App does not use cookies. The App does not include analytics,
          telemetry, ad networks, or third-party trackers.
        </Section>

        <Section title="7. Children">
          Kumo is not directed at children under 13 and we do not knowingly
          collect any information from children.
        </Section>

        <Section title="8. Data deletion">
          To delete all local data, use Settings → Delete local data, or
          uninstall the App. There is no server-side data to request deletion of.
        </Section>

        <Section title="9. Changes">
          We may update this Privacy Policy. The &ldquo;Last updated&rdquo; date
          at the top reflects the latest revision. Material changes will be
          announced in-app where practical.
        </Section>

        <Section title="10. Contact">
          Questions? Open an issue at{" "}
          <a
            href="https://github.com/KumoPay"
            target="_blank"
            rel="noopener noreferrer"
            className="font-semibold text-[#6d28d9] underline decoration-[#d8b4fe] underline-offset-2 hover:text-[#5b21b6]"
          >
            github.com/KumoPay
          </a>
          .
        </Section>

        <div className="mt-12 border-t border-slate-200 pt-6">
          <Link
            href="/"
            className="inline-flex items-center gap-2 text-[14px] font-semibold text-[#6d28d9] hover:text-[#5b21b6]"
          >
            ← Back to home
          </Link>
        </div>
      </main>
    </div>
  )
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section className="mb-8">
      <h2 className="mb-3 text-[18px] font-bold tracking-tight text-[#14121f]">
        {title}
      </h2>
      <div className="text-[15px] leading-[1.7] text-slate-600">{children}</div>
    </section>
  )
}
