// Brand asset registry. RN's `require()` is static, so all assets must be
// referenced by literal path; expose them as a typed map for screens to consume.

export const ASSETS = {
  kumoMascot: require("../../assets/kumo-mascot.png"),
  state00: require("../../assets/state-00.png"),
  state02: require("../../assets/state-02.png"),
  state03: require("../../assets/state-03.png"),
  state05: require("../../assets/state-05.png"),
  state06: require("../../assets/state-06.png"),
  state07: require("../../assets/state-07.png"),
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
