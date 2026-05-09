import { Image, Linking, Pressable, StyleSheet, Text, View } from "react-native"
import Svg, { Path } from "react-native-svg"

import { ASSETS } from "./assets"
import { K } from "./theme"
import type { ScreenRenderer } from "./types"

const WALLETS = [
  { name: "Phantom", id: "phantom", logo: ASSETS.walletPhantom },
  { name: "Solflare", id: "solflare", logo: ASSETS.walletSolflare },
  { name: "Backpack", id: "backpack", logo: ASSETS.walletBackpack },
  { name: "Glow", id: "glow", logo: ASSETS.walletGlow },
] as const

function SignalArcs() {
  return (
    <Svg width={58} height={96} viewBox="0 0 58 96" fill="none">
      <Path
        d="M6 18C18 38 26 54 31 71"
        stroke="#7FD4FF"
        strokeWidth={3}
        strokeLinecap="round"
        opacity={0.85}
        strokeDasharray="4 62"
      />
      <Path
        d="M2 42C13 53 21 61 31 71"
        stroke="#9EE3FF"
        strokeWidth={2.5}
        strokeLinecap="round"
        opacity={0.75}
        strokeDasharray="3 50"
      />
      <Path
        d="M1 61C13 61 26 71 31 78"
        stroke="#B7F1FF"
        strokeWidth={2}
        strokeLinecap="round"
        opacity={0.65}
        strokeDasharray="2 40"
      />
    </Svg>
  )
}

export const Connect: ScreenRenderer = (ctx) => ({
  body: (
    <View style={styles.wrap}>
      <View style={styles.hero}>
        <View style={styles.heroArcs}>
          <SignalArcs />
        </View>
        <Image source={ASSETS.state05} style={styles.heroMascot} resizeMode="contain" />
      </View>

      <Text style={styles.h1}>Welcome to Kumo</Text>
      <Text style={styles.sub}>Pay when the signal disappears.</Text>

      <Text style={styles.eyebrow}>Choose a wallet</Text>

      <View style={styles.card}>
        {WALLETS.map((w, i, arr) => (
          <WalletRow
            key={w.id}
            name={w.name}
            logo={w.logo}
            onPress={() => void ctx.beginWalletConnect(w.id)}
            disabled={ctx.busy}
            divider={i < arr.length - 1}
          />
        ))}
      </View>

      {ctx.error ? <Text style={styles.error}>{ctx.error}</Text> : null}

      <Text style={styles.devnetNote}>Devnet only. No real funds will move.</Text>
      <Pressable onPress={() => void Linking.openURL("https://faucet.circle.com/")}>
        <Text style={styles.faucetLink}>Need devnet USDC? faucet.circle.com</Text>
      </Pressable>
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
      <View style={styles.brandAvatarWrap}>
        <Image source={logo} style={styles.brandAvatar} />
      </View>
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
  hero: {
    alignItems: "center",
    justifyContent: "center",
    paddingTop: 12,
    paddingBottom: 12,
    position: "relative",
  },
  heroArcs: {
    position: "absolute",
    left: "16%",
    top: "44%",
    opacity: 0.55,
  },
  heroMascot: {
    width: 230,
    height: 220,
  },
  h1: {
    fontSize: 30,
    fontWeight: "900",
    color: "#0f131c",
    letterSpacing: -0.6,
    textAlign: "center",
    marginTop: 12,
  },
  sub: {
    marginTop: 6,
    fontSize: 15,
    color: "#64748b",
    textAlign: "center",
    fontWeight: "500",
  },
  eyebrow: {
    marginTop: 28,
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
    shadowColor: "#0f172a",
    shadowOpacity: 0.09,
    shadowRadius: 22,
    shadowOffset: { width: 0, height: 14 },
    elevation: 4,
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
  brandAvatarWrap: {
    width: 44,
    height: 44,
    borderRadius: 22,
    overflow: "hidden",
    shadowColor: "#163b8a",
    shadowOpacity: 0.18,
    shadowRadius: 12,
    shadowOffset: { width: 0, height: 8 },
    elevation: 3,
  },
  brandAvatar: {
    width: 44,
    height: 44,
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
    color: "#6d28d9",
    fontSize: 13,
    fontWeight: "700",
    textAlign: "center",
    textDecorationLine: "underline",
  },
})
