import { NextResponse } from "next/server"
import { createClient } from "@supabase/supabase-js"

const BG_CHECK_DOC_NAME = "Windmar- Home Depot Background Check"

function getSupabase() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  )
}

export async function POST(req: Request) {
  try {
    const body = await req.json()
    console.log("BG CHECK WEBHOOK RECEIVED:", JSON.stringify(body).slice(0, 1000))

    // GHL can send different payload shapes depending on workflow config
    // Extract document data from the payload
    const doc = body.document || body
    const documentId = doc.documentId || doc.id || body.documentId
    const docName = doc.name || body.name || ""
    const status = doc.status || body.status || "sent"
    const createdAt = doc.createdAt || body.createdAt || body.dateAdded || new Date().toISOString()
    const updatedAt = doc.updatedAt || body.updatedAt || new Date().toISOString()

    // Extract contact/recipient info
    const recipient = doc.recipients?.[0] || body.recipient || body.contact || {}
    const contactId = recipient.id || recipient.contactId || body.contactId || body.contact_id || null
    const contactName = recipient.contactName || recipient.name || body.contactName || body.contact_name || "Unknown"
    const contactEmail = recipient.email || body.email || body.contactEmail || null
    const signedDate = recipient.signedDate || body.signedDate || null

    if (!documentId) {
      console.log("WEBHOOK: No documentId found, skipping")
      return NextResponse.json({ received: true, skipped: true, reason: "no documentId" })
    }

    // Optional: filter to only bg check docs (comment out if your workflow already filters)
    if (docName && docName !== BG_CHECK_DOC_NAME) {
      console.log("WEBHOOK: Doc name mismatch, skipping:", docName)
      return NextResponse.json({ received: true, skipped: true, reason: "not a bg check doc" })
    }

    const supabase = getSupabase()

    const row = {
      ghl_document_id: documentId,
      contact_id: contactId,
      contact_name: contactName,
      contact_email: contactEmail,
      doc_status: status,
      signed_date: signedDate,
      ghl_created_at: createdAt,
      ghl_updated_at: updatedAt,
    }

    console.log("WEBHOOK: Upserting row:", JSON.stringify(row))

    const { error } = await supabase
      .from("bg_checks")
      .upsert(row, { onConflict: "ghl_document_id" })

    if (error) {
      console.error("WEBHOOK: Supabase upsert error:", error.message)
      return NextResponse.json({ received: true, error: error.message }, { status: 500 })
    }

    console.log("WEBHOOK: Successfully synced", contactName, "status:", status)
    return NextResponse.json({ received: true, synced: true, documentId, contactName, status })
  } catch (err: any) {
    console.error("WEBHOOK: Error processing:", err.message)
    return NextResponse.json({ received: true, error: err.message }, { status: 500 })
  }
}

// GHL sometimes sends GET to verify the webhook URL exists
export async function GET() {
  return NextResponse.json({ active: true, endpoint: "bg-check-webhook" })
}
