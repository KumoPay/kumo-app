import { Image, Pressable, StyleSheet, Text, View } from "react-native"
import { K, SHADOW } from "./theme"
import { PrimaryCTA } from "./atoms"
import { ASSETS } from "./assets"
import type { ScreenRenderer } from "./types"

export const Connect: ScreenRenderer = (ctx) => ({
  body: (
    <View style={styles.wrap}>
      <View style={styles.hero}>
        <Image source={ASSETS.state05} style={styles.heroMascot} resizeMode="contain" />
        <Text style={styles.h1}>Welcome to Kumo</Text>
        <Text style={styles.sub}>Pay when the signal disappears.</Text>
      </View>

      <Text style={styles.eyebrow}>Choose a wallet</Text>

      <View style={[styles.card, SHADOW.card]}>
        <WalletRow name="Phantom"  logo={ASSETS.walletPhantom}  onPress={() => void ctx.beginWalletConnect("phantom")}  disabled={ctx.busy} divider />
        <WalletRow name="Solflare" logo={ASSETS.walletSolflare} onPress={() => void ctx.beginWalletConnect("solflare")} disabled={ctx.busy} divider />
        <WalletRow name="Backpack" logo={ASSETS.walletBackpack} onPress={() => void ctx.beginWalletConnect("backpack")} disabled={ctx.busy} />
      </View>

      {ctx.error ? <Text style={styles.error}>{ctx.error}</Text> : null}

      <Text style={styles.devnetNote}>Devnet only. No real funds will move.</Text>
      <Text style={styles.faucetLink}>Need devnet USDC? faucet.circle.com</Text>

      <View style={{ height: 12 }} />
      <PrimaryCTA busy={ctx.busy} onPress={() => void ctx.beginWalletConnect("any")}>
        Connect any installed wallet
      </PrimaryCTA>
    </View>
  ),
})

function WalletRow({
  name,
  logo,
  onPress,
  disabled,
  divider,
}: {
  name: string
  logo: number
  onPress: () => void
  disabled?: boolean
  divider?: boolean
}) {
  return (
    <Pressable
      onPress={onPress}
      disabled={disabled}
      style={({ pressed }) => [
        styles.row,
        divider && styles.rowDivider,
        pressed && !disabled && { backgroundColor: "#f9fbff" },
        disabled && { opacity: 0.55 },
      ]}
    >
      <Image source={logo} style={styles.brandAvatar} />
      <View style={{ flex: 1, minWidth: 0 }}>
        <Text style={styles.walletName}>{name}</Text>
        <Text style={styles.walletSub}>Detected · Tap to connect</Text>
      </View>
      <Text style={styles.chevron}>›</Text>
    </Pressable>
  )
}

const styles = StyleSheet.create({
  wrap: { paddingTop: 4 },
  hero: { alignItems: "center", paddingTop: 16, paddingBottom: 28 },
  heroMascot: {
    width: 230,
    height: 230,
    marginBottom: 8,
  },
  h1: {
    fontSize: 30,
    fontWeight: "900",
    color: "#0f131c",
    letterSpacing: -0.6,
    textAlign: "center",
  },
  sub: {
    marginTop: 6,
    fontSize: 15,
    color: "#64748b",
    textAlign: "center",
  },
  eyebrow: {
    fontSize: 11,
    fontWeight: "800",
    letterSpacing: 1.8,
    textTransform: "uppercase",
    color: "#94a3b8",
    textAlign: "center",
    marginBottom: 8,
  },
  card: {
    borderRadius: 26,
    backgroundColor: K.white,
    borderColor: "#f1f5f9",
    borderWidth: 1,
    overflow: "hidden",
  },
  row: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    paddingHorizontal: 18,
    paddingVertical: 15,
  },
  rowDivider: {
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: "#f1f5f9",
  },
  brandAvatar: {
    width: 44,
    height: 44,
    borderRadius: 22,
  },
  walletName: { fontSize: 16, fontWeight: "800", color: K.navy },
  walletSub: { fontSize: 12, color: "#94a3b8", marginTop: 2 },
  chevron: { fontSize: 22, fontWeight: "700", color: "#cbd5e1" },
  error: {
    marginTop: 14,
    paddingHorizontal: 12,
    color: "#b91c1c",
    fontSize: 12,
    fontWeight: "700",
    textAlign: "center",
  },
  devnetNote: {
    marginTop: 18,
    paddingHorizontal: 12,
    color: "#64748b",
    fontSize: 12,
    textAlign: "center",
  },
  faucetLink: {
    marginTop: 6,
    paddingHorizontal: 12,
    color: "#7c3aed",
    fontSize: 13,
    fontWeight: "700",
    textAlign: "center",
    textDecorationLine: "underline",
  },
})
