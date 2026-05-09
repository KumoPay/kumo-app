import { Image, StyleSheet, Text, TextInput, View } from "react-native"
import { Chip, Eyebrow, PrimaryCTA } from "./atoms"
import { K, SHADOW } from "./theme"
import { ASSETS } from "./assets"
import type { NavCtx, ScreenRenderer } from "./types"

export const Intent: ScreenRenderer = (ctx) => ({
  eyebrow: "02 — intent",
  body: <IntentBody ctx={ctx} />,
  cta: (
    <PrimaryCTA
      busy={ctx.busy}
      disabled={!ctx.intentText.trim()}
      onPress={() => void ctx.parseIntent()}
    >
      {ctx.busy ? "Parsing…" : "Parse intent →"}
    </PrimaryCTA>
  ),
})

function IntentBody({ ctx }: { ctx: NavCtx }) {
  return (
    <View>
      <View style={styles.bubbleRow}>
        <Image source={ASSETS.state00} style={styles.miniMascot} resizeMode="contain" />
        <View style={[styles.bubble, SHADOW.pill]}>
          <Text style={styles.bubbleText}>What payment, friend?</Text>
        </View>
      </View>

      {ctx.wallet && (
        <View style={styles.walletPill}>
          <View style={styles.cyanDot} />
          <Text style={styles.walletPillText}>
            {ctx.wallet.label} · {ctx.wallet.pubkey.slice(0, 5)}…{ctx.wallet.pubkey.slice(-4)}
          </Text>
        </View>
      )}

      <Eyebrow>your intent</Eyebrow>

      <View style={[styles.inputCard, SHADOW.pill]}>
        <TextInput
          value={ctx.intentText}
          onChangeText={ctx.setIntentText}
          multiline
          placeholder="pay alice 1 usdc privately"
          placeholderTextColor={K.navy40}
          style={styles.input}
        />
      </View>

      <View style={styles.chipsRow}>
        <Chip>🤖 qvac on-device</Chip>
        <Chip>🔒 no leaks</Chip>
        <Chip lilac>🎙 voice</Chip>
        {ctx.airplane && <Chip lilac>✈ airplane mode</Chip>}
      </View>

      {ctx.error && (
        <View style={styles.errorBox}>
          <Text style={styles.errorTitle}>// error</Text>
          <Text style={styles.errorText}>{ctx.error}</Text>
        </View>
      )}
    </View>
  )
}

const styles = StyleSheet.create({
  bubbleRow: { flexDirection: "row", alignItems: "flex-end", gap: 12, marginBottom: 16 },
  miniMascot: { width: 72, height: 72 },
  bubble: {
    backgroundColor: K.white,
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 16,
    marginBottom: 4,
  },
  bubbleText: { color: K.navy, fontWeight: "700", fontSize: 13 },
  walletPill: {
    flexDirection: "row",
    alignItems: "center",
    alignSelf: "flex-start",
    gap: 8,
    paddingHorizontal: 12,
    paddingVertical: 6,
    backgroundColor: K.sky50,
    borderRadius: 999,
    marginBottom: 12,
  },
  cyanDot: { width: 6, height: 6, borderRadius: 3, backgroundColor: K.cyan },
  walletPillText: { color: K.navy, fontSize: 11, fontWeight: "800" },
  inputCard: {
    marginTop: 6,
    backgroundColor: K.white,
    borderRadius: 16,
    borderColor: "transparent",
    borderWidth: 1.5,
  },
  input: {
    minHeight: 100,
    padding: 16,
    fontSize: 16,
    color: K.navy,
    textAlignVertical: "top",
    fontWeight: "700",
  },
  chipsRow: { flexDirection: "row", flexWrap: "wrap", gap: 6, marginTop: 8 },
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
