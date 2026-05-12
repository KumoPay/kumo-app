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
//
// Runs QVAC's reference Llama 3.2 1B Instruct (Q4_0) via llama.rn — the
// same llama.cpp engine the official @qvac/sdk wraps. We use llama.rn
// directly for Expo SDK 55 ABI compatibility; @qvac/sdk's Bare-runtime
// requirement (react-native-bare-kit) is incompatible with our setup and
// refuses to run on emulators.
//
// Output is grammar-constrained at sample time against PAYMENT_INTENT_JSON_SCHEMA,
// so the result is guaranteed to be valid JSON matching PaymentIntent
// without regex extraction or retry-on-malformed-output logic.

let _ctx: LlamaContext | null = null

// JSON Schema mirror of PaymentIntentSchema (packages/shared/src/payment-intent.ts).
// Hand-written rather than auto-converted from zod to keep the dependency
// surface small and the schema small enough to fit in llama.cpp's GBNF
// compiler comfortably. Keep in sync with the zod schema.
const PAYMENT_INTENT_JSON_SCHEMA = {
  type: "object",
  properties: {
    recipient: { type: "string", minLength: 1, maxLength: 64 },
    amount_usdc: { type: "number", exclusiveMinimum: 0, maximum: 1_000_000 },
    private: { type: "boolean" },
    memo: { type: "string", maxLength: 120 },
  },
  required: ["recipient", "amount_usdc", "private"],
  additionalProperties: false,
} as const

export async function initInference(): Promise<LlamaContext> {
  if (_ctx) return _ctx
  if (!(await isModelDownloaded())) {
    throw new Error("Local model not downloaded yet.")
  }
  // n_ctx 2048 leaves headroom over the ~600-token system prompt + user
  // utterance + JSON completion. n_threads omitted so llama.rn auto-picks
  // from the device's core count.
  _ctx = await initLlama({
    model: modelPath(),
    n_ctx: 2048,
  })
  return _ctx
}

/**
 * Pre-load the native llama context if the model is downloaded. Used on app
 * boot so the first parse doesn't pay the ~500ms-1s cold-start cost. No-op if
 * the model isn't present yet. Swallows errors — pre-warm is best-effort.
 */
export async function prewarmInference(): Promise<void> {
  try {
    if (!(await isModelDownloaded())) return
    await initInference()
  } catch {
    /* best-effort */
  }
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

/** Streaming progress event emitted as each token arrives from the local LLM. */
export type QvacStreamEvent = {
  /** Token text just produced. */
  token: string
  /** Total token count emitted so far in this completion. */
  tokenCount: number
  /** Decoded text accumulated so far. */
  text: string
  /** Tokens per second computed against the local clock. */
  tokensPerSec: number
  /** Wall-clock ms since the completion started. */
  elapsedMs: number
}

export type QvacStreamHandler = (event: QvacStreamEvent) => void

async function runCompletion(text: string, onStream?: QvacStreamHandler) {
  const ctx = await initInference()
  // Clear KV cache between intent parses. llama.rn's own docs say this is
  // required when reusing a context for unrelated conversations — without
  // it, the previous user's tokens leak into the next parse and can flip
  // booleans or smuggle recipient names across calls.
  try {
    await ctx.clearCache()
  } catch {
    /* method missing on older llama.rn — safe to skip */
  }
  const startedAt = Date.now()
  let tokenCount = 0
  let accText = ""
  return ctx.completion(
    {
      messages: [
        { role: "system", content: SYSTEM_PROMPT_INTENT_PARSER },
        { role: "user", content: text },
      ],
      // Use the GGUF's embedded Llama-3.2 chat template instead of llama.rn's
      // hand-rolled fallback. Removes a class of "model ignored the system
      // prompt because the role headers were malformed" bugs.
      jinja: true,
      // Grammar-constrained sampling: token-level enforcement that the output
      // matches PaymentIntent. The native side compiles this JSON schema to a
      // GBNF grammar and the sampler honours it.
      response_format: {
        type: "json_schema",
        json_schema: { schema: PAYMENT_INTENT_JSON_SCHEMA, strict: true },
      },
      // Fully deterministic: temperature 0 + top_k 1 means the model always
      // picks the argmax. Combined with the schema, parsing the same utterance
      // twice gives the same intent.
      temperature: 0.0,
      top_k: 1,
      n_predict: 200,
      stop: ["\n\n", "</s>"],
    },
    onStream
      ? (data) => {
          // llama.rn emits TokenData = { token: string }. Some builds also
          // include a probability vector; we only need the text.
          const tok = (data as { token?: string }).token ?? ""
          tokenCount += 1
          accText += tok
          const elapsedMs = Date.now() - startedAt
          const tokensPerSec =
            elapsedMs > 0 ? (tokenCount * 1000) / elapsedMs : 0
          onStream({
            token: tok,
            tokenCount,
            text: accText,
            tokensPerSec,
            elapsedMs,
          })
        }
      : undefined,
  )
}

/** Run on-device intent parsing using QVAC's system prompt. Returns the parsed intent. */
export async function parseIntentLocal(
  text: string,
  onStream?: QvacStreamHandler,
): Promise<PaymentIntent> {
  let completion
  try {
    completion = await runCompletion(text, onStream)
  } catch (e) {
    // The native llama context can be torn down by Metro hot-reload or OS
    // memory reclaim while our JS-side `_ctx` still holds a stale pointer.
    // The native code reports this as "Context not found" — recover by
    // dropping the stale handle and re-initializing once.
    const msg = e instanceof Error ? e.message : String(e)
    if (/context not found/i.test(msg)) {
      _ctx = null
      completion = await runCompletion(text, onStream)
    } else {
      throw e
    }
  }
  const out = (completion.text ?? "").trim()
  // Schema-constrained sampling guarantees the output is a valid JSON object
  // matching PaymentIntent — no regex extraction needed. We still parse with
  // zod as a belt-and-braces check (e.g. against a future llama.rn version
  // where the GBNF compiler stops honouring some constraint).
  let parsed: unknown
  try {
    parsed = JSON.parse(out)
  } catch {
    throw new Error(`Local model returned invalid JSON: ${out.slice(0, 120)}`)
  }
  return PaymentIntentSchema.parse(parsed)
}
