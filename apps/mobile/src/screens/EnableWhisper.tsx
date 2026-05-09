import { useEffect, useState } from "react"
import { ActivityIndicator, StyleSheet, Text, View } from "react-native"
import { Eyebrow, PrimaryCTA, SecondaryCTA } from "./atoms"
import { K, SHADOW } from "./theme"
import { Pressable } from "react-native"
import {
  VOICE_LANGUAGES,
  WHISPER,
  cancelWhisperDownload,
  downloadWhisper,
  getActiveLanguage,
  isWhisperDownloaded,
  setActiveLanguage,
  setWhisperEnabled,
  type DownloadProgress,
} from "../lib/whisper-local"
import type { ScreenRenderer } from "./types"

const formatMB = (bytes: number) => `${Math.round(bytes / 1_000_000)} MB`

export const EnableWhisper: ScreenRenderer = (ctx) => ({
  body: <EnableWhisperBody onSkip={ctx.back} onDone={ctx.back} />,
})

function EnableWhisperBody({ onSkip, onDone }: { onSkip: () => void; onDone: () => void }) {
  const [downloading, setDownloading] = useState(false)
  const [progress, setProgress] = useState<DownloadProgress | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [completed, setCompleted] = useState(false)
  const [activeLang, setActiveLang] = useState("en")

  useEffect(() => {
    void (async () => {
      if (await isWhisperDownloaded()) setCompleted(true)
      setActiveLang(await getActiveLanguage())
    })()
  }, [])

  async function onPickLanguage(id: string) {
    await setActiveLanguage(id)
    setActiveLang(id)
  }

  async function onDownload() {
    setError(null)
    setDownloading(true)
    const r = await downloadWhisper((p) => setProgress(p))
    setDownloading(false)
    if (r.ok) {
      await setWhisperEnabled(true)
      setCompleted(true)
    } else {
      setError(r.error)
    }
  }

  async function onCancel() {
    await cancelWhisperDownload()
    setDownloading(false)
    setProgress(null)
  }

  async function onContinue() {
    await setWhisperEnabled(true)
    onDone()
  }

  if (completed) {
    return (
      <View style={{ paddingTop: 16 }}>
        <View style={styles.hero}>
          <Text style={{ fontSize: 64 }}>🎙️</Text>
          <Text style={styles.h1}>Voice input ready</Text>
          <Text style={styles.sub}>
            Tap the mic on the Intent screen to speak instead of typing.
          </Text>
        </View>
        <View style={[styles.card, SHADOW.card]}>
          <Eyebrow>Model</Eyebrow>
          <Text style={styles.modelName}>{WHISPER.modelName}</Text>
          <Text style={styles.modelMeta}>{WHISPER.estimatedSizeLabel} · stored on device</Text>
        </View>

        <View style={{ marginTop: 18 }}>
          <Eyebrow>Voice</Eyebrow>
          <View style={[styles.langCard, SHADOW.card]}>
            {VOICE_LANGUAGES.map((l, i) => (
              <Pressable
                key={l.id}
                onPress={() => l.available && void onPickLanguage(l.id)}
                disabled={!l.available}
                style={({ pressed }) => [
                  styles.langRow,
                  i < VOICE_LANGUAGES.length - 1 && styles.langDivider,
                  !l.available && { opacity: 0.55 },
                  pressed && l.available && { backgroundColor: "#f9fbff" },
                ]}
              >
                <Text style={styles.langFlag}>{l.flag}</Text>
                <View style={{ flex: 1 }}>
                  <Text style={styles.langName}>{l.name}</Text>
                  {!l.available && (
                    <Text style={styles.langSoon}>Coming soon · we’re cooking up more languages 💛</Text>
                  )}
                </View>
                {l.available && activeLang === l.id ? (
                  <Text style={styles.langCheck}>✓</Text>
                ) : null}
              </Pressable>
            ))}
          </View>
        </View>

        <View style={{ marginTop: 18 }}>
          <PrimaryCTA onPress={onContinue}>Done</PrimaryCTA>
        </View>
      </View>
    )
  }

  const pct = progress ? Math.round(progress.pct * 100) : 0
  const wrote = progress ? formatMB(progress.bytesWritten) : "0 MB"
  const total = progress ? formatMB(progress.totalBytes) : WHISPER.estimatedSizeLabel

  return (
    <View style={{ paddingTop: 16 }}>
      <View style={styles.hero}>
        <Text style={{ fontSize: 64 }}>🎙️</Text>
        <Text style={styles.h1}>Talk to Kumo</Text>
        <Text style={styles.sub}>
          Download a small speech model so you can dictate payments instead of typing — runs entirely on the device.
        </Text>
      </View>

      <View style={[styles.card, SHADOW.card]}>
        <Eyebrow>Optional download</Eyebrow>
        <Text style={styles.modelName}>{WHISPER.modelName}</Text>
        <Text style={styles.modelMeta}>
          {WHISPER.estimatedSizeLabel} · one-time · stays on device
        </Text>

        {downloading && (
          <View style={{ marginTop: 16 }}>
            <View style={styles.progressBar}>
              <View style={[styles.progressFill, { width: `${pct}%` }]} />
            </View>
            <View style={styles.progressMeta}>
              <Text style={styles.progressText}>
                {pct}%  ·  {wrote} of {total}
              </Text>
              {downloading && <ActivityIndicator color={K.lilac} />}
            </View>
          </View>
        )}

        {error && (
          <View style={styles.errorBox}>
            <Text style={styles.errorTitle}>// error</Text>
            <Text style={styles.errorText}>{error}</Text>
          </View>
        )}
      </View>

      <View style={{ marginTop: 18, gap: 10 }}>
        {downloading ? (
          <SecondaryCTA onPress={onCancel}>Cancel download</SecondaryCTA>
        ) : (
          <PrimaryCTA onPress={onDownload}>
            Download {WHISPER.estimatedSizeLabel}
          </PrimaryCTA>
        )}
        {!downloading && <SecondaryCTA onPress={onSkip}>Skip</SecondaryCTA>}
      </View>

      <Text style={styles.fineprint}>
        Voice input is optional — you can always type your intents.
      </Text>
    </View>
  )
}

const styles = StyleSheet.create({
  hero: { alignItems: "center", marginBottom: 18 },
  h1: { marginTop: 8, fontSize: 24, fontWeight: "900", color: K.navy, textAlign: "center" },
  sub: {
    marginTop: 8,
    paddingHorizontal: 16,
    textAlign: "center",
    fontSize: 13,
    color: K.navy60,
    lineHeight: 19,
  },
  card: { backgroundColor: K.white, borderRadius: 18, padding: 16 },
  modelName: { marginTop: 4, fontSize: 16, fontWeight: "900", color: K.navy },
  modelMeta: { marginTop: 4, fontSize: 12, color: K.navy55, fontWeight: "700" },
  progressBar: { height: 8, borderRadius: 999, backgroundColor: K.navy10, overflow: "hidden" },
  progressFill: { height: "100%", backgroundColor: K.lilac },
  progressMeta: { marginTop: 8, flexDirection: "row", alignItems: "center", justifyContent: "space-between" },
  progressText: { fontSize: 12, fontWeight: "800", color: K.navy },
  errorBox: { marginTop: 14, padding: 12, borderRadius: 12, backgroundColor: K.white, borderWidth: 1, borderColor: K.lilac },
  errorTitle: {
    fontSize: 10,
    fontWeight: "900",
    letterSpacing: 1.6,
    textTransform: "uppercase",
    color: K.lilac,
    marginBottom: 4,
  },
  errorText: { color: K.navy80, fontSize: 12, lineHeight: 17 },
  fineprint: {
    marginTop: 14,
    paddingHorizontal: 12,
    textAlign: "center",
    fontSize: 11,
    color: K.navy55,
    fontWeight: "700",
    lineHeight: 16,
  },
  langCard: {
    marginTop: 8,
    backgroundColor: K.white,
    borderRadius: 18,
    overflow: "hidden",
  },
  langRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    paddingHorizontal: 16,
    paddingVertical: 14,
  },
  langDivider: {
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: K.divider,
  },
  langFlag: { fontSize: 22 },
  langName: { fontSize: 15, fontWeight: "900", color: K.navy },
  langSoon: { fontSize: 11, fontWeight: "700", color: K.navy55, marginTop: 2 },
  langCheck: { fontSize: 18, fontWeight: "900", color: K.cyan },
})
