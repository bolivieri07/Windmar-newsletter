"use client"
import { useEffect, useState } from "react"
import dynamic from "next/dynamic"

const LeadMap = dynamic(() => import("@/components/LeadMap"), { ssr: false, loading: () => <div style={{height:500,display:"flex",alignItems:"center",justifyContent:"center",background:"#1a2f6e",borderRadius:14,color:"rgba(255,255,255,0.5)",fontWeight:600}}>Loading map...</div> })

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

type LeadStatus = { id: number; name: string; abbreviation: string }

const STATUS_COLORS: Record<string, string> = {
  "Callback": "#f89b24", "Go Back": "#f89b24", "Not Home": "#9ca3af",
  "Not Interested": "#dc2626", "Appointment Set": "#16a34a", "Do Not Knock": "#1f2937",
  "Renter": "#7c3aed", "Already Solar": "#0369a1", "Not Qualified": "#b45309",
  "New Mover": "#ec4899", "Sale Made": "#059669", "Proposal Needed": "#6366f1",
  "Redesign Required": "#d97706", "default": "#6b7280",
}

function getStatusColor(status: string): string {
  return STATUS_COLORS[status] || STATUS_COLORS["default"]
}

export default function D2DPage() {
  const [activeTab, setActiveTab] = useState("map")
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
  const [fullscreen, setFullscreen] = useState(false)
  const [userLocation, setUserLocation] = useState<[number, number] | null>(null)
  const [flyTo, setFlyTo] = useState<[number, number] | null>(null)
  const [newPin, setNewPin] = useState<{lat:number,lng:number}|null>(null)
  const [showStatusPicker, setShowStatusPicker] = useState(false)
  const [pendingAddress, setPendingAddress] = useState({ address:"", city:"", state:"", zip:"" })
  const [showCreateForm, setShowCreateForm] = useState(false)
  const [creatingSR, setCreatingSR] = useState(false)
  const [newLeadForm, setNewLeadForm] = useState({
    firstName:"", lastName:"", phone:"", email:"",
    appointmentDate:"", address:"", city:"", state:"", zip:"",
    language:"English", employeeId:"", driver:"", product:"Solar",
    leadSource:"D2D", appointmentNotes:"", assignTo:"",
  })

  function showToast(msg: string) { setToast(msg); setTimeout(() => setToast(""), 3000) }

  async function fetchSR(endpoint: string, params?: Record<string, string>) {
    const query = new URLSearchParams({ endpoint, ...params })
    const res = await fetch("/api/salesrabbit?" + query.toString())
    return res.json()
  }

  useEffect(() => {
    loadData()
    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        (pos) => {
          const loc: [number, number] = [pos.coords.latitude, pos.coords.longitude]
          setUserLocation(loc)
          setFlyTo(loc)
        },
        () => console.log("Location denied"),
        { enableHighAccuracy: true }
      )
    }
  }, [])

  async function loadData() {
    setLoading(true)
    setError("")
    try {
      const [leadsData, usersData, statusData] = await Promise.all([
        fetchSR("/leads"),
        fetchSR("/users"),
        fetchSR("/leadStatuses"),
      ])
      if (leadsData.error) { setError("API Error: " + JSON.stringify(leadsData.error)); setLoading(false); return }

      const mappedLeads: Lead[] = (leadsData.data || []).map((l: any) => ({
        id: l.id?.toString() || "",
        firstName: l.firstName || "",
        lastName: l.lastName || "",
        address: [l.street1, l.street2].filter(Boolean).join(" "),
        city: l.city || "",
        state: l.state || "",
        zip: l.zip || "",
        phone: l.phonePrimary || l.phoneAlternate || "",
        email: l.email || "",
        status: l.status || "Unknown",
        statusColor: getStatusColor(l.status || ""),
        lat: parseFloat(l.latitude || 0),
        lng: parseFloat(l.longitude || 0),
        ownerName: l.userName || "Unassigned",
        createdAt: l.dateCreated || "",
        notes: l.notes || "",
      }))

      const mappedUsers: User[] = (usersData.data || []).map((u: any) => ({
        id: u.id?.toString() || "",
        firstName: u.firstName || "",
        lastName: u.lastName || "",
        email: u.email || "",
        role: u.roleName || u.role || "Rep",
        leadCount: 0,
      }))
      mappedUsers.forEach(u => {
        u.leadCount = mappedLeads.filter(l => l.ownerName.includes(u.firstName) || l.ownerName.includes(u.lastName)).length
      })

      const mappedStatuses: LeadStatus[] = (statusData.data || []).filter((s: any) => s.active).map((s: any) => ({
        id: s.id, name: s.name, abbreviation: s.abbreviation,
      }))

      setLeads(mappedLeads)
      setUsers(mappedUsers.sort((a, b) => b.leadCount - a.leadCount))
      setStatuses(mappedStatuses)
    } catch (err: any) {
      setError("Failed to connect: " + err.message)
    }
    setLoading(false)
  }

  async function handleMapClick(lat: number, lng: number) {
    setNewPin({ lat, lng })
    setShowStatusPicker(true)
    setShowCreateForm(false)
    try {
      const res = await fetch(`https://nominatim.openstreetmap.org/reverse?format=json&lat=${lat}&lon=${lng}&addressdetails=1`, {
        headers: { "User-Agent": "WindmarSolarAcademy/1.0" }
      })
      const data = await res.json()
      if (data?.address) {
        const a = data.address
        const addr = {
          address: [a.house_number, a.road].filter(Boolean).join(" "),
          city: a.city || a.town || a.village || a.hamlet || "",
          state: a.state || "",
          zip: a.postcode || "",
        }
        setPendingAddress(addr)
        setNewLeadForm(prev => ({ ...prev, ...addr }))
      }
    } catch (err) { console.error("Geocode failed:", err) }
  }

  async function quickCreateLead(statusName: string) {
    if (statusName === "Appointment Set") {
      setShowStatusPicker(false)
      setShowCreateForm(true)
      return
    }
    if (!newPin) return
    setCreatingSR(true)
    try {
      const res = await fetch("/api/salesrabbit", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          endpoint: "/leads",
          firstName: "", lastName: "",
          street1: pendingAddress.address, city: pendingAddress.city,
          state: pendingAddress.state, zip: pendingAddress.zip,
          latitude: newPin.lat, longitude: newPin.lng,
          status: statusName,
        }),
      })
      const data = await res.json()
      if (data.error) { showToast("Error: " + JSON.stringify(data.error)) }
      else { showToast("Pin dropped: " + statusName) }
    } catch (err: any) { showToast("Failed: " + err.message) }
    setCreatingSR(false)
    setShowStatusPicker(false)
    setNewPin(null)
    loadData()
  }

  async function handleCreateLead() {
    if (!newPin) { showToast("Drop a pin first"); return }
    setCreatingSR(true)
    try {
      const res = await fetch("/api/salesrabbit", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          endpoint: "/leads",
          firstName: newLeadForm.firstName, lastName: newLeadForm.lastName,
          street1: newLeadForm.address, city: newLeadForm.city,
          state: newLeadForm.state, zip: newLeadForm.zip,
          phonePrimary: newLeadForm.phone, email: newLeadForm.email,
          latitude: newPin.lat, longitude: newPin.lng,
          status: "Appointment Set",
          appointment: newLeadForm.appointmentDate || null,
          notes: [
            newLeadForm.language ? "Language: " + newLeadForm.language : "",
            newLeadForm.employeeId ? "Employee ID: " + newLeadForm.employeeId : "",
            newLeadForm.driver ? "Driver: " + newLeadForm.driver : "",
            newLeadForm.product ? "Product: " + newLeadForm.product : "",
            newLeadForm.leadSource ? "Source: " + newLeadForm.leadSource : "",
            newLeadForm.appointmentNotes || "",
          ].filter(Boolean).join(" | "),
        }),
      })
      const data = await res.json()
      if (data.error) { showToast("Error: " + JSON.stringify(data.error)) }
      else { showToast("Appointment lead created!") }
    } catch (err: any) { showToast("Failed: " + err.message) }
    setCreatingSR(false)
    setShowCreateForm(false)
    setShowStatusPicker(false)
    setNewPin(null)
    setNewLeadForm({ firstName:"",lastName:"",phone:"",email:"",appointmentDate:"",address:"",city:"",state:"",zip:"",language:"English",employeeId:"",driver:"",product:"Solar",leadSource:"D2D",appointmentNotes:"",assignTo:"" })
    loadData()
  }

  function locateMe() {
    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        (pos) => {
          const loc: [number, number] = [pos.coords.latitude, pos.coords.longitude]
          setUserLocation(loc)
          setFlyTo(loc)
          showToast("Found your location!")
        },
        () => showToast("Location access denied"),
        { enableHighAccuracy: true }
      )
    }
  }

  const filteredLeads = leads.filter(l => {
    if (filterStatus !== "all" && l.status !== filterStatus) return false
    if (filterRep !== "all" && !l.ownerName.toLowerCase().includes(filterRep.toLowerCase())) return false
    if (searchQuery) {
      const q = searchQuery.toLowerCase()
      return (l.firstName + " " + l.lastName).toLowerCase().includes(q) ||
        l.address.toLowerCase().includes(q) || l.phone.includes(q) || l.email.toLowerCase().includes(q)
    }
    return true
  })

  const statusCounts = leads.reduce((acc: Record<string, number>, l) => {
    acc[l.status] = (acc[l.status] || 0) + 1; return acc
  }, {})

  const tabs = [
    { id:"map", label:"Map", icon:"M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0zM12 7a3 3 0 1 0 0 6 3 3 0 0 0 0-6z" },
    { id:"leads", label:"Leads", icon:"M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2M9 7a4 4 0 1 0 0-8 4 4 0 0 0 0 8zM23 21v-2a4 4 0 0 0-3-3.87M16 3.13a4 4 0 0 1 0 7.75" },
    { id:"leaderboard", label:"Leaderboard", icon:"M12 20V10M18 20V4M6 20v-4" },
    { id:"territories", label:"Territories", icon:"M1 6v16l7-4 8 4 7-4V2l-7 4-8-4-7 4zM8 2v16M16 6v16" },
  ]

  const inputStyle = {
    padding:"0.6rem 0.75rem",border:"1.5px solid #e5e7eb",borderRadius:8,
    fontSize:"0.85rem",fontFamily:"Barlow,system-ui,sans-serif",outline:"none",
    color:"#1f2937",background:"white",boxSizing:"border-box" as const,
  }
  const lblStyle = { display:"block" as const,color:"#374151",fontSize:"0.7rem",fontWeight:700,marginBottom:"0.25rem",textTransform:"uppercase" as const,letterSpacing:"0.04em" }

  return (
    <div style={{minHeight:"100vh",background:"#f9fafb",fontFamily:"Barlow,system-ui,sans-serif"}}>
      {!fullscreen && (
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
              <button onClick={locateMe} style={{padding:"0.5rem 0.75rem",background:"rgba(59,130,246,0.2)",color:"#93c5fd",border:"none",borderRadius:6,fontSize:"0.78rem",fontWeight:700,cursor:"pointer",fontFamily:"Barlow,system-ui,sans-serif",display:"flex",alignItems:"center",gap:"0.3rem"}}>
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="12" cy="12" r="3"/><path d="M12 2v4M12 18v4M2 12h4M18 12h4"/></svg>
                GPS
              </button>
              <button onClick={loadData} style={{padding:"0.5rem 0.75rem",background:"rgba(255,255,255,0.1)",color:"white",border:"none",borderRadius:6,fontSize:"0.78rem",fontWeight:700,cursor:"pointer",fontFamily:"Barlow,system-ui,sans-serif"}}>
                Refresh
              </button>
            </div>
          </div>
        </header>
      )}

      <div style={{maxWidth:fullscreen?9999:1400,margin:"0 auto",padding:fullscreen?"0":"1.5rem"}}>
        {!fullscreen && (
          <div style={{display:"flex",gap:"0.5rem",marginBottom:"1.25rem",overflowX:"auto",paddingBottom:"0.25rem"}}>
            {tabs.map(tab => (
              <button key={tab.id} onClick={() => setActiveTab(tab.id)}
                style={{display:"flex",alignItems:"center",gap:"0.5rem",padding:"0.6rem 1.25rem",borderRadius:10,
                  fontSize:"0.88rem",fontWeight:700,cursor:"pointer",border:"1.5px solid",whiteSpace:"nowrap",
                  borderColor:activeTab===tab.id?"#f89b24":"#e5e7eb",background:activeTab===tab.id?"#f89b24":"white",
                  color:activeTab===tab.id?"white":"#6b7280",fontFamily:"Barlow,system-ui,sans-serif",transition:"all 0.15s"}}>
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  {tab.icon.split(/(?=M)/).filter(Boolean).map((seg,i) => <path key={i} d={seg.trim()} />)}
                </svg>
                {tab.label}
              </button>
            ))}
          </div>
        )}

        {loading && !fullscreen && (
          <div style={{background:"white",borderRadius:14,padding:"3rem",textAlign:"center",color:"#9ca3af",fontWeight:600,boxShadow:"0 2px 8px rgba(0,0,0,0.06)"}}>
            Connecting to SalesRabbit...
          </div>
        )}

        {error && !loading && !fullscreen && (
          <div style={{background:"#fef2f2",borderRadius:14,padding:"2rem",textAlign:"center",border:"1px solid #fecaca",marginBottom:"1rem"}}>
            <div style={{color:"#dc2626",fontWeight:700,marginBottom:"0.5rem"}}>Connection Error</div>
            <div style={{color:"#6b7280",fontSize:"0.88rem",marginBottom:"1rem"}}>{error}</div>
            <button onClick={loadData} style={{padding:"0.6rem 1.25rem",background:"#dc2626",color:"white",border:"none",borderRadius:8,fontWeight:700,cursor:"pointer",fontFamily:"Barlow,system-ui,sans-serif"}}>Retry</button>
          </div>
        )}

        {(activeTab === "map" || fullscreen) && (
          <div style={{position:fullscreen?"fixed":"relative",inset:fullscreen?0:"auto",zIndex:fullscreen?500:"auto",background:"#0f1d47"}}>
            {!fullscreen && (
              <div style={{display:"flex",gap:"0.5rem",marginBottom:"0.75rem",flexWrap:"wrap",alignItems:"center"}}>
                {Object.entries(statusCounts).slice(0,6).map(([status, count]) => (
                  <button key={status} onClick={() => setFilterStatus(filterStatus === status ? "all" : status)}
                    style={{display:"flex",alignItems:"center",gap:"0.3rem",padding:"0.25rem 0.6rem",borderRadius:20,
                      fontSize:"0.72rem",fontWeight:700,cursor:"pointer",border:"1.5px solid",
                      borderColor:filterStatus===status?getStatusColor(status):"#e5e7eb",
                      background:filterStatus===status?getStatusColor(status):"white",
                      color:filterStatus===status?"white":"#6b7280",fontFamily:"Barlow,system-ui,sans-serif"}}>
                    <span style={{width:6,height:6,borderRadius:"50%",background:filterStatus===status?"white":getStatusColor(status)}} />
                    {status} ({count})
                  </button>
                ))}
              </div>
            )}

            <div style={{position:"relative",height:fullscreen?"100vh":"500px",borderRadius:fullscreen?0:14,overflow:"hidden"}}>
              <LeadMap leads={filteredLeads} onSelectLead={(lead: any) => setSelectedLead(lead)} onMapClick={handleMapClick} newPin={newPin} userLocation={userLocation} flyTo={flyTo} />

              <div style={{position:"absolute",top:12,right:12,zIndex:1000,display:"flex",flexDirection:"column",gap:"0.5rem"}}>
                <button onClick={() => setFullscreen(!fullscreen)}
                  style={{background:"white",border:"none",borderRadius:8,width:40,height:40,display:"flex",alignItems:"center",justifyContent:"center",cursor:"pointer",boxShadow:"0 2px 8px rgba(0,0,0,0.3)"}}>
                  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#1a2f6e" strokeWidth="2">
                    {fullscreen ? <><path d="M8 3v3a2 2 0 0 1-2 2H3M21 8h-3a2 2 0 0 1-2-2V3M3 16h3a2 2 0 0 1 2 2v3M16 21v-3a2 2 0 0 1 2-2h3"/></> : <><path d="M8 3H5a2 2 0 0 0-2 2v3M21 8V5a2 2 0 0 0-2-2h-3M3 16v3a2 2 0 0 0 2 2h3M16 21h3a2 2 0 0 0 2-2v-3"/></>}
                  </svg>
                </button>
                <button onClick={locateMe}
                  style={{background:"white",border:"none",borderRadius:8,width:40,height:40,display:"flex",alignItems:"center",justifyContent:"center",cursor:"pointer",boxShadow:"0 2px 8px rgba(0,0,0,0.3)"}}>
                  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#3b82f6" strokeWidth="2"><circle cx="12" cy="12" r="3"/><path d="M12 2v4M12 18v4M2 12h4M18 12h4"/></svg>
                </button>
              </div>

              {showStatusPicker && newPin && (
                <div style={{position:"absolute",bottom:20,left:"50%",transform:"translateX(-50%)",zIndex:1000,background:"white",borderRadius:14,padding:"1rem",boxShadow:"0 8px 32px rgba(0,0,0,0.3)",maxWidth:360,width:"90%"}}>
                  <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:"0.75rem"}}>
                    <div style={{fontWeight:800,color:"#1a2f6e",fontSize:"0.9rem"}}>Select Status</div>
                    <button onClick={() => { setShowStatusPicker(false); setNewPin(null) }}
                      style={{background:"#f3f4f6",border:"none",borderRadius:6,width:28,height:28,cursor:"pointer",color:"#6b7280",fontWeight:700,display:"flex",alignItems:"center",justifyContent:"center"}}>X</button>
                  </div>
                  {pendingAddress.address && (
                    <div style={{fontSize:"0.78rem",color:"#6b7280",marginBottom:"0.75rem",padding:"0.4rem 0.6rem",background:"#f9fafb",borderRadius:6}}>
                      {pendingAddress.address}, {pendingAddress.city} {pendingAddress.state}
                    </div>
                  )}
                  <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:"0.4rem"}}>
                    {statuses.map(s => (
                      <button key={s.id} onClick={() => quickCreateLead(s.name)} disabled={creatingSR}
                        style={{display:"flex",alignItems:"center",gap:"0.4rem",padding:"0.5rem 0.7rem",borderRadius:8,
                          border:"1.5px solid " + getStatusColor(s.name) + "40",background:"white",cursor:"pointer",
                          fontFamily:"Barlow,system-ui,sans-serif",fontSize:"0.78rem",fontWeight:700,color:"#374151",transition:"all 0.15s"}}
                        onMouseEnter={(e:any) => { e.currentTarget.style.background = getStatusColor(s.name); e.currentTarget.style.color = "white" }}
                        onMouseLeave={(e:any) => { e.currentTarget.style.background = "white"; e.currentTarget.style.color = "#374151" }}>
                        <span style={{width:10,height:10,borderRadius:"50%",background:getStatusColor(s.name),flexShrink:0}} />
                        {s.name}
                      </button>
                    ))}
                  </div>
                  <div style={{marginTop:"0.75rem",textAlign:"center"}}>
                    <button onClick={() => { setShowStatusPicker(false); setShowCreateForm(true) }}
                      style={{fontSize:"0.78rem",color:"#f89b24",fontWeight:700,background:"none",border:"none",cursor:"pointer",fontFamily:"Barlow,system-ui,sans-serif"}}>
                      Open full form instead
                    </button>
                  </div>
                </div>
              )}
            </div>

            {showCreateForm && newPin && (
              <div style={{background:"white",borderRadius:fullscreen?0:14,padding:"1.25rem",marginTop:fullscreen?0:"1rem",boxShadow:"0 2px 8px rgba(0,0,0,0.06)",border:fullscreen?"none":"1px solid #f3f4f6",
                ...(fullscreen?{position:"absolute" as const,bottom:0,left:0,right:0,zIndex:1000,maxHeight:"50vh",overflowY:"auto" as const,borderTop:"3px solid #f89b24"}:{})}}>
                <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:"1rem"}}>
                  <h3 style={{color:"#1a2f6e",fontSize:"1rem",fontWeight:800,margin:0,textTransform:"uppercase",letterSpacing:"0.04em"}}>Appointment Lead</h3>
                  <button onClick={() => { setShowCreateForm(false); setNewPin(null) }}
                    style={{background:"#f3f4f6",border:"none",borderRadius:6,width:28,height:28,cursor:"pointer",color:"#6b7280",fontWeight:700,display:"flex",alignItems:"center",justifyContent:"center"}}>X</button>
                </div>
                <div style={{display:"grid",gridTemplateColumns:"repeat(auto-fit,minmax(200px,1fr))",gap:"0.75rem",marginBottom:"0.75rem"}}>
                  <div><label style={lblStyle}>First Name *</label><input type="text" value={newLeadForm.firstName} onChange={e => setNewLeadForm({...newLeadForm,firstName:e.target.value})} style={{...inputStyle,width:"100%"}} /></div>
                  <div><label style={lblStyle}>Last Name *</label><input type="text" value={newLeadForm.lastName} onChange={e => setNewLeadForm({...newLeadForm,lastName:e.target.value})} style={{...inputStyle,width:"100%"}} /></div>
                  <div><label style={lblStyle}>Phone *</label><input type="tel" value={newLeadForm.phone} onChange={e => setNewLeadForm({...newLeadForm,phone:e.target.value})} style={{...inputStyle,width:"100%"}} /></div>
                  <div><label style={lblStyle}>Email</label><input type="email" value={newLeadForm.email} onChange={e => setNewLeadForm({...newLeadForm,email:e.target.value})} style={{...inputStyle,width:"100%"}} /></div>
                </div>
                <div style={{marginBottom:"0.75rem"}}><label style={lblStyle}>Appointment Date/Time</label><input type="datetime-local" value={newLeadForm.appointmentDate} onChange={e => setNewLeadForm({...newLeadForm,appointmentDate:e.target.value})} style={{...inputStyle,width:"100%"}} /></div>
                <div style={{display:"grid",gridTemplateColumns:"2fr 1fr 1fr 1fr",gap:"0.75rem",marginBottom:"0.75rem"}}>
                  <div><label style={lblStyle}>Street Address</label><input type="text" value={newLeadForm.address} onChange={e => setNewLeadForm({...newLeadForm,address:e.target.value})} style={{...inputStyle,width:"100%"}} /></div>
                  <div><label style={lblStyle}>City</label><input type="text" value={newLeadForm.city} onChange={e => setNewLeadForm({...newLeadForm,city:e.target.value})} style={{...inputStyle,width:"100%"}} /></div>
                  <div><label style={lblStyle}>State</label><input type="text" value={newLeadForm.state} onChange={e => setNewLeadForm({...newLeadForm,state:e.target.value})} style={{...inputStyle,width:"100%"}} /></div>
                  <div><label style={lblStyle}>ZIP</label><input type="text" value={newLeadForm.zip} onChange={e => setNewLeadForm({...newLeadForm,zip:e.target.value})} style={{...inputStyle,width:"100%"}} /></div>
                </div>
                <div style={{display:"grid",gridTemplateColumns:"repeat(auto-fit,minmax(150px,1fr))",gap:"0.75rem",marginBottom:"0.75rem"}}>
                  <div><label style={lblStyle}>Language</label><select value={newLeadForm.language} onChange={e => setNewLeadForm({...newLeadForm,language:e.target.value})} style={{...inputStyle,width:"100%",cursor:"pointer"}}><option value="English">English</option><option value="Spanish">Spanish</option></select></div>
                  <div><label style={lblStyle}>Employee ID</label><input type="text" value={newLeadForm.employeeId} onChange={e => setNewLeadForm({...newLeadForm,employeeId:e.target.value})} style={{...inputStyle,width:"100%"}} /></div>
                  <div><label style={lblStyle}>Driver</label><input type="text" value={newLeadForm.driver} onChange={e => setNewLeadForm({...newLeadForm,driver:e.target.value})} style={{...inputStyle,width:"100%"}} /></div>
                  <div><label style={lblStyle}>Product</label><select value={newLeadForm.product} onChange={e => setNewLeadForm({...newLeadForm,product:e.target.value})} style={{...inputStyle,width:"100%",cursor:"pointer"}}><option value="Solar">Solar</option><option value="Battery">Battery</option><option value="Solar + Battery">Solar + Battery</option><option value="Roofing">Roofing</option><option value="Other">Other</option></select></div>
                  <div><label style={lblStyle}>Lead Source</label><select value={newLeadForm.leadSource} onChange={e => setNewLeadForm({...newLeadForm,leadSource:e.target.value})} style={{...inputStyle,width:"100%",cursor:"pointer"}}><option value="D2D">D2D</option><option value="Referral">Referral</option><option value="Self-Gen">Self-Gen</option><option value="Marketing">Marketing</option><option value="Event">Event</option><option value="Other">Other</option></select></div>
                  <div><label style={lblStyle}>Assign Rep</label><select value={newLeadForm.assignTo} onChange={e => setNewLeadForm({...newLeadForm,assignTo:e.target.value})} style={{...inputStyle,width:"100%",cursor:"pointer"}}><option value="">Unassigned</option>{users.map(u => <option key={u.id} value={u.id}>{u.firstName} {u.lastName}</option>)}</select></div>
                </div>
                <div style={{marginBottom:"0.75rem"}}><label style={lblStyle}>Appointment Notes</label><textarea value={newLeadForm.appointmentNotes} onChange={e => setNewLeadForm({...newLeadForm,appointmentNotes:e.target.value})} placeholder="Notes..." style={{...inputStyle,width:"100%",minHeight:60,resize:"vertical"}} /></div>
                <div style={{display:"flex",gap:"0.5rem"}}>
                  <button onClick={handleCreateLead} disabled={creatingSR}
                    style={{flex:1,padding:"0.7rem",background:"#16a34a",color:"white",border:"none",borderRadius:8,fontWeight:700,fontSize:"0.9rem",cursor:creatingSR?"not-allowed":"pointer",opacity:creatingSR?0.7:1,fontFamily:"Barlow,system-ui,sans-serif"}}>
                    {creatingSR ? "Creating..." : "Create Appointment Lead"}
                  </button>
                  <button onClick={() => { setShowCreateForm(false); setNewPin(null) }}
                    style={{padding:"0.7rem 1rem",background:"white",color:"#6b7280",border:"1.5px solid #e5e7eb",borderRadius:8,fontWeight:700,cursor:"pointer",fontFamily:"Barlow,system-ui,sans-serif"}}>Cancel</button>
                </div>
              </div>
            )}
          </div>
        )}

        {!loading && !error && !fullscreen && activeTab === "leads" && (
          <div>
            <div style={{display:"flex",gap:"0.75rem",marginBottom:"1rem",flexWrap:"wrap",alignItems:"center"}}>
              <input type="text" placeholder="Search leads..." value={searchQuery} onChange={e => setSearchQuery(e.target.value)}
                style={{...inputStyle,flex:"1 1 200px",minWidth:200}} />
              <select value={filterStatus} onChange={e => setFilterStatus(e.target.value)} style={{...inputStyle,cursor:"pointer",minWidth:150}}>
                <option value="all">All Statuses</option>
                {Object.keys(statusCounts).sort().map(s => <option key={s} value={s}>{s} ({statusCounts[s]})</option>)}
              </select>
              <select value={filterRep} onChange={e => setFilterRep(e.target.value)} style={{...inputStyle,cursor:"pointer",minWidth:150}}>
                <option value="all">All Reps</option>
                {users.map(u => <option key={u.id} value={u.firstName + " " + u.lastName}>{u.firstName} {u.lastName}</option>)}
              </select>
              <div style={{color:"#6b7280",fontSize:"0.85rem",fontWeight:600}}>{filteredLeads.length} leads</div>
            </div>
            <div style={{display:"flex",gap:"0.5rem",marginBottom:"1rem",flexWrap:"wrap"}}>
              {Object.entries(statusCounts).sort((a,b) => b[1] - a[1]).map(([status, count]) => (
                <button key={status} onClick={() => setFilterStatus(filterStatus === status ? "all" : status)}
                  style={{display:"flex",alignItems:"center",gap:"0.3rem",padding:"0.3rem 0.65rem",borderRadius:20,fontSize:"0.75rem",fontWeight:700,cursor:"pointer",border:"1.5px solid",
                    borderColor:filterStatus===status?getStatusColor(status):"#e5e7eb",background:filterStatus===status?getStatusColor(status):"white",
                    color:filterStatus===status?"white":"#6b7280",fontFamily:"Barlow,system-ui,sans-serif"}}>
                  <span style={{width:7,height:7,borderRadius:"50%",background:filterStatus===status?"white":getStatusColor(status)}} /> {status} ({count})
                </button>
              ))}
            </div>
            <div style={{background:"white",borderRadius:14,boxShadow:"0 2px 8px rgba(0,0,0,0.06)",border:"1px solid #f3f4f6",overflow:"hidden"}}>
              {filteredLeads.length === 0 ? (
                <div style={{padding:"3rem",textAlign:"center",color:"#9ca3af",fontWeight:600}}>No leads found</div>
              ) : (
                <div style={{overflowX:"auto"}}>
                  <table style={{width:"100%",borderCollapse:"collapse",fontSize:"0.85rem",minWidth:700}}>
                    <thead><tr style={{background:"#f9fafb"}}>
                      <th style={{textAlign:"left",padding:"0.6rem 1rem",fontSize:"0.72rem",fontWeight:700,color:"#9ca3af",textTransform:"uppercase",letterSpacing:"0.06em"}}>Name</th>
                      <th style={{textAlign:"left",padding:"0.6rem 1rem",fontSize:"0.72rem",fontWeight:700,color:"#9ca3af",textTransform:"uppercase",letterSpacing:"0.06em"}}>Address</th>
                      <th style={{textAlign:"left",padding:"0.6rem 1rem",fontSize:"0.72rem",fontWeight:700,color:"#9ca3af",textTransform:"uppercase",letterSpacing:"0.06em"}}>Status</th>
                      <th style={{textAlign:"left",padding:"0.6rem 1rem",fontSize:"0.72rem",fontWeight:700,color:"#9ca3af",textTransform:"uppercase",letterSpacing:"0.06em"}}>Rep</th>
                      <th style={{textAlign:"left",padding:"0.6rem 1rem",fontSize:"0.72rem",fontWeight:700,color:"#9ca3af",textTransform:"uppercase",letterSpacing:"0.06em"}}>Contact</th>
                    </tr></thead>
                    <tbody>
                      {filteredLeads.slice(0,100).map(lead => (
                        <tr key={lead.id} style={{borderTop:"1px solid #f3f4f6",cursor:"pointer"}} onClick={() => setSelectedLead(lead)}>
                          <td style={{padding:"0.75rem 1rem"}}><div style={{fontWeight:700,color:"#1f2937"}}>{lead.firstName} {lead.lastName}</div></td>
                          <td style={{padding:"0.75rem 1rem",color:"#6b7280",maxWidth:200,overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap"}}>{lead.address}{lead.city?", "+lead.city:""}</td>
                          <td style={{padding:"0.75rem 1rem"}}><span style={{display:"inline-flex",alignItems:"center",gap:"0.3rem",padding:"0.2rem 0.6rem",borderRadius:20,fontSize:"0.75rem",fontWeight:700,background:lead.statusColor+"20",color:lead.statusColor}}><span style={{width:7,height:7,borderRadius:"50%",background:lead.statusColor}} />{lead.status}</span></td>
                          <td style={{padding:"0.75rem 1rem",color:"#6b7280",fontSize:"0.82rem"}}>{lead.ownerName}</td>
                          <td style={{padding:"0.75rem 1rem"}}>{lead.phone && <div style={{color:"#6b7280",fontSize:"0.82rem"}}>{lead.phone}</div>}{lead.email && <div style={{color:"#9ca3af",fontSize:"0.75rem"}}>{lead.email}</div>}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          </div>
        )}

        {!loading && !error && !fullscreen && activeTab === "leaderboard" && (
          <div>
            <div style={{background:"linear-gradient(135deg,#0f1d47 0%,#1a2f6e 60%,#2a4a9e 100%)",borderRadius:16,padding:"2rem",marginBottom:"1.5rem",color:"white",position:"relative",overflow:"hidden"}}>
              <div style={{position:"absolute",right:-20,top:-20,width:200,height:200,borderRadius:"50%",background:"rgba(248,155,36,0.08)"}} />
              <h2 style={{fontSize:"1.75rem",fontWeight:800,margin:"0 0 0.5rem 0"}}>Team Leaderboard</h2>
              <p style={{opacity:0.8,margin:0,fontSize:"0.95rem"}}>{users.length} reps - {leads.length} total leads</p>
            </div>
            <div style={{display:"grid",gap:"0.75rem"}}>
              {users.map((user, i) => {
                const soldCount = leads.filter(l => l.ownerName.includes(user.firstName) && l.status === "Appointment Set").length
                const totalByUser = user.leadCount
                const convRate = totalByUser > 0 ? Math.round((soldCount / totalByUser) * 100) : 0
                return (
                  <div key={user.id} style={{background:"white",borderRadius:14,boxShadow:"0 2px 8px rgba(0,0,0,0.06)",border:"1px solid #f3f4f6",padding:"1.25rem",display:"flex",alignItems:"center",gap:"1rem",flexWrap:"wrap"}}>
                    <div style={{width:44,height:44,borderRadius:"50%",display:"flex",alignItems:"center",justifyContent:"center",fontWeight:800,fontSize:"1.1rem",flexShrink:0,
                      background:i===0?"linear-gradient(135deg,#f89b24,#d4811a)":i===1?"linear-gradient(135deg,#9ca3af,#6b7280)":i===2?"linear-gradient(135deg,#b45309,#92400e)":"#e8edf8",
                      color:i<3?"white":"#1a2f6e"}}>{i+1}</div>
                    <div style={{flex:1,minWidth:150}}>
                      <div style={{fontWeight:800,color:"#1f2937",fontSize:"1rem"}}>{user.firstName} {user.lastName}</div>
                      <div style={{color:"#9ca3af",fontSize:"0.78rem",fontWeight:600}}>{user.role}</div>
                    </div>
                    <div style={{display:"flex",gap:"1.5rem",flexWrap:"wrap",alignItems:"center"}}>
                      <div style={{textAlign:"center"}}><div style={{fontSize:"1.5rem",fontWeight:800,color:"#1a2f6e"}}>{totalByUser}</div><div style={{fontSize:"0.7rem",color:"#9ca3af",fontWeight:600,textTransform:"uppercase"}}>Leads</div></div>
                      <div style={{textAlign:"center"}}><div style={{fontSize:"1.5rem",fontWeight:800,color:"#16a34a"}}>{soldCount}</div><div style={{fontSize:"0.7rem",color:"#9ca3af",fontWeight:600,textTransform:"uppercase"}}>Appts</div></div>
                      <div style={{textAlign:"center"}}><div style={{fontSize:"1.5rem",fontWeight:800,color:"#f89b24"}}>{convRate}%</div><div style={{fontSize:"0.7rem",color:"#9ca3af",fontWeight:600,textTransform:"uppercase"}}>Conv.</div></div>
                    </div>
                  </div>
                )
              })}
              {users.length === 0 && <div style={{background:"white",borderRadius:14,padding:"3rem",textAlign:"center",color:"#9ca3af",fontWeight:600}}>No users found</div>}
            </div>
          </div>
        )}

        {!loading && !error && !fullscreen && activeTab === "territories" && (
          <div>
            <div style={{background:"linear-gradient(135deg,#7c3aed 0%,#5b21b6 100%)",borderRadius:16,padding:"2rem",marginBottom:"1.5rem",color:"white"}}>
              <h2 style={{fontSize:"1.75rem",fontWeight:800,margin:"0 0 0.5rem 0"}}>Territory Overview</h2>
              <p style={{opacity:0.85,margin:0,fontSize:"0.95rem"}}>Lead distribution by rep and area</p>
            </div>
            <div style={{display:"grid",gridTemplateColumns:"repeat(auto-fit,minmax(300px,1fr))",gap:"1rem"}}>
              {users.filter(u => u.leadCount > 0).map(user => {
                const userLeads = leads.filter(l => l.ownerName.includes(user.firstName) || l.ownerName.includes(user.lastName))
                const userStatuses = userLeads.reduce((acc: Record<string,number>, l) => { acc[l.status] = (acc[l.status]||0)+1; return acc }, {})
                const cities = userLeads.reduce((acc: Record<string,number>, l) => { if(l.city) acc[l.city]=(acc[l.city]||0)+1; return acc }, {})
                const topCities = Object.entries(cities).sort((a,b) => b[1]-a[1]).slice(0,3)
                return (
                  <div key={user.id} style={{background:"white",borderRadius:14,boxShadow:"0 2px 8px rgba(0,0,0,0.06)",border:"1px solid #f3f4f6",overflow:"hidden"}}>
                    <div style={{background:"linear-gradient(135deg,#1a2f6e 0%,#2a4a9e 100%)",padding:"1rem 1.25rem",display:"flex",alignItems:"center",justifyContent:"space-between"}}>
                      <div style={{color:"white",fontWeight:800,fontSize:"1rem"}}>{user.firstName} {user.lastName}</div>
                      <div style={{color:"#f89b24",fontWeight:800,fontSize:"1.25rem"}}>{user.leadCount}</div>
                    </div>
                    <div style={{padding:"1rem 1.25rem"}}>
                      <div style={{display:"flex",gap:"0.4rem",flexWrap:"wrap",marginBottom:"0.75rem"}}>
                        {Object.entries(userStatuses).sort((a,b) => b[1]-a[1]).map(([status,count]) => (
                          <span key={status} style={{display:"inline-flex",alignItems:"center",gap:"0.2rem",padding:"0.15rem 0.45rem",borderRadius:12,fontSize:"0.7rem",fontWeight:700,background:getStatusColor(status)+"18",color:getStatusColor(status)}}>
                            <span style={{width:5,height:5,borderRadius:"50%",background:getStatusColor(status)}} />{status}: {count}
                          </span>
                        ))}
                      </div>
                      {topCities.length > 0 && <div style={{fontSize:"0.82rem",color:"#6b7280"}}><span style={{fontWeight:700}}>Areas: </span>{topCities.map(([c,n]) => c+" ("+n+")").join(", ")}</div>}
                    </div>
                  </div>
                )
              })}
              {users.filter(u => u.leadCount > 0).length === 0 && <div style={{background:"white",borderRadius:14,padding:"3rem",textAlign:"center",color:"#9ca3af",fontWeight:600}}>No territory data</div>}
            </div>
          </div>
        )}
      </div>

      {selectedLead && (
        <div style={{position:"fixed",inset:0,background:"rgba(0,0,0,0.5)",zIndex:600,display:"flex",alignItems:"center",justifyContent:"center",padding:"1rem"}} onClick={() => setSelectedLead(null)}>
          <div onClick={e => e.stopPropagation()} style={{background:"white",borderRadius:16,maxWidth:480,width:"100%",boxShadow:"0 16px 64px rgba(0,0,0,0.2)",overflow:"hidden",maxHeight:"90vh",overflowY:"auto"}}>
            <div style={{background:"linear-gradient(135deg,#0f1d47 0%,#1a2f6e 100%)",padding:"1.5rem",display:"flex",justifyContent:"space-between",alignItems:"flex-start"}}>
              <div>
                <div style={{color:"white",fontWeight:800,fontSize:"1.25rem"}}>{selectedLead.firstName} {selectedLead.lastName}</div>
                <div style={{display:"inline-flex",alignItems:"center",gap:"0.3rem",padding:"0.2rem 0.6rem",borderRadius:20,fontSize:"0.78rem",fontWeight:700,background:selectedLead.statusColor,color:"white",marginTop:"0.5rem"}}>{selectedLead.status}</div>
              </div>
              <button onClick={() => setSelectedLead(null)} style={{background:"rgba(255,255,255,0.15)",border:"none",borderRadius:8,width:32,height:32,cursor:"pointer",color:"white",fontWeight:700,display:"flex",alignItems:"center",justifyContent:"center"}}>X</button>
            </div>
            <div style={{padding:"1.5rem",display:"grid",gap:"1rem"}}>
              {selectedLead.address && (
                <div>
                  <div style={{fontSize:"0.72rem",fontWeight:700,color:"#9ca3af",textTransform:"uppercase",letterSpacing:"0.06em",marginBottom:"0.25rem"}}>Address</div>
                  <div style={{color:"#1f2937",fontWeight:600}}>{selectedLead.address}</div>
                  <div style={{color:"#6b7280",fontSize:"0.88rem"}}>{selectedLead.city}{selectedLead.state?", "+selectedLead.state:""} {selectedLead.zip}</div>
                </div>
              )}
              <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:"1rem"}}>
                {selectedLead.phone && <div><div style={{fontSize:"0.72rem",fontWeight:700,color:"#9ca3af",textTransform:"uppercase",letterSpacing:"0.06em",marginBottom:"0.25rem"}}>Phone</div><a href={"tel:"+selectedLead.phone} style={{color:"#1a2f6e",fontWeight:600,textDecoration:"none"}}>{selectedLead.phone}</a></div>}
                {selectedLead.email && <div><div style={{fontSize:"0.72rem",fontWeight:700,color:"#9ca3af",textTransform:"uppercase",letterSpacing:"0.06em",marginBottom:"0.25rem"}}>Email</div><a href={"mailto:"+selectedLead.email} style={{color:"#1a2f6e",fontWeight:600,textDecoration:"none",fontSize:"0.88rem"}}>{selectedLead.email}</a></div>}
              </div>
              <div><div style={{fontSize:"0.72rem",fontWeight:700,color:"#9ca3af",textTransform:"uppercase",letterSpacing:"0.06em",marginBottom:"0.25rem"}}>Rep</div><div style={{color:"#1f2937",fontWeight:600}}>{selectedLead.ownerName}</div></div>
              {selectedLead.notes && <div><div style={{fontSize:"0.72rem",fontWeight:700,color:"#9ca3af",textTransform:"uppercase",letterSpacing:"0.06em",marginBottom:"0.25rem"}}>Notes</div><div style={{color:"#6b7280",fontSize:"0.88rem",lineHeight:1.5,whiteSpace:"pre-wrap"}}>{selectedLead.notes}</div></div>}
              {selectedLead.createdAt && <div style={{fontSize:"0.82rem",color:"#9ca3af",fontWeight:600}}>Created: {new Date(selectedLead.createdAt).toLocaleDateString("en-US",{month:"long",day:"numeric",year:"numeric"})}</div>}
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
