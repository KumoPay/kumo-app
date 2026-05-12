import { useEffect, useRef, useState } from "react"
import {
  ActivityIndicator,
  Alert,
  Image,
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
  setAudioModeAsync,
  useAudioRecorder,
} from "expo-audio"

// Recording config for voice input. `audioSource: "voice_recognition"` is
// what Google's STT and most Whisper-on-Android apps use — Samsung's HAL
// applies aggressive gain reduction to `voice_performance`, producing a
// recording too quiet for Whisper to anchor speech features (mean -50 dB).
// `voice_communication` works on real devices but applies AEC/NS that
// muddies short utterances.
// AAC at 44.1 kHz mono — Whisper.rn resamples internally.
function formatAge(ms: number | null): string {
  if (ms == null) return "—"
  const s = Math.floor(ms / 1000)
  if (s < 60) return `${s}s`
  const m = Math.floor(s / 60)
  if (m < 60) return `${m}m`
  const h = Math.floor(m / 60)
  if (h < 24) return `${h}h`
  const d = Math.floor(h / 24)
  return `${d}d`
}

const WHISPER_RECORDING = {
  ...RecordingPresets.HIGH_QUALITY,
  numberOfChannels: 1,
  android: {
    ...RecordingPresets.HIGH_QUALITY.android,
    audioSource: "voice_recognition" as const,
  },
}
import { PrimaryCTA } from "./atoms"
import { ASSETS } from "./assets"
import { K, SHADOW } from "./theme"
import { useContacts, type Contact } from "./contacts-store"
import { useNetwork } from "../hooks/use-network"
import {
  isWhisperDownloaded,
  isWhisperEnabled,
  transcribeAudio,
} from "../lib/whisper-local"
import { isLocalAIEnabled, isModelDownloaded } from "../lib/qvac-local"
import {
  clearNonce,
  getLocalNonceStatus,
  getWalletNonceMismatch,
  type LocalNonceStatus,
} from "../lib/durable-nonce"
import { listQueue } from "./queue-store"
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
  const recorder = useAudioRecorder(WHISPER_RECORDING)
  const network = useNetwork()
  const { contacts } = useContacts()
  const [picking, setPicking] = useState(false)
  const [recording, setRecording] = useState(false)
  const [transcribing, setTranscribing] = useState(false)
  const [whisperReady, setWhisperReady] = useState(false)
  // null = probe in flight; true/false = parser path decided. Drives the
  // banner that tells the user whether the on-device LLM or the regex
  // fallback will run.
  const [qvacReady, setQvacReady] = useState<boolean | null>(null)
  // Local nonce status for the offline-payment flow. Re-probed whenever the
  // queue might have changed (mount, focus on this screen) so the user can
  // see — before signing — whether the cached durable nonce is uncommitted.
  const [nonceStatus, setNonceStatus] = useState<LocalNonceStatus | null>(null)
  // Set when the cached nonce account belongs to a wallet other than the one
  // currently connected. Blocks the offline-sign path with a clear callout
  // and a reset escape hatch — otherwise the user would only see the failure
  // at broadcast time, far from the cause.
  const [nonceMismatch, setNonceMismatch] = useState<
    { cachedAuthority: string } | null
  >(null)
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
      setQvacReady((await isLocalAIEnabled()) && (await isModelDownloaded()))
      setNonceStatus(await getLocalNonceStatus({ queue: await listQueue() }))
      setNonceMismatch(await getWalletNonceMismatch(ctx.wallet?.pubkey ?? null))
    })()
  }, [ctx.wallet?.pubkey])

  async function onResetOfflinePay() {
    await clearNonce()
    setNonceMismatch(null)
    setNonceStatus(await getLocalNonceStatus({ queue: await listQueue() }))
  }

  // Grab exclusive audio focus once when the Intent screen mounts. Doing this
  // here (rather than on mic press) lets the session transition happen during
  // the screen animation, when no other audio is playing — avoiding the hard
  // "BANG" pop we got from flipping the session mid-press on Samsung. Restore
  // mixWithOthers on unmount so other apps resume.
  useEffect(() => {
    void setAudioModeAsync({
      interruptionMode: "doNotMix",
      allowsRecording: true,
      playsInSilentMode: true,
      shouldPlayInBackground: false,
      shouldRouteThroughEarpiece: false,
    }).catch(() => {})
    return () => {
      void setAudioModeAsync({
        interruptionMode: "mixWithOthers",
        allowsRecording: false,
        playsInSilentMode: true,
        shouldPlayInBackground: false,
        shouldRouteThroughEarpiece: false,
      }).catch(() => {})
    }
  }, [])

  // Private mode requires a network call to MagicBlock — force public when
  // the user is offline (no signal) or has explicitly chosen offline mode.
  useEffect(() => {
    if ((!network.online || ctx.airplane) && ctx.privacyDefault) {
      ctx.setPrivacyDefault(false)
    }
  }, [network.online, ctx.airplane, ctx.privacyDefault, ctx.setPrivacyDefault])

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
        // No setAudioModeAsync here — the `voice_recognition` audio source
        // (set in WHISPER_RECORDING) already attenuates the speaker at the
        // kernel level. An audio session flip on top of that produces a
        // single "BANG" transient on Samsung devices.
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
        const durationMs = Date.now() - startedAtRef.current
        if (durationMs < 400) return
        const uri = recorder.uri
        if (!uri) return
        setTranscribing(true)
        const text = await transcribeAudio(uri, durationMs)
        if (text) {
          ctx.setIntentText(text)
        } else {
          Alert.alert(
            "Didn't catch that",
            "I couldn't hear speech in that recording. Try speaking a bit closer to the mic.",
          )
        }
      } catch (e) {
        Alert.alert("Transcription failed", e instanceof Error ? e.message : String(e))
      } finally {
        setTranscribing(false)
      }
    }
  }

  const offline = ctx.airplane || !network.online
  const privacyAvailable = !offline
  const privateOn = ctx.privacyDefault && privacyAvailable

  return (
    <View style={styles.wrap}>
      {offline && (
        <View style={styles.proofBadge}>
          <View style={styles.proofDot} />
          <Text style={styles.proofText}>
            Offline · nothing leaves your device
          </Text>
        </View>
      )}
      {nonceMismatch ? (
        <View style={styles.mismatchCard}>
          <Text style={styles.mismatchTitle}>
            Offline-pay locked to a different wallet
          </Text>
          <Text style={styles.mismatchBody}>
            Nonce belongs to{" "}
            <Text style={styles.mismatchMono}>
              {nonceMismatch.cachedAuthority.slice(0, 4)}…
              {nonceMismatch.cachedAuthority.slice(-4)}
            </Text>
            . Reconnect that wallet to sign offline, or reset to set up fresh
            for this one.
          </Text>
          <Pressable
            onPress={() => void onResetOfflinePay()}
            style={({ pressed }) => [
              styles.mismatchBtn,
              pressed && { opacity: 0.85 },
            ]}
          >
            <Text style={styles.mismatchBtnText}>Reset offline-pay</Text>
          </Pressable>
        </View>
      ) : (
        offline &&
        nonceStatus && (
          <View
            style={[
              styles.nonceBadge,
              nonceStatus.ready ? styles.nonceBadgeReady : styles.nonceBadgeBlocked,
            ]}
          >
            <View
              style={[
                styles.nonceDot,
                nonceStatus.ready ? styles.nonceDotReady : styles.nonceDotBlocked,
              ]}
            />
            <Text
              style={[
                styles.nonceText,
                nonceStatus.ready ? styles.nonceTextReady : styles.nonceTextBlocked,
              ]}
            >
              {nonceStatus.ready
                ? `Ready to sign offline · refreshed ${formatAge(nonceStatus.ageMs)} ago`
                : nonceStatus.reason === "queue-conflict"
                  ? `${nonceStatus.queueDepth} payment${nonceStatus.queueDepth === 1 ? "" : "s"} ahead of you in the queue`
                  : nonceStatus.reason === "no-cache"
                    ? "Reconnect once to set up offline pay"
                    : "Offline pay isn't set up yet"}
            </Text>
          </View>
        )
      )}
      {qvacReady !== null && (
        <View
          style={[
            styles.parserBadge,
            qvacReady ? styles.parserBadgeAi : styles.parserBadgeFallback,
          ]}
        >
          <View
            style={[
              styles.parserDot,
              qvacReady ? styles.parserDotAi : styles.parserDotFallback,
            ]}
          />
          <Text
            style={[
              styles.parserText,
              qvacReady ? styles.parserTextAi : styles.parserTextFallback,
            ]}
          >
            {qvacReady
              ? "Reading your words on this device · Llama 3.2"
              : "Using the simple parser · turn on Kumo AI in Settings"}
          </Text>
        </View>
      )}
      <Text style={styles.title}>New payment</Text>
      <Text style={styles.titleSub}>Describe the payment in plain language.</Text>

      <View style={styles.mascotWrap}>
        <Image
          source={privateOn ? ASSETS.state09 : ASSETS.state05}
          style={styles.mascot}
          resizeMode="contain"
        />
      </View>

      <View style={[styles.inputCard, styles.inputCardShadow, styles.inputCardOverlap]}>
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

      {ctx.qvacStream && (
        <View style={[styles.qvacCard, styles.inputCardShadow]}>
          <View style={styles.qvacHeader}>
            <View style={styles.qvacDot} />
            <Text style={styles.qvacLabel}>
              QVAC · Llama 3.2 1B · On-device
            </Text>
          </View>
          <View style={styles.qvacStats}>
            <View>
              <Text style={styles.qvacStatValue}>
                {ctx.qvacStream.tokenCount}
              </Text>
              <Text style={styles.qvacStatLabel}>tokens</Text>
            </View>
            <View>
              <Text style={styles.qvacStatValue}>
                {ctx.qvacStream.tokensPerSec.toFixed(1)}
              </Text>
              <Text style={styles.qvacStatLabel}>tok/s</Text>
            </View>
            <View>
              <Text style={styles.qvacStatValue}>
                {(ctx.qvacStream.elapsedMs / 1000).toFixed(2)}s
              </Text>
              <Text style={styles.qvacStatLabel}>elapsed</Text>
            </View>
          </View>
          <Text style={styles.qvacStreamText} numberOfLines={4}>
            {ctx.qvacStream.text || "▌"}
          </Text>
        </View>
      )}

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

      {recording && <Text style={styles.listening}>Listening…</Text>}
      {transcribing && <Text style={styles.listening}>Transcribing on device…</Text>}

      <Pressable
        onPress={() => ctx.setPrivacyDefault(!ctx.privacyDefault)}
        disabled={!privacyAvailable}
        accessibilityRole="button"
        accessibilityState={{ selected: privateOn, disabled: !privacyAvailable }}
        style={({ pressed }) => [
          styles.privacyCard,
          styles.privacyCardShadow,
          privateOn ? styles.privacyCardOn : styles.privacyCardOff,
          pressed && privacyAvailable && { opacity: 0.92 },
          !privacyAvailable && { opacity: 0.75 },
        ]}
      >
        <View
          style={[
            styles.privacyIconBadge,
            privateOn ? styles.privacyIconBadgeOn : styles.privacyIconBadgeOff,
          ]}
        >
          <IconLockPrivacy shut={privateOn} />
        </View>
        <View style={{ flex: 1, minWidth: 0 }}>
          <View style={styles.privacyTitleRow}>
            <Text style={styles.privacyTitle}>
              {!privacyAvailable
                ? "Privacy unavailable offline"
                : privateOn
                  ? "Privacy on"
                  : "Privacy off"}
            </Text>
            {privateOn && <Text style={styles.privacyCheck}>✓</Text>}
          </View>
          <Text style={styles.privacySub}>
            {!privacyAvailable
              ? "Private payments need a network call. This will go out as a standard SPL transfer."
              : privateOn
                ? "Tap to use standard routing for this payment."
                : "Tap to shield metadata for this payment — incognito-style routing."}
          </Text>
        </View>
      </Pressable>

      {ctx.error && (
        <View style={styles.errorBox}>
          <Text style={styles.errorTitle}>// error</Text>
          <Text style={styles.errorText}>{ctx.error}</Text>
        </View>
      )}
    </View>
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

function IconLockPrivacy({ shut = true }: { shut?: boolean }) {
  const stroke = shut ? "#5b21b6" : "#7c5cff"
  return (
    <Svg width={22} height={22} viewBox="0 0 24 24" fill="none">
      <Rect
        x={5}
        y={11}
        width={14}
        height={10}
        rx={2}
        stroke={stroke}
        strokeWidth={2}
        fill={shut ? "rgba(91,33,182,0.15)" : "none"}
      />
      <Path
        d={shut ? "M8 11V7a4 4 0 0 1 8 0v4" : "M8 11V7a4 4 0 0 1 7.7-1.2"}
        stroke={stroke}
        strokeWidth={2}
        strokeLinecap="round"
      />
    </Svg>
  )
}

const styles = StyleSheet.create({
  wrap: { paddingBottom: 8 },
  proofBadge: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    alignSelf: "flex-start",
    paddingHorizontal: 12,
    paddingVertical: 8,
    marginBottom: 12,
    borderRadius: 999,
    backgroundColor: "#dcfce7",
    borderWidth: 1.5,
    borderColor: "#16a34a",
  },
  proofDot: {
    width: 8,
    height: 8,
    borderRadius: 999,
    backgroundColor: "#16a34a",
  },
  proofText: {
    fontSize: 12,
    fontWeight: "700",
    letterSpacing: 0.1,
    color: "#15803d",
  },
  parserBadge: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    alignSelf: "flex-start",
    paddingHorizontal: 12,
    paddingVertical: 8,
    marginBottom: 12,
    borderRadius: 999,
    borderWidth: 1.5,
  },
  parserBadgeAi: {
    backgroundColor: "#ecfeff",
    borderColor: "#0891b2",
  },
  parserBadgeFallback: {
    backgroundColor: "#fef3c7",
    borderColor: "#d97706",
  },
  parserDot: {
    width: 8,
    height: 8,
    borderRadius: 999,
  },
  parserDotAi: {
    backgroundColor: "#0891b2",
  },
  parserDotFallback: {
    backgroundColor: "#d97706",
  },
  parserText: {
    fontSize: 12,
    fontWeight: "700",
    letterSpacing: 0.1,
  },
  parserTextAi: {
    color: "#0e7490",
  },
  parserTextFallback: {
    color: "#92400e",
  },
  nonceBadge: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    alignSelf: "flex-start",
    paddingHorizontal: 12,
    paddingVertical: 8,
    marginBottom: 12,
    borderRadius: 999,
    borderWidth: 1.5,
  },
  nonceBadgeReady: {
    backgroundColor: "#dcfce7",
    borderColor: "#16a34a",
  },
  nonceBadgeBlocked: {
    backgroundColor: "#fee2e2",
    borderColor: "#dc2626",
  },
  nonceDot: {
    width: 8,
    height: 8,
    borderRadius: 999,
  },
  nonceDotReady: {
    backgroundColor: "#16a34a",
  },
  nonceDotBlocked: {
    backgroundColor: "#dc2626",
  },
  nonceText: {
    fontSize: 12,
    fontWeight: "700",
    letterSpacing: 0.1,
  },
  nonceTextReady: {
    color: "#15803d",
  },
  nonceTextBlocked: {
    color: "#991b1b",
  },
  mismatchCard: {
    marginBottom: 12,
    padding: 14,
    borderRadius: 16,
    backgroundColor: "#fef2f2",
    borderWidth: 1.5,
    borderColor: "#dc2626",
    gap: 8,
  },
  mismatchTitle: {
    fontSize: 14,
    fontWeight: "900",
    color: "#991b1b",
    letterSpacing: -0.2,
  },
  mismatchBody: {
    fontSize: 12,
    fontWeight: "500",
    color: "#7f1d1d",
    lineHeight: 17,
  },
  mismatchMono: {
    fontFamily: "monospace",
    fontWeight: "700",
  },
  mismatchBtn: {
    alignSelf: "flex-start",
    marginTop: 4,
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 999,
    backgroundColor: "#dc2626",
  },
  mismatchBtnText: {
    color: "#fff",
    fontSize: 12,
    fontWeight: "900",
    letterSpacing: 0.5,
  },
  qvacCard: {
    marginTop: 12,
    backgroundColor: "#0f172a",
    borderRadius: 20,
    padding: 16,
    borderWidth: 1,
    borderColor: "#1e293b",
  },
  qvacHeader: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    marginBottom: 12,
  },
  qvacDot: {
    width: 8,
    height: 8,
    borderRadius: 999,
    backgroundColor: "#22d3ee",
  },
  qvacLabel: {
    fontSize: 10,
    fontWeight: "900",
    letterSpacing: 1.2,
    color: "#67e8f9",
  },
  qvacStats: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginBottom: 12,
    paddingBottom: 12,
    borderBottomWidth: 1,
    borderBottomColor: "#1e293b",
  },
  qvacStatValue: {
    fontSize: 18,
    fontWeight: "800",
    color: "#f8fafc",
    fontVariant: ["tabular-nums"],
  },
  qvacStatLabel: {
    fontSize: 10,
    fontWeight: "700",
    letterSpacing: 0.8,
    color: "#94a3b8",
    marginTop: 2,
  },
  qvacStreamText: {
    fontSize: 12,
    fontFamily: "monospace",
    color: "#cbd5e1",
    lineHeight: 18,
  },
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
  mascotWrap: {
    marginTop: 20,
    alignItems: "center",
    zIndex: 2,
  },
  mascot: {
    width: 140,
    height: 130,
  },
  inputCard: {
    marginTop: 24,
    backgroundColor: K.white,
    borderRadius: 24,
    padding: 16,
    borderWidth: 1,
    borderColor: "rgba(0,0,0,0.04)",
  },
  inputCardOverlap: {
    marginTop: -52,
    paddingTop: 56,
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
  privacyCard: {
    marginTop: 20,
    flexDirection: "row",
    alignItems: "flex-start",
    gap: 12,
    borderRadius: 20,
    padding: 16,
    borderWidth: 2.5,
  },
  privacyCardOn: {
    backgroundColor: "#f5f3ff",
    borderColor: "#7c5cff",
  },
  privacyCardOff: {
    backgroundColor: K.white,
    borderColor: "#c4b5fd",
  },
  privacyCardShadow: {
    shadowColor: "#7c5cff",
    shadowOpacity: 0.25,
    shadowRadius: 16,
    shadowOffset: { width: 0, height: 10 },
    elevation: 3,
  },
  privacyIconBadge: {
    width: 40,
    height: 40,
    borderRadius: 999,
    alignItems: "center",
    justifyContent: "center",
  },
  privacyIconBadgeOn: {
    backgroundColor: "#ddd6fe",
  },
  privacyIconBadgeOff: {
    backgroundColor: "#ede9fe",
  },
  privacyTitleRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 8,
  },
  privacyTitle: {
    fontSize: 17,
    fontWeight: "900",
    letterSpacing: -0.4,
    color: "#131b34",
    flex: 1,
  },
  privacyCheck: {
    fontSize: 14,
    fontWeight: "900",
    color: "#7c5cff",
  },
  privacySub: {
    marginTop: 4,
    fontSize: 13,
    color: "#64748b",
    fontWeight: "600",
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
