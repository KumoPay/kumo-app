import { Pressable, StyleSheet, Text, View } from "react-native"
import * as Clipboard from "expo-clipboard"
import QRCode from "react-native-qrcode-svg"
import { Eyebrow, SecondaryCTA } from "./atoms"
import { K, SHADOW } from "./theme"
import type { ScreenRenderer } from "./types"

export const Receive: ScreenRenderer = (ctx) => {
  const pubkey = ctx.wallet?.pubkey ?? ""
  const handle = ctx.wallet?.displayName ? `@${ctx.wallet.displayName}` : "@you"

  return {
    body: (
      <View>
        <Text style={styles.h1}>Receive</Text>
        <Text style={styles.sub}>
          Share your address or alias. Funds arrive on Solana devnet.
        </Text>

        <View style={[styles.qrCard, SHADOW.card]}>
          <View style={styles.qrBox}>
            {pubkey ? (
              <QRCode value={pubkey} size={180} backgroundColor={K.white} color={K.navy} />
            ) : (
              <View style={styles.qrPlaceholder}>
                <Text style={{ fontSize: 12, color: K.navy55 }}>Connect wallet first</Text>
              </View>
            )}
          </View>
          <Text style={styles.handle}>{handle}</Text>
          <Text style={styles.address} numberOfLines={1}>
            {pubkey ? `${pubkey.slice(0, 8)}…${pubkey.slice(-8)}` : "—"}
          </Text>
        </View>

        <View style={{ marginTop: 18 }}>
          <Eyebrow>Actions</Eyebrow>
          <View style={{ marginTop: 8, gap: 10 }}>
            <Pressable
              onPress={() => pubkey && void Clipboard.setStringAsync(pubkey)}
              style={({ pressed }) => [
                styles.actionBtn,
                SHADOW.pill,
                pressed && { opacity: 0.92 },
              ]}
            >
              <Text style={styles.actionText}>📋 Copy address</Text>
            </Pressable>
            <SecondaryCTA onPress={() => ctx.back()}>Back</SecondaryCTA>
          </View>
        </View>
      </View>
    ),
  }
}

const styles = StyleSheet.create({
  h1: { fontSize: 24, fontWeight: "900", letterSpacing: -0.5, color: K.navy },
  sub: { marginTop: 4, fontSize: 13, color: K.navy55 },
  qrCard: {
    marginTop: 16,
    backgroundColor: K.white,
    borderRadius: 22,
    padding: 24,
    alignItems: "center",
  },
  qrBox: { width: 200, height: 200, alignItems: "center", justifyContent: "center" },
  qrPlaceholder: {
    width: 180,
    height: 180,
    borderWidth: 2,
    borderColor: K.navy10,
    borderStyle: "dashed",
    borderRadius: 12,
    alignItems: "center",
    justifyContent: "center",
  },
  handle: {
    marginTop: 14,
    fontSize: 18,
    fontWeight: "900",
    color: K.navy,
    letterSpacing: -0.4,
  },
  address: { marginTop: 4, fontSize: 12, fontWeight: "700", color: K.navy55 },
  actionBtn: {
    backgroundColor: K.white,
    borderRadius: 999,
    paddingVertical: 14,
    alignItems: "center",
    justifyContent: "center",
  },
  actionText: { fontSize: 14, fontWeight: "800", color: K.navy },
})
