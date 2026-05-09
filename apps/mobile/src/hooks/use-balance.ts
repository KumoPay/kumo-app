import { useEffect, useRef, useState } from "react"
import AsyncStorage from "@react-native-async-storage/async-storage"
import { PublicKey, type Connection } from "@solana/web3.js"
import { USDC_MINT_DEVNET } from "@kumo/shared"

import { useConnection } from "./use-connection"

const TOKEN_PROGRAM_ID = new PublicKey("TokenkegQfeZyiNwAJbNbGKPFXCWuBvf9Ss623VQ5DA")

export type BalanceState = {
  usdc: number | null
  sol: number | null
  loading: boolean
  error: string | null
  /** True when usdc/sol came from cache because the live fetch failed (offline). */
  cached: boolean
  /** ms epoch of the last successful fetch (live or cached). null when never fetched. */
  fetchedAt: number | null
}

type CachedBalance = { usdc: number; sol: number; fetchedAt: number }

function cacheKey(pubkey: string): string {
  return `kumo.balance.cache.v1:${pubkey}`
}

async function readCache(pubkey: string): Promise<CachedBalance | null> {
  try {
    const raw = await AsyncStorage.getItem(cacheKey(pubkey))
    if (!raw) return null
    const parsed: unknown = JSON.parse(raw)
    if (
      parsed &&
      typeof parsed === "object" &&
      typeof (parsed as CachedBalance).usdc === "number" &&
      typeof (parsed as CachedBalance).sol === "number" &&
      typeof (parsed as CachedBalance).fetchedAt === "number"
    ) {
      return parsed as CachedBalance
    }
  } catch {
    /* ignore */
  }
  return null
}

async function writeCache(pubkey: string, value: CachedBalance): Promise<void> {
  await AsyncStorage.setItem(cacheKey(pubkey), JSON.stringify(value)).catch(() => {})
}

async function readUsdcBalance(connection: Connection, owner: PublicKey): Promise<number> {
  const mint = new PublicKey(USDC_MINT_DEVNET)
  const accs = await connection.getParsedTokenAccountsByOwner(owner, {
    programId: TOKEN_PROGRAM_ID,
  })
  let total = 0
  for (const acc of accs.value) {
    const info = acc.account.data.parsed?.info
    if (info?.mint !== mint.toBase58()) continue
    const ui = info.tokenAmount?.uiAmount
    if (typeof ui === "number") total += ui
  }
  return total
}

export function useBalance(pubkey: string | null, pollMs = 30_000): BalanceState {
  const { connection } = useConnection()
  const [state, setState] = useState<BalanceState>({
    usdc: null,
    sol: null,
    loading: true,
    error: null,
    cached: false,
    fetchedAt: null,
  })
  const cancelled = useRef(false)

  useEffect(() => {
    cancelled.current = false
    if (!pubkey) {
      setState({
        usdc: null,
        sol: null,
        loading: false,
        error: null,
        cached: false,
        fetchedAt: null,
      })
      return () => {
        cancelled.current = true
      }
    }
    let owner: PublicKey
    try {
      owner = new PublicKey(pubkey)
    } catch {
      setState({
        usdc: null,
        sol: null,
        loading: false,
        error: "invalid pubkey",
        cached: false,
        fetchedAt: null,
      })
      return () => {
        cancelled.current = true
      }
    }

    // Hydrate from cache immediately so the UI has something to show before/while fetching.
    void (async () => {
      const cached = await readCache(pubkey)
      if (cancelled.current || !cached) return
      setState((s) =>
        s.fetchedAt === null
          ? {
              usdc: cached.usdc,
              sol: cached.sol,
              loading: true,
              error: null,
              cached: true,
              fetchedAt: cached.fetchedAt,
            }
          : s,
      )
    })()

    const fetchOnce = async () => {
      try {
        const [usdc, lamports] = await Promise.all([
          readUsdcBalance(connection, owner),
          connection.getBalance(owner, "confirmed"),
        ])
        if (cancelled.current) return
        const sol = lamports / 1e9
        const fetchedAt = Date.now()
        setState({ usdc, sol, loading: false, error: null, cached: false, fetchedAt })
        void writeCache(pubkey, { usdc, sol, fetchedAt })
      } catch (e) {
        if (cancelled.current) return
        // Live fetch failed — fall back to cache so the user keeps seeing something.
        const cached = await readCache(pubkey)
        if (cancelled.current) return
        if (cached) {
          setState({
            usdc: cached.usdc,
            sol: cached.sol,
            loading: false,
            error: e instanceof Error ? e.message : "offline",
            cached: true,
            fetchedAt: cached.fetchedAt,
          })
        } else {
          setState((s) => ({
            ...s,
            loading: false,
            error: e instanceof Error ? e.message : "balance fetch failed",
          }))
        }
      }
    }

    void fetchOnce()
    const id = setInterval(() => void fetchOnce(), pollMs)
    return () => {
      cancelled.current = true
      clearInterval(id)
    }
  }, [connection, pubkey, pollMs])

  return state
}
