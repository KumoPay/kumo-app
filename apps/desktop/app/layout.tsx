import type { Metadata } from "next"
import "./globals.css"

export const metadata: Metadata = {
  title: "Kumo (雲) // confidential, offline, cross-chain",
  description:
    "Send confidential cross-chain USDC payments while offline. QVAC + MagicBlock PER + Solana durable nonces.",
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className="bg-ink text-paper">
      <head>
        <link
          href="https://fonts.googleapis.com/css2?family=Space+Mono:wght@400;700&family=JetBrains+Mono:wght@300;400;700&display=swap"
          rel="stylesheet"
        />
      </head>
      <body className="font-mono antialiased">{children}</body>
    </html>
  )
}
