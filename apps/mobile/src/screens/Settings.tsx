import { useEffect, useState, type ReactNode } from "react"
import {
  Alert,
  Image,
  Modal,
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native"
import * as Clipboard from "expo-clipboard"
import Svg, { Path, Rect } from "react-native-svg"

import { ASSETS, walletLogoFor } from "./assets"
import { K } from "./theme"
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
import type { NavCtx, ScreenRenderer } from "./types"

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

function SettingsBody({ ctx }: { ctx: NavCtx }) {
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
  const [walletPickerOpen, setWalletPickerOpen] = useState(false)

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

  if (!ctx.wallet) {
    return (
      <View style={styles.emptyState}>
        <Text style={styles.emptyText}>Connect a wallet to see settings.</Text>
      </View>
    )
  }

  const pk = ctx.wallet.pubkey
  const truncated = pk.length > 14 ? `${pk.slice(0, 5)}…${pk.slice(-5)}` : pk

  async function copyAddress() {
    await Clipboard.setStringAsync(pk)
    Alert.alert("Address copied")
  }

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

  function onExportHistory() {
    Alert.alert(
      "Export history",
      "In production this would download a file with your activity. (Mock)",
    )
  }

  function onDeleteLocal() {
    Alert.alert(
      "Delete local data?",
      "This removes information stored on this device. This cannot be undone.",
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Delete",
          style: "destructive",
          onPress: () => ctx.disconnectWallet(),
        },
      ],
    )
  }

  function onSignOut() {
    Alert.alert(
      "Sign out?",
      "You'll return to connect your wallet and choose your alias again.",
      [
        { text: "Cancel", style: "cancel" },
        { text: "Sign out", onPress: () => ctx.disconnectWallet() },
      ],
    )
  }

  return (
    <View>
      <View style={styles.titleRow}>
        <View style={{ flex: 1, paddingTop: 2 }}>
          <Text style={styles.h1}>Settings</Text>
          <Text style={styles.sub}>Privacy, wallet, and on-device data.</Text>
        </View>
        <View style={styles.mascotWrap}>
          <Text style={styles.sparkleA}>✦</Text>
          <Text style={styles.sparkleB}>✦</Text>
          <Image source={ASSETS.state07} style={styles.titleMascot} resizeMode="contain" />
        </View>
      </View>

      <SectionTitle>Wallet</SectionTitle>
      <View style={styles.card}>
        <Pressable
          onPress={() => setWalletPickerOpen(true)}
          style={({ pressed }) => [styles.rowItem, styles.rowDivider, pressed && styles.pressed]}
        >
          <Image source={walletLogoFor(ctx.wallet.brand)} style={styles.walletLogo} />
          <View style={{ flex: 1, minWidth: 0 }}>
            <Text style={styles.rowTitle}>Connected wallet</Text>
          </View>
          <Text style={styles.walletLabel}>{ctx.wallet.label}</Text>
          <ChevronRight color={K.slate400} />
        </Pressable>

        <View style={styles.rowItem}>
          <IconBadge bg="#E0F2FE">
            <ClipboardGlyph />
          </IconBadge>
          <View style={{ flex: 1, minWidth: 0 }}>
            <Text style={styles.rowTitle}>Address</Text>
          </View>
          <Text style={styles.addressMono} numberOfLines={1}>
            {truncated}
          </Text>
          <Pressable
            onPress={() => void copyAddress()}
            accessibilityLabel="Copy address"
            style={({ pressed }) => [styles.copyBtn, pressed && styles.pressed]}
          >
            <CopyGlyph />
          </Pressable>
        </View>
      </View>

      <SectionTitle>Preferences</SectionTitle>
      <View style={styles.card}>
        <ToggleRow
          icon={
            <IconBadge bg="#E0F2FE">
              <PlaneGlyph />
            </IconBadge>
          }
          title="Airplane mode"
          hint="Hide your status and sign offline."
          checked={ctx.airplane}
          onChange={ctx.setAirplane}
        />
        <ToggleRow
          icon={
            <IconBadge bg="#DCFCE7">
              <LockGlyph />
            </IconBadge>
          }
          title={`Require ${bioLabel.toLowerCase()} to sign`}
          hint={
            bioAvailable
              ? "Prompt for biometric before each payment."
              : "No biometric enrolled on this device."
          }
          checked={bioRequire}
          onChange={onToggleBio}
          disabled={!bioAvailable}
          last
        />
      </View>

      <SectionTitle>On-device AI</SectionTitle>
      <View style={styles.card}>
        <View style={[styles.rowItem, voiceDownloaded || aiDownloaded ? styles.rowDivider : null]}>
          <IconBadge bg="#EDE9FE">
            <ChipGlyph />
          </IconBadge>
          <View style={{ flex: 1, minWidth: 0 }}>
            <Text style={styles.rowTitle}>{LOCAL_AI.modelName}</Text>
            <Text style={styles.rowHint}>
              {aiDownloaded
                ? "Intent parsing runs on this device."
                : "Falls back to a built-in regex parser. No network."}
            </Text>
          </View>
          {aiDownloaded ? (
            <Toggle checked={aiEnabled} onPress={() => void onToggleAi(!aiEnabled)} />
          ) : (
            <Pressable
              onPress={() => ctx.push("enableLocalAI")}
              style={({ pressed }) => [styles.miniBtn, pressed && styles.pressed]}
            >
              <Text style={styles.miniBtnText}>Get {LOCAL_AI.estimatedSizeLabel}</Text>
            </Pressable>
          )}
        </View>
        {aiDownloaded ? (
          <Pressable
            onPress={() => void onDeleteModel()}
            style={({ pressed }) => [styles.rowItem, styles.rowDivider, pressed && styles.pressed]}
          >
            <IconBadge bg="#FEE2E2">
              <TrashGlyph />
            </IconBadge>
            <View style={{ flex: 1, minWidth: 0 }}>
              <Text style={[styles.rowTitle, { color: "#DC2626" }]}>Delete LLM</Text>
              <Text style={styles.rowHint}>Free up storage on this device.</Text>
            </View>
            <ChevronRight color="#DC2626" />
          </Pressable>
        ) : null}

        <View style={styles.rowItem}>
          <IconBadge bg="#DBEAFE">
            <MicGlyph />
          </IconBadge>
          <View style={{ flex: 1, minWidth: 0 }}>
            <Text style={styles.rowTitle}>{WHISPER.modelName}</Text>
            <Text style={styles.rowHint}>
              {voiceDownloaded
                ? "Tap the mic on Intent to dictate."
                : "Enable to speak instead of type."}
            </Text>
          </View>
          {voiceDownloaded ? (
            <Toggle checked={voiceEnabled} onPress={() => void onToggleVoice(!voiceEnabled)} />
          ) : (
            <Pressable
              onPress={() => ctx.push("enableWhisper")}
              style={({ pressed }) => [styles.miniBtn, pressed && styles.pressed]}
            >
              <Text style={styles.miniBtnText}>Get {WHISPER.estimatedSizeLabel}</Text>
            </Pressable>
          )}
        </View>
        {voiceDownloaded ? (
          <Pressable
            onPress={() => void onDeleteVoice()}
            style={({ pressed }) => [styles.rowItem, pressed && styles.pressed]}
          >
            <IconBadge bg="#FEE2E2">
              <TrashGlyph />
            </IconBadge>
            <View style={{ flex: 1, minWidth: 0 }}>
              <Text style={[styles.rowTitle, { color: "#DC2626" }]}>Delete voice model</Text>
              <Text style={styles.rowHint}>Free up storage on this device.</Text>
            </View>
            <ChevronRight color="#DC2626" />
          </Pressable>
        ) : null}
      </View>

      <SectionTitle>Offline payments</SectionTitle>
      <View style={styles.card}>
        {nonce?.cached ? (
          <View style={styles.rowItem}>
            <IconBadge bg="#DCFCE7">
              <CloudSyncGlyph />
            </IconBadge>
            <View style={{ flex: 1, minWidth: 0 }}>
              <Text style={styles.rowTitle}>Durable nonce ready</Text>
              <Text style={styles.rowHint}>
                {nonce.noncePubkey.slice(0, 6)}…{nonce.noncePubkey.slice(-4)} · refreshed{" "}
                {relativeMinutes(nonce.cached.refreshedAt)}
              </Text>
              <View style={styles.btnRow}>
                <Pressable
                  onPress={() => void onRefreshNonce()}
                  disabled={nonceBusy}
                  style={({ pressed }) => [
                    styles.miniBtn,
                    nonceBusy && { opacity: 0.6 },
                    pressed && styles.pressed,
                  ]}
                >
                  <Text style={styles.miniBtnText}>
                    {nonceBusy ? "Refreshing…" : "Refresh"}
                  </Text>
                </Pressable>
                <Pressable
                  onPress={() => void onClearNonce()}
                  style={({ pressed }) => [styles.miniBtnGhost, pressed && styles.pressed]}
                >
                  <Text style={styles.miniBtnGhostText}>Disable</Text>
                </Pressable>
              </View>
            </View>
          </View>
        ) : (
          <Pressable
            onPress={() => ctx.push("enableOfflinePay")}
            style={({ pressed }) => [styles.rowItem, pressed && styles.pressed]}
          >
            <IconBadge bg="#E0F2FE">
              <PlaneGlyph />
            </IconBadge>
            <View style={{ flex: 1, minWidth: 0 }}>
              <Text style={styles.rowTitle}>Set up offline pay</Text>
              <Text style={styles.rowHint}>
                Sign payments without network. Broadcast when reconnected.
              </Text>
            </View>
            <ChevronRight color={K.slate400} />
          </Pressable>
        )}
      </View>

      <SectionTitle>Server</SectionTitle>
      <View style={styles.card}>
        <View style={[styles.rowItem, { alignItems: "flex-start" }]}>
          <IconBadge bg="#EEF2FF">
            <CloudGlyph />
          </IconBadge>
          <View style={{ flex: 1, minWidth: 0 }}>
            <Text style={styles.rowTitle}>Backend URL</Text>
            <Text style={styles.rowHint}>
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
            <View style={styles.btnRow}>
              <Pressable
                onPress={() => void onSaveApiUrl()}
                style={({ pressed }) => [styles.miniBtn, pressed && styles.pressed]}
              >
                <Text style={styles.miniBtnText}>Save</Text>
              </Pressable>
              <Pressable
                onPress={() => void onResetApiUrl()}
                style={({ pressed }) => [styles.miniBtnGhost, pressed && styles.pressed]}
              >
                <Text style={styles.miniBtnGhostText}>Reset</Text>
              </Pressable>
            </View>
          </View>
        </View>
      </View>

      <SectionTitle>Local data</SectionTitle>
      <View style={styles.card}>
        <Pressable
          onPress={onExportHistory}
          style={({ pressed }) => [styles.rowItem, styles.rowDivider, pressed && styles.pressed]}
        >
          <IconBadge bg="#E0F2FE">
            <ExportGlyph />
          </IconBadge>
          <View style={{ flex: 1, minWidth: 0 }}>
            <Text style={styles.rowTitle}>Export history</Text>
            <Text style={styles.rowHint}>Download your payment and activity history.</Text>
          </View>
          <ChevronRight color={K.slate400} />
        </Pressable>
        <Pressable
          onPress={onDeleteLocal}
          style={({ pressed }) => [styles.rowItem, pressed && styles.pressed]}
        >
          <IconBadge bg="#FEE2E2">
            <TrashGlyph />
          </IconBadge>
          <View style={{ flex: 1, minWidth: 0 }}>
            <Text style={[styles.rowTitle, { color: "#DC2626" }]}>Delete local data</Text>
            <Text style={styles.rowHint}>Remove all information stored on this device.</Text>
          </View>
          <ChevronRight color="#DC2626" />
        </Pressable>
      </View>

      <SectionTitle>Session</SectionTitle>
      <View style={styles.card}>
        <Pressable
          onPress={onSignOut}
          style={({ pressed }) => [styles.rowItem, pressed && styles.pressed]}
        >
          <IconBadge bg="#EEF2FF">
            <LogoutGlyph />
          </IconBadge>
          <View style={{ flex: 1, minWidth: 0 }}>
            <Text style={styles.rowTitle}>Sign out</Text>
            <Text style={styles.rowHint}>Return to wallet connection and alias setup.</Text>
          </View>
          <ChevronRight color={K.slate400} />
        </Pressable>
      </View>

      <WalletSwitchSheet
        ctx={ctx}
        open={walletPickerOpen}
        onClose={() => setWalletPickerOpen(false)}
      />
    </View>
  )
}

const WALLET_CHOICES = [
  { id: "phantom", name: "Phantom", initial: "P" },
  { id: "solflare", name: "Solflare", initial: "S" },
  { id: "backpack", name: "Backpack", initial: "B" },
  { id: "glow", name: "Glow", initial: "G" },
] as const

function WalletSwitchSheet({
  ctx,
  open,
  onClose,
}: {
  ctx: NavCtx
  open: boolean
  onClose: () => void
}) {
  const [busyBrand, setBusyBrand] = useState<string | null>(null)
  if (!ctx.wallet) return null

  async function switchTo(brand: string) {
    if (brand === ctx.wallet?.brand) {
      onClose()
      return
    }
    setBusyBrand(brand)
    try {
      ctx.disconnectWallet()
      await ctx.beginWalletConnect(brand)
    } finally {
      setBusyBrand(null)
      onClose()
    }
  }

  return (
    <Modal visible={open} transparent animationType="slide" onRequestClose={onClose}>
      <Pressable style={styles.sheetBackdrop} onPress={onClose} />
      <View style={styles.sheet}>
        <View style={styles.sheetHandle} />
        <Text style={styles.sheetTitle}>Switch wallet</Text>
        <Text style={styles.sheetSub}>Choose a wallet — you'll be asked to authorize again.</Text>
        <View style={styles.sheetList}>
          {WALLET_CHOICES.map((w, i) => {
            const isCurrent = ctx.wallet?.brand === w.id
            const isLast = i === WALLET_CHOICES.length - 1
            const isBusy = busyBrand === w.id
            return (
              <Pressable
                key={w.id}
                onPress={() => void switchTo(w.id)}
                disabled={busyBrand !== null}
                style={({ pressed }) => [
                  styles.sheetRow,
                  !isLast && styles.sheetDivider,
                  isCurrent && { backgroundColor: K.slate50 },
                  pressed && styles.pressed,
                ]}
              >
                <Image source={walletLogoFor(w.id)} style={styles.sheetLogo} />
                <View style={{ flex: 1, minWidth: 0 }}>
                  <Text style={styles.sheetWalletName}>{w.name}</Text>
                </View>
                {isCurrent ? (
                  <Text style={styles.sheetCurrent}>Current</Text>
                ) : isBusy ? (
                  <Text style={styles.sheetCurrent}>Connecting…</Text>
                ) : (
                  <ChevronRight color={K.slate300} />
                )}
              </Pressable>
            )
          })}
        </View>
      </View>
    </Modal>
  )
}

function SectionTitle({ children }: { children: ReactNode }) {
  return <Text style={styles.sectionTitle}>{children}</Text>
}

function IconBadge({ bg, children }: { bg: string; children: ReactNode }) {
  return <View style={[styles.iconBadge, { backgroundColor: bg }]}>{children}</View>
}

function ToggleRow({
  icon,
  title,
  hint,
  checked,
  onChange,
  last,
  disabled,
}: {
  icon: ReactNode
  title: string
  hint: string
  checked: boolean
  onChange: (v: boolean) => void
  last?: boolean
  disabled?: boolean
}) {
  return (
    <Pressable
      onPress={() => !disabled && onChange(!checked)}
      disabled={disabled}
      style={({ pressed }) => [
        styles.rowItem,
        !last && styles.rowDivider,
        pressed && !disabled && styles.pressed,
      ]}
    >
      {icon}
      <View style={{ flex: 1, minWidth: 0, paddingRight: 4 }}>
        <Text style={styles.rowTitle}>{title}</Text>
        <Text style={styles.rowHint}>{hint}</Text>
      </View>
      <Toggle checked={checked} onPress={() => !disabled && onChange(!checked)} disabled={disabled} />
    </Pressable>
  )
}

function Toggle({
  checked,
  onPress,
  disabled,
}: {
  checked: boolean
  onPress: () => void
  disabled?: boolean
}) {
  return (
    <Pressable onPress={onPress} disabled={disabled} hitSlop={6}>
      <View
        style={[
          styles.toggleTrack,
          { backgroundColor: checked ? K.purple : K.slate300, opacity: disabled ? 0.5 : 1 },
        ]}
      >
        <View style={[styles.toggleKnob, { left: checked ? 23 : 3 }]} />
      </View>
    </Pressable>
  )
}

function ChevronRight({ color }: { color: string }) {
  return (
    <Svg width={18} height={18} viewBox="0 0 24 24" fill="none">
      <Path
        d="M9 6l6 6-6 6"
        stroke={color}
        strokeWidth={2}
        strokeLinecap="round"
        strokeLinejoin="round"
        opacity={0.85}
      />
    </Svg>
  )
}

function ClipboardGlyph() {
  return (
    <Svg width={20} height={20} viewBox="0 0 24 24" fill="none">
      <Rect x={8} y={3} width={8} height={5} rx={1.5} stroke="#0369a1" strokeWidth={1.75} />
      <Path
        d="M6 8h12a2 2 0 0 1 2 2v10a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2V10a2 2 0 0 1 2-2z"
        stroke="#0369a1"
        strokeWidth={1.75}
      />
    </Svg>
  )
}

function LockGlyph() {
  return (
    <Svg width={18} height={18} viewBox="0 0 24 24" fill="none">
      <Rect x={5} y={11} width={14} height={10} rx={2} stroke="#166534" strokeWidth={1.85} />
      <Path
        d="M8 11V7a4 4 0 0 1 8 0v4"
        stroke="#166534"
        strokeWidth={1.85}
        strokeLinecap="round"
      />
    </Svg>
  )
}

function PlaneGlyph() {
  return (
    <Svg width={18} height={18} viewBox="0 0 24 24" fill="none">
      <Path
        d="M21 16v-2l-8-5V3.5c0-.83-.67-1.5-1.5-1.5S10 2.67 10 3.5V9l-8 5v2l8-2.5V19l-2 1.5V22l3.5-1 3.5 1v-1.5L13 19v-5.5l8 2.5z"
        fill="#0369a1"
      />
    </Svg>
  )
}

function CloudSyncGlyph() {
  return (
    <Svg width={20} height={20} viewBox="0 0 24 24" fill="none">
      <Path
        d="M18 10h1.5a3.5 3.5 0 0 1 0 7H16M6 17H5a3 3 0 0 1-.5-5.97M10 17V7m0 0l-3 3m3-3l3 3"
        stroke="#166534"
        strokeWidth={1.75}
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </Svg>
  )
}

function CloudGlyph() {
  return (
    <Svg width={20} height={20} viewBox="0 0 24 24" fill="none">
      <Path
        d="M7 18a4 4 0 0 1-.5-7.97 6 6 0 0 1 11.66 1A4 4 0 0 1 17 18H7z"
        stroke="#4f46e5"
        strokeWidth={1.85}
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </Svg>
  )
}

function ExportGlyph() {
  return (
    <Svg width={18} height={18} viewBox="0 0 24 24" fill="none">
      <Path
        d="M12 15V3m0 0l4 4m-4-4L8 7M4 19h16"
        stroke="#0369a1"
        strokeWidth={1.85}
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </Svg>
  )
}

function TrashGlyph() {
  return (
    <Svg width={18} height={18} viewBox="0 0 24 24" fill="none">
      <Path
        d="M3 6h18M8 6V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6M10 11v6M14 11v6"
        stroke="#DC2626"
        strokeWidth={1.75}
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </Svg>
  )
}

function LogoutGlyph() {
  return (
    <Svg width={18} height={18} viewBox="0 0 24 24" fill="none">
      <Path
        d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4M16 17l5-5-5-5M21 12H9"
        stroke="#4f46e5"
        strokeWidth={1.85}
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </Svg>
  )
}

function CopyGlyph() {
  return (
    <Svg width={20} height={20} viewBox="0 0 24 24" fill="none">
      <Rect x={8} y={8} width={12} height={12} rx={2} stroke={K.purple} strokeWidth={1.85} />
      <Path
        d="M6 16H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"
        stroke={K.purple}
        strokeWidth={1.85}
      />
    </Svg>
  )
}

function ChipGlyph() {
  return (
    <Svg width={20} height={20} viewBox="0 0 24 24" fill="none">
      <Rect x={6} y={6} width={12} height={12} rx={2.5} stroke="#6847e8" strokeWidth={1.85} />
      <Rect x={9} y={9} width={6} height={6} rx={1} fill="#6847e8" />
      <Path
        d="M9 3v3M15 3v3M9 18v3M15 18v3M3 9h3M3 15h3M18 9h3M18 15h3"
        stroke="#6847e8"
        strokeWidth={1.6}
        strokeLinecap="round"
      />
    </Svg>
  )
}

function MicGlyph() {
  return (
    <Svg width={18} height={18} viewBox="0 0 24 24" fill="none">
      <Rect x={9} y={3} width={6} height={11} rx={3} stroke="#0b7dd4" strokeWidth={1.85} />
      <Path
        d="M5 11a7 7 0 0 0 14 0M12 18v3M9 21h6"
        stroke="#0b7dd4"
        strokeWidth={1.85}
        strokeLinecap="round"
      />
    </Svg>
  )
}

const styles = StyleSheet.create({
  emptyState: {
    paddingVertical: 32,
    alignItems: "center",
  },
  emptyText: { fontSize: 14, fontWeight: "600", color: K.slate500 },

  titleRow: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: 8,
  },
  h1: {
    fontSize: 26,
    fontWeight: "900",
    letterSpacing: -0.5,
    color: K.slate900,
  },
  sub: {
    marginTop: 8,
    fontSize: 14,
    fontWeight: "500",
    color: K.slate500,
  },
  mascotWrap: {
    width: 132,
    height: 132,
    alignItems: "center",
    justifyContent: "center",
    marginRight: -4,
  },
  titleMascot: {
    width: 132,
    height: 132,
  },
  sparkleA: {
    position: "absolute",
    left: 4,
    top: 8,
    fontSize: 11,
    color: "#7dd3fc",
    zIndex: 2,
  },
  sparkleB: {
    position: "absolute",
    right: 6,
    top: 22,
    fontSize: 9,
    color: "#38bdf8",
    zIndex: 2,
  },

  sectionTitle: {
    marginTop: 24,
    marginBottom: 10,
    paddingHorizontal: 4,
    fontSize: 11,
    fontWeight: "700",
    letterSpacing: 2.4,
    textTransform: "uppercase",
    color: K.slate400,
  },

  card: {
    backgroundColor: K.white,
    borderRadius: 18,
    borderWidth: 1,
    borderColor: K.divider,
    overflow: "hidden",
  },
  rowItem: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    paddingHorizontal: 16,
    paddingVertical: 14,
  },
  rowDivider: {
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: K.slate100,
  },
  rowTitle: {
    fontSize: 14,
    fontWeight: "800",
    color: K.slate900,
  },
  rowHint: {
    marginTop: 3,
    fontSize: 12,
    fontWeight: "600",
    color: K.slate500,
    lineHeight: 16,
  },
  pressed: {
    opacity: 0.85,
  },

  iconBadge: {
    width: 40,
    height: 40,
    borderRadius: 999,
    alignItems: "center",
    justifyContent: "center",
  },

  walletLogo: {
    width: 40,
    height: 40,
    borderRadius: 999,
  },
  walletLabel: {
    fontSize: 14,
    fontWeight: "800",
    color: K.purple,
  },
  addressMono: {
    fontSize: 13,
    fontWeight: "700",
    color: "#475569",
    fontVariant: ["tabular-nums"],
  },
  copyBtn: {
    padding: 4,
    marginLeft: -4,
  },

  toggleTrack: {
    width: 51,
    height: 31,
    borderRadius: 999,
    justifyContent: "center",
  },
  toggleKnob: {
    position: "absolute",
    top: 3,
    width: 25,
    height: 25,
    borderRadius: 999,
    backgroundColor: K.white,
    shadowColor: K.navy,
    shadowOpacity: 0.12,
    shadowRadius: 6,
    shadowOffset: { width: 0, height: 2 },
    elevation: 2,
  },

  miniBtn: {
    paddingHorizontal: 14,
    paddingVertical: 9,
    borderRadius: 999,
    backgroundColor: K.purple,
  },
  miniBtnText: { color: K.white, fontSize: 12, fontWeight: "900" },
  miniBtnGhost: {
    paddingHorizontal: 14,
    paddingVertical: 9,
    borderRadius: 999,
    borderWidth: 1.5,
    borderColor: K.slate200,
    backgroundColor: K.white,
  },
  miniBtnGhostText: { color: K.slate500, fontSize: 12, fontWeight: "800" },
  btnRow: { flexDirection: "row", gap: 8, marginTop: 10 },

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

  sheetBackdrop: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: "rgba(15,23,42,0.4)",
  },
  sheet: {
    position: "absolute",
    bottom: 0,
    left: 0,
    right: 0,
    backgroundColor: K.white,
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    paddingHorizontal: 16,
    paddingTop: 12,
    paddingBottom: 28,
    borderWidth: 1,
    borderColor: K.divider,
    shadowColor: K.navy,
    shadowOpacity: 0.18,
    shadowRadius: 32,
    shadowOffset: { width: 0, height: -12 },
    elevation: 8,
  },
  sheetHandle: {
    alignSelf: "center",
    width: 40,
    height: 4,
    borderRadius: 999,
    backgroundColor: K.slate200,
    marginBottom: 12,
  },
  sheetTitle: {
    textAlign: "center",
    fontSize: 18,
    fontWeight: "900",
    letterSpacing: -0.4,
    color: K.slate900,
  },
  sheetSub: {
    textAlign: "center",
    marginTop: 4,
    marginBottom: 14,
    fontSize: 13,
    fontWeight: "500",
    color: K.slate500,
  },
  sheetList: {
    borderRadius: 18,
    borderWidth: 1,
    borderColor: K.slate100,
    overflow: "hidden",
  },
  sheetRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    paddingHorizontal: 16,
    paddingVertical: 14,
    backgroundColor: K.white,
  },
  sheetDivider: {
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: K.slate100,
  },
  sheetLogo: {
    width: 44,
    height: 44,
    borderRadius: 999,
  },
  sheetWalletName: {
    fontSize: 16,
    fontWeight: "900",
    color: K.slate900,
  },
  sheetCurrent: {
    fontSize: 12,
    fontWeight: "800",
    color: K.purple,
  },
})
