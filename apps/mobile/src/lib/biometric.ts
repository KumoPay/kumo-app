import * as LocalAuthentication from "expo-local-authentication"
import AsyncStorage from "@react-native-async-storage/async-storage"

const PREF_KEY_REQUIRE = "kumo.bio.requireForSign"

export async function isBiometricAvailable(): Promise<boolean> {
  try {
    const has = await LocalAuthentication.hasHardwareAsync()
    if (!has) return false
    const enrolled = await LocalAuthentication.isEnrolledAsync()
    return enrolled
  } catch {
    return false
  }
}

export async function getBiometricLabel(): Promise<string> {
  try {
    const types = await LocalAuthentication.supportedAuthenticationTypesAsync()
    if (types.includes(LocalAuthentication.AuthenticationType.FACIAL_RECOGNITION)) return "Face ID / face scan"
    if (types.includes(LocalAuthentication.AuthenticationType.FINGERPRINT)) return "Fingerprint"
    if (types.includes(LocalAuthentication.AuthenticationType.IRIS)) return "Iris"
    return "Device biometric"
  } catch {
    return "Device biometric"
  }
}

export async function requireForSign(): Promise<boolean> {
  return (await AsyncStorage.getItem(PREF_KEY_REQUIRE).catch(() => null)) === "1"
}

export async function setRequireForSign(v: boolean): Promise<void> {
  await AsyncStorage.setItem(PREF_KEY_REQUIRE, v ? "1" : "0").catch(() => {})
}

/** Prompt the system biometric UI. Returns true on success, false if cancelled or failed. */
export async function authenticateForAction(reason: string): Promise<boolean> {
  if (!(await isBiometricAvailable())) return true // no-op on devices without bio
  try {
    const result = await LocalAuthentication.authenticateAsync({
      promptMessage: reason,
      cancelLabel: "Cancel",
      disableDeviceFallback: false,
      fallbackLabel: "Use PIN",
    })
    return result.success
  } catch {
    return false
  }
}
