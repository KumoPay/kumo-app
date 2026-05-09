import * as FileSystem from "expo-file-system/legacy"
import AsyncStorage from "@react-native-async-storage/async-storage"
import { initLlama, type LlamaContext } from "llama.rn"
import { PaymentIntentSchema, SYSTEM_PROMPT_INTENT_PARSER, type PaymentIntent } from "@kumo/shared"

// Same model QVAC ships by default. Q4_0 quant of Llama 3.2 1B Instruct.
// HuggingFace's `unsloth` repo is public (no auth needed). ~770MB.
const MODEL_URL =
  "https://huggingface.co/unsloth/Llama-3.2-1B-Instruct-GGUF/resolve/main/Llama-3.2-1B-Instruct-Q4_0.gguf?download=true"
const MODEL_FILENAME = "Llama-3.2-1B-Instruct-Q4_0.gguf"
const MODEL_SIZE_BYTES = 770_000_000 // approx, used for progress display fallback
const PREF_KEY_ENABLED = "kumo.localAI.enabled"

function modelPath(): string {
  return `${FileSystem.documentDirectory}${MODEL_FILENAME}`
}

export const LOCAL_AI = {
  modelName: "Llama 3.2 1B Instruct (Q4_0)",
  estimatedSizeBytes: MODEL_SIZE_BYTES,
  estimatedSizeLabel: "~770 MB",
} as const

export async function isModelDownloaded(): Promise<boolean> {
  const info = await FileSystem.getInfoAsync(modelPath())
  return info.exists && (info.size ?? 0) > 100 * 1024 * 1024 // sanity floor
}

export async function getDownloadedSize(): Promise<number> {
  const info = await FileSystem.getInfoAsync(modelPath())
  return info.exists ? (info.size ?? 0) : 0
}

export type DownloadProgress = {
  bytesWritten: number
  totalBytes: number
  pct: number
}

let _resumable: FileSystem.DownloadResumable | null = null

export async function downloadModel(
  onProgress: (p: DownloadProgress) => void,
): Promise<{ ok: true } | { ok: false; error: string }> {
  if (_resumable) return { ok: false, error: "A download is already in progress." }
  try {
    const dest = modelPath()
    const existing = await FileSystem.getInfoAsync(dest)
    if (existing.exists && (existing.size ?? 0) > 100 * 1024 * 1024) return { ok: true }

    _resumable = FileSystem.createDownloadResumable(
      MODEL_URL,
      dest,
      {},
      (p) => {
        const total = p.totalBytesExpectedToWrite || MODEL_SIZE_BYTES
        const pct = total > 0 ? p.totalBytesWritten / total : 0
        onProgress({
          bytesWritten: p.totalBytesWritten,
          totalBytes: total,
          pct,
        })
      },
    )
    const result = await _resumable.downloadAsync()
    _resumable = null
    if (!result) return { ok: false, error: "Download cancelled." }
    return { ok: true }
  } catch (e) {
    _resumable = null
    return { ok: false, error: e instanceof Error ? e.message : "download failed" }
  }
}

export async function cancelDownload(): Promise<void> {
  if (!_resumable) return
  try {
    await _resumable.pauseAsync()
  } catch {
    /* ignore */
  }
  _resumable = null
}

export async function deleteModel(): Promise<void> {
  await FileSystem.deleteAsync(modelPath(), { idempotent: true }).catch(() => {})
  await unloadInference()
}

export async function setLocalAIEnabled(v: boolean): Promise<void> {
  await AsyncStorage.setItem(PREF_KEY_ENABLED, v ? "1" : "0").catch(() => {})
}

export async function isLocalAIEnabled(): Promise<boolean> {
  return (await AsyncStorage.getItem(PREF_KEY_ENABLED).catch(() => null)) === "1"
}

// --- inference ---------------------------------------------------------

let _ctx: LlamaContext | null = null

export async function initInference(): Promise<LlamaContext> {
  if (_ctx) return _ctx
  if (!(await isModelDownloaded())) {
    throw new Error("Local model not downloaded yet.")
  }
  _ctx = await initLlama({
    model: modelPath(),
    n_ctx: 1024,
    n_threads: 2, // emulator has limited cores
  })
  return _ctx
}

export async function unloadInference(): Promise<void> {
  if (!_ctx) return
  try {
    await _ctx.release()
  } catch {
    /* ignore */
  }
  _ctx = null
}

/** Run on-device intent parsing using QVAC's system prompt. Returns the parsed intent. */
export async function parseIntentLocal(text: string): Promise<PaymentIntent> {
  const ctx = await initInference()
  const completion = await ctx.completion({
    messages: [
      { role: "system", content: SYSTEM_PROMPT_INTENT_PARSER },
      { role: "user", content: text },
    ],
    n_predict: 200,
    temperature: 0.0,
    stop: ["\n\n", "</s>"],
  })
  const out = (completion.text ?? "").trim()
  // The model is told to output a single JSON object. Extract the first {...} block.
  const m = out.match(/\{[^{}]*\}/s)
  if (!m) throw new Error(`Local model did not return JSON: ${out.slice(0, 120)}`)
  let parsed: unknown
  try {
    parsed = JSON.parse(m[0])
  } catch {
    throw new Error(`Local model returned invalid JSON: ${m[0].slice(0, 120)}`)
  }
  return PaymentIntentSchema.parse(parsed)
}
