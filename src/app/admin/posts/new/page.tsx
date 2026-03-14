'use client'
import { useEffect, useState } from "react"
import { createClient } from "@/lib/supabase/client"
import { useRouter, useSearchParams } from "next/navigation"
import Link from "next/link"

export default function NewPostPage() {
  const [form, setForm] = useState({
    title: "",
    excerpt: "",
    body: "",
    post_type: "announcement",
    status: "draft",
    is_featured: false,
    is_pinned: false,
    cover_image_url: "",
    scheduled_for: "",
  })
  const [saving, setSaving] = useState(false)
  const [uploading, setUploading] = useState(false)
  const [toast, setToast] = useState("")
  const [editId, setEditId] = useState<string | null>(null)
  const router = useRouter()
  const searchParams = useSearchParams()
  const supabase = createClient()

  useEffect(() => {
    const id = searchParams.get("edit")
    if (id) { setEditId(id); loadPost(id) }
  }, [])

  async function loadPost(id: string) {
    const { data } = await supabase.from("posts").select("*").eq("id", id).single()
    if (data) {
      setForm({
        title: data.title || "",
        excerpt: data.excerpt || "",
        body: data.body || "",
        post_type: data.post_type || "announcement",
        status: data.status || "draft",
        is_featured: data.is_featured || false,
        is_pinned: data.is_pinned || false,
        cover_image_url: data.cover_image_url || "",
        scheduled_for: data.scheduled_for || "",
      })
    }
  }

  async function uploadImage(file: File) {
    setUploading(true)
    const ext = file.name.split(".").pop()
    const fileName = "post-" + Date.now() + "." + ext
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

  function showToast(msg: string) {
    setToast(msg)
    setTimeout(() => setToast(""), 3000)
  }

  function slugify(text: string) {
    return text.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/(^-|-$)/g, "")
  }

  async function handleSave(publishNow = false) {
    if (!form.title.trim()) { showToast("Title is required"); return }
    setSaving(true)
    const payload: any = {
      title: form.title,
      slug: slugify(form.title) + "-" + Date.now(),
      excerpt: form.excerpt,
      body: form.body,
      post_type: form.post_type,
      status: publishNow ? "published" : form.status,
      is_featured: form.is_featured,
      is_pinned: form.is_pinned,
      cover_image_url: form.cover_image_url || null,
      scheduled_for: form.scheduled_for || null,
    }
    if (publishNow || form.status === "published") {
      payload.published_at = new Date().toISOString()
    }
    if (editId) {
      delete payload.slug
      const { error } = await supabase.from("posts").update(payload).eq("id", editId)
      if (error) { showToast("Error: " + error.message); setSaving(false); return }
      showToast("Post updated!")
    } else {
      const { error } = await supabase.from("posts").insert(payload)
      if (error) { showToast("Error: " + error.message); setSaving(false); return }
      showToast(publishNow ? "Post published!" : "Draft saved!")
    }
    setSaving(false)
    setTimeout(() => router.push("/admin/posts"), 1200)
  }

  const postTypes = ["announcement","daily","weekly","event","giveaway","training"]

  const inputStyle = {
    width:"100%", padding:"0.8rem 1rem", border:"1.5px solid #e5e7eb",
    borderRadius:8, fontSize:"0.95rem", fontFamily:"Barlow,system-ui,sans-serif",
    outline:"none", color:"#1f2937", boxSizing:"border-box" as const, background:"white"
  }

  const labelStyle = {
    display:"block" as const, color:"#374151", fontSize:"0.78rem",
    fontWeight:700, marginBottom:"0.4rem", textTransform:"uppercase" as const,
    letterSpacing:"0.04em"
  }

  return (
    <div style={{maxWidth:800,margin:"0 auto"}}>
      <div style={{display:"flex",alignItems:"center",justifyContent:"space-between",marginBottom:"1.5rem",flexWrap:"wrap",gap:"1rem"}}>
        <div>
          <h1 style={{color:"#1a2f6e",fontSize:"1.75rem",fontWeight:800,margin:"0 0 0.25rem 0"}}>
            {editId ? "Edit Post" : "Create Post"}
          </h1>
          <p style={{color:"#6b7280",fontSize:"0.9rem",margin:0}}>
            {editId ? "Update your existing post" : "Write a new post for the feed"}
          </p>
        </div>
        <Link href="/admin/posts" style={{color:"#6b7280",fontSize:"0.88rem",fontWeight:600,textDecoration:"none"}}>
          Back to Posts
        </Link>
      </div>

      <div style={{display:"grid",gap:"1rem"}}>

        <div style={{background:"white",borderRadius:14,padding:"1.25rem",boxShadow:"0 2px 8px rgba(0,0,0,0.06)",border:"1px solid #f3f4f6"}}>
          <h2 style={{color:"#1a2f6e",fontSize:"0.9rem",fontWeight:800,textTransform:"uppercase",letterSpacing:"0.04em",margin:"0 0 1rem 0"}}>Content</h2>

          <div style={{marginBottom:"1rem"}}>
            <label style={labelStyle}>Title *</label>
            <input type="text" value={form.title} onChange={e => setForm({...form,title:e.target.value})}
              placeholder="Enter post title..." style={inputStyle} />
          </div>

          <div style={{marginBottom:"1rem"}}>
            <label style={labelStyle}>Excerpt / Preview Text</label>
            <textarea value={form.excerpt} onChange={e => setForm({...form,excerpt:e.target.value})}
              placeholder="Short preview shown in the feed cards..."
              style={{...inputStyle,minHeight:80,resize:"vertical"}} />
          </div>

          <div style={{marginBottom:"1rem"}}>
            <label style={labelStyle}>Full Body Content</label>
            <textarea value={form.body} onChange={e => setForm({...form,body:e.target.value})}
              placeholder="Full post content..."
              style={{...inputStyle,minHeight:200,resize:"vertical"}} />
          </div>

          <div style={{marginBottom:"0"}}>
            <label style={labelStyle}>Cover Image</label>
            <div
              style={{border:"2px dashed #e5e7eb",borderRadius:8,padding:"1.5rem",textAlign:"center",cursor:"pointer",background:"#f9fafb",transition:"border-color 0.2s"}}
              onClick={() => { const el = document.getElementById("cover-upload"); if(el) (el as HTMLInputElement).click(); }}
              onDragOver={(e) => { e.preventDefault(); (e.currentTarget as HTMLElement).style.borderColor="#f89b24" }}
              onDragLeave={(e) => { (e.currentTarget as HTMLElement).style.borderColor="#e5e7eb" }}
              onDrop={async (e) => { e.preventDefault(); const file = e.dataTransfer.files[0]; if(file) await uploadImage(file); }}
            >
              <input
                id="cover-upload"
                type="file"
                accept="image/*"
                style={{display:"none"}}
                onChange={async (e) => { const file = e.target.files?.[0]; if(file) await uploadImage(file); }}
              />
              {form.cover_image_url ? (
                <div style={{position:"relative"}}>
                  <img src={form.cover_image_url} alt="preview"
                    style={{width:"100%",height:200,objectFit:"cover",borderRadius:8,display:"block"}} />
                  <button
                    onClick={(e) => { e.stopPropagation(); setForm(p => ({...p,cover_image_url:""})) }}
                    style={{position:"absolute",top:8,right:8,background:"rgba(0,0,0,0.65)",color:"white",border:"none",borderRadius:"50%",width:30,height:30,cursor:"pointer",fontSize:"0.85rem",fontWeight:700,display:"flex",alignItems:"center",justifyContent:"center"}}>
                    X
                  </button>
                </div>
              ) : uploading ? (
                <div style={{padding:"2rem 0"}}>
                  <div style={{color:"#f89b24",fontWeight:700,fontSize:"1rem"}}>Uploading...</div>
                  <div style={{color:"#9ca3af",fontSize:"0.82rem",marginTop:"0.3rem"}}>Please wait</div>
                </div>
              ) : (
                <div style={{padding:"1rem 0"}}>
                  <svg width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="#9ca3af" strokeWidth="1.5" style={{margin:"0 auto 0.75rem",display:"block"}}>
                    <polyline points="16 16 12 12 8 16"/>
                    <line x1="12" y1="12" x2="12" y2="21"/>
                    <path d="M20.39 18.39A5 5 0 0 0 18 9h-1.26A8 8 0 1 0 3 16.3"/>
                  </svg>
                  <div style={{color:"#374151",fontWeight:700,fontSize:"1rem"}}>Click to upload or drag and drop</div>
                  <div style={{color:"#9ca3af",fontSize:"0.82rem",marginTop:"0.3rem"}}>PNG, JPG, WebP up to 10MB</div>
                </div>
              )}
            </div>
          </div>
        </div>

        <div style={{background:"white",borderRadius:14,padding:"1.25rem",boxShadow:"0 2px 8px rgba(0,0,0,0.06)",border:"1px solid #f3f4f6"}}>
          <h2 style={{color:"#1a2f6e",fontSize:"0.9rem",fontWeight:800,textTransform:"uppercase",letterSpacing:"0.04em",margin:"0 0 1rem 0"}}>Settings</h2>

          <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:"1rem",marginBottom:"1rem"}}>
            <div>
              <label style={labelStyle}>Post Type</label>
              <select value={form.post_type} onChange={e => setForm({...form,post_type:e.target.value})}
                style={{...inputStyle,cursor:"pointer"}}>
                {postTypes.map(t => (
                  <option key={t} value={t}>{t.charAt(0).toUpperCase()+t.slice(1)}</option>
                ))}
              </select>
            </div>
            <div>
              <label style={labelStyle}>Status</label>
              <select value={form.status} onChange={e => setForm({...form,status:e.target.value})}
                style={{...inputStyle,cursor:"pointer"}}>
                <option value="draft">Draft</option>
                <option value="published">Published</option>
                <option value="scheduled">Scheduled</option>
                <option value="archived">Archived</option>
              </select>
            </div>
          </div>

          <div style={{marginBottom:"1rem"}}>
            <label style={labelStyle}>Schedule For (optional)</label>
            <input type="datetime-local" value={form.scheduled_for}
              onChange={e => setForm({...form,scheduled_for:e.target.value})} style={inputStyle} />
          </div>

          <div style={{display:"flex",gap:"1.5rem"}}>
            <label style={{display:"flex",alignItems:"center",gap:"0.5rem",cursor:"pointer",fontWeight:600,color:"#374151",fontSize:"0.88rem"}}>
              <input type="checkbox" checked={form.is_featured}
                onChange={e => setForm({...form,is_featured:e.target.checked})}
                style={{width:16,height:16,accentColor:"#f89b24"}} />
              Feature this post
            </label>
            <label style={{display:"flex",alignItems:"center",gap:"0.5rem",cursor:"pointer",fontWeight:600,color:"#374151",fontSize:"0.88rem"}}>
              <input type="checkbox" checked={form.is_pinned}
                onChange={e => setForm({...form,is_pinned:e.target.checked})}
                style={{width:16,height:16,accentColor:"#f89b24"}} />
              Pin to top
            </label>
          </div>
        </div>

        <div style={{display:"flex",gap:"0.75rem",flexWrap:"wrap",paddingBottom:"2rem"}}>
          <button onClick={() => handleSave(true)} disabled={saving||uploading}
            style={{padding:"0.9rem 1.75rem",background:"#f89b24",color:"white",border:"none",borderRadius:8,fontSize:"1rem",fontWeight:700,cursor:saving?"not-allowed":"pointer",opacity:saving?0.7:1,fontFamily:"Barlow,system-ui,sans-serif"}}>
            {saving ? "Saving..." : "Publish Now"}
          </button>
          <button onClick={() => handleSave(false)} disabled={saving||uploading}
            style={{padding:"0.9rem 1.75rem",background:"white",color:"#1a2f6e",border:"1.5px solid #e5e7eb",borderRadius:8,fontSize:"1rem",fontWeight:700,cursor:saving?"not-allowed":"pointer",opacity:saving?0.7:1,fontFamily:"Barlow,system-ui,sans-serif"}}>
            Save Draft
          </button>
          <Link href="/admin/posts"
            style={{padding:"0.9rem 1.75rem",background:"white",color:"#6b7280",border:"1.5px solid #e5e7eb",borderRadius:8,fontSize:"1rem",fontWeight:700,textDecoration:"none",display:"inline-flex",alignItems:"center"}}>
            Cancel
          </Link>
        </div>
      </div>

      {toast && (
        <div style={{position:"fixed",bottom:24,left:"50%",transform:"translateX(-50%)",background:"#1a2f6e",color:"white",padding:"0.75rem 1.5rem",borderRadius:30,fontSize:"0.88rem",fontWeight:600,boxShadow:"0 8px 32px rgba(0,0,0,0.2)",zIndex:999,whiteSpace:"nowrap"}}>
          {toast}
        </div>
      )}
    </div>
  )
}
