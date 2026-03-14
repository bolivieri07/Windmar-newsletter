'use client'
import { useEffect, useState } from "react"
import { createClient } from "@/lib/supabase/client"
import Link from "next/link"

export default function PostsPage() {
  const [posts, setPosts] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [filter, setFilter] = useState("all")
  const [deleting, setDeleting] = useState<string | null>(null)
  const [selected, setSelected] = useState<Set<string>>(new Set())
  const [bulkAction, setBulkAction] = useState("")
  const [bulkProcessing, setBulkProcessing] = useState(false)
  const [toast, setToast] = useState("")
  const supabase = createClient()

  useEffect(() => { fetchPosts() }, [filter])

  async function fetchPosts() {
    setLoading(true)
    let query = supabase
      .from("posts")
      .select("id,title,status,post_type,published_at,created_at,is_featured,is_pinned,view_count")
      .order("created_at", { ascending: false })
    if (filter !== "all") query = query.eq("status", filter)
    const { data } = await query
    setPosts(data || [])
    setSelected(new Set())
    setLoading(false)
  }

  function showToast(msg: string) { setToast(msg); setTimeout(() => setToast(""), 3000) }

  function toggleSelect(id: string) {
    setSelected(prev => {
      const n = new Set(prev)
      n.has(id) ? n.delete(id) : n.add(id)
      return n
    })
  }

  function toggleSelectAll() {
    if (selected.size === posts.length) {
      setSelected(new Set())
    } else {
      setSelected(new Set(posts.map(p => p.id)))
    }
  }

  async function handleBulkAction() {
    if (selected.size === 0) { showToast("No posts selected"); return }
    if (!bulkAction) { showToast("Select an action"); return }
    const ids = Array.from(selected)
    setBulkProcessing(true)

    if (bulkAction === "delete") {
      if (!confirm("Delete " + ids.length + " posts? This cannot be undone.")) {
        setBulkProcessing(false)
        return
      }
      const { error } = await supabase.from("posts").delete().in("id", ids)
      if (error) { showToast("Error: " + error.message) } 
      else {
        setPosts(prev => prev.filter(p => !ids.includes(p.id)))
        showToast(ids.length + " posts deleted")
      }
    } else if (bulkAction === "publish") {
      const { error } = await supabase.from("posts").update({ status: "published", published_at: new Date().toISOString() }).in("id", ids)
      if (error) { showToast("Error: " + error.message) }
      else {
        setPosts(prev => prev.map(p => ids.includes(p.id) ? { ...p, status: "published" } : p))
        showToast(ids.length + " posts published")
      }
    } else if (bulkAction === "draft") {
      const { error } = await supabase.from("posts").update({ status: "draft" }).in("id", ids)
      if (error) { showToast("Error: " + error.message) }
      else {
        setPosts(prev => prev.map(p => ids.includes(p.id) ? { ...p, status: "draft" } : p))
        showToast(ids.length + " posts moved to draft")
      }
    } else if (bulkAction === "archive") {
      const { error } = await supabase.from("posts").update({ status: "archived" }).in("id", ids)
      if (error) { showToast("Error: " + error.message) }
      else {
        setPosts(prev => prev.map(p => ids.includes(p.id) ? { ...p, status: "archived" } : p))
        showToast(ids.length + " posts archived")
      }
    }

    setSelected(new Set())
    setBulkAction("")
    setBulkProcessing(false)
  }

  async function deletePost(id: string) {
    if (!confirm("Delete this post? This cannot be undone.")) return
    setDeleting(id)
    await supabase.from("posts").delete().eq("id", id)
    setPosts(prev => prev.filter(p => p.id !== id))
    setDeleting(null)
  }

  async function toggleStatus(id: string, currentStatus: string) {
    const newStatus = currentStatus === "published" ? "draft" : "published"
    const updates: any = { status: newStatus }
    if (newStatus === "published") updates.published_at = new Date().toISOString()
    await supabase.from("posts").update(updates).eq("id", id)
    setPosts(prev => prev.map(p => p.id === id ? { ...p, status: newStatus } : p))
  }

  const filters = ["all","published","draft","scheduled","archived"]

  const typeColors: Record<string,{bg:string,color:string}> = {
    announcement: { bg:"#e8edf8", color:"#1a2f6e" },
    daily:        { bg:"#fef3e2", color:"#b45309" },
    weekly:       { bg:"#f0f9ff", color:"#0369a1" },
    event:        { bg:"#fdf4ff", color:"#7c3aed" },
    giveaway:     { bg:"#fef2f2", color:"#dc2626" },
    training:     { bg:"#f0fdf4", color:"#15803d" },
  }

  const statusColors: Record<string,{bg:string,color:string}> = {
    published: { bg:"#f0fdf4", color:"#15803d" },
    draft:     { bg:"#fef3e2", color:"#b45309" },
    scheduled: { bg:"#f0f9ff", color:"#0369a1" },
    archived:  { bg:"#f3f4f6", color:"#6b7280" },
  }

  return (
    <div style={{maxWidth:1200,margin:"0 auto"}}>
      <div style={{display:"flex",alignItems:"center",justifyContent:"space-between",marginBottom:"1.5rem",flexWrap:"wrap",gap:"1rem"}}>
        <div>
          <h1 style={{color:"#1a2f6e",fontSize:"1.75rem",fontWeight:800,margin:"0 0 0.25rem 0"}}>All Posts</h1>
          <p style={{color:"#6b7280",fontSize:"0.9rem",margin:0}}>{posts.length} posts total</p>
        </div>
        <Link href="/admin/posts/new" style={{padding:"0.75rem 1.25rem",background:"#f89b24",color:"white",borderRadius:8,textDecoration:"none",fontSize:"0.9rem",fontWeight:700,display:"inline-flex",alignItems:"center",gap:"0.4rem"}}>
          + New Post
        </Link>
      </div>

      <div style={{display:"flex",gap:"0.5rem",marginBottom:"1.25rem",flexWrap:"wrap"}}>
        {filters.map(f => (
          <button key={f} onClick={() => setFilter(f)}
            style={{padding:"0.5rem 1rem",borderRadius:20,fontSize:"0.82rem",fontWeight:700,cursor:"pointer",border:"1.5px solid",borderColor:filter===f?"#f89b24":"#e5e7eb",background:filter===f?"#f89b24":"white",color:filter===f?"white":"#6b7280",transition:"all 0.15s",textTransform:"capitalize"}}>
            {f}
          </button>
        ))}
      </div>

      {selected.size > 0 && (
        <div style={{background:"#e8edf8",borderRadius:10,padding:"0.75rem 1.25rem",marginBottom:"1rem",display:"flex",alignItems:"center",gap:"1rem",flexWrap:"wrap"}}>
          <span style={{color:"#1a2f6e",fontWeight:700,fontSize:"0.88rem"}}>{selected.size} selected</span>
          <select value={bulkAction} onChange={e => setBulkAction(e.target.value)}
            style={{padding:"0.4rem 0.75rem",borderRadius:6,border:"1.5px solid #c7d2fe",fontSize:"0.85rem",fontWeight:600,fontFamily:"Barlow,system-ui,sans-serif",cursor:"pointer",background:"white",color:"#1a2f6e"}}>
            <option value="">Choose action...</option>
            <option value="publish">Publish</option>
            <option value="draft">Move to Draft</option>
            <option value="archive">Archive</option>
            <option value="delete">Delete</option>
          </select>
          <button onClick={handleBulkAction} disabled={bulkProcessing || !bulkAction}
            style={{padding:"0.4rem 1rem",borderRadius:6,background:bulkAction==="delete"?"#dc2626":"#1a2f6e",color:"white",border:"none",fontSize:"0.82rem",fontWeight:700,cursor:bulkProcessing?"not-allowed":"pointer",opacity:bulkProcessing||!bulkAction?0.6:1,fontFamily:"Barlow,system-ui,sans-serif"}}>
            {bulkProcessing ? "Processing..." : "Apply"}
          </button>
          <button onClick={() => { setSelected(new Set()); setBulkAction("") }}
            style={{padding:"0.4rem 0.75rem",borderRadius:6,background:"white",color:"#6b7280",border:"1.5px solid #e5e7eb",fontSize:"0.82rem",fontWeight:700,cursor:"pointer",fontFamily:"Barlow,system-ui,sans-serif"}}>
            Clear
          </button>
        </div>
      )}

      <div style={{background:"white",borderRadius:14,boxShadow:"0 2px 8px rgba(0,0,0,0.06)",border:"1px solid #f3f4f6",overflow:"hidden"}}>
        {loading ? (
          <div style={{padding:"3rem",textAlign:"center",color:"#9ca3af",fontWeight:600}}>Loading posts...</div>
        ) : posts.length === 0 ? (
          <div style={{padding:"3rem",textAlign:"center",color:"#9ca3af",fontWeight:600}}>
            No posts found.
            <Link href="/admin/posts/new" style={{color:"#f89b24",fontWeight:700,textDecoration:"none",marginLeft:"0.4rem"}}>Create one</Link>
          </div>
        ) : (
          <div style={{overflowX:"auto",display:"block"}}>
            <table style={{width:"100%",borderCollapse:"collapse",fontSize:"0.88rem",minWidth:650}}>
              <thead>
                <tr style={{background:"#f9fafb"}}>
                  <th style={{textAlign:"left",padding:"0.6rem 0.75rem",width:40}}>
                    <input type="checkbox" checked={selected.size === posts.length && posts.length > 0}
                      onChange={toggleSelectAll}
                      style={{width:16,height:16,accentColor:"#f89b24",cursor:"pointer"}} />
                  </th>
                  <th style={{textAlign:"left",padding:"0.6rem 1rem",fontSize:"0.72rem",fontWeight:700,color:"#9ca3af",textTransform:"uppercase",letterSpacing:"0.06em"}}>Title</th>
                  <th style={{textAlign:"left",padding:"0.6rem 1rem",fontSize:"0.72rem",fontWeight:700,color:"#9ca3af",textTransform:"uppercase",letterSpacing:"0.06em"}}>Type</th>
                  <th style={{textAlign:"left",padding:"0.6rem 1rem",fontSize:"0.72rem",fontWeight:700,color:"#9ca3af",textTransform:"uppercase",letterSpacing:"0.06em"}}>Status</th>
                  <th style={{textAlign:"left",padding:"0.6rem 1rem",fontSize:"0.72rem",fontWeight:700,color:"#9ca3af",textTransform:"uppercase",letterSpacing:"0.06em"}}>Date</th>
                  <th style={{textAlign:"left",padding:"0.6rem 1rem",fontSize:"0.72rem",fontWeight:700,color:"#9ca3af",textTransform:"uppercase",letterSpacing:"0.06em"}}>Actions</th>
                </tr>
              </thead>
              <tbody>
                {posts.map(post => {
                  const tc = typeColors[post.post_type] || { bg:"#f3f4f6", color:"#6b7280" }
                  const sc = statusColors[post.status] || statusColors.draft
                  const isSelected = selected.has(post.id)
                  return (
                    <tr key={post.id} style={{borderTop:"1px solid #f3f4f6",background:isSelected?"#fef8ee":"transparent"}}>
                      <td style={{padding:"0.75rem 0.75rem"}}>
                        <input type="checkbox" checked={isSelected} onChange={() => toggleSelect(post.id)}
                          style={{width:16,height:16,accentColor:"#f89b24",cursor:"pointer"}} />
                      </td>
                      <td style={{padding:"0.75rem 1rem",maxWidth:220}}>
                        <div style={{color:"#1f2937",fontWeight:600,overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap"}}>{post.title}</div>
                        <div style={{display:"flex",gap:"0.3rem",marginTop:"0.3rem"}}>
                          {post.is_featured && <span style={{fontSize:"0.65rem",fontWeight:700,background:"#fef3e2",color:"#b45309",padding:"0.1rem 0.4rem",borderRadius:4}}>Featured</span>}
                          {post.is_pinned && <span style={{fontSize:"0.65rem",fontWeight:700,background:"#f0f9ff",color:"#0369a1",padding:"0.1rem 0.4rem",borderRadius:4}}>Pinned</span>}
                        </div>
                      </td>
                      <td style={{padding:"0.75rem 1rem"}}>
                        <span style={{padding:"0.2rem 0.6rem",borderRadius:20,fontSize:"0.72rem",fontWeight:700,background:tc.bg,color:tc.color,textTransform:"capitalize"}}>{post.post_type}</span>
                      </td>
                      <td style={{padding:"0.75rem 1rem"}}>
                        <span style={{padding:"0.2rem 0.6rem",borderRadius:20,fontSize:"0.72rem",fontWeight:700,background:sc.bg,color:sc.color,textTransform:"capitalize"}}>{post.status}</span>
                      </td>
                      <td style={{padding:"0.75rem 1rem",color:"#9ca3af",fontSize:"0.82rem",whiteSpace:"nowrap"}}>
                        {new Date(post.created_at).toLocaleDateString("en-US",{month:"short",day:"numeric",year:"numeric"})}
                      </td>
                      <td style={{padding:"0.75rem 1rem",whiteSpace:"nowrap"}}>
                        <div style={{display:"flex",gap:"0.5rem",alignItems:"center"}}>
                          <Link href={"/admin/posts/new?edit=" + post.id}
                            style={{padding:"0.3rem 0.7rem",borderRadius:6,border:"1.5px solid #e5e7eb",background:"none",fontSize:"0.78rem",fontWeight:700,color:"#1a2f6e",textDecoration:"none",cursor:"pointer"}}>
                            Edit
                          </Link>
                          <button onClick={() => toggleStatus(post.id, post.status)}
                            style={{padding:"0.3rem 0.7rem",borderRadius:6,border:"1.5px solid #e5e7eb",background:"none",fontSize:"0.78rem",fontWeight:700,color:post.status==="published"?"#b45309":"#15803d",cursor:"pointer"}}>
                            {post.status === "published" ? "Unpublish" : "Publish"}
                          </button>
                          <button onClick={() => deletePost(post.id)} disabled={deleting === post.id}
                            style={{padding:"0.3rem 0.7rem",borderRadius:6,border:"1.5px solid #fecaca",background:"none",fontSize:"0.78rem",fontWeight:700,color:"#dc2626",cursor:"pointer",opacity:deleting===post.id?0.5:1}}>
                            {deleting === post.id ? "..." : "Delete"}
                          </button>
                        </div>
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {toast && (
        <div style={{position:"fixed",bottom:24,left:"50%",transform:"translateX(-50%)",background:"#1a2f6e",color:"white",padding:"0.75rem 1.5rem",borderRadius:30,fontSize:"0.88rem",fontWeight:600,boxShadow:"0 8px 32px rgba(0,0,0,0.2)",zIndex:999,whiteSpace:"nowrap"}}>
          {toast}
        </div>
      )}
    </div>
  )
}
