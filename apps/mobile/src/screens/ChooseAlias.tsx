import { useMemo, useState } from "react"
import { StyleSheet, Text, TextInput, View } from "react-native"
import { KUMO_ALIAS_MIN_LEN, sanitizeKumoLocalPart } from "./alias-utils"
import { PrimaryCTA } from "./atoms"
import { K, SHADOW } from "./theme"
import type { NavCtx, ScreenRenderer } from "./types"

function AliasForm({ ctx }: { ctx: NavCtx }) {
  const [value, setValue] = useState("")
  const slug = useMemo(() => sanitizeKumoLocalPart(value), [value])
  const valid = slug.length >= KUMO_ALIAS_MIN_LEN
  const preview = slug || "your-alias"

  return (
    <View style={{ paddingBottom: 32 }}>
      <View style={{ marginTop: 24, alignItems: "center" }}>
        <Text style={styles.eyebrow}>Welcome</Text>
        <Text style={styles.h1}>Choose your alias</Text>
        <Text style={styles.sub}>
          This is how your contacts will see you. Lowercase letters, numbers, and underscores only.
        </Text>
      </View>

      <View style={[styles.card, SHADOW.card]}>
        <Text style={styles.label}>Your alias</Text>
        <View style={styles.inputBox}>
          <TextInput
            value={value}
            onChangeText={setValue}
            placeholder="lunadev"
            placeholderTextColor={K.navy30}
            autoCapitalize="none"
            autoCorrect={false}
            maxLength={32}
            style={styles.input}
          />
        </View>
        <Text style={styles.preview} numberOfLines={1}>
          <Text style={{ color: K.navy40 }}>Others will see you as: </Text>
          <Text style={styles.previewBig}>{preview}</Text>
        </Text>
      </View>

      <View style={{ marginTop: 36 }}>
        <PrimaryCTA disabled={!valid} onPress={() => valid && ctx.completeAliasOnboarding(slug)}>
          Continue
        </PrimaryCTA>
      </View>
    </View>
  )
}

export const ChooseAlias: ScreenRenderer = (ctx) => ({ body: <AliasForm ctx={ctx} /> })

const styles = StyleSheet.create({
  eyebrow: {
    fontSize: 11,
    fontWeight: "800",
    letterSpacing: 2.2,
    textTransform: "uppercase",
    color: K.navy40,
  },
  h1: {
    marginTop: 8,
    fontSize: 26,
    fontWeight: "900",
    letterSpacing: -0.8,
    color: K.navy,
    textAlign: "center",
  },
  sub: {
    marginTop: 8,
    maxWidth: 320,
    textAlign: "center",
    fontSize: 14,
    color: K.navy50,
    lineHeight: 20,
  },
  card: {
    marginTop: 28,
    backgroundColor: "rgba(255,255,255,0.95)",
    borderRadius: 22,
    paddingHorizontal: 16,
    paddingVertical: 16,
    borderWidth: 1,
    borderColor: K.navy06,
  },
  label: {
    fontSize: 11,
    fontWeight: "800",
    letterSpacing: 1,
    textTransform: "uppercase",
    color: K.navy40,
  },
  inputBox: {
    marginTop: 8,
    borderRadius: 16,
    borderWidth: 2,
    borderColor: K.navy10,
    backgroundColor: K.cream,
    paddingHorizontal: 16,
    paddingVertical: 12,
  },
  input: {
    fontSize: 17,
    fontWeight: "800",
    color: K.navy,
  },
  preview: { marginTop: 12, fontSize: 13, fontWeight: "700", color: K.navy60 },
  previewBig: { fontSize: 15, fontWeight: "900", color: K.navy },
})
