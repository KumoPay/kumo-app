// Brand tokens that mirror apps/web/tailwind.config.mjs so RN screens look identical to the web /mobile UI.
// Import via `import { K } from "./theme"` and use as `K.cyan`, `K.navy60`, etc.

export const K = {
  navy: "#0B1020",
  navy90: "rgba(11,16,32,0.9)",
  navy80: "rgba(11,16,32,0.8)",
  navy70: "rgba(11,16,32,0.7)",
  navy65: "rgba(11,16,32,0.65)",
  navy60: "rgba(11,16,32,0.6)",
  navy55: "rgba(11,16,32,0.55)",
  navy50: "rgba(11,16,32,0.5)",
  navy40: "rgba(11,16,32,0.4)",
  navy30: "rgba(11,16,32,0.3)",
  navy20: "rgba(11,16,32,0.2)",
  navy10: "rgba(11,16,32,0.1)",
  navy06: "rgba(11,16,32,0.06)",
  navy05: "rgba(11,16,32,0.05)",

  cyan: "#7FE8FF",
  cyan35: "rgba(127,232,255,0.35)",
  cyan45: "rgba(127,232,255,0.45)",
  sky: "#B7F1FF",
  sky50: "rgba(183,241,255,0.5)",
  sky70: "rgba(183,241,255,0.7)",
  lilac: "#C7B5FF",
  lilac28: "rgba(199,181,255,0.28)",
  lilac45: "rgba(199,181,255,0.45)",

  // Brand purple — used for primary CTAs throughout the new mobile design.
  purple: "#7c5cff",
  purpleStrong: "#7B61FF",
  purpleSoft: "rgba(124,92,255,0.5)",
  // Slate palette used in card titles, body text, dividers — matches the web /mobile design.
  slate900: "#0f172a",
  slate800: "#131b34",
  slate700: "#1a1c3d",
  slate500: "#64748b",
  slate400: "#94a3b8",
  slate300: "#cbd5e1",
  slate200: "#e2e8f0",
  slate100: "#f1f5f9",
  slate50: "#f9fafb",

  cream: "#FFF8E7",
  white: "#FFFFFF",
  pageBg: "#f9fafb",
  panelGray: "#f6f7f9",
  divider: "#eef0f3",
  green: "#22c58a",
  red: "#FF4757",
  mute: "#C4CCD8",
} as const

export const SHADOW = {
  card: {
    shadowColor: K.navy,
    shadowOpacity: 0.08,
    shadowRadius: 18,
    shadowOffset: { width: 0, height: 8 },
    elevation: 3,
  },
  cta: {
    shadowColor: K.purple,
    shadowOpacity: 0.45,
    shadowRadius: 18,
    shadowOffset: { width: 0, height: 6 },
    elevation: 4,
  },
  pill: {
    shadowColor: K.navy,
    shadowOpacity: 0.06,
    shadowRadius: 2,
    shadowOffset: { width: 0, height: 1 },
    elevation: 1,
  },
} as const

export const FONT = {
  // expo-router and react-native default to the system font; for now we keep that and
  // express weight via `fontWeight`. If we later add a custom display font, gate that
  // behind expo-font and update these.
  display: undefined as undefined | string,
} as const
