"use client"
import { useEffect, useState } from "react"
import dynamic from "next/dynamic"

const LeadMap = dynamic(() => import("@/components/LeadMap"), { ssr: false, loading: () => <div style={{height:500,display:"flex",alignItems:"center",justifyContent:"center",background:"#e8edf8",borderRadius:14,color:"#9ca3af",fontWeight:600}}>Loading map...</div> })

type Lead = {
  id: string
  firstName: string
  lastName: string
  address: string
  city: string
  state: string
  zip: string
  phone: string
  email: string
  status: string
  statusColor: string
  lat: number
  lng: number
  ownerName: string
  createdAt: string
  notes: string
}

type User = {
  id: string
  firstName: string
  lastName: string
  email: string
  role: string
  leadCount: number
}

type LeadStatus = {
  id: string
  name: string
  color: string
}

const STATUS_COLORS: Record<string, string> = {
  "Not Home": "#9ca3af",
  "Interested": "#f89b24",
  "Not Interested": "#dc2626",
  "Sold": "#16a34a",
  "Follow Up": "#7c3aed",
  "Appointment Set": "#0369a1",
  "default": "#6b7280",
}

function getStatusColor(status: string): string {
  return STATUS_COLORS[status] || STATUS_COLORS["default"]
}

export default function D2DPage() {
  const [activeTab, setActiveTab] = useState("leads")
  const [leads, setLeads] = useState<Lead[]>([])
  const [users, setUsers] = useState<User[]>([])
  const [statuses, setStatuses] = useState<LeadStatus[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState("")
  const [filterStatus, setFilterStatus] = useState("all")
  const [filterRep, setFilterRep] = useState("all")
  const [searchQuery, setSearchQuery] = useState("")
  const [selectedLead, setSelectedLead] = useState<Lead | null>(null)
  const [toast, setToast] = useState("")
  const [newPin, setNewPin] = useState<{lat:number,lng:number}|null>(null)
  const [showCreateLead, setShowCreateLead] = useState(false)
  const [creatingSR, setCreatingSR] = useState(false)
  const [newLeadForm, setNewLeadForm] = useState({
    firstName:"", lastName:"", address:"", city:"", state:"", zip:"",
    phone:"", email:"", notes:"", status:"Not Home", assignTo:"",
  })

  async function handleCreateLead() {
    if (!newLeadForm.firstName.trim() && !newLeadForm.address.trim()) { showToast("Name or address required"); return }
    if (!newPin) { showToast("Drop a pin on the map first"); return }
    setCreatingSR(true)
    try {
      const res = await fetch("/api/salesrabbit", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          endpoint: "/leads",
          first_name: newLeadForm.firstName,
          last_name: newLeadForm.lastName,
          address_1: newLeadForm.address,
          city: newLeadForm.city,
          state: newLeadForm.state,
          zip: newLeadForm.zip,
          mobile_phone: newLeadForm.phone,
          email: newLeadForm.email,
          description: newLeadForm.notes,
          addressLatitude: newPin.lat.toString(),
          addressLongitude: newPin.lng.toString(),
        }),
      })
      const data = await res.json()
      if (data.error) { showToast("Error: " + data.error); setCreatingSR(false); return }
      showToast("Lead created in SalesRabbit!")
      setShowCreateLead(false)
      setNewPin(null)
      setNewLeadForm({ firstName:"",lastName:"",address:"",city:"",state:"",zip:"",phone:"",email:"",notes:"",status:"Not Home",assignTo:"" })
      loadData()
    } catch (err: any) {
      showToast("Failed: " + err.message)
    }
    setCreatingSR(false)
  }

  function handleMapClick(lat: number, lng: number) {
    setNewPin({ lat, lng })
    setShowCreateLead(true)
  }

  function showToast(msg: string) { setToast(msg); setTimeout(() => setToast(""), 3000) }

  async function fetchSR(endpoint: string, params?: Record<string, string>) {
    const query = new URLSearchParams({ endpoint, ...params })
    const res = await fetch("/api/salesrabbit?" + query.toString())
    return res.json()
  }

  useEffect(() => { loadData() }, [])

  async function loadData() {
    setLoading(true)
    setError("")
    try {
      const [leadsData, usersData, statusData] = await Promise.all([
        fetchSR("/leads"),
        fetchSR("/users"),
        fetchSR("/leadStatuses"),
      ])

      if (leadsData.error) { setError("API Error: " + leadsData.error); setLoading(false); return }

      const mappedLeads: Lead[] = (leadsData.data || leadsData || []).map((l: any) => ({
        id: l.id || l.leadId || "",
        firstName: l.first_name || l.firstName || "",
        lastName: l.last_name || l.lastName || "",
        address: [l.address_1 || l.address, l.address_2].filter(Boolean).join(" "),
        city: l.city || "",
        state: l.state || "",
        zip: l.zip || "",
        phone: l.mobile_phone || l.phone || l.home_phone || "",
        email: l.email || "",
        status: l.leadStatusName || l.status || "Unknown",
        statusColor: getStatusColor(l.leadStatusName || l.status || ""),
        lat: parseFloat(l.addressLatitude || l.latitude || l.lat || 0),
        lng: parseFloat(l.addressLongitude || l.longitude || l.lng || 0),
        ownerName: l.ownerName || [l.ownerFirstName, l.ownerLastName].filter(Boolean).join(" ") || "Unassigned",
        createdAt: l.created_at || l.createdAt || l.dateCreated || "",
        notes: l.description || l.notes || "",
      }))

      const mappedUsers: User[] = (usersData.data || usersData || []).map((u: any) => ({
        id: u.id || u.userId || "",
        firstName: u.firstName || u.first_name || "",
        lastName: u.lastName || u.last_name || "",
        email: u.email || "",
        role: u.role || u.roleName || "Rep",
        leadCount: 0,
      }))

      mappedUsers.forEach(u => {
        u.leadCount = mappedLeads.filter(l => l.ownerName.includes(u.firstName) || l.ownerName.includes(u.lastName)).length
      })

      const mappedStatuses: LeadStatus[] = (statusData.data || statusData || []).map((s: any) => ({
        id: s.id || s.statusId || "",
        name: s.name || s.statusName || "",
        color: s.color || getStatusColor(s.name || ""),
      }))

      setLeads(mappedLeads)
      setUsers(mappedUsers.sort((a, b) => b.leadCount - a.leadCount))
      setStatuses(mappedStatuses)
    } catch (err: any) {
      setError("Failed to connect to SalesRabbit: " + err.message)
    }
    setLoading(false)
  }

  const filteredLeads = leads.filter(l => {
    if (filterStatus !== "all" && l.status !== filterStatus) return false
    if (filterRep !== "all" && !l.ownerName.toLowerCase().includes(filterRep.toLowerCase())) return false
    if (searchQuery) {
      const q = searchQuery.toLowerCase()
      return (l.firstName + " " + l.lastName).toLowerCase().includes(q) ||
        l.address.toLowerCase().includes(q) ||
        l.phone.includes(q) ||
        l.email.toLowerCase().includes(q)
    }
    return true
  })

  const statusCounts = leads.reduce((acc: Record<string, number>, l) => {
    acc[l.status] = (acc[l.status] || 0) + 1
    return acc
  }, {})

  const tabs = [
    { id: "leads", label: "Leads", icon: "M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2M9 7a4 4 0 1 0 0-8 4 4 0 0 0 0 8zM23 21v-2a4 4 0 0 0-3-3.87M16 3.13a4 4 0 0 1 0 7.75" },
    { id: "map", label: "Map", icon: "M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0zM12 7a3 3 0 1 0 0 6 3 3 0 0 0 0-6z" },
    { id: "leaderboard", label: "Leaderboard", icon: "M12 20V10M18 20V4M6 20v-4" },
    { id: "territories", label: "Territories", icon: "M1 6v16l7-4 8 4 7-4V2l-7 4-8-4-7 4zM8 2v16M16 6v16" },
  ]

  const inputStyle = {
    padding:"0.7rem 1rem",border:"1.5px solid #e5e7eb",borderRadius:8,
    fontSize:"0.9rem",fontFamily:"Barlow,system-ui,sans-serif",outline:"none",
    color:"#1f2937",background:"white",boxSizing:"border-box" as const,
  }

  return (
    <div style={{minHeight:"100vh",background:"#f9fafb",fontFamily:"Barlow,system-ui,sans-serif"}}>
      <header style={{background:"linear-gradient(135deg,#0f1d47 0%,#1a2f6e 100%)",position:"sticky",top:0,zIndex:100,boxShadow:"0 2px 16px rgba(0,0,0,0.25)"}}>
        <div style={{maxWidth:1400,margin:"0 auto",padding:"0 1.5rem",display:"flex",alignItems:"center",justifyContent:"space-between",height:64}}>
          <div style={{display:"flex",alignItems:"center",gap:"1rem"}}>
            <a href="/" style={{color:"rgba(255,255,255,0.6)",textDecoration:"none",fontSize:"0.85rem",fontWeight:700,display:"flex",alignItems:"center",gap:"0.4rem"}}>
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M19 12H5M12 19l-7-7 7-7"/></svg>
              Back
            </a>
            <div>
              <span style={{color:"#f89b24",fontWeight:800,fontSize:"1.1rem"}}>D2D</span>
              <span style={{color:"white",fontWeight:800,fontSize:"1.1rem"}}> Canvassing</span>
            </div>
          </div>
          <div style={{display:"flex",alignItems:"center",gap:"0.5rem"}}>
            <button onClick={loadData} style={{padding:"0.5rem 1rem",background:"rgba(255,255,255,0.1)",color:"white",border:"none",borderRadius:6,fontSize:"0.82rem",fontWeight:700,cursor:"pointer",fontFamily:"Barlow,system-ui,sans-serif"}}>
              Refresh
            </button>
          </div>
        </div>
      </header>

      <div style={{maxWidth:1400,margin:"0 auto",padding:"1.5rem"}}>
        <div style={{display:"flex",gap:"0.5rem",marginBottom:"1.25rem",overflowX:"auto",paddingBottom:"0.25rem"}}>
          {tabs.map(tab => (
            <button key={tab.id} onClick={() => setActiveTab(tab.id)}
              style={{display:"flex",alignItems:"center",gap:"0.5rem",padding:"0.6rem 1.25rem",borderRadius:10,
                fontSize:"0.88rem",fontWeight:700,cursor:"pointer",border:"1.5px solid",whiteSpace:"nowrap",
                borderColor:activeTab===tab.id?"#f89b24":"#e5e7eb",
                background:activeTab===tab.id?"#f89b24":"white",
                color:activeTab===tab.id?"white":"#6b7280",
                fontFamily:"Barlow,system-ui,sans-serif",transition:"all 0.15s"}}>
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                {tab.icon.split(/(?=M)/).filter(Boolean).map((seg,i) => <path key={i} d={seg.trim()} />)}
              </svg>
              {tab.label}
            </button>
          ))}
        </div>

        {loading && (
          <div style={{background:"white",borderRadius:14,padding:"3rem",textAlign:"center",color:"#9ca3af",fontWeight:600,boxShadow:"0 2px 8px rgba(0,0,0,0.06)"}}>
            <div style={{fontSize:"1.1rem",marginBottom:"0.5rem"}}>Connecting to SalesRabbit...</div>
            <div style={{fontSize:"0.85rem"}}>Loading leads, users, and territories</div>
          </div>
        )}

        {error && !loading && (
          <div style={{background:"#fef2f2",borderRadius:14,padding:"2rem",textAlign:"center",border:"1px solid #fecaca",marginBottom:"1rem"}}>
            <div style={{color:"#dc2626",fontWeight:700,fontSize:"1rem",marginBottom:"0.5rem"}}>Connection Error</div>
            <div style={{color:"#6b7280",fontSize:"0.88rem",marginBottom:"1rem"}}>{error}</div>
            <button onClick={loadData} style={{padding:"0.6rem 1.25rem",background:"#dc2626",color:"white",border:"none",borderRadius:8,fontWeight:700,fontSize:"0.88rem",cursor:"pointer",fontFamily:"Barlow,system-ui,sans-serif"}}>
              Retry
            </button>
          </div>
        )}

        {!loading && !error && activeTab === "leads" && (
          <div>
            <div style={{display:"flex",gap:"0.75rem",marginBottom:"1rem",flexWrap:"wrap",alignItems:"center"}}>
              <input type="text" placeholder="Search leads..." value={searchQuery}
                onChange={e => setSearchQuery(e.target.value)}
                style={{...inputStyle,flex:"1 1 200px",minWidth:200}} />
              <select value={filterStatus} onChange={e => setFilterStatus(e.target.value)}
                style={{...inputStyle,cursor:"pointer",minWidth:150}}>
                <option value="all">All Statuses</option>
                {Object.keys(statusCounts).sort().map(s => (
                  <option key={s} value={s}>{s} ({statusCounts[s]})</option>
                ))}
              </select>
              <select value={filterRep} onChange={e => setFilterRep(e.target.value)}
                style={{...inputStyle,cursor:"pointer",minWidth:150}}>
                <option value="all">All Reps</option>
                {users.map(u => (
                  <option key={u.id} value={u.firstName + " " + u.lastName}>{u.firstName} {u.lastName}</option>
                ))}
              </select>
              <div style={{color:"#6b7280",fontSize:"0.85rem",fontWeight:600}}>{filteredLeads.length} leads</div>
            </div>

            <div style={{display:"flex",gap:"0.5rem",marginBottom:"1rem",flexWrap:"wrap"}}>
              {Object.entries(statusCounts).sort((a,b) => b[1] - a[1]).map(([status, count]) => (
                <button key={status} onClick={() => setFilterStatus(filterStatus === status ? "all" : status)}
                  style={{display:"flex",alignItems:"center",gap:"0.4rem",padding:"0.35rem 0.75rem",borderRadius:20,
                    fontSize:"0.78rem",fontWeight:700,cursor:"pointer",border:"1.5px solid",
                    borderColor:filterStatus===status?getStatusColor(status):"#e5e7eb",
                    background:filterStatus===status?getStatusColor(status):"white",
                    color:filterStatus===status?"white":"#6b7280",fontFamily:"Barlow,system-ui,sans-serif"}}>
                  <span style={{width:8,height:8,borderRadius:"50%",background:filterStatus===status?"white":getStatusColor(status),display:"inline-block"}} />
                  {status} ({count})
                </button>
              ))}
            </div>

            <div style={{background:"white",borderRadius:14,boxShadow:"0 2px 8px rgba(0,0,0,0.06)",border:"1px solid #f3f4f6",overflow:"hidden"}}>
              {filteredLeads.length === 0 ? (
                <div style={{padding:"3rem",textAlign:"center",color:"#9ca3af",fontWeight:600}}>No leads found</div>
              ) : (
                <div style={{overflowX:"auto"}}>
                  <table style={{width:"100%",borderCollapse:"collapse",fontSize:"0.85rem",minWidth:700}}>
                    <thead>
                      <tr style={{background:"#f9fafb"}}>
                        <th style={{textAlign:"left",padding:"0.6rem 1rem",fontSize:"0.72rem",fontWeight:700,color:"#9ca3af",textTransform:"uppercase",letterSpacing:"0.06em"}}>Name</th>
                        <th style={{textAlign:"left",padding:"0.6rem 1rem",fontSize:"0.72rem",fontWeight:700,color:"#9ca3af",textTransform:"uppercase",letterSpacing:"0.06em"}}>Address</th>
                        <th style={{textAlign:"left",padding:"0.6rem 1rem",fontSize:"0.72rem",fontWeight:700,color:"#9ca3af",textTransform:"uppercase",letterSpacing:"0.06em"}}>Status</th>
                        <th style={{textAlign:"left",padding:"0.6rem 1rem",fontSize:"0.72rem",fontWeight:700,color:"#9ca3af",textTransform:"uppercase",letterSpacing:"0.06em"}}>Rep</th>
                        <th style={{textAlign:"left",padding:"0.6rem 1rem",fontSize:"0.72rem",fontWeight:700,color:"#9ca3af",textTransform:"uppercase",letterSpacing:"0.06em"}}>Contact</th>
                      </tr>
                    </thead>
                    <tbody>
                      {filteredLeads.slice(0, 100).map(lead => (
                        <tr key={lead.id} style={{borderTop:"1px solid #f3f4f6",cursor:"pointer"}}
                          onClick={() => setSelectedLead(lead)}>
                          <td style={{padding:"0.75rem 1rem"}}>
                            <div style={{fontWeight:700,color:"#1f2937"}}>{lead.firstName} {lead.lastName}</div>
                          </td>
                          <td style={{padding:"0.75rem 1rem",color:"#6b7280",maxWidth:200,overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap"}}>
                            {lead.address}{lead.city ? ", " + lead.city : ""}{lead.state ? " " + lead.state : ""}
                          </td>
                          <td style={{padding:"0.75rem 1rem"}}>
                            <span style={{display:"inline-flex",alignItems:"center",gap:"0.3rem",padding:"0.2rem 0.6rem",borderRadius:20,fontSize:"0.75rem",fontWeight:700,background:lead.statusColor + "20",color:lead.statusColor}}>
                              <span style={{width:7,height:7,borderRadius:"50%",background:lead.statusColor}} />
                              {lead.status}
                            </span>
                          </td>
                          <td style={{padding:"0.75rem 1rem",color:"#6b7280",fontSize:"0.82rem"}}>{lead.ownerName}</td>
                          <td style={{padding:"0.75rem 1rem"}}>
                            {lead.phone && <div style={{color:"#6b7280",fontSize:"0.82rem"}}>{lead.phone}</div>}
                            {lead.email && <div style={{color:"#9ca3af",fontSize:"0.75rem"}}>{lead.email}</div>}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          </div>
        )}

        {!loading && !error && activeTab === "map" && (
          <div>
            <div style={{display:"flex",gap:"0.5rem",marginBottom:"1rem",flexWrap:"wrap",alignItems:"center"}}>
              {Object.entries(statusCounts).map(([status, count]) => (
                <button key={status} onClick={() => setFilterStatus(filterStatus === status ? "all" : status)}
                  style={{display:"flex",alignItems:"center",gap:"0.3rem",padding:"0.3rem 0.7rem",borderRadius:20,
                    fontSize:"0.75rem",fontWeight:700,cursor:"pointer",border:"1.5px solid",
                    borderColor:filterStatus===status?getStatusColor(status):"#e5e7eb",
                    background:filterStatus===status?getStatusColor(status):"white",
                    color:filterStatus===status?"white":"#6b7280",fontFamily:"Barlow,system-ui,sans-serif"}}>
                  <span style={{width:7,height:7,borderRadius:"50%",background:filterStatus===status?"white":getStatusColor(status)}} />
                  {status} ({count})
                </button>
              ))}
              <div style={{marginLeft:"auto",background:"#fef3e2",padding:"0.3rem 0.75rem",borderRadius:20,fontSize:"0.75rem",fontWeight:700,color:"#b45309"}}>
                Tap map to drop pin
              </div>
            </div>
            <div style={{display:"grid",gridTemplateColumns:showCreateLead?"1fr 360px":"1fr",gap:"1rem",alignItems:"start"}}>
              <div style={{background:"white",borderRadius:14,boxShadow:"0 2px 8px rgba(0,0,0,0.06)",border:"1px solid #f3f4f6",overflow:"hidden"}}>
                <LeadMap leads={filteredLeads} onSelectLead={(lead: any) => setSelectedLead(lead)} onMapClick={handleMapClick} newPin={newPin} />
              </div>
              {showCreateLead && newPin && (
                <div style={{background:"white",borderRadius:14,boxShadow:"0 2px 8px rgba(0,0,0,0.06)",border:"1px solid #f3f4f6",padding:"1.25rem",position:"sticky",top:80}}>
                  <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:"1rem"}}>
                    <h3 style={{color:"#1a2f6e",fontSize:"1rem",fontWeight:800,margin:0,textTransform:"uppercase",letterSpacing:"0.04em"}}>New Lead</h3>
                    <button onClick={() => { setShowCreateLead(false); setNewPin(null) }}
                      style={{background:"#f3f4f6",border:"none",borderRadius:6,width:28,height:28,display:"flex",alignItems:"center",justifyContent:"center",cursor:"pointer",color:"#6b7280",fontWeight:700}}>X</button>
                  </div>
                  <div style={{fontSize:"0.75rem",color:"#9ca3af",marginBottom:"1rem",fontWeight:600}}>
                    Pin: {newPin.lat.toFixed(5)}, {newPin.lng.toFixed(5)}
                  </div>
                  <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:"0.75rem",marginBottom:"0.75rem"}}>
                    <div>
                      <label style={{display:"block",color:"#374151",fontSize:"0.72rem",fontWeight:700,marginBottom:"0.3rem",textTransform:"uppercase",letterSpacing:"0.04em"}}>First Name</label>
                      <input type="text" value={newLeadForm.firstName} onChange={e => setNewLeadForm({...newLeadForm,firstName:e.target.value})}
                        style={{...inputStyle,width:"100%",padding:"0.6rem 0.75rem",fontSize:"0.85rem"}} />
                    </div>
                    <div>
                      <label style={{display:"block",color:"#374151",fontSize:"0.72rem",fontWeight:700,marginBottom:"0.3rem",textTransform:"uppercase",letterSpacing:"0.04em"}}>Last Name</label>
                      <input type="text" value={newLeadForm.lastName} onChange={e => setNewLeadForm({...newLeadForm,lastName:e.target.value})}
                        style={{...inputStyle,width:"100%",padding:"0.6rem 0.75rem",fontSize:"0.85rem"}} />
                    </div>
                  </div>
                  <div style={{marginBottom:"0.75rem"}}>
                    <label style={{display:"block",color:"#374151",fontSize:"0.72rem",fontWeight:700,marginBottom:"0.3rem",textTransform:"uppercase",letterSpacing:"0.04em"}}>Address</label>
                    <input type="text" value={newLeadForm.address} onChange={e => setNewLeadForm({...newLeadForm,address:e.target.value})}
                      placeholder="Street address" style={{...inputStyle,width:"100%",padding:"0.6rem 0.75rem",fontSize:"0.85rem"}} />
                  </div>
                  <div style={{display:"grid",gridTemplateColumns:"1fr 1fr 1fr",gap:"0.75rem",marginBottom:"0.75rem"}}>
                    <div>
                      <label style={{display:"block",color:"#374151",fontSize:"0.72rem",fontWeight:700,marginBottom:"0.3rem",textTransform:"uppercase",letterSpacing:"0.04em"}}>City</label>
                      <input type="text" value={newLeadForm.city} onChange={e => setNewLeadForm({...newLeadForm,city:e.target.value})}
                        style={{...inputStyle,width:"100%",padding:"0.6rem 0.75rem",fontSize:"0.85rem"}} />
                    </div>
                    <div>
                      <label style={{display:"block",color:"#374151",fontSize:"0.72rem",fontWeight:700,marginBottom:"0.3rem",textTransform:"uppercase",letterSpacing:"0.04em"}}>State</label>
                      <input type="text" value={newLeadForm.state} onChange={e => setNewLeadForm({...newLeadForm,state:e.target.value})}
                        style={{...inputStyle,width:"100%",padding:"0.6rem 0.75rem",fontSize:"0.85rem"}} />
                    </div>
                    <div>
                      <label style={{display:"block",color:"#374151",fontSize:"0.72rem",fontWeight:700,marginBottom:"0.3rem",textTransform:"uppercase",letterSpacing:"0.04em"}}>ZIP</label>
                      <input type="text" value={newLeadForm.zip} onChange={e => setNewLeadForm({...newLeadForm,zip:e.target.value})}
                        style={{...inputStyle,width:"100%",padding:"0.6rem 0.75rem",fontSize:"0.85rem"}} />
                    </div>
                  </div>
                  <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:"0.75rem",marginBottom:"0.75rem"}}>
                    <div>
                      <label style={{display:"block",color:"#374151",fontSize:"0.72rem",fontWeight:700,marginBottom:"0.3rem",textTransform:"uppercase",letterSpacing:"0.04em"}}>Phone</label>
                      <input type="tel" value={newLeadForm.phone} onChange={e => setNewLeadForm({...newLeadForm,phone:e.target.value})}
                        style={{...inputStyle,width:"100%",padding:"0.6rem 0.75rem",fontSize:"0.85rem"}} />
                    </div>
                    <div>
                      <label style={{display:"block",color:"#374151",fontSize:"0.72rem",fontWeight:700,marginBottom:"0.3rem",textTransform:"uppercase",letterSpacing:"0.04em"}}>Email</label>
                      <input type="email" value={newLeadForm.email} onChange={e => setNewLeadForm({...newLeadForm,email:e.target.value})}
                        style={{...inputStyle,width:"100%",padding:"0.6rem 0.75rem",fontSize:"0.85rem"}} />
                    </div>
                  </div>
                  <div style={{marginBottom:"0.75rem"}}>
                    <label style={{display:"block",color:"#374151",fontSize:"0.72rem",fontWeight:700,marginBottom:"0.3rem",textTransform:"uppercase",letterSpacing:"0.04em"}}>Assign to Rep</label>
                    <select value={newLeadForm.assignTo} onChange={e => setNewLeadForm({...newLeadForm,assignTo:e.target.value})}
                      style={{...inputStyle,width:"100%",padding:"0.6rem 0.75rem",fontSize:"0.85rem",cursor:"pointer"}}>
                      <option value="">Unassigned</option>
                      {users.map(u => (
                        <option key={u.id} value={u.id}>{u.firstName} {u.lastName}</option>
                      ))}
                    </select>
                  </div>
                  <div style={{marginBottom:"0.75rem"}}>
                    <label style={{display:"block",color:"#374151",fontSize:"0.72rem",fontWeight:700,marginBottom:"0.3rem",textTransform:"uppercase",letterSpacing:"0.04em"}}>Notes</label>
                    <textarea value={newLeadForm.notes} onChange={e => setNewLeadForm({...newLeadForm,notes:e.target.value})}
                      placeholder="Door knock notes..."
                      style={{...inputStyle,width:"100%",padding:"0.6rem 0.75rem",fontSize:"0.85rem",minHeight:70,resize:"vertical"}} />
                  </div>
                  <div style={{display:"flex",gap:"0.5rem"}}>
                    <button onClick={handleCreateLead} disabled={creatingSR}
                      style={{flex:1,padding:"0.7rem",background:"#f89b24",color:"white",border:"none",borderRadius:8,fontWeight:700,fontSize:"0.9rem",cursor:creatingSR?"not-allowed":"pointer",opacity:creatingSR?0.7:1,fontFamily:"Barlow,system-ui,sans-serif"}}>
                      {creatingSR ? "Creating..." : "Create Lead"}
                    </button>
                    <button onClick={() => { setShowCreateLead(false); setNewPin(null) }}
                      style={{padding:"0.7rem 1rem",background:"white",color:"#6b7280",border:"1.5px solid #e5e7eb",borderRadius:8,fontWeight:700,fontSize:"0.9rem",cursor:"pointer",fontFamily:"Barlow,system-ui,sans-serif"}}>
                      Cancel
                    </button>
                  </div>
                </div>
              )}
            </div>
            <div style={{marginTop:"0.75rem",display:"flex",gap:"0.75rem",flexWrap:"wrap",fontSize:"0.78rem",color:"#9ca3af",fontWeight:600}}>
              <span>{filteredLeads.filter(l => l.lat && l.lng && l.lat !== 0 && l.lng !== 0).length} pins on map</span>
              <span>Click a pin for details</span>
              <span>Tap map to create new lead</span>
            </div>
          </div>
        )}

        {!loading && !error && activeTab === "leaderboard" && (
          <div>
            <div style={{background:"linear-gradient(135deg,#0f1d47 0%,#1a2f6e 60%,#2a4a9e 100%)",borderRadius:16,padding:"2rem",marginBottom:"1.5rem",color:"white",position:"relative",overflow:"hidden"}}>
              <div style={{position:"absolute",right:-20,top:-20,width:200,height:200,borderRadius:"50%",background:"rgba(248,155,36,0.08)"}} />
              <h2 style={{fontSize:"1.75rem",fontWeight:800,margin:"0 0 0.5rem 0"}}>Team Leaderboard</h2>
              <p style={{opacity:0.8,margin:0,fontSize:"0.95rem"}}>{users.length} reps - {leads.length} total leads</p>
            </div>
            <div style={{display:"grid",gap:"0.75rem"}}>
              {users.map((user, i) => {
                const soldCount = leads.filter(l => (l.ownerName.includes(user.firstName) || l.ownerName.includes(user.lastName)) && l.status === "Sold").length
                const totalByUser = user.leadCount
                const convRate = totalByUser > 0 ? Math.round((soldCount / totalByUser) * 100) : 0
                return (
                  <div key={user.id} style={{background:"white",borderRadius:14,boxShadow:"0 2px 8px rgba(0,0,0,0.06)",border:"1px solid #f3f4f6",padding:"1.25rem",display:"flex",alignItems:"center",gap:"1rem",flexWrap:"wrap"}}>
                    <div style={{width:44,height:44,borderRadius:"50%",display:"flex",alignItems:"center",justifyContent:"center",fontWeight:800,fontSize:"1.1rem",flexShrink:0,
                      background:i===0?"linear-gradient(135deg,#f89b24,#d4811a)":i===1?"linear-gradient(135deg,#9ca3af,#6b7280)":i===2?"linear-gradient(135deg,#b45309,#92400e)":"#e8edf8",
                      color:i<3?"white":"#1a2f6e"}}>
                      {i < 3 ? i + 1 : i + 1}
                    </div>
                    <div style={{flex:1,minWidth:150}}>
                      <div style={{fontWeight:800,color:"#1f2937",fontSize:"1rem"}}>{user.firstName} {user.lastName}</div>
                      <div style={{color:"#9ca3af",fontSize:"0.78rem",fontWeight:600}}>{user.role}</div>
                    </div>
                    <div style={{display:"flex",gap:"1.5rem",flexWrap:"wrap",alignItems:"center"}}>
                      <div style={{textAlign:"center"}}>
                        <div style={{fontSize:"1.5rem",fontWeight:800,color:"#1a2f6e"}}>{totalByUser}</div>
                        <div style={{fontSize:"0.7rem",color:"#9ca3af",fontWeight:600,textTransform:"uppercase"}}>Leads</div>
                      </div>
                      <div style={{textAlign:"center"}}>
                        <div style={{fontSize:"1.5rem",fontWeight:800,color:"#16a34a"}}>{soldCount}</div>
                        <div style={{fontSize:"0.7rem",color:"#9ca3af",fontWeight:600,textTransform:"uppercase"}}>Sold</div>
                      </div>
                      <div style={{textAlign:"center"}}>
                        <div style={{fontSize:"1.5rem",fontWeight:800,color:"#f89b24"}}>{convRate}%</div>
                        <div style={{fontSize:"0.7rem",color:"#9ca3af",fontWeight:600,textTransform:"uppercase"}}>Conv.</div>
                      </div>
                    </div>
                  </div>
                )
              })}
              {users.length === 0 && (
                <div style={{background:"white",borderRadius:14,padding:"3rem",textAlign:"center",color:"#9ca3af",fontWeight:600}}>No users found in SalesRabbit</div>
              )}
            </div>
          </div>
        )}

        {!loading && !error && activeTab === "territories" && (
          <div>
            <div style={{background:"linear-gradient(135deg,#7c3aed 0%,#5b21b6 100%)",borderRadius:16,padding:"2rem",marginBottom:"1.5rem",color:"white"}}>
              <h2 style={{fontSize:"1.75rem",fontWeight:800,margin:"0 0 0.5rem 0"}}>Territory Overview</h2>
              <p style={{opacity:0.85,margin:0,fontSize:"0.95rem"}}>Lead distribution by area and rep</p>
            </div>
            <div style={{display:"grid",gridTemplateColumns:"repeat(auto-fit,minmax(300px,1fr))",gap:"1rem",marginBottom:"1.5rem"}}>
              {users.filter(u => u.leadCount > 0).map(user => {
                const userLeads = leads.filter(l => l.ownerName.includes(user.firstName) || l.ownerName.includes(user.lastName))
                const userStatuses = userLeads.reduce((acc: Record<string, number>, l) => {
                  acc[l.status] = (acc[l.status] || 0) + 1
                  return acc
                }, {})
                const cities = userLeads.reduce((acc: Record<string, number>, l) => {
                  if (l.city) acc[l.city] = (acc[l.city] || 0) + 1
                  return acc
                }, {})
                const topCities = Object.entries(cities).sort((a, b) => b[1] - a[1]).slice(0, 3)
                return (
                  <div key={user.id} style={{background:"white",borderRadius:14,boxShadow:"0 2px 8px rgba(0,0,0,0.06)",border:"1px solid #f3f4f6",overflow:"hidden"}}>
                    <div style={{background:"linear-gradient(135deg,#1a2f6e 0%,#2a4a9e 100%)",padding:"1rem 1.25rem",display:"flex",alignItems:"center",justifyContent:"space-between"}}>
                      <div style={{color:"white",fontWeight:800,fontSize:"1rem"}}>{user.firstName} {user.lastName}</div>
                      <div style={{color:"#f89b24",fontWeight:800,fontSize:"1.25rem"}}>{user.leadCount}</div>
                    </div>
                    <div style={{padding:"1rem 1.25rem"}}>
                      <div style={{display:"flex",gap:"0.5rem",flexWrap:"wrap",marginBottom:"0.75rem"}}>
                        {Object.entries(userStatuses).sort((a,b) => b[1] - a[1]).map(([status, count]) => (
                          <span key={status} style={{display:"inline-flex",alignItems:"center",gap:"0.25rem",padding:"0.2rem 0.5rem",borderRadius:12,fontSize:"0.72rem",fontWeight:700,background:getStatusColor(status) + "18",color:getStatusColor(status)}}>
                            <span style={{width:6,height:6,borderRadius:"50%",background:getStatusColor(status)}} />
                            {status}: {count}
                          </span>
                        ))}
                      </div>
                      {topCities.length > 0 && (
                        <div style={{fontSize:"0.82rem",color:"#6b7280"}}>
                          <span style={{fontWeight:700}}>Top areas: </span>
                          {topCities.map(([city, count]) => city + " (" + count + ")").join(", ")}
                        </div>
                      )}
                    </div>
                  </div>
                )
              })}
            </div>
            {users.filter(u => u.leadCount > 0).length === 0 && (
              <div style={{background:"white",borderRadius:14,padding:"3rem",textAlign:"center",color:"#9ca3af",fontWeight:600}}>No territory data available</div>
            )}
          </div>
        )}
      </div>

      {selectedLead && (
        <div style={{position:"fixed",inset:0,background:"rgba(0,0,0,0.5)",zIndex:400,display:"flex",alignItems:"center",justifyContent:"center",padding:"1rem"}}
          onClick={() => setSelectedLead(null)}>
          <div onClick={e => e.stopPropagation()}
            style={{background:"white",borderRadius:16,padding:"0",maxWidth:480,width:"100%",boxShadow:"0 16px 64px rgba(0,0,0,0.2)",overflow:"hidden",maxHeight:"90vh",overflowY:"auto"}}>
            <div style={{background:"linear-gradient(135deg,#0f1d47 0%,#1a2f6e 100%)",padding:"1.5rem",display:"flex",justifyContent:"space-between",alignItems:"flex-start"}}>
              <div>
                <div style={{color:"white",fontWeight:800,fontSize:"1.25rem"}}>{selectedLead.firstName} {selectedLead.lastName}</div>
                <div style={{display:"inline-flex",alignItems:"center",gap:"0.3rem",padding:"0.2rem 0.6rem",borderRadius:20,fontSize:"0.78rem",fontWeight:700,background:selectedLead.statusColor,color:"white",marginTop:"0.5rem"}}>
                  {selectedLead.status}
                </div>
              </div>
              <button onClick={() => setSelectedLead(null)}
                style={{background:"rgba(255,255,255,0.15)",border:"none",borderRadius:8,width:32,height:32,display:"flex",alignItems:"center",justifyContent:"center",cursor:"pointer",color:"white",fontSize:"1.1rem",fontWeight:700}}>
                X
              </button>
            </div>
            <div style={{padding:"1.5rem",display:"grid",gap:"1rem"}}>
              {selectedLead.address && (
                <div>
                  <div style={{fontSize:"0.72rem",fontWeight:700,color:"#9ca3af",textTransform:"uppercase",letterSpacing:"0.06em",marginBottom:"0.25rem"}}>Address</div>
                  <div style={{color:"#1f2937",fontWeight:600}}>{selectedLead.address}</div>
                  <div style={{color:"#6b7280",fontSize:"0.88rem"}}>{selectedLead.city}{selectedLead.state ? ", " + selectedLead.state : ""} {selectedLead.zip}</div>
                </div>
              )}
              <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:"1rem"}}>
                {selectedLead.phone && (
                  <div>
                    <div style={{fontSize:"0.72rem",fontWeight:700,color:"#9ca3af",textTransform:"uppercase",letterSpacing:"0.06em",marginBottom:"0.25rem"}}>Phone</div>
                    <a href={"tel:" + selectedLead.phone} style={{color:"#1a2f6e",fontWeight:600,textDecoration:"none"}}>{selectedLead.phone}</a>
                  </div>
                )}
                {selectedLead.email && (
                  <div>
                    <div style={{fontSize:"0.72rem",fontWeight:700,color:"#9ca3af",textTransform:"uppercase",letterSpacing:"0.06em",marginBottom:"0.25rem"}}>Email</div>
                    <a href={"mailto:" + selectedLead.email} style={{color:"#1a2f6e",fontWeight:600,textDecoration:"none",fontSize:"0.88rem"}}>{selectedLead.email}</a>
                  </div>
                )}
              </div>
              <div>
                <div style={{fontSize:"0.72rem",fontWeight:700,color:"#9ca3af",textTransform:"uppercase",letterSpacing:"0.06em",marginBottom:"0.25rem"}}>Assigned Rep</div>
                <div style={{color:"#1f2937",fontWeight:600}}>{selectedLead.ownerName}</div>
              </div>
              {selectedLead.notes && (
                <div>
                  <div style={{fontSize:"0.72rem",fontWeight:700,color:"#9ca3af",textTransform:"uppercase",letterSpacing:"0.06em",marginBottom:"0.25rem"}}>Notes</div>
                  <div style={{color:"#6b7280",fontSize:"0.88rem",lineHeight:1.5,whiteSpace:"pre-wrap"}}>{selectedLead.notes}</div>
                </div>
              )}
              {selectedLead.createdAt && (
                <div style={{fontSize:"0.82rem",color:"#9ca3af",fontWeight:600}}>
                  Created: {new Date(selectedLead.createdAt).toLocaleDateString("en-US",{month:"long",day:"numeric",year:"numeric"})}
                </div>
              )}
            </div>
          </div>
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



