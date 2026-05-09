import { useMemo } from "react"
import { Connection } from "@solana/web3.js"
import { SOLANA_RPC } from "../lib/config"

let cached: Connection | null = null

/** Memoized Connection to the configured Solana RPC. */
export function useConnection(): { connection: Connection } {
  const connection = useMemo(() => {
    if (cached) return cached
    cached = new Connection(SOLANA_RPC, "confirmed")
    return cached
  }, [])
  return { connection }
}
