export const SOLANA_RPC =
  process.env.EXPO_PUBLIC_SOLANA_RPC_URL ?? "https://api.devnet.solana.com"

export const KUMO_API_BASE_URL =
  process.env.EXPO_PUBLIC_KUMO_API_BASE_URL ?? "http://10.0.2.2:3000"

export const MAGICBLOCK_TEE_RPC =
  process.env.EXPO_PUBLIC_MAGICBLOCK_TEE_RPC ?? "https://devnet-tee.magicblock.app"

// MWA shows this to the user when they connect — wallet displays
// `name @ uri` and fetches `<uri>/<icon>` for the dApp icon.
// Override per-build via EXPO_PUBLIC_APP_URI.
export const APP_IDENTITY = {
  name: "Kumo",
  uri: process.env.EXPO_PUBLIC_APP_URI ?? "https://www.kumoapp.xyz",
  icon: "favicon-32.png",
}
