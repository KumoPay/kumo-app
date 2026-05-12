import { useEffect, useMemo, useState, type ReactNode } from "react"
import {
  Image,
  Modal,
  Pressable,
  Share,
  StyleSheet,
  Text,
  View,
} from "react-native"
import Svg, { Circle, Path, Rect } from "react-native-svg"
import QRCode from "react-native-qrcode-svg"
import { buildIntentPayload } from "@kumo/shared"

import { ASSETS, walletLogoFor } from "./assets"
import { listQueue, type QueuedIntent } from "./queue-store"
import { K } from "./theme"
import type { NavCtx, ScreenRenderer } from "./types"

function IconQR() {
  const c = "#7c3aed"
  return (
    <Svg width={16} height={16} viewBox="0 0 24 24" fill="none">
      <Rect x={3} y={3} width={7} height={7} stroke={c} strokeWidth={1.85} />
      <Rect x={14} y={3} width={7} height={7} stroke={c} strokeWidth={1.85} />
      <Rect x={3} y={14} width={7} height={7} stroke={c} strokeWidth={1.85} />
      <Path
        d="M14 14h3v3M20 14v3M14 20h3M20 20h1"
        stroke={c}
        strokeWidth={1.85}
        strokeLinecap="round"
      />
    </Svg>
  )
}

function IconShare() {
  const c = "#7c3aed"
  return (
    <Svg width={16} height={16} viewBox="0 0 24 24" fill="none">
      <Path
        d="M12 3v13M7 8l5-5 5 5"
        stroke={c}
        strokeWidth={1.85}
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <Path
        d="M5 14v5a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2v-5"
        stroke={c}
        strokeWidth={1.85}
        strokeLinecap="round"
      />
    </Svg>
  )
}

function IconBadge({ bg, children }: { bg: string; children: ReactNode }) {
  return <View style={[styles.iconBadge, { backgroundColor: bg }]}>{children}</View>
}

function IconClock() {
  const c = "#0284c7"
  return (
    <Svg width={18} height={18} viewBox="0 0 24 24" fill="none">
      <Circle cx={12} cy={12} r={7.5} stroke={c} strokeWidth={1.75} />
      <Path d="M12 8v4.25l2.5 1.5" stroke={c} strokeWidth={1.75} strokeLinecap="round" />
    </Svg>
  )
}

function IconHash() {
  const c = "#7c3aed"
  return (
    <Svg width={18} height={18} viewBox="0 0 24 24" fill="none">
      <Path
        d="M10 4L8 20M16 4l-2 16M5 9h15M4 15h15"
        stroke={c}
        strokeWidth={1.85}
        strokeLinecap="round"
      />
    </Svg>
  )
}

function IconUser() {
  const c = "#0284c7"
  return (
    <Svg width={18} height={18} viewBox="0 0 24 24" fill="none">
      <Circle cx={12} cy={8} r={3.25} stroke={c} strokeWidth={1.75} />
      <Path
        d="M6 20c0-3.3 2.7-6 6-6s6 2.7 6 6"
        stroke={c}
        strokeWidth={1.75}
        strokeLinecap="round"
      />
    </Svg>
  )
}

function IconShield() {
  const c = "#16a34a"
  return (
    <Svg width={18} height={18} viewBox="0 0 24 24" fill="none">
      <Path
        d="M12 21s7-4.5 7-11V6l-7-3-7 3v4c0 6.5 7 11 7 11z"
        stroke={c}
        strokeWidth={1.75}
        strokeLinejoin="round"
      />
      <Path
        d="M9.5 12.5l2 2 3.5-3.5"
        stroke={c}
        strokeWidth={1.75}
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </Svg>
  )
}

function HouseIcon() {
  return (
    <Svg width={15} height={15} viewBox="0 0 24 24" fill="none">
      <Path
        d="M4 20V9l8-5 8 5v11"
        stroke="#7c3aed"
        strokeWidth={2}
        strokeLinejoin="round"
      />
      <Path d="M9 20V12h6v8" stroke="#7c3aed" strokeWidth={2} />
    </Svg>
  )
}

function SignalArcsLeft() {
  return (
    <Svg width={78} height={132} viewBox="0 0 58 96" fill="none">
      <Path
        d="M6 18C18 38 26 54 31 71"
        stroke="#7FD4FF"
        strokeWidth={3}
        strokeLinecap="round"
        opacity={0.85}
        strokeDasharray="4 62"
      />
      <Path
        d="M2 42C13 53 21 61 31 71"
        stroke="#9EE3FF"
        strokeWidth={2.5}
        strokeLinecap="round"
        opacity={0.75}
        strokeDasharray="3 50"
      />
    </Svg>
  )
}

function DetailLine({
  iconBadge,
  label,
  value,
  last,
}: {
  iconBadge: ReactNode
  label: string
  value: ReactNode
  last?: boolean
}) {
  return (
    <View style={[styles.detailLine, last && { borderBottomWidth: 0 }]}>
      <View style={styles.detailLeft}>
        {iconBadge}
        <Text style={styles.detailLabel}>{label}</Text>
      </View>
      <View style={styles.detailRight}>{value}</View>
    </View>
  )
}

export const Queued: ScreenRenderer = (ctx) => ({
  body: <QueuedBody ctx={ctx} />,
  cta: <QueuedCTA ctx={ctx} />,
})

function QueuedBody({ ctx }: { ctx: NavCtx }) {
  const intent = ctx.parsedIntent
  const hash = ctx.intentHash
  const sig = ctx.offlineSig
  const hashPreview = hash ? `${hash.slice(0, 7)}...${hash.slice(-4)}` : "—"
  const sigPreview = sig ? `${sig.slice(0, 6)}...${sig.slice(-3)}` : "—"
  const recipient = intent?.recipient?.trim() || "—"
  const [showQR, setShowQR] = useState(false)
  const [queueEntry, setQueueEntry] = useState<QueuedIntent | null>(null)

  useEffect(() => {
    void (async () => {
      const queue = await listQueue()
      const match = hash
        ? queue.find((q) => q.intentHash === hash)
        : queue[queue.length - 1]
      setQueueEntry(match ?? null)
    })()
  }, [hash])

  const payload = useMemo(
    () => (queueEntry ? buildIntentPayload(queueEntry, ctx.wallet) : null),
    [queueEntry, ctx.wallet],
  )

  const canShare = Boolean(payload)
  const walletLabel = ctx.wallet?.label ?? "wallet"
  const walletPubShort = ctx.wallet?.pubkey
    ? `${ctx.wallet.pubkey.slice(0, 4)}…${ctx.wallet.pubkey.slice(-4)}`
    : ""

  async function onShare() {
    if (!payload) return
    try {
      await Share.share({
        title: "Kumo offline payment intent",
        message: payload,
      })
    } catch {}
  }

  return (
      <View>
        <View style={styles.heroRow}>
          <View style={[styles.heroArc, { left: -8 }]}>
            <SignalArcsLeft />
          </View>
          <View
            style={[
              styles.heroArc,
              { right: -8, transform: [{ scaleX: -1 }] },
            ]}
          >
            <SignalArcsLeft />
          </View>
          <Image
            source={ASSETS.state02}
            style={styles.heroImg}
            resizeMode="contain"
          />
        </View>

        <Text style={styles.h1}>Resting until reconnect</Text>
        <Text style={styles.sub}>
          Your payment was signed and stored securely until you reconnect.
        </Text>

        <View style={styles.detailCard}>
          <DetailLine
            iconBadge={
              <IconBadge bg="#e0f2fe">
                <IconClock />
              </IconBadge>
            }
            label="Status"
            value={
              <View style={styles.pendingPill}>
                <Text style={styles.pendingPillText}>Pending</Text>
              </View>
            }
          />
          <DetailLine
            iconBadge={
              <IconBadge bg="#ede9fe">
                <IconHash />
              </IconBadge>
            }
            label="Hash"
            value={
              <Text style={styles.monoValue} numberOfLines={1}>
                {hashPreview}
              </Text>
            }
          />
          <DetailLine
            iconBadge={
              <IconBadge bg="#e0f2fe">
                <IconUser />
              </IconBadge>
            }
            label="Destination"
            value={<Text style={styles.boldValue}>{recipient}</Text>}
          />
          <DetailLine
            iconBadge={
              <IconBadge bg="#dcfce7">
                <IconShield />
              </IconBadge>
            }
            label="Signature"
            value={
              <Text style={styles.monoValue} numberOfLines={1}>
                {sigPreview}
              </Text>
            }
            last
          />
        </View>

        {canShare && (
          <View style={styles.shareRow}>
            <Pressable
              onPress={() => setShowQR(true)}
              style={({ pressed }) => [
                styles.shareBtn,
                pressed && { opacity: 0.88 },
              ]}
            >
              <IconQR />
              <Text style={styles.shareBtnText}>Show QR</Text>
            </Pressable>
            <Pressable
              onPress={() => void onShare()}
              style={({ pressed }) => [
                styles.shareBtn,
                pressed && { opacity: 0.88 },
              ]}
            >
              <IconShare />
              <Text style={styles.shareBtnText}>Share…</Text>
            </Pressable>
          </View>
        )}

        <Modal
          visible={showQR}
          animationType="fade"
          transparent
          onRequestClose={() => setShowQR(false)}
        >
          <Pressable
            style={styles.modalBackdrop}
            onPress={() => setShowQR(false)}
          >
            <Pressable
              style={styles.modalCard}
              onPress={(e) => e.stopPropagation()}
            >
              <Text style={styles.modalTitle}>Signed offline intent</Text>
              <View style={styles.modalSignedByRow}>
                <Image
                  source={walletLogoFor(ctx.wallet?.brand ?? "phantom")}
                  style={styles.modalWalletIcon}
                />
                <Text style={styles.modalSignedBy}>
                  Signed by <Text style={styles.modalSignedByBold}>{walletLabel}</Text>
                  {walletPubShort ? `  ·  ${walletPubShort}` : ""}
                </Text>
              </View>
              <Text style={styles.modalSub}>
                Anyone with a Kumo wallet can scan this and broadcast it.
                Durable nonce keeps it valid for hours — no Bluetooth, no
                proximity, no internet required to share.
              </Text>
              {payload ? (
                <View style={styles.qrWrap}>
                  <QRCode value={payload} size={240} ecl="M" />
                </View>
              ) : null}
              <View style={styles.modalActionRow}>
                <Pressable
                  onPress={() => void onShare()}
                  style={({ pressed }) => [
                    styles.modalShare,
                    pressed && { opacity: 0.88 },
                  ]}
                >
                  <Text style={styles.modalShareText}>Share via…</Text>
                </Pressable>
                <Pressable
                  onPress={() => setShowQR(false)}
                  style={({ pressed }) => [
                    styles.modalClose,
                    pressed && { opacity: 0.85 },
                  ]}
                >
                  <Text style={styles.modalCloseText}>Close</Text>
                </Pressable>
              </View>
            </Pressable>
          </Pressable>
        </Modal>

        {ctx.error ? (
          <View style={styles.errorBox}>
            <Text style={styles.errorTitle}>// error</Text>
            <Text style={styles.errorText}>{ctx.error}</Text>
          </View>
        ) : null}
      </View>
  )
}

function QueuedCTA({ ctx }: { ctx: NavCtx }) {
  return (
    <View style={{ gap: 10 }}>
      <View style={styles.savedRow}>
        <View style={styles.savedPill}>
          <HouseIcon />
          <Text style={styles.savedPillText}>Saved locally</Text>
        </View>
      </View>
      <Pressable
        onPress={() => void ctx.broadcast()}
        disabled={ctx.busy}
        style={({ pressed }) => [
          styles.primaryCta,
          ctx.busy && { opacity: 0.6 },
          pressed && !ctx.busy && { opacity: 0.92 },
        ]}
      >
        <Text style={styles.primaryCtaText}>
          {ctx.busy ? "Broadcasting…" : "Reconnect & broadcast"}
        </Text>
      </Pressable>
    </View>
  )
}

const styles = StyleSheet.create({
  heroRow: {
    height: 248,
    width: 248,
    alignSelf: "center",
    position: "relative",
    alignItems: "center",
    justifyContent: "center",
  },
  heroArc: {
    position: "absolute",
    top: "30%",
    opacity: 0.55,
  },
  heroImg: { width: 248, height: 248 },
  h1: {
    marginTop: 10,
    textAlign: "center",
    fontSize: 22,
    fontWeight: "900",
    color: "#0f172a",
    letterSpacing: -0.4,
  },
  sub: {
    marginTop: 8,
    paddingHorizontal: 8,
    textAlign: "center",
    fontSize: 14,
    color: "#64748b",
    fontWeight: "500",
    lineHeight: 19,
  },
  detailCard: {
    marginTop: 18,
    backgroundColor: K.white,
    borderRadius: 18,
    borderWidth: 1,
    borderColor: "#eef2f6",
    padding: 18,
  },
  detailLine: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 12,
    paddingVertical: 12,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: "#f1f5f9",
  },
  detailLeft: { flexDirection: "row", alignItems: "center", gap: 12, flexShrink: 1 },
  detailRight: { maxWidth: "52%", alignItems: "flex-end" },
  detailLabel: { fontSize: 13, fontWeight: "700", color: "#64748b" },
  iconBadge: {
    width: 38,
    height: 38,
    borderRadius: 999,
    alignItems: "center",
    justifyContent: "center",
  },
  pendingPill: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    backgroundColor: "#dbeafe",
    borderRadius: 999,
  },
  pendingPillText: { color: "#1d4ed8", fontWeight: "900", fontSize: 12 },
  monoValue: {
    fontSize: 13,
    fontWeight: "900",
    color: "#0f172a",
    fontVariant: ["tabular-nums"],
  },
  boldValue: { fontSize: 14, fontWeight: "900", color: "#0f172a" },
  primaryCta: {
    paddingVertical: 16,
    borderRadius: 18,
    backgroundColor: "#7c5cff",
    alignItems: "center",
    justifyContent: "center",
  },
  primaryCtaText: { color: K.white, fontSize: 16, fontWeight: "900" },
  savedRow: { alignItems: "center" },
  savedPill: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    paddingHorizontal: 14,
    paddingVertical: 8,
    backgroundColor: "#f3e8ff",
    borderRadius: 999,
  },
  savedPillText: { color: "#6d28d9", fontWeight: "900", fontSize: 12 },
  shareRow: {
    marginTop: 12,
    flexDirection: "row",
    gap: 10,
  },
  shareBtn: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    paddingVertical: 12,
    paddingHorizontal: 12,
    borderRadius: 14,
    backgroundColor: "#f5f3ff",
    borderWidth: 1.5,
    borderColor: "#c4b5fd",
  },
  shareBtnText: {
    color: "#6d28d9",
    fontWeight: "900",
    fontSize: 13,
    letterSpacing: 0.3,
  },
  modalBackdrop: {
    flex: 1,
    backgroundColor: "rgba(15,23,42,0.78)",
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 24,
  },
  modalCard: {
    width: "100%",
    maxWidth: 360,
    backgroundColor: K.white,
    borderRadius: 24,
    padding: 22,
    alignItems: "center",
    gap: 12,
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: "900",
    color: "#0f172a",
    letterSpacing: -0.3,
  },
  modalSignedByRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  modalWalletIcon: {
    width: 22,
    height: 22,
    borderRadius: 6,
  },
  modalSignedBy: {
    fontSize: 12,
    fontWeight: "600",
    color: "#64748b",
    textAlign: "center",
    letterSpacing: 0.2,
  },
  modalSignedByBold: {
    color: "#0f172a",
    fontWeight: "900",
  },
  modalSub: {
    fontSize: 13,
    fontWeight: "500",
    color: "#64748b",
    textAlign: "center",
    lineHeight: 18,
    paddingHorizontal: 4,
  },
  qrWrap: {
    marginTop: 4,
    padding: 16,
    backgroundColor: K.white,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: "#e2e8f0",
  },
  modalActionRow: {
    marginTop: 8,
    flexDirection: "row",
    gap: 10,
    alignSelf: "stretch",
    justifyContent: "center",
  },
  modalShare: {
    paddingHorizontal: 22,
    paddingVertical: 10,
    borderRadius: 999,
    backgroundColor: "#7c5cff",
  },
  modalShareText: {
    color: K.white,
    fontWeight: "900",
    fontSize: 13,
    letterSpacing: 0.4,
  },
  modalClose: {
    paddingHorizontal: 22,
    paddingVertical: 10,
    borderRadius: 999,
    backgroundColor: "#ede9fe",
  },
  modalCloseText: {
    color: "#6d28d9",
    fontWeight: "900",
    fontSize: 13,
    letterSpacing: 0.4,
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
