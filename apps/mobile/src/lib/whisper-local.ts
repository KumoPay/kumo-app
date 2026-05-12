import * as FileSystem from "expo-file-system/legacy"
import AsyncStorage from "@react-native-async-storage/async-storage"
import { initWhisper, type WhisperContext } from "whisper.rn"

// Multilingual base model — ~145 MB, all 99 languages whisper.cpp supports.
// Chosen over the tiny model for better accuracy on short, noisy clips;
// tiny's failure mode is bailing to non-speech caption tokens like [BANG] /
// [MUSIC] when confidence dips. Language hint is passed at transcribe time.
const MODEL_URL =
  "https://huggingface.co/ggerganov/whisper.cpp/resolve/main/ggml-base.bin?download=true"
const MODEL_FILENAME = "ggml-base.bin"
const MODEL_SIZE_BYTES = 148_000_000 // ~145 MB
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
  modelName: "Whisper Base (Multilingual)",
  estimatedSizeBytes: MODEL_SIZE_BYTES,
  estimatedSizeLabel: "~145 MB",
} as const

export type DownloadProgress = {
  bytesWritten: number
  totalBytes: number
  pct: number
}

export async function isWhisperDownloaded(): Promise<boolean> {
  const info = await FileSystem.getInfoAsync(modelPath())
  return info.exists && (info.size ?? 0) > 100 * 1024 * 1024
}

let _resumable: FileSystem.DownloadResumable | null = null

// Legacy model filenames from earlier builds. Purged on first base-model
// download so an older ~75 MB tiny model doesn't sit on disk forever.
const LEGACY_MODEL_FILENAMES = ["ggml-tiny.bin", "ggml-tiny.en.bin"] as const

async function purgeLegacyModels(): Promise<void> {
  for (const name of LEGACY_MODEL_FILENAMES) {
    const path = `${FileSystem.documentDirectory}${name}`
    await FileSystem.deleteAsync(path, { idempotent: true }).catch(() => {})
  }
}

export async function downloadWhisper(
  onProgress: (p: DownloadProgress) => void,
): Promise<{ ok: true } | { ok: false; error: string }> {
  if (_resumable) return { ok: false, error: "A download is already in progress." }
  try {
    const dest = modelPath()
    const existing = await FileSystem.getInfoAsync(dest)
    if (existing.exists && (existing.size ?? 0) > 100 * 1024 * 1024) return { ok: true }
    await purgeLegacyModels()
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
    // Invalidate any context bound to a previous model file.
    await unloadWhisper()
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

/**
 * Pre-load the native Whisper context if the model is downloaded. Used on app
 * boot so the first transcribe doesn't pay the cold-start cost. No-op if the
 * model isn't present yet. Swallows errors — pre-warm is best-effort.
 */
export async function prewarmWhisper(): Promise<void> {
  try {
    if (!(await isWhisperDownloaded())) return
    await getCtx()
  } catch {
    /* best-effort */
  }
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

// Domain-priming prompt: biases Whisper's decoder toward payment vocabulary.
// Without a priming context, smaller Whisper models drift to non-speech
// caption tokens ([BANG], [MUSIC]) when confidence drops; domain words keep
// the decoder anchored on real speech tokens.
const WHISPER_PROMPT =
  "Voice commands for a payment app. Examples: " +
  "pay alice 5 usdc privately. send 10 usdc to bob. " +
  "transfer 50 usdc to charlie for rent. " +
  "pay maria 5 usdc privately. send 2 usdc to dave."

/**
 * Trim this many ms off the end of the audio before sending to Whisper.
 * The recorder captures a brief tail after the user taps stop — including the
 * physical mouse-click / touch transient. That click is the loudest impulse in
 * the file, and Whisper latches onto it, outputting [BANG] / [GUNSHOT] /
 * [MUSIC] instead of transcribing the speech that came before. 600 ms covers
 * emulator audio-routing latency where the cut-off click runs longer than
 * native device recordings.
 */
const TAIL_TRIM_MS = 600
/**
 * Head trim disabled. A non-zero head trim cuts the first phoneme on users
 * who start speaking the instant they tap record, which leaves Whisper with
 * no syllable anchor and produces single-letter hallucinations. The opening
 * click is quieter than the closing one and doesn't trigger the same
 * non-speech-caption failure mode, so leaving it in the audio is safe.
 */
const HEAD_TRIM_MS = 0

// Whisper emits captions for non-speech events using three different
// conventions depending on which training corpus it draws from:
//   transcript style:  [Gunshot]  [BANG]  [Music]  [Applause]
//   subtitle style:    (laughter)  (sounds of a gunshot)
//   chat/markdown:     *Sounds of a car crash*  **MUSIC**
// When the entire transcript is just one of these captions, the model didn't
// actually hear speech — treat as empty instead of pasting the tag into the
// intent field.
const SOUND_TAG_PATTERNS: RegExp[] = [
  /\[[^\]]*\]/g, // [Gunshot]
  /\([^)]*\)/g, // (laughter)
  /\*+[^*\n]+\*+/g, // *Sounds of a car crash* or **MUSIC**
]
function stripSoundTags(text: string): string {
  let out = text
  for (const re of SOUND_TAG_PATTERNS) out = out.replace(re, "")
  return out.trim()
}

// Detect Whisper's degenerate outputs:
//   - Single-char/short transcripts ("e", "ah") — model found a token but
//     couldn't anchor a phrase; useless for intent parsing.
//   - Repetition loops ("sssssss", "you you you") — decoder stuck in a
//     low-entropy attractor.
// We reject these and let the caller retry with a different sampling strategy
// or surface "didn't catch that" to the user.
function isDegenerateOutput(text: string): boolean {
  const t = text.trim()
  const stripped = t.replace(/[\s.,!?]/g, "")
  if (stripped.length === 0) return true
  // Too short to be a usable intent fragment — minimum is something like "pay".
  if (stripped.length < 3) return true
  // Single character repeated (sssss, aaaaa)
  if (/^(.)\1{2,}$/.test(stripped)) return true
  // Single short word repeated (you you you, the the the)
  const words = t.toLowerCase().split(/\s+/).filter(Boolean)
  if (words.length >= 3 && new Set(words).size === 1) return true
  return false
}

type TranscribePass = "primary" | "retry-no-prompt"

async function runTranscribe(
  audioPath: string,
  recordingDurationMs?: number,
  pass: TranscribePass = "primary",
): Promise<string> {
  const ctx = await getCtx()
  const langId = await getActiveLanguage()
  const lang = VOICE_LANGUAGES.find((l) => l.id === langId)
  const info = await FileSystem.getInfoAsync(audioPath).catch(() => null)
  const startedAt = Date.now()
  // Cap duration so the trailing click is excluded. Whisper's `duration` is
  // ms of audio to process from offset (default offset 0).
  const totalTrim = HEAD_TRIM_MS + TAIL_TRIM_MS
  const trimmedDurationMs =
    recordingDurationMs && recordingDurationMs > totalTrim
      ? recordingDurationMs - totalTrim
      : undefined
  if (__DEV__) {
    console.log("[Kumo] whisper transcribe — input:", {
      audioPath,
      sizeBytes: info?.exists ? info.size : null,
      language: lang?.whisperCode ?? "en",
      recordingDurationMs,
      headTrimMs: trimmedDurationMs ? HEAD_TRIM_MS : 0,
      trimmedDurationMs,
      pass,
    })
  }
  // Greedy sampling with temperature fallback. whisper.cpp internally re-decodes
  // at temperature + temperatureInc, + 2*temperatureInc, … up to 1.0 when it
  // detects a low-entropy / high-compression-ratio output (the "ssssss" loop).
  // Beam search would *disable* that fallback, so we use bestOf=2 + greedy.
  const transcribeOpts: Record<string, unknown> = {
    language: lang?.whisperCode ?? "en",
    maxLen: 0,
    temperature: 0,
    temperatureInc: 0.2,
    beamSize: 1,
    bestOf: 2,
  }
  // The domain prompt biases toward payment vocabulary but can also lock the
  // decoder into a bad attractor on near-silent audio. Drop it on retry.
  if (pass === "primary") transcribeOpts.prompt = WHISPER_PROMPT
  if (trimmedDurationMs) {
    transcribeOpts.offset = HEAD_TRIM_MS
    transcribeOpts.duration = trimmedDurationMs
  }
  const { promise } = ctx.transcribe(
    audioPath,
    transcribeOpts as Parameters<typeof ctx.transcribe>[1],
  )
  const out = await promise
  const raw = (out.result ?? "").trim()
  const cleaned = stripSoundTags(raw)
  if (__DEV__) {
    console.log("[Kumo] whisper transcribe — result:", {
      rawResult: out.result,
      cleaned,
      elapsedMs: Date.now() - startedAt,
      segments: (out as { segments?: unknown[] }).segments?.length ?? null,
      pass,
    })
  }
  // Either a pure sound-tag transcript ("[Gunshot]") or a repetition loop
  // ("sssss") means the audio didn't carry speech the decoder could lock
  // onto. Retry once without the priming prompt; if that still degenerates,
  // surface empty so the UI can prompt the user to try again.
  if (cleaned.length === 0 || isDegenerateOutput(cleaned)) {
    if (pass === "primary") {
      if (__DEV__) {
        console.log("[Kumo] whisper transcribe — degenerate output, retrying without prompt")
      }
      return runTranscribe(audioPath, recordingDurationMs, "retry-no-prompt")
    }
    return ""
  }
  return cleaned
}

/** Transcribe a recorded audio file to text using the local Whisper model. */
export async function transcribeAudio(
  audioPath: string,
  recordingDurationMs?: number,
): Promise<string> {
  try {
    return await runTranscribe(audioPath, recordingDurationMs)
  } catch (e) {
    // The native Whisper context can be torn down by Metro hot-reload or OS
    // memory reclaim while our JS-side `_ctx` still holds a stale pointer.
    // The native code reports this as "Context not found for id: <X>" — recover
    // by dropping the stale handle and re-initializing once.
    const msg = e instanceof Error ? e.message : String(e)
    if (/context not found/i.test(msg)) {
      _ctx = null
      return runTranscribe(audioPath, recordingDurationMs)
    }
    throw e
  }
}
