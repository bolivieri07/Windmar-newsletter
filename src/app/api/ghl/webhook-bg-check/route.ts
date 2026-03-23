import { NextResponse } from "next/server"
import { createClient } from "@supabase/supabase-js"

function getSupabase() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  )
}

export async function POST(req: Request) {
  try {
    const body = await req.json()
    console.log("BG WEBHOOK RECEIVED:", JSON.stringify(body).slice(0, 500))

    // GHL sends custom data nested under body.customData AND as top-level standard fields
    const custom = body.customData || {}
    const contactId = custom.contactId || body.contact_id || body.contactId || null
    const contactName = custom.contactName || body.full_name ||
      ((body.first_name || "") + " " + (body.last_name || "")).trim() || "Unknown"
    const contactEmail = custom.email || body.email || null
    const status = custom.status || body.status || "sent"
    const documentId = custom.documentId || body.documentId || null
    const signedDate = custom.signedDate || body.signedDate || null
    const createdAt = custom.createdAt || body.date_created || new Date().toISOString()

    console.log("WEBHOOK PARSED:", JSON.stringify({ contactId, contactName, contactEmail, status, documentId }))

    if (!contactId) {
      console.log("WEBHOOK: No contactId, skipping")
      return NextResponse.json({ received: true, skipped: true, reason: "no contactId" })
    }

    const supabase = getSupabase()
    const now = new Date().toISOString()

    // Build update fields based on status
    const updateFields: Record<string, unknown> = {
      doc_status: status,
      contact_name: contactName,
      contact_email: contactEmail,
      ghl_updated_at: now,
    }

    if (status === "completed" || status === "signed") {
      updateFields.doc_status = "completed"
      updateFields.signed_date = signedDate || now
    }

    // If we have a documentId, upsert by documentId
    if (documentId) {
      const row = {
        ghl_document_id: documentId,
        contact_id: contactId,
        ghl_created_at: createdAt,
        ...updateFields,
      }
      const { error } = await supabase.from("bg_checks").upsert(row, { onConflict: "ghl_document_id" })
      if (error) {
        console.error("WEBHOOK: Upsert error:", error.message)
        return NextResponse.json({ received: true, error: error.message }, { status: 500 })
      }
      return NextResponse.json({ received: true, synced: true, method: "documentId", contactName, status })
    }

    // No documentId — find existing record by contactId
    const { data: existing } = await supabase
      .from("bg_checks")
      .select("id")
      .eq("contact_id", contactId)
      .order("ghl_created_at", { ascending: false })
      .limit(1)

    if (existing && existing.length > 0) {
      const { error } = await supabase
        .from("bg_checks")
        .update(updateFields)
        .eq("id", existing[0].id)

      if (error) {
        console.error("WEBHOOK: Update error:", error.message)
        return NextResponse.json({ received: true, error: error.message }, { status: 500 })
      }
      return NextResponse.json({ received: true, synced: true, method: "update", contactName, status })
    }

    // No existing record — insert new
    const row = {
      ghl_document_id: `webhook-${contactId}-${Date.now()}`,
      contact_id: contactId,
      ghl_created_at: createdAt,
      ...updateFields,
    }
    const { error } = await supabase.from("bg_checks").insert(row)
    if (error) {
      console.error("WEBHOOK: Insert error:", error.message)
      return NextResponse.json({ received: true, error: error.message }, { status: 500 })
    }

    return NextResponse.json({ received: true, synced: true, method: "insert", contactName, status })
  } catch (err: any) {
    console.error("WEBHOOK: Error:", err.message)
    return NextResponse.json({ received: true, error: err.message }, { status: 500 })
  }
}

export async function GET() {
  return NextResponse.json({ active: true, endpoint: "bg-check-webhook" })
}
