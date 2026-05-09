import { Image, Linking, Pressable, StyleSheet, Text, View } from "react-native"

import { useMergedHistory } from "../hooks/use-merged-history"
import { ASSETS } from "./assets"
import { K } from "./theme"
import { relativeTime } from "./history-store"
import type { NavCtx, ScreenRenderer } from "./types"

const purple = "#7B61FF"

const formatUsdc = (n: number) =>
  n.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })

export const History: ScreenRenderer = (ctx) => ({
  body: <HistoryBody ctx={ctx} />,
  cta: (
    <Pressable
      onPress={ctx.resetHome}
      style={({ pressed }) => [styles.backCta, pressed && { opacity: 0.92 }]}
    >
      <Text style={styles.backCtaText}>Back to home</Text>
    </Pressable>
  ),
})

function HistoryBody({ ctx }: { ctx: NavCtx }) {
  const { entries } = useMergedHistory(ctx.wallet?.pubkey ?? null, 30)

  return (
    <View>
      <Text style={styles.h1}>History</Text>
      <Text style={styles.sub}>Review your sent and received payments.</Text>

      <View style={styles.heroWrap}>
        <Image source={ASSETS.state05} style={styles.heroImg} resizeMode="contain" />
      </View>

      <View style={styles.card}>
        {entries.length === 0 ? (
          <View style={styles.emptyRow}>
            <Text style={styles.emptyTitle}>No payments yet</Text>
            <Text style={styles.emptySub}>
              Make your first one to see it here.
            </Text>
          </View>
        ) : (
          entries.map((h, i) => {
            const out = h.direction === "out"
            const initial = (h.counterparty.charAt(0) || "?").toUpperCase()
            const onTap = () =>
              void Linking.openURL(`https://solscan.io/tx/${h.signature}?cluster=devnet`)
            const amount =
              h.amount == null ? "—" : `${out ? "−" : "+"}${formatUsdc(h.amount)} USDC`
            const bgOut = "#ede9fe"
            const fgOut = "#5b21b6"
            const bgIn = "#dcfce7"
            const fgIn = "#166534"
            return (
              <Pressable
                key={h.id}
                onPress={onTap}
                style={({ pressed }) => [
                  styles.row,
                  i < entries.length - 1 && styles.divider,
                  pressed && { opacity: 0.92 },
                ]}
              >
                <View
                  style={[
                    styles.avatar,
                    { backgroundColor: out ? bgOut : bgIn },
                  ]}
                >
                  <Text style={[styles.avatarText, { color: out ? fgOut : fgIn }]}>
                    {initial}
                  </Text>
                </View>
                <View style={{ flex: 1, minWidth: 0 }}>
                  <Text style={styles.title} numberOfLines={1}>
                    {h.external
                      ? "On-chain transaction"
                      : out
                        ? `To ${h.counterparty}`
                        : `From ${h.counterparty}`}
                  </Text>
                  <Text style={styles.when}>{relativeTime(h.ts)}</Text>
                </View>
                <View style={{ alignItems: "flex-end" }}>
                  <Text style={styles.amount}>{amount}</Text>
                  <Text
                    style={[
                      styles.status,
                      {
                        color:
                          h.status === "queued"
                            ? "#ea580c"
                            : h.status === "failed"
                              ? "#dc2626"
                              : "#16a34a",
                      },
                    ]}
                  >
                    {h.status === "queued"
                      ? "pending"
                      : h.status === "failed"
                        ? "failed"
                        : "delivered"}
                  </Text>
                </View>
              </Pressable>
            )
          })
        )}
      </View>
    </View>
  )
}

const styles = StyleSheet.create({
  h1: {
    fontSize: 26,
    fontWeight: "900",
    letterSpacing: -0.5,
    color: "#1a1c3d",
  },
  sub: {
    marginTop: 6,
    fontSize: 14,
    color: "#64748b",
    fontWeight: "500",
  },
  heroWrap: {
    marginTop: 16,
    alignItems: "center",
    minHeight: 180,
    justifyContent: "flex-end",
  },
  heroImg: { width: 240, height: 220 },
  card: {
    marginTop: -52,
    backgroundColor: K.white,
    borderRadius: 18,
    borderWidth: 1,
    borderColor: "#eef2f6",
    overflow: "hidden",
    paddingTop: 6,
    shadowColor: "#0f172a",
    shadowOpacity: 0.1,
    shadowRadius: 30,
    shadowOffset: { width: 0, height: 12 },
    elevation: 4,
  },
  row: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    paddingHorizontal: 16,
    paddingVertical: 14,
  },
  divider: {
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: "#f1f5f9",
  },
  avatar: {
    width: 40,
    height: 40,
    borderRadius: 999,
    alignItems: "center",
    justifyContent: "center",
  },
  avatarText: { fontSize: 16, fontWeight: "900" },
  title: { fontSize: 15, fontWeight: "900", color: "#1a1c3d" },
  when: { fontSize: 12, color: "#94a3b8", fontWeight: "700", marginTop: 2 },
  amount: {
    fontSize: 15,
    fontWeight: "900",
    color: "#1a1c3d",
    fontVariant: ["tabular-nums"],
  },
  status: { fontSize: 12, fontWeight: "900", marginTop: 2 },
  emptyRow: {
    paddingHorizontal: 16,
    paddingVertical: 28,
    alignItems: "center",
  },
  emptyTitle: { fontSize: 15, fontWeight: "900", color: K.navy },
  emptySub: {
    marginTop: 6,
    fontSize: 12,
    color: K.navy55,
    fontWeight: "700",
    textAlign: "center",
  },
  backCta: {
    paddingVertical: 14,
    borderRadius: 18,
    borderWidth: 2,
    borderColor: purple,
    backgroundColor: K.white,
    alignItems: "center",
    justifyContent: "center",
  },
  backCtaText: { color: purple, fontSize: 15, fontWeight: "900" },
})
