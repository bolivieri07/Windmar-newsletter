'use client'
import { useEffect, useState } from "react"
import { createClient } from "@/lib/supabase/client"
import Link from "next/link"

export default function SpiffsPage() {
  const [giveaways, setGiveaways] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [uploading, setUploading] = useState(false)
  const [toast, setToast] = useState("")
  const [showNotifyConfirm, setShowNotifyConfirm] = useState(false)
  const [pendingNotify, setPendingNotify] = useState<{title:string,excerpt:string}|null>(null)
  const [notifying, setNotifying] = useState(false)

  async function sendSpiffNotification(title: string, excerpt: string) {
    setNotifying(true)
    try {
      const smsMessage = "Windmar Solar Academy Spiff: " + title + (excerpt ? " - " + excerpt : "") + "\n\nDetails: https://windmar-newsletter.vercel.app"
      const emailBody = `
        <div style="font-family:Arial,sans-serif;max-width:600px;margin:0 auto">
          <div style="background:linear-gradient(135deg,#7c3f00,#d4811a);padding:24px;border-radius:12px 12px 0 0">
            <h1 style="color:white;margin:0;font-size:20px">Windmar Solar Academy</h1>
            <p style="color:rgba(255,255,255,0.8);margin:8px 0 0;font-size:14px">New Spiff!</p>
          </div>
          <div style="background:white;padding:24px;border:1px solid #e5e7eb;border-top:none;border-radius:0 0 12px 12px">
            <h2 style="color:#1a2f6e;margin:0 0 12px">${title}</h2>
            <p style="color:#4b5563;line-height:1.6;margin:0 0 20px">${excerpt}</p>
            <a href="https://windmar-newsletter.vercel.app" style="display:inline-block;background:#f89b24;color:white;padding:12px 24px;border-radius:8px;text-decoration:none;font-weight:bold">View Spiff</a>
          </div>
        </div>`
      const res = await fetch("/api/ghl", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ type:"spiff", title, message:smsMessage, emailSubject:"New Spiff: "+title, emailBody }),
      })
      const data = await res.json()
      if (data.error) showToast("Notification error: " + data.error)
      else showToast("Notifications sent to " + (data.results?.total || 0) + " contacts!")
    } catch (err: any) { showToast("Notification failed: " + err.message) }
    setNotifying(false)
    setShowNotifyConfirm(false)
    setPendingNotify(null)
  }
  const [showForm, setShowForm] = useState(false)
  const [form, setForm] = useState({
    prize_name: "",
    prize_description: "",
    prize_image_url: "",
    entry_deadline: "",
    start_date: "",
    status: "active",
    max_entries: "",
    post_title: "",
    post_excerpt: "",
  })
  const supabase = createClient()

  useEffect(() => { fetchGiveaways() }, [])

  async function fetchGiveaways() {
    setLoading(true)
    const { data } = await supabase
      .from("giveaways")
      .select("*, posts(title,excerpt)")
      .order("created_at", { ascending: false })
    setGiveaways(data || [])
    setLoading(false)
  }

  async function uploadImage(file: File) {
    setUploading(true)
    const ext = file.name.split(".").pop()
    const fileName = "spiff-" + Date.now() + "." + ext
    const { data, error } = await supabase.storage
      .from("media-library")
      .upload(fileName, file, { cacheControl: "3600", upsert: false })
    if (error) {
      showToast("Upload failed: " + error.message)
      setUploading(false)
      return
    }
    const { data: urlData } = supabase.storage.from("media-library").getPublicUrl(fileName)
    setForm(prev => ({...prev, prize_image_url: urlData.publicUrl}))
    setUploading(false)
    showToast("Image uploaded!")
  }

  function showToast(msg: string) {
    setToast(msg)
    setTimeout(() => setToast(""), 3000)
  }

  async function handleCreate() {
    if (!form.prize_name.trim()) { showToast("Prize name is required"); return }
    if (!form.entry_deadline) { showToast("Deadline is required"); return }
    if (!form.post_title.trim()) { showToast("Post title is required"); return }
    setSaving(true)
    const { data: post, error: postError } = await supabase
      .from("posts")
      .insert({
        title: form.post_title,
        slug: form.post_title.toLowerCase().replace(/[^a-z0-9]+/g,"-") + "-" + Date.now(),
        excerpt: form.post_excerpt,
        cover_image_url: form.prize_image_url || null,
        post_type: "giveaway",
        status: "published",
        published_at: new Date().toISOString(),
      })
      .select()
      .single()
    if (postError) { showToast("Error creating post: " + postError.message); setSaving(false); return }
    const { error: giveawayError } = await supabase
      .from("giveaways")
      .insert({
        post_id: post.id,
        prize_name: form.prize_name,
        prize_description: form.prize_description,
        prize_image_url: form.prize_image_url || null,
        entry_deadline: form.entry_deadline,
        start_date: form.start_date || new Date().toISOString(),
        status: form.status,
        max_entries: form.max_entries ? parseInt(form.max_entries) : null,
      })
    if (giveawayError) { showToast("Error creating spiff: " + giveawayError.message); setSaving(false); return }
    showToast("Spiff created and published!")
    setPendingNotify({ title: form.post_title, excerpt: form.post_excerpt })
    setShowNotifyConfirm(true)
    setShowForm(false)
    setForm({ prize_name:"",prize_description:"",prize_image_url:"",entry_deadline:"",start_date:"",status:"active",max_entries:"",post_title:"",post_excerpt:"" })
    fetchGiveaways()
    setSaving(false)
  }

  async function updateStatus(id: string, status: string) {
    await supabase.from("giveaways").update({ status }).eq("id", id)
    setGiveaways(prev => prev.map(g => g.id === id ? { ...g, status } : g))
    showToast("Status updated!")
  }

  async function deleteSpiff(id: string, postId: string) {
    if (!confirm("Delete this spiff? This cannot be undone.")) return
    await supabase.from("giveaways").delete().eq("id", id)
    await supabase.from("posts").delete().eq("id", postId)
    setGiveaways(prev => prev.filter(g => g.id !== id))
    showToast("Spiff deleted")
  }

  const statusColors: Record<string,{bg:string,color:string}> = {
    active:   { bg:"#f0fdf4", color:"#15803d" },
    upcoming: { bg:"#fef3e2", color:"#b45309" },
    closed:   { bg:"#f3f4f6", color:"#6b7280" },
    awarded:  { bg:"#e8edf8", color:"#1a2f6e" },
  }

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
          <h1 style={{color:"#1a2f6e",fontSize:"1.75rem",fontWeight:800,margin:"0 0 0.25rem 0"}}>Spiffs Manager</h1>
          <p style={{color:"#6b7280",fontSize:"0.9rem",margin:0}}>{giveaways.length} spiffs total</p>
        </div>
        <button onClick={() => setShowForm(!showForm)}
          style={{padding:"0.75rem 1.25rem",background:"#f89b24",color:"white",border:"none",borderRadius:8,fontSize:"0.9rem",fontWeight:700,cursor:"pointer",fontFamily:"Barlow,system-ui,sans-serif"}}>
          {showForm ? "Cancel" : "+ New Spiff"}
        </button>
      </div>

      {showForm && (
        <div style={{background:"white",borderRadius:14,padding:"1.5rem",boxShadow:"0 2px 8px rgba(0,0,0,0.06)",border:"1px solid #f3f4f6",marginBottom:"1.5rem"}}>
          <h2 style={{color:"#1a2f6e",fontSize:"1rem",fontWeight:800,textTransform:"uppercase",letterSpacing:"0.04em",margin:"0 0 1.25rem 0"}}>Create New Spiff</h2>

          <div style={{display:"grid",gridTemplateColumns:"repeat(auto-fit,minmax(250px,1fr))",gap:"1rem",marginBottom:"1rem"}}>
            <div>
              <label style={labelStyle}>Feed Post Title *</label>
              <input type="text" value={form.post_title} onChange={e => setForm({...form,post_title:e.target.value})}
                placeholder="e.g. Double Points Weekend!" style={inputStyle} />
            </div>
            <div>
              <label style={labelStyle}>Prize / Reward Name *</label>
              <input type="text" value={form.prize_name} onChange={e => setForm({...form,prize_name:e.target.value})}
                placeholder="e.g. $500 Cash Bonus" style={inputStyle} />
            </div>
          </div>

          <div style={{marginBottom:"1rem"}}>
            <label style={labelStyle}>Description</label>
            <textarea value={form.prize_description} onChange={e => setForm({...form,prize_description:e.target.value})}
              placeholder="Describe the spiff criteria and how to earn it..."
              style={{...inputStyle,minHeight:100,resize:"vertical"}} />
          </div>

          <div style={{marginBottom:"1rem"}}>
            <label style={labelStyle}>Spiff Image</label>
            <div style={{border:"2px dashed #e5e7eb",borderRadius:8,padding:"1.25rem",textAlign:"center",cursor:"pointer",background:"#f9fafb"}}
              onClick={() => document.getElementById("spiff-upload")?.click()}
              onDragOver={(e) => { e.preventDefault(); (e.currentTarget as HTMLElement).style.borderColor="#f89b24" }}
              onDragLeave={(e) => { (e.currentTarget as HTMLElement).style.borderColor="#e5e7eb" }}
              onDrop={async (e) => {
                e.preventDefault();
                const file = e.dataTransfer.files[0];
                if (file) await uploadImage(file);
              }}>
              <input id="spiff-upload" type="file" accept="image/*" style={{display:"none"}}
                onChange={async (e) => { const file = e.target.files?.[0]; if (file) await uploadImage(file); }} />
              {form.prize_image_url ? (
                <div style={{position:"relative"}}>
                  <img src={form.prize_image_url} alt="preview" style={{width:"100%",height:140,objectFit:"cover",borderRadius:8}} />
                  <button onClick={(e) => { e.stopPropagation(); setForm({...form,prize_image_url:""}) }}
                    style={{position:"absolute",top:8,right:8,background:"rgba(0,0,0,0.6)",color:"white",border:"none",borderRadius:"50%",width:28,height:28,cursor:"pointer",fontSize:"1rem"}}>
                    x
                  </button>
                </div>
              ) : (
                <div>
                  {uploading ? (
                    <div style={{color:"#6b7280",fontWeight:600}}>Uploading...</div>
                  ) : (
                    <>
                      <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="#9ca3af" strokeWidth="1.5" style={{margin:"0 auto 0.4rem",display:"block"}}>
                        <rect x="3" y="3" width="18" height="18" rx="2"/><circle cx="8.5" cy="8.5" r="1.5"/>
                        <polyline points="21 15 16 10 5 21"/>
                      </svg>
                      <div style={{color:"#6b7280",fontWeight:600,fontSize:"0.88rem"}}>Click or drag to upload image</div>
                      <div style={{color:"#9ca3af",fontSize:"0.75rem",marginTop:"0.2rem"}}>PNG, JPG, WebP up to 10MB</div>
                    </>
                  )}
                </div>
              )}
            </div>
          </div>

          <div style={{marginBottom:"1rem"}}>
            <label style={labelStyle}>Feed Excerpt</label>
            <input type="text" value={form.post_excerpt} onChange={e => setForm({...form,post_excerpt:e.target.value})}
              placeholder="Short preview shown in the feed..." style={inputStyle} />
          </div>

          <div style={{display:"grid",gridTemplateColumns:"repeat(auto-fit,minmax(200px,1fr))",gap:"1rem",marginBottom:"1.25rem"}}>
            <div>
              <label style={labelStyle}>Start Date</label>
              <input type="datetime-local" value={form.start_date} onChange={e => setForm({...form,start_date:e.target.value})} style={inputStyle} />
            </div>
            <div>
              <label style={labelStyle}>Deadline *</label>
              <input type="datetime-local" value={form.entry_deadline} onChange={e => setForm({...form,entry_deadline:e.target.value})} style={inputStyle} />
            </div>
            <div>
              <label style={labelStyle}>Status</label>
              <select value={form.status} onChange={e => setForm({...form,status:e.target.value})} style={{...inputStyle,cursor:"pointer"}}>
                <option value="upcoming">Upcoming</option>
                <option value="active">Active</option>
                <option value="closed">Closed</option>
              </select>
            </div>
            <div>
              <label style={labelStyle}>Max Entries (optional)</label>
              <input type="number" value={form.max_entries} onChange={e => setForm({...form,max_entries:e.target.value})}
                placeholder="Leave blank for unlimited" style={inputStyle} />
            </div>
          </div>

          <div style={{display:"flex",gap:"0.75rem"}}>
            <button onClick={handleCreate} disabled={saving}
              style={{padding:"0.8rem 1.5rem",background:"#f89b24",color:"white",border:"none",borderRadius:8,fontSize:"0.9rem",fontWeight:700,cursor:saving?"not-allowed":"pointer",opacity:saving?0.7:1,fontFamily:"Barlow,system-ui,sans-serif"}}>
              {saving ? "Creating..." : "Create Spiff"}
            </button>
            <button onClick={() => setShowForm(false)}
              style={{padding:"0.8rem 1.5rem",background:"white",color:"#6b7280",border:"1.5px solid #e5e7eb",borderRadius:8,fontSize:"0.9rem",fontWeight:700,cursor:"pointer",fontFamily:"Barlow,system-ui,sans-serif"}}>
              Cancel
            </button>
          </div>
        </div>
      )}

      {loading ? (
        <div style={{background:"white",borderRadius:14,padding:"3rem",textAlign:"center",color:"#9ca3af",fontWeight:600,boxShadow:"0 2px 8px rgba(0,0,0,0.06)"}}>Loading spiffs...</div>
      ) : giveaways.length === 0 ? (
        <div style={{background:"white",borderRadius:14,padding:"3rem",textAlign:"center",color:"#9ca3af",fontWeight:600,boxShadow:"0 2px 8px rgba(0,0,0,0.06)"}}>
          No spiffs yet. Create your first one!
        </div>
      ) : (
        <div style={{display:"grid",gap:"1rem"}}>
          {giveaways.map(g => {
            const sc = statusColors[g.status] || statusColors.closed
            const isExpired = new Date(g.entry_deadline) < new Date()
            return (
              <div key={g.id} style={{background:"white",borderRadius:14,boxShadow:"0 2px 8px rgba(0,0,0,0.06)",border:"1px solid #f3f4f6",overflow:"hidden"}}>
                {g.prize_image_url && (
                  <img src={g.prize_image_url} alt={g.prize_name} style={{width:"100%",height:160,objectFit:"cover",display:"block"}} />
                )}
                <div style={{background:"linear-gradient(135deg,#f89b24 0%,#d4811a 100%)",padding:"1rem 1.25rem",display:"flex",alignItems:"center",justifyContent:"space-between",flexWrap:"wrap",gap:"0.5rem"}}>
                  <div>
                    <div style={{color:"white",fontWeight:800,fontSize:"1.05rem"}}>{g.prize_name}</div>
                    <div style={{color:"rgba(255,255,255,0.8)",fontSize:"0.82rem",marginTop:"0.2rem"}}>{g.posts?.title}</div>
                  </div>
                  <div style={{display:"flex",alignItems:"center",gap:"0.5rem"}}>
                    <span style={{padding:"0.25rem 0.75rem",borderRadius:20,fontSize:"0.75rem",fontWeight:700,background:sc.bg,color:sc.color,textTransform:"capitalize"}}>
                      {g.status}
                    </span>
                    {isExpired && <span style={{padding:"0.25rem 0.75rem",borderRadius:20,fontSize:"0.75rem",fontWeight:700,background:"#fef2f2",color:"#dc2626"}}>Expired</span>}
                  </div>
                </div>
                <div style={{padding:"1rem 1.25rem"}}>
                  {g.prize_description && (
                    <p style={{color:"#4b5563",fontSize:"0.88rem",lineHeight:1.55,margin:"0 0 0.75rem 0"}}>{g.prize_description}</p>
                  )}
                  <div style={{display:"flex",gap:"1.5rem",flexWrap:"wrap",fontSize:"0.82rem",color:"#6b7280",fontWeight:600,marginBottom:"1rem"}}>
                    <span>Entries: {g.entry_count || 0}{g.max_entries ? " / " + g.max_entries : ""}</span>
                    <span>Deadline: {new Date(g.entry_deadline).toLocaleDateString("en-US",{month:"short",day:"numeric",year:"numeric"})}</span>
                  </div>
                  <div style={{display:"flex",gap:"0.5rem",flexWrap:"wrap"}}>
                    {["upcoming","active","closed","awarded"].map(s => (
                      <button key={s} onClick={() => updateStatus(g.id, s)}
                        style={{padding:"0.3rem 0.75rem",borderRadius:6,border:"1.5px solid",borderColor:g.status===s?"#f89b24":"#e5e7eb",background:g.status===s?"#fef3e2":"white",color:g.status===s?"#b45309":"#6b7280",fontSize:"0.78rem",fontWeight:700,cursor:"pointer",textTransform:"capitalize",fontFamily:"Barlow,system-ui,sans-serif"}}>
                        {s}
                      </button>
                    ))}
                    <button onClick={() => deleteSpiff(g.id, g.post_id)}
                      style={{padding:"0.3rem 0.75rem",borderRadius:6,border:"1.5px solid #fecaca",background:"white",color:"#dc2626",fontSize:"0.78rem",fontWeight:700,cursor:"pointer",fontFamily:"Barlow,system-ui,sans-serif",marginLeft:"auto"}}>
                      Delete
                    </button>
                  </div>
                </div>
              </div>
            )
          })}
        </div>
      )}

      {showNotifyConfirm && pendingNotify && (
        <div style={{position:"fixed",inset:0,background:"rgba(0,0,0,0.5)",zIndex:400,display:"flex",alignItems:"center",justifyContent:"center",padding:"1rem"}}>
          <div style={{background:"white",borderRadius:16,padding:"2rem",maxWidth:420,width:"100%",boxShadow:"0 16px 64px rgba(0,0,0,0.2)"}}>
            <h2 style={{color:"#1a2f6e",fontSize:"1.15rem",fontWeight:800,margin:"0 0 0.5rem 0"}}>Send Notifications?</h2>
            <p style={{color:"#6b7280",fontSize:"0.88rem",margin:"0 0 0.5rem 0"}}>Spiff: <strong>{pendingNotify.title}</strong></p>
            <p style={{color:"#9ca3af",fontSize:"0.82rem",margin:"0 0 1.25rem 0"}}>This will send an SMS and email to all contacts tagged &quot;solar academy member&quot; in GHL.</p>
            <div style={{display:"flex",gap:"0.75rem"}}>
              <button onClick={() => sendSpiffNotification(pendingNotify.title, pendingNotify.excerpt)} disabled={notifying}
                style={{flex:1,padding:"0.8rem",background:"#f89b24",color:"white",border:"none",borderRadius:8,fontWeight:700,cursor:notifying?"not-allowed":"pointer",opacity:notifying?0.7:1,fontFamily:"Barlow,system-ui,sans-serif"}}>
                {notifying ? "Sending..." : "Yes, Notify Everyone"}
              </button>
              <button onClick={() => { setShowNotifyConfirm(false); setPendingNotify(null) }}
                style={{padding:"0.8rem 1.25rem",background:"white",color:"#6b7280",border:"1.5px solid #e5e7eb",borderRadius:8,fontWeight:700,cursor:"pointer",fontFamily:"Barlow,system-ui,sans-serif"}}>
                Skip
              </button>
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




