'use client'
import { useEffect, useState } from "react"
import { createClient } from "@/lib/supabase/client"

const HR_EMAIL = "tatianna.velez@windmarhome.com"

type BGCheck = {
  id: string
  rep_name: string
  rep_email: string
  rep_phone: string
  ghl_contact_id: string
  document_status: string
  hr_status: string
  fulfillment_status: string
  hr_notified_at: string | null
  approved_at: string | null
  approved_by: string | null
  shirt_given_at: string | null
  shirt_given_by: string | null
  badge_printed_at: string | null
  badge_printed_by: string | null
  notes: string | null
  created_at: string
}

const DOC_STATUSES = ["sent", "viewed", "completed"]
const HR_STATUSES = ["pending", "notified", "approved", "denied"]
const FULFILL_STATUSES = ["pending", "shirt_given", "badge_printed", "complete"]

const statusLabels: Record<string, string> = {
  sent: "Document Sent", viewed: "Document Viewed", completed: "Document Completed",
  pending: "Pending", notified: "HR Notified", approved: "Approved", denied: "Denied",
  shirt_given: "Shirt Given", badge_printed: "Badge Printed", complete: "Complete",
}

const statusColors: Record<string, { bg: string; color: string }> = {
  sent: { bg: "#f0f9ff", color: "#0369a1" },
  viewed: { bg: "#fef3e2", color: "#b45309" },
  completed: { bg: "#f0fdf4", color: "#15803d" },
  pending: { bg: "#f3f4f6", color: "#6b7280" },
  notified: { bg: "#fef3e2", color: "#b45309" },
  approved: { bg: "#f0fdf4", color: "#15803d" },
  denied: { bg: "#fef2f2", color: "#dc2626" },
  shirt_given: { bg: "#f0f9ff", color: "#0369a1" },
  badge_printed: { bg: "#fdf4ff", color: "#7c3aed" },
  complete: { bg: "#f0fdf4", color: "#059669" },
}

export default function BackgroundChecksPage() {
  const [checks, setChecks] = useState<BGCheck[]>([])
  const [loading, setLoading] = useState(true)
  const [showForm, setShowForm] = useState(false)
  const [saving, setSaving] = useState(false)
  const [toast, setToast] = useState("")
  const [filter, setFilter] = useState("all")
  const [form, setForm] = useState({ rep_name: "", rep_email: "", rep_phone: "", notes: "" })
  const [ghlContacts, setGhlContacts] = useState<any[]>([])
  const [loadingContacts, setLoadingContacts] = useState(false)
  const supabase = createClient()

  useEffect(() => { fetchChecks() }, [])

  function showToast(msg: string) { setToast(msg); setTimeout(() => setToast(""), 3000) }

  async function fetchChecks() {
    setLoading(true)
    const { data } = await supabase
      .from("background_checks")
      .select("*")
      .order("created_at", { ascending: false })
    setChecks(data || [])
    setLoading(false)
  }

  async function fetchGHLContacts() {
    setLoadingContacts(true)
    try {
      const res = await fetch("/api/ghl")
      const data = await res.json()
      if (data.contacts) setGhlContacts(data.contacts)
    } catch (err) { console.error(err) }
    setLoadingContacts(false)
  }

  function selectGHLContact(contact: any) {
    setForm({
      rep_name: contact.name || "",
      rep_email: contact.email || "",
      rep_phone: contact.phone || "",
      notes: "",
    })
  }

  async function handleCreate() {
    if (!form.rep_name.trim()) { showToast("Rep name is required"); return }
    setSaving(true)
    const { error } = await supabase.from("background_checks").insert({
      rep_name: form.rep_name,
      rep_email: form.rep_email || null,
      rep_phone: form.rep_phone || null,
      notes: form.notes || null,
      document_status: "sent",
      hr_status: "pending",
      fulfillment_status: "pending",
    })
    if (error) { showToast("Error: " + error.message); setSaving(false); return }
    showToast("Background check added!")
    setShowForm(false)
    setForm({ rep_name: "", rep_email: "", rep_phone: "", notes: "" })
    fetchChecks()
    setSaving(false)
  }

  async function updateDocStatus(id: string, newStatus: string) {
    const updates: any = { document_status: newStatus }
    await supabase.from("background_checks").update(updates).eq("id", id)
    setChecks(prev => prev.map(c => c.id === id ? { ...c, ...updates } : c))

    if (newStatus === "completed") {
      await notifyHR(id)
    }
    showToast("Document status updated!")
  }

  async function notifyHR(id: string) {
    const check = checks.find(c => c.id === id)
    if (!check) return
    try {
      const ghlContacts = await (await fetch("/api/ghl")).json()
      const hrMessage = `Background Check Completed - ${check.rep_name}. Email: ${check.rep_email || "N/A"}, Phone: ${check.rep_phone || "N/A"}. Please review and approve in the Solar Academy admin portal.`
      
      await fetch("/api/ghl", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          type: "hr_notification",
          title: "Background Check Completed: " + check.rep_name,
          message: hrMessage,
          emailSubject: "Background Check Completed: " + check.rep_name,
          emailBody: `
            <div style="font-family:Arial,sans-serif;max-width:600px;margin:0 auto">
              <div style="background:#1a2f6e;padding:24px;border-radius:12px 12px 0 0">
                <h1 style="color:#f89b24;margin:0;font-size:20px">Background Check Completed</h1>
              </div>
              <div style="background:white;padding:24px;border:1px solid #e5e7eb;border-radius:0 0 12px 12px">
                <h2 style="color:#1a2f6e;margin:0 0 16px">Rep: ${check.rep_name}</h2>
                <p style="margin:4px 0"><strong>Email:</strong> ${check.rep_email || "N/A"}</p>
                <p style="margin:4px 0"><strong>Phone:</strong> ${check.rep_phone || "N/A"}</p>
                <p style="margin:16px 0 0;color:#6b7280">Please review and mark as approved in the admin portal.</p>
              </div>
            </div>`,
        }),
      })

      await supabase.from("background_checks").update({
        hr_status: "notified",
        hr_notified_at: new Date().toISOString(),
      }).eq("id", id)
      setChecks(prev => prev.map(c => c.id === id ? { ...c, hr_status: "notified", hr_notified_at: new Date().toISOString() } : c))
      showToast("HR notified!")
    } catch (err: any) { showToast("HR notification failed: " + err.message) }
  }

  async function updateHRStatus(id: string, newStatus: string) {
    const updates: any = { hr_status: newStatus }
    if (newStatus === "approved") {
      updates.approved_at = new Date().toISOString()
      updates.approved_by = "Admin"
    }
    await supabase.from("background_checks").update(updates).eq("id", id)
    setChecks(prev => prev.map(c => c.id === id ? { ...c, ...updates } : c))
    showToast("HR status updated!")
  }

  async function updateFulfillment(id: string, field: string) {
    const now = new Date().toISOString()
    const updates: any = {}
    if (field === "shirt") {
      updates.shirt_given_at = now
      updates.shirt_given_by = "Admin"
      updates.fulfillment_status = "shirt_given"
    } else if (field === "badge") {
      updates.badge_printed_at = now
      updates.badge_printed_by = "Admin"
      const check = checks.find(c => c.id === id)
      updates.fulfillment_status = check?.shirt_given_at ? "complete" : "badge_printed"
    }
    await supabase.from("background_checks").update(updates).eq("id", id)
    setChecks(prev => prev.map(c => {
      if (c.id !== id) return c
      const updated = { ...c, ...updates }
      if (updated.shirt_given_at && updated.badge_printed_at) updated.fulfillment_status = "complete"
      return updated
    }))
    showToast("Updated!")
  }

  async function deleteCheck(id: string) {
    if (!confirm("Delete this record?")) return
    await supabase.from("background_checks").delete().eq("id", id)
    setChecks(prev => prev.filter(c => c.id !== id))
    showToast("Deleted")
  }

  const filteredChecks = filter === "all" ? checks :
    filter === "needs_approval" ? checks.filter(c => c.document_status === "completed" && c.hr_status !== "approved") :
    filter === "needs_fulfillment" ? checks.filter(c => c.hr_status === "approved" && c.fulfillment_status !== "complete") :
    filter === "complete" ? checks.filter(c => c.fulfillment_status === "complete") :
    checks

  const stats = {
    total: checks.length,
    pending: checks.filter(c => c.document_status !== "completed").length,
    needsApproval: checks.filter(c => c.document_status === "completed" && c.hr_status !== "approved").length,
    needsFulfillment: checks.filter(c => c.hr_status === "approved" && c.fulfillment_status !== "complete").length,
    complete: checks.filter(c => c.fulfillment_status === "complete").length,
  }

  const inputStyle = {
    width: "100%", padding: "0.8rem 1rem", border: "1.5px solid #e5e7eb",
    borderRadius: 8, fontSize: "0.95rem", fontFamily: "Barlow,system-ui,sans-serif",
    outline: "none", color: "#1f2937", boxSizing: "border-box" as const, background: "white"
  }
  const labelStyle = {
    display: "block" as const, color: "#374151", fontSize: "0.78rem",
    fontWeight: 700, marginBottom: "0.4rem", textTransform: "uppercase" as const, letterSpacing: "0.04em"
  }


  return (
    <div style={{maxWidth:1200,margin:"0 auto"}}>
      <div style={{display:"flex",alignItems:"center",justifyContent:"space-between",marginBottom:"1.5rem",flexWrap:"wrap",gap:"1rem"}}>
        <div>
          <h1 style={{color:"#1a2f6e",fontSize:"1.75rem",fontWeight:800,margin:"0 0 0.25rem 0"}}>Home Depot Background Checks</h1>
          <p style={{color:"#6b7280",fontSize:"0.9rem",margin:0}}>{checks.length} total records</p>
        </div>
        <button onClick={() => { setShowForm(!showForm); if (!showForm) fetchGHLContacts() }}
          style={{padding:"0.75rem 1.25rem",background:"#f89b24",color:"white",border:"none",borderRadius:8,fontSize:"0.9rem",fontWeight:700,cursor:"pointer",fontFamily:"Barlow,system-ui,sans-serif"}}>
          {showForm ? "Cancel" : "+ Add Record"}
        </button>
      </div>

      <div style={{display:"grid",gridTemplateColumns:"repeat(auto-fit,minmax(140px,1fr))",gap:"0.75rem",marginBottom:"1.5rem"}}>
        {[
          {label:"Total",val:stats.total,color:"#1a2f6e",bg:"#e8edf8",f:"all"},
          {label:"In Progress",val:stats.pending,color:"#0369a1",bg:"#f0f9ff",f:"all"},
          {label:"Needs Approval",val:stats.needsApproval,color:"#b45309",bg:"#fef3e2",f:"needs_approval"},
          {label:"Needs Fulfillment",val:stats.needsFulfillment,color:"#7c3aed",bg:"#fdf4ff",f:"needs_fulfillment"},
          {label:"Complete",val:stats.complete,color:"#059669",bg:"#f0fdf4",f:"complete"},
        ].map(s => (
          <div key={s.label} onClick={() => setFilter(s.f)}
            style={{background:filter===s.f?s.color:s.bg,borderRadius:12,padding:"1rem",cursor:"pointer",textAlign:"center",border:filter===s.f?"2px solid "+s.color:"2px solid transparent",transition:"all 0.15s"}}>
            <div style={{fontSize:"1.75rem",fontWeight:800,color:filter===s.f?"white":s.color}}>{s.val}</div>
            <div style={{fontSize:"0.72rem",fontWeight:700,color:filter===s.f?"rgba(255,255,255,0.8)":s.color,textTransform:"uppercase",letterSpacing:"0.04em"}}>{s.label}</div>
          </div>
        ))}
      </div>

      {showForm && (
        <div style={{background:"white",borderRadius:14,padding:"1.5rem",boxShadow:"0 2px 8px rgba(0,0,0,0.06)",border:"1px solid #f3f4f6",marginBottom:"1.5rem"}}>
          <h2 style={{color:"#1a2f6e",fontSize:"1rem",fontWeight:800,textTransform:"uppercase",letterSpacing:"0.04em",margin:"0 0 1.25rem 0"}}>Add Background Check Record</h2>

          {ghlContacts.length > 0 && (
            <div style={{marginBottom:"1rem"}}>
              <label style={labelStyle}>Quick Select from GHL Contacts</label>
              <div style={{display:"flex",gap:"0.5rem",flexWrap:"wrap"}}>
                {ghlContacts.map(c => (
                  <button key={c.id} onClick={() => selectGHLContact(c)}
                    style={{padding:"0.4rem 0.8rem",borderRadius:8,border:"1.5px solid #e5e7eb",background:"white",cursor:"pointer",fontSize:"0.82rem",fontWeight:600,color:"#374151",fontFamily:"Barlow,system-ui,sans-serif",transition:"all 0.15s"}}
                    onMouseEnter={(e:any) => { e.currentTarget.style.borderColor="#f89b24"; e.currentTarget.style.background="#fef3e2" }}
                    onMouseLeave={(e:any) => { e.currentTarget.style.borderColor="#e5e7eb"; e.currentTarget.style.background="white" }}>
                    {c.name}
                  </button>
                ))}
              </div>
              {loadingContacts && <div style={{color:"#9ca3af",fontSize:"0.82rem",marginTop:"0.3rem"}}>Loading contacts...</div>}
            </div>
          )}

          <div style={{display:"grid",gridTemplateColumns:"repeat(auto-fit,minmax(200px,1fr))",gap:"1rem",marginBottom:"1rem"}}>
            <div><label style={labelStyle}>Rep Name *</label><input type="text" value={form.rep_name} onChange={e => setForm({...form,rep_name:e.target.value})} placeholder="Full name" style={inputStyle} /></div>
            <div><label style={labelStyle}>Email</label><input type="email" value={form.rep_email} onChange={e => setForm({...form,rep_email:e.target.value})} placeholder="rep@email.com" style={inputStyle} /></div>
            <div><label style={labelStyle}>Phone</label><input type="tel" value={form.rep_phone} onChange={e => setForm({...form,rep_phone:e.target.value})} placeholder="(555) 123-4567" style={inputStyle} /></div>
          </div>
          <div style={{marginBottom:"1.25rem"}}><label style={labelStyle}>Notes</label><textarea value={form.notes} onChange={e => setForm({...form,notes:e.target.value})} placeholder="Any notes..." style={{...inputStyle,minHeight:60,resize:"vertical"}} /></div>
          <div style={{display:"flex",gap:"0.75rem"}}>
            <button onClick={handleCreate} disabled={saving}
              style={{padding:"0.8rem 1.5rem",background:"#f89b24",color:"white",border:"none",borderRadius:8,fontSize:"0.9rem",fontWeight:700,cursor:saving?"not-allowed":"pointer",opacity:saving?0.7:1,fontFamily:"Barlow,system-ui,sans-serif"}}>
              {saving ? "Adding..." : "Add Record"}
            </button>
            <button onClick={() => setShowForm(false)}
              style={{padding:"0.8rem 1.5rem",background:"white",color:"#6b7280",border:"1.5px solid #e5e7eb",borderRadius:8,fontSize:"0.9rem",fontWeight:700,cursor:"pointer",fontFamily:"Barlow,system-ui,sans-serif"}}>
              Cancel
            </button>
          </div>
        </div>
      )}

      {loading ? (
        <div style={{background:"white",borderRadius:14,padding:"3rem",textAlign:"center",color:"#9ca3af",fontWeight:600}}>Loading...</div>
      ) : filteredChecks.length === 0 ? (
        <div style={{background:"white",borderRadius:14,padding:"3rem",textAlign:"center",color:"#9ca3af",fontWeight:600}}>
          {filter === "all" ? "No background checks yet. Add one to get started!" : "No records match this filter."}
        </div>
      ) : (
        <div style={{display:"grid",gap:"1rem"}}>
          {filteredChecks.map(check => {
            const docSC = statusColors[check.document_status] || statusColors.pending
            const hrSC = statusColors[check.hr_status] || statusColors.pending
            const fulSC = statusColors[check.fulfillment_status] || statusColors.pending
            const isComplete = check.fulfillment_status === "complete"
            return (
              <div key={check.id} style={{background:"white",borderRadius:14,boxShadow:"0 2px 8px rgba(0,0,0,0.06)",border:"1px solid " + (isComplete?"#bbf7d0":"#f3f4f6"),overflow:"hidden"}}>
                <div style={{padding:"1.25rem",display:"flex",gap:"1rem",alignItems:"flex-start",flexWrap:"wrap"}}>
                  <div style={{flex:"1 1 200px",minWidth:180}}>
                    <div style={{fontWeight:800,fontSize:"1.05rem",color:"#1f2937",marginBottom:"0.3rem"}}>{check.rep_name}</div>
                    <div style={{display:"flex",gap:"0.5rem",flexWrap:"wrap",marginBottom:"0.5rem"}}>
                      {check.rep_email && <div style={{fontSize:"0.82rem",color:"#6b7280"}}>{check.rep_email}</div>}
                      {check.rep_phone && <div style={{fontSize:"0.82rem",color:"#6b7280"}}>{check.rep_phone}</div>}
                    </div>
                    {check.notes && <div style={{fontSize:"0.82rem",color:"#9ca3af",fontStyle:"italic"}}>{check.notes}</div>}
                    <div style={{fontSize:"0.75rem",color:"#c4c4c4",marginTop:"0.4rem"}}>Added {new Date(check.created_at).toLocaleDateString("en-US",{month:"short",day:"numeric",year:"numeric"})}</div>
                  </div>

                  <div style={{display:"grid",gap:"0.75rem",flex:"2 1 400px",minWidth:300}}>
                    <div style={{display:"flex",alignItems:"center",gap:"0.75rem",flexWrap:"wrap"}}>
                      <div style={{fontSize:"0.72rem",fontWeight:700,color:"#9ca3af",textTransform:"uppercase",letterSpacing:"0.04em",minWidth:90}}>Document</div>
                      <div style={{display:"flex",gap:"0.35rem",flexWrap:"wrap"}}>
                        {DOC_STATUSES.map(s => (
                          <button key={s} onClick={() => updateDocStatus(check.id, s)}
                            style={{padding:"0.25rem 0.6rem",borderRadius:6,fontSize:"0.75rem",fontWeight:700,cursor:"pointer",
                              border:"1.5px solid",fontFamily:"Barlow,system-ui,sans-serif",
                              borderColor:check.document_status===s?statusColors[s].color:"#e5e7eb",
                              background:check.document_status===s?statusColors[s].bg:"white",
                              color:check.document_status===s?statusColors[s].color:"#9ca3af"}}>
                            {statusLabels[s]}
                          </button>
                        ))}
                      </div>
                    </div>

                    <div style={{display:"flex",alignItems:"center",gap:"0.75rem",flexWrap:"wrap"}}>
                      <div style={{fontSize:"0.72rem",fontWeight:700,color:"#9ca3af",textTransform:"uppercase",letterSpacing:"0.04em",minWidth:90}}>HR Status</div>
                      <div style={{display:"flex",gap:"0.35rem",flexWrap:"wrap"}}>
                        {HR_STATUSES.filter(s => s !== "pending").map(s => (
                          <button key={s} onClick={() => updateHRStatus(check.id, s)}
                            style={{padding:"0.25rem 0.6rem",borderRadius:6,fontSize:"0.75rem",fontWeight:700,cursor:"pointer",
                              border:"1.5px solid",fontFamily:"Barlow,system-ui,sans-serif",
                              borderColor:check.hr_status===s?statusColors[s].color:"#e5e7eb",
                              background:check.hr_status===s?statusColors[s].bg:"white",
                              color:check.hr_status===s?statusColors[s].color:"#9ca3af",
                              opacity:check.document_status!=="completed"&&s!=="notified"?0.4:1,
                              pointerEvents:check.document_status!=="completed"&&s!=="notified"?"none":"auto"}}>
                            {statusLabels[s]}
                          </button>
                        ))}
                      </div>
                      {check.hr_status === "pending" && (
                        <span style={{fontSize:"0.72rem",color:"#9ca3af",fontStyle:"italic"}}>Waiting for document</span>
                      )}
                      {check.hr_notified_at && <span style={{fontSize:"0.72rem",color:"#9ca3af"}}>Notified {new Date(check.hr_notified_at).toLocaleDateString()}</span>}
                      {check.approved_at && <span style={{fontSize:"0.72rem",color:"#15803d"}}>Approved {new Date(check.approved_at).toLocaleDateString()}</span>}
                    </div>

                    <div style={{display:"flex",alignItems:"center",gap:"0.75rem",flexWrap:"wrap"}}>
                      <div style={{fontSize:"0.72rem",fontWeight:700,color:"#9ca3af",textTransform:"uppercase",letterSpacing:"0.04em",minWidth:90}}>Fulfillment</div>
                      {check.hr_status === "approved" ? (
                        <div style={{display:"flex",gap:"0.5rem",flexWrap:"wrap",alignItems:"center"}}>
                          <button onClick={() => updateFulfillment(check.id, "shirt")}
                            style={{padding:"0.3rem 0.75rem",borderRadius:6,fontSize:"0.78rem",fontWeight:700,cursor:"pointer",
                              border:"1.5px solid",fontFamily:"Barlow,system-ui,sans-serif",
                              borderColor:check.shirt_given_at?"#15803d":"#e5e7eb",
                              background:check.shirt_given_at?"#f0fdf4":"white",
                              color:check.shirt_given_at?"#15803d":"#6b7280"}}>
                            {check.shirt_given_at ? "\u2713 Shirt Given" : "Give Shirt"}
                          </button>
                          <button onClick={() => updateFulfillment(check.id, "badge")}
                            style={{padding:"0.3rem 0.75rem",borderRadius:6,fontSize:"0.78rem",fontWeight:700,cursor:"pointer",
                              border:"1.5px solid",fontFamily:"Barlow,system-ui,sans-serif",
                              borderColor:check.badge_printed_at?"#7c3aed":"#e5e7eb",
                              background:check.badge_printed_at?"#fdf4ff":"white",
                              color:check.badge_printed_at?"#7c3aed":"#6b7280"}}>
                            {check.badge_printed_at ? "\u2713 Badge Printed" : "Print Badge"}
                          </button>
                          {isComplete && (
                            <span style={{padding:"0.25rem 0.6rem",borderRadius:20,fontSize:"0.75rem",fontWeight:700,background:"#059669",color:"white"}}>ALL DONE</span>
                          )}
                        </div>
                      ) : (
                        <span style={{fontSize:"0.78rem",color:"#9ca3af",fontStyle:"italic"}}>
                          {check.hr_status === "denied" ? "Denied by HR" : "Waiting for HR approval"}
                        </span>
                      )}
                    </div>
                  </div>

                  <button onClick={() => deleteCheck(check.id)}
                    style={{padding:"0.3rem 0.6rem",borderRadius:6,border:"1.5px solid #fecaca",background:"white",color:"#dc2626",fontSize:"0.75rem",fontWeight:700,cursor:"pointer",fontFamily:"Barlow,system-ui,sans-serif",flexShrink:0}}>
                    Delete
                  </button>
                </div>
              </div>
            )
          })}
        </div>
      )}

      {toast && (
        <div style={{position:"fixed",bottom:24,left:"50%",transform:"translateX(-50%)",background:"#1a2f6e",color:"white",padding:"0.75rem 1.5rem",borderRadius:30,fontSize:"0.88rem",fontWeight:600,boxShadow:"0 8px 32px rgba(0,0,0,0.2)",zIndex:999,whiteSpace:"nowrap"}}>
          {toast}
        </div>
      )}
    </div>
  )
}
