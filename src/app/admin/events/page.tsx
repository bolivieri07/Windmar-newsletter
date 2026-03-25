'use client'
import { useEffect, useState } from "react"
import { createClient } from "@/lib/supabase/client"
import EventDateFilter from "@/components/EventDateFilter"

type Reminder = {
  id?: string
  event_id?: string
  reminder_type: string
  timing_value: number
  timing_unit: string
  custom_sms: string
  custom_email_subject: string
  custom_email_body: string
  image_url: string
  video_url: string
  is_sent?: boolean
}

const EMPTY_REMINDER: Reminder = {
  reminder_type: "both",
  timing_value: 1,
  timing_unit: "day",
  custom_sms: "",
  custom_email_subject: "",
  custom_email_body: "",
  image_url: "",
  video_url: "",
}

const TIMING_PRESETS = [
  { label: "1 hour before", value: 1, unit: "hour" },
  { label: "1 day before", value: 1, unit: "day" },
  { label: "2 days before", value: 2, unit: "day" },
  { label: "1 week before", value: 7, unit: "day" },
  { label: "Custom", value: 0, unit: "custom" },
]

const EMPTY_FORM = {
  post_title: "", post_excerpt: "", cover_image_url: "", event_date: "",
  event_end_date: "", location: "", address: "", is_virtual: false,
  virtual_link: "", max_attendees: "", is_rsvp_open: true,
  recurrence: "none", recurrence_end: "", no_end_date: false, custom_days: [] as string[],
}

export default function EventsPage() {
  const [events, setEvents] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [uploading, setUploading] = useState(false)
  const [uploadingReminder, setUploadingReminder] = useState<number|null>(null)
  const [toast, setToast] = useState("")
  const [showNotifyConfirm, setShowNotifyConfirm] = useState(false)
  const [pendingNotify, setPendingNotify] = useState<{title:string,excerpt:string}|null>(null)
  const [notifying, setNotifying] = useState(false)
  const [showForm, setShowForm] = useState(false)
  const [editingId, setEditingId] = useState<string|null>(null)
  const [editingPostId, setEditingPostId] = useState<string|null>(null)
  const [form, setForm] = useState({...EMPTY_FORM})
  const [reminders, setReminders] = useState<Reminder[]>([])
  const [previewIdx, setPreviewIdx] = useState<number|null>(null)
  const [showBulkEdit, setShowBulkEdit] = useState(false)
  const [siblingEvents, setSiblingEvents] = useState<any[]>([])
  const [filterStart, setFilterStart] = useState<Date|null>(null)
  const [filterEnd, setFilterEnd] = useState<Date|null>(null)
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

  function showToast(msg: string) { setToast(msg); setTimeout(() => setToast(""), 3000) }

  async function uploadImage(file: File, target: "cover" | number) {
    if (target === "cover") setUploading(true)
    else setUploadingReminder(target)
    const ext = file.name.split(".").pop()
    const fileName = "event-" + Date.now() + "." + ext
    const { error } = await supabase.storage.from("post-image").upload(fileName, file, { cacheControl: "3600", upsert: false })
    if (error) { showToast("Upload failed: " + error.message); setUploading(false); setUploadingReminder(null); return }
    const { data: urlData } = supabase.storage.from("post-image").getPublicUrl(fileName)
    if (target === "cover") {
      setForm(prev => ({...prev, cover_image_url: urlData.publicUrl}))
      setUploading(false)
    } else {
      setReminders(prev => prev.map((r,i) => i === target ? {...r, image_url: urlData.publicUrl} : r))
      setUploadingReminder(null)
    }
    showToast("Image uploaded!")
  }

  function openCreate() {
    setForm({...EMPTY_FORM})
    setReminders([])
    setEditingId(null)
    setEditingPostId(null)
    setShowForm(true)
  }

  function getBaseTitle(title: string): string {
    return title.replace(/\s*\([A-Z][a-z]{2}\s\d{1,2}\)\s*$/, "").trim()
  }

  async function openEdit(event: any) {
    const baseTitle = getBaseTitle(event.posts?.title || "")
    const siblings = events.filter(e => e.id !== event.id && getBaseTitle(e.posts?.title || "") === baseTitle)
    setSiblingEvents(siblings)
    setEditingId(event.id)
    setEditingPostId(event.post_id)
    setForm({
      post_title: event.posts?.title || "",
      post_excerpt: event.posts?.excerpt || "",
      cover_image_url: event.cover_image_url || event.posts?.cover_image_url || "",
      event_date: event.event_date ? event.event_date.slice(0,16) : "",
      event_end_date: event.event_end_date ? event.event_end_date.slice(0,16) : "",
      location: event.location || "",
      address: event.address || "",
      is_virtual: event.is_virtual || false,
      virtual_link: event.virtual_link || "",
      max_attendees: event.max_attendees ? String(event.max_attendees) : "",
      is_rsvp_open: event.is_rsvp_open ?? true,
      recurrence: "none", recurrence_end: "", no_end_date: false, custom_days: [],
    })
    const { data: rems } = await supabase.from("event_reminders").select("*").eq("event_id", event.id).order("created_at")
    setReminders((rems || []).map((r: any) => ({
      id: r.id, event_id: r.event_id, reminder_type: r.reminder_type || "both",
      timing_value: r.timing_value || 1, timing_unit: r.timing_unit || "day",
      custom_sms: r.custom_sms || "", custom_email_subject: r.custom_email_subject || "",
      custom_email_body: r.custom_email_body || "", image_url: r.image_url || "",
      video_url: r.video_url || "", is_sent: r.is_sent,
    })))
    setShowForm(true)
  }

  function addReminder() { setReminders(prev => [...prev, {...EMPTY_REMINDER}]) }
  function removeReminder(idx: number) { setReminders(prev => prev.filter((_,i) => i !== idx)) }
  function updateReminder(idx: number, field: string, value: any) {
    setReminders(prev => prev.map((r,i) => i === idx ? {...r, [field]: value} : r))
  }

  function calcSendAt(eventDate: string, timingValue: number, timingUnit: string): string {
    const d = new Date(eventDate)
    if (timingUnit === "hour") d.setHours(d.getHours() - timingValue)
    else d.setDate(d.getDate() - timingValue)
    return d.toISOString()
  }

  function generateRecurringDates(startDate: string, recurrence: string, endDate: string, customDays: string[]): string[] {
    const dates: string[] = [startDate]
    if (recurrence === "none" || !endDate) return dates
    const start = new Date(startDate)
    const end = new Date(endDate)
    const time = startDate.includes("T") ? startDate.split("T")[1] : "00:00"
    const dayMap: Record<string, number> = { Sun: 0, Mon: 1, Tue: 2, Wed: 3, Thu: 4, Fri: 5, Sat: 6 }
    let current = new Date(start)
    current.setDate(current.getDate() + 1)
    while (current <= end) {
      let add = false
      if (recurrence === "daily") add = true
      else if (recurrence === "weekly") { if (current.getDay() === start.getDay()) add = true }
      else if (recurrence === "biweekly") { if (Math.round((current.getTime() - start.getTime()) / 864e5) % 14 === 0) add = true }
      else if (recurrence === "monthly") { if (current.getDate() === start.getDate() && (current.getMonth() !== start.getMonth() || current.getFullYear() !== start.getFullYear())) add = true }
      else if (recurrence === "custom") { if (customDays.map(d => dayMap[d]).includes(current.getDay())) add = true }
      if (add) { const y=current.getFullYear(),m=String(current.getMonth()+1).padStart(2,"0"),dd=String(current.getDate()).padStart(2,"0"); dates.push(`${y}-${m}-${dd}T${time}`) }
      current.setDate(current.getDate() + 1)
      if (dates.length > 100) break
    }
    return dates
  }

  async function saveCurrentEvent() {
    setSaving(true)
    await supabase.from("posts").update({ title: form.post_title, excerpt: form.post_excerpt, cover_image_url: form.cover_image_url || null }).eq("id", editingPostId!)
    await supabase.from("events").update({
      event_date: form.event_date, event_end_date: form.event_end_date || null,
      location: form.location || null, address: form.address || null,
      is_virtual: form.is_virtual, virtual_link: form.virtual_link || null,
      max_attendees: form.max_attendees ? parseInt(form.max_attendees) : null,
      is_rsvp_open: form.is_rsvp_open, cover_image_url: form.cover_image_url || null,
    }).eq("id", editingId!)
    await supabase.from("event_reminders").delete().eq("event_id", editingId!).eq("is_sent", false)
    for (const rem of reminders) {
      if (rem.is_sent) continue
      await supabase.from("event_reminders").insert({
        event_id: editingId!, reminder_type: rem.reminder_type,
        timing_value: rem.timing_value, timing_unit: rem.timing_unit,
        custom_sms: rem.custom_sms || null, custom_email_subject: rem.custom_email_subject || null,
        custom_email_body: rem.custom_email_body || null, image_url: rem.image_url || null,
        video_url: rem.video_url || null, send_at: calcSendAt(form.event_date, rem.timing_value, rem.timing_unit),
      })
    }
    showToast("Event updated!")
    setShowForm(false); setShowBulkEdit(false); setEditingId(null); setEditingPostId(null)
    fetchEvents(); setSaving(false)
  }

  async function saveAllEvents() {
    setSaving(true)
    const sharedFields = {
      excerpt: form.post_excerpt, cover_image_url: form.cover_image_url || null,
    }
    const sharedEventFields = {
      location: form.location || null, address: form.address || null,
      is_virtual: form.is_virtual, virtual_link: form.virtual_link || null,
      max_attendees: form.max_attendees ? parseInt(form.max_attendees) : null,
      is_rsvp_open: form.is_rsvp_open, cover_image_url: form.cover_image_url || null,
    }
    await supabase.from("posts").update({ title: form.post_title, ...sharedFields }).eq("id", editingPostId!)
    await supabase.from("events").update({ event_date: form.event_date, event_end_date: form.event_end_date || null, ...sharedEventFields }).eq("id", editingId!)
    await supabase.from("event_reminders").delete().eq("event_id", editingId!).eq("is_sent", false)
    for (const rem of reminders) {
      if (rem.is_sent) continue
      await supabase.from("event_reminders").insert({
        event_id: editingId!, reminder_type: rem.reminder_type, timing_value: rem.timing_value, timing_unit: rem.timing_unit,
        custom_sms: rem.custom_sms || null, custom_email_subject: rem.custom_email_subject || null,
        custom_email_body: rem.custom_email_body || null, image_url: rem.image_url || null, video_url: rem.video_url || null,
        send_at: calcSendAt(form.event_date, rem.timing_value, rem.timing_unit),
      })
    }
    for (const sib of siblingEvents) {
      const sibDate = sib.event_date
      const baseTitle = getBaseTitle(sib.posts?.title || "")
      const suffix = baseTitle !== sib.posts?.title ? sib.posts?.title.replace(baseTitle, "").trim() : ""
      const newTitle = form.post_title + (suffix ? " " + suffix : "")
      await supabase.from("posts").update({ title: newTitle, ...sharedFields }).eq("id", sib.post_id)
      await supabase.from("events").update(sharedEventFields).eq("id", sib.id)
      await supabase.from("event_reminders").delete().eq("event_id", sib.id).eq("is_sent", false)
      for (const rem of reminders) {
        if (rem.is_sent) continue
        await supabase.from("event_reminders").insert({
          event_id: sib.id, reminder_type: rem.reminder_type, timing_value: rem.timing_value, timing_unit: rem.timing_unit,
          custom_sms: rem.custom_sms || null, custom_email_subject: rem.custom_email_subject || null,
          custom_email_body: rem.custom_email_body || null, image_url: rem.image_url || null, video_url: rem.video_url || null,
          send_at: calcSendAt(sibDate, rem.timing_value, rem.timing_unit),
        })
      }
    }
    showToast(`Updated ${siblingEvents.length + 1} events!`)
    setShowForm(false); setShowBulkEdit(false); setEditingId(null); setEditingPostId(null)
    fetchEvents(); setSaving(false)
  }

  async function handleSave() {
    if (!form.post_title.trim()) { showToast("Event title is required"); return }
    if (!form.event_date) { showToast("Event date is required"); return }
    if (form.recurrence !== "none" && !form.recurrence_end && !form.no_end_date) { showToast("Recurrence end date is required"); return }
    setSaving(true)

    if (editingId && editingPostId) {
      if (siblingEvents.length > 0 && !showBulkEdit) {
        setShowBulkEdit(true)
        setSaving(false)
        return
      }
      await saveCurrentEvent()
      return
    }

    const dates = generateRecurringDates(form.event_date, form.recurrence, form.recurrence_end, form.custom_days)
    let created = 0
    for (const date of dates) {
      const suffix = dates.length > 1 ? ` (${new Date(date).toLocaleDateString("en-US",{month:"short",day:"numeric"})})` : ""
      const { data: post, error: pe } = await supabase.from("posts").insert({
        title: form.post_title + suffix,
        slug: form.post_title.toLowerCase().replace(/[^a-z0-9]+/g,"-") + "-" + Date.now() + "-" + created,
        excerpt: form.post_excerpt, cover_image_url: form.cover_image_url || null,
        post_type: "event", status: "published", published_at: new Date().toISOString(),
      }).select().single()
      if (pe) { showToast("Error: " + pe.message); continue }
      const endTime = form.event_end_date ? form.event_end_date.split("T")[1] || "23:59" : ""
      let eventEnd = null
      if (endTime) { const d = new Date(date); const [eh,em] = endTime.split(":"); d.setHours(parseInt(eh),parseInt(em)); eventEnd = d.toISOString() }
      const { data: ev, error: ee } = await supabase.from("events").insert({
        post_id: post.id, event_date: date, event_end_date: eventEnd,
        location: form.location || null, address: form.address || null,
        is_virtual: form.is_virtual, virtual_link: form.virtual_link || null,
        max_attendees: form.max_attendees ? parseInt(form.max_attendees) : null,
        is_rsvp_open: form.is_rsvp_open, cover_image_url: form.cover_image_url || null,
      }).select().single()
      if (ee) { showToast("Error: " + ee.message); continue }
      for (const rem of reminders) {
        await supabase.from("event_reminders").insert({
          event_id: ev.id, reminder_type: rem.reminder_type,
          timing_value: rem.timing_value, timing_unit: rem.timing_unit,
          custom_sms: rem.custom_sms || null, custom_email_subject: rem.custom_email_subject || null,
          custom_email_body: rem.custom_email_body || null, image_url: rem.image_url || null,
          video_url: rem.video_url || null, send_at: calcSendAt(date, rem.timing_value, rem.timing_unit),
        })
      }
      created++
    }
    showToast(`Created ${created} event${created>1?"s":""}!`)
    setPendingNotify({title:form.post_title,excerpt:form.post_excerpt})
    setShowNotifyConfirm(true)
    setShowForm(false)
    setForm({...EMPTY_FORM}); setReminders([])
    fetchEvents(); setSaving(false)
  }

  async function sendEventNotification(title: string, excerpt: string) {
    setNotifying(true)
    try {
      const smsMessage = "Windmar Solar Academy Event: " + title + (excerpt ? " - " + excerpt : "") + "\n\nDetails: https://windmar-newsletter.vercel.app"
      const emailBody = `<div style="font-family:Arial,sans-serif;max-width:600px;margin:0 auto"><div style="background:linear-gradient(135deg,#0f1d47,#1a2f6e);padding:24px;border-radius:12px 12px 0 0"><h1 style="color:#f89b24;margin:0;font-size:20px">Windmar Solar Academy</h1><p style="color:rgba(255,255,255,0.7);margin:8px 0 0;font-size:14px">New Event</p></div><div style="background:white;padding:24px;border:1px solid #e5e7eb;border-top:none;border-radius:0 0 12px 12px"><h2 style="color:#1a2f6e;margin:0 0 12px">${title}</h2><p style="color:#4b5563;line-height:1.6;margin:0 0 20px">${excerpt}</p><a href="https://windmar-newsletter.vercel.app" style="display:inline-block;background:#f89b24;color:white;padding:12px 24px;border-radius:8px;text-decoration:none;font-weight:bold">View Event</a></div></div>`
      const res = await fetch("/api/ghl", { method: "POST", headers: {"Content-Type":"application/json"}, body: JSON.stringify({type:"event",title,message:smsMessage,emailSubject:"New Event: "+title,emailBody}) })
      const data = await res.json()
      if (data.error) showToast("Notification error: " + data.error)
      else showToast("Notifications sent to " + (data.results?.total || 0) + " contacts!")
    } catch (err: any) { showToast("Notification failed: " + err.message) }
    setNotifying(false); setShowNotifyConfirm(false); setPendingNotify(null)
  }

  async function toggleRSVP(id: string, current: boolean) {
    await supabase.from("events").update({ is_rsvp_open: !current }).eq("id", id)
    setEvents(prev => prev.map(e => e.id === id ? {...e, is_rsvp_open: !current} : e))
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
  const filteredEvents = (filterStart && filterEnd) ? events.filter(e => { const d = new Date(e.event_date); return d >= filterStart && d <= filterEnd }) : events

  const recurrencePreview = form.recurrence !== "none" && form.event_date && form.recurrence_end
    ? generateRecurringDates(form.event_date, form.recurrence, form.recurrence_end, form.custom_days) : []

  const inputStyle = { width:"100%",padding:"0.8rem 1rem",border:"1.5px solid #e5e7eb",borderRadius:8,fontSize:"0.95rem",fontFamily:"Barlow,system-ui,sans-serif",outline:"none",color:"#1f2937",boxSizing:"border-box" as const,background:"white" }
  const labelStyle = { display:"block" as const,color:"#374151",fontSize:"0.78rem",fontWeight:700,marginBottom:"0.4rem",textTransform:"uppercase" as const,letterSpacing:"0.04em" }
  const pillBtn = (active: boolean, color?: string) => ({ padding:"0.4rem 0.9rem",borderRadius:8,fontSize:"0.82rem",fontWeight:700,cursor:"pointer",fontFamily:"Barlow,system-ui,sans-serif",transition:"all 0.15s",border:active?`2px solid ${color||"#1a2f6e"}`:"2px solid #e5e7eb",background:active?(color?"rgba(248,155,36,0.1)":"#e8edf8"):"white",color:active?(color||"#1a2f6e"):"#6b7280" })

  return (
    <div style={{maxWidth:1000,margin:"0 auto"}}>
      <div style={{display:"flex",alignItems:"center",justifyContent:"space-between",marginBottom:"1rem",flexWrap:"wrap",gap:"1rem"}}>
        <div>
          <h1 style={{color:"#1a2f6e",fontSize:"1.75rem",fontWeight:800,margin:"0 0 0.25rem 0"}}>Events Manager</h1>
          <p style={{color:"#6b7280",fontSize:"0.9rem",margin:0}}>{filteredEvents.length} of {events.length} events</p>
        </div>
        <button onClick={() => showForm ? setShowForm(false) : openCreate()}
          style={{padding:"0.75rem 1.25rem",background:"#f89b24",color:"white",border:"none",borderRadius:8,fontSize:"0.9rem",fontWeight:700,cursor:"pointer",fontFamily:"Barlow,system-ui,sans-serif"}}>
          {showForm ? "Cancel" : "+ New Event"}
        </button>
      </div>

      <EventDateFilter onFilterChange={(s,e) => { setFilterStart(s); setFilterEnd(e) }} />

      {showForm && (
        <div style={{background:"white",borderRadius:14,padding:"1.5rem",boxShadow:"0 2px 8px rgba(0,0,0,0.06)",border:"1px solid #f3f4f6",marginBottom:"1.5rem"}}>
          <h2 style={{color:"#1a2f6e",fontSize:"1rem",fontWeight:800,textTransform:"uppercase",letterSpacing:"0.04em",margin:"0 0 1.25rem 0"}}>
            {editingId ? "Edit Event" : "Create New Event"}
          </h2>

          <div style={{display:"grid",gridTemplateColumns:"repeat(auto-fit,minmax(250px,1fr))",gap:"1rem",marginBottom:"1rem"}}>
            <div><label style={labelStyle}>Event Title *</label><input type="text" value={form.post_title} onChange={e => setForm({...form,post_title:e.target.value})} placeholder="e.g. Monthly Town Hall" style={inputStyle} /></div>
            <div><label style={labelStyle}>Short Description</label><input type="text" value={form.post_excerpt} onChange={e => setForm({...form,post_excerpt:e.target.value})} placeholder="Brief event summary..." style={inputStyle} /></div>
          </div>

          <div style={{marginBottom:"1rem"}}>
            <label style={labelStyle}>Cover Image</label>
            <div style={{border:"2px dashed #e5e7eb",borderRadius:8,padding:"1.25rem",textAlign:"center",cursor:"pointer",background:"#f9fafb"}}
              onClick={() => document.getElementById("event-cover-upload")?.click()}>
              <input id="event-cover-upload" type="file" accept="image/*" style={{display:"none"}} onChange={async (e) => { const f=e.target.files?.[0]; if(f) await uploadImage(f,"cover") }} />
              {form.cover_image_url ? (
                <div style={{position:"relative"}}>
                  <img src={form.cover_image_url} alt="preview" style={{width:"100%",height:160,objectFit:"cover",borderRadius:8}} />
                  <button onClick={(e)=>{e.stopPropagation();setForm({...form,cover_image_url:""})}} style={{position:"absolute",top:8,right:8,background:"rgba(0,0,0,0.6)",color:"white",border:"none",borderRadius:"50%",width:28,height:28,cursor:"pointer",fontSize:"1rem"}}>x</button>
                </div>
              ) : uploading ? <div style={{color:"#f89b24",fontWeight:700}}>Uploading...</div> : (
                <div><div style={{color:"#6b7280",fontWeight:600,fontSize:"0.88rem"}}>Click to upload cover image</div></div>
              )}
            </div>
          </div>

          <div style={{display:"grid",gridTemplateColumns:"repeat(auto-fit,minmax(200px,1fr))",gap:"1rem",marginBottom:"1rem"}}>
            <div><label style={labelStyle}>Start Date & Time *</label><input type="datetime-local" value={form.event_date} onChange={e => setForm({...form,event_date:e.target.value})} style={inputStyle} /></div>
            <div><label style={labelStyle}>End Date & Time</label><input type="datetime-local" value={form.event_end_date} onChange={e => setForm({...form,event_end_date:e.target.value})} style={inputStyle} /></div>
          </div>

          {!editingId && (
            <div style={{background:"#f9fafb",borderRadius:10,padding:"1.25rem",marginBottom:"1rem",border:"1px solid #f3f4f6"}}>
              <label style={{...labelStyle,marginBottom:"0.75rem"}}>Recurrence</label>
              <div style={{display:"flex",gap:"0.5rem",flexWrap:"wrap",marginBottom:form.recurrence!=="none"?"1rem":0}}>
                {[{value:"none",label:"Does not repeat"},{value:"daily",label:"Daily"},{value:"weekly",label:"Weekly"},{value:"biweekly",label:"Every 2 weeks"},{value:"monthly",label:"Monthly"},{value:"custom",label:"Custom"}].map(opt => (
                  <button key={opt.value} onClick={() => setForm({...form,recurrence:opt.value,custom_days:opt.value==="custom"?form.custom_days:[]})} style={pillBtn(form.recurrence===opt.value)}>{opt.label}</button>
                ))}
              </div>
              {form.recurrence === "custom" && (
                <div style={{marginBottom:"1rem"}}>
                  <label style={{...labelStyle,marginBottom:"0.5rem"}}>Repeat on</label>
                  <div style={{display:"flex",gap:"0.4rem",flexWrap:"wrap"}}>
                    {["Sun","Mon","Tue","Wed","Thu","Fri","Sat"].map(day => {
                      const active = form.custom_days.includes(day)
                      return <button key={day} onClick={() => setForm({...form,custom_days:active?form.custom_days.filter(d=>d!==day):[...form.custom_days,day]})} style={{width:44,height:44,borderRadius:"50%",fontSize:"0.78rem",fontWeight:700,cursor:"pointer",border:active?"2px solid #f89b24":"2px solid #e5e7eb",background:active?"#f89b24":"white",color:active?"white":"#6b7280",fontFamily:"Barlow,system-ui,sans-serif"}}>{day}</button>
                    })}
                  </div>
                </div>
              )}
              {form.recurrence !== "none" && (
                <div>
                  <label style={{display:"flex",alignItems:"center",gap:"0.5rem",cursor:"pointer",fontWeight:600,color:"#374151",fontSize:"0.88rem",marginBottom:"0.75rem"}}>
                    <input type="checkbox" checked={form.no_end_date} onChange={e => { const checked=e.target.checked; const sm=new Date(); sm.setMonth(sm.getMonth()+6); setForm({...form,no_end_date:checked,recurrence_end:checked?sm.toISOString().split("T")[0]:""}) }} style={{width:16,height:16,accentColor:"#f89b24"}} />
                    No end date (creates 6 months of events)
                  </label>
                  {!form.no_end_date && (<div><label style={labelStyle}>Repeat until *</label><input type="date" value={form.recurrence_end} onChange={e => setForm({...form,recurrence_end:e.target.value})} style={{...inputStyle,maxWidth:250}} /></div>)}
                </div>
              )}
              {recurrencePreview.length > 1 && (
                <div style={{marginTop:"0.75rem",padding:"0.75rem",background:"white",borderRadius:8,border:"1px solid #e5e7eb"}}>
                  <div style={{fontSize:"0.75rem",fontWeight:700,color:"#1a2f6e",textTransform:"uppercase",letterSpacing:"0.04em",marginBottom:"0.4rem"}}>{recurrencePreview.length} events will be created</div>
                  <div style={{display:"flex",gap:"0.4rem",flexWrap:"wrap"}}>
                    {recurrencePreview.slice(0,20).map((d,i) => <span key={i} style={{padding:"0.2rem 0.5rem",background:"#f0f9ff",color:"#0369a1",borderRadius:6,fontSize:"0.72rem",fontWeight:600}}>{new Date(d).toLocaleDateString("en-US",{month:"short",day:"numeric"})}</span>)}
                    {recurrencePreview.length > 20 && <span style={{padding:"0.2rem 0.5rem",color:"#9ca3af",fontSize:"0.72rem",fontWeight:600}}>+{recurrencePreview.length-20} more</span>}
                  </div>
                </div>
              )}
            </div>
          )}

          <div style={{marginBottom:"1rem"}}>
            <label style={{display:"flex",alignItems:"center",gap:"0.5rem",cursor:"pointer",fontWeight:600,color:"#374151",fontSize:"0.88rem",marginBottom:"0.75rem"}}>
              <input type="checkbox" checked={form.is_virtual} onChange={e => setForm({...form,is_virtual:e.target.checked})} style={{width:16,height:16,accentColor:"#f89b24"}} /> This is a virtual event
            </label>
            {form.is_virtual ? (
              <div><label style={labelStyle}>Virtual Link</label><input type="url" value={form.virtual_link} onChange={e => setForm({...form,virtual_link:e.target.value})} placeholder="https://zoom.us/j/..." style={inputStyle} /></div>
            ) : (
              <div style={{display:"grid",gridTemplateColumns:"repeat(auto-fit,minmax(200px,1fr))",gap:"1rem"}}>
                <div><label style={labelStyle}>Location Name</label><input type="text" value={form.location} onChange={e => setForm({...form,location:e.target.value})} placeholder="e.g. Windmar HQ" style={inputStyle} /></div>
                <div><label style={labelStyle}>Address</label><input type="text" value={form.address} onChange={e => setForm({...form,address:e.target.value})} placeholder="Full address..." style={inputStyle} /></div>
              </div>
            )}
          </div>

          <div style={{display:"grid",gridTemplateColumns:"repeat(auto-fit,minmax(200px,1fr))",gap:"1rem",marginBottom:"1.25rem"}}>
            <div><label style={labelStyle}>Max Attendees (optional)</label><input type="number" value={form.max_attendees} onChange={e => setForm({...form,max_attendees:e.target.value})} placeholder="Leave blank for unlimited" style={inputStyle} /></div>
            <div style={{display:"flex",alignItems:"flex-end",paddingBottom:"0.1rem"}}>
              <label style={{display:"flex",alignItems:"center",gap:"0.5rem",cursor:"pointer",fontWeight:600,color:"#374151",fontSize:"0.88rem"}}>
                <input type="checkbox" checked={form.is_rsvp_open} onChange={e => setForm({...form,is_rsvp_open:e.target.checked})} style={{width:16,height:16,accentColor:"#f89b24"}} /> Accept RSVPs
              </label>
            </div>
          </div>

          {/* REMINDERS SECTION */}
          <div style={{background:"#f9fafb",borderRadius:10,padding:"1.25rem",marginBottom:"1.25rem",border:"1px solid #f3f4f6"}}>
            <div style={{display:"flex",alignItems:"center",justifyContent:"space-between",marginBottom:"1rem"}}>
              <label style={{...labelStyle,margin:0}}>Reminders ({reminders.length})</label>
              <button onClick={addReminder} style={{padding:"0.4rem 0.9rem",background:"#1a2f6e",color:"white",border:"none",borderRadius:8,fontSize:"0.82rem",fontWeight:700,cursor:"pointer",fontFamily:"Barlow,system-ui,sans-serif"}}>+ Add Reminder</button>
            </div>

            {reminders.length === 0 && <div style={{color:"#9ca3af",fontSize:"0.85rem",textAlign:"center",padding:"1rem 0"}}>No reminders set. Add one to notify attendees before the event.</div>}

            {reminders.map((rem, idx) => (
              <div key={idx} style={{background:"white",borderRadius:10,padding:"1rem",marginBottom:"0.75rem",border:"1px solid #e5e7eb"}}>
                <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:"0.75rem"}}>
                  <div style={{fontWeight:700,color:"#1a2f6e",fontSize:"0.88rem"}}>Reminder {idx+1} {rem.is_sent ? <span style={{color:"#15803d",fontSize:"0.75rem"}}>(Sent)</span> : ""}</div>
                  <div style={{display:"flex",gap:"0.4rem"}}>
                    <button onClick={() => setPreviewIdx(previewIdx === idx ? null : idx)} style={{padding:"0.3rem 0.7rem",borderRadius:6,border:"1.5px solid #e5e7eb",background:"white",color:"#6b7280",fontSize:"0.75rem",fontWeight:700,cursor:"pointer"}}>Preview</button>
                    {!rem.is_sent && <button onClick={() => removeReminder(idx)} style={{padding:"0.3rem 0.7rem",borderRadius:6,border:"1.5px solid #fecaca",background:"white",color:"#dc2626",fontSize:"0.75rem",fontWeight:700,cursor:"pointer"}}>Remove</button>}
                  </div>
                </div>

                <div style={{display:"grid",gridTemplateColumns:"repeat(auto-fit,minmax(180px,1fr))",gap:"0.75rem",marginBottom:"0.75rem"}}>
                  <div>
                    <label style={{...labelStyle,fontSize:"0.72rem"}}>Send via</label>
                    <div style={{display:"flex",gap:"0.35rem"}}>
                      {[{v:"sms",l:"SMS"},{v:"email",l:"Email"},{v:"both",l:"Both"}].map(o => (
                        <button key={o.v} onClick={() => updateReminder(idx,"reminder_type",o.v)} style={pillBtn(rem.reminder_type===o.v,"#f89b24")}>{o.l}</button>
                      ))}
                    </div>
                  </div>
                  <div>
                    <label style={{...labelStyle,fontSize:"0.72rem"}}>When</label>
                    <div style={{display:"flex",gap:"0.35rem",flexWrap:"wrap"}}>
                      {TIMING_PRESETS.map(tp => {
                        const active = tp.unit === "custom" ? (rem.timing_unit === "custom") : (rem.timing_value === tp.value && rem.timing_unit === tp.unit)
                        return <button key={tp.label} onClick={() => { if(tp.unit==="custom") updateReminder(idx,"timing_unit","custom"); else { updateReminder(idx,"timing_value",tp.value); updateReminder(idx,"timing_unit",tp.unit) } }} style={pillBtn(active)}>{tp.label}</button>
                      })}
                    </div>
                    {rem.timing_unit === "custom" && (
                      <div style={{display:"flex",gap:"0.5rem",marginTop:"0.5rem"}}>
                        <input type="number" min="1" value={rem.timing_value} onChange={e => updateReminder(idx,"timing_value",parseInt(e.target.value)||1)} style={{...inputStyle,width:80}} />
                        <select value={rem.timing_unit === "custom" ? "day" : rem.timing_unit} onChange={e => updateReminder(idx,"timing_unit",e.target.value)} style={{...inputStyle,width:120}}>
                          <option value="hour">Hours</option><option value="day">Days</option>
                        </select>
                        <span style={{alignSelf:"center",color:"#6b7280",fontSize:"0.85rem",fontWeight:600}}>before</span>
                      </div>
                    )}
                  </div>
                </div>

                {(rem.reminder_type === "sms" || rem.reminder_type === "both") && (
                  <div style={{marginBottom:"0.75rem"}}>
                    <label style={{...labelStyle,fontSize:"0.72rem"}}>Custom SMS Message</label>
                    <textarea value={rem.custom_sms} onChange={e => updateReminder(idx,"custom_sms",e.target.value)} placeholder="Leave blank for default reminder message" rows={2} style={{...inputStyle,resize:"vertical"}} />
                  </div>
                )}

                {(rem.reminder_type === "email" || rem.reminder_type === "both") && (
                  <>
                    <div style={{marginBottom:"0.5rem"}}><label style={{...labelStyle,fontSize:"0.72rem"}}>Email Subject</label><input type="text" value={rem.custom_email_subject} onChange={e => updateReminder(idx,"custom_email_subject",e.target.value)} placeholder="Leave blank for default subject" style={inputStyle} /></div>
                    <div style={{marginBottom:"0.75rem"}}><label style={{...labelStyle,fontSize:"0.72rem"}}>Email Body</label><textarea value={rem.custom_email_body} onChange={e => updateReminder(idx,"custom_email_body",e.target.value)} placeholder="Leave blank for default email body" rows={3} style={{...inputStyle,resize:"vertical"}} /></div>
                  </>
                )}

                <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:"0.75rem"}}>
                  <div>
                    <label style={{...labelStyle,fontSize:"0.72rem"}}>Attach Image</label>
                    <div style={{border:"2px dashed #e5e7eb",borderRadius:8,padding:"0.75rem",textAlign:"center",cursor:"pointer",background:"white"}} onClick={() => document.getElementById(`rem-img-${idx}`)?.click()}>
                      <input id={`rem-img-${idx}`} type="file" accept="image/*" style={{display:"none"}} onChange={async e => { const f=e.target.files?.[0]; if(f) await uploadImage(f,idx) }} />
                      {rem.image_url ? (
                        <div style={{position:"relative"}}><img src={rem.image_url} alt="" style={{width:"100%",height:80,objectFit:"cover",borderRadius:6}} /><button onClick={e=>{e.stopPropagation();updateReminder(idx,"image_url","")}} style={{position:"absolute",top:4,right:4,background:"rgba(0,0,0,0.6)",color:"white",border:"none",borderRadius:"50%",width:22,height:22,cursor:"pointer",fontSize:"0.8rem"}}>x</button></div>
                      ) : uploadingReminder === idx ? <div style={{color:"#f89b24",fontWeight:600,fontSize:"0.82rem"}}>Uploading...</div> : <div style={{color:"#9ca3af",fontSize:"0.78rem",fontWeight:600}}>Click to upload</div>}
                    </div>
                  </div>
                  <div>
                    <label style={{...labelStyle,fontSize:"0.72rem"}}>Video URL</label>
                    <input type="url" value={rem.video_url} onChange={e => updateReminder(idx,"video_url",e.target.value)} placeholder="YouTube or video link" style={inputStyle} />
                    {rem.video_url && <div style={{marginTop:"0.4rem",fontSize:"0.72rem",color:"#15803d",fontWeight:600}}>Video attached</div>}
                  </div>
                </div>

                {previewIdx === idx && (
                  <div style={{marginTop:"1rem",borderTop:"1px solid #e5e7eb",paddingTop:"1rem"}}>
                    <div style={{fontWeight:700,color:"#1a2f6e",fontSize:"0.82rem",marginBottom:"0.75rem",textTransform:"uppercase",letterSpacing:"0.04em"}}>Preview</div>
                    {(rem.reminder_type === "sms" || rem.reminder_type === "both") && (
                      <div style={{marginBottom:"0.75rem"}}>
                        <div style={{fontSize:"0.72rem",fontWeight:700,color:"#9ca3af",marginBottom:"0.3rem"}}>SMS PREVIEW</div>
                        <div style={{background:"#e8edf8",borderRadius:12,padding:"0.75rem 1rem",fontSize:"0.88rem",color:"#1f2937",maxWidth:320}}>
                          {rem.custom_sms || `Reminder: ${form.post_title || "Event"} is coming up${rem.timing_unit === "hour" ? ` in ${rem.timing_value} hour${rem.timing_value>1?"s":""}` : ` in ${rem.timing_value} day${rem.timing_value>1?"s":""}`}! Details: https://windmar-newsletter.vercel.app`}
                        </div>
                      </div>
                    )}
                    {(rem.reminder_type === "email" || rem.reminder_type === "both") && (
                      <div>
                        <div style={{fontSize:"0.72rem",fontWeight:700,color:"#9ca3af",marginBottom:"0.3rem"}}>EMAIL PREVIEW</div>
                        <div style={{background:"white",borderRadius:12,border:"1px solid #e5e7eb",overflow:"hidden",maxWidth:400}}>
                          <div style={{background:"linear-gradient(135deg,#0f1d47,#1a2f6e)",padding:"16px 20px"}}>
                            <div style={{color:"#f89b24",fontWeight:800,fontSize:"0.95rem"}}>Windmar Solar Academy</div>
                            <div style={{color:"rgba(255,255,255,0.6)",fontSize:"0.75rem"}}>Event Reminder</div>
                          </div>
                          <div style={{padding:"16px 20px"}}>
                            <div style={{fontWeight:700,color:"#1a2f6e",fontSize:"0.95rem",marginBottom:"0.3rem"}}>{rem.custom_email_subject || `Reminder: ${form.post_title || "Event"}`}</div>
                            <div style={{fontSize:"0.85rem",color:"#4b5563",lineHeight:1.6,marginBottom:"0.75rem"}}>{rem.custom_email_body || `Don't forget! ${form.post_title || "Your event"} is coming up${rem.timing_unit === "hour" ? ` in ${rem.timing_value} hour${rem.timing_value>1?"s":""}` : ` in ${rem.timing_value} day${rem.timing_value>1?"s":""}`}.`}</div>
                            {rem.image_url && <img src={rem.image_url} alt="" style={{width:"100%",borderRadius:8,marginBottom:"0.75rem"}} />}
                            {rem.video_url && <div style={{padding:"0.5rem",background:"#f0f9ff",borderRadius:8,marginBottom:"0.75rem",fontSize:"0.78rem",color:"#0369a1",fontWeight:600}}>Video: {rem.video_url}</div>}
                            <div style={{display:"inline-block",background:"#f89b24",color:"white",padding:"8px 20px",borderRadius:8,fontSize:"0.85rem",fontWeight:700}}>View Event</div>
                          </div>
                        </div>
                      </div>
                    )}
                  </div>
                )}
              </div>
            ))}
          </div>

          <div style={{display:"flex",gap:"0.75rem"}}>
            <button onClick={handleSave} disabled={saving}
              style={{padding:"0.8rem 1.5rem",background:"#f89b24",color:"white",border:"none",borderRadius:8,fontSize:"0.9rem",fontWeight:700,cursor:saving?"not-allowed":"pointer",opacity:saving?0.7:1,fontFamily:"Barlow,system-ui,sans-serif"}}>
              {saving ? "Saving..." : editingId ? "Save Changes" : recurrencePreview.length > 1 ? `Create ${recurrencePreview.length} Events` : "Create Event"}
            </button>
            <button onClick={() => { setShowForm(false); setEditingId(null); setEditingPostId(null) }}
              style={{padding:"0.8rem 1.5rem",background:"white",color:"#6b7280",border:"1.5px solid #e5e7eb",borderRadius:8,fontSize:"0.9rem",fontWeight:700,cursor:"pointer",fontFamily:"Barlow,system-ui,sans-serif"}}>
              Cancel
            </button>
          </div>
        </div>
      )}

      {loading ? (
        <div style={{background:"white",borderRadius:14,padding:"3rem",textAlign:"center",color:"#9ca3af",fontWeight:600,boxShadow:"0 2px 8px rgba(0,0,0,0.06)"}}>Loading events...</div>
      ) : filteredEvents.length === 0 ? (
        <div style={{background:"white",borderRadius:14,padding:"3rem",textAlign:"center",color:"#9ca3af",fontWeight:600,boxShadow:"0 2px 8px rgba(0,0,0,0.06)"}}>No events for this period.</div>
      ) : (
        <div style={{display:"grid",gap:"1rem"}}>
          {filteredEvents.map(event => {
            const upcoming = isUpcoming(event.event_date)
            const eventDate = new Date(event.event_date)
            const coverImg = event.cover_image_url || event.posts?.cover_image_url
            return (
              <div key={event.id} style={{background:"white",borderRadius:14,boxShadow:"0 2px 8px rgba(0,0,0,0.06)",border:"1px solid #f3f4f6",overflow:"hidden"}}>
                {coverImg && <img src={coverImg} alt={event.posts?.title} style={{width:"100%",height:160,objectFit:"cover",display:"block"}} />}
                <div style={{borderLeft:"4px solid "+(upcoming?"#f89b24":"#9ca3af"),padding:"1.25rem",display:"flex",gap:"1rem",alignItems:"flex-start",flexWrap:"wrap"}}>
                  <div style={{textAlign:"center",flexShrink:0,minWidth:48}}>
                    <div style={{fontSize:"1.75rem",fontWeight:800,color:upcoming?"#1a2f6e":"#9ca3af",lineHeight:1}}>{eventDate.getDate()}</div>
                    <div style={{fontSize:"0.7rem",fontWeight:700,color:upcoming?"#f89b24":"#9ca3af",textTransform:"uppercase"}}>{eventDate.toLocaleDateString("en-US",{month:"short"})}</div>
                    <div style={{fontSize:"0.65rem",color:"#9ca3af",fontWeight:600}}>{eventDate.getFullYear()}</div>
                  </div>
                  <div style={{flex:1,minWidth:200}}>
                    <div style={{display:"flex",alignItems:"center",gap:"0.5rem",flexWrap:"wrap",marginBottom:"0.3rem"}}>
                      <div style={{fontWeight:800,fontSize:"1rem",color:"#1f2937"}}>{event.posts?.title}</div>
                      <span style={{padding:"0.15rem 0.5rem",borderRadius:20,fontSize:"0.7rem",fontWeight:700,background:upcoming?"#f0fdf4":"#f3f4f6",color:upcoming?"#15803d":"#6b7280"}}>{upcoming?"Upcoming":"Past"}</span>
                      {event.is_virtual && <span style={{padding:"0.15rem 0.5rem",borderRadius:20,fontSize:"0.7rem",fontWeight:700,background:"#f0f9ff",color:"#0369a1"}}>Virtual</span>}
                    </div>
                    {event.posts?.excerpt && <div style={{fontSize:"0.85rem",color:"#6b7280",marginBottom:"0.5rem"}}>{event.posts.excerpt}</div>}
                    <div style={{display:"flex",gap:"1.25rem",flexWrap:"wrap",fontSize:"0.82rem",color:"#9ca3af",fontWeight:600}}>
                      <span>{eventDate.toLocaleTimeString("en-US",{hour:"numeric",minute:"2-digit"})}</span>
                      {event.location && <span>{event.location}</span>}
                      {event.virtual_link && <span>Virtual link set</span>}
                      <span>RSVPs: {event.rsvp_count||0}{event.max_attendees?" / "+event.max_attendees:""}</span>
                    </div>
                  </div>
                  <div style={{display:"flex",gap:"0.5rem",flexWrap:"wrap",alignItems:"center"}}>
                    <button onClick={() => openEdit(event)}
                      style={{padding:"0.3rem 0.75rem",borderRadius:6,border:"1.5px solid #1a2f6e",background:"white",color:"#1a2f6e",fontSize:"0.78rem",fontWeight:700,cursor:"pointer",fontFamily:"Barlow,system-ui,sans-serif"}}>
                      Edit
                    </button>
                    <button onClick={() => toggleRSVP(event.id,event.is_rsvp_open)}
                      style={{padding:"0.3rem 0.75rem",borderRadius:6,border:"1.5px solid",borderColor:event.is_rsvp_open?"#bbf7d0":"#e5e7eb",background:event.is_rsvp_open?"#f0fdf4":"white",color:event.is_rsvp_open?"#15803d":"#6b7280",fontSize:"0.78rem",fontWeight:700,cursor:"pointer",fontFamily:"Barlow,system-ui,sans-serif"}}>
                      RSVP {event.is_rsvp_open?"Open":"Closed"}
                    </button>
                    <button onClick={() => deleteEvent(event.id,event.post_id)}
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

      {showBulkEdit && (
        <div style={{position:"fixed",inset:0,background:"rgba(0,0,0,0.5)",zIndex:400,display:"flex",alignItems:"center",justifyContent:"center",padding:"1rem"}}>
          <div style={{background:"white",borderRadius:16,padding:"2rem",maxWidth:440,width:"100%",boxShadow:"0 16px 64px rgba(0,0,0,0.2)"}}>
            <h2 style={{color:"#1a2f6e",fontSize:"1.15rem",fontWeight:800,margin:"0 0 0.5rem 0"}}>Edit Recurring Event</h2>
            <p style={{color:"#6b7280",fontSize:"0.88rem",margin:"0 0 0.25rem 0"}}>This event is part of a series with <strong>{siblingEvents.length + 1} events</strong>.</p>
            <p style={{color:"#9ca3af",fontSize:"0.82rem",margin:"0 0 1.25rem 0"}}>Would you like to apply your changes to just this event, or all events in the series?</p>
            <div style={{display:"flex",flexDirection:"column",gap:"0.75rem"}}>
              <button onClick={() => { setShowBulkEdit(false); saveAllEvents() }} disabled={saving}
                style={{padding:"0.8rem",background:"#1a2f6e",color:"white",border:"none",borderRadius:8,fontWeight:700,cursor:saving?"not-allowed":"pointer",opacity:saving?0.7:1,fontFamily:"Barlow,system-ui,sans-serif",fontSize:"0.9rem"}}>
                {saving ? "Updating..." : `Apply to all ${siblingEvents.length + 1} events`}
              </button>
              <button onClick={() => { setShowBulkEdit(false); saveCurrentEvent() }} disabled={saving}
                style={{padding:"0.8rem",background:"white",color:"#1a2f6e",border:"2px solid #1a2f6e",borderRadius:8,fontWeight:700,cursor:saving?"not-allowed":"pointer",fontFamily:"Barlow,system-ui,sans-serif",fontSize:"0.9rem"}}>
                {saving ? "Updating..." : "This event only"}
              </button>
              <button onClick={() => { setShowBulkEdit(false); setSaving(false) }}
                style={{padding:"0.8rem",background:"white",color:"#6b7280",border:"1.5px solid #e5e7eb",borderRadius:8,fontWeight:700,cursor:"pointer",fontFamily:"Barlow,system-ui,sans-serif",fontSize:"0.9rem"}}>
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}

      {showNotifyConfirm && pendingNotify && (
        <div style={{position:"fixed",inset:0,background:"rgba(0,0,0,0.5)",zIndex:400,display:"flex",alignItems:"center",justifyContent:"center",padding:"1rem"}}>
          <div style={{background:"white",borderRadius:16,padding:"2rem",maxWidth:420,width:"100%",boxShadow:"0 16px 64px rgba(0,0,0,0.2)"}}>
            <h2 style={{color:"#1a2f6e",fontSize:"1.15rem",fontWeight:800,margin:"0 0 0.5rem 0"}}>Send Notifications?</h2>
            <p style={{color:"#6b7280",fontSize:"0.88rem",margin:"0 0 0.5rem 0"}}>Event: <strong>{pendingNotify.title}</strong></p>
            <p style={{color:"#9ca3af",fontSize:"0.82rem",margin:"0 0 1.25rem 0"}}>This will send an SMS and email to all contacts tagged &quot;solar academy member&quot; in GHL.</p>
            <div style={{display:"flex",gap:"0.75rem"}}>
              <button onClick={() => sendEventNotification(pendingNotify.title,pendingNotify.excerpt)} disabled={notifying}
                style={{flex:1,padding:"0.8rem",background:"#f89b24",color:"white",border:"none",borderRadius:8,fontWeight:700,cursor:notifying?"not-allowed":"pointer",opacity:notifying?0.7:1,fontFamily:"Barlow,system-ui,sans-serif"}}>
                {notifying ? "Sending..." : "Yes, Notify Everyone"}
              </button>
              <button onClick={() => {setShowNotifyConfirm(false);setPendingNotify(null)}}
                style={{padding:"0.8rem 1.25rem",background:"white",color:"#6b7280",border:"1.5px solid #e5e7eb",borderRadius:8,fontWeight:700,cursor:"pointer",fontFamily:"Barlow,system-ui,sans-serif"}}>
                Skip
              </button>
            </div>
          </div>
        </div>
      )}

      {toast && <div style={{position:"fixed",bottom:24,left:"50%",transform:"translateX(-50%)",background:"#1a2f6e",color:"white",padding:"0.75rem 1.5rem",borderRadius:30,fontSize:"0.88rem",fontWeight:600,boxShadow:"0 8px 32px rgba(0,0,0,0.2)",zIndex:999,whiteSpace:"nowrap"}}>{toast}</div>}
    </div>
  )
}





