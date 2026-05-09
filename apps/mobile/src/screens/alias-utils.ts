/** Canonical public alias (lowercase, a-z 0-9 _). */
export function sanitizeKumoLocalPart(raw: string): string {
  return raw
    .trim()
    .toLowerCase()
    .replace(/\s+/g, "")
    .replace(/[^a-z0-9_]/g, "")
    .slice(0, 24)
}

export const KUMO_ALIAS_MIN_LEN = 3

/** Strip legacy `.kumo` suffix when showing the handle in UI. */
export function displayWalletAlias(name: string | undefined | null): string {
  if (!name) return ""
  return name.replace(/\.kumo$/i, "")
}
