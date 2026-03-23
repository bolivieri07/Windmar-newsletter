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

    const contactId = body.contactId || body.contact_id || null
    const contactName = body.contactName || body.contact_name || "Unknown"
    const contactEmail = body.email || body.contactEmail || null
    const status = body.status || "sent"
    const docName = body.name || BG_CHECK_DOC_NAME
    const documentId = body.documentId || null
    const createdAt = body.createdAt || new Date().toISOString()

    if (!contactId) {
      console.log("WEBHOOK: No contactId, skipping")
      return NextResponse.json({ received: true, skipped: true, reason: "no contactId" })
    }

    const supabase = getSupabase()

    // If we have a documentId, upsert by documentId as before
    if (documentId) {
      const row = {
        ghl_document_id: documentId,
        contact_id: contactId,
        contact_name: contactName,
        contact_email: contactEmail,
        doc_status: status,
        ghl_created_at: createdAt,
        ghl_updated_at: new Date().toISOString(),
      }
      const { error } = await supabase.from("bg_checks").upsert(row, { onConflict: "ghl_document_id" })
      if (error) {
        console.error("WEBHOOK: Upsert error:", error.message)
        return NextResponse.json({ received: true, error: error.message }, { status: 500 })
      }
      console.log("WEBHOOK: Synced by documentId", contactName)
      return NextResponse.json({ received: true, synced: true, method: "documentId", contactName, status })
    }

    // No documentId — check if a record already exists for this contact
    const { data: existing } = await supabase
      .from("bg_checks")
      .select("id")
      .eq("contact_id", contactId)
      .order("ghl_created_at", { ascending: false })
      .limit(1)

    if (existing && existing.length > 0) {
      // Update existing record
      const { error } = await supabase
        .from("bg_checks")
        .update({
          doc_status: status,
          contact_name: contactName,
          contact_email: contactEmail,
          ghl_updated_at: new Date().toISOString(),
        })
        .eq("id", existing[0].id)

      if (error) {
        console.error("WEBHOOK: Update error:", error.message)
        return NextResponse.json({ received: true, error: error.message }, { status: 500 })
      }
      console.log("WEBHOOK: Updated existing record for", contactName)
      return NextResponse.json({ received: true, synced: true, method: "update", contactName, status })
    }

    // No existing record — insert new with a generated ID placeholder
    const row = {
      ghl_document_id: `webhook-${contactId}-${Date.now()}`,
      contact_id: contactId,
      contact_name: contactName,
      contact_email: contactEmail,
      doc_status: status,
      ghl_created_at: createdAt,
      ghl_updated_at: new Date().toISOString(),
    }
    const { error } = await supabase.from("bg_checks").insert(row)
    if (error) {
      console.error("WEBHOOK: Insert error:", error.message)
      return NextResponse.json({ received: true, error: error.message }, { status: 500 })
    }

    console.log("WEBHOOK: Inserted new record for", contactName)
    return NextResponse.json({ received: true, synced: true, method: "insert", contactName, status })
  } catch (err: any) {
    console.error("WEBHOOK: Error:", err.message)
    return NextResponse.json({ received: true, error: err.message }, { status: 500 })
  }
}

export async function GET() {
  return NextResponse.json({ active: true, endpoint: "bg-check-webhook" })
}
