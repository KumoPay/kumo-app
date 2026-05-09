import { Pressable, StyleSheet, Text, View } from "react-native"
import Svg, { Circle, Path } from "react-native-svg"

import { K } from "./theme"

export type MobileTabId = "inicio" | "historial" | "contactos" | "ajustes"

const ACTIVE = "#7c5cff"
const IDLE = "#94a3b8"

function Tab({
  label,
  selected,
  onPress,
  children,
}: {
  label: string
  selected: boolean
  onPress: () => void
  children: React.ReactNode
}) {
  const color = selected ? ACTIVE : IDLE
  return (
    <Pressable
      onPress={onPress}
      style={({ pressed }) => [styles.tab, pressed && { opacity: 0.85 }]}
    >
      <View style={styles.icon}>{children}</View>
      <Text numberOfLines={1} style={[styles.label, { color }]}>
        {label}
      </Text>
    </Pressable>
  )
}

export function MobileTabBar({
  activeTab,
  onInicio,
  onHistorial,
  onContactos,
  onAjustes,
}: {
  activeTab: MobileTabId
  onInicio: () => void
  onHistorial: () => void
  onContactos: () => void
  onAjustes: () => void
}) {
  const c = (sel: boolean) => (sel ? ACTIVE : IDLE)
  return (
    <View style={styles.bar}>
      <Tab label="Home" selected={activeTab === "inicio"} onPress={onInicio}>
        <Svg width={22} height={22} viewBox="0 0 24 24" fill="none">
          <Path
            d="M3 10.5 12 3l9 7.5V20a1 1 0 0 1-1 1h-5v-6H9v6H4a1 1 0 0 1-1-1v-9.5Z"
            stroke={c(activeTab === "inicio")}
            strokeWidth={2}
            strokeLinejoin="round"
          />
        </Svg>
      </Tab>
      <Tab label="History" selected={activeTab === "historial"} onPress={onHistorial}>
        <Svg width={22} height={22} viewBox="0 0 24 24" fill="none">
          <Circle cx={12} cy={12} r={9} stroke={c(activeTab === "historial")} strokeWidth={2} />
          <Path d="M12 7v6l4 2" stroke={c(activeTab === "historial")} strokeWidth={2} strokeLinecap="round" />
        </Svg>
      </Tab>
      <Tab label="Contacts" selected={activeTab === "contactos"} onPress={onContactos}>
        <Svg width={22} height={22} viewBox="0 0 24 24" fill="none">
          <Path
            d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"
            stroke={c(activeTab === "contactos")}
            strokeWidth={2.2}
            strokeLinecap="round"
            strokeLinejoin="round"
          />
          <Circle cx={9} cy={7} r={4} stroke={c(activeTab === "contactos")} strokeWidth={2.2} />
          <Path
            d="M23 21v-2a4 4 0 0 0-3-3.87"
            stroke={c(activeTab === "contactos")}
            strokeWidth={2.2}
            strokeLinecap="round"
            strokeLinejoin="round"
          />
          <Path
            d="M16 3.13a4 4 0 0 1 0 7.75"
            stroke={c(activeTab === "contactos")}
            strokeWidth={2.2}
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        </Svg>
      </Tab>
      <Tab label="Settings" selected={activeTab === "ajustes"} onPress={onAjustes}>
        <Svg width={22} height={22} viewBox="0 0 24 24" fill="none">
          <Circle cx={12} cy={12} r={3} stroke={c(activeTab === "ajustes")} strokeWidth={2} />
          <Path
            d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 1 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 1 1-4 0v-.09a1.65 1.65 0 0 0-1-1.51 1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 1 1-2.83-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 1 1 0-4h.09a1.65 1.65 0 0 0 1.51-1 1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 1 1 2.83-2.83l.06.06a1.65 1.65 0 0 0 1.82.33h.01a1.65 1.65 0 0 0 1-1.51V3a2 2 0 1 1 4 0v.09a1.65 1.65 0 0 0 1 1.51h.01a1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 1 1 2.83 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82v.01a1.65 1.65 0 0 0 1.51 1H21a2 2 0 1 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1z"
            stroke={c(activeTab === "ajustes")}
            strokeWidth={1.6}
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        </Svg>
      </Tab>
    </View>
  )
}

const styles = StyleSheet.create({
  bar: {
    flexDirection: "row",
    paddingTop: 6,
    paddingBottom: 8,
    paddingHorizontal: 4,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: K.divider,
    backgroundColor: K.white,
  },
  tab: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    gap: 4,
    paddingVertical: 6,
  },
  icon: { height: 22, alignItems: "center", justifyContent: "center" },
  label: {
    fontSize: 10,
    fontWeight: "800",
    letterSpacing: -0.2,
  },
})
