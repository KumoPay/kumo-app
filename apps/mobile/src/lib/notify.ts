import { Platform } from "react-native"
import * as Notifications from "expo-notifications"

// v2 bumps the channel ID because Android pins channel settings at first
// create — the original "kumo-payments" channel was registered with
// `sound: "default"`, a string expo-notifications resolved as a bundled
// resource name and the OS keeps as a broken reference even after the JS
// fixes its config.
const CHANNEL_ID = "kumo-payments-v2"

let initialized = false

async function ensureChannel() {
  if (Platform.OS !== "android") return
  // Best-effort cleanup of the legacy channel that was registered with the
  // broken `sound: "default"` reference. Android keeps that config pinned on
  // the device after first create, so we abandon the old ID instead of trying
  // to mutate it in place.
  await Notifications.deleteNotificationChannelAsync("kumo-payments").catch(() => {})
  // No `sound` field: expo-notifications interprets the string "default" as a
  // bundled resource name (res/raw/<name>) and errors if no such file exists.
  // Omitting it falls back to the system notification sound for this channel.
  await Notifications.setNotificationChannelAsync(CHANNEL_ID, {
    name: "Payments",
    importance: Notifications.AndroidImportance.HIGH,
    vibrationPattern: [0, 200, 100, 200],
  })
}

export async function ensureNotifyReady(): Promise<boolean> {
  if (!initialized) {
    Notifications.setNotificationHandler({
      handleNotification: async () => ({
        shouldShowBanner: true,
        shouldShowList: true,
        shouldPlaySound: true,
        shouldSetBadge: false,
      }),
    })
    await ensureChannel()
    initialized = true
  }
  const { status } = await Notifications.getPermissionsAsync()
  if (status === "granted") return true
  const req = await Notifications.requestPermissionsAsync()
  return req.status === "granted"
}

export async function notifyPaymentSent(opts: {
  amountUsdc: number
  recipient: string
  signature: string
}): Promise<void> {
  const ok = await ensureNotifyReady()
  if (!ok) return
  const recipShort =
    opts.recipient.length > 12
      ? `${opts.recipient.slice(0, 4)}…${opts.recipient.slice(-4)}`
      : opts.recipient
  await Notifications.scheduleNotificationAsync({
    content: {
      title: "Payment sent",
      body: `${opts.amountUsdc} USDC to ${recipShort}`,
      data: { signature: opts.signature, kind: "payment-sent" },
    },
    trigger: null,
  }).catch(() => {})
}

export async function notifyAwaitingConnection(opts: {
  amountUsdc: number
  recipient: string
  intentHash: string
}): Promise<string | null> {
  const ok = await ensureNotifyReady()
  if (!ok) return null
  const recipShort =
    opts.recipient.length > 12
      ? `${opts.recipient.slice(0, 4)}…${opts.recipient.slice(-4)}`
      : opts.recipient
  try {
    return await Notifications.scheduleNotificationAsync({
      identifier: `kumo-await-${opts.intentHash.slice(0, 16)}`,
      content: {
        title: "Kumo — payment queued",
        body: `Waiting for connection to settle ${opts.amountUsdc} USDC to ${recipShort}.`,
        data: { kind: "awaiting-connection", intentHash: opts.intentHash },
        sticky: true,
      },
      trigger: null,
    })
  } catch {
    return null
  }
}

export async function clearAwaitingConnection(intentHash: string): Promise<void> {
  try {
    await Notifications.dismissNotificationAsync(
      `kumo-await-${intentHash.slice(0, 16)}`,
    )
  } catch {}
}

export async function notifyPaymentFailed(opts: {
  amountUsdc: number
  recipient: string
  reason: string
}): Promise<void> {
  const ok = await ensureNotifyReady()
  if (!ok) return
  await Notifications.scheduleNotificationAsync({
    content: {
      title: "Payment failed",
      body: `${opts.amountUsdc} USDC — ${opts.reason}`,
      data: { kind: "payment-failed" },
    },
    trigger: null,
  }).catch(() => {})
}
