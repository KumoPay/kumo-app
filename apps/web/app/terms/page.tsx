import type { Metadata } from "next"
import Link from "next/link"

import LandingNav from "@/components/landing-nav"

export const metadata: Metadata = {
  title: "Terms of Use — Kumo",
  description: "Terms of Use for Kumo — offline-first USDC payments on Solana.",
}

const LAST_UPDATED = "May 10, 2026"

export default function TermsPage() {
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
          Terms of Use
        </h1>
        <p className="mb-10 text-[14px] text-slate-500">Last updated {LAST_UPDATED}.</p>

        <Section title="1. Acceptance">
          By installing, opening, or using Kumo (the &ldquo;App&rdquo;), you agree to these
          Terms of Use. If you do not agree, do not use the App.
        </Section>

        <Section title="2. What Kumo is">
          Kumo is a non-custodial Solana payment client. It lets you compose USDC
          payment intents in plain language, sign them locally with a third-party
          wallet via Mobile Wallet Adapter, queue them on-device when offline, and
          broadcast them when connectivity returns. Kumo never holds your private
          keys, balances, or funds.
        </Section>

        <Section title="3. Non-custodial software">
          You are solely responsible for: (a) the security of your wallet, recovery
          phrase, and device; (b) the accuracy of every payment you sign; and (c)
          confirming destination addresses before broadcasting. Blockchain
          transactions are final, public, and irreversible. Kumo cannot reverse,
          cancel, refund, or recover transactions or funds.
        </Section>

        <Section title="4. Networks and beta status">
          Kumo currently operates on Solana devnet for demo and testing. Devnet
          tokens have no monetary value. Features may change, break, or be removed
          without notice. Use the App at your own risk.
        </Section>

        <Section title="5. Third-party services">
          Kumo integrates with third-party services including Solana RPC providers,
          MagicBlock private payments, USDC token issuers, and your wallet of
          choice. Their availability, fees, and terms are governed by their own
          policies. Kumo is not responsible for outages, delays, fees, or losses
          caused by third parties.
        </Section>

        <Section title="6. Acceptable use">
          You agree not to use Kumo to: violate applicable law; launder funds;
          finance terrorism or sanctioned activity; impersonate others; reverse
          engineer the App in ways prohibited by law; or interfere with the App,
          its infrastructure, or other users.
        </Section>

        <Section title="7. Intellectual property">
          All Kumo branding, source code, designs, and content are owned by the
          Kumo authors and contributors. Open-source components are governed by
          their respective licenses.
        </Section>

        <Section title="8. No warranty">
          The App is provided &ldquo;as is&rdquo; and &ldquo;as available&rdquo;,
          without warranty of any kind, express or implied, including merchantability,
          fitness for a particular purpose, accuracy, and non-infringement.
        </Section>

        <Section title="9. Limitation of liability">
          To the maximum extent permitted by law, in no event shall Kumo, its
          authors, or contributors be liable for any indirect, incidental, special,
          consequential, or punitive damages, or for any loss of funds, profits,
          data, or use, arising out of or related to your use of the App.
        </Section>

        <Section title="10. Changes">
          We may update these Terms at any time. Continued use of the App after
          changes constitutes acceptance of the revised Terms.
        </Section>

        <Section title="11. Contact">
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
      <p className="text-[15px] leading-[1.7] text-slate-600">{children}</p>
    </section>
  )
}
