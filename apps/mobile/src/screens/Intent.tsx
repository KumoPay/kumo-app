import { useEffect, useRef, useState } from "react"
import {
  ActivityIndicator,
  Alert,
  Image,
  Pressable,
  StyleSheet,
  Switch,
  Text,
  TextInput,
  View,
} from "react-native"
import {
  AudioModule,
  RecordingPresets,
  useAudioRecorder,
} from "expo-audio"
import { Chip, Eyebrow, PrimaryCTA } from "./atoms"
import { K, SHADOW } from "./theme"
import { ASSETS } from "./assets"
import {
  isWhisperDownloaded,
  isWhisperEnabled,
  transcribeAudio,
} from "../lib/whisper-local"
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
  const recorder = useAudioRecorder(RecordingPresets.HIGH_QUALITY)
  const [recording, setRecording] = useState(false)
  const [transcribing, setTranscribing] = useState(false)
  const [whisperReady, setWhisperReady] = useState(false)
  const startedAtRef = useRef<number>(0)

  useEffect(() => {
    void (async () => {
      setWhisperReady((await isWhisperEnabled()) && (await isWhisperDownloaded()))
    })()
  }, [])

  async function onMicPress() {
    if (transcribing) return
    if (!whisperReady) {
      ctx.push("enableWhisper")
      return
    }
    if (!recording) {
      try {
        const perm = await AudioModule.requestRecordingPermissionsAsync()
        if (!perm.granted) {
          Alert.alert("Microphone permission required", "Enable mic access in system settings to use voice input.")
          return
        }
        await recorder.prepareToRecordAsync()
        recorder.record()
        startedAtRef.current = Date.now()
        setRecording(true)
      } catch (e) {
        Alert.alert("Couldn't start recording", e instanceof Error ? e.message : String(e))
      }
    } else {
      try {
        await recorder.stop()
        setRecording(false)
        const tooShort = Date.now() - startedAtRef.current < 400
        if (tooShort) return
        const uri = recorder.uri
        if (!uri) return
        setTranscribing(true)
        const text = await transcribeAudio(uri)
        if (text) ctx.setIntentText(text)
      } catch (e) {
        Alert.alert("Transcription failed", e instanceof Error ? e.message : String(e))
      } finally {
        setTranscribing(false)
      }
    }
  }

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

      <View style={styles.privacyRow}>
        <View style={{ flex: 1 }}>
          <Text style={styles.privacyTitle}>
            {ctx.privacyDefault ? "🔒 Private (MagicBlock)" : "🌐 Public"}
          </Text>
          <Text style={styles.privacySub}>
            {ctx.privacyDefault
              ? "Confidential transfer · amount sealed"
              : "Standard SPL transfer · publicly visible on-chain"}
          </Text>
        </View>
        <Switch
          value={ctx.privacyDefault}
          onValueChange={ctx.setPrivacyDefault}
          trackColor={{ false: K.navy10, true: K.lilac }}
        />
      </View>

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
        <Pressable
          onPress={onMicPress}
          accessibilityLabel={recording ? "Stop recording" : "Start voice input"}
          style={({ pressed }) => [
            styles.micBtn,
            recording ? { backgroundColor: K.lilac } : { backgroundColor: K.cyan },
            pressed && { opacity: 0.85 },
          ]}
        >
          {transcribing ? (
            <ActivityIndicator color={K.navy} />
          ) : (
            <Text style={styles.micIcon}>{recording ? "■" : "🎙"}</Text>
          )}
        </Pressable>
      </View>

      {recording && (
        <Text style={styles.listening}>● Listening — tap mic to stop</Text>
      )}

      <View style={styles.chipsRow}>
        <Chip>🤖 qvac on-device</Chip>
        <Chip>🔒 no leaks</Chip>
        <Chip lilac>🎙 {whisperReady ? "voice ready" : "voice ↗"}</Chip>
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
    position: "relative",
  },
  input: {
    minHeight: 100,
    padding: 16,
    paddingRight: 64,
    fontSize: 16,
    color: K.navy,
    textAlignVertical: "top",
    fontWeight: "700",
  },
  micBtn: {
    position: "absolute",
    right: 10,
    bottom: 10,
    width: 44,
    height: 44,
    borderRadius: 999,
    alignItems: "center",
    justifyContent: "center",
  },
  micIcon: { fontSize: 18, fontWeight: "900", color: K.navy },
  listening: {
    marginTop: 8,
    fontSize: 11,
    fontWeight: "800",
    letterSpacing: 1.4,
    color: K.lilac,
    textTransform: "uppercase",
  },
  privacyRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    backgroundColor: K.white,
    borderRadius: 14,
    paddingHorizontal: 14,
    paddingVertical: 12,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: K.divider,
  },
  privacyTitle: { fontSize: 14, fontWeight: "900", color: K.navy },
  privacySub: { fontSize: 11, color: K.navy55, fontWeight: "700", marginTop: 2 },
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
