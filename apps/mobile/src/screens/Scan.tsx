import { useState, useEffect, useMemo } from "react"
import {
  ActivityIndicator,
  Alert,
  Image,
  Pressable,
  StyleSheet,
  Text,
  View,
} from "react-native"
import {
  parseIntentPayload,
  INTENT_PAYLOAD_PREFIX,
  type IntentPayload,
} from "@kumo/shared"

// Lazy-imported so the bundle still loads on emulators/builds where the
// expo-camera native module isn't linked. Errors are surfaced inside
// ScanBody so the rest of the app keeps working.
type ExpoCameraModule = typeof import("expo-camera")
let _expoCamera: ExpoCameraModule | null = null
let _expoCameraError: Error | null = null
function loadExpoCamera(): ExpoCameraModule | null {
  if (_expoCamera) return _expoCamera
  if (_expoCameraError) return null
  try {
    _expoCamera = require("expo-camera") as ExpoCameraModule
    return _expoCamera
  } catch (e) {
    _expoCameraError = e instanceof Error ? e : new Error(String(e))
    return null
  }
}

import { walletLogoFor } from "./assets"
import { K } from "./theme"
import type { NavCtx, ScreenRenderer } from "./types"

export const Scan: ScreenRenderer = (ctx) => ({
  eyebrow: "RELAY",
  body: <ScanBody ctx={ctx} />,
})

function ScanBody({ ctx }: { ctx: NavCtx }) {
  const expoCamera = loadExpoCamera()
  // useCameraPermissions can't be conditionally called; if the native module
  // isn't available, render the explanatory fallback up front.
  if (!expoCamera) {
    return (
      <View style={styles.center}>
        <Text style={styles.title}>Camera unavailable on this build</Text>
        <Text style={styles.sub}>
          The expo-camera native module isn&apos;t linked in this APK. Use a
          build that includes it (the production / phone APK does). All other
          features keep working.
        </Text>
        <Pressable
          onPress={() => ctx.resetHome()}
          style={({ pressed }) => [styles.primaryBtn, pressed && { opacity: 0.9 }]}
        >
          <Text style={styles.primaryBtnText}>Back to home</Text>
        </Pressable>
      </View>
    )
  }
  return <ScanBodyWithCamera ctx={ctx} expoCamera={expoCamera} />
}

function ScanBodyWithCamera({
  ctx,
  expoCamera,
}: {
  ctx: NavCtx
  expoCamera: ExpoCameraModule
}) {
  const { CameraView, useCameraPermissions } = expoCamera
  const [perm, requestPerm] = useCameraPermissions()
  const [decoded, setDecoded] = useState<IntentPayload | null>(null)
  const [rawUri, setRawUri] = useState<string | null>(null)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [signature, setSignature] = useState<string | null>(null)

  useEffect(() => {
    if (perm && !perm.granted && perm.canAskAgain) void requestPerm()
  }, [perm, requestPerm])

  function onBarcode(uri: string) {
    if (decoded || busy) return
    if (!uri.startsWith(INTENT_PAYLOAD_PREFIX)) return
    try {
      const p = parseIntentPayload(uri)
      setDecoded(p)
      setRawUri(uri)
      setError(null)
    } catch (e) {
      setError(e instanceof Error ? e.message : "Couldn't read that QR.")
    }
  }

  async function onBroadcast() {
    if (!rawUri || busy) return
    setBusy(true)
    setError(null)
    try {
      const sig = await ctx.relayIntent(rawUri)
      setSignature(sig)
    } catch (e) {
      const msg = e instanceof Error ? e.message : String(e)
      setError(msg)
      Alert.alert("Broadcast failed", msg)
    } finally {
      setBusy(false)
    }
  }

  function reset() {
    setDecoded(null)
    setRawUri(null)
    setError(null)
    setSignature(null)
  }

  if (!perm) {
    return (
      <View style={styles.center}>
        <ActivityIndicator color={K.purple} />
      </View>
    )
  }

  if (!perm.granted) {
    return (
      <View style={styles.center}>
        <Text style={styles.title}>Camera access needed</Text>
        <Text style={styles.sub}>
          Kumo only uses the camera to scan offline payment intents shared by
          other Kumo users. Nothing is recorded or uploaded.
        </Text>
        <Pressable
          onPress={() => void requestPerm()}
          style={({ pressed }) => [styles.primaryBtn, pressed && { opacity: 0.9 }]}
        >
          <Text style={styles.primaryBtnText}>Allow camera</Text>
        </Pressable>
      </View>
    )
  }

  // Success — broadcast confirmed
  if (signature) {
    return (
      <View style={styles.center}>
        <View style={styles.successBadge}>
          <Text style={styles.successBadgeText}>✓ RELAYED</Text>
        </View>
        <Text style={styles.title}>Payment broadcast</Text>
        <Text style={styles.sub}>
          The intent has been sent to Solana. The original signer&apos;s
          wallet is the one on-chain — you just relayed it.
        </Text>
        <View style={styles.detailBox}>
          <Text style={styles.detailLabel}>Signature</Text>
          <Text style={styles.detailValue} numberOfLines={1}>
            {signature.slice(0, 12)}…{signature.slice(-6)}
          </Text>
        </View>
        <View style={styles.actionRow}>
          <Pressable
            onPress={reset}
            style={({ pressed }) => [styles.primaryBtn, pressed && { opacity: 0.9 }]}
          >
            <Text style={styles.primaryBtnText}>Scan another</Text>
          </Pressable>
          <Pressable
            onPress={() => ctx.resetHome()}
            style={({ pressed }) => [styles.secondaryBtn, pressed && { opacity: 0.9 }]}
          >
            <Text style={styles.secondaryBtnText}>Home</Text>
          </Pressable>
        </View>
      </View>
    )
  }

  // Preview — scanned, awaiting confirmation
  if (decoded) {
    return <PreviewCard decoded={decoded} busy={busy} onBroadcast={onBroadcast} onCancel={reset} error={error} />
  }

  // Default — live camera
  return (
    <View style={styles.wrap}>
      <View style={styles.cameraWrap}>
        <CameraView
          style={StyleSheet.absoluteFill}
          facing="back"
          onBarcodeScanned={({ data }) => onBarcode(data)}
          barcodeScannerSettings={{ barcodeTypes: ["qr"] }}
        />
        <View style={styles.viewfinder} pointerEvents="none">
          <View style={[styles.corner, styles.cornerTL]} />
          <View style={[styles.corner, styles.cornerTR]} />
          <View style={[styles.corner, styles.cornerBL]} />
          <View style={[styles.corner, styles.cornerBR]} />
        </View>
      </View>
      <Text style={styles.title}>Scan an offline intent</Text>
      <Text style={styles.sub}>
        Hold the camera over a Kumo QR code. We&apos;ll show you exactly what
        you&apos;re about to broadcast before sending anything.
      </Text>
      {error && (
        <View style={styles.errorBox}>
          <Text style={styles.errorTitle}>// error</Text>
          <Text style={styles.errorText}>{error}</Text>
        </View>
      )}
    </View>
  )
}

function PreviewCard({
  decoded,
  busy,
  onBroadcast,
  onCancel,
  error,
}: {
  decoded: IntentPayload
  busy: boolean
  onBroadcast: () => void
  onCancel: () => void
  error: string | null
}) {
  const walletLine = useMemo(() => {
    const label = decoded.wallet.label ?? "wallet"
    const pub = decoded.wallet.pubkey
    return `Signed by ${label} · ${pub.slice(0, 4)}…${pub.slice(-4)}`
  }, [decoded.wallet])

  return (
    <View style={styles.previewWrap}>
      <View style={styles.previewBadge}>
        <Text style={styles.previewBadgeText}>SCANNED ·  READY TO RELAY</Text>
      </View>
      <Text style={styles.title}>Confirm relay</Text>
      <View style={styles.previewWalletRow}>
        <Image
          source={walletLogoFor(decoded.wallet.brand ?? "phantom")}
          style={styles.previewWalletIcon}
        />
        <Text style={styles.previewWalletLine}>{walletLine}</Text>
      </View>

      <View style={styles.previewCard}>
        <PreviewRow label="Recipient" value={decoded.intent.recipient} />
        <PreviewRow
          label="Amount"
          value={`${decoded.intent.amount_usdc} USDC`}
          bold
        />
        <PreviewRow
          label="Privacy"
          value={decoded.intent.private ? "Private (MagicBlock)" : "Public (SPL)"}
        />
        {decoded.intent.memo ? (
          <PreviewRow label="Memo" value={decoded.intent.memo} />
        ) : null}
        <PreviewRow
          label="Channel"
          value={decoded.sendTo === "ephemeral" ? "Ephemeral" : "Base"}
          last
        />
      </View>

      {error && (
        <View style={styles.errorBox}>
          <Text style={styles.errorTitle}>// error</Text>
          <Text style={styles.errorText}>{error}</Text>
        </View>
      )}

      <View style={styles.actionRow}>
        <Pressable
          onPress={onBroadcast}
          disabled={busy || !decoded.signedTx}
          style={({ pressed }) => [
            styles.primaryBtn,
            (busy || !decoded.signedTx) && { opacity: 0.55 },
            pressed && !busy && { opacity: 0.9 },
          ]}
        >
          <Text style={styles.primaryBtnText}>
            {busy ? "Broadcasting…" : decoded.signedTx ? "Broadcast now" : "No signed tx in payload"}
          </Text>
        </Pressable>
        <Pressable
          onPress={onCancel}
          style={({ pressed }) => [styles.secondaryBtn, pressed && { opacity: 0.9 }]}
        >
          <Text style={styles.secondaryBtnText}>Cancel</Text>
        </Pressable>
      </View>
    </View>
  )
}

function PreviewRow({
  label,
  value,
  bold,
  last,
}: {
  label: string
  value: string
  bold?: boolean
  last?: boolean
}) {
  return (
    <View style={[styles.previewRow, last && { borderBottomWidth: 0 }]}>
      <Text style={styles.previewLabel}>{label}</Text>
      <Text style={[styles.previewValue, bold && { fontSize: 18 }]} numberOfLines={1}>
        {value}
      </Text>
    </View>
  )
}

const styles = StyleSheet.create({
  wrap: { paddingBottom: 8 },
  center: {
    paddingTop: 12,
    paddingBottom: 8,
    alignItems: "center",
    gap: 12,
  },
  title: {
    fontSize: 24,
    fontWeight: "900",
    letterSpacing: -0.6,
    color: K.slate900,
    marginTop: 16,
    textAlign: "center",
  },
  sub: {
    marginTop: 4,
    fontSize: 14,
    color: "#64748b",
    fontWeight: "500",
    lineHeight: 19,
    textAlign: "center",
    paddingHorizontal: 8,
  },
  cameraWrap: {
    width: "100%",
    aspectRatio: 1,
    borderRadius: 24,
    overflow: "hidden",
    backgroundColor: "#000",
    marginTop: 8,
    position: "relative",
  },
  viewfinder: {
    ...StyleSheet.absoluteFillObject,
    padding: 28,
  },
  corner: {
    position: "absolute",
    width: 36,
    height: 36,
    borderColor: "rgba(255,255,255,0.92)",
    borderWidth: 3,
  },
  cornerTL: { top: 28, left: 28, borderRightWidth: 0, borderBottomWidth: 0, borderTopLeftRadius: 12 },
  cornerTR: { top: 28, right: 28, borderLeftWidth: 0, borderBottomWidth: 0, borderTopRightRadius: 12 },
  cornerBL: { bottom: 28, left: 28, borderRightWidth: 0, borderTopWidth: 0, borderBottomLeftRadius: 12 },
  cornerBR: { bottom: 28, right: 28, borderLeftWidth: 0, borderTopWidth: 0, borderBottomRightRadius: 12 },
  primaryBtn: {
    flex: 1,
    paddingVertical: 14,
    borderRadius: 14,
    backgroundColor: "#7c5cff",
    alignItems: "center",
    justifyContent: "center",
  },
  primaryBtnText: {
    color: K.white,
    fontWeight: "900",
    fontSize: 14,
    letterSpacing: 0.3,
  },
  secondaryBtn: {
    flex: 1,
    paddingVertical: 14,
    borderRadius: 14,
    backgroundColor: "#ede9fe",
    alignItems: "center",
    justifyContent: "center",
  },
  secondaryBtnText: {
    color: "#6d28d9",
    fontWeight: "900",
    fontSize: 14,
    letterSpacing: 0.3,
  },
  actionRow: {
    marginTop: 18,
    flexDirection: "row",
    gap: 10,
    alignSelf: "stretch",
  },
  previewWrap: { paddingBottom: 8 },
  previewBadge: {
    alignSelf: "flex-start",
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 999,
    backgroundColor: "#dcfce7",
    borderWidth: 1.5,
    borderColor: "#16a34a",
  },
  previewBadgeText: {
    fontSize: 10,
    fontWeight: "900",
    letterSpacing: 1.2,
    color: "#15803d",
  },
  previewWalletRow: {
    marginTop: 8,
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  previewWalletIcon: {
    width: 22,
    height: 22,
    borderRadius: 6,
  },
  previewWalletLine: {
    fontSize: 12,
    fontWeight: "700",
    color: "#64748b",
    letterSpacing: 0.2,
  },
  previewCard: {
    marginTop: 18,
    backgroundColor: K.white,
    borderRadius: 18,
    borderWidth: 1,
    borderColor: "#eef2f6",
    padding: 18,
  },
  previewRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 12,
    paddingVertical: 12,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: "#f1f5f9",
  },
  previewLabel: { fontSize: 13, fontWeight: "700", color: "#64748b" },
  previewValue: {
    fontSize: 14,
    fontWeight: "900",
    color: "#0f172a",
    maxWidth: "60%",
    textAlign: "right",
  },
  detailBox: {
    marginTop: 18,
    padding: 14,
    borderRadius: 14,
    backgroundColor: "#f8fafc",
    alignSelf: "stretch",
    alignItems: "center",
    gap: 4,
  },
  detailLabel: {
    fontSize: 10,
    fontWeight: "900",
    letterSpacing: 1.4,
    color: "#64748b",
  },
  detailValue: {
    fontSize: 13,
    fontWeight: "900",
    color: "#0f172a",
    fontVariant: ["tabular-nums"],
  },
  successBadge: {
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 999,
    backgroundColor: "#16a34a",
  },
  successBadgeText: {
    color: K.white,
    fontSize: 11,
    fontWeight: "900",
    letterSpacing: 1.4,
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
