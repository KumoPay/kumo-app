import type { ReactNode } from "react"
import { ActivityIndicator, Pressable, StyleSheet, Text, View } from "react-native"
import Svg, { Path } from "react-native-svg"
import { K, SHADOW } from "./theme"

export function PrimaryCTA({
  children,
  onPress,
  disabled,
  busy,
}: {
  children: ReactNode
  onPress?: () => void
  disabled?: boolean
  busy?: boolean
}) {
  const isDisabled = disabled || busy
  return (
    <Pressable
      onPress={onPress}
      disabled={isDisabled}
      style={({ pressed }) => [
        atomStyles.primary,
        isDisabled
          ? { backgroundColor: K.mute, opacity: 0.7 }
          : SHADOW.cta,
        pressed && !isDisabled && atomStyles.pressed,
      ]}
    >
      {busy ? (
        <ActivityIndicator color={K.navy} />
      ) : typeof children === "string" ? (
        <Text style={atomStyles.primaryText}>{children}</Text>
      ) : (
        children
      )}
    </Pressable>
  )
}

export function SecondaryCTA({
  children,
  onPress,
}: {
  children: ReactNode
  onPress?: () => void
}) {
  return (
    <Pressable
      onPress={onPress}
      style={({ pressed }) => [atomStyles.secondary, pressed && atomStyles.pressed]}
    >
      {typeof children === "string" ? (
        <Text style={atomStyles.secondaryText}>{children}</Text>
      ) : (
        children
      )}
    </Pressable>
  )
}

export function Eyebrow({ children }: { children: ReactNode }) {
  return <Text style={atomStyles.eyebrow}>{children}</Text>
}

export function Row({ k, v, big }: { k: string; v: string; big?: boolean }) {
  return (
    <View style={atomStyles.row}>
      <Text style={atomStyles.rowKey}>{k}</Text>
      <Text style={[atomStyles.rowVal, big && atomStyles.rowValBig]} numberOfLines={1}>
        {v}
      </Text>
    </View>
  )
}

export function RowPill({ k, pill }: { k: string; pill: ReactNode }) {
  return (
    <View style={atomStyles.rowPill}>
      <Text style={atomStyles.rowKey}>{k}</Text>
      {pill}
    </View>
  )
}

export function Chip({ children, lilac }: { children: ReactNode; lilac?: boolean }) {
  return (
    <View
      style={[
        atomStyles.chip,
        { backgroundColor: lilac ? K.lilac45 : K.cyan35 },
      ]}
    >
      <Text style={atomStyles.chipText}>{children}</Text>
    </View>
  )
}

export function BackButton({ onPress }: { onPress: () => void }) {
  return (
    <Pressable
      onPress={onPress}
      accessibilityLabel="Back"
      style={({ pressed }) => [
        atomStyles.backBtn,
        SHADOW.pill,
        pressed && atomStyles.pressed,
      ]}
    >
      <Svg width={18} height={18} viewBox="0 0 24 24" fill="none">
        <Path d="M15 18l-6-6 6-6" stroke={K.navy} strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" />
      </Svg>
    </Pressable>
  )
}

const atomStyles = StyleSheet.create({
  primary: {
    width: "100%",
    paddingHorizontal: 24,
    paddingVertical: 14,
    borderRadius: 999,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: K.cyan,
    minHeight: 52,
  },
  primaryText: {
    color: K.navy,
    fontSize: 15,
    fontWeight: "800",
  },
  secondary: {
    width: "100%",
    paddingHorizontal: 28,
    paddingVertical: 12,
    borderRadius: 999,
    backgroundColor: K.white,
    borderWidth: 1.5,
    borderColor: K.navy,
    alignItems: "center",
    justifyContent: "center",
    minHeight: 50,
  },
  secondaryText: {
    color: K.navy,
    fontSize: 15,
    fontWeight: "800",
  },
  pressed: {
    transform: [{ scale: 0.98 }],
    opacity: 0.92,
  },
  eyebrow: {
    fontSize: 10,
    fontWeight: "700",
    letterSpacing: 1.8,
    textTransform: "uppercase",
    color: K.navy50,
  },
  row: {
    flexDirection: "row",
    alignItems: "baseline",
    justifyContent: "space-between",
    paddingVertical: 6,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: K.navy10,
    borderStyle: "dashed",
    gap: 8,
  },
  rowPill: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingVertical: 8,
  },
  rowKey: {
    fontSize: 11,
    fontWeight: "700",
    color: K.navy55,
    letterSpacing: 0.8,
    textTransform: "uppercase",
  },
  rowVal: {
    fontSize: 13,
    fontWeight: "800",
    color: K.navy,
    textAlign: "right",
    maxWidth: "60%",
  },
  rowValBig: {
    fontSize: 18,
  },
  chip: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 999,
    alignSelf: "flex-start",
  },
  chipText: {
    color: K.navy,
    fontSize: 11,
    fontWeight: "700",
  },
  backBtn: {
    width: 36,
    height: 36,
    borderRadius: 999,
    backgroundColor: K.white,
    alignItems: "center",
    justifyContent: "center",
  },
})
