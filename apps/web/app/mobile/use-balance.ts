"use client"

import { useEffect, useRef, useState } from "react"
import { useConnection } from "@solana/wallet-adapter-react"
import { PublicKey, type Connection } from "@solana/web3.js"
import { USDC_MINT_DEVNET } from "@kumo/shared"

const TOKEN_PROGRAM_ID = new PublicKey("TokenkegQfeZyiNwAJbNbGKPFXCWuBvf9Ss623VQ5DA")

type BalanceState = {
  /** USDC token balance (e.g. 24.5 for 24.5 USDC). null while loading or on error. */
  usdc: number | null
  /** SOL balance, lamports / 1e9. null while loading or on error. */
  sol: number | null
  loading: boolean
  error: string | null
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

/** Live USDC + SOL balance for an address. Polls every `pollMs` while mounted. */
export function useBalance(pubkey: string | null, pollMs = 30_000): BalanceState {
  const { connection } = useConnection()
  const [state, setState] = useState<BalanceState>({
    usdc: null,
    sol: null,
    loading: true,
    error: null,
  })
  const cancelled = useRef(false)

  useEffect(() => {
    cancelled.current = false
    if (!pubkey) {
      setState({ usdc: null, sol: null, loading: false, error: null })
      return () => {
        cancelled.current = true
      }
    }
    let owner: PublicKey
    try {
      owner = new PublicKey(pubkey)
    } catch {
      setState({ usdc: null, sol: null, loading: false, error: "invalid pubkey" })
      return () => {
        cancelled.current = true
      }
    }

    const fetchOnce = async () => {
      try {
        const [usdc, lamports] = await Promise.all([
          readUsdcBalance(connection, owner),
          connection.getBalance(owner, "confirmed"),
        ])
        if (cancelled.current) return
        setState({ usdc, sol: lamports / 1e9, loading: false, error: null })
      } catch (e) {
        if (cancelled.current) return
        setState((s) => ({ ...s, loading: false, error: e instanceof Error ? e.message : "balance fetch failed" }))
      }
    }

    void fetchOnce()
    const id = window.setInterval(() => void fetchOnce(), pollMs)
    return () => {
      cancelled.current = true
      window.clearInterval(id)
    }
  }, [connection, pubkey, pollMs])

  return state
}
