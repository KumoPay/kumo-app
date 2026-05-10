import { Buffer } from "buffer"
import * as BackgroundTask from "expo-background-task"
import * as TaskManager from "expo-task-manager"
import { Connection } from "@solana/web3.js"

import { MAGICBLOCK_TEE_RPC, SOLANA_RPC } from "./config"
import { notifyPaymentFailed, notifyPaymentSent } from "./notify"
import { appendHistory, updateHistoryStatus } from "../screens/history-store"
import { listQueue, removeFromQueue } from "../screens/queue-store"

export const BROADCAST_TASK = "kumo.broadcast.queue.v1"

let registered = false

async function drainOnce(): Promise<BackgroundTask.BackgroundTaskResult> {
  const queue = await listQueue()
  const pending = queue.filter((q) => q.signedTxBase64)
  if (pending.length === 0) return BackgroundTask.BackgroundTaskResult.Success

  const baseConn = new Connection(SOLANA_RPC, "confirmed")
  const tee = new Connection(MAGICBLOCK_TEE_RPC, "confirmed")

  for (const q of pending) {
    try {
      const txBytes = Buffer.from(q.signedTxBase64!, "base64")
      const conn = q.sendTo === "ephemeral" ? tee : baseConn
      const signature = await conn.sendRawTransaction(txBytes)
      const entry = await appendHistory({
        direction: "out",
        counterparty: q.intent.recipient,
        amount: q.intent.amount_usdc,
        signature,
        status: "queued",
        sendTo: q.sendTo ?? "base",
      })
      await removeFromQueue(q.id)
      await notifyPaymentSent({
        amountUsdc: q.intent.amount_usdc,
        recipient: q.intent.recipient,
        signature,
      })
      void conn
        .confirmTransaction(signature, "confirmed")
        .then(() => updateHistoryStatus(entry.id, { status: "delivered" }))
        .catch((e) => {
          const reason = e instanceof Error ? e.message : String(e)
          void updateHistoryStatus(entry.id, { status: "failed", failureReason: reason })
        })
    } catch (e) {
      const reason = e instanceof Error ? e.message : String(e)
      await notifyPaymentFailed({
        amountUsdc: q.intent.amount_usdc,
        recipient: q.intent.recipient,
        reason,
      })
    }
  }
  return BackgroundTask.BackgroundTaskResult.Success
}

TaskManager.defineTask(BROADCAST_TASK, async () => {
  try {
    return await drainOnce()
  } catch {
    return BackgroundTask.BackgroundTaskResult.Failed
  }
})

export async function registerBroadcastTask(): Promise<void> {
  if (registered) return
  registered = true
  try {
    const status = await BackgroundTask.getStatusAsync()
    if (status === BackgroundTask.BackgroundTaskStatus.Restricted) return
    const isRegistered = await TaskManager.isTaskRegisteredAsync(BROADCAST_TASK)
    if (isRegistered) return
    await BackgroundTask.registerTaskAsync(BROADCAST_TASK, {
      minimumInterval: 15,
    })
  } catch {
    /* registration is best-effort */
  }
}
