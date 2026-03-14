import { NextResponse } from "next/server"

export async function GET() {
  const token = process.env.SALESRABBIT_API_TOKEN
  if (!token) return NextResponse.json({ error: "No token" }, { status: 500 })

  try {
    const res = await fetch("https://api.salesrabbit.com/forms", {
      headers: { "Authorization": `Bearer ${token}`, "Content-Type": "application/json" },
    })
    const data = await res.json()
    return NextResponse.json(data)
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 })
  }
}
