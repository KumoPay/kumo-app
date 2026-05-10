/**
 * Android download URL. Points at the Solana dApp Store APK by default.
 * Override with `NEXT_PUBLIC_ANDROID_PLAY_STORE_URL` in `.env` if needed.
 */
export const ANDROID_PLAY_STORE_URL =
  process.env.NEXT_PUBLIC_ANDROID_PLAY_STORE_URL?.trim() ||
  "https://r2.solanamobiledappstore.com/a/03fd9c0b136a173bde8cc52bb963e3c4ffe9baf65413fdc01d4574bea17df090.apk"
