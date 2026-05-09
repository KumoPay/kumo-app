import type { ReactNode } from "react"
import { Image, Linking, Pressable, StyleSheet, Text, View } from "react-native"
import Svg, { Circle, Path } from "react-native-svg"

import { ASSETS } from "./assets"
import { K } from "./theme"
import type { ScreenRenderer } from "./types"

const blue = "#0284c7"
const brandPurple = "#7B61FF"

function IconBadge({ bg, children }: { bg: string; children: ReactNode }) {
  return <View style={[styles.iconBadge, { backgroundColor: bg }]}>{children}</View>
}

function IconUser() {
  return (
    <Svg width={18} height={18} viewBox="0 0 24 24" fill="none">
      <Circle cx={12} cy={8} r={3.25} stroke={blue} strokeWidth={1.75} />
      <Path
        d="M6 20c0-3.3 2.7-6 6-6s6 2.7 6 6"
        stroke={blue}
        strokeWidth={1.75}
        strokeLinecap="round"
      />
    </Svg>
  )
}

function IconDollar() {
  return (
    <Svg width={18} height={18} viewBox="0 0 24 24" fill="none">
      <Path
        d="M12 4v16M15 8.5c0-1.38-1.34-2.5-3-2.5S9 7.12 9 8.5s1.34 2.5 3 2.5 3 1.12 3 2.5-1.34 2.5-3 2.5-3-1.12-3-2.5"
        stroke={blue}
        strokeWidth={2}
        strokeLinecap="round"
      />
    </Svg>
  )
}

function IconPen() {
  return (
    <Svg width={18} height={18} viewBox="0 0 24 24" fill="none">
      <Path
        d="M12 20h9M16.5 3.5a2.12 2.12 0 013 3L8 18l-4 1 1-4L16.5 3.5z"
        stroke={blue}
        strokeWidth={1.75}
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </Svg>
  )
}

function CheckIcon() {
  return (
    <Svg
      width={18}
      height={18}
      viewBox="0 0 24 24"
      fill="none"
      stroke={K.white}
      strokeWidth={2.5}
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <Path d="M20 6L9 17l-5-5" />
    </Svg>
  )
}

function SignalArcsLeft() {
  return (
    <Svg width={64} height={100} viewBox="0 0 58 96" fill="none">
      <Path
        d="M6 18C18 38 26 54 31 71"
        stroke="#7FD4FF"
        strokeWidth={3}
        strokeLinecap="round"
        opacity={0.9}
        strokeDasharray="4 62"
      />
      <Path
        d="M2 42C13 53 21 61 31 71"
        stroke="#9EE3FF"
        strokeWidth={2.5}
        strokeLinecap="round"
        opacity={0.8}
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

export const Settled: ScreenRenderer = (ctx) => {
  const intent = ctx.parsedIntent
  const settle = ctx.settlement
  const sig = settle?.signature
  const sigPreview = sig ? `${sig.slice(0, 6)}...${sig.slice(-4)}` : "—"
  const recipient = intent?.recipient?.trim() || "—"
  const amount = intent && intent.amount_usdc > 0 ? `${intent.amount_usdc} USDC` : "—"

  return {
    body: (
      <View>
        <View style={styles.heroRow}>
          {/* Left sparkles */}
          <View style={[styles.sparkleColumn, { left: 0 }]}>
            <Text style={[styles.sparkle, { color: "#a78bfa", fontSize: 22 }]}>✦</Text>
            <Text style={[styles.sparkle, { color: "#38bdf8", fontSize: 18 }]}>✧</Text>
            <Text style={[styles.sparkle, { color: "#c4b5fd", fontSize: 14 }]}>★</Text>
          </View>
          {/* Right sparkles */}
          <View style={[styles.sparkleColumn, { right: 0 }]}>
            <Text style={[styles.sparkle, { color: "#38bdf8", fontSize: 20 }]}>✦</Text>
            <Text style={[styles.sparkle, { color: "#e9d5ff", fontSize: 16 }]}>★</Text>
            <Text style={[styles.sparkle, { color: "#a78bfa", fontSize: 18 }]}>✧</Text>
          </View>
          {/* Signal arcs */}
          <View style={[styles.heroArc, { left: -4 }]}>
            <SignalArcsLeft />
          </View>
          <View style={[styles.heroArc, { right: -4, transform: [{ scaleX: -1 }] }]}>
            <SignalArcsLeft />
          </View>
          <Image
            source={ASSETS.state07}
            style={styles.heroImg}
            resizeMode="contain"
          />
        </View>

        <Text style={styles.h1}>Payment delivered</Text>
        <Text style={styles.sub}>The payment synced and settled privately.</Text>

        <View style={styles.detailCard}>
          <DetailLine
            iconBadge={
              <IconBadge bg="#e0f2fe">
                <IconUser />
              </IconBadge>
            }
            label="To:"
            value={<Text style={styles.boldValue}>{recipient}</Text>}
          />
          <DetailLine
            iconBadge={
              <IconBadge bg="#e0f2fe">
                <IconDollar />
              </IconBadge>
            }
            label="Amount:"
            value={<Text style={styles.boldValue}>{amount}</Text>}
          />
          <DetailLine
            iconBadge={
              <IconBadge bg="#e0f2fe">
                <IconPen />
              </IconBadge>
            }
            label="Signature:"
            value={
              sig ? (
                <Pressable
                  onPress={() =>
                    void Linking.openURL(`https://solscan.io/tx/${sig}?cluster=devnet`)
                  }
                >
                  <Text style={[styles.monoValue, styles.linkValue]} numberOfLines={1}>
                    {sigPreview}
                  </Text>
                </Pressable>
              ) : (
                <Text style={styles.monoValue}>—</Text>
              )
            }
            last
          />

          <View style={styles.deliveredBar}>
            <View style={styles.deliveredCheck}>
              <CheckIcon />
            </View>
            <Text style={styles.deliveredText}>Delivered</Text>
          </View>
        </View>
      </View>
    ),
    cta: (
      <View style={{ gap: 10 }}>
        <Pressable
          onPress={ctx.goToNewPayment}
          style={({ pressed }) => [styles.primaryCta, pressed && { opacity: 0.92 }]}
        >
          <Text style={styles.primaryCtaText}>Make another payment</Text>
        </Pressable>
        <Pressable
          onPress={ctx.resetHome}
          style={({ pressed }) => [styles.outlineCta, pressed && { opacity: 0.92 }]}
        >
          <Text style={styles.outlineCtaText}>Go home</Text>
        </Pressable>
      </View>
    ),
  }
}

const styles = StyleSheet.create({
  heroRow: {
    height: 240,
    width: "100%",
    maxWidth: 300,
    alignSelf: "center",
    position: "relative",
    alignItems: "center",
    justifyContent: "center",
  },
  heroArc: {
    position: "absolute",
    top: "30%",
    opacity: 0.5,
  },
  heroImg: { width: 240, height: 240 },
  sparkleColumn: {
    position: "absolute",
    top: "30%",
    flexDirection: "column",
    gap: 14,
    alignItems: "center",
    zIndex: 2,
  },
  sparkle: { lineHeight: 22 },
  h1: {
    marginTop: 14,
    textAlign: "center",
    fontSize: 26,
    fontWeight: "900",
    color: "#1a1c3d",
    letterSpacing: -0.5,
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
  monoValue: {
    fontSize: 13,
    fontWeight: "900",
    color: "#0f172a",
    fontVariant: ["tabular-nums"],
  },
  linkValue: {
    textDecorationLine: "underline",
    textDecorationColor: K.cyan,
  },
  boldValue: { fontSize: 14, fontWeight: "900", color: "#0f172a" },
  deliveredBar: {
    marginTop: 14,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 10,
    paddingVertical: 12,
    borderRadius: 999,
    backgroundColor: "#E6F6F0",
  },
  deliveredCheck: {
    width: 30,
    height: 30,
    borderRadius: 999,
    backgroundColor: "#2D9D78",
    alignItems: "center",
    justifyContent: "center",
  },
  deliveredText: { color: "#2D9D78", fontWeight: "900", fontSize: 14 },
  primaryCta: {
    paddingVertical: 16,
    borderRadius: 18,
    backgroundColor: brandPurple,
    alignItems: "center",
    justifyContent: "center",
  },
  primaryCtaText: { color: K.white, fontSize: 16, fontWeight: "900" },
  outlineCta: {
    paddingVertical: 14,
    borderRadius: 18,
    borderWidth: 2,
    borderColor: brandPurple,
    backgroundColor: K.white,
    alignItems: "center",
    justifyContent: "center",
  },
  outlineCtaText: { color: brandPurple, fontSize: 16, fontWeight: "900" },
})
