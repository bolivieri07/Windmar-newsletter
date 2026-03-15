'use client'
import { useEffect, useState } from "react"
import { createClient } from "@/lib/supabase/client"

const HR_EMAIL = "tatianna.velez@windmarhome.com"
const BG_CHECK_DOC_NAME = "Windmar- Home Depot Background Check"

type GHLDocument = {
  documentId: string
  name: string
  status: string
  createdAt: string
  updatedAt: string
  recipients: {
    id: string
    firstName: string
    lastName: string
    email: string
    contactName: string
    hasCompleted: boolean
    signedDate?: string
  }[]
}

type LocalRecord = {
  id: string
  ghl_document_id: string
  hr_status: string
  approved_at: string | null
  approved_by: string | null
  shirt_given_at: string | null
  shirt_given_by: string | null
  badge_printed_at: string | null
  badge_printed_by: string | null
  notes: string | null
}

type MergedRecord = {
  documentId: string
  repName: string
  repEmail: string
  docStatus: string
  createdAt: string
  updatedAt: string
  signedDate: string | null
  hrStatus: string
  approvedAt: string | null
  approvedBy: string | null
  shirtGivenAt: string | null
  shirtGivenBy: string | null
  badgePrintedAt: string | null
  badgePrintedBy: string | null
  notes: string | null
  localId: string | null
}

export default function BackgroundChecksPage() {
  const [records, setRecords] = useState<MergedRecord[]>([])
  const [loading, setLoading] = useState(true)
  const [filter, setFilter] = useState("all")
  const [toast, setToast] = useState("")
  const [notifying, setNotifying] = useState<string | null>(null)
  const supabase = createClient()

  function showToast(msg: string) { setToast(msg); setTimeout(() => setToast(""), 3000) }

  useEffect(() => { loadData() }, [])

  async function loadData() {
    setLoading(true)
    try {
      const ghlRes = await fetch("/api/ghl/test?endpoint=/proposals/document?locationId=eTTRenV5nD46gQbZ5A9E")
      const ghlData = await ghlRes.json()
      const allDocs: GHLDocument[] = (ghlData.documents || []).filter((d: any) => d.name === BG_CHECK_DOC_NAME && d.status !== "draft")

      const { data: localRecords } = await supabase.from("background_checks").select("*")

      const localMap = new Map<string, LocalRecord>()
      if (localRecords) {
        localRecords.forEach((r: any) => { localMap.set(r.ghl_document_id, r) })
      }

      const merged: MergedRecord[] = allDocs.map(doc => {
        const recipient = doc.recipients[0]
        const local = localMap.get(doc.documentId)
        return {
          documentId: doc.documentId,
          repName: recipient?.contactName || "Unknown",
          repEmail: recipient?.email || "",
          docStatus: doc.status,
          createdAt: doc.createdAt,
          updatedAt: doc.updatedAt,
          signedDate: recipient?.signedDate || null,
          hrStatus: local?.hr_status || "pending",
          approvedAt: local?.approved_at || null,
          approvedBy: local?.approved_by || null,
          shirtGivenAt: local?.shirt_given_at || null,
          shirtGivenBy: local?.shirt_given_by || null,
          badgePrintedAt: local?.badge_printed_at || null,
          badgePrintedBy: local?.badge_printed_by || null,
          notes: local?.notes || null,
          localId: local?.id || null,
        }
      })

      merged.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
      setRecords(merged)
    } catch (err: any) {
      showToast("Error loading data: " + err.message)
    }
    setLoading(false)
  }

  async function ensureLocalRecord(rec: MergedRecord): Promise<string> {
    if (rec.localId) return rec.localId
    const { data, error } = await supabase.from("background_checks").insert({
      ghl_document_id: rec.documentId,
      rep_name: rec.repName,
      rep_email: rec.repEmail,
      document_status: rec.docStatus,
      hr_status: "pending",
      fulfillment_status: "pending",
    }).select().single()
    if (error) { showToast("Error: " + error.message); return "" }
    return data.id
  }

  async function notifyHR(rec: MergedRecord) {
    setNotifying(rec.documentId)
    const localId = await ensureLocalRecord(rec)
    if (!localId) { setNotifying(null); return }
    try {
      await fetch("/api/ghl", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          type: "hr_notification",
          title: "Background Check Completed: " + rec.repName,
          message: "HD Background Check completed by " + rec.repName + " (" + rec.repEmail + "). Please review and approve in Solar Academy admin.",
          emailSubject: "HD Background Check Completed: " + rec.repName,
          emailBody: '<div style="font-family:Arial;max-width:600px;margin:0 auto"><div style="background:#1a2f6e;padding:24px;border-radius:12px 12px 0 0"><h1 style="color:#f89b24;margin:0;font-size:20px">Background Check Completed</h1></div><div style="background:white;padding:24px;border:1px solid #e5e7eb;border-radius:0 0 12px 12px"><h2 style="color:#1a2f6e;margin:0 0 12px">Rep: ' + rec.repName + '</h2><p style="margin:4px 0"><strong>Email:</strong> ' + rec.repEmail + '</p><p style="margin:16px 0 0;color:#6b7280">Please review and mark as approved in the admin portal.</p></div></div>',
        }),
      })
      await supabase.from("background_checks").update({
        hr_status: "notified",
        hr_notified_at: new Date().toISOString(),
      }).eq("id", localId)
      showToast("HR notified about " + rec.repName)
      loadData()
    } catch (err: any) { showToast("Failed: " + err.message) }
    setNotifying(null)
  }

  async function updateHRStatus(rec: MergedRecord, status: string) {
    const localId = await ensureLocalRecord(rec)
    if (!localId) return
    const updates: any = { hr_status: status }
    if (status === "approved") { updates.approved_at = new Date().toISOString(); updates.approved_by = "Admin" }
    await supabase.from("background_checks").update(updates).eq("id", localId)
    showToast(rec.repName + " marked as " + status)
    loadData()
  }

  async function updateFulfillment(rec: MergedRecord, field: string) {
    const localId = await ensureLocalRecord(rec)
    if (!localId) return
    const now = new Date().toISOString()
    const updates: any = {}
    if (field === "shirt") { updates.shirt_given_at = now; updates.shirt_given_by = "Admin"; updates.fulfillment_status = "shirt_given" }
    else if (field === "badge") { updates.badge_printed_at = now; updates.badge_printed_by = "Admin" }
    if (field === "badge" && rec.shirtGivenAt) updates.fulfillment_status = "complete"
    if (field === "shirt" && rec.badgePrintedAt) updates.fulfillment_status = "complete"
    await supabase.from("background_checks").update(updates).eq("id", localId)
    showToast("Updated " + rec.repName)
    loadData()
  }

  const docColor: Record<string, { bg: string; color: string }> = {
    sent: { bg: "#f0f9ff", color: "#0369a1" },
    completed: { bg: "#f0fdf4", color: "#15803d" },
  }
  const hrColor: Record<string, { bg: string; color: string }> = {
    pending: { bg: "#f3f4f6", color: "#6b7280" },
    notified: { bg: "#fef3e2", color: "#b45309" },
    approved: { bg: "#f0fdf4", color: "#15803d" },
    denied: { bg: "#fef2f2", color: "#dc2626" },
  }

  const filtered = filter === "all" ? records :
    filter === "sent" ? records.filter(r => r.docStatus === "sent") :
    filter === "completed" ? records.filter(r => r.docStatus === "completed" && r.hrStatus !== "approved") :
    filter === "approved" ? records.filter(r => r.hrStatus === "approved" && !(r.shirtGivenAt && r.badgePrintedAt)) :
    filter === "done" ? records.filter(r => r.shirtGivenAt && r.badgePrintedAt) :
    records

  const stats = {
    total: records.length,
    sent: records.filter(r => r.docStatus === "sent").length,
    needsApproval: records.filter(r => r.docStatus === "completed" && r.hrStatus !== "approved").length,
    needsFulfillment: records.filter(r => r.hrStatus === "approved" && !(r.shirtGivenAt && r.badgePrintedAt)).length,
    done: records.filter(r => r.shirtGivenAt && r.badgePrintedAt).length,
  }

  const fmt = (iso: string) => {
    try { return new Date(iso).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" }) } catch { return "-" }
  }

  if (loading) return (
    <div style={{ padding: 32, textAlign: "center", color: "#6b7280" }}>
      <div style={{ fontSize: 24, marginBottom: 8 }}>Loading background checks...</div>
      <div style={{ fontSize: 14 }}>Syncing with GHL Documents API</div>
    </div>
  )

  return (
    <div style={{ padding: "16px 20px", maxWidth: 900, margin: "0 auto" }}>
      {toast && <div style={{ position: "fixed", top: 20, right: 20, background: "#1a2f6e", color: "white", padding: "12px 20px", borderRadius: 8, zIndex: 9999, fontSize: 14, boxShadow: "0 4px 12px rgba(0,0,0,.2)" }}>{toast}</div>}

      <h1 style={{ fontSize: 22, fontWeight: 700, color: "#1a2f6e", margin: "0 0 16px" }}>HD Background Checks</h1>

      <div style={{ display: "flex", gap: 8, flexWrap: "wrap", marginBottom: 16 }}>
        {[
          { label: "Total", value: stats.total, key: "all", color: "#1a2f6e" },
          { label: "Sent", value: stats.sent, key: "sent", color: "#0369a1" },
          { label: "Needs Approval", value: stats.needsApproval, key: "completed", color: "#b45309" },
          { label: "Needs Fulfillment", value: stats.needsFulfillment, key: "approved", color: "#7c3aed" },
          { label: "Done", value: stats.done, key: "done", color: "#15803d" },
        ].map(s => (
          <button key={s.key} onClick={() => setFilter(s.key)}
            style={{
              flex: "1 1 100px", padding: "10px 8px", border: filter === s.key ? `2px solid ${s.color}` : "2px solid #e5e7eb",
              borderRadius: 10, background: filter === s.key ? s.color : "white", color: filter === s.key ? "white" : s.color,
              cursor: "pointer", textAlign: "center", fontWeight: 600, fontSize: 13, transition: "all .2s",
            }}>
            <div style={{ fontSize: 22, fontWeight: 700 }}>{s.value}</div>
            {s.label}
          </button>
        ))}
      </div>

      {filtered.length === 0 ? (
        <div style={{ textAlign: "center", color: "#9ca3af", padding: 40, fontSize: 15 }}>No records in this category</div>
      ) : filtered.map(rec => {
        const dc = docColor[rec.docStatus] || docColor.sent
        const hc = hrColor[rec.hrStatus] || hrColor.pending
        const isDone = !!(rec.shirtGivenAt && rec.badgePrintedAt)

        return (
          <div key={rec.documentId} style={{
            border: "1px solid #e5e7eb", borderRadius: 12, padding: 16, marginBottom: 10,
            background: isDone ? "#f9fafb" : "white", opacity: isDone ? 0.75 : 1,
          }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: 6, marginBottom: 8 }}>
              <div style={{ fontWeight: 700, fontSize: 16, color: "#1a2f6e" }}>{rec.repName}</div>
              <div style={{ display: "flex", gap: 6 }}>
                <span style={{ padding: "3px 10px", borderRadius: 20, fontSize: 12, fontWeight: 600, background: dc.bg, color: dc.color }}>{rec.docStatus.toUpperCase()}</span>
                <span style={{ padding: "3px 10px", borderRadius: 20, fontSize: 12, fontWeight: 600, background: hc.bg, color: hc.color }}>HR: {rec.hrStatus.toUpperCase()}</span>
              </div>
            </div>

            <div style={{ fontSize: 13, color: "#6b7280", marginBottom: 8 }}>
              <span>{rec.repEmail}</span>
              <span style={{ margin: "0 8px" }}>{"\u2022"}</span>
              <span>Sent: {fmt(rec.createdAt)}</span>
              {rec.signedDate && <><span style={{ margin: "0 8px" }}>{"\u2022"}</span><span>Signed: {fmt(rec.signedDate)}</span></>}
            </div>

            <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
              {rec.docStatus === "completed" && rec.hrStatus === "pending" && (
                <button onClick={() => notifyHR(rec)} disabled={notifying === rec.documentId}
                  style={{ padding: "6px 14px", borderRadius: 8, border: "none", background: "#f89b24", color: "white", fontWeight: 600, fontSize: 13, cursor: "pointer" }}>
                  {notifying === rec.documentId ? "Sending..." : "Notify HR"}
                </button>
              )}

              {rec.docStatus === "completed" && rec.hrStatus === "notified" && (
                <>
                  <button onClick={() => updateHRStatus(rec, "approved")}
                    style={{ padding: "6px 14px", borderRadius: 8, border: "none", background: "#15803d", color: "white", fontWeight: 600, fontSize: 13, cursor: "pointer" }}>
                    Approve
                  </button>
                  <button onClick={() => updateHRStatus(rec, "denied")}
                    style={{ padding: "6px 14px", borderRadius: 8, border: "none", background: "#dc2626", color: "white", fontWeight: 600, fontSize: 13, cursor: "pointer" }}>
                    Deny
                  </button>
                </>
              )}

              {rec.hrStatus === "approved" && !rec.shirtGivenAt && (
                <button onClick={() => updateFulfillment(rec, "shirt")}
                  style={{ padding: "6px 14px", borderRadius: 8, border: "2px solid #7c3aed", background: "white", color: "#7c3aed", fontWeight: 600, fontSize: 13, cursor: "pointer" }}>
                  Give Shirt
                </button>
              )}
              {rec.hrStatus === "approved" && rec.shirtGivenAt && !rec.badgePrintedAt && (
                <button onClick={() => updateFulfillment(rec, "badge")}
                  style={{ padding: "6px 14px", borderRadius: 8, border: "2px solid #7c3aed", background: "white", color: "#7c3aed", fontWeight: 600, fontSize: 13, cursor: "pointer" }}>
                  Print Badge
                </button>
              )}

              {rec.shirtGivenAt && <span style={{ padding: "6px 12px", borderRadius: 8, background: "#f0fdf4", color: "#15803d", fontSize: 12, fontWeight: 600 }}>Shirt {fmt(rec.shirtGivenAt)}</span>}
              {rec.badgePrintedAt && <span style={{ padding: "6px 12px", borderRadius: 8, background: "#f0fdf4", color: "#15803d", fontSize: 12, fontWeight: 600 }}>Badge {fmt(rec.badgePrintedAt)}</span>}
              {isDone && <span style={{ padding: "6px 12px", borderRadius: 8, background: "#15803d", color: "white", fontSize: 12, fontWeight: 700 }}>COMPLETE</span>}
            </div>
          </div>
        )
      })}

      <button onClick={loadData} style={{ marginTop: 12, padding: "10px 20px", borderRadius: 8, border: "2px solid #1a2f6e", background: "white", color: "#1a2f6e", fontWeight: 600, cursor: "pointer", width: "100%" }}>
        Refresh from GHL
      </button>
    </div>
  )
}
