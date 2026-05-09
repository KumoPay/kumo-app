"use client"

import Image from "next/image"

type Expression = "cheerful" | "curious" | "concentrating" | "sleeping" | "celebrating"

const CYAN = "#7FE8FF"
const LILAC = "#C7B5FF"

/**
 * Single source of truth for the Kumo mascot. Always renders the brand
 * PNG; per-state decoration (signal waves, sleep Zs, sparkles) is layered
 * around it so every screen feels different without changing the pet.
 */
export function KumoMascot({
  size = 200,
  expression = "cheerful",
  waves = false,
  sparkles = false,
  sleepZ = false,
}: {
  size?: number
  expression?: Expression
  waves?: boolean
  sparkles?: boolean
  sleepZ?: boolean
}) {
  // Reserve a square box; overlays are absolutely positioned outside the image.
  const pad = waves || sparkles || sleepZ ? Math.round(size * 0.18) : 0
  const box = size + pad * 2

  return (
    <div
      style={{
        width: box,
        height: box,
        position: "relative",
        display: "inline-block",
        pointerEvents: "none",
      }}
      aria-hidden={expression ? undefined : true}
      role={expression ? "img" : undefined}
      aria-label={expression ? `Kumo mascot — ${expression}` : undefined}
    >
      {/* Signal waves — radio rings emanating from upper-left "ear" */}
      {waves && (
        <svg
          width={box}
          height={box}
          viewBox={`0 0 ${box} ${box}`}
          style={{ position: "absolute", inset: 0 }}
        >
          <circle cx={box * 0.28} cy={box * 0.32} r={size * 0.07} fill="none" stroke={CYAN} strokeWidth="2.5" className="animate-wave" />
          <circle cx={box * 0.28} cy={box * 0.32} r={size * 0.07} fill="none" stroke={CYAN} strokeWidth="2.5" className="animate-wave [animation-delay:0.8s]" />
          <circle cx={box * 0.28} cy={box * 0.32} r={size * 0.07} fill="none" stroke={CYAN} strokeWidth="2.5" className="animate-wave [animation-delay:1.6s]" />
        </svg>
      )}

      {/* Sleeping Z's drifting up from upper-right */}
      {sleepZ && (
        <svg
          width={box}
          height={box}
          viewBox={`0 0 ${box} ${box}`}
          style={{ position: "absolute", inset: 0 }}
        >
          <text x={box * 0.72} y={box * 0.30} fill={LILAC} fontFamily="Nunito Sans, system-ui, sans-serif" fontSize={size * 0.10} fontWeight="900" className="animate-zfloat">z</text>
          <text x={box * 0.78} y={box * 0.22} fill={LILAC} fontFamily="Nunito Sans, system-ui, sans-serif" fontSize={size * 0.09} fontWeight="900" className="animate-zfloat [animation-delay:1.1s]">z</text>
          <text x={box * 0.84} y={box * 0.14} fill={LILAC} fontFamily="Nunito Sans, system-ui, sans-serif" fontSize={size * 0.08} fontWeight="900" className="animate-zfloat [animation-delay:2.2s]">z</text>
        </svg>
      )}

      {/* Celebration sparkles around the perimeter */}
      {sparkles && (
        <svg
          width={box}
          height={box}
          viewBox={`0 0 ${box} ${box}`}
          style={{ position: "absolute", inset: 0 }}
        >
          {(
            [
              [box * 0.18, box * 0.30, CYAN, "animate-twinkle"],
              [box * 0.85, box * 0.32, LILAC, "animate-twinkle [animation-delay:0.6s]"],
              [box * 0.88, box * 0.72, CYAN, "animate-twinkle [animation-delay:1.2s]"],
              [box * 0.14, box * 0.74, LILAC, "animate-twinkle [animation-delay:0.3s]"],
            ] as Array<[number, number, string, string]>
          ).map(([cx, cy, color, cls], i) => (
            <g key={i} transform={`translate(${cx} ${cy})`} className={cls}>
              <path d="M0 -8 L2 -2 L8 0 L2 2 L0 8 L-2 2 L-8 0 L-2 -2 Z" fill={color} />
            </g>
          ))}
        </svg>
      )}

      {/* The pet itself */}
      <Image
        src="/kumo-mascot.png"
        alt={`Kumo mascot — ${expression}`}
        width={size}
        height={size}
        priority={size >= 140}
        style={{
          position: "absolute",
          left: pad,
          top: pad,
          width: size,
          height: size,
          objectFit: "contain",
        }}
      />
    </div>
  )
}

/**
 * Small inline mark (top nav, headers, footers). Same pet, scaled down.
 */
export function KumoMark({ size = 28 }: { size?: number }) {
  return (
    <Image
      src="/kumo-mascot.png"
      alt=""
      width={size}
      height={size}
      style={{ width: size, height: size, objectFit: "contain", display: "inline-block", verticalAlign: "middle" }}
    />
  )
}
