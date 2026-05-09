import AsyncStorage from "@react-native-async-storage/async-storage"

import { KUMO_API_BASE_URL as ENV_API_BASE_URL } from "./config"

/**
 * Runtime-overridable settings. Stored in AsyncStorage so a user can point a
 * shipped APK at a different backend without rebuilding (Saga / dApp Store
 * distribution).
 */

const KEY_API_URL = "kumo.runtime.apiBaseUrl"

let cachedApiUrl: string | null = null

export async function getApiBaseUrl(): Promise<string> {
  if (cachedApiUrl !== null) return cachedApiUrl
  let resolved = ENV_API_BASE_URL
  try {
    const stored = await AsyncStorage.getItem(KEY_API_URL)
    if (stored && stored.trim().length > 0) resolved = stored.trim()
  } catch {
    /* fall through to default */
  }
  cachedApiUrl = resolved
  return resolved
}

export async function setApiBaseUrl(value: string): Promise<void> {
  const trimmed = value.trim()
  if (trimmed.length === 0) {
    await AsyncStorage.removeItem(KEY_API_URL).catch(() => {})
    cachedApiUrl = ENV_API_BASE_URL
    return
  }
  await AsyncStorage.setItem(KEY_API_URL, trimmed).catch(() => {})
  cachedApiUrl = trimmed
}

export function getDefaultApiBaseUrl(): string {
  return ENV_API_BASE_URL
}

/** Sync accessor — returns last cached value, or env default if not yet warmed. */
export function getApiBaseUrlSync(): string {
  return cachedApiUrl ?? ENV_API_BASE_URL
}
