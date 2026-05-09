import { useEffect } from "react"
import { Image, Pressable, StyleSheet, Text, View } from "react-native"
import { MotiView } from "moti"
import { K } from "./theme"
import { ASSETS } from "./assets"

const DISMISS_AFTER_MS = 1400

export function AppOpenSplash({ onDismiss }: { onDismiss: () => void }) {
  useEffect(() => {
    const id = setTimeout(onDismiss, DISMISS_AFTER_MS)
    return () => clearTimeout(id)
  }, [onDismiss])

  return (
    <Pressable
      onPress={onDismiss}
      style={StyleSheet.absoluteFillObject}
    >
      <MotiView
        from={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        transition={{ type: "timing", duration: 280 }}
        style={[StyleSheet.absoluteFillObject, styles.bg]}
      >
        <MotiView
          from={{ scale: 0.85, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          transition={{ type: "spring", damping: 14, mass: 0.7 }}
          style={styles.center}
        >
          <Image source={ASSETS.state05} style={styles.mascot} resizeMode="contain" />
          <Text style={styles.brand}>KUMO</Text>
          <Text style={styles.tag}>Pay when the signal disappears.</Text>
        </MotiView>
      </MotiView>
    </Pressable>
  )
}

const styles = StyleSheet.create({
  bg: { backgroundColor: "#ede9fe", alignItems: "center", justifyContent: "center" },
  center: { alignItems: "center" },
  mascot: { width: 180, height: 180 },
  brand: {
    marginTop: 12,
    fontSize: 32,
    fontWeight: "900",
    color: K.navy,
    letterSpacing: 4,
  },
  tag: {
    marginTop: 8,
    fontSize: 13,
    fontWeight: "700",
    color: K.navy55,
  },
})
