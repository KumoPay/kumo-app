"use client"

import Link from "next/link"
import Image from "next/image"
import { usePathname } from "next/navigation"

export function TopNav() {
  const pathname = usePathname()
  const isFlow = pathname?.startsWith("/flow")
  const linkCls = (active: boolean) => (active ? "active" : "")
  return (
    <nav className="topnav">
      <Link href="/" className="topnav__brand">
        <Image src="/kumo-mascot.png" alt="" width={64} height={64} style={{ width: 64, height: 64 }} priority />
        <Image src="/logo-sec-02.png" alt="KumoPay" width={216} height={48} style={{ height: 48, width: "auto" }} priority />
      </Link>
      <div className="topnav__links">
        <Link href="/" className={linkCls(!isFlow)}>Home</Link>
        <Link href="/flow" className={linkCls(!!isFlow)}>Flow</Link>
      </div>
      <div className="topnav__cta">
        <span className="topnav__net"><span className="dot" /> Solana devnet</span>
        <Link href="/app" className="topnav__connect">Try the demo</Link>
      </div>
    </nav>
  )
}
