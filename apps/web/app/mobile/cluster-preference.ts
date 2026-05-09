export type SolanaClusterId = "mainnet-beta" | "devnet" | "testnet"

export const SOLANA_CLUSTERS: {
  id: SolanaClusterId
  label: string
  endpoint: string
}[] = [
  {
    id: "mainnet-beta",
    label: "Mainnet",
    endpoint: "api.mainnet-beta.solana.com",
  },
  { id: "devnet", label: "Devnet", endpoint: "api.devnet.solana.com" },
  { id: "testnet", label: "Testnet", endpoint: "api.testnet.solana.com" },
]

const STORAGE_KEY = "kumo.mobile.solanaCluster"

const DEFAULT: SolanaClusterId = "devnet"

function parseCluster(raw: string | null): SolanaClusterId {
  if (raw === "mainnet-beta" || raw === "devnet" || raw === "testnet") {
    return raw
  }
  return DEFAULT
}

export function readStoredCluster(): SolanaClusterId {
  if (typeof window === "undefined") return DEFAULT
  try {
    return parseCluster(window.localStorage.getItem(STORAGE_KEY))
  } catch {
    return DEFAULT
  }
}

export function writeStoredCluster(id: SolanaClusterId): void {
  if (typeof window === "undefined") return
  try {
    window.localStorage.setItem(STORAGE_KEY, id)
  } catch {
    /* ignore */
  }
}

export function clusterDisplayLabel(id: SolanaClusterId): string {
  return SOLANA_CLUSTERS.find((c) => c.id === id)?.label ?? "Devnet"
}

export function clusterEndpoint(id: SolanaClusterId): string {
  return SOLANA_CLUSTERS.find((c) => c.id === id)?.endpoint ?? "api.devnet.solana.com"
}
