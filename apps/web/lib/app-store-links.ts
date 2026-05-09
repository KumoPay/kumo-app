/**
 * Google Play URL — set `NEXT_PUBLIC_ANDROID_PLAY_STORE_URL` in `.env`.
 * Falls back to Play Store home until you configure the app listing URL.
 */
export const ANDROID_PLAY_STORE_URL =
  process.env.NEXT_PUBLIC_ANDROID_PLAY_STORE_URL?.trim() || "https://play.google.com/store"
