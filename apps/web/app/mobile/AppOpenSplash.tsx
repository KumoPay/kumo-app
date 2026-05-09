"use client"

import Image from "next/image"
import { useEffect, useRef, useState } from "react"
import { motion, useReducedMotion } from "framer-motion"

const HOLD_MS = 2650
const EXIT_MS = 720

type AppOpenSplashProps = {
  onDismiss: () => void
}

/** Full-screen lilac intro after wallet is available (session restore or first connect). */
export function AppOpenSplash({ onDismiss }: AppOpenSplashProps) {
  const reduceMotion = useReducedMotion()
  const [phase, setPhase] = useState<"in" | "out">("in")
  const dismissed = useRef(false)

  useEffect(() => {
    if (reduceMotion) {
      const t = window.setTimeout(() => {
        if (!dismissed.current) {
          dismissed.current = true
          onDismiss()
        }
      }, 520)
      return () => window.clearTimeout(t)
    }
    const t = window.setTimeout(() => setPhase("out"), HOLD_MS)
    return () => window.clearTimeout(t)
  }, [onDismiss, reduceMotion])

  useEffect(() => {
    if (phase !== "out") return
    const t = window.setTimeout(() => {
      if (!dismissed.current) {
        dismissed.current = true
        onDismiss()
      }
    }, EXIT_MS)
    return () => window.clearTimeout(t)
  }, [phase, onDismiss])

  return (
    <motion.div
      className="fixed inset-0 z-[100] flex flex-col items-center justify-center px-6"
      style={{
        background: "#f3f0ff",
      }}
      initial={reduceMotion ? { opacity: 1 } : { opacity: 0 }}
      animate={
        reduceMotion
          ? { opacity: 1 }
          : phase === "in"
            ? { opacity: 1, scale: 1, filter: "blur(0px)" }
            : { opacity: 0, scale: 1.035, filter: "blur(10px)" }
      }
      transition={{
        duration: reduceMotion ? 0 : phase === "out" ? EXIT_MS / 1000 : 0.62,
        ease: [0.22, 1, 0.36, 1],
      }}
    >
      <div className="relative flex flex-col items-center gap-3">
        <motion.div
          initial={reduceMotion ? false : { opacity: 0, y: 16, scale: 0.94 }}
          animate={reduceMotion ? {} : { opacity: 1, y: 0, scale: 1 }}
          transition={{
            delay: reduceMotion ? 0 : 0.05,
            duration: reduceMotion ? 0 : 0.6,
            ease: [0.22, 1, 0.36, 1],
          }}
          className="motion-safe:animate-breathe flex justify-center"
        >
          <Image
            src="/state-00.png"
            alt=""
            width={160}
            height={160}
            priority
            className="relative z-[1] h-auto w-[clamp(100px,30vw,128px)] object-contain drop-shadow-[0_14px_40px_rgba(76,29,149,0.22)]"
            draggable={false}
          />
        </motion.div>

        <motion.div
          className="flex w-full max-w-[min(82vw,272px)] flex-col items-center justify-center"
          initial={reduceMotion ? false : { opacity: 0, y: 20 }}
          animate={reduceMotion ? {} : { opacity: 1, y: 0 }}
          transition={{
            delay: reduceMotion ? 0 : 0.14,
            duration: reduceMotion ? 0 : 0.58,
            ease: [0.22, 1, 0.36, 1],
          }}
        >
          <Image
            src="/logo-sec-02.png"
            alt="KumoPay"
            width={480}
            height={104}
            priority
            className="h-auto w-full max-w-[248px] origin-center scale-x-[0.97] object-contain object-center drop-shadow-[0_8px_26px_rgba(30,27,75,0.14)] -translate-x-[4px]"
            draggable={false}
          />
        </motion.div>
      </div>
    </motion.div>
  )
}
