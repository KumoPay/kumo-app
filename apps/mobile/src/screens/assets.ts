// Brand asset registry. RN's `require()` is static, so all assets must be
// referenced by literal path; expose them as a typed map for screens to consume.

export const ASSETS = {
  kumoMascot: require("../../assets/kumo-mascot.png"),
  kumoOfflineMascot: require("../../assets/kumo-offline-mascot.png"),
  state00: require("../../assets/state-00.png"),
  state02: require("../../assets/state-02.png"),
  state03: require("../../assets/state-03.png"),
  state05: require("../../assets/state-05.png"),
  state06: require("../../assets/state-06.png"),
  state07: require("../../assets/state-07.png"),
  state09: require("../../assets/state-09.png"),
  logoPrimary: require("../../assets/logo-primary-01.png"),
  logoPrimary02: require("../../assets/logo-primary-02.png"),
  favicon32: require("../../assets/favicon-32.png"),
  walletPhantom: require("../../assets/wallet-phantom.png"),
  walletSolflare: require("../../assets/wallet-solflare.png"),
  walletBackpack: require("../../assets/wallet-backpack.png"),
  walletGlow: require("../../assets/wallet-glow.png"),
  icon: require("../../assets/icon.png"),
} as const

export function walletLogoFor(brand: string) {
  switch (brand.toLowerCase()) {
    case "phantom": return ASSETS.walletPhantom
    case "solflare": return ASSETS.walletSolflare
    case "backpack": return ASSETS.walletBackpack
    case "glow": return ASSETS.walletGlow
    default: return ASSETS.walletPhantom
  }
}

/**
 * Detect the wallet brand. Signals, in order of reliability:
 *
 * 1. `walletUriBase` — wallet app's homepage URL from MWA `authorize()`.
 *    Reliable when present (e.g. "https://phantom.app"). Solflare does NOT
 *    populate this field.
 * 2. `authToken` — the MWA auth_token is a JWT whose header encodes the
 *    wallet's identifier in the `typ` claim (e.g. `solflare-auth-token`,
 *    `phantom-auth-token`). This is the reliable fingerprint for wallets
 *    that don't set `walletUriBase`.
 * 3. `label` — the per-account name. Least reliable because Phantom AND
 *    Solflare both default to "Main Wallet".
 *
 * Falls back to "phantom" for unknown wallets so the UI still has an icon.
 */
export function brandFor(opts: {
  walletUriBase?: string | null
  authToken?: string | null
  label?: string | null
}): string {
  const uri = (opts.walletUriBase ?? "").toLowerCase()
  if (uri.includes("phantom")) return "phantom"
  if (uri.includes("solflare")) return "solflare"
  if (uri.includes("backpack")) return "backpack"
  if (uri.includes("glow")) return "glow"

  if (opts.authToken) {
    const hint = decodeAuthTokenHint(opts.authToken)
    if (hint.includes("phantom")) return "phantom"
    if (hint.includes("solflare")) return "solflare"
    if (hint.includes("backpack")) return "backpack"
    if (hint.includes("glow")) return "glow"
  }

  const lbl = (opts.label ?? "").toLowerCase()
  if (lbl.includes("phantom")) return "phantom"
  if (lbl.includes("solflare")) return "solflare"
  if (lbl.includes("backpack")) return "backpack"
  if (lbl.includes("glow")) return "glow"

  return "phantom"
}

// Decode just enough of the auth_token's JWT-style base64 header to find the
// wallet identifier (e.g. "solflare-auth-token"). We don't validate the JWT;
// we only need the literal substring. Returns empty string on any failure.
function decodeAuthTokenHint(token: string): string {
  try {
    const firstDot = token.indexOf(".")
    const head = (firstDot > 0 ? token.slice(0, firstDot) : token.slice(0, 96))
      .replace(/-/g, "+")
      .replace(/_/g, "/")
    const pad = head.length % 4 === 0 ? head : head + "=".repeat(4 - (head.length % 4))
    const B = (globalThis as { Buffer?: { from(s: string, e: string): { toString(e: string): string } } }).Buffer
    const decoded = B
      ? B.from(pad, "base64").toString("utf8")
      : (typeof atob === "function" ? atob(pad) : "")
    return decoded.toLowerCase()
  } catch {
    return ""
  }
}

/** @deprecated Prefer `brandFor({ walletUriBase, label })`. Kept for callers that only have a label. */
export function brandFromLabel(label: string | null | undefined): string {
  return brandFor({ label })
}
