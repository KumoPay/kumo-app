import type { Metadata, Viewport } from "next"
import { KumoWalletProvider } from "@/lib/wallet-provider"

export const metadata: Metadata = {
  title: "Kumo — Mobile",
  description: "Pay when the signal disappears.",
  appleWebApp: {
    capable: true,
    title: "Kumo",
    statusBarStyle: "black-translucent",
  },
}

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
  userScalable: false,
  viewportFit: "cover",
  themeColor: "#FAFCFF",
}

export default function MobileLayout({ children }: { children: React.ReactNode }) {
  return (
    <KumoWalletProvider>
      <div
        className="bg-cream text-navy"
        style={{
          minHeight: "100dvh",
          overflow: "hidden",
          position: "relative",
          paddingTop: "env(safe-area-inset-top)",
          paddingBottom: "env(safe-area-inset-bottom)",
          paddingLeft: "env(safe-area-inset-left)",
          paddingRight: "env(safe-area-inset-right)",
        }}
      >
        {children}
      </div>
    </KumoWalletProvider>
  )
}
