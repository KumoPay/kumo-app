export const SOLANA_RPC =
  process.env.EXPO_PUBLIC_SOLANA_RPC_URL ?? "https://api.devnet.solana.com"

export const KUMO_API_BASE_URL =
  process.env.EXPO_PUBLIC_KUMO_API_BASE_URL ?? "http://10.0.2.2:3000"

export const MAGICBLOCK_TEE_RPC =
  process.env.EXPO_PUBLIC_MAGICBLOCK_TEE_RPC ?? "https://devnet-tee.magicblock.app"

export const APP_IDENTITY = {
  name: "Kumo",
  uri: "https://kumo.app",
  icon: "favicon.png",
}
