import { Pressable, StyleSheet, Switch, Text, View } from "react-native"
import { Eyebrow, SecondaryCTA } from "./atoms"
import { K, SHADOW } from "./theme"
import type { ScreenRenderer } from "./types"

export const Settings: ScreenRenderer = (ctx) => ({
  body: (
    <View>
      <Text style={styles.h1}>Settings</Text>
      <Text style={styles.sub}>Wallet, network, and demo controls.</Text>

      <View style={{ marginTop: 18 }}>
        <Eyebrow>Network</Eyebrow>
        <View style={[styles.card, SHADOW.pill]}>
          <Text style={styles.cardKey}>Cluster</Text>
          <Text style={styles.cardVal}>Solana Devnet</Text>
        </View>
      </View>

      <View style={{ marginTop: 14 }}>
        <Eyebrow>Demo</Eyebrow>
        <View style={[styles.card, SHADOW.pill, styles.row]}>
          <View style={{ flex: 1 }}>
            <Text style={styles.cardKey}>Airplane mode</Text>
            <Text style={styles.cardSub}>
              Simulate offline. Sign now, broadcast later.
            </Text>
          </View>
          <Switch
            value={ctx.airplane}
            onValueChange={ctx.setAirplane}
            trackColor={{ false: K.navy10, true: K.lilac }}
          />
        </View>
      </View>

      {ctx.wallet && (
        <View style={{ marginTop: 14 }}>
          <Eyebrow>Wallet</Eyebrow>
          <View style={[styles.card, SHADOW.pill]}>
            <Text style={styles.cardKey}>{ctx.wallet.label}</Text>
            <Text style={styles.cardSub}>
              {ctx.wallet.pubkey.slice(0, 6)}…{ctx.wallet.pubkey.slice(-6)}
            </Text>
            {ctx.wallet.displayName ? (
              <Text style={[styles.cardSub, { marginTop: 4 }]}>
                Alias: {ctx.wallet.displayName}
              </Text>
            ) : null}
          </View>
          <View style={{ marginTop: 14 }}>
            <SecondaryCTA onPress={ctx.disconnectWallet}>Disconnect wallet</SecondaryCTA>
          </View>
        </View>
      )}

      <View style={{ marginTop: 14 }}>
        <Eyebrow>Quick links</Eyebrow>
        <Pressable
          onPress={() => ctx.push("contacts")}
          style={({ pressed }) => [styles.card, SHADOW.pill, styles.row, pressed && { opacity: 0.92 }]}
        >
          <Text style={[styles.cardKey, { flex: 1 }]}>Contacts</Text>
          <Text style={styles.chevron}>›</Text>
        </Pressable>
        <Pressable
          onPress={() => ctx.push("history")}
          style={({ pressed }) => [styles.card, SHADOW.pill, styles.row, pressed && { opacity: 0.92 }]}
        >
          <Text style={[styles.cardKey, { flex: 1 }]}>History</Text>
          <Text style={styles.chevron}>›</Text>
        </Pressable>
        <Pressable
          onPress={() => ctx.push("receive")}
          style={({ pressed }) => [styles.card, SHADOW.pill, styles.row, pressed && { opacity: 0.92 }]}
        >
          <Text style={[styles.cardKey, { flex: 1 }]}>Receive</Text>
          <Text style={styles.chevron}>›</Text>
        </Pressable>
      </View>
    </View>
  ),
})

const styles = StyleSheet.create({
  h1: { fontSize: 24, fontWeight: "900", letterSpacing: -0.5, color: K.navy },
  sub: { marginTop: 4, fontSize: 13, color: K.navy55 },
  card: {
    marginTop: 8,
    backgroundColor: K.white,
    borderRadius: 18,
    padding: 14,
  },
  row: { flexDirection: "row", alignItems: "center", gap: 12 },
  cardKey: { fontSize: 13, fontWeight: "800", color: K.navy },
  cardVal: { fontSize: 14, fontWeight: "800", color: K.navy, marginTop: 4 },
  cardSub: { fontSize: 12, color: K.navy55, marginTop: 4 },
  chevron: { fontSize: 22, color: K.navy30, fontWeight: "700" },
})
