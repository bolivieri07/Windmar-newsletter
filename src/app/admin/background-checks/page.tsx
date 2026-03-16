'use client'
import { useEffect, useState, useCallback, useRef } from "react"
import { createClient } from "@/lib/supabase/client"

const BG_CHECK_DOC_NAME = "Windmar- Home Depot Background Check"
const LOCATION_ID = "eTTRenV5nD46gQbZ5A9E"
const PAGE_SIZE = 20
const CUTOFF_DATE = "2025-01-01T00:00:00.000Z"

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

type FileInfo = {
  url: string
  name: string
}

type ContactFiles = {
  selfie?: FileInfo
  id?: FileInfo
  ssn?: FileInfo
}

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

type Totals = {
  total: number
  completed: number
  sent: number
  viewed: number
  draft: number
}

export default function BackgroundChecksPage() {
  const [records, setRecords] = useState<MergedRecord[]>([])
  const [loading, setLoading] = useState(true)
  const [loadingMore, setLoadingMore] = useState(false)
  const [filter, setFilter] = useState("all")
  const [search, setSearch] = useState("")
  const [searchResults, setSearchResults] = useState<MergedRecord[] | null>(null)
  const [searching, setSearching] = useState(false)
  const [toast, setToast] = useState("")
  const [copiedId, setCopiedId] = useState<string | null>(null)
  const [resendingId, setResendingId] = useState<string | null>(null)
  const [skip, setSkip] = useState(0)
  const [hasMore, setHasMore] = useState(true)
  const [totals, setTotals] = useState<Totals | null>(null)
  const [totalsLoading, setTotalsLoading] = useState(true)
  const searchTimer = useRef<NodeJS.Timeout | null>(null)
  const supabase = createClient()

  function showToast(msg: string) { setToast(msg); setTimeout(() => setToast(""), 3000) }

  // === Fast totals from dedicated API ===
  const loadTotals = useCallback(async () => {
    setTotalsLoading(true)
    try {
      const res = await fetch("/api/ghl/bg-check-totals")
      if (res.ok) { setTotals(await res.json()) }
    } catch { /* silent */ }
    setTotalsLoading(false)
  }, [])

  // === Merge GHL docs with Supabase local records ===
  async function mergeWithLocal(docs: GHLDocument[]): Promise<MergedRecord[]> {
    const { data: localRecords } = await supabase.from("background_checks").select("*")
    const localMap = new Map<string, LocalRecord>()
    if (localRecords) { localRecords.forEach((r: LocalRecord) => { localMap.set(r.ghl_document_id, r) }) }

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
    })
  }

  // === Load one page of documents for the list ===
  const fetchPage = useCallback(async (currentSkip: number, append: boolean) => {
    if (append) { setLoadingMore(true) } else { setLoading(true) }
    try {
      const res = await fetch(`/api/ghl/test?endpoint=/proposals/document?locationId=${LOCATION_ID}%26limit=${PAGE_SIZE}%26skip=${currentSkip}`)
      const data = await res.json()
      const docs: GHLDocument[] = data.documents || []

      if (docs.length === 0) { setHasMore(false); setLoading(false); setLoadingMore(false); return }

      const bgDocs: GHLDocument[] = []
      let hitCutoff = false
      for (const doc of docs) {
        if (doc.name === BG_CHECK_DOC_NAME && doc.status !== "draft") { bgDocs.push(doc) }
        if (new Date(doc.createdAt) < new Date(CUTOFF_DATE)) { hitCutoff = true; break }
      }

      if (hitCutoff || docs.length < PAGE_SIZE) setHasMore(false)

      const newMerged = await mergeWithLocal(bgDocs)

      if (append) {
        setRecords(prev => {
          const ids = new Set(prev.map(r => r.documentId))
          return [...prev, ...newMerged.filter(r => !ids.has(r.documentId))]
        })
      } else {
        setRecords(newMerged)
      }
    } catch (err: unknown) {
      showToast("Error: " + (err instanceof Error ? err.message : "Unknown"))
    }
    setLoading(false)
    setLoadingMore(false)
  }, [supabase])

  useEffect(() => { loadTotals(); fetchPage(0, false) }, [loadTotals, fetchPage])

  // === Search GHL API with debounce ===
  useEffect(() => {
    if (searchTimer.current) clearTimeout(searchTimer.current)

    const q = search.trim()
    if (!q) {
      setSearchResults(null)
      setSearching(false)
      return
    }

    // First filter locally loaded records instantly
    const lower = q.toLowerCase()
    const localMatches = records.filter(r =>
      r.repName.toLowerCase().includes(lower) ||
      r.repEmail.toLowerCase().includes(lower)
    )
    // Show local matches immediately while we search GHL
    if (localMatches.length > 0) {
      setSearchResults(localMatches)
    }

    // Debounce the GHL API search
    searchTimer.current = setTimeout(async () => {
      setSearching(true)
      try {
        // Search GHL with query param - searches across all docs in location
        const res = await fetch(`/api/ghl/test?endpoint=/proposals/document?locationId=${LOCATION_ID}%26limit=${PAGE_SIZE}%26query=${encodeURIComponent(q)}`)
        const data = await res.json()
        const docs: GHLDocument[] = data.documents || []

        // Filter to background check docs only
        const bgDocs = docs.filter(d => d.name === BG_CHECK_DOC_NAME && d.status !== "draft")

        if (bgDocs.length > 0) {
          const merged = await mergeWithLocal(bgDocs)
          // Combine with local matches, deduplicate
          const allIds = new Set<string>()
          const combined: MergedRecord[] = []
          for (const r of [...localMatches, ...merged]) {
            if (!allIds.has(r.documentId)) {
              allIds.add(r.documentId)
              combined.push(r)
            }
          }
          combined.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
          setSearchResults(combined)
        } else if (localMatches.length === 0) {
          setSearchResults([])
        }
      } catch {
        // Keep local matches if API fails
        if (localMatches.length === 0) setSearchResults([])
      }
      setSearching(false)
    }, 500)

    return () => { if (searchTimer.current) clearTimeout(searchTimer.current) }
  }, [search, records, supabase])

  function handleLoadMore() {
    const next = skip + PAGE_SIZE
    setSkip(next)
    fetchPage(next, true)
  }

  function handleRefresh() {
    setSkip(0); setHasMore(true); setRecords([]); setSearch(""); setSearchResults(null)
    loadTotals()
    fetchPage(0, false)
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
    const updateRec = (prev: MergedRecord[]) => prev.map(r => r.documentId === rec.documentId ? { ...r, localId: data.id } : r)
    setRecords(updateRec)
    if (searchResults) setSearchResults(updateRec)
    return data.id
  }

  async function updateHRStatus(rec: MergedRecord, status: string) {
    const localId = await ensureLocalRecord(rec)
    if (!localId) return
    const updates: Record<string, string> = { hr_status: status }
    if (status === "approved") { updates.approved_at = new Date().toISOString(); updates.approved_by = "Admin" }
    await supabase.from("background_checks").update(updates).eq("id", localId)
    const updater = (prev: MergedRecord[]) => prev.map(r => r.documentId === rec.documentId ? { ...r, hrStatus: status, approvedAt: status === "approved" ? new Date().toISOString() : r.approvedAt } : r)
    setRecords(updater)
    if (searchResults) setSearchResults(updater)
    showToast(rec.repName + " marked as " + status)
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
    const updater = (prev: MergedRecord[]) => prev.map(r => r.documentId === rec.documentId ? { ...r, shirtGivenAt: field === "shirt" ? now : r.shirtGivenAt, badgePrintedAt: field === "badge" ? now : r.badgePrintedAt } : r)
    setRecords(updater)
    if (searchResults) setSearchResults(updater)
    showToast("Updated " + rec.repName)
  }

  function extractFileFromCustomField(customFields: Record<string, unknown>[], fieldId: string): FileInfo | undefined {
    const field = customFields.find((f: Record<string, unknown>) => f.id === fieldId)
    if (!field || !field.value || typeof field.value !== "object") return undefined
    const val = field.value as Record<string, Record<string, unknown>>
    const keys = Object.keys(val)
    if (keys.length === 0) return undefined
    const firstKey = keys[0]
    const entry = val[firstKey] as { url?: string; meta?: { originalname?: string } }
    if (!entry?.url) return undefined
    return { url: entry.url, name: entry.meta?.originalname || "file" }
  }

  async function loadContactFiles(rec: MergedRecord) {
    if (!rec.contactId) return
    const setLoading = (prev: MergedRecord[]) => prev.map(r => r.documentId === rec.documentId ? { ...r, loadingFiles: true } : r)
    setRecords(setLoading)
    if (searchResults) setSearchResults(setLoading)
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
      const setFiles = (prev: MergedRecord[]) => prev.map(r => r.documentId === rec.documentId ? { ...r, files, loadingFiles: false } : r)
      setRecords(setFiles)
      if (searchResults) setSearchResults(setFiles)
    } catch {
      const setEmpty = (prev: MergedRecord[]) => prev.map(r => r.documentId === rec.documentId ? { ...r, files: {}, loadingFiles: false } : r)
      setRecords(setEmpty)
      if (searchResults) setSearchResults(setEmpty)
      showToast("Could not load files for " + rec.repName)
    }
  }

  function handleDownloadDoc(rec: MergedRecord) {
    window.open(`/api/ghl/test?endpoint=/proposals/document/${rec.documentId}`, "_blank")
    showToast("Opening document for " + rec.repName)
  }

  async function handleResendContract(rec: MergedRecord) {
    if (!confirm("Resend contract to " + (rec.repName || rec.repEmail) + "?")) return
    setResendingId(rec.documentId)
    try {
      const res = await fetch("/api/ghl/resend-document", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ documentId: rec.documentId, locationId: LOCATION_ID }),
      })
      const data = await res.json()
      if (res.ok && !data.error) { showToast("Contract resent to " + rec.repName + "!") }
      else { showToast("Resend failed: " + (data.message || data.error || "Unknown error")) }
    } catch (err: unknown) {
      showToast("Resend failed: " + (err instanceof Error ? err.message : "Unknown"))
    }
    setResendingId(null)
  }

  async function handleCopyLink(rec: MergedRecord) {
    const link = `https://link.windmarsolaracademy.com/widget/proposal/${rec.documentId}`
    try { await navigator.clipboard.writeText(link) } catch {
      const ta = document.createElement("textarea"); ta.value = link; document.body.appendChild(ta); ta.select(); document.execCommand("copy"); document.body.removeChild(ta)
    }
    setCopiedId(rec.documentId); showToast("Signing link copied!"); setTimeout(() => setCopiedId(null), 2500)
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

  // Use search results when searching, otherwise filter loaded records
  const activeRecords = searchResults !== null ? searchResults : records

  const filtered = filter === "all" ? activeRecords :
    filter === "sent" ? activeRecords.filter(r => r.docStatus === "sent" || r.docStatus === "viewed") :
    filter === "completed" ? activeRecords.filter(r => r.docStatus === "completed" && r.hrStatus !== "approved") :
    filter === "approved" ? activeRecords.filter(r => r.hrStatus === "approved" && !(r.shirtGivenAt && r.badgePrintedAt)) :
    filter === "done" ? activeRecords.filter(r => !!(r.shirtGivenAt && r.badgePrintedAt)) :
    activeRecords

  const fmt = (iso: string) => {
    try { return new Date(iso).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" }) } catch { return "-" }
  }

  const displayTotals = {
    total: totals?.total ?? records.length,
    sent: totals ? (totals.sent + totals.viewed) : records.filter(r => r.docStatus === "sent" || r.docStatus === "viewed").length,
    needsApproval: totals?.completed ?? records.filter(r => r.docStatus === "completed").length,
    needsFulfillment: records.filter(r => r.hrStatus === "approved" && !(r.shirtGivenAt && r.badgePrintedAt)).length,
    done: records.filter(r => !!(r.shirtGivenAt && r.badgePrintedAt)).length,
  }

  if (loading) return (
    <div style={{ padding: 32, textAlign: "center", color: "#6b7280" }}>
      <div style={{ fontSize: 24, marginBottom: 8 }}>Loading background checks...</div>
    </div>
  )

  return (
    <div style={{ padding: "16px 20px", maxWidth: 900, margin: "0 auto" }}>
      {toast && <div style={{ position: "fixed", top: 20, right: 20, background: "#1a2f6e", color: "white", padding: "12px 20px", borderRadius: 8, zIndex: 9999, fontSize: 14, boxShadow: "0 4px 12px rgba(0,0,0,.2)" }}>{toast}</div>}

      <h1 style={{ fontSize: 22, fontWeight: 700, color: "#1a2f6e", margin: "0 0 16px" }}>HD Background Checks</h1>

      <div style={{ display: "flex", gap: 8, flexWrap: "wrap", marginBottom: 16 }}>
        {[
          { label: "Total", value: displayTotals.total, key: "all", color: "#1a2f6e" },
          { label: "Sent/Viewed", value: displayTotals.sent, key: "sent", color: "#0369a1" },
          { label: "Needs Approval", value: displayTotals.needsApproval, key: "completed", color: "#b45309" },
          { label: "Needs Fulfillment", value: displayTotals.needsFulfillment, key: "approved", color: "#7c3aed" },
          { label: "Done", value: displayTotals.done, key: "done", color: "#15803d" },
        ].map(s => (
          <button key={s.key} onClick={() => setFilter(s.key)}
            style={{
              flex: "1 1 100px", padding: "10px 8px", border: filter === s.key ? `2px solid ${s.color}` : "2px solid #e5e7eb",
              borderRadius: 10, background: filter === s.key ? s.color : "white", color: filter === s.key ? "white" : s.color,
              cursor: "pointer", textAlign: "center", fontWeight: 600, fontSize: 13, transition: "all .2s",
            }}>
            <div style={{ fontSize: 22, fontWeight: 700 }}>
              {totalsLoading && (s.key === "all" || s.key === "sent" || s.key === "completed") ? "..." : s.value}
            </div>
            {s.label}
          </button>
        ))}
      </div>

      {/* Search bar - searches GHL API */}
      <div style={{ marginBottom: 16, position: "relative" }}>
        <input type="text" placeholder="Search contacts across all contracts..." value={search} onChange={(e) => setSearch(e.target.value)}
          style={{ width: "100%", padding: "10px 14px", paddingRight: search ? 60 : 14, border: "2px solid #e5e7eb", borderRadius: 10, fontSize: 14, outline: "none", boxSizing: "border-box" }}
          onFocus={(e) => { e.currentTarget.style.borderColor = "#1a2f6e" }}
          onBlur={(e) => { e.currentTarget.style.borderColor = "#e5e7eb" }}
        />
        {searching && <span style={{ position: "absolute", right: search ? 36 : 10, top: "50%", transform: "translateY(-50%)", fontSize: 12, color: "#6b7280" }}>Searching...</span>}
        {search && <button onClick={() => setSearch("")} style={{ position: "absolute", right: 10, top: "50%", transform: "translateY(-50%)", background: "none", border: "none", cursor: "pointer", fontSize: 18, color: "#9ca3af" }}>{"\u00D7"}</button>}
      </div>

      {filtered.length === 0 ? (
        <div style={{ textAlign: "center", color: "#9ca3af", padding: 40, fontSize: 15 }}>
          {searching ? "Searching GHL..." : search ? `No contracts found for "${search}"` : "No records in this category"}
        </div>
      ) : filtered.map(rec => {
        const dc = docColor[rec.docStatus] || docColor.sent
        const hc = hrColor[rec.hrStatus] || hrColor.pending
        const isDone = !!(rec.shirtGivenAt && rec.badgePrintedAt)

        return (
          <div key={rec.documentId} style={{ border: "1px solid #e5e7eb", borderRadius: 12, padding: 16, marginBottom: 10, background: isDone ? "#f9fafb" : "white", opacity: isDone ? 0.75 : 1 }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: 6, marginBottom: 8 }}>
              <div style={{ fontWeight: 700, fontSize: 16, color: "#1a2f6e" }}>{rec.repName}</div>
              <div style={{ display: "flex", gap: 6 }}>
                <span style={{ padding: "3px 10px", borderRadius: 20, fontSize: 12, fontWeight: 600, background: dc.bg, color: dc.color }}>{rec.docStatus.toUpperCase()}</span>
                {rec.docStatus === "completed" && <span style={{ padding: "3px 10px", borderRadius: 20, fontSize: 12, fontWeight: 600, background: hc.bg, color: hc.color }}>HR: {rec.hrStatus.toUpperCase()}</span>}
              </div>
            </div>

            <div style={{ fontSize: 13, color: "#6b7280", marginBottom: 8 }}>
              <span>{rec.repEmail}</span><span style={{ margin: "0 8px" }}>{"\u2022"}</span><span>Sent: {fmt(rec.createdAt)}</span>
              {rec.signedDate && <><span style={{ margin: "0 8px" }}>{"\u2022"}</span><span>Signed: {fmt(rec.signedDate)}</span></>}
            </div>

            <div style={{ display: "flex", gap: 6, flexWrap: "wrap", alignItems: "center" }}>
              {rec.docStatus === "completed" && rec.hrStatus === "pending" && (
                <>
                  <button onClick={() => updateHRStatus(rec, "approved")} style={{ padding: "6px 14px", borderRadius: 8, border: "none", background: "#15803d", color: "white", fontWeight: 600, fontSize: 13, cursor: "pointer" }}>Approve</button>
                  <button onClick={() => updateHRStatus(rec, "denied")} style={{ padding: "6px 14px", borderRadius: 8, border: "none", background: "#dc2626", color: "white", fontWeight: 600, fontSize: 13, cursor: "pointer" }}>Deny</button>
                </>
              )}

              {rec.docStatus === "completed" && !rec.files && !rec.loadingFiles && (
                <button onClick={() => loadContactFiles(rec)} style={{ padding: "6px 14px", borderRadius: 8, border: "2px solid #1a2f6e", background: "white", color: "#1a2f6e", fontWeight: 600, fontSize: 13, cursor: "pointer" }}>Load Documents</button>
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

              {rec.docStatus === "completed" && <button onClick={() => handleDownloadDoc(rec)} style={{ padding: "6px 14px", borderRadius: 8, border: "2px solid #0369a1", background: "white", color: "#0369a1", fontWeight: 600, fontSize: 13, cursor: "pointer" }}>Download Doc</button>}

              <button onClick={() => handleCopyLink(rec)} style={{ padding: "6px 14px", borderRadius: 8, border: copiedId === rec.documentId ? "2px solid #15803d" : "2px solid #6b7280", background: copiedId === rec.documentId ? "#f0fdf4" : "white", color: copiedId === rec.documentId ? "#15803d" : "#6b7280", fontWeight: 600, fontSize: 13, cursor: "pointer", transition: "all .2s" }}>
                {copiedId === rec.documentId ? "\u2713 Copied!" : "Copy Link"}
              </button>

              {(rec.docStatus === "sent" || rec.docStatus === "viewed") && (
                <button onClick={() => handleResendContract(rec)} disabled={resendingId === rec.documentId}
                  style={{ padding: "6px 14px", borderRadius: 8, border: "2px solid #b45309", background: "white", color: "#b45309", fontWeight: 600, fontSize: 13, cursor: resendingId === rec.documentId ? "wait" : "pointer", opacity: resendingId === rec.documentId ? 0.6 : 1 }}>
                  {resendingId === rec.documentId ? "Sending..." : "Resend"}
                </button>
              )}

              {rec.hrStatus === "approved" && !rec.shirtGivenAt && <button onClick={() => updateFulfillment(rec, "shirt")} style={{ padding: "6px 14px", borderRadius: 8, border: "2px solid #7c3aed", background: "white", color: "#7c3aed", fontWeight: 600, fontSize: 13, cursor: "pointer" }}>Give Shirt</button>}
              {rec.hrStatus === "approved" && rec.shirtGivenAt && !rec.badgePrintedAt && <button onClick={() => updateFulfillment(rec, "badge")} style={{ padding: "6px 14px", borderRadius: 8, border: "2px solid #7c3aed", background: "white", color: "#7c3aed", fontWeight: 600, fontSize: 13, cursor: "pointer" }}>Print Badge</button>}

              {rec.shirtGivenAt && <span style={{ padding: "6px 12px", borderRadius: 8, background: "#f0fdf4", color: "#15803d", fontSize: 12, fontWeight: 600 }}>Shirt {fmt(rec.shirtGivenAt)}</span>}
              {rec.badgePrintedAt && <span style={{ padding: "6px 12px", borderRadius: 8, background: "#f0fdf4", color: "#15803d", fontSize: 12, fontWeight: 600 }}>Badge {fmt(rec.badgePrintedAt)}</span>}
              {isDone && <span style={{ padding: "6px 12px", borderRadius: 8, background: "#15803d", color: "white", fontSize: 12, fontWeight: 700 }}>COMPLETE</span>}
            </div>
          </div>
        )
      })}

      {/* Load More / Refresh - only show when not searching */}
      {!search && (
        <div style={{ display: "flex", gap: 8, marginTop: 12 }}>
          {hasMore && (
            <button onClick={handleLoadMore} disabled={loadingMore}
              style={{ flex: 1, padding: "10px 20px", borderRadius: 8, border: "none", background: "#1a2f6e", color: "white", fontWeight: 600, cursor: loadingMore ? "wait" : "pointer", opacity: loadingMore ? 0.7 : 1 }}>
              {loadingMore ? "Loading more..." : `Load More (showing ${records.length})`}
            </button>
          )}
          {!hasMore && <div style={{ flex: 1, padding: "10px", textAlign: "center", fontSize: 13, color: "#6b7280" }}>Showing all {records.length} loaded</div>}
          <button onClick={handleRefresh} style={{ padding: "10px 20px", borderRadius: 8, border: "2px solid #1a2f6e", background: "white", color: "#1a2f6e", fontWeight: 600, cursor: "pointer", minWidth: 120 }}>Refresh</button>
        </div>
      )}
    </div>
  )
}
