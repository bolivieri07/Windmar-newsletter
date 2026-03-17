import { NextResponse } from "next/server"
import { createClient } from "@supabase/supabase-js"

const GHL_BASE = "https://services.leadconnectorhq.com"
const LOCATION_ID = "eTTRenV5nD46gQbZ5A9E"
const BG_CHECK_DOC_NAME = "Windmar- Home Depot Background Check"
const PAGE_SIZE = 20
const CUTOFF_DATE = "2025-01-01T00:00:00.000Z"

function getSupabase() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  )
}

export async function GET() {
  const token = process.env.GHL_API_KEY
  if (!token) return NextResponse.json({ error: "No GHL API key" }, { status: 500 })

  const supabase = getSupabase()
  let skip = 0
  let synced = 0
  let skipped = 0
  let keepGoing = true

  try {
    while (keepGoing) {
      const res = await fetch(
        `${GHL_BASE}/proposals/document?locationId=${LOCATION_ID}&limit=${PAGE_SIZE}&skip=${skip}`,
        { headers: { "Authorization": `Bearer ${token}`, "Content-Type": "application/json", "Version": "2021-07-28" } }
      )
      if (!res.ok) { keepGoing = false; break }

      const data = await res.json()
      const docs = data.documents || []
      if (docs.length === 0) { keepGoing = false; break }

      for (const doc of docs) {
        if (new Date(doc.createdAt) < new Date(CUTOFF_DATE)) { keepGoing = false; break }
        if (doc.name !== BG_CHECK_DOC_NAME || doc.status === "draft") { skipped++; continue }

        const recipient = doc.recipients?.[0]
        const row = {
          ghl_document_id: doc.documentId,
          contact_id: recipient?.id || null,
          contact_name: recipient?.contactName || "Unknown",
          contact_email: recipient?.email || null,
          doc_status: doc.status,
          signed_date: recipient?.signedDate || null,
          ghl_created_at: doc.createdAt,
          ghl_updated_at: doc.updatedAt,
        }

        const { error } = await supabase.from("bg_checks").upsert(row, { onConflict: "ghl_document_id" })
        if (error) { console.error("Upsert error:", error.message) }
        else { synced++ }
      }

      skip += PAGE_SIZE
      if (skip > 6000) keepGoing = false
    }

    return NextResponse.json({ success: true, synced, skipped, message: `Synced ${synced} contracts` })
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 })
  }
}
