"use client"
import LeadUploadForm from "@/components/LeadUploadForm"
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
  video_url: string | null
  is_featured: boolean
  categories: { name: string; color: string; icon: string } | null
}

type Event = {
  id: string
  event_date: string
  location: string | null
  is_virtual: boolean
  virtual_link: string | null
  is_rsvp_open: boolean
  rsvp_count: number
  max_attendees: number | null
  cover_image_url: string | null
  posts: { title: string; excerpt: string; cover_image_url: string | null } | null
}

type Giveaway = {
  id: string
  prize_name: string
  prize_description: string | null
  prize_image_url: string | null
  entry_deadline: string
  status: string
  entry_count: number
  posts: { title: string; excerpt: string } | null
}

const ASSETS = {
  logo: "https://assets.cdn.filesafe.space/eTTRenV5nD46gQbZ5A9E/media/6304e4828eb5d962dab34923.png",
  hero: "https://assets.cdn.filesafe.space/eTTRenV5nD46gQbZ5A9E/media/6304e41e1dd3657e72e1d95e.jpeg",
  panel1: "https://assets.cdn.filesafe.space/eTTRenV5nD46gQbZ5A9E/media/6437661aa2d73e22a4531c76.png",
  panel2: "https://assets.cdn.filesafe.space/eTTRenV5nD46gQbZ5A9E/media/650b4f6088b7721666a05724.png",
  panel3: "https://assets.cdn.filesafe.space/eTTRenV5nD46gQbZ5A9E/media/650b2b386b45938616a13e05.png",
  panel4: "https://assets.cdn.filesafe.space/eTTRenV5nD46gQbZ5A9E/media/6504716e51a217d93d76dde1.png",
}

const bottomTabs = [
  {id:"home", label:"Home", d:"M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z M9 22V12h6v10"},
  {id:"feed", label:"Feed", d:"M8 6h13M8 12h13M8 18h13M3 6h.01M3 12h.01M3 18h.01"},
  {id:"spiffs", label:"Spiffs", d:"M12 1v22M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6"},
  {id:"videos", label:"Videos", d:"M23 7l-7 5 7 5V7z M1 5h15a2 2 0 0 1 2 2v10a2 2 0 0 1-2 2H1z"},
  {id:"calendar", label:"Events", d:"M3 4h18a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2H3a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2z M16 2v4M8 2v4M1 10h22"},
  {id:"leads", label:"Submit Lead", d:"M12 5v14M5 12h14"},
]

const desktopTabs = [
  ...bottomTabs,
  {id:"resources", label:"Docs", d:"M22 19a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h5l2 3h9a2 2 0 0 1 2 2z"},
  {id:"leads", label:"Submit Lead", d:"M12 5v14M5 12h14"},
  {id:"leads", label:"Submit Lead", d:"M12 5v14M5 12h14"},
]

export default function Home() {
  const [activeTab, setActiveTab] = useState("home")
  const [feedFilter, setFeedFilter] = useState("all")
  const [posts, setPosts] = useState<Post[]>([])
  const [events, setEvents] = useState<Event[]>([])
  const [giveaways, setGiveaways] = useState<Giveaway[]>([])
  const [loading, setLoading] = useState(true)
  const [likedPosts, setLikedPosts] = useState<Set<string>>(new Set())
  const [toast, setToast] = useState("")
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false)
  const [rsvpModal, setRsvpModal] = useState(false)
  const [rsvpEvent, setRsvpEvent] = useState<Event | null>(null)
  const [rsvpForm, setRsvpForm] = useState({ name: "", email: "", phone: "" })
  const [rsvpSending, setRsvpSending] = useState(false)

  async function handleRsvp() {
    if (!rsvpForm.name.trim() || !rsvpForm.email.trim() || !rsvpForm.phone.trim()) { showToast("Name, email, and phone required"); return }
    if (!rsvpEvent) return
    setRsvpSending(true)
    const { error } = await supabase.from("event_rsvps").insert({
      event_id: rsvpEvent.id,
      name: rsvpForm.name,
      email: rsvpForm.email,
      phone: rsvpForm.phone,
    })
    if (error) {
      if (error.code === "23505") { showToast("You already RSVPed!") }
      else { showToast("Error: " + error.message) }
      setRsvpSending(false)
      return
    }
    await supabase.from("events").update({ rsvp_count: (rsvpEvent.rsvp_count || 0) + 1 }).eq("id", rsvpEvent.id)
    setEvents(prev => prev.map(e => e.id === rsvpEvent.id ? { ...e, rsvp_count: (e.rsvp_count || 0) + 1 } : e))
    showToast("RSVP confirmed!")
    setRsvpModal(false)
    setRsvpForm({ name: "", email: "", phone: "" })
    setRsvpSending(false)
  }
  const supabase = createClient()

  useEffect(() => { fetchData() }, [])

  async function fetchData() {
    setLoading(true)
    const [postsRes, eventsRes, giveawaysRes] = await Promise.all([
      supabase.from("posts").select("*, categories(name,color,icon), video_url").eq("status","published").lte("published_at", new Date().toISOString()).order("published_at",{ascending:false}).limit(20),
      supabase.from("events").select("*, posts(title,excerpt,cover_image_url)").gte("event_date", new Date().toISOString()).order("event_date",{ascending:true}).limit(10),
      supabase.from("giveaways").select("*, posts(title,excerpt)").in("status",["active","upcoming"]).order("entry_deadline",{ascending:true}).limit(10),
    ])
    if (postsRes.data) setPosts(postsRes.data)
    if (eventsRes.data) setEvents(eventsRes.data)
    if (giveawaysRes.data) setGiveaways(giveawaysRes.data)
    setLoading(false)
  }

  function showToast(msg: string) { setToast(msg); setTimeout(() => setToast(""), 2500) }
  function toggleLike(id: string) {
    setLikedPosts(prev => { const n = new Set(prev); n.has(id) ? n.delete(id) : n.add(id); return n })
  }
  function formatDate(d: string) {
    const diff = Math.floor((Date.now() - new Date(d).getTime()) / 1000)
    if (diff < 3600) return Math.floor(diff/60) + "m ago"
    if (diff < 86400) return Math.floor(diff/3600) + "h ago"
    if (diff < 172800) return "Yesterday"
    return new Date(d).toLocaleDateString("en-US",{month:"short",day:"numeric"})
  }
  function getBadgeClass(t: string) {
    const m: Record<string,string> = {announcement:"badge-announcement",daily:"badge-update",weekly:"badge-update",event:"badge-event",giveaway:"badge-giveaway",training:"badge-training"}
    return m[t] || "badge-announcement"
  }
  function getInitials(t: string) {
    const m: Record<string,string> = {announcement:"WA",daily:"WA",weekly:"WA",event:"EV",giveaway:"GV",training:"TR"}
    return m[t] || "WA"
  }
  function getAvatarColor(t: string) {
    const m: Record<string,string> = {training:"#16a34a",event:"#7c3aed",giveaway:"#dc2626",daily:"#1a2f6e",weekly:"#1a2f6e"}
    return m[t] || "#f89b24"
  }

  const filteredPosts = feedFilter === "all" ? posts : posts.filter(p => p.post_type === feedFilter)
  const recentPosts = posts.slice(0,4)

  function getEmbedUrl(url: string): string | null {
    if (!url) return null
    const ytMatch = url.match(/(?:youtube\.com\/watch\?v=|youtu\.be\/|youtube\.com\/embed\/)([a-zA-Z0-9_-]{11})/)
    if (ytMatch) return "https://www.youtube.com/embed/" + ytMatch[1]
    const vimeoMatch = url.match(/vimeo\.com\/(\d+)/)
    if (vimeoMatch) return "https://player.vimeo.com/video/" + vimeoMatch[1]
    return null
  }

  function isDirectVideo(url: string): boolean {
    if (!url) return false
    return /\.(mp4|webm|mov|ogg)(\?.*)?$/i.test(url) || (url.includes("supabase") && url.includes("post-videos"))
  }

  function FeedCard({ post }: { post: Post }) {
    const [expanded, setExpanded] = useState(false)
    const embedUrl = post.video_url ? getEmbedUrl(post.video_url) : null
    const directVideo = post.video_url ? isDirectVideo(post.video_url) : false
    const hasBody = post.body && post.body.trim().length > 0 && post.body !== post.excerpt
    const catColor = getBadgeClass(post.post_type)
    const catBg: Record<string,string> = {"badge-announcement":"#e8edf8","badge-update":"#f0f9ff","badge-event":"#fdf4ff","badge-giveaway":"#fef2f2","badge-training":"#f0fdf4"}
    const catFg: Record<string,string> = {"badge-announcement":"#1a2f6e","badge-update":"#0369a1","badge-event":"#7e22ce","badge-giveaway":"#b91c1c","badge-training":"#15803d"}

    return (
      <div className="x-post">
        <div className="x-avatar" style={{background:getAvatarColor(post.post_type)}}>{getInitials(post.post_type)}</div>
        <div className="x-post-content">
          <div className="x-post-header">
            <span className="x-author">Windmar Academy</span>
            <span className="x-handle">@solaracademy</span>
            <span className="x-dot">{"\u00B7"}</span>
            <span className="x-time">{formatDate(post.published_at)}</span>
            <span className="x-category" style={{background:catBg[catColor]||"#f3f4f6",color:catFg[catColor]||"#6b7280",marginLeft:"auto"}}>{post.categories?.name || post.post_type}</span>
          </div>
          <div className="x-post-title">{post.title}</div>
          <div className="x-post-text">{post.excerpt}</div>
          {hasBody && (
            <>
              {expanded && <div className="x-post-text" style={{marginTop:"0.5rem",whiteSpace:"pre-wrap"}}>{post.body}</div>}
              <button className="x-read-more" onClick={() => setExpanded(!expanded)}>{expanded ? "Show less" : "Show more"}</button>
            </>
          )}
          {(post.cover_image_url || embedUrl || directVideo) && (
            <div className="x-post-media">
              {post.cover_image_url && !embedUrl && !directVideo && (
                <img src={post.cover_image_url} alt={post.title} onError={(e: any) => { e.target.style.display="none" }} />
              )}
              {embedUrl && (
                <div className="x-embed"><iframe src={embedUrl} allowFullScreen /></div>
              )}
              {directVideo && post.video_url && !embedUrl && (
                <video src={post.video_url} controls />
              )}
            </div>
          )}
          <div className="x-actions">
            <button className={"x-action-btn" + (likedPosts.has(post.id) ? " liked" : "")} onClick={() => toggleLike(post.id)}>
              <svg viewBox="0 0 24 24" fill={likedPosts.has(post.id)?"currentColor":"none"} stroke="currentColor" strokeWidth="2">
                <path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z"/>
              </svg>
              {likedPosts.has(post.id) ? "Liked" : "Like"}
            </button>
            <button className="x-action-btn" onClick={() => showToast("Share coming soon!")}>
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M4 12v8a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2v-8"/><polyline points="16 6 12 2 8 6"/><line x1="12" y1="2" x2="12" y2="15"/>
              </svg>
              Share
            </button>
            {post.post_type === "event" && (() => {
              const matchedEvent = events.find(e => e.posts?.title === post.title)
              return matchedEvent && matchedEvent.is_rsvp_open ? (
                <button className="x-action-btn x-action-rsvp" onClick={() => { setRsvpEvent(matchedEvent); setRsvpModal(true) }}>
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <path d="M16 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/><circle cx="8.5" cy="7" r="4"/><line x1="20" y1="8" x2="20" y2="14"/><line x1="23" y1="11" x2="17" y2="11"/>
                  </svg>
                  RSVP
                </button>
              ) : null
            })()}
          </div>
        </div>
      </div>
    )
  }
  return (
    <div style={{minHeight:"100vh",background:"#f9fafb",fontFamily:"Barlow,system-ui,sans-serif"}}>

      <style>{`
        .desktop-nav { display: none; }
        .mobile-nav { display: flex; }
        .desktop-layout { display: block; }
        .desktop-sidebar { display: none; }
        .content-grid { display: block; }
        .hero-desktop { display: none; }
        .hero-mobile { display: block; }
        .desktop-only { display: none; }
        .desktop-nav-btn {
          display: flex; align-items: center; gap: 0.5rem;
          padding: 0.45rem 0.9rem; border-radius: 8px;
          font-size: 0.82rem; font-weight: 700;
          cursor: pointer; border: none;
          font-family: Barlow, system-ui, sans-serif;
          transition: all 0.15s; white-space: nowrap;
          background: transparent; color: rgba(255,255,255,0.6);
        }
        .desktop-nav-btn:hover { background: rgba(255,255,255,0.08); color: rgba(255,255,255,0.9); }
        .desktop-nav-btn.active { background: rgba(248,155,36,0.15); color: #f89b24; }
        .desktop-nav-btn svg { width: 18px; height: 18px; flex-shrink: 0; }
        .mobile-menu-overlay { display: block; }
        .mobile-menu-btn { display: flex; }
        .desktop-nav-only { display: none; }
        .mobile-menu-panel { display: block; }
        @media (min-width: 768px) {
          .desktop-nav { display: flex; }
          .mobile-nav { display: none !important; }
          .mobile-menu-overlay { display: none !important; }
          .mobile-menu-btn { display: none !important; }
          .desktop-nav-only { display: inline-flex !important; }
          .mobile-menu-panel { display: none !important; }
          .app-shell { max-width: 100% !important; }
          .app-content { padding-bottom: 0 !important; }
          .desktop-sidebar { display: flex; }
          .content-grid { display: grid; grid-template-columns: 300px 1fr; gap: 1.5rem; align-items: start; }
          .hero-desktop { display: block; }
          .hero-mobile { display: none; }
          .feed-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 1rem; }
          .desktop-only { display: grid !important; }
        }
        @media (min-width: 1200px) {
          .content-grid { grid-template-columns: 320px 1fr 280px; }
        }
      `}</style>

      {mobileMenuOpen && (
        <div className="mobile-menu-overlay" onClick={() => setMobileMenuOpen(false)}
          style={{position:"fixed",inset:0,background:"rgba(0,0,0,0.5)",zIndex:300}} />
      )}
      <div className="mobile-menu-panel"
        style={{position:"fixed",top:0,right:0,width:280,height:"100vh",background:"#0f1d47",zIndex:310,
          transform:mobileMenuOpen?"translateX(0)":"translateX(100%)",transition:"transform 0.3s ease",
          display:"flex",flexDirection:"column",boxShadow:"-4px 0 24px rgba(0,0,0,0.3)"}}>
        <div style={{padding:"1.25rem",borderBottom:"1px solid rgba(255,255,255,0.08)",display:"flex",alignItems:"center",justifyContent:"space-between"}}>
          <div>
            <span style={{color:"#f89b24",fontWeight:800,fontSize:"1.05rem"}}>SOLAR</span>
            <span style={{color:"white",fontWeight:800,fontSize:"1.05rem"}}> ACADEMY</span>
          </div>
          <button onClick={() => setMobileMenuOpen(false)}
            style={{background:"rgba(255,255,255,0.1)",border:"none",borderRadius:8,width:36,height:36,display:"flex",alignItems:"center",justifyContent:"center",cursor:"pointer",color:"white"}}>
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/>
            </svg>
          </button>
        </div>
        <nav style={{flex:1,padding:"1rem 0"}}>
          <button onClick={() => { setActiveTab("resources"); setMobileMenuOpen(false) }}
            style={{display:"flex",alignItems:"center",gap:"0.75rem",padding:"0.9rem 1.25rem",width:"100%",
              background:activeTab==="resources"?"rgba(248,155,36,0.15)":"transparent",
              color:activeTab==="resources"?"white":"rgba(255,255,255,0.6)",
              border:"none",cursor:"pointer",fontSize:"0.95rem",fontWeight:700,fontFamily:"Barlow,system-ui,sans-serif",
              borderRight:activeTab==="resources"?"3px solid #f89b24":"3px solid transparent",transition:"all 0.15s"}}>
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke={activeTab==="resources"?"#f89b24":"rgba(255,255,255,0.4)"} strokeWidth="2">
              <path d="M22 19a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h5l2 3h9a2 2 0 0 1 2 2z"/>
            </svg>
            Resources & Docs
          </button>
          <a href="https://windmarsolaracademy.com" target="_blank" rel="noreferrer"
            style={{display:"flex",alignItems:"center",gap:"0.75rem",padding:"0.9rem 1.25rem",width:"100%",
              background:"transparent",color:"rgba(255,255,255,0.6)",textDecoration:"none",fontSize:"0.95rem",fontWeight:700,
              borderRight:"3px solid transparent"}}>
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="rgba(255,255,255,0.4)" strokeWidth="2">
              <circle cx="12" cy="12" r="10"/><line x1="2" y1="12" x2="22" y2="12"/><path d="M12 2a15.3 15.3 0 0 1 4 10 15.3 15.3 0 0 1-4 10 15.3 15.3 0 0 1-4-10 15.3 15.3 0 0 1 4-10z"/>
            </svg>
            Academy Website
          </a>
          <a href="/d2d"
            style={{display:"flex",alignItems:"center",gap:"0.75rem",padding:"0.9rem 1.25rem",width:"100%",
              background:"transparent",color:"rgba(255,255,255,0.6)",textDecoration:"none",fontSize:"0.95rem",fontWeight:700,
              borderRight:"3px solid transparent"}}>
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="rgba(255,255,255,0.4)" strokeWidth="2">
              <path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z"/><circle cx="12" cy="10" r="3"/>
            </svg>
            D2D Canvassing
          </a>
          <div style={{height:1,background:"rgba(255,255,255,0.08)",margin:"0.75rem 1.25rem"}} />
          <a href="/login"
            style={{display:"flex",alignItems:"center",gap:"0.75rem",padding:"0.9rem 1.25rem",width:"100%",
              background:"transparent",color:"rgba(255,255,255,0.6)",textDecoration:"none",fontSize:"0.95rem",fontWeight:700,
              borderRight:"3px solid transparent"}}>
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="rgba(255,255,255,0.4)" strokeWidth="2">
              <rect x="3" y="11" width="18" height="11" rx="2" ry="2"/><path d="M7 11V7a5 5 0 0 1 10 0v4"/>
            </svg>
            Admin Login
          </a>
        </nav>
        <div style={{padding:"1.25rem",borderTop:"1px solid rgba(255,255,255,0.08)"}}>
          <div style={{color:"rgba(255,255,255,0.3)",fontSize:"0.72rem",fontWeight:600,textAlign:"center"}}>Windmar Solar Academy</div>
        </div>
      </div>

      <header style={{background:"linear-gradient(135deg,#0f1d47 0%,#1a2f6e 100%)",position:"sticky",top:0,zIndex:100,boxShadow:"0 2px 16px rgba(0,0,0,0.25)"}}>
        <div style={{maxWidth:1400,margin:"0 auto",padding:"0 1.5rem",display:"flex",alignItems:"center",justifyContent:"space-between",height:64}}>
          <div style={{display:"flex",alignItems:"center",gap:"1.5rem"}}>
            <img src={ASSETS.logo} alt="Windmar Solar Academy" style={{height:40,width:"auto",objectFit:"contain",cursor:"pointer"}} onClick={() => setActiveTab("home")} onError={(e:any)=>{e.target.style.display="none"}} />
            <nav className="desktop-nav" style={{alignItems:"center",gap:"0.25rem"}}>
              {desktopTabs.map(tab => (
                <button key={tab.id} className={"desktop-nav-btn" + (activeTab === tab.id ? " active" : "")} onClick={() => setActiveTab(tab.id)}>
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    {tab.d.split(/(?=M)/).filter(Boolean).map((seg,i) => <path key={i} d={seg.trim()} />)}
                  </svg>
                  {tab.label}
                </button>
              ))}
            </nav>
          </div>
          <div style={{display:"flex",alignItems:"center",gap:"0.75rem"}}>
            <a href="https://windmarsolaracademy.com" target="_blank" rel="noreferrer" className="desktop-nav-only"
              style={{padding:"0.5rem 1rem",background:"rgba(255,255,255,0.1)",color:"white",borderRadius:6,fontSize:"0.82rem",fontWeight:700,textDecoration:"none",whiteSpace:"nowrap"}}>
              Academy Site
            </a>
            <a href="/login" className="desktop-nav-only"
              style={{padding:"0.5rem 1rem",background:"#f89b24",color:"white",borderRadius:6,fontSize:"0.82rem",fontWeight:700,textDecoration:"none",whiteSpace:"nowrap"}}>
              Admin
            </a>
            <button className="mobile-menu-btn" onClick={() => setMobileMenuOpen(true)}
              style={{background:"rgba(255,255,255,0.1)",border:"none",borderRadius:8,width:40,height:40,display:"flex",alignItems:"center",justifyContent:"center",cursor:"pointer",color:"white"}}>
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <line x1="3" y1="6" x2="21" y2="6"/><line x1="3" y1="12" x2="21" y2="12"/><line x1="3" y1="18" x2="21" y2="18"/>
              </svg>
            </button>
          </div>
        </div>
      </header>

      <main style={{maxWidth:1400,margin:"0 auto",padding:"1.5rem"}}>

        {activeTab === "home" && (
          <div>
            <div className="hero-desktop" style={{borderRadius:16,overflow:"hidden",marginBottom:"1.5rem",position:"relative",minHeight:320,background:"linear-gradient(135deg,#0f1d47 0%,#1a2f6e 60%,#2a4a9e 100%)"}}>
              <img src={ASSETS.hero} alt="Solar Academy" style={{position:"absolute",inset:0,width:"100%",height:"100%",objectFit:"cover",opacity:0.15}} onError={(e:any)=>{e.target.style.display="none"}} />
              <div style={{position:"absolute",inset:0,background:"linear-gradient(135deg,rgba(15,29,71,0.75) 0%,rgba(26,47,110,0.65) 60%,rgba(42,74,158,0.55) 100%)",zIndex:0}} />
              <div style={{position:"relative",zIndex:1,padding:"3rem",display:"flex",alignItems:"center",justifyContent:"space-between",flexWrap:"wrap",gap:"2rem",minHeight:320}}>
                <div>
                  <div style={{color:"rgba(255,255,255,0.7)",fontSize:"0.85rem",fontWeight:700,textTransform:"uppercase",letterSpacing:"0.08em",marginBottom:"0.5rem"}}>Welcome to</div>
                  <h1 style={{color:"white",fontSize:"3rem",fontWeight:800,margin:"0 0 0.5rem 0",lineHeight:1.1}}>
                    <span style={{color:"#f89b24"}}>Solar</span> Academy
                  </h1>
                  <p style={{color:"rgba(255,255,255,0.8)",fontSize:"1.1rem",margin:"0 0 1.5rem 0",maxWidth:500}}>
                    We Train You. We Value You. We Promote You.
                  </p>
                  <div style={{display:"flex",gap:"0.75rem",flexWrap:"wrap"}}>
                    <button onClick={() => setActiveTab("feed")}
                      style={{padding:"0.8rem 1.5rem",background:"#f89b24",color:"white",border:"none",borderRadius:8,fontWeight:700,fontSize:"0.95rem",cursor:"pointer",fontFamily:"Barlow,system-ui,sans-serif"}}>
                      View Latest Updates
                    </button>
                    <a href="https://ettrenv5nd46gqbz5a9e.app.clientclub.net/login" target="_blank" rel="noreferrer"
                      style={{padding:"0.8rem 1.5rem",background:"rgba(255,255,255,0.15)",color:"white",border:"1px solid rgba(255,255,255,0.3)",borderRadius:8,fontWeight:700,fontSize:"0.95rem",textDecoration:"none"}}>
                      Training Videos
                    </a>
                  </div>
                </div>
                <div style={{display:"flex",gap:"1rem",flexWrap:"wrap"}}>
                  {[{val:posts.length||0,lbl:"Updates"},{val:events.length||0,lbl:"Events"},{val:giveaways.length||0,lbl:"Active Spiffs"}].map(s => (
                    <div key={s.lbl} style={{background:"rgba(255,255,255,0.12)",borderRadius:12,padding:"1.25rem 1.5rem",textAlign:"center",minWidth:100}}>
                      <div style={{fontSize:"2rem",fontWeight:800,color:"#f89b24"}}>{s.val}</div>
                      <div style={{fontSize:"0.72rem",color:"rgba(255,255,255,0.7)",fontWeight:600,textTransform:"uppercase",letterSpacing:"0.04em"}}>{s.lbl}</div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
            <div className="hero-mobile">
              <div style={{background:"linear-gradient(135deg,#0f1d47 0%,#1a2f6e 60%,#2a4a9e 100%)",borderRadius:14,padding:"1.25rem",marginBottom:"1rem",color:"white",position:"relative",overflow:"hidden"}}>
                <div style={{position:"absolute",right:-10,top:-10,width:120,height:120,borderRadius:"50%",background:"rgba(248,155,36,0.1)"}} />
                <img src={ASSETS.logo} alt="Windmar Solar Academy" style={{height:36,width:"auto",objectFit:"contain",marginBottom:"0.75rem",display:"block"}} onError={(e:any)=>{e.target.style.display="none"}} />
                <div style={{fontSize:"0.75rem",opacity:0.7,fontWeight:700,textTransform:"uppercase",letterSpacing:"0.06em"}}>Welcome to</div>
                <div style={{fontSize:"1.5rem",fontWeight:800,margin:"0.15rem 0"}}><span style={{color:"#f89b24"}}>Solar</span> Academy</div>
                <div style={{fontSize:"0.82rem",opacity:0.8}}>We Train You. We Value You. We Promote You.</div>
              </div>
            </div>
            <div className="desktop-only" style={{gridTemplateColumns:"repeat(auto-fit,minmax(280px,1fr))",gap:"1.5rem",marginBottom:"1.5rem"}}>
              {[
                {img:ASSETS.panel1,title:"Sales Training",desc:"Master the art of solar sales with our proven frameworks and scripts.",tab:"videos"},
                {img:ASSETS.panel2,title:"Active Spiffs",desc:"See all current incentives and bonuses available to you right now.",tab:"spiffs"},
                {img:ASSETS.panel3,title:"Upcoming Events",desc:"Stay connected with team calls, workshops, and town halls.",tab:"calendar"},
                {img:ASSETS.panel4,title:"Resources",desc:"Access all documents, guides, and tools you need in the field.",tab:"resources"},
              ].map(card => (
                <div key={card.title} onClick={() => setActiveTab(card.tab)}
                  style={{borderRadius:14,overflow:"hidden",cursor:"pointer",background:"white",boxShadow:"0 2px 12px rgba(0,0,0,0.08)",border:"1px solid #f3f4f6",transition:"transform 0.2s,box-shadow 0.2s"}}
                  onMouseEnter={(e:any)=>{e.currentTarget.style.transform="translateY(-4px)";e.currentTarget.style.boxShadow="0 8px 32px rgba(0,0,0,0.12)"}}
                  onMouseLeave={(e:any)=>{e.currentTarget.style.transform="translateY(0)";e.currentTarget.style.boxShadow="0 2px 12px rgba(0,0,0,0.08)"}}>
                  <div style={{height:140,overflow:"hidden",background:"#1a2f6e",position:"relative"}}>
                    <img src={card.img} alt={card.title} style={{width:"100%",height:"100%",objectFit:"cover",opacity:0.85}} onError={(e:any)=>{e.target.style.display="none"}} />
                    <div style={{position:"absolute",inset:0,background:"linear-gradient(to top,rgba(15,29,71,0.6) 0%,transparent 100%)"}} />
                  </div>
                  <div style={{padding:"1rem"}}>
                    <div style={{fontWeight:800,color:"#1a2f6e",fontSize:"1rem",marginBottom:"0.3rem"}}>{card.title}</div>
                    <div style={{fontSize:"0.85rem",color:"#6b7280",lineHeight:1.5}}>{card.desc}</div>
                    <div style={{color:"#f89b24",fontSize:"0.82rem",fontWeight:700,marginTop:"0.5rem"}}>{"Explore \u2192"}</div>
                  </div>
                </div>
              ))}
            </div>
            <div>
              <div style={{display:"flex",alignItems:"center",justifyContent:"space-between",marginBottom:"1rem"}}>
                <h2 style={{color:"#1a2f6e",fontSize:"1.1rem",fontWeight:800,textTransform:"uppercase",letterSpacing:"0.04em",margin:0}}>Latest Updates</h2>
                <button onClick={() => setActiveTab("feed")} style={{color:"#f89b24",fontSize:"0.85rem",fontWeight:700,background:"none",border:"none",cursor:"pointer"}}>{"See All \u2192"}</button>
              </div>
              {loading ? (
                <div className="loading-card">Loading updates...</div>
              ) : recentPosts.length === 0 ? (
                <div className="loading-card">No posts yet - check back soon!</div>
              ) : (
                <div className="feed-grid">
                  {recentPosts.map(post => <FeedCard key={post.id} post={post} />)}
                </div>
              )}
            </div>
          </div>
        )}

        {activeTab === "feed" && (
          <div className="x-feed">
            <div className="x-feed-header">
              <div className="x-feed-title">Feed</div>
            </div>
            <div className="x-filter-bar">
              {["all","announcement","daily","weekly","event","giveaway","training"].map(f => (
                <button key={f} className={"x-filter-btn " + (feedFilter===f?"active":"")} onClick={() => setFeedFilter(f)}>
                  {f==="all"?"For you":f.charAt(0).toUpperCase()+f.slice(1)}
                </button>
              ))}
            </div>
            {loading ? (
              <div className="x-empty">Loading feed...</div>
            ) : filteredPosts.length === 0 ? (
              <div className="x-empty">No posts in this category yet.</div>
            ) : (
              filteredPosts.map(post => <FeedCard key={post.id} post={post} />)
            )}
          </div>
        )}
{activeTab === "spiffs" && (
          <div style={{maxWidth:1000,margin:"0 auto"}}>
            <div style={{background:"linear-gradient(135deg,#7c3f00 0%,#d4811a 100%)",borderRadius:16,padding:"2rem",marginBottom:"1.5rem",color:"white",position:"relative",overflow:"hidden"}}>
              <div style={{position:"absolute",right:-20,top:-20,width:200,height:200,borderRadius:"50%",background:"rgba(255,255,255,0.05)"}} />
              <h1 style={{fontSize:"2rem",fontWeight:800,margin:"0 0 0.5rem 0"}}>Active Spiffs</h1>
              <p style={{opacity:0.85,margin:0,fontSize:"1rem"}}>{giveaways.length > 0 ? giveaways.length + " spiffs running now - get after it!" : "Check back soon for new spiffs!"}</p>
            </div>
            {loading ? (
              <div className="loading-card">Loading spiffs...</div>
            ) : giveaways.length === 0 ? (
              <div className="loading-card">No active spiffs right now. Check back soon!</div>
            ) : (
              <div style={{display:"grid",gridTemplateColumns:"repeat(auto-fit,minmax(300px,1fr))",gap:"1rem"}}>
                {giveaways.map(g => (
                  <div key={g.id} className="spiff-card">
                    {g.prize_image_url && (
                      <img src={g.prize_image_url} alt={g.prize_name} style={{width:"100%",height:180,objectFit:"cover",display:"block"}} />
                    )}
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
                ))}
              </div>
            )}
          </div>
        )}

        {activeTab === "videos" && (
          <div style={{maxWidth:1000,margin:"0 auto"}}>
            <div style={{background:"linear-gradient(135deg,#1a2f6e 0%,#2a4a9e 100%)",borderRadius:16,padding:"2rem",marginBottom:"1.5rem",color:"white"}}>
              <h1 style={{fontSize:"2rem",fontWeight:800,margin:"0 0 0.5rem 0"}}>Training Videos</h1>
              <p style={{opacity:0.85,margin:0,fontSize:"1rem"}}>Access your full Solar Academy training library</p>
            </div>
            <div style={{display:"grid",gridTemplateColumns:"repeat(auto-fit,minmax(300px,1fr))",gap:"1.5rem"}}>
              <div style={{background:"white",borderRadius:14,padding:"2rem",boxShadow:"0 2px 12px rgba(0,0,0,0.08)",border:"1px solid #f3f4f6",textAlign:"center",gridColumn:"1/-1"}}>
                <div style={{fontSize:"1.25rem",fontWeight:800,color:"#1a2f6e",marginBottom:"0.5rem"}}>Your Training Portal</div>
                <p style={{fontSize:"0.95rem",color:"#6b7280",marginBottom:"1.5rem",lineHeight:1.6,maxWidth:500,margin:"0 auto 1.5rem"}}>
                  All Solar Academy training videos, modules, and courses are hosted on the Academy platform. Your GHL membership gives you full access.
                </p>
                <a href="https://ettrenv5nd46gqbz5a9e.app.clientclub.net/login" target="_blank" rel="noreferrer"
                  style={{display:"inline-block",background:"#f89b24",color:"white",padding:"1rem 2.5rem",borderRadius:8,fontWeight:700,fontSize:"1.05rem",textDecoration:"none"}}>
                  {"Open Training Videos \u2192"}
                </a>
                <div style={{fontSize:"0.82rem",color:"#9ca3af",marginTop:"0.75rem"}}>Sign in with your GHL membership account</div>
              </div>
              {[
                {label:"Sales Training",desc:"Objection handling, pitch scripts, closing techniques"},
                {label:"Technical Training",desc:"Installation basics, system design, safety"},
                {label:"Compliance",desc:"NABCEP, permits, regulatory requirements"},
                {label:"Leadership",desc:"Team management, coaching, culture"},
              ].map((item,i) => (
                <a key={i} href="https://ettrenv5nd46gqbz5a9e.app.clientclub.net/login" target="_blank" rel="noreferrer"
                  style={{background:"white",borderRadius:14,padding:"1.5rem",boxShadow:"0 2px 12px rgba(0,0,0,0.08)",border:"1px solid #f3f4f6",textDecoration:"none",display:"block",transition:"transform 0.2s"}}
                  onMouseEnter={(e:any)=>e.currentTarget.style.transform="translateY(-2px)"}
                  onMouseLeave={(e:any)=>e.currentTarget.style.transform="translateY(0)"}>
                  <div style={{width:44,height:44,borderRadius:10,background:"#e8edf8",display:"flex",alignItems:"center",justifyContent:"center",marginBottom:"0.75rem"}}>
                    <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="#1a2f6e" strokeWidth="2">
                      <polygon points="23 7 16 12 23 17 23 7"/><rect x="1" y="5" width="15" height="14" rx="2" ry="2"/>
                    </svg>
                  </div>
                  <div style={{fontWeight:800,color:"#1a2f6e",fontSize:"1rem",marginBottom:"0.3rem"}}>{item.label}</div>
                  <div style={{fontSize:"0.85rem",color:"#6b7280",lineHeight:1.5,marginBottom:"0.5rem"}}>{item.desc}</div>
                  <div style={{color:"#f89b24",fontSize:"0.82rem",fontWeight:700}}>{"Watch Now \u2192"}</div>
                </a>
              ))}
            </div>
          </div>
        )}

        {activeTab === "calendar" && (
          <div style={{maxWidth:900,margin:"0 auto"}}>
            <div style={{marginBottom:"1.25rem"}}>
              <h1 style={{color:"#1a2f6e",fontSize:"1.75rem",fontWeight:800,margin:"0 0 0.25rem 0"}}>Upcoming Events</h1>
              <p style={{color:"#6b7280",fontSize:"0.9rem",margin:0}}>Team calls, workshops, and town halls</p>
            </div>
            {loading ? (
              <div className="loading-card">Loading events...</div>
            ) : events.length === 0 ? (
              <div className="loading-card">No upcoming events. Check back soon!</div>
            ) : (
              <div style={{display:"grid",gap:"1rem"}}>
                {events.map(event => {
                  const d = new Date(event.event_date)
                  const coverImg = event.cover_image_url || event.posts?.cover_image_url
                  return (
                    <div key={event.id} style={{background:"white",borderRadius:14,boxShadow:"0 2px 12px rgba(0,0,0,0.08)",border:"1px solid #f3f4f6",overflow:"hidden"}}>
                      <div style={{display:"flex"}}>
                        <div style={{background:"linear-gradient(135deg,#1a2f6e 0%,#2a4a9e 100%)",padding:"1.5rem",display:"flex",flexDirection:"column",alignItems:"center",justifyContent:"center",minWidth:90}}>
                          <div style={{fontSize:"2rem",fontWeight:800,color:"white",lineHeight:1}}>{d.getDate()}</div>
                          <div style={{fontSize:"0.8rem",color:"#f89b24",fontWeight:700,textTransform:"uppercase"}}>{d.toLocaleDateString("en-US",{month:"short"})}</div>
                          <div style={{fontSize:"0.7rem",color:"rgba(255,255,255,0.6)",fontWeight:600}}>{d.getFullYear()}</div>
                        </div>
                        <div style={{padding:"1.25rem",flex:1}}>
                          <div style={{fontWeight:800,fontSize:"1.05rem",color:"#1f2937",marginBottom:"0.3rem"}}>{event.posts?.title}</div>
                          <div style={{fontSize:"0.85rem",color:"#6b7280",marginBottom:"0.5rem"}}>{event.posts?.excerpt}</div>
                          <div style={{display:"flex",gap:"1rem",flexWrap:"wrap",fontSize:"0.82rem",color:"#9ca3af",fontWeight:600,marginBottom:"0.75rem"}}>
                            <span>{d.toLocaleTimeString("en-US",{hour:"numeric",minute:"2-digit"})}</span>
                            {event.is_virtual ? <span>Virtual Event</span> : event.location && <span>{event.location}</span>}
                            {event.rsvp_count > 0 && <span>{event.rsvp_count} attending</span>}
                          </div>
                          <div style={{display:"flex",gap:"0.5rem",flexWrap:"wrap"}}>
                            {event.is_rsvp_open && (
                              <button onClick={() => { setRsvpEvent(event); setRsvpModal(true) }}
                                style={{padding:"0.5rem 1.25rem",background:"#f89b24",color:"white",border:"none",borderRadius:8,fontWeight:700,fontSize:"0.85rem",cursor:"pointer",fontFamily:"Barlow,system-ui,sans-serif"}}>
                                RSVP Now
                              </button>
                            )}
                            {event.is_virtual && event.virtual_link && (
                              <a href={event.virtual_link} target="_blank" rel="noreferrer"
                                style={{padding:"0.5rem 1.25rem",background:"rgba(26,47,110,0.1)",color:"#1a2f6e",borderRadius:8,fontWeight:700,fontSize:"0.85rem",textDecoration:"none",border:"1.5px solid #e5e7eb"}}>
                                Join Event
                              </a>
                            )}
                          </div>
                        </div>
                      </div>
                    </div>
                  )
                })}
              </div>
            )}
          </div>
        )}

        {activeTab === "leads" && (
          <div style={{maxWidth:720,margin:"0 auto"}}>
            <div style={{background:"linear-gradient(135deg,#0f1d47 0%,#1a2f6e 100%)",borderRadius:16,padding:"2rem",marginBottom:"1.5rem",color:"white"}}>
              <h1 style={{fontSize:"2rem",fontWeight:800,margin:"0 0 0.5rem 0"}}>Submit a Lead</h1>
              <p style={{opacity:0.85,margin:0,fontSize:"1rem"}}>Fill out the form below to submit a new lead to GoHighLevel.</p>
            </div>
            <LeadUploadForm />
          </div>
        )}

        {activeTab === "resources" && (
          <div style={{maxWidth:900,margin:"0 auto"}}>
            <div style={{marginBottom:"1.25rem"}}>
              <h1 style={{color:"#1a2f6e",fontSize:"1.75rem",fontWeight:800,margin:"0 0 0.25rem 0"}}>Resources</h1>
              <p style={{color:"#6b7280",fontSize:"0.9rem",margin:0}}>Documents, guides, and tools</p>
            </div>
            <div style={{display:"grid",gridTemplateColumns:"repeat(auto-fit,minmax(280px,1fr))",gap:"1rem",marginBottom:"1.5rem"}}>
              <a href="https://windmarsolaracademy.com" target="_blank" rel="noreferrer"
                style={{background:"linear-gradient(135deg,#1a2f6e 0%,#2a4a9e 100%)",borderRadius:14,padding:"1.5rem",color:"white",textDecoration:"none",display:"block"}}>
                <div style={{fontWeight:800,fontSize:"1.1rem",marginBottom:"0.3rem"}}>Academy Website</div>
                <div style={{opacity:0.8,fontSize:"0.85rem"}}>windmarsolaracademy.com</div>
                <div style={{color:"#f89b24",fontWeight:700,marginTop:"0.75rem",fontSize:"0.85rem"}}>{"Visit Site \u2192"}</div>
              </a>
              <a href="https://ettrenv5nd46gqbz5a9e.app.clientclub.net/login" target="_blank" rel="noreferrer"
                style={{background:"linear-gradient(135deg,#f89b24 0%,#d4811a 100%)",borderRadius:14,padding:"1.5rem",color:"white",textDecoration:"none",display:"block"}}>
                <div style={{fontWeight:800,fontSize:"1.1rem",marginBottom:"0.3rem"}}>Training Portal</div>
                <div style={{opacity:0.8,fontSize:"0.85rem"}}>GHL Membership Courses</div>
                <div style={{color:"white",fontWeight:700,marginTop:"0.75rem",fontSize:"0.85rem",opacity:0.9}}>{"Open Portal \u2192"}</div>
              </a>
            </div>
            <h2 style={{color:"#1a2f6e",fontSize:"1rem",fontWeight:800,textTransform:"uppercase",letterSpacing:"0.04em",marginBottom:"1rem"}}>Documents</h2>
            <div style={{display:"grid",gridTemplateColumns:"repeat(auto-fit,minmax(260px,1fr))",gap:"0.75rem"}}>
              {[
                {icon:"\uD83D\uDCD8",label:"Install Process Guide",meta:"PDF - Operations"},
                {icon:"\uD83D\uDCB0",label:"Commission Structure",meta:"PDF - Sales Team"},
                {icon:"\uD83D\uDCCA",label:"Customer Proposal Template",meta:"PowerPoint - Sales"},
                {icon:"\u2705",label:"Compliance Checklist",meta:"PDF - Legal - 2025"},
                {icon:"\uD83D\uDDFA",label:"Territory Map - Puerto Rico",meta:"PDF - Operations"},
                {icon:"\uD83D\uDCE6",label:"Product Catalog 2025",meta:"PDF - Marketing"},
              ].map((doc,i) => (
                <div key={i} className="resource-card" onClick={() => showToast("Document coming soon!")}>
                  <div className="resource-icon" style={{background:"#f3f4f6"}}>{doc.icon}</div>
                  <div style={{flex:1}}>
                    <div className="resource-title">{doc.label}</div>
                    <div className="resource-meta">{doc.meta}</div>
                  </div>
                  <span style={{color:"#9ca3af"}}>{"\u203A"}</span>
                </div>
              ))}
            </div>
          </div>
        )}

      </main>

      <nav className="mobile-nav bottom-nav">
        {bottomTabs.map(tab => (
          <button key={tab.id} className={"nav-item " + (activeTab===tab.id?"active":"")} onClick={() => setActiveTab(tab.id)}>
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              {tab.d.split(/(?=M)/).filter(Boolean).map((seg,i) => <path key={i} d={seg.trim()} />)}
            </svg>
            <span className="nav-label">{tab.label}</span>
          </button>
        ))}

      </nav>

      {rsvpModal && rsvpEvent && (
        <div style={{position:"fixed",inset:0,background:"rgba(0,0,0,0.5)",zIndex:400,display:"flex",alignItems:"center",justifyContent:"center",padding:"1rem"}}
          onClick={() => setRsvpModal(false)}>
          <div onClick={(e) => e.stopPropagation()}
            style={{background:"white",borderRadius:16,padding:"2rem",maxWidth:420,width:"100%",boxShadow:"0 16px 64px rgba(0,0,0,0.2)"}}>
            <h2 style={{color:"#1a2f6e",fontSize:"1.25rem",fontWeight:800,margin:"0 0 0.25rem 0"}}>RSVP</h2>
            <p style={{color:"#6b7280",fontSize:"0.88rem",margin:"0 0 1.25rem 0"}}>{rsvpEvent.posts?.title}</p>
            <div style={{marginBottom:"1rem"}}>
              <label style={{display:"block",color:"#374151",fontSize:"0.78rem",fontWeight:700,marginBottom:"0.4rem",textTransform:"uppercase",letterSpacing:"0.04em"}}>Your Name *</label>
              <input type="text" value={rsvpForm.name} onChange={e => setRsvpForm({...rsvpForm,name:e.target.value})}
                placeholder="Full name"
                style={{width:"100%",padding:"0.8rem 1rem",border:"1.5px solid #e5e7eb",borderRadius:8,fontSize:"0.95rem",fontFamily:"Barlow,system-ui,sans-serif",outline:"none",color:"#1f2937",boxSizing:"border-box",background:"white"}} />
            </div>
            <div style={{marginBottom:"1rem"}}>
              <label style={{display:"block",color:"#374151",fontSize:"0.78rem",fontWeight:700,marginBottom:"0.4rem",textTransform:"uppercase",letterSpacing:"0.04em"}}>Email *</label>
              <input type="email" value={rsvpForm.email} onChange={e => setRsvpForm({...rsvpForm,email:e.target.value})}
                placeholder="your@email.com"
                style={{width:"100%",padding:"0.8rem 1rem",border:"1.5px solid #e5e7eb",borderRadius:8,fontSize:"0.95rem",fontFamily:"Barlow,system-ui,sans-serif",outline:"none",color:"#1f2937",boxSizing:"border-box",background:"white"}} />
            </div>
            <div style={{marginBottom:"1.25rem"}}>
              <label style={{display:"block",color:"#374151",fontSize:"0.78rem",fontWeight:700,marginBottom:"0.4rem",textTransform:"uppercase",letterSpacing:"0.04em"}}>Phone *</label>
              <input type="tel" value={rsvpForm.phone} onChange={e => setRsvpForm({...rsvpForm,phone:e.target.value})}
                placeholder="(555) 123-4567"
                style={{width:"100%",padding:"0.8rem 1rem",border:"1.5px solid #e5e7eb",borderRadius:8,fontSize:"0.95rem",fontFamily:"Barlow,system-ui,sans-serif",outline:"none",color:"#1f2937",boxSizing:"border-box",background:"white"}} />
            </div>
            <div style={{display:"flex",gap:"0.75rem"}}>
              <button onClick={handleRsvp} disabled={rsvpSending}
                style={{flex:1,padding:"0.8rem",background:"#f89b24",color:"white",border:"none",borderRadius:8,fontSize:"0.95rem",fontWeight:700,cursor:rsvpSending?"not-allowed":"pointer",opacity:rsvpSending?0.7:1,fontFamily:"Barlow,system-ui,sans-serif"}}>
                {rsvpSending ? "Sending..." : "Confirm RSVP"}
              </button>
              <button onClick={() => setRsvpModal(false)}
                style={{padding:"0.8rem 1.25rem",background:"white",color:"#6b7280",border:"1.5px solid #e5e7eb",borderRadius:8,fontSize:"0.95rem",fontWeight:700,cursor:"pointer",fontFamily:"Barlow,system-ui,sans-serif"}}>
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}

      {toast && (
        <div className={"toast show"}>{toast}</div>
      )}
    </div>
  )
}
























