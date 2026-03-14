import { NextRequest, NextResponse } from "next/server"

const BASE_URL = "https://api.salesrabbit.com"

export async function GET(request: NextRequest) {
  const token = process.env.SALESRABBIT_API_TOKEN
  if (!token) return NextResponse.json({ error: "No API token configured" }, { status: 500 })

  const { searchParams } = new URL(request.url)
  const endpoint = searchParams.get("endpoint")
  if (!endpoint) return NextResponse.json({ error: "No endpoint specified" }, { status: 400 })

  const params = new URLSearchParams()
  searchParams.forEach((value, key) => {
    if (key !== "endpoint") params.append(key, value)
  })

  const url = `${BASE_URL}${endpoint}${params.toString() ? "?" + params.toString() : ""}`

  try {
    const res = await fetch(url, {
      headers: {
        "Authorization": `Bearer ${token}`,
        "Content-Type": "application/json",
      },
      next: { revalidate: 60 },
    })
    const data = await res.json()
    return NextResponse.json(data)
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}

export async function POST(request: NextRequest) {
  const token = process.env.SALESRABBIT_API_TOKEN
  if (!token) return NextResponse.json({ error: "No API token configured" }, { status: 500 })

  const body = await request.json()
  const { endpoint, ...payload } = body
  if (!endpoint) return NextResponse.json({ error: "No endpoint specified" }, { status: 400 })

  try {
    const res = await fetch(`${BASE_URL}${endpoint}`, {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${token}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify(payload),
    })
    const data = await res.json()
    return NextResponse.json(data)
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}

export async function PUT(request: NextRequest) {
  const token = process.env.SALESRABBIT_API_TOKEN
  if (!token) return NextResponse.json({ error: "No API token configured" }, { status: 500 })

  const body = await request.json()
  const { endpoint, ...payload } = body
  if (!endpoint) return NextResponse.json({ error: "No endpoint specified" }, { status: 400 })

  try {
    const res = await fetch(`${BASE_URL}${endpoint}`, {
      method: "PUT",
      headers: {
        "Authorization": `Bearer ${token}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify(payload),
    })
    const data = await res.json()
    return NextResponse.json(data)
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}
