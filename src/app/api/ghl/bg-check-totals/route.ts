import { NextResponse } from "next/server"

const GHL_BASE = "https://services.leadconnectorhq.com"
const LOCATION_ID = "eTTRenV5nD46gQbZ5A9E"
const DOC_QUERY = "Windmar- Home Depot Background Check"

async function countByStatus(token: string, statuses: string[]): Promise<number> {
  const params = new URLSearchParams({
    locationId: LOCATION_ID,
    limit: "1",
    skip: "0",
    query: DOC_QUERY,
  })
  for (const s of statuses) {
    params.append("status[]", s)
  }
  try {
    const res = await fetch(`${GHL_BASE}/proposals/document?${params.toString()}`, {
      headers: {
        "Authorization": `Bearer ${token}`,
        "Content-Type": "application/json",
        "Version": "2021-07-28",
      },
    })
    if (!res.ok) return 0
    const data = await res.json()
    return data.total ?? data.count ?? 0
  } catch {
    return 0
  }
}

export async function GET() {
  const token = process.env.GHL_API_KEY
  if (!token) {
    return NextResponse.json({ error: "No API key" }, { status: 500 })
  }

  const [total, completed, sent, viewed, draft] = await Promise.all([
    countByStatus(token, []),
    countByStatus(token, ["completed", "accepted"]),
    countByStatus(token, ["sent"]),
    countByStatus(token, ["viewed"]),
    countByStatus(token, ["draft"]),
  ])

  return NextResponse.json({ total, completed, sent, viewed, draft })
}
