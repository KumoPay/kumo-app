import { useEffect, useRef, useState } from "react"
import {
  ActivityIndicator,
  Alert,
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native"
import Svg, { Path, Rect } from "react-native-svg"
import {
  AudioModule,
  RecordingPresets,
  useAudioRecorder,
} from "expo-audio"
import { PrimaryCTA } from "./atoms"
import { K, SHADOW } from "./theme"
import { useContacts, type Contact } from "./contacts-store"
import { useNetwork } from "../hooks/use-network"
import {
  isWhisperDownloaded,
  isWhisperEnabled,
  transcribeAudio,
} from "../lib/whisper-local"
import type { NavCtx, ScreenRenderer } from "./types"

export const Intent: ScreenRenderer = (ctx) => ({
  body: <IntentBody ctx={ctx} />,
  cta: (
    <PrimaryCTA
      busy={ctx.busy}
      disabled={!ctx.intentText.trim()}
      onPress={() => void ctx.parseIntent()}
    >
      {ctx.busy ? "Parsing…" : "Create intent"}
    </PrimaryCTA>
  ),
})

function IntentBody({ ctx }: { ctx: NavCtx }) {
  const recorder = useAudioRecorder(RecordingPresets.HIGH_QUALITY)
  const network = useNetwork()
  const { contacts } = useContacts()
  const [picking, setPicking] = useState(false)
  const [recording, setRecording] = useState(false)
  const [transcribing, setTranscribing] = useState(false)
  const [whisperReady, setWhisperReady] = useState(false)
  const startedAtRef = useRef<number>(0)

  function pickContact(c: Contact) {
    const token = c.handle.replace(/^@/, "") || c.name.toLowerCase().replace(/\s+/g, "")
    const existing = ctx.intentText.trim()
    const next = existing
      ? `${existing.replace(/\s+$/, "")} ${token} `
      : `pay ${token} `
    ctx.setIntentText(next)
    setPicking(false)
  }

  useEffect(() => {
    void (async () => {
      setWhisperReady((await isWhisperEnabled()) && (await isWhisperDownloaded()))
    })()
  }, [])

  // Private mode requires a network call to MagicBlock — force public when offline.
  useEffect(() => {
    if (!network.online && ctx.privacyDefault) {
      ctx.setPrivacyDefault(false)
    }
  }, [network.online, ctx.privacyDefault, ctx.setPrivacyDefault])

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

  const privateOn = ctx.privacyDefault && network.online

  return (
    <View style={styles.wrap}>
      <Text style={styles.title}>New payment</Text>
      <Text style={styles.titleSub}>Describe the payment in plain language.</Text>

      <View style={[styles.inputCard, styles.inputCardShadow]}>
        <TextInput
          value={ctx.intentText}
          onChangeText={ctx.setIntentText}
          multiline
          placeholder="Describe your payment"
          placeholderTextColor="#94a3b8"
          style={styles.input}
        />
        <View style={styles.cardFooter}>
          <Pressable
            onPress={() => setPicking((v) => !v)}
            style={({ pressed }) => [
              styles.contactBtn,
              picking && { backgroundColor: "rgba(199,181,255,0.55)" },
              pressed && { opacity: 0.85 },
            ]}
          >
            <IconUserSmall />
            <Text style={styles.contactBtnText}>
              {picking ? "Close picker" : "Choose contact"}
            </Text>
          </Pressable>
          <Pressable
            onPress={onMicPress}
            accessibilityLabel={recording ? "Stop recording" : "Start voice input"}
            style={({ pressed }) => [
              styles.micBtn,
              recording ? styles.micBtnActive : styles.micBtnIdle,
              pressed && { opacity: 0.85 },
            ]}
          >
            {transcribing ? (
              <ActivityIndicator color={K.slate900} />
            ) : recording ? (
              <StopGlyph />
            ) : (
              <MicGlyph />
            )}
          </Pressable>
        </View>
      </View>

      {picking && (
        <View style={[styles.pickerCard, styles.inputCardShadow]}>
          {contacts.length === 0 ? (
            <View>
              <Text style={styles.pickerEmpty}>
                No contacts yet. Add one to pay them by name.
              </Text>
              <Pressable
                onPress={() => {
                  setPicking(false)
                  ctx.push("contacts")
                }}
                style={({ pressed }) => [
                  styles.pickerManageBtn,
                  pressed && { opacity: 0.85 },
                ]}
              >
                <Text style={styles.pickerManageText}>+ Add a contact</Text>
              </Pressable>
            </View>
          ) : (
            <>
              {contacts.map((c) => (
                <Pressable
                  key={c.id}
                  onPress={() => pickContact(c)}
                  style={({ pressed }) => [
                    styles.pickerRow,
                    pressed && { backgroundColor: "rgba(124,92,255,0.08)" },
                  ]}
                >
                  <View style={[styles.pickerAvatar, { backgroundColor: c.bg }]}>
                    <Text style={styles.pickerAvatarText}>{c.initial}</Text>
                  </View>
                  <View style={{ flex: 1, minWidth: 0 }}>
                    <Text style={styles.pickerName} numberOfLines={1}>{c.name}</Text>
                    <Text style={styles.pickerHandle} numberOfLines={1}>
                      {c.handle} · {c.pubkey.slice(0, 4)}…{c.pubkey.slice(-4)}
                    </Text>
                  </View>
                </Pressable>
              ))}
              <Pressable
                onPress={() => {
                  setPicking(false)
                  ctx.push("contacts")
                }}
                style={({ pressed }) => [
                  styles.pickerManageBtn,
                  pressed && { opacity: 0.85 },
                ]}
              >
                <Text style={styles.pickerManageText}>Manage contacts</Text>
              </Pressable>
            </>
          )}
        </View>
      )}

      <View style={styles.chipsRow}>
        <ChipToggle
          icon={<IconWifiOff color={K.slate800} />}
          label="offline"
          active={ctx.airplane}
          onPress={() => ctx.setAirplane(!ctx.airplane)}
        />
        <ChipToggle
          icon={<IconLockSmall color={K.slate800} />}
          label={privateOn ? "private" : "public"}
          active={privateOn}
          disabled={!network.online}
          onPress={() => ctx.setPrivacyDefault(!ctx.privacyDefault)}
        />
        <ChipToggle
          icon={<IconMicSmall color={K.slate800} />}
          label={whisperReady ? "voice" : "voice ↗"}
          active={recording}
          onPress={onMicPress}
        />
      </View>

      {recording && <Text style={styles.listening}>Listening…</Text>}

      <View style={[styles.privacyCard, styles.privacyCardShadow]}>
        <View style={styles.privacyIconBadge}>
          <IconLockPrivacy />
        </View>
        <View style={{ flex: 1, minWidth: 0 }}>
          <Text style={styles.privacyTitle}>
            {privateOn ? "Private by default" : "Public transfer"}
          </Text>
          <Text style={styles.privacySub}>
            {!network.online
              ? "Offline — falls back to a standard SPL transfer when you reconnect."
              : privateOn
                ? "Kumo protects your metadata by default. No one can see what you pay or to whom."
                : "Standard SPL transfer. Amount and recipient are publicly visible on-chain."}
          </Text>
        </View>
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

function ChipToggle({
  icon,
  label,
  active,
  disabled,
  onPress,
}: {
  icon: React.ReactNode
  label: string
  active?: boolean
  disabled?: boolean
  onPress?: () => void
}) {
  return (
    <Pressable
      onPress={onPress}
      disabled={disabled}
      style={({ pressed }) => [
        styles.chip,
        active ? styles.chipActive : styles.chipIdle,
        disabled && { opacity: 0.5 },
        pressed && !disabled && { opacity: 0.85 },
      ]}
    >
      {icon}
      <Text style={styles.chipText}>{label}</Text>
    </Pressable>
  )
}

function IconUserSmall() {
  return (
    <Svg width={16} height={16} viewBox="0 0 24 24" fill="none">
      <Path
        d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2M12 11a4 4 0 1 0 0-8 4 4 0 0 0 0 8z"
        stroke={K.slate800}
        strokeWidth={1.8}
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </Svg>
  )
}

function MicGlyph() {
  return (
    <Svg width={20} height={20} viewBox="0 0 24 24" fill="none">
      <Rect x={9} y={3} width={6} height={11} rx={3} stroke={K.slate900} strokeWidth={2} />
      <Path
        d="M5 11a7 7 0 0 0 14 0M12 18v3M9 21h6"
        stroke={K.slate900}
        strokeWidth={2}
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </Svg>
  )
}

function StopGlyph() {
  return (
    <Svg width={16} height={16} viewBox="0 0 24 24">
      <Rect x={6} y={6} width={12} height={12} rx={2} fill={K.slate900} />
    </Svg>
  )
}

function IconWifiOff({ color }: { color: string }) {
  return (
    <Svg width={14} height={14} viewBox="0 0 24 24" fill="none">
      <Path
        d="M1 1l22 22M16.72 11.06a10.94 10.94 0 0 1 1.74 2.12M21 8.5a15.88 15.88 0 0 1-2.35 2.35M5 14.17A10.94 10.94 0 0 1 8.5 12m3.64-1.29c.24-.1.49-.18.76-.23M12 20h.01M8.53 16.53A6 6 0 0 1 12 15"
        stroke={color}
        strokeWidth={1.75}
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </Svg>
  )
}

function IconLockSmall({ color }: { color: string }) {
  return (
    <Svg width={14} height={14} viewBox="0 0 24 24" fill="none">
      <Rect x={5} y={11} width={14} height={10} rx={2} stroke={color} strokeWidth={1.75} />
      <Path d="M8 11V7a4 4 0 0 1 8 0v4" stroke={color} strokeWidth={1.75} strokeLinecap="round" />
    </Svg>
  )
}

function IconMicSmall({ color }: { color: string }) {
  return (
    <Svg width={14} height={14} viewBox="0 0 24 24" fill="none">
      <Rect x={9} y={2} width={6} height={11} rx={3} stroke={color} strokeWidth={1.75} />
      <Path
        d="M19 10v1a7 7 0 0 1-14 0v-1M12 18v4M9 22h6"
        stroke={color}
        strokeWidth={1.75}
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </Svg>
  )
}

function IconLockPrivacy() {
  return (
    <Svg width={22} height={22} viewBox="0 0 24 24" fill="none">
      <Rect x={5} y={11} width={14} height={10} rx={2} stroke="#0369a1" strokeWidth={1.85} />
      <Path d="M8 11V7a4 4 0 0 1 8 0v4" stroke="#0369a1" strokeWidth={1.85} strokeLinecap="round" />
    </Svg>
  )
}

const styles = StyleSheet.create({
  wrap: { paddingBottom: 8 },
  title: {
    fontSize: 28,
    fontWeight: "900",
    letterSpacing: -0.8,
    color: K.slate900,
  },
  titleSub: {
    marginTop: 8,
    fontSize: 14,
    color: "#6b7280",
    fontWeight: "500",
    lineHeight: 19,
  },
  inputCard: {
    marginTop: 24,
    backgroundColor: K.white,
    borderRadius: 24,
    padding: 16,
    borderWidth: 1,
    borderColor: "rgba(0,0,0,0.04)",
  },
  inputCardShadow: {
    shadowColor: K.slate900,
    shadowOpacity: 0.12,
    shadowRadius: 18,
    shadowOffset: { width: 0, height: 10 },
    elevation: 3,
  },
  input: {
    minHeight: 112,
    fontSize: 16,
    color: "#111827",
    textAlignVertical: "top",
    fontWeight: "600",
    lineHeight: 24,
  },
  cardFooter: {
    marginTop: 12,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 12,
  },
  contactBtn: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 999,
    backgroundColor: "rgba(237,233,254,0.8)",
    borderWidth: 1,
    borderColor: "rgba(196,181,253,0.8)",
  },
  contactBtnText: {
    fontSize: 12,
    fontWeight: "800",
    color: K.slate800,
  },
  micBtn: {
    width: 44,
    height: 44,
    borderRadius: 999,
    alignItems: "center",
    justifyContent: "center",
  },
  micBtnIdle: {
    backgroundColor: "#dbefff",
    shadowColor: "#3b82f6",
    shadowOpacity: 0.18,
    shadowRadius: 14,
    shadowOffset: { width: 0, height: 4 },
    elevation: 2,
  },
  micBtnActive: {
    backgroundColor: K.lilac,
  },
  listening: {
    marginTop: 8,
    fontSize: 11,
    fontWeight: "800",
    letterSpacing: 1.4,
    color: K.purple,
    textTransform: "uppercase",
    textAlign: "center",
  },
  pickerCard: {
    marginTop: 12,
    backgroundColor: K.white,
    borderRadius: 18,
    padding: 8,
    borderWidth: 1,
    borderColor: "rgba(196,181,253,0.6)",
  },
  pickerRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    paddingHorizontal: 10,
    paddingVertical: 10,
    borderRadius: 12,
  },
  pickerAvatar: {
    width: 36,
    height: 36,
    borderRadius: 999,
    alignItems: "center",
    justifyContent: "center",
  },
  pickerAvatarText: { fontSize: 14, fontWeight: "900", color: K.slate900 },
  pickerName: { fontSize: 14, fontWeight: "900", color: K.slate800 },
  pickerHandle: { fontSize: 11, color: "#64748b", fontWeight: "700", marginTop: 2 },
  pickerEmpty: {
    paddingHorizontal: 8,
    paddingVertical: 12,
    fontSize: 12,
    color: K.navy55,
    fontWeight: "600",
    textAlign: "center",
  },
  pickerManageBtn: {
    marginTop: 4,
    paddingVertical: 10,
    alignItems: "center",
  },
  pickerManageText: {
    fontSize: 12,
    fontWeight: "900",
    color: K.purple,
    letterSpacing: 0.4,
    textTransform: "uppercase",
  },
  chipsRow: { flexDirection: "row", flexWrap: "wrap", gap: 8, marginTop: 16 },
  chip: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 999,
  },
  chipIdle: {
    backgroundColor: "rgba(237,233,254,0.95)",
  },
  chipActive: {
    backgroundColor: "rgba(199,181,255,0.55)",
    borderWidth: 1.5,
    borderColor: "#a78bfa",
  },
  chipText: {
    fontSize: 11,
    fontWeight: "800",
    color: K.slate800,
  },
  privacyCard: {
    marginTop: 32,
    flexDirection: "row",
    alignItems: "flex-start",
    gap: 12,
    backgroundColor: K.white,
    borderRadius: 20,
    padding: 16,
    borderWidth: 1,
    borderColor: K.divider,
  },
  privacyCardShadow: {
    shadowColor: K.slate900,
    shadowOpacity: 0.08,
    shadowRadius: 12,
    shadowOffset: { width: 0, height: 4 },
    elevation: 2,
  },
  privacyIconBadge: {
    width: 44,
    height: 44,
    borderRadius: 999,
    backgroundColor: "#dbefff",
    alignItems: "center",
    justifyContent: "center",
  },
  privacyTitle: {
    fontSize: 15,
    fontWeight: "900",
    letterSpacing: -0.3,
    color: K.slate800,
  },
  privacySub: {
    marginTop: 6,
    fontSize: 13,
    color: "#6b7280",
    fontWeight: "500",
    lineHeight: 18,
  },
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
