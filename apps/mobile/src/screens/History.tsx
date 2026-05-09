import { Linking, Pressable, StyleSheet, Text, View } from "react-native"
import { Eyebrow } from "./atoms"
import { K, SHADOW } from "./theme"
import { relativeTime, useHistory } from "./history-store"
import type { ScreenRenderer } from "./types"

const formatUsdc = (n: number) =>
  n.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })

export const History: ScreenRenderer = () => ({
  body: <HistoryBody />,
})

function HistoryBody() {
  const { entries } = useHistory()

  return (
    <View>
      <Text style={styles.h1}>History</Text>
      <Text style={styles.sub}>
        {entries.length === 0
          ? "No payments yet. Make your first one to see it here."
          : "Your payments, recorded locally on device."}
      </Text>

      {entries.length > 0 && (
        <View style={{ marginTop: 18 }}>
          <Eyebrow>Transactions ({entries.length})</Eyebrow>
          <View style={[styles.card, SHADOW.card]}>
            {entries.map((h, i) => {
              const out = h.direction === "out"
              const initial = (h.counterparty.charAt(0) || "?").toUpperCase()
              const onTap = () =>
                void Linking.openURL(`https://solscan.io/tx/${h.signature}?cluster=devnet`)
              const amount = `${out ? "−" : "+"}${formatUsdc(h.amount)} USDC`
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
                  <View style={[styles.avatar, { backgroundColor: out ? "#e8e0ff" : "#d4f5e6" }]}>
                    <Text style={styles.avatarText}>{initial}</Text>
                  </View>
                  <View style={{ flex: 1, minWidth: 0 }}>
                    <Text style={styles.title} numberOfLines={1}>
                      {out ? `To ${h.counterparty}` : `From ${h.counterparty}`}
                    </Text>
                    <Text style={styles.when}>{relativeTime(h.createdAt)}</Text>
                  </View>
                  <View style={{ alignItems: "flex-end" }}>
                    <Text style={styles.amount}>{amount}</Text>
                    <Text style={[styles.status, { color: out ? "#7c5cff" : "#1b9e5a" }]}>
                      {h.status}
                    </Text>
                  </View>
                </Pressable>
              )
            })}
          </View>
        </View>
      )}
    </View>
  )
}

const styles = StyleSheet.create({
  h1: { fontSize: 24, fontWeight: "900", letterSpacing: -0.5, color: K.navy },
  sub: { marginTop: 4, fontSize: 13, color: K.navy55 },
  card: { marginTop: 8, backgroundColor: K.white, borderRadius: 22, overflow: "hidden" },
  row: { flexDirection: "row", alignItems: "center", gap: 12, paddingHorizontal: 14, paddingVertical: 14 },
  divider: { borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: K.divider },
  avatar: { width: 42, height: 42, borderRadius: 999, alignItems: "center", justifyContent: "center" },
  avatarText: { fontSize: 15, fontWeight: "900", color: K.navy },
  title: { fontSize: 15, fontWeight: "900", color: K.navy },
  when: { fontSize: 12, color: K.navy55, fontWeight: "700", marginTop: 2 },
  amount: { fontSize: 15, fontWeight: "900", color: K.navy },
  status: { fontSize: 11, fontWeight: "800", marginTop: 2 },
})
