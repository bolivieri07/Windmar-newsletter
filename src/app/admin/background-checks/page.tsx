'use client'
import { useEffect, useState, useCallback, useMemo } from "react"
import { createClient } from "@/lib/supabase/client"

const BG_CHECK_DOC_NAME = "Windmar- Home Depot Background Check"
const LOCATION_ID = "eTTRenV5nD46gQbZ5A9E"
const PAGE_SIZE = 20
const INITIAL_PAGES = 3

const SELFIE_FIELD_ID = "IvtzPRyBRw6fUpvsLQZ0"
const ID_FIELD_ID = "WpmuIT4Pdot4M644rxtt"
const SSN_FIELD_ID = "yHDtP3x1ZLCAEzbbLoBE"

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

type FileInfo = { url: string; name: string }
type ContactFiles = { selfie?: FileInfo; id?: FileInfo; ssn?: FileInfo }

type MergedRecord = {
  documentId: string
  contactId: string
  repName: string
  repEmail: string
  docStatus: string
  createdAt: string
  updatedAt: string
  signedDate: string | null
  hrStatus: string
  approvedAt: string | null
  shirtGivenAt: string | null
  badgePrintedAt: string | null
  localId: string | null
  files: ContactFiles | null
  loadingFiles: boolean
}

export default function BackgroundChecksPage() {
  const [records, setRecords] = useState<MergedRecord[]>([])
  const [loading, setLoading] = useState(true)
  const [loadingMore, setLoadingMore] = useState(false)
  const [loadingProgress, setLoadingProgress] = useState("")
  const [filter, setFilter] = useState("all")
  const [search, setSearch] = useState("")
  const [toast, setToast] = useState("")
  const [currentSkip, setCurrentSkip] = useState(0)
  const [hasMore, setHasMore] = useState(true)
  const supabase = createClient()

  function showToast(msg: string) { setToast(msg); setTimeout(() => setToast(""), 3000) }

  const fetchPages = useCallback(async (startSkip: number, numPages: number): Promise<{ docs: GHLDocument[]; nextSkip: number; moreAvailable: boolean }> => {
    const bgDocs: GHLDocument[] = []
    let skip = startSkip
    let moreAvailable = true

    for (let i = 0; i < numPages; i++) {
      const res = await fetch(`/api/ghl/test?endpoint=/proposals/document?locationId=${LOCATION_ID}%26limit=${PAGE_SIZE}%26skip=${skip}`)
      const data = await res.json()
      const docs = data.documents || []

      if (docs.length === 0) { moreAvailable = false; break }

      for (const doc of docs) {
        if (doc.name === BG_CHECK_DOC_NAME && doc.status !== "draft") {
          bgDocs.push(doc)
        }
      }

      skip += PAGE_SIZE
      if (docs.length < PAGE_SIZE) { moreAvailable = false; break }
    }

    return { docs: bgDocs, nextSkip: skip, moreAvailable }
  }, [])

  const mergeWithLocal = useCallback(async (docs: GHLDocument[]): Promise<MergedRecord[]> => {
    const { data: localRecords } = await supabase.from("background_checks").select("*")
    const localMap = new Map<string, LocalRecord>()
    if (localRecords) {
      localRecords.forEach((r: LocalRecord) => { localMap.set(r.ghl_document_id, r) })
    }

    return docs.map(doc => {
      const recipient = doc.recipients[0]
      const local = localMap.get(doc.documentId)
      return {
        documentId: doc.documentId,
        contactId: recipient?.id || "",
        repName: recipient?.contactName || "Unknown",
        repEmail: recipient?.email || "",
        docStatus: doc.status,
        createdAt: doc.createdAt,
        updatedAt: doc.updatedAt,
        signedDate: recipient?.signedDate || null,
        hrStatus: local?.hr_status || "pending",
        approvedAt: local?.approved_at || null,
        shirtGivenAt: local?.shirt_given_at || null,
        badgePrintedAt: local?.badge_printed_at || null,
        localId: local?.id || null,
        files: null,
        loadingFiles: false,
      }
    }).sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
  }, [supabase])

  const loadInitial = useCallback(async () => {
    setLoading(true)
    setLoadingProgress("Fetching recent background checks...")
    try {
      const { docs, nextSkip, moreAvailable } = await fetchPages(0, INITIAL_PAGES)
      const merged = await mergeWithLocal(docs)
      setRecords(merged)
      setCurrentSkip(nextSkip)
      setHasMore(moreAvailable)
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Unknown error"
      showToast("Error: " + msg)
    }
    setLoading(false)
  }, [fetchPages, mergeWithLocal])

  const loadMore = useCallback(async () => {
    setLoadingMore(true)
    try {
      const { docs, nextSkip, moreAvailable } = await fetchPages(currentSkip, 3)
      if (docs.length > 0) {
        const merged = await mergeWithLocal([...docs])
        setRecords(prev => {
          const existingIds = new Set(prev.map(r => r.documentId))
          const newOnes = merged.filter(r => !existingIds.has(r.documentId))
          return [...prev, ...newOnes].sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
        })
      }
      setCurrentSkip(nextSkip)
      setHasMore(moreAvailable)
      if (docs.length === 0) showToast("No more records found")
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Unknown error"
      showToast("Error: " + msg)
    }
    setLoadingMore(false)
  }, [currentSkip, fetchPages, mergeWithLocal])

  useEffect(() => { loadInitial() }, [loadInitial])

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

  async function updateHRStatus(rec: MergedRecord, status: string) {
    const localId = await ensureLocalRecord(rec)
    if (!localId) return
    const updates: Record<string, string> = { hr_status: status }
    if (status === "approved") { updates.approved_at = new Date().toISOString(); updates.approved_by = "Admin" }
    await supabase.from("background_checks").update(updates).eq("id", localId)
    showToast(rec.repName + " marked as " + status)
    loadInitial()
  }

  async function updateFulfillment(rec: MergedRecord, field: string) {
    const localId = await ensureLocalRecord(rec)
    if (!localId) return
    const now = new Date().toISOString()
    const updates: Record<string, string> = {}
    if (field === "shirt") { updates.shirt_given_at = now; updates.shirt_given_by = "Admin"; updates.fulfillment_status = "shirt_given" }
    else if (field === "badge") { updates.badge_printed_at = now; updates.badge_printed_by = "Admin" }
    if (field === "badge" && rec.shirtGivenAt) updates.fulfillment_status = "complete"
    if (field === "shirt" && rec.badgePrintedAt) updates.fulfillment_status = "complete"
    await supabase.from("background_checks").update(updates).eq("id", localId)
    showToast("Updated " + rec.repName)
    loadInitial()
  }

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

  async function loadContactFiles(rec: MergedRecord) {
    if (!rec.contactId) return
    setRecords(prev => prev.map(r => r.documentId === rec.documentId ? { ...r, loadingFiles: true } : r))
    try {
      const res = await fetch(`/api/ghl/test?endpoint=/contacts/${rec.contactId}`)
      const data = await res.json()
      const contact = data.contact
      if (!contact?.customFields) throw new Error("No custom fields")
      const files: ContactFiles = {
        selfie: extractFileFromCustomField(contact.customFields, SELFIE_FIELD_ID),
        id: extractFileFromCustomField(contact.customFields, ID_FIELD_ID),
        ssn: extractFileFromCustomField(contact.customFields, SSN_FIELD_ID),
      }
      setRecords(prev => prev.map(r => r.documentId === rec.documentId ? { ...r, files, loadingFiles: false } : r))
    } catch {
      setRecords(prev => prev.map(r => r.documentId === rec.documentId ? { ...r, files: {}, loadingFiles: false } : r))
      showToast("Could not load files for " + rec.repName)
    }
  }

  const docColor: Record<string, { bg: string; color: string }> = {
    sent: { bg: "#f0f9ff", color: "#0369a1" },
    viewed: { bg: "#fef9c3", color: "#a16207" },
    completed: { bg: "#f0fdf4", color: "#15803d" },
  }
  const hrColor: Record<string, { bg: string; color: string }> = {
    pending: { bg: "#f3f4f6", color: "#6b7280" },
    approved: { bg: "#f0fdf4", color: "#15803d" },
    denied: { bg: "#fef2f2", color: "#dc2626" },
  }

  const filtered = useMemo(() => {
    let list = filter === "all" ? records :
      filter === "sent" ? records.filter(r => r.docStatus === "sent" || r.docStatus === "viewed") :
      filter === "completed" ? records.filter(r => r.docStatus === "completed" && r.hrStatus !== "approved") :
      filter === "approved" ? records.filter(r => r.hrStatus === "approved" && !(r.shirtGivenAt && r.badgePrintedAt)) :
      filter === "done" ? records.filter(r => !!(r.shirtGivenAt && r.badgePrintedAt)) :
      records

    if (search.trim()) {
      const q = search.toLowerCase().trim()
      list = list.filter(r =>
        r.repName.toLowerCase().includes(q) ||
        r.repEmail.toLowerCase().includes(q)
      )
    }
    return list
  }, [records, filter, search])

  const stats = useMemo(() => ({
    total: records.length,
    sent: records.filter(r => r.docStatus === "sent" || r.docStatus === "viewed").length,
    needsApproval: records.filter(r => r.docStatus === "completed" && r.hrStatus !== "approved").length,
    needsFulfillment: records.filter(r => r.hrStatus === "approved" && !(r.shirtGivenAt && r.badgePrintedAt)).length,
    done: records.filter(r => !!(r.shirtGivenAt && r.badgePrintedAt)).length,
  }), [records])

  const fmt = (iso: string) => {
    try { return new Date(iso).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" }) } catch { return "-" }
  }

  if (loading) return (
    <div style={{ padding: 32, textAlign: "center", color: "#6b7280" }}>
      <div style={{ fontSize: 24, marginBottom: 8 }}>Loading background checks...</div>
      <div style={{ fontSize: 14 }}>{loadingProgress}</div>
    </div>
  )

  return (
    <div style={{ padding: "16px 20px", maxWidth: 900, margin: "0 auto" }}>
      {toast && <div style={{ position: "fixed", top: 20, right: 20, background: "#1a2f6e", color: "white", padding: "12px 20px", borderRadius: 8, zIndex: 9999, fontSize: 14, boxShadow: "0 4px 12px rgba(0,0,0,.2)" }}>{toast}</div>}

      <h1 style={{ fontSize: 22, fontWeight: 700, color: "#1a2f6e", margin: "0 0 12px" }}>HD Background Checks</h1>

      <input
        type="text"
        placeholder="Search by name or email..."
        value={search}
        onChange={e => setSearch(e.target.value)}
        style={{ width: "100%", padding: "10px 14px", borderRadius: 10, border: "2px solid #e5e7eb", fontSize: 14, marginBottom: 12, outline: "none" }}
      />

      <div style={{ display: "flex", gap: 8, flexWrap: "wrap", marginBottom: 16 }}>
        {[
          { label: "Total", value: stats.total, key: "all", color: "#1a2f6e" },
          { label: "Sent/Viewed", value: stats.sent, key: "sent", color: "#0369a1" },
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
        <div style={{ textAlign: "center", color: "#9ca3af", padding: 40, fontSize: 15 }}>No records found</div>
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
                {rec.docStatus === "completed" && (
                  <span style={{ padding: "3px 10px", borderRadius: 20, fontSize: 12, fontWeight: 600, background: hc.bg, color: hc.color }}>HR: {rec.hrStatus.toUpperCase()}</span>
                )}
              </div>
            </div>

            <div style={{ fontSize: 13, color: "#6b7280", marginBottom: 8 }}>
              <span>{rec.repEmail}</span>
              <span style={{ margin: "0 8px" }}>{"\u2022"}</span>
              <span>Sent: {fmt(rec.createdAt)}</span>
              {rec.signedDate && <><span style={{ margin: "0 8px" }}>{"\u2022"}</span><span>Signed: {fmt(rec.signedDate)}</span></>}
            </div>

            <div style={{ display: "flex", gap: 6, flexWrap: "wrap", alignItems: "center" }}>
              {rec.docStatus === "completed" && rec.hrStatus === "pending" && (
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

              {rec.docStatus === "completed" && !rec.files && !rec.loadingFiles && (
                <button onClick={() => loadContactFiles(rec)}
                  style={{ padding: "6px 14px", borderRadius: 8, border: "2px solid #1a2f6e", background: "white", color: "#1a2f6e", fontWeight: 600, fontSize: 13, cursor: "pointer" }}>
                  Load Documents
                </button>
              )}
              {rec.loadingFiles && <span style={{ fontSize: 13, color: "#6b7280" }}>Loading files...</span>}

              {rec.files && (
                <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
                  {rec.files.selfie && <a href={rec.files.selfie.url} target="_blank" rel="noopener noreferrer" style={{ padding: "6px 12px", borderRadius: 8, background: "#eff6ff", color: "#1d4ed8", fontSize: 12, fontWeight: 600, textDecoration: "none" }}>Selfie</a>}
                  {rec.files.id && <a href={rec.files.id.url} target="_blank" rel="noopener noreferrer" style={{ padding: "6px 12px", borderRadius: 8, background: "#eff6ff", color: "#1d4ed8", fontSize: 12, fontWeight: 600, textDecoration: "none" }}>ID</a>}
                  {rec.files.ssn && <a href={rec.files.ssn.url} target="_blank" rel="noopener noreferrer" style={{ padding: "6px 12px", borderRadius: 8, background: "#eff6ff", color: "#1d4ed8", fontSize: 12, fontWeight: 600, textDecoration: "none" }}>SSN Card</a>}
                  {!rec.files.selfie && !rec.files.id && !rec.files.ssn && <span style={{ fontSize: 12, color: "#9ca3af" }}>No files uploaded</span>}
                </div>
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

      <div style={{ display: "flex", gap: 8, marginTop: 12 }}>
        {hasMore && (
          <button onClick={loadMore} disabled={loadingMore}
            style={{ flex: 1, padding: "10px 20px", borderRadius: 8, border: "2px solid #b45309", background: "white", color: "#b45309", fontWeight: 600, cursor: "pointer" }}>
            {loadingMore ? "Loading..." : "Load More Records"}
          </button>
        )}
        <button onClick={loadInitial}
          style={{ flex: 1, padding: "10px 20px", borderRadius: 8, border: "2px solid #1a2f6e", background: "white", color: "#1a2f6e", fontWeight: 600, cursor: "pointer" }}>
          Refresh
        </button>
      </div>
    </div>
  )
}
