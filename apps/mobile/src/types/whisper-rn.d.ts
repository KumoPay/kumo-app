declare module "whisper.rn" {
  export type WhisperContext = {
    transcribe: (
      audioPath: string,
      options?: {
        language?: string
        maxLen?: number
      },
    ) => {
      promise: Promise<{ result?: string }>
    }
    release: () => Promise<void>
  }

  export function initWhisper(options: {
    filePath: string
  }): Promise<WhisperContext>
}
