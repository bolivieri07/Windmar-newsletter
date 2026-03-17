import { NextRequest, NextResponse } from "next/server"
import { createClient } from "@supabase/supabase-js"

const BG_CHECK_DOC_NAME = "Windmar- Home Depot Background Check"

function getSupabase() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  )
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()

    // GHL webhook payload - extract document info
    // The payload shape varies by trigger, handle common patterns
    const doc = body.document || body.proposal || body
    const documentId = doc.documentId || doc.id || body.documentId
    const docName = doc.name || doc.title || ""
    const status = doc.status || body.status || "sent"

    if (!documentId) {
      return NextResponse.json({ error: "No documentId in payload" }, { status: 400 })
    }

    // Only process background check documents
    if (docName && !docName.includes("Background Check")) {
      return NextResponse.json({ skipped: true, reason: "Not a background check doc" })
    }

    const recipient = doc.recipients?.[0] || body.contact || {}
    const supabase = getSupabase()

    const row = {
      ghl_document_id: documentId,
      contact_id: recipient.id || recipient.contactId || null,
      contact_name: recipient.contactName || recipient.name || [recipient.firstName, recipient.lastName].filter(Boolean).join(" ") || "Unknown",
      contact_email: recipient.email || null,
      doc_status: status,
      signed_date: recipient.signedDate || null,
      ghl_created_at: doc.createdAt || new Date().toISOString(),
      ghl_updated_at: doc.updatedAt || new Date().toISOString(),
    }

    const { error } = await supabase.from("bg_checks").upsert(row, { onConflict: "ghl_document_id" })

    if (error) {
      console.error("Webhook upsert error:", error.message)
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    return NextResponse.json({ success: true, documentId })
  } catch (err: any) {
    console.error("Webhook error:", err)
    return NextResponse.json({ error: err.message }, { status: 500 })
  }
}

// Also support GET for webhook verification
export async function GET() {
  return NextResponse.json({ status: "ok", webhook: "bg-check" })
}
