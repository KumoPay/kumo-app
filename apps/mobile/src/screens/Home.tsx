import { Image, Linking, Pressable, StyleSheet, Text, View } from "react-native"
import { useBalance } from "../hooks/use-balance"
import { displayWalletAlias } from "./alias-utils"
import { K, SHADOW } from "./theme"
import { ASSETS } from "./assets"
import { relativeTime, useHistory } from "./history-store"
import type { ScreenRenderer } from "./types"

const formatUsdc = (n: number) =>
  n.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })

export const Home: ScreenRenderer = (ctx) => ({
  body: <HomeBody ctx={ctx} />,
  cta: (
    <Pressable
      onPress={() => ctx.push("intent")}
      style={({ pressed }) => [styles.payBar, pressed && { opacity: 0.92 }]}
    >
      <Text style={styles.payBarIcon}>✈</Text>
      <Text style={styles.payBarText}>New payment</Text>
    </Pressable>
  ),
})

function HomeBody({ ctx }: { ctx: Parameters<ScreenRenderer>[0] }) {
  const balance = useBalance(ctx.wallet?.pubkey ?? null)
  const history = useHistory()

  const usdcDisplay = balance.usdc ?? 0
  const slice = history.entries.slice(0, 3)
  const hasEntries = slice.length > 0

  return (
    <View>
      <View style={{ paddingTop: 8 }}>
        <Text style={styles.greeting}>
          Hi, {(displayWalletAlias(ctx.wallet?.displayName) || "friend").toLowerCase()} 👋
        </Text>
        <Text style={styles.greetSub}>Private payments—even offline.</Text>
        {balance.usdc != null && balance.sol != null && balance.sol < 0.01 ? (
          <Pressable
            onPress={() => void Linking.openURL("https://faucet.solana.com/")}
            style={({ pressed }) => [styles.devnetChip, pressed && { opacity: 0.85 }]}
          >
            <View style={styles.devnetDot} />
            <Text style={styles.devnetText}>Need devnet SOL? · faucet ↗</Text>
          </Pressable>
        ) : null}
      </View>

      <View style={[styles.balanceCard, SHADOW.card]}>
        <View style={{ flex: 1, paddingVertical: 22, paddingLeft: 20, paddingRight: 12 }}>
          <Text style={styles.balanceLabel}>Available balance</Text>
          <Text style={styles.balanceBig}>${formatUsdc(usdcDisplay)}</Text>
          <Text style={styles.balanceSub}>
            {balance.usdc == null ? "— USDC" : `${formatUsdc(balance.usdc)} USDC`}
          </Text>
          <View style={styles.statusPill}>
            <View
              style={[
                styles.statusDot,
                { backgroundColor: balance.error ? "#f59e0b" : K.green },
              ]}
            />
            <Text style={styles.statusText}>{balance.error ? "Offline" : "Connected"}</Text>
          </View>
        </View>
        <View style={styles.balanceMascot}>
          <Image source={ASSETS.state06} style={styles.balanceMascotImg} resizeMode="contain" />
        </View>
      </View>

      <View style={styles.tilesRow}>
        <Tile label="Pay" tint="#ede9fe" stroke="#6847e8" icon="↑" onPress={() => ctx.push("intent")} />
        <Tile label="Receive" tint="#dbefff" stroke="#0b7dd4" icon="↓" onPress={() => ctx.push("receive")} />
      </View>

      <View style={{ marginTop: 28 }}>
        <View style={styles.activityHead}>
          <Text style={styles.activityTitle}>Recent activity</Text>
          <Pressable onPress={() => ctx.push("history")}>
            <Text style={styles.viewAll}>See all</Text>
          </Pressable>
        </View>

        {hasEntries ? (
          <View style={[styles.activityCard, SHADOW.card]}>
            {slice.map((h, i) => {
              const initial = (h.counterparty.charAt(0) || "?").toUpperCase()
              const out = h.direction === "out"
              const bg = out ? "#e8e0ff" : "#d4f5e6"
              const title = out ? `To ${h.counterparty}` : `From ${h.counterparty}`
              const amount = `${out ? "−" : "+"}${formatUsdc(h.amount)} USDC`
              return (
                <View
                  key={h.id}
                  style={[styles.activityRow, i < slice.length - 1 && styles.activityDivider]}
                >
                  <View style={[styles.activityAvatar, { backgroundColor: bg }]}>
                    <Text style={styles.activityInit}>{initial}</Text>
                  </View>
                  <View style={{ flex: 1, minWidth: 0 }}>
                    <Text style={styles.activityTitleRow} numberOfLines={1}>{title}</Text>
                    <Text style={styles.activityWhen}>{relativeTime(h.createdAt)}</Text>
                  </View>
                  <View style={{ alignItems: "flex-end" }}>
                    <Text style={styles.activityAmount}>{amount}</Text>
                    <Text style={[styles.activityStatus, { color: out ? "#7c5cff" : "#1b9e5a" }]}>
                      {h.status}
                    </Text>
                  </View>
                </View>
              )
            })}
          </View>
        ) : (
          <Pressable
            onPress={() => ctx.push("intent")}
            style={({ pressed }) => [styles.activityCard, SHADOW.card, styles.empty, pressed && { opacity: 0.92 }]}
          >
            <Text style={styles.emptyTitle}>Make your first payment ✈</Text>
            <Text style={styles.emptySub}>Tap to send some USDC and start your history.</Text>
          </Pressable>
        )}
      </View>
    </View>
  )
}

function Tile({
  label,
  tint,
  stroke,
  icon,
  onPress,
}: {
  label: string
  tint: string
  stroke: string
  icon: string
  onPress: () => void
}) {
  return (
    <Pressable
      onPress={onPress}
      style={({ pressed }) => [styles.tile, SHADOW.card, pressed && { opacity: 0.92 }]}
    >
      <View style={[styles.tileIcon, { backgroundColor: tint }]}>
        <Text style={{ color: stroke, fontSize: 18, fontWeight: "900" }}>{icon}</Text>
      </View>
      <Text style={styles.tileLabel}>{label}</Text>
    </Pressable>
  )
}

const styles = StyleSheet.create({
  greeting: {
    fontSize: 26,
    fontWeight: "900",
    color: "#141b2f",
    letterSpacing: -0.8,
  },
  greetSub: { marginTop: 6, fontSize: 14, color: "#6b7380", fontWeight: "600" },
  devnetChip: {
    marginTop: 10,
    flexDirection: "row",
    alignItems: "center",
    alignSelf: "flex-start",
    gap: 6,
    paddingHorizontal: 10,
    paddingVertical: 5,
    backgroundColor: K.sky50,
    borderRadius: 999,
  },
  devnetDot: { width: 6, height: 6, borderRadius: 3, backgroundColor: K.cyan },
  devnetText: { fontSize: 11, fontWeight: "800", color: K.navy },
  balanceCard: {
    flexDirection: "row",
    marginTop: 22,
    backgroundColor: K.white,
    borderColor: K.divider,
    borderWidth: 1,
    borderRadius: 28,
    overflow: "hidden",
  },
  balanceLabel: { fontSize: 13, color: "#6b7280", fontWeight: "600" },
  balanceBig: {
    marginTop: 6,
    fontSize: 34,
    fontWeight: "900",
    color: "#111827",
    letterSpacing: -1,
  },
  balanceSub: {
    marginTop: 4,
    fontSize: 13,
    fontWeight: "700",
    color: "#6b7280",
  },
  statusPill: {
    marginTop: 14,
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    paddingHorizontal: 12,
    paddingVertical: 6,
    backgroundColor: K.white,
    borderColor: "#e5e7eb",
    borderWidth: 1,
    borderRadius: 999,
    alignSelf: "flex-start",
  },
  statusDot: { width: 7, height: 7, borderRadius: 999 },
  statusText: { fontSize: 12, color: "#6b7280", fontWeight: "700" },
  balanceMascot: {
    width: 116,
    alignItems: "center",
    justifyContent: "flex-end",
    paddingBottom: 12,
  },
  balanceMascotImg: { width: 110, height: 110 },
  tilesRow: {
    flexDirection: "row",
    gap: 10,
    marginTop: 14,
  },
  tile: {
    flex: 1,
    backgroundColor: K.white,
    borderRadius: 22,
    paddingVertical: 18,
    alignItems: "center",
  },
  tileIcon: {
    width: 50,
    height: 50,
    borderRadius: 999,
    alignItems: "center",
    justifyContent: "center",
  },
  tileLabel: {
    marginTop: 10,
    fontSize: 13,
    fontWeight: "800",
    color: "#131b34",
  },
  activityHead: {
    flexDirection: "row",
    alignItems: "baseline",
    justifyContent: "space-between",
    marginBottom: 10,
  },
  activityTitle: {
    fontSize: 19,
    fontWeight: "900",
    color: "#131b34",
    letterSpacing: -0.4,
  },
  viewAll: { fontSize: 14, fontWeight: "800", color: "#7c5cff" },
  activityCard: { backgroundColor: K.white, borderRadius: 24, overflow: "hidden" },
  activityRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    paddingHorizontal: 16,
    paddingVertical: 14,
  },
  activityDivider: {
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: K.divider,
  },
  activityAvatar: {
    width: 42,
    height: 42,
    borderRadius: 999,
    alignItems: "center",
    justifyContent: "center",
  },
  activityInit: { color: "#131b34", fontSize: 15, fontWeight: "900" },
  activityTitleRow: { color: "#131b34", fontSize: 15, fontWeight: "900" },
  activityWhen: { color: "#8b929d", fontSize: 12, fontWeight: "700", marginTop: 2 },
  activityAmount: { color: "#131b34", fontSize: 15, fontWeight: "900" },
  activityStatus: { fontSize: 11, fontWeight: "800", marginTop: 2 },
  empty: { paddingVertical: 26, paddingHorizontal: 18, alignItems: "center" },
  emptyTitle: { fontSize: 16, fontWeight: "900", color: K.navy },
  emptySub: { marginTop: 4, fontSize: 12, color: K.navy55, fontWeight: "700", textAlign: "center" },
  payBar: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 10,
    paddingVertical: 16,
    borderRadius: 18,
    backgroundColor: "#7c5cff",
  },
  payBarIcon: { color: K.white, fontSize: 18 },
  payBarText: { color: K.white, fontSize: 16, fontWeight: "800" },
})
