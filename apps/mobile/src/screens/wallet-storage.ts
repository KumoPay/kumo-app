import AsyncStorage from "@react-native-async-storage/async-storage"
import type { WalletInfo } from "./types"

export const WALLET_STORAGE_KEY = "kumo.mobile.wallet"
export const ALIAS_ONBOARDING_KEY = "kumo.mobile.onboarding.aliasDone"

function isWalletInfo(v: unknown): v is WalletInfo {
  if (!v || typeof v !== "object") return false
  const o = v as Record<string, unknown>
  return (
    typeof o.id === "string" &&
    typeof o.label === "string" &&
    typeof o.brand === "string" &&
    typeof o.initial === "string" &&
    typeof o.pubkey === "string" &&
    typeof o.displayName === "string"
  )
}

export async function readStoredWallet(): Promise<WalletInfo | null> {
  try {
    const raw = await AsyncStorage.getItem(WALLET_STORAGE_KEY)
    if (!raw) return null
    const parsed: unknown = JSON.parse(raw)
    if (isWalletInfo(parsed)) return parsed
  } catch {
    await AsyncStorage.removeItem(WALLET_STORAGE_KEY).catch(() => {})
  }
  return null
}

export async function writeStoredWallet(w: WalletInfo): Promise<void> {
  try {
    await AsyncStorage.setItem(WALLET_STORAGE_KEY, JSON.stringify(w))
  } catch {
    /* ignore */
  }
}

export async function clearStoredWallet(): Promise<void> {
  try {
    await AsyncStorage.removeItem(WALLET_STORAGE_KEY)
  } catch {
    /* ignore */
  }
}

export async function readAliasOnboardingComplete(): Promise<boolean> {
  try {
    return (await AsyncStorage.getItem(ALIAS_ONBOARDING_KEY)) === "1"
  } catch {
    return false
  }
}

export async function writeAliasOnboardingComplete(): Promise<void> {
  try {
    await AsyncStorage.setItem(ALIAS_ONBOARDING_KEY, "1")
  } catch {
    /* ignore */
  }
}

export async function clearAliasOnboarding(): Promise<void> {
  try {
    await AsyncStorage.removeItem(ALIAS_ONBOARDING_KEY)
  } catch {
    /* ignore */
  }
}

export async function clearMobilePersistedState(): Promise<void> {
  await Promise.all([clearStoredWallet(), clearAliasOnboarding()])
}
