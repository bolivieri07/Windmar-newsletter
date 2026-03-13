"use client"
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

const ASSETS = {
  logo: "https://assets.cdn.filesafe.space/eTTRenV5nD46gQbZ5A9E/media/6304e4828eb5d962dab34923.png",
  hero: "https://assets.cdn.filesafe.space/eTTRenV5nD46gQbZ5A9E/media/6304e41e1dd3657e72e1d95e.jpeg",
  panel1: "https://assets.cdn.filesafe.space/eTTRenV5nD46gQbZ5A9E/media/6437661aa2d73e22a4531c76.png",
  panel2: "https://assets.cdn.filesafe.space/eTTRenV5nD46gQbZ5A9E/media/650b4f6088b7721666a05724.png",
  panel3: "https://assets.cdn.filesafe.space/eTTRenV5nD46gQbZ5A9E/media/650b2b386b45938616a13e05.png",
  panel4: "https://assets.cdn.filesafe.space/eTTRenV5nD46gQbZ5A9E/media/6504716e51a217d93d76dde1.png",
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
  const featuredPost = posts.find(p => p.is_featured) || posts[0]

  function FeedCard({ post }: { post: Post }) {
    return (
      <div className="feed-card">
        {post.cover_image_url && (
          <img src={post.cover_image_url} alt={post.title} style={{width:"100%",maxHeight:200,objectFit:"cover",display:"block"}} />
        )}
        <div className="feed-card-header">
          <div className="feed-author-avatar" style={{background:getAvatarColor(post.post_type)}}>{getInitials(post.post_type)}</div>
          <div>
            <div className="feed-author-name">Windmar Academy</div>
            <div className="feed-post-time">{formatDate(post.published_at)}</div>
          </div>
          <span className={"feed-badge " + getBadgeClass(post.post_type)}>{post.categories?.name || post.post_type}</span>
        </div>
        <div className="feed-body">
          <div className="feed-title">{post.title}</div>
          <div className="feed-text">{post.excerpt}</div>
        </div>
        <div className="feed-footer">
          <button className={"feed-action " + (likedPosts.has(post.id) ? "liked" : "")} onClick={() => toggleLike(post.id)}>
            <svg viewBox="0 0 24 24" fill={likedPosts.has(post.id)?"currentColor":"none"} stroke="currentColor" strokeWidth="2">
              <path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z"/>
            </svg>
            Like
          </button>
        </div>
      </div>
    )
  }

  const navTabs = [
    {id:"home", label:"Home"},
    {id:"feed", label:"Feed"},
    {id:"spiffs", label:"Spiffs"},
    {id:"videos", label:"Training Videos"},
    {id:"calendar", label:"Events"},
    {id:"resources", label:"Resources"},
  ]

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
        @media (min-width: 768px) {
          .desktop-nav { display: flex; }
          .mobile-nav { display: none !important; }
          .app-shell { max-width: 100% !important; }
          .app-content { padding-bottom: 0 !important; }
          .desktop-sidebar { display: flex; }
          .content-grid { display: grid; grid-template-columns: 300px 1fr; gap: 1.5rem; align-items: start; }
          .hero-desktop { display: block; }
          .hero-mobile { display: none; }
          .feed-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 1rem; }
        }
        @media (min-width: 1200px) {
          .content-grid { grid-template-columns: 320px 1fr 280px; }
        }
      `}</style>

      <header style={{background:"linear-gradient(135deg,#0f1d47 0%,#1a2f6e 100%)",position:"sticky",top:0,zIndex:100,boxShadow:"0 2px 16px rgba(0,0,0,0.25)"}}>
        <div style={{maxWidth:1400,margin:"0 auto",padding:"0 1.5rem",display:"flex",alignItems:"center",justifyContent:"space-between",height:64}}>
          <img src={ASSETS.logo} alt="Windmar Solar Academy" style={{height:40,width:"auto",objectFit:"contain"}} onError={(e:any)=>{e.target.style.display="none"}} />
          <div style={{display:"flex",alignItems:"center",gap:"0.75rem"}}>
            <a href="https://windmarsolaracademy.com" target="_blank" rel="noreferrer"
              style={{padding:"0.5rem 1rem",background:"rgba(255,255,255,0.1)",color:"white",borderRadius:6,fontSize:"0.82rem",fontWeight:700,textDecoration:"none",whiteSpace:"nowrap"}}>
              Academy Site
            </a>
            <a href="/login"
              style={{padding:"0.5rem 1rem",background:"#f89b24",color:"white",borderRadius:6,fontSize:"0.82rem",fontWeight:700,textDecoration:"none",whiteSpace:"nowrap"}}>
              Admin
            </a>
          </div>
        </div>
      </header>

      <main style={{maxWidth:1400,margin:"0 auto",padding:"1.5rem"}} onClick={() => setShowMenu(false)}>

        {/* -- HOME -- */}
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
                    <a href="https://windmarsolaracademy.com/courses" target="_blank" rel="noreferrer"
                      style={{padding:"0.8rem 1.5rem",background:"rgba(255,255,255,0.15)",color:"white",border:"1px solid rgba(255,255,255,0.3)",borderRadius:8,fontWeight:700,fontSize:"0.95rem",textDecoration:"none"}}>
                      Training Videos
                    </a>
                  </div>
                </div>
                <div style={{display:"flex",gap:"1rem",flexWrap:"wrap"}}>
                  {[{val:posts.length||"�",lbl:"Updates"},{val:events.length||"�",lbl:"Events"},{val:giveaways.length||"�",lbl:"Active Spiffs"}].map(s => (
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

            <div style={{display:"grid",gridTemplateColumns:"repeat(auto-fit,minmax(280px,1fr))",gap:"1.5rem",marginBottom:"1.5rem"}}>
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
                    <div style={{color:"#f89b24",fontSize:"0.82rem",fontWeight:700,marginTop:"0.5rem"}}>Explore ?</div>
                  </div>
                </div>
              ))}
            </div>

            <div>
              <div style={{display:"flex",alignItems:"center",justifyContent:"space-between",marginBottom:"1rem"}}>
                <h2 style={{color:"#1a2f6e",fontSize:"1.1rem",fontWeight:800,textTransform:"uppercase",letterSpacing:"0.04em",margin:0}}>Latest Updates</h2>
                <button onClick={() => setActiveTab("feed")} style={{color:"#f89b24",fontSize:"0.85rem",fontWeight:700,background:"none",border:"none",cursor:"pointer"}}>See All ?</button>
              </div>
              {loading ? (
                <div className="loading-card">Loading updates...</div>
              ) : recentPosts.length === 0 ? (
                <div className="loading-card">No posts yet � check back soon!</div>
              ) : (
                <div className="feed-grid">
                  {recentPosts.map(post => <FeedCard key={post.id} post={post} />)}
                </div>
              )}
            </div>
          </div>
        )}

        {/* -- FEED -- */}
        {activeTab === "feed" && (
          <div style={{maxWidth:900,margin:"0 auto"}}>
            <div style={{marginBottom:"1.25rem"}}>
              <h1 style={{color:"#1a2f6e",fontSize:"1.75rem",fontWeight:800,margin:"0 0 0.25rem 0"}}>News Feed</h1>
              <p style={{color:"#6b7280",fontSize:"0.9rem",margin:0}}>Latest updates from Windmar Solar Academy</p>
            </div>
            <div className="filter-tabs">
              {["all","announcement","daily","weekly","event","giveaway","training"].map(f => (
                <button key={f} className={"filter-tab " + (feedFilter===f?"active":"")} onClick={() => setFeedFilter(f)}>
                  {f==="all"?"All":f.charAt(0).toUpperCase()+f.slice(1)}
                </button>
              ))}
            </div>
            {loading ? (
              <div className="loading-card">Loading feed...</div>
            ) : filteredPosts.length === 0 ? (
              <div className="loading-card">No posts in this category yet.</div>
            ) : (
              <div className="feed-grid">
                {filteredPosts.map(post => <FeedCard key={post.id} post={post} />)}
              </div>
            )}
          </div>
        )}

        {/* -- SPIFFS -- */}
        {activeTab === "spiffs" && (
          <div style={{maxWidth:1000,margin:"0 auto"}}>
            <div style={{background:"linear-gradient(135deg,#7c3f00 0%,#d4811a 100%)",borderRadius:16,padding:"2rem",marginBottom:"1.5rem",color:"white",position:"relative",overflow:"hidden"}}>
              <div style={{position:"absolute",right:-20,top:-20,width:200,height:200,borderRadius:"50%",background:"rgba(255,255,255,0.05)"}} />
              <h1 style={{fontSize:"2rem",fontWeight:800,margin:"0 0 0.5rem 0"}}>Active Spiffs</h1>
              <p style={{opacity:0.85,margin:0,fontSize:"1rem"}}>{giveaways.length > 0 ? giveaways.length + " spiffs running now � get after it!" : "Check back soon for new spiffs!"}</p>
            </div>
            {loading ? (
              <div className="loading-card">Loading spiffs...</div>
            ) : giveaways.length === 0 ? (
              <div className="loading-card">No active spiffs right now. Check back soon!</div>
            ) : (
              <div style={{display:"grid",gridTemplateColumns:"repeat(auto-fit,minmax(300px,1fr))",gap:"1rem"}}>
                {giveaways.map(g => (
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
                ))}
              </div>
            )}
          </div>
        )}

        {/* -- VIDEOS -- */}
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
                <a href="https://windmarsolaracademy.com/courses" target="_blank" rel="noreferrer"
                  style={{display:"inline-block",background:"#f89b24",color:"white",padding:"1rem 2.5rem",borderRadius:8,fontWeight:700,fontSize:"1.05rem",textDecoration:"none"}}>
                  Open Training Videos ?
                </a>
                <div style={{fontSize:"0.82rem",color:"#9ca3af",marginTop:"0.75rem"}}>Sign in with your GHL membership account</div>
              </div>
              {[
                {label:"Sales Training",desc:"Objection handling, pitch scripts, closing techniques"},
                {label:"Technical Training",desc:"Installation basics, system design, safety"},
                {label:"Compliance",desc:"NABCEP, permits, regulatory requirements"},
                {label:"Leadership",desc:"Team management, coaching, culture"},
              ].map((item,i) => (
                <a key={i} href="https://windmarsolaracademy.com/courses" target="_blank" rel="noreferrer"
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
                  <div style={{color:"#f89b24",fontSize:"0.82rem",fontWeight:700}}>Watch Now ?</div>
                </a>
              ))}
            </div>
          </div>
        )}

        {/* -- CALENDAR -- */}
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
                  return (
                    <div key={event.id} style={{background:"white",borderRadius:14,boxShadow:"0 2px 12px rgba(0,0,0,0.08)",border:"1px solid #f3f4f6",overflow:"hidden",display:"flex"}}>
                      <div style={{background:"linear-gradient(135deg,#1a2f6e 0%,#2a4a9e 100%)",padding:"1.5rem",display:"flex",flexDirection:"column",alignItems:"center",justifyContent:"center",minWidth:90}}>
                        <div style={{fontSize:"2rem",fontWeight:800,color:"white",lineHeight:1}}>{d.getDate()}</div>
                        <div style={{fontSize:"0.8rem",color:"#f89b24",fontWeight:700,textTransform:"uppercase"}}>{d.toLocaleDateString("en-US",{month:"short"})}</div>
                        <div style={{fontSize:"0.7rem",color:"rgba(255,255,255,0.6)",fontWeight:600}}>{d.getFullYear()}</div>
                      </div>
                      <div style={{padding:"1.25rem",flex:1}}>
                        <div style={{fontWeight:800,fontSize:"1.05rem",color:"#1f2937",marginBottom:"0.3rem"}}>{event.posts?.title}</div>
                        <div style={{fontSize:"0.85rem",color:"#6b7280",marginBottom:"0.5rem"}}>{event.posts?.excerpt}</div>
                        <div style={{display:"flex",gap:"1rem",flexWrap:"wrap",fontSize:"0.82rem",color:"#9ca3af",fontWeight:600}}>
                          <span>{d.toLocaleTimeString("en-US",{hour:"numeric",minute:"2-digit"})}</span>
                          {event.is_virtual ? <span>Virtual Event</span> : event.location && <span>?? {event.location}</span>}
                        </div>
                      </div>
                      {event.is_virtual && event.virtual_link && (
                        <div style={{padding:"1.25rem",display:"flex",alignItems:"center"}}>
                          <a href={event.virtual_link} target="_blank" rel="noreferrer"
                            style={{padding:"0.6rem 1.25rem",background:"#f89b24",color:"white",borderRadius:8,fontWeight:700,fontSize:"0.85rem",textDecoration:"none",whiteSpace:"nowrap"}}>
                            Join Event
                          </a>
                        </div>
                      )}
                    </div>
                  )
                })}
              </div>
            )}
          </div>
        )}

        {/* -- RESOURCES -- */}
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
                <div style={{color:"#f89b24",fontWeight:700,marginTop:"0.75rem",fontSize:"0.85rem"}}>Visit Site ?</div>
              </a>
              <a href="https://windmarsolaracademy.com/courses" target="_blank" rel="noreferrer"
                style={{background:"linear-gradient(135deg,#f89b24 0%,#d4811a 100%)",borderRadius:14,padding:"1.5rem",color:"white",textDecoration:"none",display:"block"}}>
                <div style={{fontWeight:800,fontSize:"1.1rem",marginBottom:"0.3rem"}}>Training Portal</div>
                <div style={{opacity:0.8,fontSize:"0.85rem"}}>GHL Membership Courses</div>
                <div style={{color:"white",fontWeight:700,marginTop:"0.75rem",fontSize:"0.85rem",opacity:0.9}}>Open Portal ?</div>
              </a>
            </div>
            <h2 style={{color:"#1a2f6e",fontSize:"1rem",fontWeight:800,textTransform:"uppercase",letterSpacing:"0.04em",marginBottom:"1rem"}}>Documents</h2>
            <div style={{display:"grid",gridTemplateColumns:"repeat(auto-fit,minmax(260px,1fr))",gap:"0.75rem"}}>
              {[
                {icon:"??",label:"Install Process Guide",meta:"PDF � Operations"},
                {icon:"??",label:"Commission Structure",meta:"PDF � Sales Team"},
                {icon:"??",label:"Customer Proposal Template",meta:"PowerPoint � Sales"},
                {icon:"??",label:"Compliance Checklist",meta:"PDF � Legal � 2025"},
                {icon:"??",label:"Territory Map � Puerto Rico",meta:"PDF � Operations"},
                {icon:"??",label:"Product Catalog 2025",meta:"PDF � Marketing"},
              ].map((doc,i) => (
                <div key={i} className="resource-card" onClick={() => showToast("Document coming soon!")}>
                  <div className="resource-icon" style={{background:"#f3f4f6"}}>{doc.icon}</div>
                  <div style={{flex:1}}>
                    <div className="resource-title">{doc.label}</div>
                    <div className="resource-meta">{doc.meta}</div>
                  </div>
                  <span style={{color:"#9ca3af"}}>?</span>
                </div>
              ))}
            </div>
          </div>
        )}

      </main>

      <nav className="mobile-nav bottom-nav">
        {[
          {id:"home",label:"Home",d:"M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z M9 22V12h6v10"},
          {id:"feed",label:"Feed",d:"M8 6h13M8 12h13M8 18h13M3 6h.01M3 12h.01M3 18h.01"},
          {id:"spiffs",label:"Spiffs",d:"M12 1v22M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6"},
          {id:"videos",label:"Videos",d:"M23 7l-7 5 7 5V7z M1 5h15a2 2 0 0 1 2 2v10a2 2 0 0 1-2 2H1z"},
          {id:"resources",label:"Docs",d:"M22 19a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h5l2 3h9a2 2 0 0 1 2 2z"},
        ].map(tab => (
          <button key={tab.id} className={"nav-item " + (activeTab===tab.id?"active":"")} onClick={() => setActiveTab(tab.id)}>
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              {tab.d.split("M").filter(Boolean).map((d,i) => <path key={i} d={"M"+d} />)}
            </svg>
            <span className="nav-label">{tab.label}</span>
          </button>
        ))}
      </nav>

      {toast && (
        <div className={"toast show"}>{toast}</div>
      )}
    </div>
  )
}
