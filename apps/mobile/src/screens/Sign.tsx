import { Image, StyleSheet, Text, View } from "react-native"
import { Chip, Eyebrow, PrimaryCTA, Row, RowPill } from "./atoms"
import { K, SHADOW } from "./theme"
import { ASSETS } from "./assets"
import type { ScreenRenderer } from "./types"

export const Sign: ScreenRenderer = (ctx) => {
  const intent = ctx.parsedIntent
  return {
    eyebrow: "03 — sign offline",
    body: (
      <View>
        <View style={styles.bubbleRow}>
          <Image source={ASSETS.state00} style={styles.miniMascot} resizeMode="contain" />
          <View style={[styles.bubble, SHADOW.pill]}>
            <Text style={styles.bubbleText}>I read it! Sign to lock it in?</Text>
          </View>
        </View>

        <Eyebrow>review</Eyebrow>
        <View style={[styles.reviewCard, SHADOW.pill]}>
          <Row k="To" v={intent?.recipient ?? "—"} />
          <Row k="Amount" v={intent ? `$${intent.amount_usdc} USDC` : "—"} big />
          <RowPill
            k="Privacy"
            pill={
              <View
                style={[styles.privacyPill, { backgroundColor: intent?.private ? K.lilac : K.mute }]}
              >
                <Text style={styles.privacyPillText}>
                  {intent?.private ? "🔒 Private mode" : "Public"}
                </Text>
              </View>
            }
          />
        </View>

        <View style={styles.chipsRow}>
          <Chip>💎 wallet signMessage</Chip>
          <Chip>📡 no rpc call</Chip>
          {intent?.private && <Chip lilac>🔒 confidential</Chip>}
        </View>

        <View style={styles.cta}>
          <Text style={styles.ctaTitle}>Sign with your wallet</Text>
          <Text style={styles.ctaText}>
            Your wallet will pop up to sign the intent hash. No RPC required.
          </Text>
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
      <PrimaryCTA busy={ctx.busy} disabled={!intent} onPress={() => void ctx.signOffline()}>
        {ctx.busy ? "Awaiting signature…" : "Sign with wallet"}
      </PrimaryCTA>
    ),
  }
}

const styles = StyleSheet.create({
  bubbleRow: { flexDirection: "row", alignItems: "flex-end", gap: 12, marginBottom: 16 },
  miniMascot: { width: 64, height: 64 },
  bubble: {
    backgroundColor: K.white,
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 16,
    marginBottom: 4,
  },
  bubbleText: { color: K.navy, fontWeight: "700", fontSize: 13 },
  reviewCard: {
    marginTop: 8,
    backgroundColor: K.white,
    borderRadius: 16,
    padding: 16,
    borderWidth: 1,
    borderColor: K.sky,
  },
  privacyPill: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 999,
  },
  privacyPillText: { color: K.navy, fontWeight: "800", fontSize: 11 },
  chipsRow: { flexDirection: "row", flexWrap: "wrap", gap: 6, marginTop: 12 },
  cta: {
    marginTop: 14,
    padding: 16,
    borderRadius: 16,
    borderWidth: 1.5,
    borderColor: K.sky,
    backgroundColor: "rgba(127,232,255,0.12)",
  },
  ctaTitle: { fontSize: 14, fontWeight: "800", color: K.navy },
  ctaText: { fontSize: 12, color: K.navy65, marginTop: 4, lineHeight: 17 },
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
