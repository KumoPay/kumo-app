/**
 * Android download URL. Points at the Solana dApp Store APK by default.
 * Override with `NEXT_PUBLIC_ANDROID_PLAY_STORE_URL` in `.env` if needed.
 */
export const ANDROID_PLAY_STORE_URL =
  process.env.NEXT_PUBLIC_ANDROID_PLAY_STORE_URL?.trim() ||
  "https://r2.solanamobiledappstore.com/a/e5a8e5cd1a11230f89347839fca4bbd89cabadaab2e824c74d188567d0a1621c.apk"
