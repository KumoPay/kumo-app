import { useMemo, useState } from "react"
import {
  ActivityIndicator,
  Linking,
  Pressable,
  SafeAreaView,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native"
import type { PaymentIntent } from "@kumo/shared"
import { buildPrivateTransfer, parseIntent, type BuiltTransfer } from "../src/lib/api"
import { DEMO_CONTACTS, resolveRecipient } from "../src/lib/contacts"
import { hashIntentForMobile } from "../src/lib/intent"
import {
  connectWallet,
  signIntentMessage,
  signTransactionWithWallet,
  type ConnectedWallet,
} from "../src/lib/mobile-wallet"
import { deserializeBuiltTransaction, submitSignedTransaction } from "../src/lib/transactions"

type StepId = "connect" | "intent" | "review" | "queued" | "settled"

const STEPS: Array<{ id: StepId; label: string }> = [
  { id: "connect", label: "Connect" },
  { id: "intent", label: "Intent" },
  { id: "review", label: "Review" },
  { id: "queued", label: "Queued" },
  { id: "settled", label: "Settled" },
]

type Settlement = {
  signature: string
  validator?: string
  sendTo: BuiltTransfer["send_to"]
}

export default function MobileHome() {
  const [step, setStep] = useState<StepId>("connect")
  const [wallet, setWallet] = useState<ConnectedWallet | null>(null)
  const [text, setText] = useState("pay alice 1 usdc privately")
  const [intent, setIntent] = useState<PaymentIntent | null>(null)
  const [intentHash, setIntentHash] = useState<string | null>(null)
  const [offlineSig, setOfflineSig] = useState<string | null>(null)
  const [settlement, setSettlement] = useState<Settlement | null>(null)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const currentStep = STEPS.findIndex((s) => s.id === step)
  const shortWallet = useMemo(() => {
    const key = wallet?.publicKey.toBase58()
    return key ? `${key.slice(0, 5)}...${key.slice(-4)}` : null
  }, [wallet])

  async function run<T>(fn: () => Promise<T>): Promise<T | null> {
    setError(null)
    setBusy(true)
    try {
      return await fn()
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e))
      return null
    } finally {
      setBusy(false)
    }
  }

  async function onConnect() {
    const connected = await run(() => connectWallet(wallet?.authToken))
    if (!connected) return
    setWallet(connected)
    setStep("intent")
  }

  async function onParse() {
    const parsed = await run(async () => {
      const nextIntent = await parseIntent(text.trim())
      const hash = await hashIntentForMobile(nextIntent)
      return { nextIntent, hash }
    })
    if (!parsed) return
    setIntent(parsed.nextIntent)
    setIntentHash(parsed.hash)
    setOfflineSig(null)
    setSettlement(null)
    setStep("review")
  }

  async function onSignIntent() {
    if (!wallet || !intentHash) {
      setError("Connect a wallet and parse an intent first.")
      return
    }
    const sig = await run(() => signIntentMessage({ wallet, intentHash }))
    if (!sig) return
    setOfflineSig(sig)
    setStep("queued")
  }

  async function onBroadcast() {
    if (!wallet || !intent) {
      setError("Connect a wallet and parse an intent first.")
      return
    }

    const result = await run(async () => {
      const recipient = resolveRecipient(intent.recipient)
      if (!recipient.ok) throw new Error(recipient.reason)
      const built = await buildPrivateTransfer({
        intent,
        recipientPubkey: recipient.pubkey,
        userPubkey: wallet.publicKey.toBase58(),
      })
      const tx = deserializeBuiltTransaction(built)
      const signed = await signTransactionWithWallet({ wallet, transaction: tx })
      const signature = await submitSignedTransaction({ built, signed })
      return { signature, built }
    })

    if (!result) return
    setSettlement({
      signature: result.signature,
      validator: result.built.validator,
      sendTo: result.built.send_to,
    })
    setStep("settled")
  }

  function reset() {
    setIntent(null)
    setIntentHash(null)
    setOfflineSig(null)
    setSettlement(null)
    setError(null)
    setStep(wallet ? "intent" : "connect")
  }

  return (
    <SafeAreaView style={styles.safe}>
      <ScrollView contentContainerStyle={styles.container}>
        <View style={styles.header}>
          <View>
            <Text style={styles.brand}>Kumo</Text>
            <Text style={styles.subtitle}>Solana devnet mobile flow</Text>
          </View>
          <View style={styles.networkPill}>
            <Text style={styles.networkText}>Devnet</Text>
          </View>
        </View>

        <View style={styles.stepper}>
          {STEPS.map((item, index) => (
            <View
              key={item.id}
              style={[
                styles.stepDot,
                index <= currentStep ? styles.stepDotActive : styles.stepDotInactive,
              ]}
            />
          ))}
        </View>
        <Text style={styles.stepLabel}>
          Step {Math.max(currentStep + 1, 1)} / {STEPS.length} - {STEPS[Math.max(currentStep, 0)].label}
        </Text>

        {step === "connect" && (
          <Panel title="Connect a Solana mobile wallet">
            <Text style={styles.copy}>
              Use Mock MWA Wallet for development, then repeat the same flow with a real Android wallet.
            </Text>
            <PrimaryButton busy={busy} label="Connect wallet" onPress={onConnect} />
          </Panel>
        )}

        {step !== "connect" && wallet && (
          <View style={styles.walletCard}>
            <Text style={styles.walletLabel}>{wallet.label}</Text>
            <Text style={styles.walletKey}>{shortWallet}</Text>
          </View>
        )}

        {step === "intent" && (
          <Panel title="Describe the payment">
            <TextInput
              multiline
              value={text}
              onChangeText={setText}
              placeholder="pay alice 1 usdc privately"
              placeholderTextColor="#7D8798"
              style={styles.input}
            />
            <Text style={styles.help}>
              Demo contacts: {Object.keys(DEMO_CONTACTS).join(", ")}. Raw Solana pubkeys work too.
            </Text>
            <PrimaryButton busy={busy} disabled={!text.trim()} label="Parse intent" onPress={onParse} />
          </Panel>
        )}

        {step === "review" && intent && (
          <Panel title="Review and sign offline intent">
            <Fact label="To" value={intent.recipient} />
            <Fact label="Amount" value={`${intent.amount_usdc} USDC`} large />
            <Fact label="Privacy" value={intent.private ? "Private" : "Public"} />
            <Fact label="Hash" value={intentHash ? `${intentHash.slice(0, 8)}...${intentHash.slice(-6)}` : "-"} />
            <PrimaryButton busy={busy} label="Sign intent message" onPress={onSignIntent} />
          </Panel>
        )}

        {step === "queued" && intent && (
          <Panel title="Queued for broadcast">
            <Text style={styles.copy}>
              The intent message is signed. When you are online, Kumo asks the backend to build the devnet
              transfer, your wallet signs it, and the app submits it.
            </Text>
            <Fact label="Recipient" value={intent.recipient} />
            <Fact label="Offline sig" value={offlineSig ? `${offlineSig.slice(0, 8)}...${offlineSig.slice(-6)}` : "-"} />
            <PrimaryButton busy={busy} label="Build, sign, and broadcast" onPress={onBroadcast} />
          </Panel>
        )}

        {step === "settled" && settlement && (
          <Panel title="Delivered on devnet">
            <Fact label="Signature" value={`${settlement.signature.slice(0, 8)}...${settlement.signature.slice(-8)}`} />
            <Fact label="Sent to" value={settlement.sendTo} />
            <Fact label="Validator" value={settlement.validator ?? "base RPC"} />
            <SecondaryButton
              label="Open Solscan"
              onPress={() => Linking.openURL(`https://solscan.io/tx/${settlement.signature}?cluster=devnet`)}
            />
            <PrimaryButton label="Send another payment" onPress={reset} />
          </Panel>
        )}

        {error && (
          <View style={styles.errorBox}>
            <Text style={styles.errorTitle}>Error</Text>
            <Text style={styles.errorText}>{error}</Text>
          </View>
        )}
      </ScrollView>
    </SafeAreaView>
  )
}

function Panel({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <View style={styles.panel}>
      <Text style={styles.panelTitle}>{title}</Text>
      {children}
    </View>
  )
}

function Fact({ label, value, large }: { label: string; value: string; large?: boolean }) {
  return (
    <View style={styles.fact}>
      <Text style={styles.factLabel}>{label}</Text>
      <Text style={[styles.factValue, large && styles.factValueLarge]} numberOfLines={2}>
        {value}
      </Text>
    </View>
  )
}

function PrimaryButton({
  label,
  onPress,
  busy,
  disabled,
}: {
  label: string
  onPress: () => void
  busy?: boolean
  disabled?: boolean
}) {
  const isDisabled = busy || disabled
  return (
    <Pressable
      onPress={onPress}
      disabled={isDisabled}
      style={({ pressed }) => [
        styles.primaryButton,
        isDisabled && styles.buttonDisabled,
        pressed && !isDisabled && styles.buttonPressed,
      ]}
    >
      {busy ? <ActivityIndicator color="#0B1020" /> : <Text style={styles.primaryButtonText}>{label}</Text>}
    </Pressable>
  )
}

function SecondaryButton({ label, onPress }: { label: string; onPress: () => void }) {
  return (
    <Pressable onPress={onPress} style={({ pressed }) => [styles.secondaryButton, pressed && styles.buttonPressed]}>
      <Text style={styles.secondaryButtonText}>{label}</Text>
    </Pressable>
  )
}

const styles = StyleSheet.create({
  safe: {
    flex: 1,
    backgroundColor: "#FFF8E7",
  },
  container: {
    padding: 20,
    paddingBottom: 42,
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginTop: 8,
  },
  brand: {
    color: "#0B1020",
    fontSize: 42,
    fontWeight: "900",
  },
  subtitle: {
    color: "rgba(11, 16, 32, 0.62)",
    fontSize: 14,
    fontWeight: "700",
    marginTop: 2,
  },
  networkPill: {
    backgroundColor: "#B7F1FF",
    borderRadius: 999,
    paddingHorizontal: 14,
    paddingVertical: 8,
  },
  networkText: {
    color: "#0B1020",
    fontSize: 12,
    fontWeight: "900",
    textTransform: "uppercase",
  },
  stepper: {
    flexDirection: "row",
    gap: 7,
    marginTop: 28,
  },
  stepDot: {
    flex: 1,
    height: 7,
    borderRadius: 999,
  },
  stepDotActive: {
    backgroundColor: "#0B1020",
  },
  stepDotInactive: {
    backgroundColor: "rgba(183, 241, 255, 0.7)",
  },
  stepLabel: {
    color: "rgba(11, 16, 32, 0.55)",
    fontSize: 11,
    fontWeight: "900",
    letterSpacing: 0,
    marginTop: 9,
    textTransform: "uppercase",
  },
  panel: {
    backgroundColor: "#FFFFFF",
    borderRadius: 8,
    marginTop: 24,
    padding: 20,
    shadowColor: "#0B1020",
    shadowOpacity: 0.08,
    shadowRadius: 18,
    shadowOffset: { width: 0, height: 8 },
    elevation: 3,
  },
  panelTitle: {
    color: "#0B1020",
    fontSize: 24,
    fontWeight: "900",
    marginBottom: 12,
  },
  copy: {
    color: "rgba(11, 16, 32, 0.68)",
    fontSize: 15,
    fontWeight: "600",
    lineHeight: 22,
    marginBottom: 16,
  },
  input: {
    minHeight: 116,
    backgroundColor: "#FFF8E7",
    borderColor: "#B7F1FF",
    borderWidth: 1.5,
    borderRadius: 8,
    color: "#0B1020",
    fontSize: 17,
    fontWeight: "700",
    lineHeight: 23,
    padding: 14,
    textAlignVertical: "top",
  },
  help: {
    color: "rgba(11, 16, 32, 0.55)",
    fontSize: 12,
    fontWeight: "700",
    lineHeight: 18,
    marginTop: 10,
    marginBottom: 16,
  },
  walletCard: {
    marginTop: 18,
    backgroundColor: "rgba(183, 241, 255, 0.45)",
    borderRadius: 8,
    padding: 14,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  walletLabel: {
    color: "#0B1020",
    fontSize: 14,
    fontWeight: "900",
  },
  walletKey: {
    color: "rgba(11, 16, 32, 0.7)",
    fontSize: 13,
    fontWeight: "800",
  },
  fact: {
    borderBottomColor: "rgba(11, 16, 32, 0.1)",
    borderBottomWidth: 1,
    paddingVertical: 10,
  },
  factLabel: {
    color: "rgba(11, 16, 32, 0.55)",
    fontSize: 11,
    fontWeight: "900",
    textTransform: "uppercase",
  },
  factValue: {
    color: "#0B1020",
    fontSize: 15,
    fontWeight: "800",
    marginTop: 4,
  },
  factValueLarge: {
    fontSize: 24,
    fontWeight: "900",
  },
  primaryButton: {
    alignItems: "center",
    backgroundColor: "#7FE8FF",
    borderRadius: 999,
    marginTop: 18,
    minHeight: 52,
    justifyContent: "center",
    paddingHorizontal: 18,
  },
  primaryButtonText: {
    color: "#0B1020",
    fontSize: 16,
    fontWeight: "900",
  },
  secondaryButton: {
    alignItems: "center",
    backgroundColor: "#FFFFFF",
    borderColor: "#0B1020",
    borderRadius: 999,
    borderWidth: 1.5,
    marginTop: 18,
    minHeight: 50,
    justifyContent: "center",
    paddingHorizontal: 18,
  },
  secondaryButtonText: {
    color: "#0B1020",
    fontSize: 15,
    fontWeight: "900",
  },
  buttonDisabled: {
    backgroundColor: "#C4CCD8",
    opacity: 0.75,
  },
  buttonPressed: {
    transform: [{ scale: 0.99 }],
  },
  errorBox: {
    backgroundColor: "rgba(199, 181, 255, 0.28)",
    borderColor: "#C7B5FF",
    borderRadius: 8,
    borderWidth: 1,
    marginTop: 18,
    padding: 14,
  },
  errorTitle: {
    color: "#0B1020",
    fontSize: 11,
    fontWeight: "900",
    marginBottom: 4,
    textTransform: "uppercase",
  },
  errorText: {
    color: "#0B1020",
    fontSize: 13,
    fontWeight: "700",
    lineHeight: 19,
  },
})
