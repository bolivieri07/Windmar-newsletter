const fs = require("fs");
const page = `"use client"
import { useEffect, useState } from "react"
import { createClient } from "@/lib/supabase/client"

type Post = {
  id: string
  title: string
  excerpt: string
  body: string
  post_type: string
  published_at: string
  cover_image_url: string | null
  is_featured: boolean
  categories: { name: string; color: string; icon: string } | null
}

type Event = {
  id: string
  event_date: string
  location: string | null
  is_virtual: boolean
  virtual_link: string | null
  posts: { title: string; excerpt: string } | null
}

type Giveaway = {
  id: string
  prize_name: string
  prize_description: string | null
  entry_deadline: string
  status: string
  entry_count: number
  posts: { title: string; excerpt: string } | null
}

export default function Home() {
  const [activeTab, setActiveTab] = useState("home")
  const [feedFilter, setFeedFilter] = useState("all")
  const [posts, setPosts] = useState<Post[]>([])
  const [events, setEvents] = useState<Event[]>([])
  const [giveaways, setGiveaways] = useState<Giveaway[]>([])
  const [loading, setLoading] = useState(true)
  const [likedPosts, setLikedPosts] = useState<Set<string>>(new Set())
  const [toast, setToast] = useState("")
  const [showMenu, setShowMenu] = useState(false)
  const supabase = createClient()

  useEffect(() => { fetchData() }, [])

  async function fetchData() {
    setLoading(true)
    const [postsRes, eventsRes, giveawaysRes] = await Promise.all([
      supabase.from("posts").select("*, categories(name,color,icon)").eq("status","published").lte("published_at", new Date().toISOString()).order("published_at",{ascending:false}).limit(20),
      supabase.from("events").select("*, posts(title,excerpt)").gte("event_date", new Date().toISOString()).order("event_date",{ascending:true}).limit(10),
      supabase.from("giveaways").select("*, posts(title,excerpt)").in("status",["active","upcoming"]).order("entry_deadline",{ascending:true}).limit(10),
    ])
    if (postsRes.data) setPosts(postsRes.data)
    if (eventsRes.data) setEvents(eventsRes.data)
    if (giveawaysRes.data) setGiveaways(giveawaysRes.data)
    setLoading(false)
  }

  function showToast(msg: string) {
    setToast(msg)
    setTimeout(() => setToast(""), 2500)
  }

  function toggleLike(id: string) {
    setLikedPosts(prev => {
      const next = new Set(prev)
      next.has(id) ? next.delete(id) : next.add(id)
      return next
    })
  }

  function formatDate(dateStr: string) {
    const d = new Date(dateStr)
    const now = new Date()
    const diff = Math.floor((now.getTime() - d.getTime()) / 1000)
    if (diff < 3600) return Math.floor(diff/60) + "m ago"
    if (diff < 86400) return Math.floor(diff/3600) + "h ago"
    if (diff < 172800) return "Yesterday"
    return d.toLocaleDateString("en-US",{month:"short",day:"numeric"})
  }

  function getEventDay(d: string) { return new Date(d).getDate() }
  function getEventMonth(d: string) { return new Date(d).toLocaleDateString("en-US",{month:"short"}) }
  function getEventTime(d: string) { return new Date(d).toLocaleTimeString("en-US",{hour:"numeric",minute:"2-digit"}) }

  function getBadgeClass(type: string) {
    const map: Record<string,string> = { announcement:"badge-announcement", daily:"badge-update", weekly:"badge-update", event:"badge-event", giveaway:"badge-giveaway", training:"badge-training" }
    return map[type] || "badge-announcement"
  }

  function getInitials(type: string) {
    const map: Record<string,string> = { announcement:"WA", daily:"WA", weekly:"WA", event:"EV", giveaway:"GV", training:"TR" }
    return map[type] || "WA"
  }

  function getAvatarColor(type: string) {
    const map: Record<string,string> = { training:"#16a34a", event:"#7c3aed", giveaway:"#dc2626", daily:"#1a2f6e", weekly:"#1a2f6e" }
    return map[type] || "#f89b24"
  }

  const filteredPosts = feedFilter === "all" ? posts : posts.filter(p => p.post_type === feedFilter)
  const recentPosts = posts.slice(0, 3)

  const tabs = [
    { id:"home", label:"Home" },
    { id:"feed", label:"Feed" },
    { id:"spiffs", label:"Spiffs" },
    { id:"videos", label:"Videos" },
    { id:"resources", label:"Docs" },
  ]

  function FeedCard({ post }: { post: Post }) {
    return (
      <div className="feed-card">
        {post.cover_image_url && (
          <img src={post.cover_image_url} alt={post.title} style={{width:"100%",maxHeight:200,objectFit:"cover",display:"block"}} />
        )}
        <div className="feed-card-header">
          <div className="feed-author-avatar" style={{background:getAvatarColor(post.post_type)}}>
            {getInitials(post.post_type)}
          </div>
          <div>
            <div className="feed-author-name">Windmar Academy</div>
            <div className="feed-post-time">{formatDate(post.published_at)}</div>
          </div>
          <span className={"feed-badge " + getBadgeClass(post.post_type)}>
            {post.categories?.name || post.post_type}
          </span>
        </div>
        <div className="feed-body">
          <div className="feed-title">{post.title}</div>
          <div className="feed-text">{post.excerpt}</div>
        </div>
        <div className="feed-footer">
          <button className={"feed-action " + (likedPosts.has(post.id) ? "liked" : "")} onClick={() => toggleLike(post.id)}>
            <svg viewBox="0 0 24 24" fill={likedPosts.has(post.id) ? "currentColor" : "none"} stroke="currentColor" strokeWidth="2">
              <path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z"/>
            </svg>
            Like
          </button>
        </div>
      </div>
    )
  }

  return (
    <div className="app-shell">

      <header className="app-header">
        <div style={{color:"white",fontWeight:800,fontSize:"1.1rem",letterSpacing:"0.02em"}}>
          <span style={{color:"#f89b24"}}>SOLAR</span> ACADEMY
        </div>
        <div className="header-right">
          <button className="notif-btn" onClick={() => showToast("No new notifications")}>
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9"/>
              <path d="M13.73 21a2 2 0 0 1-3.46 0"/>
            </svg>
            <div className="notif-dot" />
          </button>
          <button className="menu-btn" onClick={(e) => { e.stopPropagation(); setShowMenu(!showMenu) }}>
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2.5">
              <line x1="3" y1="6" x2="21" y2="6"/>
              <line x1="3" y1="12" x2="21" y2="12"/>
              <line x1="3" y1="18" x2="21" y2="18"/>
            </svg>
          </button>
        </div>
      </header>

      {showMenu && (
        <div onClick={(e) => e.stopPropagation()} style={{position:"absolute",top:56,right:12,background:"white",borderRadius:14,boxShadow:"0 8px 32px rgba(0,0,0,0.15)",border:"1px solid #f3f4f6",minWidth:200,zIndex:200,overflow:"hidden"}}>
          <a href="https://windmarsolaracademy.com" target="_blank" rel="noreferrer"
            style={{display:"flex",alignItems:"center",gap:10,padding:"0.9rem 1rem",fontSize:"0.9rem",fontWeight:600,color:"#1f2937",textDecoration:"none",borderBottom:"1px solid #f3f4f6"}}>
            Academy Website
          </a>
          <a href="/admin"
            style={{display:"flex",alignItems:"center",gap:10,padding:"0.9rem 1rem",fontSize:"0.9rem",fontWeight:600,color:"#1a2f6e",textDecoration:"none"}}>
            Admin Login
          </a>
        </div>
      )}

      <main className="app-content" onClick={() => setShowMenu(false)}>

        <div className={"tab-panel " + (activeTab === "home" ? "active" : "")}>
          <div className="hero-banner">
            <div className="hero-greeting">Welcome to</div>
            <div className="hero-name">Solar Academy</div>
            <div className="hero-sub">We Train You. We Value You. We Promote You.</div>
            <div className="hero-stats">
              <div className="hero-stat"><div className="hero-stat-val">{posts.length || "—"}</div><div className="hero-stat-lbl">Updates</div></div>
              <div className="hero-stat"><div className="hero-stat-val">{events.length || "—"}</div><div className="hero-stat-lbl">Events</div></div>
              <div className="hero-stat"><div className="hero-stat-val">{giveaways.length || "—"}</div><div className="hero-stat-lbl">Spiffs</div></div>
            </div>
          </div>

          <div className="quick-grid">
            <div className="quick-item" onClick={() => setActiveTab("feed")}><div className="quick-icon">N</div><div className="quick-label">Feed</div></div>
            <div className="quick-item" onClick={() => setActiveTab("spiffs")}><div className="quick-icon">$</div><div className="quick-label">Spiffs</div></div>
            <div className="quick-item" onClick={() => setActiveTab("calendar")}><div className="quick-icon">C</div><div className="quick-label">Events</div></div>
            <div className="quick-item" onClick={() => setActiveTab("resources")}><div className="quick-icon">D</div><div className="quick-label">Docs</div></div>
          </div>

          <div className="section-header">
            <span className="section-title">Latest Updates</span>
            <span className="section-more" onClick={() => setActiveTab("feed")}>See All</span>
          </div>

          {loading ? (
            <div className="loading-card">Loading updates...</div>
          ) : recentPosts.length === 0 ? (
            <div className="loading-card">No posts yet — check back soon!</div>
          ) : (
            recentPosts.map(post => <FeedCard key={post.id} post={post} />)
          )}
        </div>

        <div className={"tab-panel " + (activeTab === "feed" ? "active" : "")}>
          <div className="filter-tabs">
            {["all","announcement","daily","weekly","event","giveaway","training"].map(f => (
              <button key={f} className={"filter-tab " + (feedFilter === f ? "active" : "")} onClick={() => setFeedFilter(f)}>
                {f === "all" ? "All" : f.charAt(0).toUpperCase() + f.slice(1)}
              </button>
            ))}
          </div>
          {loading ? (
            <div className="loading-card">Loading feed...</div>
          ) : filteredPosts.length === 0 ? (
            <div className="loading-card">No posts in this category yet.</div>
          ) : (
            filteredPosts.map(post => <FeedCard key={post.id} post={post} />)
          )}
        </div>

        <div className={"tab-panel " + (activeTab === "spiffs" ? "active" : "")}>
          <div className="hero-banner" style={{background:"linear-gradient(135deg,#7c3f00 0%,#d4811a 100%)"}}>
            <div className="hero-greeting">Active Spiffs</div>
            <div className="hero-name">{giveaways.length > 0 ? giveaways.length + " Running Now!" : "Check Back Soon!"}</div>
            <div className="hero-sub">New spiffs posted every week</div>
          </div>
          {loading ? (
            <div className="loading-card">Loading spiffs...</div>
          ) : giveaways.length === 0 ? (
            <div className="loading-card">No active spiffs right now. Check back soon!</div>
          ) : (
            giveaways.map(g => (
              <div key={g.id} className="spiff-card">
                <div className="spiff-header">
                  <div>
                    <div className="spiff-title">{g.prize_name}</div>
                    <div style={{fontSize:"0.78rem",opacity:0.85,marginTop:"0.2rem"}}>{g.posts?.title}</div>
                  </div>
                  <div style={{textAlign:"right"}}>
                    <div style={{fontSize:"1rem",fontWeight:800,color:"white",textTransform:"uppercase"}}>{g.status}</div>
                    <div style={{fontSize:"0.72rem",opacity:0.8}}>{g.entry_count} entries</div>
                  </div>
                </div>
                <div className="spiff-body">
                  <div className="spiff-desc">{g.prize_description || g.posts?.excerpt}</div>
                  <div className="spiff-deadline">Deadline: {new Date(g.entry_deadline).toLocaleDateString("en-US",{month:"long",day:"numeric",year:"numeric"})}</div>
                </div>
              </div>
            ))
          )}
        </div>

        <div className={"tab-panel " + (activeTab === "calendar" ? "active" : "")}>
          <div className="section-header" style={{marginTop:0}}>
            <span className="section-title">Upcoming Events</span>
          </div>
          {loading ? (
            <div className="loading-card">Loading events...</div>
          ) : events.length === 0 ? (
            <div className="loading-card">No upcoming events. Check back soon!</div>
          ) : (
            events.map(event => (
              <div key={event.id} className="event-item">
                <div style={{textAlign:"center",flexShrink:0}}>
                  <div className="event-date-num">{getEventDay(event.event_date)}</div>
                  <div className="event-date-mon">{getEventMonth(event.event_date)}</div>
                </div>
                <div style={{flex:1}}>
                  <div className="event-title">{event.posts?.title}</div>
                  <div className="event-time">{getEventTime(event.event_date)}</div>
                  <div className="event-loc">{event.is_virtual ? "Virtual: " + (event.virtual_link || "Link TBA") : "Location: " + (event.location || "TBA")}</div>
                </div>
              </div>
            ))
          )}
        </div>

        <div className={"tab-panel " + (activeTab === "videos" ? "active" : "")}>
          <div className="hero-banner" style={{background:"linear-gradient(135deg,#1a2f6e 0%,#2a4a9e 100%)",marginBottom:"1rem"}}>
            <div className="hero-greeting">Training Portal</div>
            <div className="hero-name">Solar Academy Videos</div>
            <div className="hero-sub">Access your full training library on the Academy site</div>
          </div>
          <div style={{background:"white",borderRadius:14,padding:"1.5rem",textAlign:"center",boxShadow:"0 2px 12px rgba(0,0,0,0.08)",marginBottom:"1rem"}}>
            <div style={{fontSize:"1.1rem",fontWeight:800,color:"#1a2f6e",marginBottom:"0.5rem"}}>Your Training Videos</div>
            <div style={{fontSize:"0.88rem",color:"#4b5563",marginBottom:"1.25rem",lineHeight:1.6}}>
              Access all Solar Academy training videos and courses through the member portal. Your GHL membership gives you full access.
            </div>
            <a href="https://windmarsolaracademy.com/courses" target="_blank" rel="noreferrer"
              style={{display:"block",background:"#f89b24",color:"white",padding:"0.9rem 2rem",borderRadius:8,fontWeight:700,fontSize:"1rem",textDecoration:"none",marginBottom:"0.75rem"}}>
              Open Training Videos
            </a>
            <div style={{fontSize:"0.78rem",color:"#9ca3af"}}>Sign in with your GHL membership account</div>
          </div>
          <div style={{background:"white",borderRadius:14,padding:"1rem",boxShadow:"0 2px 12px rgba(0,0,0,0.08)"}}>
            <div style={{fontSize:"0.85rem",fontWeight:800,color:"#1a2f6e",textTransform:"uppercase",letterSpacing:"0.04em",marginBottom:"0.75rem"}}>Quick Links</div>
            {[
              {label:"All Courses", url:"https://windmarsolaracademy.com/courses"},
              {label:"Sales Training", url:"https://windmarsolaracademy.com/courses"},
              {label:"Technical Training", url:"https://windmarsolaracademy.com/courses"},
              {label:"Compliance Modules", url:"https://windmarsolaracademy.com/courses"},
            ].map((item,i) => (
              <a key={i} href={item.url} target="_blank" rel="noreferrer" className="resource-card" style={{marginBottom:"0.5rem"}}>
                <div className="resource-icon" style={{background:"#e8edf8"}}>?</div>
                <div style={{flex:1}}>
                  <div className="resource-title">{item.label}</div>
                  <div className="resource-meta">windmarsolaracademy.com</div>
                </div>
                <span style={{color:"#9ca3af"}}>?</span>
              </a>
            ))}
          </div>
        </div>

        <div className={"tab-panel " + (activeTab === "resources" ? "active" : "")}>
          <div className="section-header" style={{marginTop:0}}>
            <span className="section-title">Quick Links</span>
          </div>
          <a href="https://windmarsolaracademy.com" target="_blank" rel="noreferrer" className="resource-card">
            <div className="resource-icon" style={{background:"#fef3e2"}}>W</div>
            <div style={{flex:1}}>
              <div className="resource-title">windmarsolaracademy.com</div>
              <div className="resource-meta">Official Academy Website</div>
            </div>
            <span style={{color:"#9ca3af"}}>?</span>
          </a>
          <div className="section-header">
            <span className="section-title">Documents</span>
          </div>
          {[
            {label:"Install Process Guide", meta:"PDF - Operations"},
            {label:"Commission Structure", meta:"PDF - Sales Team"},
            {label:"Customer Proposal Template", meta:"PowerPoint - Sales"},
            {label:"Compliance Checklist", meta:"PDF - Legal 2025"},
            {label:"Territory Map Puerto Rico", meta:"PDF - Operations"},
          ].map((doc,i) => (
            <div key={i} className="resource-card" onClick={() => showToast("Document coming soon!")}>
              <div className="resource-icon" style={{background:"#f3f4f6"}}>D</div>
              <div style={{flex:1}}>
                <div className="resource-title">{doc.label}</div>
                <div className="resource-meta">{doc.meta}</div>
              </div>
              <span style={{color:"#9ca3af"}}>?</span>
            </div>
          ))}
        </div>

      </main>

      <nav className="bottom-nav">
        {[
          { id:"home", label:"Home", path:"M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z M9 22V12h6v10" },
          { id:"feed", label:"Feed", path:"M8 6h13M8 12h13M8 18h13M3 6h.01M3 12h.01M3 18h.01" },
          { id:"spiffs", label:"Spiffs", path:"M12 1v22M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6" },
          { id:"videos", label:"Videos", path:"M23 7l-7 5 7 5V7z M1 5h15a2 2 0 0 1 2 2v10a2 2 0 0 1-2 2H1z" },
          { id:"resources", label:"Docs", path:"M22 19a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h5l2 3h9a2 2 0 0 1 2 2z" },
        ].map(tab => (
          <button key={tab.id} className={"nav-item " + (activeTab === tab.id ? "active" : "")} onClick={() => setActiveTab(tab.id)}>
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              {tab.path.split("M").filter(Boolean).map((d,i) => <path key={i} d={"M"+d} />)}
            </svg>
            <span className="nav-label">{tab.label}</span>
          </button>
        ))}
      </nav>

      <div className={"toast " + (toast ? "show" : "")}>{toast}</div>

    </div>
  )
}
`;
fs.writeFileSync("src/app/page.tsx", page, "utf8");
console.log("done - page.tsx rewritten cleanly");
