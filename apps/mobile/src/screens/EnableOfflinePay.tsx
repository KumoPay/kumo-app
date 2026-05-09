import { useEffect, useState } from "react"
import { ActivityIndicator, StyleSheet, Text, View } from "react-native"

import { Eyebrow, PrimaryCTA, SecondaryCTA } from "./atoms"
import { useBalance } from "../hooks/use-balance"
import { useConnection } from "../hooks/use-connection"
import {
  createNonceAccount,
  getNonceRentLamports,
  getNonceSetup,
} from "../lib/durable-nonce"
import { K, SHADOW } from "./theme"
import type { NavCtx, ScreenRenderer } from "./types"

const LAMPORTS_PER_SOL = 1_000_000_000
/** Rough headroom over rent for the network fee on the create tx. */
const FEE_HEADROOM_LAMPORTS = 5_000

export const EnableOfflinePay: ScreenRenderer = (ctx) => ({
  body: <EnableOfflinePayBody ctx={ctx} />,
})

function EnableOfflinePayBody({ ctx }: { ctx: NavCtx }) {
  const { connection } = useConnection()
  const balance = useBalance(ctx.wallet?.pubkey ?? null)

  const [setup, setSetup] = useState<Awaited<ReturnType<typeof getNonceSetup>>>(null)
  const [rent, setRent] = useState<number | null>(null)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [done, setDone] = useState(false)

  useEffect(() => {
    void (async () => {
      setSetup(await getNonceSetup())
      try {
        setRent(await getNonceRentLamports(connection))
      } catch {
        /* keep rent null; UI shows estimate */
      }
    })()
  }, [connection])

  const rentSol = (rent ?? 1_500_000) / LAMPORTS_PER_SOL
  const totalNeededLamports = (rent ?? 1_500_000) + FEE_HEADROOM_LAMPORTS
  const userLamports = balance.sol == null ? null : Math.round(balance.sol * LAMPORTS_PER_SOL)
  const enoughBalance = userLamports == null ? null : userLamports >= totalNeededLamports

  async function onSetup() {
    if (!ctx.wallet) {
      setError("Connect a wallet first.")
      return
    }
    if (!ctx.signTransactionRaw) {
      setError("Wallet does not support signTransaction.")
      return
    }
    setError(null)
    setBusy(true)
    try {
      const result = await createNonceAccount({
        connection,
        walletPubkey: new (await import("@solana/web3.js")).PublicKey(ctx.wallet.pubkey),
        signTransaction: ctx.signTransactionRaw,
      })
      setSetup({
        noncePubkey: result.noncePubkey,
        authority: ctx.wallet.pubkey,
        cached: { value: result.cachedNonce, refreshedAt: Date.now() },
      })
      setDone(true)
    } catch (e) {
      const msg = e instanceof Error ? e.message : String(e)
      if (!/cancel|reject/i.test(msg)) setError(msg)
    } finally {
      setBusy(false)
    }
  }

  if (done || setup?.cached) {
    return (
      <View style={{ paddingTop: 16 }}>
        <View style={styles.hero}>
          <Text style={{ fontSize: 64 }}>✈️</Text>
          <Text style={styles.h1}>Offline payments ready</Text>
          <Text style={styles.sub}>
            You can sign a payment without network and it will broadcast the moment you reconnect.
          </Text>
        </View>
        <View style={[styles.card, SHADOW.card]}>
          <Eyebrow>Nonce account</Eyebrow>
          <Text style={styles.mono} numberOfLines={1}>
            {setup?.noncePubkey?.slice(0, 8)}…{setup?.noncePubkey?.slice(-8)}
          </Text>
          <Text style={styles.metaSub}>Stored on-chain · advances each broadcast</Text>
        </View>
        <View style={{ marginTop: 18 }}>
          <PrimaryCTA onPress={ctx.resetHome}>Continue to Kumo</PrimaryCTA>
        </View>
      </View>
    )
  }

  return (
    <View style={{ paddingTop: 16 }}>
      <View style={styles.hero}>
        <Text style={{ fontSize: 64 }}>✈️</Text>
        <Text style={styles.h1}>Set up offline payments</Text>
        <Text style={styles.sub}>
          A one-time on-chain setup that lets you sign a payment now and broadcast it later — when you&apos;re back online.
        </Text>
      </View>

      <View style={[styles.card, SHADOW.card]}>
        <Eyebrow>One-time cost</Eyebrow>
        <Text style={styles.cost}>≈ {rentSol.toFixed(4)} SOL</Text>
        <Text style={styles.metaSub}>
          Rent for a Solana nonce account. You can recover it later by closing the account.
        </Text>

        {balance.sol != null ? (
          <View style={styles.balanceRow}>
            <Text style={styles.balanceLabel}>Your balance</Text>
            <Text
              style={[
                styles.balanceValue,
                { color: enoughBalance === false ? "#dc2626" : K.navy },
              ]}
            >
              {balance.sol.toFixed(4)} SOL
            </Text>
          </View>
        ) : null}

        {enoughBalance === false ? (
          <Text style={styles.lowBalance}>
            Not enough SOL. Top up via the Solana faucet, then try again.
          </Text>
        ) : null}
      </View>

      {error ? (
        <View style={styles.errorBox}>
          <Text style={styles.errorTitle}>// error</Text>
          <Text style={styles.errorText}>{error}</Text>
        </View>
      ) : null}

      <View style={{ marginTop: 18, gap: 10 }}>
        <PrimaryCTA
          busy={busy}
          disabled={enoughBalance === false || busy}
          onPress={onSetup}
        >
          {busy ? "Creating nonce account…" : "Set up"}
        </PrimaryCTA>
        {!busy && <SecondaryCTA onPress={ctx.resetHome}>Skip for now</SecondaryCTA>}
        {busy ? <ActivityIndicator color={K.lilac} /> : null}
      </View>

      <Text style={styles.fineprint}>
        Offline payments work in public mode only. Private (MagicBlock) payments still need a network connection.
      </Text>
    </View>
  )
}

const styles = StyleSheet.create({
  hero: { alignItems: "center", marginBottom: 18 },
  h1: { marginTop: 8, fontSize: 24, fontWeight: "900", color: K.navy, textAlign: "center" },
  sub: {
    marginTop: 8,
    paddingHorizontal: 16,
    textAlign: "center",
    fontSize: 13,
    color: K.navy60,
    lineHeight: 19,
  },
  card: {
    backgroundColor: K.white,
    borderRadius: 18,
    padding: 16,
  },
  cost: { marginTop: 6, fontSize: 22, fontWeight: "900", color: K.navy, letterSpacing: -0.4 },
  metaSub: { marginTop: 4, fontSize: 12, color: K.navy55, fontWeight: "600", lineHeight: 17 },
  balanceRow: {
    marginTop: 14,
    paddingTop: 14,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: K.divider,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  balanceLabel: { fontSize: 12, fontWeight: "700", color: K.navy55 },
  balanceValue: { fontSize: 14, fontWeight: "900", color: K.navy },
  lowBalance: {
    marginTop: 10,
    fontSize: 12,
    fontWeight: "700",
    color: "#dc2626",
    lineHeight: 17,
  },
  mono: { marginTop: 6, fontSize: 14, fontWeight: "800", color: K.navy },
  errorBox: {
    marginTop: 14,
    padding: 12,
    borderRadius: 12,
    backgroundColor: K.white,
    borderWidth: 1,
    borderColor: K.lilac,
  },
  errorTitle: {
    fontSize: 10,
    fontWeight: "900",
    letterSpacing: 1.6,
    textTransform: "uppercase",
    color: K.lilac,
    marginBottom: 4,
  },
  errorText: { color: K.navy80, fontSize: 12, lineHeight: 17 },
  fineprint: {
    marginTop: 14,
    paddingHorizontal: 12,
    textAlign: "center",
    fontSize: 11,
    color: K.navy55,
    fontWeight: "700",
    lineHeight: 16,
  },
})
