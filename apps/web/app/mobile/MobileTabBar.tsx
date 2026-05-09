"use client"

import type { ReactNode } from "react"

export type MobileTabId = "inicio" | "historial" | "contactos" | "ajustes"

const active = "#7c5cff"
const idle = "#94a3b8"

function Tab({
  label,
  selected,
  onClick,
  children,
}: {
  label: string
  selected: boolean
  onClick: () => void
  children: ReactNode
}) {
  const color = selected ? active : idle
  return (
    <button
      type="button"
      onClick={onClick}
      className="pressable flex min-w-0 flex-1 flex-col items-center justify-center gap-1 py-1.5"
    >
      <span className="flex h-[22px] items-center justify-center" style={{ color }}>
        {children}
      </span>
      <span
        className="max-w-full truncate text-[10px] font-bold leading-none tracking-tight"
        style={{ color }}
      >
        {label}
      </span>
    </button>
  )
}

export function MobileTabBar({
  activeTab,
  onInicio,
  onHistorial,
  onContactos,
  onAjustes,
}: {
  activeTab: MobileTabId
  onInicio: () => void
  onHistorial: () => void
  onContactos: () => void
  onAjustes: () => void
}) {
  return (
    <nav
      className="relative z-30 flex w-full flex-shrink-0 border-t border-[#eef0f3] bg-white px-1 pt-1"
      style={{
        paddingBottom: "max(10px, env(safe-area-inset-bottom))",
      }}
      aria-label="Main navigation"
    >
      <Tab label="Home" selected={activeTab === "inicio"} onClick={onInicio}>
        <svg width={22} height={22} viewBox="0 0 24 24" fill="none" aria-hidden>
          <path
            d="M3 10.5 12 3l9 7.5V20a1 1 0 0 1-1 1h-5v-6H9v6H4a1 1 0 0 1-1-1v-9.5Z"
            stroke="currentColor"
            strokeWidth={2}
            strokeLinejoin="round"
          />
        </svg>
      </Tab>
      <Tab
        label="History"
        selected={activeTab === "historial"}
        onClick={onHistorial}
      >
        <svg
          width={22}
          height={22}
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          aria-hidden
        >
          <circle cx="12" cy="12" r="9" strokeWidth={2} />
          <path d="M12 7v6l4 2" strokeWidth={2} strokeLinecap="round" />
        </svg>
      </Tab>
      <Tab label="Contacts" selected={activeTab === "contactos"} onClick={onContactos}>
        <svg width={22} height={22} viewBox="0 0 24 24" fill="none" stroke="currentColor" aria-hidden>
          <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" strokeWidth={2.2} strokeLinecap="round" strokeLinejoin="round" />
          <circle cx={9} cy={7} r={4} strokeWidth={2.2} />
          <path d="M23 21v-2a4 4 0 0 0-3-3.87" strokeWidth={2.2} strokeLinecap="round" strokeLinejoin="round" />
          <path d="M16 3.13a4 4 0 0 1 0 7.75" strokeWidth={2.2} strokeLinecap="round" strokeLinejoin="round" />
        </svg>
      </Tab>
      <Tab label="Settings" selected={activeTab === "ajustes"} onClick={onAjustes}>
        <svg width={22} height={22} viewBox="0 0 24 24" fill="none" aria-hidden>
          <circle cx="12" cy="12" r="3" stroke="currentColor" strokeWidth="2" />
          <path
            d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 1 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 1 1-4 0v-.09a1.65 1.65 0 0 0-1-1.51 1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 1 1-2.83-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 1 1 0-4h.09a1.65 1.65 0 0 0 1.51-1 1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 1 1 2.83-2.83l.06.06a1.65 1.65 0 0 0 1.82.33h.01a1.65 1.65 0 0 0 1-1.51V3a2 2 0 1 1 4 0v.09a1.65 1.65 0 0 0 1 1.51h.01a1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 1 1 2.83 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82v.01a1.65 1.65 0 0 0 1.51 1H21a2 2 0 1 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1z"
            stroke="currentColor"
            strokeWidth="1.6"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        </svg>
      </Tab>
    </nav>
  )
}
