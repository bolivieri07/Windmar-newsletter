'use client'
import { useEffect, useState, useCallback } from "react"
import { createClient } from "@/lib/supabase/client"

const LOCATION_ID = "eTTRenV5nD46gQbZ5A9E"
const SELFIE_FIELD_ID = "IvtzPRyBRw6fUpvsLQZ0"
const ID_FIELD_ID = "WpmuIT4Pdot4M644rxtt"
const SSN_FIELD_ID = "yHDtP3x1ZLCAEzbbLoBE"

type FileInfo = { url: string; name: string }
type ContactFiles = { selfie?: FileInfo; id?: FileInfo; ssn?: FileInfo }

type BgCheck = {
  id: string
  ghl_document_id: string
  contact_id: string | null
  contact_name: string
  contact_email: string | null
  doc_status: string
  signed_date: string | null
  ghl_created_at: string | null
  ghl_updated_at: string | null
  hr_status: string
  approved_at: string | null
  approved_by: string | null
  shirt_given_at: string | null
  shirt_given_by: string | null
  badge_printed_at: string | null
  badge_printed_by: string | null
  fulfillment_status: string
  notes: string | null
  // client-side only
  files?: ContactFiles | null
  loadingFiles?: boolean
}

export default function BackgroundChecksPage() {
  const [records, setRecords] = useState<BgCheck[]>([])
  const [loading, setLoading] = useState(true)
  const [filter, setFilter] = useState("all")
  const [search, setSearch] = useState("")
  const [toast, setToast] = useState("")
  const [copiedId, setCopiedId] = useState<string | null>(null)
  const [resendingId, setResendingId] = useState<string | null>(null)
  const [syncing, setSyncing] = useState(false)
  const supabase = createClient()

  function showToast(msg: string) { setToast(msg); setTimeout(() => setToast(""), 3000) }

  // === Load all from Supabase (instant) ===
  const loadData = useCallback(async () => {
    setLoading(true)
    const { data, error } = await supabase
      .from("bg_checks")
      .select("*")
      .order("ghl_created_at", { ascending: false })
    if (error) { showToast("Error: " + error.message) }
    else { setRecords(data || []) }
    setLoading(false)
  }, [supabase])

  useEffect(() => { loadData() }, [loadData])

  // === Sync from GHL ===
  async function handleSync() {
    setSyncing(true)
    showToast("Syncing from GHL...")
    try {
      const res = await fetch("/api/ghl/sync-bg-checks")
      const data = await res.json()
      if (res.ok) {
        showToast(`Synced ${data.synced} contracts from GHL`)
        loadData()
      } else {
        showToast("Sync failed: " + (data.error || "Unknown"))
      }
    } catch (err: unknown) {
      showToast("Sync failed: " + (err instanceof Error ? err.message : "Unknown"))
    }
    setSyncing(false)
  }

  // === HR Actions (direct Supabase update) ===
  async function updateHRStatus(rec: BgCheck, status: string) {
    const updates: Record<string, unknown> = { hr_status: status }
    if (status === "approved") { updates.approved_at = new Date().toISOString(); updates.approved_by = "Admin" }
    const { error } = await supabase.from("bg_checks").update(updates).eq("id", rec.id)
    if (error) { showToast("Error: " + error.message); return }
    setRecords(prev => prev.map(r => r.id === rec.id ? { ...r, hr_status: status, approved_at: status === "approved" ? new Date().toISOString() : r.approved_at } : r))
    showToast(rec.contact_name + " marked as " + status)
  }

  async function updateFulfillment(rec: BgCheck, field: string) {
    const now = new Date().toISOString()
    const updates: Record<string, unknown> = {}
    if (field === "shirt") { updates.shirt_given_at = now; updates.shirt_given_by = "Admin"; updates.fulfillment_status = "shirt_given" }
    else if (field === "badge") { updates.badge_printed_at = now; updates.badge_printed_by = "Admin" }
    if (field === "badge" && rec.shirt_given_at) updates.fulfillment_status = "complete"
    if (field === "shirt" && rec.badge_printed_at) updates.fulfillment_status = "complete"
    const { error } = await supabase.from("bg_checks").update(updates).eq("id", rec.id)
    if (error) { showToast("Error: " + error.message); return }
    setRecords(prev => prev.map(r => r.id === rec.id ? { ...r, shirt_given_at: field === "shirt" ? now : r.shirt_given_at, badge_printed_at: field === "badge" ? now : r.badge_printed_at, fulfillment_status: updates.fulfillment_status as string || r.fulfillment_status } : r))
    showToast("Updated " + rec.contact_name)
  }

  // === Load individual contact files from GHL (on demand) ===
  function extractFileFromCustomField(customFields: Record<string, unknown>[], fieldId: string): FileInfo | undefined {
    const field = customFields.find((f: Record<string, unknown>) => f.id === fieldId)
    if (!field || !field.value || typeof field.value !== "object") return undefined
    const val = field.value as Record<string, Record<string, unknown>>
    const keys = Object.keys(val)
    if (keys.length === 0) return undefined
    const entry = val[keys[0]] as { url?: string; meta?: { originalname?: string } }
    if (!entry?.url) return undefined
    return { url: entry.url, name: entry.meta?.originalname || "file" }
  }

  async function loadContactFiles(rec: BgCheck) {
    if (!rec.contact_id) { showToast("No contact ID"); return }
    setRecords(prev => prev.map(r => r.id === rec.id ? { ...r, loadingFiles: true } : r))
    try {
      const res = await fetch(`/api/ghl/test?endpoint=/contacts/${rec.contact_id}`)
      const data = await res.json()
      const contact = data.contact
      if (!contact?.customFields) throw new Error("No custom fields")
      const files: ContactFiles = {
        selfie: extractFileFromCustomField(contact.customFields, SELFIE_FIELD_ID),
        id: extractFileFromCustomField(contact.customFields, ID_FIELD_ID),
        ssn: extractFileFromCustomField(contact.customFields, SSN_FIELD_ID),
      }
      setRecords(prev => prev.map(r => r.id === rec.id ? { ...r, files, loadingFiles: false } : r))
    } catch {
      setRecords(prev => prev.map(r => r.id === rec.id ? { ...r, files: {}, loadingFiles: false } : r))
      showToast("Could not load files for " + rec.contact_name)
    }
  }

  // === GHL individual actions ===
  function handleDownloadDoc(rec: BgCheck) {
    window.open(`/api/ghl/test?endpoint=/proposals/document/${rec.ghl_document_id}`, "_blank")
    showToast("Opening document for " + rec.contact_name)
  }

  async function handleResendContract(rec: BgCheck) {
    if (!confirm("Resend contract to " + (rec.contact_name || rec.contact_email) + "?")) return
    setResendingId(rec.id)
    try {
      const res = await fetch("/api/ghl/resend-document", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ documentId: rec.ghl_document_id, locationId: LOCATION_ID }) })
      const data = await res.json()
      if (res.ok && !data.error) { showToast("Contract resent to " + rec.contact_name + "!") }
      else { showToast("Resend failed: " + (data.message || data.error || "Unknown")) }
    } catch (err: unknown) { showToast("Resend failed: " + (err instanceof Error ? err.message : "Unknown")) }
    setResendingId(null)
  }

  async function handleCopyLink(rec: BgCheck) {
    const link = `https://link.windmarsolaracademy.com/widget/proposal/${rec.ghl_document_id}`
    try { await navigator.clipboard.writeText(link) } catch {
      const ta = document.createElement("textarea"); ta.value = link; document.body.appendChild(ta); ta.select(); document.execCommand("copy"); document.body.removeChild(ta)
    }
    setCopiedId(rec.id); showToast("Signing link copied!"); setTimeout(() => setCopiedId(null), 2500)
  }

  // === Filtering & Search ===
  const searchLower = search.toLowerCase().trim()
  const searched = searchLower
    ? records.filter(r => (r.contact_name || "").toLowerCase().includes(searchLower) || (r.contact_email || "").toLowerCase().includes(searchLower))
    : records

  const filtered = filter === "all" ? searched :
    filter === "sent" ? searched.filter(r => r.doc_status === "sent" || r.doc_status === "viewed") :
    filter === "completed" ? searched.filter(r => r.doc_status === "completed" && r.hr_status !== "approved") :
    filter === "approved" ? searched.filter(r => r.hr_status === "approved" && !(r.shirt_given_at && r.badge_printed_at)) :
    filter === "done" ? searched.filter(r => !!(r.shirt_given_at && r.badge_printed_at)) :
    searched

  const stats = {
    total: records.length,
    sent: records.filter(r => r.doc_status === "sent" || r.doc_status === "viewed").length,
    needsApproval: records.filter(r => r.doc_status === "completed" && r.hr_status !== "approved").length,
    needsFulfillment: records.filter(r => r.hr_status === "approved" && !(r.shirt_given_at && r.badge_printed_at)).length,
    done: records.filter(r => !!(r.shirt_given_at && r.badge_printed_at)).length,
  }

  const fmt = (iso: string | null) => {
    if (!iso) return "-"
    try { return new Date(iso).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" }) } catch { return "-" }
  }

  const docColor: Record<string, { bg: string; color: string }> = { sent: { bg: "#f0f9ff", color: "#0369a1" }, viewed: { bg: "#fef9c3", color: "#a16207" }, completed: { bg: "#f0fdf4", color: "#15803d" } }
  const hrColor: Record<string, { bg: string; color: string }> = { pending: { bg: "#f3f4f6", color: "#6b7280" }, approved: { bg: "#f0fdf4", color: "#15803d" }, denied: { bg: "#fef2f2", color: "#dc2626" } }

  if (loading) return (<div style={{ padding: 32, textAlign: "center", color: "#6b7280" }}><div style={{ fontSize: 24, marginBottom: 8 }}>Loading background checks...</div></div>)

  return (
    <div style={{ padding: "16px 20px", maxWidth: 900, margin: "0 auto" }}>
      {toast && <div style={{ position: "fixed", top: 20, right: 20, background: "#1a2f6e", color: "white", padding: "12px 20px", borderRadius: 8, zIndex: 9999, fontSize: 14, boxShadow: "0 4px 12px rgba(0,0,0,.2)" }}>{toast}</div>}

      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 16 }}>
        <h1 style={{ fontSize: 22, fontWeight: 700, color: "#1a2f6e", margin: 0 }}>HD Background Checks</h1>
        <button onClick={handleSync} disabled={syncing}
          style={{ padding: "8px 16px", borderRadius: 8, border: "2px solid #1a2f6e", background: syncing ? "#1a2f6e" : "white", color: syncing ? "white" : "#1a2f6e", fontWeight: 600, fontSize: 13, cursor: syncing ? "wait" : "pointer" }}>
          {syncing ? "Syncing..." : "Sync from GHL"}
        </button>
      </div>

      <div style={{ display: "flex", gap: 8, flexWrap: "wrap", marginBottom: 16 }}>
        {[
          { label: "Total", value: stats.total, key: "all", color: "#1a2f6e" },
          { label: "Sent/Viewed", value: stats.sent, key: "sent", color: "#0369a1" },
          { label: "Needs Approval", value: stats.needsApproval, key: "completed", color: "#b45309" },
          { label: "Needs Fulfillment", value: stats.needsFulfillment, key: "approved", color: "#7c3aed" },
          { label: "Done", value: stats.done, key: "done", color: "#15803d" },
        ].map(s => (
          <button key={s.key} onClick={() => setFilter(s.key)} style={{ flex: "1 1 100px", padding: "10px 8px", border: filter === s.key ? `2px solid ${s.color}` : "2px solid #e5e7eb", borderRadius: 10, background: filter === s.key ? s.color : "white", color: filter === s.key ? "white" : s.color, cursor: "pointer", textAlign: "center", fontWeight: 600, fontSize: 13, transition: "all .2s" }}>
            <div style={{ fontSize: 22, fontWeight: 700 }}>{s.value}</div>
            {s.label}
          </button>
        ))}
      </div>

      <div style={{ marginBottom: 16, position: "relative" }}>
        <input type="text" placeholder="Search by name or email..." value={search} onChange={(e) => setSearch(e.target.value)}
          style={{ width: "100%", padding: "10px 14px", paddingRight: search ? 36 : 14, border: "2px solid #e5e7eb", borderRadius: 10, fontSize: 14, outline: "none", boxSizing: "border-box" }}
          onFocus={(e) => { e.currentTarget.style.borderColor = "#1a2f6e" }} onBlur={(e) => { e.currentTarget.style.borderColor = "#e5e7eb" }} />
        {search && <button onClick={() => setSearch("")} style={{ position: "absolute", right: 10, top: "50%", transform: "translateY(-50%)", background: "none", border: "none", cursor: "pointer", fontSize: 18, color: "#9ca3af" }}>{"\u00D7"}</button>}
      </div>

      {filtered.length === 0 ? (
        <div style={{ textAlign: "center", color: "#9ca3af", padding: 40, fontSize: 15 }}>{search ? `No results for "${search}"` : "No records in this category"}</div>
      ) : filtered.map(rec => {
        const dc = docColor[rec.doc_status] || docColor.sent
        const hc = hrColor[rec.hr_status] || hrColor.pending
        const isDone = !!(rec.shirt_given_at && rec.badge_printed_at)

        return (
          <div key={rec.id} style={{ border: "1px solid #e5e7eb", borderRadius: 12, padding: 16, marginBottom: 10, background: isDone ? "#f9fafb" : "white", opacity: isDone ? 0.75 : 1 }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: 6, marginBottom: 8 }}>
              <div style={{ fontWeight: 700, fontSize: 16, color: "#1a2f6e" }}>{rec.contact_name}</div>
              <div style={{ display: "flex", gap: 6 }}>
                <span style={{ padding: "3px 10px", borderRadius: 20, fontSize: 12, fontWeight: 600, background: dc.bg, color: dc.color }}>{rec.doc_status.toUpperCase()}</span>
                {rec.doc_status === "completed" && <span style={{ padding: "3px 10px", borderRadius: 20, fontSize: 12, fontWeight: 600, background: hc.bg, color: hc.color }}>HR: {rec.hr_status.toUpperCase()}</span>}
              </div>
            </div>

            <div style={{ fontSize: 13, color: "#6b7280", marginBottom: 8 }}>
              <span>{rec.contact_email || "No email"}</span><span style={{ margin: "0 8px" }}>{"\u2022"}</span><span>Sent: {fmt(rec.ghl_created_at)}</span>
              {rec.signed_date && <><span style={{ margin: "0 8px" }}>{"\u2022"}</span><span>Signed: {fmt(rec.signed_date)}</span></>}
            </div>

            <div style={{ display: "flex", gap: 6, flexWrap: "wrap", alignItems: "center" }}>
              {rec.doc_status === "completed" && rec.hr_status === "pending" && (<>
                <button onClick={() => updateHRStatus(rec, "approved")} style={{ padding: "6px 14px", borderRadius: 8, border: "none", background: "#15803d", color: "white", fontWeight: 600, fontSize: 13, cursor: "pointer" }}>Approve</button>
                <button onClick={() => updateHRStatus(rec, "denied")} style={{ padding: "6px 14px", borderRadius: 8, border: "none", background: "#dc2626", color: "white", fontWeight: 600, fontSize: 13, cursor: "pointer" }}>Deny</button>
              </>)}

              {rec.doc_status === "completed" && !rec.files && !rec.loadingFiles && (
                <button onClick={() => loadContactFiles(rec)} style={{ padding: "6px 14px", borderRadius: 8, border: "2px solid #1a2f6e", background: "white", color: "#1a2f6e", fontWeight: 600, fontSize: 13, cursor: "pointer" }}>Load Documents</button>
              )}
              {rec.loadingFiles && <span style={{ fontSize: 13, color: "#6b7280" }}>Loading files...</span>}

              {rec.files && (<div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
                {rec.files.selfie && <a href={rec.files.selfie.url} target="_blank" rel="noopener noreferrer" style={{ padding: "6px 12px", borderRadius: 8, background: "#eff6ff", color: "#1d4ed8", fontSize: 12, fontWeight: 600, textDecoration: "none" }}>Selfie</a>}
                {rec.files.id && <a href={rec.files.id.url} target="_blank" rel="noopener noreferrer" style={{ padding: "6px 12px", borderRadius: 8, background: "#eff6ff", color: "#1d4ed8", fontSize: 12, fontWeight: 600, textDecoration: "none" }}>ID</a>}
                {rec.files.ssn && <a href={rec.files.ssn.url} target="_blank" rel="noopener noreferrer" style={{ padding: "6px 12px", borderRadius: 8, background: "#eff6ff", color: "#1d4ed8", fontSize: 12, fontWeight: 600, textDecoration: "none" }}>SSN Card</a>}
                {!rec.files.selfie && !rec.files.id && !rec.files.ssn && <span style={{ fontSize: 12, color: "#9ca3af" }}>No files uploaded</span>}
              </div>)}

              {rec.doc_status === "completed" && <button onClick={() => handleDownloadDoc(rec)} style={{ padding: "6px 14px", borderRadius: 8, border: "2px solid #0369a1", background: "white", color: "#0369a1", fontWeight: 600, fontSize: 13, cursor: "pointer" }}>Download Doc</button>}

              <button onClick={() => handleCopyLink(rec)} style={{ padding: "6px 14px", borderRadius: 8, border: copiedId === rec.id ? "2px solid #15803d" : "2px solid #6b7280", background: copiedId === rec.id ? "#f0fdf4" : "white", color: copiedId === rec.id ? "#15803d" : "#6b7280", fontWeight: 600, fontSize: 13, cursor: "pointer", transition: "all .2s" }}>
                {copiedId === rec.id ? "\u2713 Copied!" : "Copy Link"}
              </button>

              {(rec.doc_status === "sent" || rec.doc_status === "viewed") && (
                <button onClick={() => handleResendContract(rec)} disabled={resendingId === rec.id}
                  style={{ padding: "6px 14px", borderRadius: 8, border: "2px solid #b45309", background: "white", color: "#b45309", fontWeight: 600, fontSize: 13, cursor: resendingId === rec.id ? "wait" : "pointer", opacity: resendingId === rec.id ? 0.6 : 1 }}>
                  {resendingId === rec.id ? "Sending..." : "Resend"}
                </button>
              )}

              {rec.hr_status === "approved" && !rec.shirt_given_at && <button onClick={() => updateFulfillment(rec, "shirt")} style={{ padding: "6px 14px", borderRadius: 8, border: "2px solid #7c3aed", background: "white", color: "#7c3aed", fontWeight: 600, fontSize: 13, cursor: "pointer" }}>Give Shirt</button>}
              {rec.hr_status === "approved" && rec.shirt_given_at && !rec.badge_printed_at && <button onClick={() => updateFulfillment(rec, "badge")} style={{ padding: "6px 14px", borderRadius: 8, border: "2px solid #7c3aed", background: "white", color: "#7c3aed", fontWeight: 600, fontSize: 13, cursor: "pointer" }}>Print Badge</button>}

              {rec.shirt_given_at && <span style={{ padding: "6px 12px", borderRadius: 8, background: "#f0fdf4", color: "#15803d", fontSize: 12, fontWeight: 600 }}>Shirt {fmt(rec.shirt_given_at)}</span>}
              {rec.badge_printed_at && <span style={{ padding: "6px 12px", borderRadius: 8, background: "#f0fdf4", color: "#15803d", fontSize: 12, fontWeight: 600 }}>Badge {fmt(rec.badge_printed_at)}</span>}
              {isDone && <span style={{ padding: "6px 12px", borderRadius: 8, background: "#15803d", color: "white", fontSize: 12, fontWeight: 700 }}>COMPLETE</span>}
            </div>
          </div>
        )
      })}
    </div>
  )
}
