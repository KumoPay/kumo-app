// apps/desktop/app/api/parse-intent/route.ts
//
// On-device intent parsing. This route is intentionally trivial:
// it forwards to QVAC's local HTTP server. The point is that the
// only network egress is to LOOPBACK (127.0.0.1).

import { NextRequest, NextResponse } from "next/server"
import { parseIntent, QvacUnreachableError } from "@/lib/qvac-client"

export const runtime = "nodejs"
export const dynamic = "force-dynamic"

export async function POST(req: NextRequest) {
  const body = await req.json().catch(() => null)
  if (!body || typeof body.text !== "string") {
    return NextResponse.json({ ok: false, error: "Missing `text`" }, { status: 400 })
  }
  try {
    const intent = await parseIntent(body.text)
    return NextResponse.json({ ok: true, intent })
  } catch (e: unknown) {
    if (e instanceof QvacUnreachableError) {
      return NextResponse.json({ ok: false, error: e.message }, { status: 503 })
    }
    const msg = e instanceof Error ? e.message : "Unknown error"
    return NextResponse.json({ ok: false, error: msg }, { status: 422 })
  }
}
