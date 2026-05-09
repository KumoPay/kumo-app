import { Image, Linking, Pressable, StyleSheet, Text, View } from "react-native"
import { Eyebrow, PrimaryCTA, Row, SecondaryCTA } from "./atoms"
import { K, SHADOW } from "./theme"
import { ASSETS } from "./assets"
import type { ScreenRenderer } from "./types"

export const Settled: ScreenRenderer = (ctx) => {
  const intent = ctx.parsedIntent
  const settle = ctx.settlement
  const sig = settle?.signature
  return {
    eyebrow: "05 — delivered",
    body: (
      <View>
        <View style={styles.heroRow}>
          <Image source={ASSETS.state05} style={styles.heroImg} resizeMode="contain" />
        </View>
        <Text style={styles.h1}>Delivered! ✨</Text>
        <Text style={styles.sub}>On-chain on devnet via MagicBlock.</Text>

        <View style={{ marginTop: 18 }}>
          <Eyebrow>arrived</Eyebrow>
          <View style={[styles.card, SHADOW.pill]}>
            <View style={styles.deliveredPill}>
              <Text style={styles.deliveredPillText}>✨ Delivered</Text>
            </View>
            <Row k="Recipient" v={intent?.recipient ?? "—"} />
            <Row k="Amount" v={intent ? `$${intent.amount_usdc} USDC` : "—"} />
            <Row k="Signature" v={sig ? `${sig.slice(0, 6)}…${sig.slice(-4)}` : "—"} />
            <Row
              k="Validator"
              v={settle?.validator ? `${settle.validator.slice(0, 8)}…` : "base RPC"}
            />
            {sig && (
              <Pressable
                onPress={() =>
                  void Linking.openURL(`https://solscan.io/tx/${sig}?cluster=devnet`)
                }
                style={styles.solscanLink}
              >
                <Text style={styles.solscanText}>View on Solscan ↗</Text>
              </Pressable>
            )}
          </View>
        </View>
      </View>
    ),
    cta: (
      <View style={{ gap: 8 }}>
        <PrimaryCTA onPress={ctx.resetHome}>Send another payment 💖</PrimaryCTA>
        <SecondaryCTA onPress={ctx.resetHome}>Done</SecondaryCTA>
      </View>
    ),
  }
}

const styles = StyleSheet.create({
  heroRow: { alignItems: "center", marginTop: 4 },
  heroImg: { width: 170, height: 170 },
  h1: { marginTop: 8, textAlign: "center", fontSize: 26, fontWeight: "900", color: K.navy },
  sub: {
    marginTop: 4,
    paddingHorizontal: 16,
    textAlign: "center",
    fontSize: 12,
    color: K.navy60,
    lineHeight: 17,
  },
  card: {
    marginTop: 8,
    backgroundColor: K.white,
    borderRadius: 16,
    padding: 16,
    borderWidth: 1,
    borderColor: K.cyan,
  },
  deliveredPill: {
    alignSelf: "flex-start",
    paddingHorizontal: 10,
    paddingVertical: 4,
    backgroundColor: K.cyan,
    borderRadius: 999,
    marginBottom: 12,
  },
  deliveredPillText: { color: K.navy, fontSize: 10, fontWeight: "900" },
  solscanLink: { marginTop: 10 },
  solscanText: {
    fontSize: 13,
    fontWeight: "900",
    color: K.navy,
    borderBottomWidth: 1.5,
    borderBottomColor: K.cyan,
    paddingBottom: 1,
    alignSelf: "flex-start",
  },
})
