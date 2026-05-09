import { useEffect, useState } from "react"
import { ActivityIndicator, StyleSheet, Text, View } from "react-native"
import { Eyebrow, PrimaryCTA, SecondaryCTA } from "./atoms"
import { K, SHADOW } from "./theme"
import {
  LOCAL_AI,
  cancelDownload,
  downloadModel,
  isModelDownloaded,
  setLocalAIEnabled,
  type DownloadProgress,
} from "../lib/qvac-local"
import type { ScreenRenderer } from "./types"

const formatMB = (bytes: number) => `${Math.round(bytes / 1_000_000)} MB`

export const EnableLocalAI: ScreenRenderer = (ctx) => ({
  body: <EnableLocalAIBody onSkip={ctx.resetHome} onDone={ctx.resetHome} />,
})

function EnableLocalAIBody({
  onSkip,
  onDone,
}: {
  onSkip: () => void
  onDone: () => void
}) {
  const [downloading, setDownloading] = useState(false)
  const [progress, setProgress] = useState<DownloadProgress | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [completed, setCompleted] = useState(false)

  useEffect(() => {
    void (async () => {
      if (await isModelDownloaded()) setCompleted(true)
    })()
  }, [])

  async function onDownload() {
    setError(null)
    setDownloading(true)
    const r = await downloadModel((p) => setProgress(p))
    setDownloading(false)
    if (r.ok) {
      await setLocalAIEnabled(true)
      setCompleted(true)
    } else {
      setError(r.error)
    }
  }

  async function onCancel() {
    await cancelDownload()
    setDownloading(false)
    setProgress(null)
  }

  async function onContinue() {
    await setLocalAIEnabled(true)
    onDone()
  }

  if (completed) {
    return (
      <View style={{ paddingTop: 16 }}>
        <View style={styles.hero}>
          <Text style={{ fontSize: 64 }}>🤖</Text>
          <Text style={styles.h1}>On-device AI ready</Text>
          <Text style={styles.sub}>
            Intent parsing now happens on your phone — no server round-trip needed.
          </Text>
        </View>
        <View style={[styles.card, SHADOW.card]}>
          <Eyebrow>Model</Eyebrow>
          <Text style={styles.modelName}>{LOCAL_AI.modelName}</Text>
          <Text style={styles.modelMeta}>
            {LOCAL_AI.estimatedSizeLabel} · stored on device
          </Text>
        </View>
        <View style={{ marginTop: 18 }}>
          <PrimaryCTA onPress={onContinue}>Continue to Kumo</PrimaryCTA>
        </View>
      </View>
    )
  }

  const pct = progress ? Math.round(progress.pct * 100) : 0
  const wrote = progress ? formatMB(progress.bytesWritten) : "0 MB"
  const total = progress
    ? formatMB(progress.totalBytes)
    : LOCAL_AI.estimatedSizeLabel

  return (
    <View style={{ paddingTop: 16 }}>
      <View style={styles.hero}>
        <Text style={{ fontSize: 64 }}>🤖</Text>
        <Text style={styles.h1}>Use Kumo offline</Text>
        <Text style={styles.sub}>
          Download a small AI model so Kumo can parse your payments on the device — no internet required for intent parsing.
        </Text>
      </View>

      <View style={[styles.card, SHADOW.card]}>
        <Eyebrow>Optional download</Eyebrow>
        <Text style={styles.modelName}>{LOCAL_AI.modelName}</Text>
        <Text style={styles.modelMeta}>
          {LOCAL_AI.estimatedSizeLabel} · one-time download · stays on your device
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
            Download {LOCAL_AI.estimatedSizeLabel}
          </PrimaryCTA>
        )}
        {!downloading && <SecondaryCTA onPress={onSkip}>Skip for now</SecondaryCTA>}
      </View>

      <Text style={styles.fineprint}>
        Skipping is fine — Kumo will use the cloud QVAC server until you enable on-device AI in Settings.
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
  card: {
    backgroundColor: K.white,
    borderRadius: 18,
    padding: 16,
  },
  modelName: { marginTop: 4, fontSize: 16, fontWeight: "900", color: K.navy },
  modelMeta: { marginTop: 4, fontSize: 12, color: K.navy55, fontWeight: "700" },
  progressBar: {
    height: 8,
    borderRadius: 999,
    backgroundColor: K.navy10,
    overflow: "hidden",
  },
  progressFill: {
    height: "100%",
    backgroundColor: K.cyan,
  },
  progressMeta: {
    marginTop: 8,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  progressText: { fontSize: 12, fontWeight: "800", color: K.navy },
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
  fineprint: {
    marginTop: 14,
    paddingHorizontal: 12,
    textAlign: "center",
    fontSize: 11,
    color: K.navy55,
    fontWeight: "700",
    lineHeight: 16,
  },
})
