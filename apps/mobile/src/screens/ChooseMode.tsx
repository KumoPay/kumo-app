import { useEffect } from "react"
import { Image, Pressable, StyleSheet, Text, View } from "react-native"
import Svg, { Path } from "react-native-svg"

import { useNetwork } from "../hooks/use-network"
import { K } from "./theme"
import { ASSETS } from "./assets"
import type { NavCtx, ScreenRenderer } from "./types"

type Mode = "online" | "offline"

export const ChooseMode: ScreenRenderer = (ctx) => ({
  body: <ChooseModeBody ctx={ctx} />,
  cta: <ChooseModeCta ctx={ctx} />,
})

function ChooseModeBody({ ctx }: { ctx: NavCtx }) {
  // Mode is auto-detected from the device's actual network state. The user
  // doesn't pick — payments behave online when there's signal, offline when
  // there isn't. Keeps `ctx.airplane` in sync so downstream screens see the
  // same truth.
  const network = useNetwork()
  const mode: Mode = network.online ? "online" : "offline"

  useEffect(() => {
    if (ctx.airplane !== !network.online) {
      ctx.setAirplane(!network.online)
    }
  }, [network.online, ctx.airplane, ctx])

  return (
    <View style={styles.wrap}>
      <Text style={styles.title}>Payment mode</Text>
      <Text style={styles.subtitle}>
        Detected from your connection — Kumo adapts automatically.
      </Text>

      <View style={styles.tablist} accessibilityRole="tablist">
        <ModeTab
          selected={mode === "online"}
          label="Online"
          icon={<IconWifi color={mode === "online" ? "#0ea5e9" : "#64748b"} />}
        />
        <ModeTab
          selected={mode === "offline"}
          label="Offline"
          icon={<IconWifiOff color={mode === "offline" ? "#9333ea" : "#64748b"} />}
        />
      </View>

      <View style={styles.panel}>
        {mode === "online" ? (
          <ModePanel
            mascot={ASSETS.state06}
            heading="You're online"
            body="Kumo will broadcast and settle right away while you're connected."
            statusDotColor="#10b981"
            statusLabel="Connected"
          />
        ) : (
          <ModePanel
            mascot={ASSETS.kumoOfflineMascot}
            heading="You're offline"
            body="Kumo will sign your payment now and broadcast it the moment you're back online."
            statusDotColor="#94a3b8"
            statusLabel="Not connected"
          />
        )}
      </View>
    </View>
  )
}

function ModePanel({
  mascot,
  heading,
  body,
  statusDotColor,
  statusLabel,
}: {
  mascot: ReturnType<typeof require>
  heading: string
  body: string
  statusDotColor: string
  statusLabel: string
}) {
  return (
    <View style={styles.modePanel}>
      <View style={styles.mascotWrap}>
        <View style={styles.mascotGlow} />
        <Image source={mascot} style={styles.mascot} resizeMode="contain" />
      </View>
      <Text style={styles.modeHeading}>{heading}</Text>
      <Text style={styles.modeBody}>{body}</Text>
      <View style={styles.statusPill}>
        <View style={[styles.statusDot, { backgroundColor: statusDotColor }]} />
        <Text style={styles.statusLabel}>{statusLabel}</Text>
      </View>
    </View>
  )
}

function ModeTab({
  selected,
  label,
  icon,
}: {
  selected: boolean
  label: string
  icon: React.ReactNode
}) {
  return (
    <View
      accessibilityRole="tab"
      accessibilityState={{ selected, disabled: true }}
      style={[styles.tab, selected && styles.tabSelected]}
    >
      {icon}
      <Text style={[styles.tabLabel, selected && styles.tabLabelSelected]}>{label}</Text>
    </View>
  )
}

function ChooseModeCta({ ctx }: { ctx: NavCtx }) {
  return (
    <Pressable
      onPress={() => ctx.push("intent")}
      accessibilityLabel="New payment"
      style={({ pressed }) => [styles.cta, pressed && { opacity: 0.92 }]}
    >
      <Text style={styles.ctaText}>New payment</Text>
      <IconArrowRight />
    </Pressable>
  )
}

function IconWifi({ color }: { color: string }) {
  return (
    <Svg width={18} height={18} viewBox="0 0 24 24" fill="none">
      <Path d="M5 12.55a11 11 0 0 1 14.08 0" stroke={color} strokeWidth={2} strokeLinecap="round" />
      <Path d="M8.53 16.11a6 6 0 0 1 6.95 0" stroke={color} strokeWidth={2} strokeLinecap="round" />
      <Path d="M12 20h.01" stroke={color} strokeWidth={3} strokeLinecap="round" />
    </Svg>
  )
}

function IconWifiOff({ color }: { color: string }) {
  return (
    <Svg width={18} height={18} viewBox="0 0 24 24" fill="none">
      <Path d="M14.83 14.83 21 21" stroke={color} strokeWidth={2} strokeLinecap="round" />
      <Path
        d="M2 9a15 15 0 0 1 4.88-3m3.9-1.17A12 12 0 0 1 21.87 12M5 12.55a11 11 0 0 1 5.18-2.59"
        stroke={color}
        strokeWidth={2}
        strokeLinecap="round"
      />
      <Path
        d="M10.62 18.1a6 6 0 0 1 4.48 0m-7.05-.51a10 10 0 0 1 2.5-1.57"
        stroke={color}
        strokeWidth={2}
        strokeLinecap="round"
      />
      <Path d="m2 2 20 20" stroke={color} strokeWidth={2} strokeLinecap="round" />
    </Svg>
  )
}

function IconArrowRight() {
  return (
    <Svg width={20} height={20} viewBox="0 0 24 24" fill="none">
      <Path
        d="M5 12h14M13 6l6 6-6 6"
        stroke={K.white}
        strokeWidth={2.2}
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </Svg>
  )
}

const styles = StyleSheet.create({
  wrap: { paddingBottom: 8 },
  title: {
    fontSize: 26,
    fontWeight: "900",
    color: "#141b2f",
    letterSpacing: -0.8,
  },
  subtitle: {
    marginTop: 8,
    fontSize: 14,
    color: "#6b7380",
    fontWeight: "500",
    lineHeight: 19,
  },
  tablist: {
    flexDirection: "row",
    gap: 4,
    marginTop: 24,
    padding: 4,
    borderRadius: 14,
    backgroundColor: "#eef0f4",
  },
  tab: {
    flexDirection: "row",
    flex: 1,
    minHeight: 44,
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    borderRadius: 11,
    backgroundColor: "transparent",
  },
  tabSelected: {
    backgroundColor: K.white,
    shadowColor: "#0f172a",
    shadowOpacity: 0.08,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 2 },
    elevation: 2,
  },
  tabLabel: {
    fontSize: 14,
    fontWeight: "800",
    color: "#64748b",
  },
  tabLabelSelected: {
    color: "#141b2f",
  },
  panel: {
    marginTop: 32,
  },
  modePanel: {
    alignItems: "center",
  },
  mascotWrap: {
    width: 200,
    height: 188,
    alignItems: "center",
    justifyContent: "center",
  },
  mascotGlow: {
    position: "absolute",
    width: 180,
    height: 140,
    borderRadius: 999,
    backgroundColor: "rgba(199,181,255,0.22)",
  },
  mascot: {
    width: 176,
    height: 176,
  },
  modeHeading: {
    marginTop: 8,
    fontSize: 18,
    fontWeight: "900",
    color: "#141b2f",
    letterSpacing: -0.4,
  },
  modeBody: {
    marginTop: 8,
    fontSize: 14,
    fontWeight: "500",
    color: "#6b7380",
    textAlign: "center",
    lineHeight: 20,
    paddingHorizontal: 16,
  },
  statusPill: {
    marginTop: 16,
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 999,
    backgroundColor: K.white,
    borderWidth: 1,
    borderColor: "#e5e7eb",
  },
  statusDot: {
    width: 7,
    height: 7,
    borderRadius: 999,
  },
  statusLabel: {
    fontSize: 12,
    fontWeight: "600",
    color: "#6b7380",
  },
  cta: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    paddingVertical: 17,
    borderRadius: 18,
    backgroundColor: "#7c5cff",
  },
  ctaText: {
    color: K.white,
    fontSize: 16,
    fontWeight: "800",
  },
})
