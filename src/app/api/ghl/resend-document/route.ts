import { NextRequest, NextResponse } from "next/server"

const GHL_BASE = "https://services.leadconnectorhq.com"

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { documentId, locationId } = body

    if (!documentId) {
      return NextResponse.json({ error: "documentId is required" }, { status: 400 })
    }

    const token = process.env.GHL_API_KEY
    if (!token) {
      return NextResponse.json({ error: "GHL API key not configured" }, { status: 500 })
    }

    const res = await fetch(`${GHL_BASE}/proposals/document/send`, {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${token}`,
        "Content-Type": "application/json",
        "Version": "2021-07-28",
      },
      body: JSON.stringify({
        documentId,
        locationId: locationId || "eTTRenV5nD46gQbZ5A9E",
      }),
    })

    const data = await res.json()

    if (!res.ok) {
      return NextResponse.json(
        { error: data.message || data.error || "Failed to resend", details: data },
        { status: res.status }
      )
    }

    return NextResponse.json({ success: true, data })
  } catch (err: any) {
    return NextResponse.json({ error: err.message || "Internal error" }, { status: 500 })
  }
}
