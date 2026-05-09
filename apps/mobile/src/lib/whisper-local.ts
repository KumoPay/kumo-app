import * as FileSystem from "expo-file-system/legacy"
import AsyncStorage from "@react-native-async-storage/async-storage"
import { initWhisper, type WhisperContext } from "whisper.rn"

// Multilingual tiny model — same ~75 MB as `tiny.en` but supports all 99 languages
// whisper.cpp ships with. We pass the language hint at transcribe time.
const MODEL_URL =
  "https://huggingface.co/ggerganov/whisper.cpp/resolve/main/ggml-tiny.bin?download=true"
const MODEL_FILENAME = "ggml-tiny.bin"
const MODEL_SIZE_BYTES = 78_000_000 // ~75 MB
const PREF_KEY_ENABLED = "kumo.whisper.enabled"
const PREF_KEY_LANG = "kumo.whisper.language"

export type VoiceLanguage = {
  id: string
  name: string
  flag: string
  available: boolean
  /** Whisper's language code (ISO-639-1). Used at transcribe time. */
  whisperCode: string | null
}

export const VOICE_LANGUAGES: readonly VoiceLanguage[] = [
  { id: "en",   name: "English",       flag: "🇬🇧", available: true,  whisperCode: "en" },
  { id: "es",   name: "Spanish",       flag: "🇪🇸", available: true,  whisperCode: "es" },
  { id: "more", name: "More incoming", flag: "✨",  available: false, whisperCode: null },
] as const

export async function getActiveLanguage(): Promise<string> {
  return (await AsyncStorage.getItem(PREF_KEY_LANG).catch(() => null)) ?? "en"
}

export async function setActiveLanguage(id: string): Promise<void> {
  const lang = VOICE_LANGUAGES.find((l) => l.id === id && l.available)
  if (!lang) return
  await AsyncStorage.setItem(PREF_KEY_LANG, id).catch(() => {})
}

function modelPath(): string {
  return `${FileSystem.documentDirectory}${MODEL_FILENAME}`
}

export const WHISPER = {
  modelName: "Whisper Tiny (English)",
  estimatedSizeBytes: MODEL_SIZE_BYTES,
  estimatedSizeLabel: "~75 MB",
} as const

export type DownloadProgress = {
  bytesWritten: number
  totalBytes: number
  pct: number
}

export async function isWhisperDownloaded(): Promise<boolean> {
  const info = await FileSystem.getInfoAsync(modelPath())
  return info.exists && (info.size ?? 0) > 30 * 1024 * 1024
}

let _resumable: FileSystem.DownloadResumable | null = null

export async function downloadWhisper(
  onProgress: (p: DownloadProgress) => void,
): Promise<{ ok: true } | { ok: false; error: string }> {
  if (_resumable) return { ok: false, error: "A download is already in progress." }
  try {
    const dest = modelPath()
    const existing = await FileSystem.getInfoAsync(dest)
    if (existing.exists && (existing.size ?? 0) > 30 * 1024 * 1024) return { ok: true }
    _resumable = FileSystem.createDownloadResumable(MODEL_URL, dest, {}, (p) => {
      const total = p.totalBytesExpectedToWrite || MODEL_SIZE_BYTES
      onProgress({
        bytesWritten: p.totalBytesWritten,
        totalBytes: total,
        pct: total > 0 ? p.totalBytesWritten / total : 0,
      })
    })
    const result = await _resumable.downloadAsync()
    _resumable = null
    if (!result) return { ok: false, error: "Download cancelled." }
    return { ok: true }
  } catch (e) {
    _resumable = null
    return { ok: false, error: e instanceof Error ? e.message : "download failed" }
  }
}

export async function cancelWhisperDownload(): Promise<void> {
  if (!_resumable) return
  try {
    await _resumable.pauseAsync()
  } catch {
    /* ignore */
  }
  _resumable = null
}

export async function deleteWhisper(): Promise<void> {
  await FileSystem.deleteAsync(modelPath(), { idempotent: true }).catch(() => {})
  await unloadWhisper()
}

export async function setWhisperEnabled(v: boolean): Promise<void> {
  await AsyncStorage.setItem(PREF_KEY_ENABLED, v ? "1" : "0").catch(() => {})
}

export async function isWhisperEnabled(): Promise<boolean> {
  return (await AsyncStorage.getItem(PREF_KEY_ENABLED).catch(() => null)) === "1"
}

let _ctx: WhisperContext | null = null

async function getCtx(): Promise<WhisperContext> {
  if (_ctx) return _ctx
  if (!(await isWhisperDownloaded())) throw new Error("Whisper model not downloaded yet.")
  _ctx = await initWhisper({ filePath: modelPath() })
  return _ctx
}

export async function unloadWhisper(): Promise<void> {
  if (!_ctx) return
  try {
    await _ctx.release()
  } catch {
    /* ignore */
  }
  _ctx = null
}

/** Transcribe a recorded audio file to text using the local Whisper model. */
export async function transcribeAudio(audioPath: string): Promise<string> {
  const ctx = await getCtx()
  const langId = await getActiveLanguage()
  const lang = VOICE_LANGUAGES.find((l) => l.id === langId)
  const { promise } = ctx.transcribe(audioPath, {
    language: lang?.whisperCode ?? "en",
    maxLen: 256,
  })
  const { result } = await promise
  return (result ?? "").trim()
}
