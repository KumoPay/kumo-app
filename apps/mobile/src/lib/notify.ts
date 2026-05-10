import { Platform } from "react-native"
import * as Notifications from "expo-notifications"

const CHANNEL_ID = "kumo-payments"

let initialized = false

async function ensureChannel() {
  if (Platform.OS !== "android") return
  await Notifications.setNotificationChannelAsync(CHANNEL_ID, {
    name: "Payments",
    importance: Notifications.AndroidImportance.HIGH,
    sound: "default",
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
