const fs = require("fs");
const content = `'use client'
import { useEffect, useState } from "react"
import { createClient } from "@/lib/supabase/client"
import Link from "next/link"

export default function AdminDashboard() {
  const [stats, setStats] = useState({ posts: 0, published: 0, drafts: 0, events: 0, giveaways: 0, categories: 0 })
  const [recentPosts, setRecentPosts] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const supabase = createClient()

  useEffect(() => {
    const fetchStats = async () => {
      const [
        { count: totalPosts },
        { count: publishedPosts },
        { count: draftPosts },
        { count: totalEvents },
        { count: totalGiveaways },
        { data: recent }
      ] = await Promise.all([
        supabase.from("posts").select("*", { count: "exact", head: true }),
        supabase.from("posts").select("*", { count: "exact", head: true }).eq("status", "published"),
        supabase.from("posts").select("*", { count: "exact", head: true }).eq("status", "draft"),
        supabase.from("events").select("*", { count: "exact", head: true }),
        supabase.from("giveaways").select("*", { count: "exact", head: true }),
        supabase.from("posts").select("id,title,status,post_type,created_at,published_at").order("created_at", { ascending: false }).limit(6),
      ])
      setStats({
        posts: totalPosts || 0,
        published: publishedPosts || 0,
        drafts: draftPosts || 0,
        events: totalEvents || 0,
        giveaways: totalGiveaways || 0,
        categories: 7,
      })
      setRecentPosts(recent || [])
      setLoading(false)
    }
    fetchStats()
  }, [])

  const statCards = [
    { label:"Total Posts", value:stats.posts, color:"#1a2f6e", bg:"#e8edf8" },
    { label:"Published", value:stats.published, color:"#15803d", bg:"#f0fdf4" },
    { label:"Drafts", value:stats.drafts, color:"#b45309", bg:"#fef3e2" },
    { label:"Events", value:stats.events, color:"#7c3aed", bg:"#fdf4ff" },
    { label:"Spiffs", value:stats.giveaways, color:"#dc2626", bg:"#fef2f2" },
    { label:"Categories", value:stats.categories, color:"#0369a1", bg:"#f0f9ff" },
  ]

  const quickActions = [
    { label:"New Post", href:"/admin/posts/new", color:"#f89b24" },
    { label:"New Spiff", href:"/admin/spiffs", color:"#1a2f6e" },
    { label:"New Event", href:"/admin/events", color:"#15803d" },
    { label:"All Posts", href:"/admin/posts", color:"#6b7280" },
  ]

  function StatusBadge({ status }: { status: string }) {
    const colors: Record<string,{bg:string,color:string}> = {
      published: { bg:"#f0fdf4", color:"#15803d" },
      draft:     { bg:"#fef3e2", color:"#b45309" },
      scheduled: { bg:"#f0f9ff", color:"#0369a1" },
      archived:  { bg:"#f3f4f6", color:"#6b7280" },
    }
    const c = colors[status] || colors.draft
    return (
      <span style={{padding:"0.2rem 0.6rem",borderRadius:20,fontSize:"0.72rem",fontWeight:700,background:c.bg,color:c.color,textTransform:"capitalize"}}>
        {status}
      </span>
    )
  }

  return (
    <div style={{maxWidth:1200,margin:"0 auto"}}>

      <div style={{marginBottom:"1.5rem"}}>
        <h1 style={{color:"#1a2f6e",fontSize:"1.75rem",fontWeight:800,margin:"0 0 0.25rem 0"}}>Dashboard</h1>
        <p style={{color:"#6b7280",fontSize:"0.9rem",margin:0}}>Welcome to the Windmar Solar Academy admin portal</p>
      </div>

      <div style={{display:"grid",gridTemplateColumns:"repeat(auto-fit,minmax(140px,1fr))",gap:"0.75rem",marginBottom:"1.5rem"}}>
        {statCards.map(card => (
          <div key={card.label} style={{background:"white",borderRadius:12,padding:"1.25rem",boxShadow:"0 2px 8px rgba(0,0,0,0.06)",border:"1px solid #f3f4f6"}}>
            <div style={{fontSize:"2rem",fontWeight:800,color:card.color,lineHeight:1}}>{loading ? "—" : card.value}</div>
            <div style={{fontSize:"0.75rem",color:"#6b7280",fontWeight:600,textTransform:"uppercase",letterSpacing:"0.04em",marginTop:"0.4rem"}}>{card.label}</div>
          </div>
        ))}
      </div>

      <div style={{marginBottom:"1.5rem"}}>
        <h2 style={{color:"#1a2f6e",fontSize:"1rem",fontWeight:800,textTransform:"uppercase",letterSpacing:"0.04em",marginBottom:"0.75rem"}}>Quick Actions</h2>
        <div style={{display:"flex",gap:"0.75rem",flexWrap:"wrap"}}>
          {quickActions.map(action => (
            <Link key={action.href} href={action.href} style={{padding:"0.75rem 1.25rem",background:action.color,color:"white",borderRadius:8,textDecoration:"none",fontSize:"0.9rem",fontWeight:700,display:"inline-flex",alignItems:"center",gap:"0.4rem"}}>
              + {action.label}
            </Link>
          ))}
        </div>
      </div>

      <div style={{background:"white",borderRadius:14,boxShadow:"0 2px 8px rgba(0,0,0,0.06)",border:"1px solid #f3f4f6",overflow:"hidden"}}>
        <div style={{padding:"1rem 1.25rem",borderBottom:"1px solid #f3f4f6",display:"flex",alignItems:"center",justifyContent:"space-between"}}>
          <h2 style={{color:"#1a2f6e",fontSize:"1rem",fontWeight:800,textTransform:"uppercase",letterSpacing:"0.04em",margin:0}}>Recent Posts</h2>
          <Link href="/admin/posts" style={{color:"#f89b24",fontSize:"0.85rem",fontWeight:600,textDecoration:"none"}}>View All</Link>
        </div>
        {loading ? (
          <div style={{padding:"2rem",textAlign:"center",color:"#9ca3af",fontWeight:600}}>Loading...</div>
        ) : recentPosts.length === 0 ? (
          <div style={{padding:"2rem",textAlign:"center",color:"#9ca3af",fontWeight:600}}>
            No posts yet.
            <Link href="/admin/posts/new" style={{color:"#f89b24",fontWeight:700,textDecoration:"none",marginLeft:"0.4rem"}}>Create your first post</Link>
          </div>
        ) : (
          <div style={{overflowX:"auto"}}>
            <table style={{width:"100%",borderCollapse:"collapse",fontSize:"0.88rem"}}>
              <thead>
                <tr style={{background:"#f9fafb"}}>
                  <th style={{textAlign:"left",padding:"0.6rem 1rem",fontSize:"0.72rem",fontWeight:700,color:"#9ca3af",textTransform:"uppercase",letterSpacing:"0.06em"}}>Title</th>
                  <th style={{textAlign:"left",padding:"0.6rem 1rem",fontSize:"0.72rem",fontWeight:700,color:"#9ca3af",textTransform:"uppercase",letterSpacing:"0.06em"}}>Type</th>
                  <th style={{textAlign:"left",padding:"0.6rem 1rem",fontSize:"0.72rem",fontWeight:700,color:"#9ca3af",textTransform:"uppercase",letterSpacing:"0.06em"}}>Status</th>
                  <th style={{textAlign:"left",padding:"0.6rem 1rem",fontSize:"0.72rem",fontWeight:700,color:"#9ca3af",textTransform:"uppercase",letterSpacing:"0.06em"}}>Date</th>
                  <th style={{textAlign:"left",padding:"0.6rem 1rem",fontSize:"0.72rem",fontWeight:700,color:"#9ca3af",textTransform:"uppercase",letterSpacing:"0.06em"}}>Actions</th>
                </tr>
              </thead>
              <tbody>
                {recentPosts.map((post, i) => (
                  <tr key={post.id} style={{borderTop:"1px solid #f3f4f6"}}>
                    <td style={{padding:"0.75rem 1rem",color:"#1f2937",fontWeight:600,maxWidth:200}}>
                      <div style={{overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap"}}>{post.title}</div>
                    </td>
                    <td style={{padding:"0.75rem 1rem"}}>
                      <span style={{padding:"0.2rem 0.6rem",borderRadius:20,fontSize:"0.72rem",fontWeight:700,background:"#e8edf8",color:"#1a2f6e",textTransform:"capitalize"}}>
                        {post.post_type}
                      </span>
                    </td>
                    <td style={{padding:"0.75rem 1rem"}}><StatusBadge status={post.status} /></td>
                    <td style={{padding:"0.75rem 1rem",color:"#9ca3af",fontSize:"0.82rem"}}>
                      {new Date(post.created_at).toLocaleDateString("en-US",{month:"short",day:"numeric",year:"numeric"})}
                    </td>
                    <td style={{padding:"0.75rem 1rem"}}>
                      <Link href={"/admin/posts/new?edit=" + post.id} style={{color:"#f89b24",fontSize:"0.82rem",fontWeight:700,textDecoration:"none",marginRight:"0.75rem"}}>Edit</Link>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  )
}
`;
fs.writeFileSync("src/app/admin/page.tsx", content, "utf8");
console.log("done - dashboard written");
