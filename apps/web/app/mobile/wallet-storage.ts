import type { WalletInfo } from "./screens/types"

export const WALLET_STORAGE_KEY = "kumo.mobile.wallet"

/** Set after the user completes the one-time "choose your alias" onboarding. */
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

export function readStoredWallet(): WalletInfo | null {
  if (typeof window === "undefined") return null
  try {
    const raw = window.localStorage.getItem(WALLET_STORAGE_KEY)
    if (!raw) return null
    const parsed: unknown = JSON.parse(raw)
    if (isWalletInfo(parsed)) return parsed
  } catch {
    window.localStorage.removeItem(WALLET_STORAGE_KEY)
  }
  return null
}

export function writeStoredWallet(w: WalletInfo): void {
  if (typeof window === "undefined") return
  try {
    window.localStorage.setItem(WALLET_STORAGE_KEY, JSON.stringify(w))
  } catch {
    /* quota / private mode */
  }
}

export function clearStoredWallet(): void {
  if (typeof window === "undefined") return
  try {
    window.localStorage.removeItem(WALLET_STORAGE_KEY)
  } catch {
    /* ignore */
  }
}

export function readAliasOnboardingComplete(): boolean {
  if (typeof window === "undefined") return false
  return window.localStorage.getItem(ALIAS_ONBOARDING_KEY) === "1"
}

export function writeAliasOnboardingComplete(): void {
  if (typeof window === "undefined") return
  try {
    window.localStorage.setItem(ALIAS_ONBOARDING_KEY, "1")
  } catch {
    /* ignore */
  }
}

export function clearAliasOnboarding(): void {
  if (typeof window === "undefined") return
  try {
    window.localStorage.removeItem(ALIAS_ONBOARDING_KEY)
  } catch {
    /* ignore */
  }
}

/** Wallet + one-time onboarding flags (e.g. disconnect / sign out). */
export function clearMobilePersistedState(): void {
  clearStoredWallet()
  clearAliasOnboarding()
}
