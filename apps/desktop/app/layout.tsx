import type { Metadata } from "next"
import "./globals.css"
import { TopNav } from "@/components/topnav"

export const metadata: Metadata = {
  title: "Kumo ☁ — Pay when the signal disappears",
  description:
    "Offline-first companion for confidential USDC payments on Solana. QVAC on-device, MagicBlock PER, durable-nonce signing.",
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="" />
        <link
          href="https://fonts.googleapis.com/css2?family=Nunito+Sans:wght@400;600;700;800;900&display=swap"
          rel="stylesheet"
        />
      </head>
      <body className="font-body bg-cream text-navy">
        <TopNav />
        {children}
      </body>
    </html>
  )
}
