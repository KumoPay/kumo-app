import type { ReactNode } from "react"
import { Image, Pressable, StyleSheet, Text, View } from "react-native"
import Svg, { Circle, Path, Rect } from "react-native-svg"

import { ASSETS } from "./assets"
import { K } from "./theme"
import type { ScreenRenderer } from "./types"

const accent = "#38bdf8"

function IconUser() {
  return (
    <Svg width={18} height={18} viewBox="0 0 24 24" fill="none">
      <Circle cx={12} cy={8} r={3.5} stroke={accent} strokeWidth={2} />
      <Path
        d="M6 20c0-3.3 2.7-6 6-6s6 2.7 6 6"
        stroke={accent}
        strokeWidth={2}
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
        stroke={accent}
        strokeWidth={2}
        strokeLinecap="round"
      />
    </Svg>
  )
}

function IconBubble() {
  return (
    <Svg width={18} height={18} viewBox="0 0 24 24" fill="none">
      <Path
        d="M6 9.5C6 6.75 8.57 4.5 11.73 4.5c1.96 0 3.67.78 4.8 2.02a4.23 4.23 0 011.24 3H18C19.66 9.52 21 11.02 21 12.85c0 2.18-2.03 3.95-4.64 3.95h-.73l-2.08 2.12a.6.6 0 01-1-.43v-1.69H11C8.2 15.8 6 13.48 6 10.5V9.5z"
        stroke={accent}
        strokeWidth={1.75}
        strokeLinejoin="round"
      />
    </Svg>
  )
}

function IconLock() {
  return (
    <Svg width={18} height={18} viewBox="0 0 24 24" fill="none">
      <Rect x={5} y={10} width={14} height={10} rx={2} stroke={accent} strokeWidth={2} />
      <Path
        d="M8 10V8a4 4 0 118 0v2"
        stroke={accent}
        strokeWidth={2}
        strokeLinecap="round"
      />
    </Svg>
  )
}

function SignalArcs() {
  return (
    <Svg width={56} height={92} viewBox="0 0 58 96" fill="none">
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
      <Path
        d="M1 61C13 61 26 71 31 78"
        stroke="#B7F1FF"
        strokeWidth={2}
        strokeLinecap="round"
        opacity={0.65}
        strokeDasharray="2 40"
      />
    </Svg>
  )
}

function ShieldIcon() {
  return (
    <Svg width={20} height={20} viewBox="0 0 24 24" fill="none">
      <Path
        d="M12 3L4 7v6c0 5 3.5 9.5 8 10 4.5-.5 8-5 8-10V7l-8-4z"
        fill="#5b21b6"
        opacity={0.9}
      />
      <Path
        d="M10.5 12.5l1.5 1.5 3-3"
        stroke="#faf5ff"
        strokeWidth={2}
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </Svg>
  )
}

function DetailRow({
  icon,
  label,
  value,
  big,
  last,
}: {
  icon: ReactNode
  label: string
  value: string
  big?: boolean
  last?: boolean
}) {
  return (
    <View style={[styles.detailRow, last && { borderBottomWidth: 0 }]}>
      <View style={styles.detailLeft}>
        {icon}
        <Text style={styles.detailLabel}>{label}</Text>
      </View>
      <Text
        numberOfLines={1}
        style={[styles.detailValue, big && styles.detailValueBig]}
      >
        {value}
      </Text>
    </View>
  )
}

export const Sign: ScreenRenderer = (ctx) => {
  const intent = ctx.parsedIntent
  const recipient = intent?.recipient?.trim() || "—"
  const amount = intent && intent.amount_usdc > 0 ? `${intent.amount_usdc} USDC` : "—"
  const memo = intent?.memo?.trim() || "—"
  const isPrivate = Boolean(intent?.private)

  return {
    body: (
      <View>
        <View style={styles.heroWrap}>
          <View style={styles.heroArcs}>
            <SignalArcs />
          </View>
          <Image
            source={ASSETS.state00}
            style={styles.heroImg}
            resizeMode="contain"
          />
        </View>

        <Text style={styles.h1}>Review intent</Text>
        <Text style={styles.sub}>
          Confirm the payment details before signing offline.
        </Text>

        <View style={styles.detailCard}>
          <DetailRow icon={<IconUser />} label="To" value={recipient} />
          <DetailRow icon={<IconDollar />} label="Amount" value={amount} big />
          <DetailRow icon={<IconBubble />} label="Memo" value={memo} />
          <View style={[styles.detailRow, { borderBottomWidth: 0 }]}>
            <View style={styles.detailLeft}>
              <IconLock />
              <Text style={styles.detailLabel}>Privacy</Text>
            </View>
            <View
              style={[
                styles.privacyPill,
                { backgroundColor: isPrivate ? "#C7B5FF" : "#e2e8f0" },
              ]}
            >
              <Text style={styles.privacyPillText}>
                {isPrivate ? "Private" : "Public"}
              </Text>
            </View>
          </View>
        </View>

        <View style={styles.infoCard}>
          <View style={styles.infoIcon}>
            <ShieldIcon />
          </View>
          <View style={{ flex: 1 }}>
            <Text style={styles.infoTitle}>Sign with your wallet</Text>
            <Text style={styles.infoText}>
              Your wallet signs locally. No network required.
            </Text>
          </View>
        </View>

        {ctx.error ? (
          <View style={styles.errorBox}>
            <Text style={styles.errorTitle}>// error</Text>
            <Text style={styles.errorText}>{ctx.error}</Text>
          </View>
        ) : null}
      </View>
    ),
    cta: (
      <View style={{ gap: 10 }}>
        <Pressable
          onPress={ctx.back}
          style={({ pressed }) => [styles.backCta, pressed && { opacity: 0.85 }]}
        >
          <Text style={styles.backCtaText}>Back</Text>
        </Pressable>
        <Pressable
          onPress={() => void ctx.signOffline()}
          disabled={ctx.busy || !intent}
          style={({ pressed }) => [
            styles.primaryCta,
            (ctx.busy || !intent) && { opacity: 0.6 },
            pressed && !(ctx.busy || !intent) && { opacity: 0.92 },
          ]}
        >
          <Text style={styles.primaryCtaText}>
            {ctx.busy ? "Awaiting signature…" : "Sign offline"}
          </Text>
        </Pressable>
      </View>
    ),
  }
}

const styles = StyleSheet.create({
  heroWrap: {
    width: 132,
    height: 132,
    alignSelf: "center",
    position: "relative",
    marginBottom: 8,
  },
  heroArcs: {
    position: "absolute",
    left: 2,
    top: "30%",
    opacity: 0.55,
  },
  heroImg: {
    width: 120,
    height: 120,
    alignSelf: "center",
    marginTop: 6,
  },
  h1: {
    textAlign: "center",
    fontSize: 26,
    fontWeight: "900",
    color: "#0f172a",
    letterSpacing: -0.8,
  },
  sub: {
    marginTop: 8,
    paddingHorizontal: 8,
    textAlign: "center",
    fontSize: 14,
    color: "#6b7280",
    fontWeight: "500",
    lineHeight: 19,
  },
  detailCard: {
    marginTop: 18,
    backgroundColor: K.white,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: K.divider,
    padding: 16,
  },
  detailRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 12,
    paddingVertical: 10,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: "rgba(11,16,32,0.08)",
    borderStyle: "dashed",
  },
  detailLeft: { flexDirection: "row", alignItems: "center", gap: 8, flexShrink: 1 },
  detailLabel: {
    fontSize: 11,
    fontWeight: "700",
    color: "rgba(11,16,32,0.55)",
    letterSpacing: 0.8,
    textTransform: "uppercase",
  },
  detailValue: {
    fontSize: 14,
    fontWeight: "900",
    color: K.navy,
    textAlign: "right",
    maxWidth: "58%",
  },
  detailValueBig: { fontSize: 18 },
  privacyPill: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 999,
  },
  privacyPillText: { color: "#0B1020", fontWeight: "900", fontSize: 11 },
  infoCard: {
    flexDirection: "row",
    gap: 12,
    marginTop: 16,
    padding: 14,
    borderRadius: 18,
    borderWidth: 1,
    borderColor: "#e9e3ff",
    backgroundColor: "rgba(199,181,255,0.14)",
  },
  infoIcon: {
    width: 40,
    height: 40,
    borderRadius: 999,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "rgba(167,139,250,0.35)",
  },
  infoTitle: {
    fontSize: 14,
    fontWeight: "900",
    color: "#0f172a",
    letterSpacing: -0.2,
  },
  infoText: {
    marginTop: 4,
    fontSize: 12,
    color: "#64748b",
    fontWeight: "500",
    lineHeight: 17,
  },
  primaryCta: {
    paddingVertical: 16,
    borderRadius: 18,
    backgroundColor: "#7c5cff",
    alignItems: "center",
    justifyContent: "center",
  },
  primaryCtaText: { color: K.white, fontSize: 16, fontWeight: "900" },
  backCta: {
    paddingVertical: 13,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: "#e5e7eb",
    backgroundColor: K.white,
    alignItems: "center",
    justifyContent: "center",
  },
  backCtaText: { color: "#0f172a", fontSize: 15, fontWeight: "900" },
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
