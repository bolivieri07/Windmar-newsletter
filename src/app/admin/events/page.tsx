'use client'
import { useEffect, useState } from "react"
import { createClient } from "@/lib/supabase/client"

export default function EventsPage() {
  const [events, setEvents] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [uploading, setUploading] = useState(false)
  const [toast, setToast] = useState("")
  const [showForm, setShowForm] = useState(false)
  const [form, setForm] = useState({
    post_title: "",
    post_excerpt: "",
    cover_image_url: "",
    event_date: "",
    event_end_date: "",
    location: "",
    address: "",
    is_virtual: false,
    virtual_link: "",
    max_attendees: "",
    is_rsvp_open: true,
  })
  const supabase = createClient()

  useEffect(() => { fetchEvents() }, [])

  async function fetchEvents() {
    setLoading(true)
    const { data } = await supabase
      .from("events")
      .select("*, posts(title,excerpt,status,cover_image_url)")
      .order("event_date", { ascending: true })
    setEvents(data || [])
    setLoading(false)
  }

  function showToast(msg: string) {
    setToast(msg)
    setTimeout(() => setToast(""), 3000)
  }

  async function uploadImage(file: File) {
    setUploading(true)
    const ext = file.name.split(".").pop()
    const fileName = "event-" + Date.now() + "." + ext
    const { error } = await supabase.storage
      .from("post-image")
      .upload(fileName, file, { cacheControl: "3600", upsert: false })
    if (error) {
      showToast("Upload failed: " + error.message)
      setUploading(false)
      return
    }
    const { data: urlData } = supabase.storage.from("post-image").getPublicUrl(fileName)
    setForm(prev => ({...prev, cover_image_url: urlData.publicUrl}))
    setUploading(false)
    showToast("Image uploaded!")
  }

  async function handleCreate() {
    if (!form.post_title.trim()) { showToast("Event title is required"); return }
    if (!form.event_date) { showToast("Event date is required"); return }
    setSaving(true)
    const { data: post, error: postError } = await supabase
      .from("posts")
      .insert({
        title: form.post_title,
        slug: form.post_title.toLowerCase().replace(/[^a-z0-9]+/g,"-") + "-" + Date.now(),
        excerpt: form.post_excerpt,
        cover_image_url: form.cover_image_url || null,
        post_type: "event",
        status: "published",
        published_at: new Date().toISOString(),
      })
      .select()
      .single()
    if (postError) { showToast("Error: " + postError.message); setSaving(false); return }
    const { error: eventError } = await supabase
      .from("events")
      .insert({
        post_id: post.id,
        event_date: form.event_date,
        event_end_date: form.event_end_date || null,
        location: form.location || null,
        address: form.address || null,
        is_virtual: form.is_virtual,
        virtual_link: form.virtual_link || null,
        max_attendees: form.max_attendees ? parseInt(form.max_attendees) : null,
        is_rsvp_open: form.is_rsvp_open,
        cover_image_url: form.cover_image_url || null,
      })
    if (eventError) { showToast("Error: " + eventError.message); setSaving(false); return }
    showToast("Event created and published!")
    setShowForm(false)
    setForm({ post_title:"",post_excerpt:"",cover_image_url:"",event_date:"",event_end_date:"",location:"",address:"",is_virtual:false,virtual_link:"",max_attendees:"",is_rsvp_open:true })
    fetchEvents()
    setSaving(false)
  }

  async function toggleRSVP(id: string, current: boolean) {
    await supabase.from("events").update({ is_rsvp_open: !current }).eq("id", id)
    setEvents(prev => prev.map(e => e.id === id ? { ...e, is_rsvp_open: !current } : e))
    showToast("RSVP status updated!")
  }

  async function deleteEvent(id: string, postId: string) {
    if (!confirm("Delete this event? This cannot be undone.")) return
    await supabase.from("events").delete().eq("id", id)
    await supabase.from("posts").delete().eq("id", postId)
    setEvents(prev => prev.filter(e => e.id !== id))
    showToast("Event deleted")
  }

  const isUpcoming = (date: string) => new Date(date) > new Date()

  const inputStyle = {
    width:"100%",padding:"0.8rem 1rem",border:"1.5px solid #e5e7eb",
    borderRadius:8,fontSize:"0.95rem",fontFamily:"Barlow,system-ui,sans-serif",
    outline:"none",color:"#1f2937",boxSizing:"border-box" as const,background:"white"
  }

  const labelStyle = {
    display:"block" as const,color:"#374151",fontSize:"0.78rem",
    fontWeight:700,marginBottom:"0.4rem",textTransform:"uppercase" as const,
    letterSpacing:"0.04em"
  }

  return (
    <div style={{maxWidth:1000,margin:"0 auto"}}>
      <div style={{display:"flex",alignItems:"center",justifyContent:"space-between",marginBottom:"1.5rem",flexWrap:"wrap",gap:"1rem"}}>
        <div>
          <h1 style={{color:"#1a2f6e",fontSize:"1.75rem",fontWeight:800,margin:"0 0 0.25rem 0"}}>Events Manager</h1>
          <p style={{color:"#6b7280",fontSize:"0.9rem",margin:0}}>{events.length} events total</p>
        </div>
        <button onClick={() => setShowForm(!showForm)}
          style={{padding:"0.75rem 1.25rem",background:"#f89b24",color:"white",border:"none",borderRadius:8,fontSize:"0.9rem",fontWeight:700,cursor:"pointer",fontFamily:"Barlow,system-ui,sans-serif"}}>
          {showForm ? "Cancel" : "+ New Event"}
        </button>
      </div>

      {showForm && (
        <div style={{background:"white",borderRadius:14,padding:"1.5rem",boxShadow:"0 2px 8px rgba(0,0,0,0.06)",border:"1px solid #f3f4f6",marginBottom:"1.5rem"}}>
          <h2 style={{color:"#1a2f6e",fontSize:"1rem",fontWeight:800,textTransform:"uppercase",letterSpacing:"0.04em",margin:"0 0 1.25rem 0"}}>Create New Event</h2>

          <div style={{display:"grid",gridTemplateColumns:"repeat(auto-fit,minmax(250px,1fr))",gap:"1rem",marginBottom:"1rem"}}>
            <div>
              <label style={labelStyle}>Event Title *</label>
              <input type="text" value={form.post_title} onChange={e => setForm({...form,post_title:e.target.value})}
                placeholder="e.g. Monthly Town Hall" style={inputStyle} />
            </div>
            <div>
              <label style={labelStyle}>Short Description</label>
              <input type="text" value={form.post_excerpt} onChange={e => setForm({...form,post_excerpt:e.target.value})}
                placeholder="Brief event summary..." style={inputStyle} />
            </div>
          </div>

          <div style={{marginBottom:"1rem"}}>
            <label style={labelStyle}>Cover Image</label>
            <div style={{border:"2px dashed #e5e7eb",borderRadius:8,padding:"1.25rem",textAlign:"center",cursor:"pointer",background:"#f9fafb"}}
              onClick={() => document.getElementById("event-cover-upload")?.click()}
              onDragOver={(e) => { e.preventDefault(); (e.currentTarget as HTMLElement).style.borderColor="#f89b24" }}
              onDragLeave={(e) => { (e.currentTarget as HTMLElement).style.borderColor="#e5e7eb" }}
              onDrop={async (e) => { e.preventDefault(); const file = e.dataTransfer.files[0]; if(file) await uploadImage(file); }}>
              <input id="event-cover-upload" type="file" accept="image/*" style={{display:"none"}}
                onChange={async (e) => { const file = e.target.files?.[0]; if(file) await uploadImage(file); }} />
              {form.cover_image_url ? (
                <div style={{position:"relative"}}>
                  <img src={form.cover_image_url} alt="preview" style={{width:"100%",height:160,objectFit:"cover",borderRadius:8}} />
                  <button onClick={(e) => { e.stopPropagation(); setForm({...form,cover_image_url:""}) }}
                    style={{position:"absolute",top:8,right:8,background:"rgba(0,0,0,0.6)",color:"white",border:"none",borderRadius:"50%",width:28,height:28,cursor:"pointer",fontSize:"1rem"}}>
                    x
                  </button>
                </div>
              ) : uploading ? (
                <div style={{color:"#f89b24",fontWeight:700}}>Uploading...</div>
              ) : (
                <div>
                  <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="#9ca3af" strokeWidth="1.5" style={{margin:"0 auto 0.4rem",display:"block"}}>
                    <rect x="3" y="3" width="18" height="18" rx="2"/><circle cx="8.5" cy="8.5" r="1.5"/>
                    <polyline points="21 15 16 10 5 21"/>
                  </svg>
                  <div style={{color:"#6b7280",fontWeight:600,fontSize:"0.88rem"}}>Click or drag to upload cover image</div>
                  <div style={{color:"#9ca3af",fontSize:"0.75rem",marginTop:"0.2rem"}}>This image will show in the feed</div>
                </div>
              )}
            </div>
          </div>

          <div style={{display:"grid",gridTemplateColumns:"repeat(auto-fit,minmax(200px,1fr))",gap:"1rem",marginBottom:"1rem"}}>
            <div>
              <label style={labelStyle}>Start Date & Time *</label>
              <input type="datetime-local" value={form.event_date} onChange={e => setForm({...form,event_date:e.target.value})} style={inputStyle} />
            </div>
            <div>
              <label style={labelStyle}>End Date & Time</label>
              <input type="datetime-local" value={form.event_end_date} onChange={e => setForm({...form,event_end_date:e.target.value})} style={inputStyle} />
            </div>
          </div>

          <div style={{marginBottom:"1rem"}}>
            <label style={{display:"flex",alignItems:"center",gap:"0.5rem",cursor:"pointer",fontWeight:600,color:"#374151",fontSize:"0.88rem",marginBottom:"0.75rem"}}>
              <input type="checkbox" checked={form.is_virtual} onChange={e => setForm({...form,is_virtual:e.target.checked})}
                style={{width:16,height:16,accentColor:"#f89b24"}} />
              This is a virtual event
            </label>
            {form.is_virtual ? (
              <div>
                <label style={labelStyle}>Virtual Link</label>
                <input type="url" value={form.virtual_link} onChange={e => setForm({...form,virtual_link:e.target.value})}
                  placeholder="https://zoom.us/j/..." style={inputStyle} />
              </div>
            ) : (
              <div style={{display:"grid",gridTemplateColumns:"repeat(auto-fit,minmax(200px,1fr))",gap:"1rem"}}>
                <div>
                  <label style={labelStyle}>Location Name</label>
                  <input type="text" value={form.location} onChange={e => setForm({...form,location:e.target.value})}
                    placeholder="e.g. Windmar HQ" style={inputStyle} />
                </div>
                <div>
                  <label style={labelStyle}>Address</label>
                  <input type="text" value={form.address} onChange={e => setForm({...form,address:e.target.value})}
                    placeholder="Full address..." style={inputStyle} />
                </div>
              </div>
            )}
          </div>

          <div style={{display:"grid",gridTemplateColumns:"repeat(auto-fit,minmax(200px,1fr))",gap:"1rem",marginBottom:"1.25rem"}}>
            <div>
              <label style={labelStyle}>Max Attendees (optional)</label>
              <input type="number" value={form.max_attendees} onChange={e => setForm({...form,max_attendees:e.target.value})}
                placeholder="Leave blank for unlimited" style={inputStyle} />
            </div>
            <div style={{display:"flex",alignItems:"flex-end",paddingBottom:"0.1rem"}}>
              <label style={{display:"flex",alignItems:"center",gap:"0.5rem",cursor:"pointer",fontWeight:600,color:"#374151",fontSize:"0.88rem"}}>
                <input type="checkbox" checked={form.is_rsvp_open} onChange={e => setForm({...form,is_rsvp_open:e.target.checked})}
                  style={{width:16,height:16,accentColor:"#f89b24"}} />
                Accept RSVPs
              </label>
            </div>
          </div>

          <div style={{display:"flex",gap:"0.75rem"}}>
            <button onClick={handleCreate} disabled={saving}
              style={{padding:"0.8rem 1.5rem",background:"#f89b24",color:"white",border:"none",borderRadius:8,fontSize:"0.9rem",fontWeight:700,cursor:saving?"not-allowed":"pointer",opacity:saving?0.7:1,fontFamily:"Barlow,system-ui,sans-serif"}}>
              {saving ? "Creating..." : "Create Event"}
            </button>
            <button onClick={() => setShowForm(false)}
              style={{padding:"0.8rem 1.5rem",background:"white",color:"#6b7280",border:"1.5px solid #e5e7eb",borderRadius:8,fontSize:"0.9rem",fontWeight:700,cursor:"pointer",fontFamily:"Barlow,system-ui,sans-serif"}}>
              Cancel
            </button>
          </div>
        </div>
      )}

      {loading ? (
        <div style={{background:"white",borderRadius:14,padding:"3rem",textAlign:"center",color:"#9ca3af",fontWeight:600,boxShadow:"0 2px 8px rgba(0,0,0,0.06)"}}>Loading events...</div>
      ) : events.length === 0 ? (
        <div style={{background:"white",borderRadius:14,padding:"3rem",textAlign:"center",color:"#9ca3af",fontWeight:600,boxShadow:"0 2px 8px rgba(0,0,0,0.06)"}}>
          No events yet. Create your first one!
        </div>
      ) : (
        <div style={{display:"grid",gap:"1rem"}}>
          {events.map(event => {
            const upcoming = isUpcoming(event.event_date)
            const eventDate = new Date(event.event_date)
            const coverImg = event.cover_image_url || event.posts?.cover_image_url
            return (
              <div key={event.id} style={{background:"white",borderRadius:14,boxShadow:"0 2px 8px rgba(0,0,0,0.06)",border:"1px solid #f3f4f6",overflow:"hidden"}}>
                {coverImg && (
                  <img src={coverImg} alt={event.posts?.title} style={{width:"100%",height:160,objectFit:"cover",display:"block"}} />
                )}
                <div style={{borderLeft:"4px solid " + (upcoming?"#f89b24":"#9ca3af"),padding:"1.25rem",display:"flex",gap:"1rem",alignItems:"flex-start",flexWrap:"wrap"}}>
                  <div style={{textAlign:"center",flexShrink:0,minWidth:48}}>
                    <div style={{fontSize:"1.75rem",fontWeight:800,color:upcoming?"#1a2f6e":"#9ca3af",lineHeight:1}}>
                      {eventDate.getDate()}
                    </div>
                    <div style={{fontSize:"0.7rem",fontWeight:700,color:upcoming?"#f89b24":"#9ca3af",textTransform:"uppercase"}}>
                      {eventDate.toLocaleDateString("en-US",{month:"short"})}
                    </div>
                    <div style={{fontSize:"0.65rem",color:"#9ca3af",fontWeight:600}}>
                      {eventDate.getFullYear()}
                    </div>
                  </div>
                  <div style={{flex:1,minWidth:200}}>
                    <div style={{display:"flex",alignItems:"center",gap:"0.5rem",flexWrap:"wrap",marginBottom:"0.3rem"}}>
                      <div style={{fontWeight:800,fontSize:"1rem",color:"#1f2937"}}>{event.posts?.title}</div>
                      <span style={{padding:"0.15rem 0.5rem",borderRadius:20,fontSize:"0.7rem",fontWeight:700,background:upcoming?"#f0fdf4":"#f3f4f6",color:upcoming?"#15803d":"#6b7280"}}>
                        {upcoming ? "Upcoming" : "Past"}
                      </span>
                      {event.is_virtual && (
                        <span style={{padding:"0.15rem 0.5rem",borderRadius:20,fontSize:"0.7rem",fontWeight:700,background:"#f0f9ff",color:"#0369a1"}}>Virtual</span>
                      )}
                    </div>
                    {event.posts?.excerpt && (
                      <div style={{fontSize:"0.85rem",color:"#6b7280",marginBottom:"0.5rem"}}>{event.posts.excerpt}</div>
                    )}
                    <div style={{display:"flex",gap:"1.25rem",flexWrap:"wrap",fontSize:"0.82rem",color:"#9ca3af",fontWeight:600}}>
                      <span>{eventDate.toLocaleTimeString("en-US",{hour:"numeric",minute:"2-digit"})}</span>
                      {event.location && <span>{event.location}</span>}
                      {event.virtual_link && <span>Virtual link set</span>}
                      <span>RSVPs: {event.rsvp_count || 0}{event.max_attendees?" / "+event.max_attendees:""}</span>
                    </div>
                  </div>
                  <div style={{display:"flex",gap:"0.5rem",flexWrap:"wrap",alignItems:"center"}}>
                    <button onClick={() => toggleRSVP(event.id, event.is_rsvp_open)}
                      style={{padding:"0.3rem 0.75rem",borderRadius:6,border:"1.5px solid",borderColor:event.is_rsvp_open?"#bbf7d0":"#e5e7eb",background:event.is_rsvp_open?"#f0fdf4":"white",color:event.is_rsvp_open?"#15803d":"#6b7280",fontSize:"0.78rem",fontWeight:700,cursor:"pointer",fontFamily:"Barlow,system-ui,sans-serif"}}>
                      RSVP {event.is_rsvp_open?"Open":"Closed"}
                    </button>
                    <button onClick={() => deleteEvent(event.id, event.post_id)}
                      style={{padding:"0.3rem 0.75rem",borderRadius:6,border:"1.5px solid #fecaca",background:"white",color:"#dc2626",fontSize:"0.78rem",fontWeight:700,cursor:"pointer",fontFamily:"Barlow,system-ui,sans-serif"}}>
                      Delete
                    </button>
                  </div>
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
