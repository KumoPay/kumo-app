import { Image, StyleSheet, Text, View } from "react-native"
import { Eyebrow, PrimaryCTA, Row } from "./atoms"
import { K, SHADOW } from "./theme"
import { ASSETS } from "./assets"
import type { ScreenRenderer } from "./types"

export const Queued: ScreenRenderer = (ctx) => {
  const intent = ctx.parsedIntent
  const hash = ctx.intentHash
  const sig = ctx.offlineSig
  return {
    eyebrow: "04 — queued",
    body: (
      <View>
        <View style={styles.heroRow}>
          <Image source={ASSETS.state03} style={styles.heroImg} resizeMode="contain" />
        </View>
        <Text style={styles.h1}>Resting until you reconnect…</Text>
        <Text style={styles.sub}>
          Intent is signed and held. Tap reconnect when you’re back online.
        </Text>

        <View style={{ marginTop: 18 }}>
          <Eyebrow>held</Eyebrow>
          <View style={[styles.card, SHADOW.pill]}>
            <View style={styles.heldPill}>
              <Text style={styles.heldPillText}>🔒 Held</Text>
            </View>
            <Row k="Hash" v={hash ? `${hash.slice(0, 6)}…${hash.slice(-4)}` : "—"} />
            <Row k="Recipient" v={intent?.recipient ?? "—"} />
            <Row k="Offline sig" v={sig ? `${sig.slice(0, 6)}…${sig.slice(-4)}` : "—"} />
          </View>
          <Text style={styles.note}>You are offline. Nothing is leaving.</Text>
        </View>

        {ctx.error && (
          <View style={styles.errorBox}>
            <Text style={styles.errorTitle}>// error</Text>
            <Text style={styles.errorText}>{ctx.error}</Text>
          </View>
        )}
      </View>
    ),
    cta: (
      <PrimaryCTA busy={ctx.busy} onPress={() => void ctx.broadcast()}>
        {ctx.busy ? "Broadcasting…" : "Reconnect & broadcast →"}
      </PrimaryCTA>
    ),
  }
}

const styles = StyleSheet.create({
  heroRow: { alignItems: "center", marginTop: 4 },
  heroImg: { width: 170, height: 170 },
  h1: {
    marginTop: 8,
    textAlign: "center",
    fontSize: 20,
    fontWeight: "900",
    color: K.navy,
  },
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
    borderColor: "rgba(183,241,255,0.6)",
  },
  heldPill: {
    alignSelf: "flex-start",
    paddingHorizontal: 10,
    paddingVertical: 4,
    backgroundColor: K.lilac,
    borderRadius: 999,
    marginBottom: 12,
  },
  heldPillText: { color: K.navy, fontSize: 10, fontWeight: "900" },
  note: { textAlign: "center", marginTop: 8, fontSize: 11, color: K.navy55 },
  errorBox: {
    marginTop: 14,
    padding: 12,
    borderRadius: 12,
    backgroundColor: K.white,
    borderWidth: 1,
    borderColor: K.lilac,
  },
  errorTitle: {
    fontSize: 10,
    fontWeight: "900",
    letterSpacing: 1.6,
    textTransform: "uppercase",
    color: K.lilac,
    marginBottom: 4,
  },
  errorText: { color: K.navy80, fontSize: 12, lineHeight: 17 },
})
