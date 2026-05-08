import { KumoWalletProvider } from "./providers"

export default function AppLayout({ children }: { children: React.ReactNode }) {
  return <KumoWalletProvider>{children}</KumoWalletProvider>
}
