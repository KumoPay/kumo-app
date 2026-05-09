import { GestureHandlerRootView } from "react-native-gesture-handler"
import { StyleSheet } from "react-native"
import { MobileShell } from "../src/screens/MobileShell"

export default function MobileHome() {
  return (
    <GestureHandlerRootView style={styles.flex}>
      <MobileShell />
    </GestureHandlerRootView>
  )
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
})
