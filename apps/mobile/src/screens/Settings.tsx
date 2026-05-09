import { useEffect, useState } from "react"
import { Image, Pressable, StyleSheet, Switch, Text, TextInput, View } from "react-native"
import { Eyebrow, SecondaryCTA } from "./atoms"
import { ASSETS } from "./assets"
import { K, SHADOW } from "./theme"
import {
  LOCAL_AI,
  deleteModel,
  isLocalAIEnabled,
  isModelDownloaded,
  setLocalAIEnabled,
} from "../lib/qvac-local"
import {
  WHISPER,
  deleteWhisper,
  isWhisperDownloaded,
  isWhisperEnabled,
  setWhisperEnabled,
} from "../lib/whisper-local"
import {
  getBiometricLabel,
  isBiometricAvailable,
  requireForSign,
  setRequireForSign,
} from "../lib/biometric"
import {
  getApiBaseUrl,
  getDefaultApiBaseUrl,
  setApiBaseUrl,
} from "../lib/runtime-config"
import {
  clearNonce,
  getNonceSetup,
  refreshNonceFromChain,
  type NonceSetup,
} from "../lib/durable-nonce"
import { useConnection } from "../hooks/use-connection"
import type { ScreenRenderer } from "./types"

function relativeMinutes(ts: number): string {
  const diff = Math.max(0, Date.now() - ts)
  if (diff < 60_000) return "just now"
  if (diff < 3_600_000) return `${Math.floor(diff / 60_000)}m ago`
  if (diff < 86_400_000) return `${Math.floor(diff / 3_600_000)}h ago`
  return `${Math.floor(diff / 86_400_000)}d ago`
}

export const Settings: ScreenRenderer = (ctx) => ({
  body: <SettingsBody ctx={ctx} />,
})

function SettingsBody({ ctx }: { ctx: Parameters<ScreenRenderer>[0] }) {
  const [aiEnabled, setAiEnabled] = useState(false)
  const [aiDownloaded, setAiDownloaded] = useState(false)
  const [voiceEnabled, setVoiceEnabled] = useState(false)
  const [voiceDownloaded, setVoiceDownloaded] = useState(false)
  const [bioRequire, setBioRequire] = useState(false)
  const [bioAvailable, setBioAvailable] = useState(false)
  const [bioLabel, setBioLabel] = useState("Device biometric")
  const [apiUrl, setApiUrlState] = useState("")
  const apiDefault = getDefaultApiBaseUrl()
  const { connection } = useConnection()
  const [nonce, setNonce] = useState<NonceSetup | null>(null)
  const [nonceBusy, setNonceBusy] = useState(false)

  useEffect(() => {
    void (async () => {
      setAiEnabled(await isLocalAIEnabled())
      setAiDownloaded(await isModelDownloaded())
      setVoiceEnabled(await isWhisperEnabled())
      setVoiceDownloaded(await isWhisperDownloaded())
      setBioRequire(await requireForSign())
      setBioAvailable(await isBiometricAvailable())
      setBioLabel(await getBiometricLabel())
      setApiUrlState(await getApiBaseUrl())
      setNonce(await getNonceSetup())
    })()
  }, [])

  async function onRefreshNonce() {
    if (!nonce?.noncePubkey) return
    setNonceBusy(true)
    try {
      await refreshNonceFromChain({ connection, noncePubkey: nonce.noncePubkey })
      setNonce(await getNonceSetup())
    } finally {
      setNonceBusy(false)
    }
  }

  async function onClearNonce() {
    await clearNonce()
    setNonce(null)
  }

  async function onSaveApiUrl() {
    await setApiBaseUrl(apiUrl)
  }

  async function onResetApiUrl() {
    await setApiBaseUrl("")
    setApiUrlState(apiDefault)
  }

  async function onToggleBio(v: boolean) {
    setBioRequire(v)
    await setRequireForSign(v)
  }

  async function onToggleAi(v: boolean) {
    setAiEnabled(v)
    await setLocalAIEnabled(v)
  }

  async function onDeleteModel() {
    await deleteModel()
    setAiDownloaded(false)
    setAiEnabled(false)
    await setLocalAIEnabled(false)
  }

  async function onToggleVoice(v: boolean) {
    setVoiceEnabled(v)
    await setWhisperEnabled(v)
  }

  async function onDeleteVoice() {
    await deleteWhisper()
    setVoiceDownloaded(false)
    setVoiceEnabled(false)
    await setWhisperEnabled(false)
  }

  return (
    <View>
      <View style={styles.titleRow}>
        <View style={{ flex: 1 }}>
          <Text style={styles.h1}>Settings</Text>
          <Text style={styles.sub}>Privacy, wallet, and on-device data.</Text>
        </View>
        <Image source={ASSETS.state07} style={styles.titleMascot} resizeMode="contain" />
      </View>

      <View style={{ marginTop: 18 }}>
        <Eyebrow>Network</Eyebrow>
        <View style={[styles.card, SHADOW.pill]}>
          <Text style={styles.cardKey}>Cluster</Text>
          <Text style={styles.cardVal}>Solana Devnet</Text>
        </View>
      </View>

      <View style={{ marginTop: 14 }}>
        <Eyebrow>Connection</Eyebrow>
        <View style={[styles.card, SHADOW.pill, styles.row]}>
          <View style={{ flex: 1 }}>
            <Text style={styles.cardKey}>Airplane mode</Text>
            <Text style={styles.cardSub}>
              Simulate offline. Sign now, broadcast later.
            </Text>
          </View>
          <Switch
            value={ctx.airplane}
            onValueChange={ctx.setAirplane}
            trackColor={{ false: K.navy10, true: K.lilac }}
          />
        </View>
      </View>

      {ctx.wallet && (
        <View style={{ marginTop: 14 }}>
          <Eyebrow>Wallet</Eyebrow>
          <View style={[styles.card, SHADOW.pill]}>
            <Text style={styles.cardKey}>{ctx.wallet.label}</Text>
            <Text style={styles.cardSub}>
              {ctx.wallet.pubkey.slice(0, 6)}…{ctx.wallet.pubkey.slice(-6)}
            </Text>
            {ctx.wallet.displayName ? (
              <Text style={[styles.cardSub, { marginTop: 4 }]}>
                Alias: {ctx.wallet.displayName}
              </Text>
            ) : null}
          </View>
          <View style={{ marginTop: 14 }}>
            <SecondaryCTA onPress={ctx.disconnectWallet}>Disconnect wallet</SecondaryCTA>
          </View>
        </View>
      )}

      <View style={{ marginTop: 14 }}>
        <Eyebrow>On-device AI</Eyebrow>
        <View style={[styles.card, SHADOW.pill, styles.row]}>
          <View style={{ flex: 1 }}>
            <Text style={styles.cardKey}>{LOCAL_AI.modelName}</Text>
            <Text style={styles.cardSub}>
              {aiDownloaded
                ? "Downloaded · intent parsing runs on this device"
                : `Not downloaded · falls back to cloud QVAC server`}
            </Text>
          </View>
          {aiDownloaded ? (
            <Switch
              value={aiEnabled}
              onValueChange={onToggleAi}
              trackColor={{ false: K.navy10, true: K.cyan }}
            />
          ) : (
            <Pressable
              onPress={() => ctx.push("enableLocalAI")}
              style={({ pressed }) => [styles.miniBtn, pressed && { opacity: 0.85 }]}
            >
              <Text style={styles.miniBtnText}>Download {LOCAL_AI.estimatedSizeLabel}</Text>
            </Pressable>
          )}
        </View>
        {aiDownloaded && (
          <View style={{ marginTop: 10 }}>
            <SecondaryCTA onPress={onDeleteModel}>Delete model</SecondaryCTA>
          </View>
        )}
      </View>

      <View style={{ marginTop: 14 }}>
        <Eyebrow>Security</Eyebrow>
        <View style={[styles.card, SHADOW.pill, styles.row]}>
          <View style={{ flex: 1 }}>
            <Text style={styles.cardKey}>Require biometric to sign</Text>
            <Text style={styles.cardSub}>
              {bioAvailable
                ? `${bioLabel} prompt before each payment`
                : "No biometric enrolled on this device"}
            </Text>
          </View>
          <Switch
            value={bioRequire}
            onValueChange={onToggleBio}
            disabled={!bioAvailable}
            trackColor={{ false: K.navy10, true: K.cyan }}
          />
        </View>
      </View>

      <View style={{ marginTop: 14 }}>
        <Eyebrow>Voice input (Whisper)</Eyebrow>
        <View style={[styles.card, SHADOW.pill, styles.row]}>
          <View style={{ flex: 1 }}>
            <Text style={styles.cardKey}>{WHISPER.modelName}</Text>
            <Text style={styles.cardSub}>
              {voiceDownloaded
                ? "Downloaded · tap the mic on Intent to dictate"
                : "Not downloaded · enable to speak instead of type"}
            </Text>
          </View>
          {voiceDownloaded ? (
            <Switch
              value={voiceEnabled}
              onValueChange={onToggleVoice}
              trackColor={{ false: K.navy10, true: K.lilac }}
            />
          ) : (
            <Pressable
              onPress={() => ctx.push("enableWhisper")}
              style={({ pressed }) => [styles.miniBtn, pressed && { opacity: 0.85 }]}
            >
              <Text style={styles.miniBtnText}>Download {WHISPER.estimatedSizeLabel}</Text>
            </Pressable>
          )}
        </View>
        {voiceDownloaded && (
          <View style={{ marginTop: 10 }}>
            <SecondaryCTA onPress={onDeleteVoice}>Delete voice model</SecondaryCTA>
          </View>
        )}
      </View>

      <View style={{ marginTop: 14 }}>
        <Eyebrow>Offline payments</Eyebrow>
        <View style={[styles.card, SHADOW.pill]}>
          {nonce?.cached ? (
            <>
              <Text style={styles.cardKey}>Ready</Text>
              <Text style={styles.cardSub}>
                Nonce {nonce.noncePubkey.slice(0, 6)}…{nonce.noncePubkey.slice(-4)} ·
                refreshed {relativeMinutes(nonce.cached.refreshedAt)}
              </Text>
              <View style={{ flexDirection: "row", gap: 8, marginTop: 12 }}>
                <Pressable
                  onPress={() => void onRefreshNonce()}
                  disabled={nonceBusy}
                  style={({ pressed }) => [
                    styles.miniBtn,
                    nonceBusy && { opacity: 0.6 },
                    pressed && { opacity: 0.85 },
                  ]}
                >
                  <Text style={styles.miniBtnText}>
                    {nonceBusy ? "Refreshing…" : "Refresh nonce"}
                  </Text>
                </Pressable>
                <Pressable
                  onPress={() => void onClearNonce()}
                  style={({ pressed }) => [styles.miniBtnGhost, pressed && { opacity: 0.85 }]}
                >
                  <Text style={styles.miniBtnGhostText}>Disable</Text>
                </Pressable>
              </View>
            </>
          ) : (
            <>
              <Text style={styles.cardKey}>Not set up</Text>
              <Text style={styles.cardSub}>
                Set up a durable nonce account so you can sign payments without network and broadcast them later.
              </Text>
              <Pressable
                onPress={() => ctx.push("enableOfflinePay")}
                style={({ pressed }) => [
                  styles.miniBtn,
                  { marginTop: 12 },
                  pressed && { opacity: 0.85 },
                ]}
              >
                <Text style={styles.miniBtnText}>Set up</Text>
              </Pressable>
            </>
          )}
        </View>
      </View>

      <View style={{ marginTop: 14 }}>
        <Eyebrow>Server</Eyebrow>
        <View style={[styles.card, SHADOW.pill]}>
          <Text style={styles.cardKey}>Backend URL</Text>
          <Text style={styles.cardSub}>
            Where the app reaches /api/parse-intent and /api/build-private-transfer.
          </Text>
          <TextInput
            value={apiUrl}
            onChangeText={setApiUrlState}
            onBlur={() => void onSaveApiUrl()}
            placeholder={apiDefault}
            placeholderTextColor={K.navy30}
            autoCapitalize="none"
            autoCorrect={false}
            keyboardType="url"
            style={styles.urlInput}
          />
          <View style={{ flexDirection: "row", gap: 8, marginTop: 8 }}>
            <Pressable
              onPress={() => void onSaveApiUrl()}
              style={({ pressed }) => [styles.miniBtn, pressed && { opacity: 0.85 }]}
            >
              <Text style={styles.miniBtnText}>Save</Text>
            </Pressable>
            <Pressable
              onPress={() => void onResetApiUrl()}
              style={({ pressed }) => [styles.miniBtnGhost, pressed && { opacity: 0.85 }]}
            >
              <Text style={styles.miniBtnGhostText}>Reset to default</Text>
            </Pressable>
          </View>
        </View>
      </View>

      <View style={{ marginTop: 14 }}>
        <Eyebrow>Quick links</Eyebrow>
        <Pressable
          onPress={() => ctx.push("contacts")}
          style={({ pressed }) => [styles.card, SHADOW.pill, styles.row, pressed && { opacity: 0.92 }]}
        >
          <Text style={[styles.cardKey, { flex: 1 }]}>Contacts</Text>
          <Text style={styles.chevron}>›</Text>
        </Pressable>
        <Pressable
          onPress={() => ctx.push("history")}
          style={({ pressed }) => [styles.card, SHADOW.pill, styles.row, pressed && { opacity: 0.92 }]}
        >
          <Text style={[styles.cardKey, { flex: 1 }]}>History</Text>
          <Text style={styles.chevron}>›</Text>
        </Pressable>
        <Pressable
          onPress={() => ctx.push("receive")}
          style={({ pressed }) => [styles.card, SHADOW.pill, styles.row, pressed && { opacity: 0.92 }]}
        >
          <Text style={[styles.cardKey, { flex: 1 }]}>Receive</Text>
          <Text style={styles.chevron}>›</Text>
        </Pressable>
      </View>
    </View>
  )
}

const styles = StyleSheet.create({
  titleRow: { flexDirection: "row", alignItems: "flex-start", gap: 8 },
  titleMascot: { width: 96, height: 96, marginTop: -6 },
  h1: { fontSize: 26, fontWeight: "900", letterSpacing: -0.5, color: K.navy },
  sub: { marginTop: 6, fontSize: 14, color: K.navy55, fontWeight: "500" },
  card: {
    marginTop: 8,
    backgroundColor: K.white,
    borderRadius: 18,
    padding: 14,
  },
  row: { flexDirection: "row", alignItems: "center", gap: 12 },
  cardKey: { fontSize: 13, fontWeight: "800", color: K.navy },
  cardVal: { fontSize: 14, fontWeight: "800", color: K.navy, marginTop: 4 },
  cardSub: { fontSize: 12, color: K.navy55, marginTop: 4 },
  chevron: { fontSize: 22, color: K.navy30, fontWeight: "700" },
  miniBtn: {
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 999,
    backgroundColor: K.cyan,
  },
  miniBtnText: { color: K.navy, fontSize: 12, fontWeight: "900" },
  miniBtnGhost: {
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 999,
    borderWidth: 1.5,
    borderColor: K.navy20,
  },
  miniBtnGhostText: { color: K.navy, fontSize: 12, fontWeight: "800" },
  urlInput: {
    marginTop: 10,
    backgroundColor: K.cream,
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 10,
    fontSize: 13,
    color: K.navy,
    borderWidth: 1.5,
    borderColor: K.navy10,
  },
})
