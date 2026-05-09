import { useCallback, useState } from "react"
import { Pressable, StyleSheet, Text, View } from "react-native"
import * as Clipboard from "expo-clipboard"
import QRCode from "react-native-qrcode-svg"
import Svg, { Path, Rect } from "react-native-svg"

import { displayWalletAlias } from "./alias-utils"
import { K } from "./theme"
import type { ScreenRenderer } from "./types"

const brandPurple = "#7B61FF"

function CopyIcon() {
  return (
    <Svg
      width={20}
      height={20}
      viewBox="0 0 24 24"
      fill="none"
      stroke={K.white}
      strokeWidth={2.2}
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <Rect x={9} y={9} width={13} height={13} rx={2} />
      <Path d="M5 15H4a2 2 0 01-2-2V4a2 2 0 012-2h9a2 2 0 012 2v1" />
    </Svg>
  )
}

function DetailRow({
  label,
  value,
  last,
}: {
  label: string
  value: string
  last?: boolean
}) {
  return (
    <View
      style={[
        styles.detailRow,
        !last && {
          borderBottomWidth: StyleSheet.hairlineWidth,
          borderBottomColor: "#f1f5f9",
        },
      ]}
    >
      <Text style={styles.detailLabel}>{label}</Text>
      <Text style={styles.detailValue}>{value}</Text>
    </View>
  )
}

export const Receive: ScreenRenderer = (ctx) => ({
  body: <ReceiveBody ctx={ctx} />,
})

function ReceiveBody({ ctx }: { ctx: Parameters<ScreenRenderer>[0] }) {
  const pubkey = ctx.wallet?.pubkey ?? ""
  const aliasBase = displayWalletAlias(ctx.wallet?.displayName) || "you"
  const handle = `${aliasBase}.kumo`
  const [copied, setCopied] = useState(false)

  const onCopy = useCallback(async () => {
    if (!pubkey) return
    await Clipboard.setStringAsync(pubkey)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }, [pubkey])

  return (
    <View>
      {copied ? (
        <View style={styles.toast}>
          <Text style={styles.toastText}>Copied</Text>
        </View>
      ) : null}

      <Text style={styles.h1}>Receive</Text>
      <Text style={styles.sub}>Show this code to get paid.</Text>

      <View style={styles.qrCard}>
        <View style={styles.qrBox}>
          {pubkey ? (
            <QRCode value={pubkey} size={180} backgroundColor="#FAFCFF" color="#1a1c3d" />
          ) : (
            <View style={styles.qrPlaceholder}>
              <Text style={{ fontSize: 12, color: K.navy55 }}>Connect wallet first</Text>
            </View>
          )}
        </View>
        <Text style={styles.handle}>{handle}</Text>
      </View>

      <View style={styles.detailCard}>
        <DetailRow label="Network" value="Solana devnet" />
        <DetailRow label="Token" value="USDC" />
        <DetailRow label="Wallet" value={ctx.wallet?.label ?? "—"} last />
      </View>

      <Pressable
        onPress={onCopy}
        disabled={!pubkey}
        style={({ pressed }) => [
          styles.copyCta,
          !pubkey && { opacity: 0.55 },
          pressed && pubkey && { opacity: 0.92 },
        ]}
      >
        <CopyIcon />
        <Text style={styles.copyCtaText}>Copy address</Text>
      </Pressable>
    </View>
  )
}

const styles = StyleSheet.create({
  toast: {
    position: "absolute",
    top: -4,
    alignSelf: "center",
    zIndex: 100,
    paddingHorizontal: 16,
    paddingVertical: 10,
    backgroundColor: "#0f172a",
    borderRadius: 999,
  },
  toastText: { color: K.white, fontSize: 13, fontWeight: "700" },
  h1: {
    textAlign: "center",
    fontSize: 26,
    fontWeight: "900",
    color: "#1a1c3d",
    letterSpacing: -0.5,
  },
  sub: {
    marginTop: 8,
    textAlign: "center",
    fontSize: 14,
    color: "#64748b",
    fontWeight: "500",
  },
  qrCard: {
    marginTop: 20,
    backgroundColor: K.white,
    borderRadius: 22,
    borderWidth: 1,
    borderColor: "#eef2f6",
    padding: 18,
  },
  qrBox: {
    backgroundColor: "#FAFCFF",
    borderRadius: 16,
    padding: 16,
    alignItems: "center",
    justifyContent: "center",
  },
  qrPlaceholder: {
    width: 180,
    height: 180,
    borderWidth: 2,
    borderColor: K.navy10,
    borderStyle: "dashed",
    borderRadius: 12,
    alignItems: "center",
    justifyContent: "center",
  },
  handle: {
    marginTop: 16,
    textAlign: "center",
    fontSize: 18,
    fontWeight: "900",
    color: "#1a1c3d",
    letterSpacing: -0.3,
  },
  detailCard: {
    marginTop: 14,
    backgroundColor: K.white,
    borderRadius: 18,
    borderWidth: 1,
    borderColor: "#eef2f6",
    padding: 18,
  },
  detailRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 12,
    paddingVertical: 12,
  },
  detailLabel: { fontSize: 13, fontWeight: "700", color: "#64748b" },
  detailValue: { fontSize: 14, fontWeight: "900", color: "#1a1c3d" },
  copyCta: {
    marginTop: 22,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    paddingVertical: 16,
    borderRadius: 18,
    backgroundColor: brandPurple,
  },
  copyCtaText: { color: K.white, fontSize: 16, fontWeight: "900" },
})
