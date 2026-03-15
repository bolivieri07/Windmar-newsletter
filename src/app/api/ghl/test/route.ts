import { NextRequest, NextResponse } from "next/server"

const GHL_BASE = "https://services.leadconnectorhq.com"

async function ghlGet(endpoint: string) {
  const token = process.env.GHL_API_KEY
  const res = await fetch(`${GHL_BASE}${endpoint}`, {
    headers: {
      "Authorization": `Bearer ${token}`,
      "Content-Type": "application/json",
      "Version": "2021-07-28",
    },
  })
  return res.json()
}

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url)
  const endpoint = searchParams.get("endpoint")
  if (!endpoint) return NextResponse.json({ error: "No endpoint" }, { status: 400 })
  try {
    const data = await ghlGet(endpoint)
    return NextResponse.json(data)
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 })
  }
}
