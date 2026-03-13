const fs = require("fs");
const content = `'use client'
import { useEffect, useState } from "react"
import { createClient } from "@/lib/supabase/client"
import { useRouter, usePathname } from "next/navigation"
import Link from "next/link"

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<any>(null)
  const [loading, setLoading] = useState(true)
  const [sidebarOpen, setSidebarOpen] = useState(false)
  const router = useRouter()
  const pathname = usePathname()
  const supabase = createClient()

  useEffect(() => {
    const getUser = async () => {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) { router.push("/login") } else { setUser(user) }
      setLoading(false)
    }
    getUser()
  }, [])

  const handleLogout = async () => {
    await supabase.auth.signOut()
    router.push("/login")
  }

  if (loading) {
    return (
      <div style={{minHeight:"100vh",display:"flex",alignItems:"center",justifyContent:"center",background:"#0f1d47",flexDirection:"column",gap:"1rem"}}>
        <div style={{width:48,height:48,borderRadius:"50%",background:"#f89b24",display:"flex",alignItems:"center",justifyContent:"center"}}>
          <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2">
            <path d="M22 10v6M2 10l10-5 10 5-10 5z"/>
          </svg>
        </div>
        <div style={{color:"rgba(255,255,255,0.5)",fontSize:"0.9rem",fontWeight:600}}>Loading...</div>
      </div>
    )
  }

  const navItems = [
    { label:"Dashboard", href:"/admin", icon:<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><rect x="3" y="3" width="7" height="7"/><rect x="14" y="3" width="7" height="7"/><rect x="14" y="14" width="7" height="7"/><rect x="3" y="14" width="7" height="7"/></svg> },
    { label:"Create Post", href:"/admin/posts/new", icon:<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg> },
    { label:"All Posts", href:"/admin/posts", icon:<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><line x1="8" y1="6" x2="21" y2="6"/><line x1="8" y1="12" x2="21" y2="12"/><line x1="8" y1="18" x2="21" y2="18"/><line x1="3" y1="6" x2="3.01" y2="6"/><line x1="3" y1="12" x2="3.01" y2="12"/><line x1="3" y1="18" x2="3.01" y2="18"/></svg> },
    { label:"Spiffs", href:"/admin/spiffs", icon:<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><line x1="12" y1="1" x2="12" y2="23"/><path d="M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6"/></svg> },
    { label:"Events", href:"/admin/events", icon:<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><rect x="3" y="4" width="18" height="18" rx="2" ry="2"/><line x1="16" y1="2" x2="16" y2="6"/><line x1="8" y1="2" x2="8" y2="6"/><line x1="3" y1="10" x2="21" y2="10"/></svg> },
    { label:"Messages", href:"/admin/messages", icon:<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/></svg> },
  ]

  const isActive = (href: string) => href === "/admin" ? pathname === "/admin" : pathname.startsWith(href)

  const Sidebar = () => (
    <div style={{width:240,background:"#0f1d47",height:"100%",display:"flex",flexDirection:"column",borderRight:"1px solid rgba(255,255,255,0.08)"}}>
      <div style={{padding:"1.25rem 1rem",borderBottom:"1px solid rgba(255,255,255,0.08)"}}>
        <div style={{display:"flex",alignItems:"center",gap:"0.6rem"}}>
          <div style={{width:36,height:36,borderRadius:"50%",background:"#f89b24",display:"flex",alignItems:"center",justifyContent:"center",flexShrink:0}}>
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2">
              <path d="M22 10v6M2 10l10-5 10 5-10 5z"/>
            </svg>
          </div>
          <div>
            <div style={{color:"white",fontWeight:800,fontSize:"0.95rem",lineHeight:1.2}}>Solar Academy</div>
            <div style={{color:"rgba(255,255,255,0.4)",fontSize:"0.7rem",fontWeight:600}}>Admin Portal</div>
          </div>
        </div>
      </div>

      <nav style={{flex:1,padding:"0.75rem 0",overflowY:"auto"}}>
        {navItems.map(item => (
          <Link key={item.href} href={item.href}
            onClick={() => setSidebarOpen(false)}
            style={{display:"flex",alignItems:"center",gap:"0.75rem",padding:"0.75rem 1.25rem",color:isActive(item.href)?"white":"rgba(255,255,255,0.55)",background:isActive(item.href)?"rgba(248,155,36,0.15)":"transparent",textDecoration:"none",fontSize:"0.88rem",fontWeight:600,borderRight:isActive(item.href)?"3px solid #f89b24":"3px solid transparent",transition:"all 0.15s"}}>
            <span style={{color:isActive(item.href)?"#f89b24":"rgba(255,255,255,0.4)"}}>{item.icon}</span>
            {item.label}
          </Link>
        ))}
      </nav>

      <div style={{padding:"1rem",borderTop:"1px solid rgba(255,255,255,0.08)"}}>
        <div style={{color:"rgba(255,255,255,0.4)",fontSize:"0.75rem",fontWeight:600,marginBottom:"0.5rem",overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap"}}>
          {user?.email}
        </div>
        <div style={{display:"flex",gap:"0.5rem"}}>
          <Link href="/" style={{flex:1,padding:"0.6rem",background:"rgba(255,255,255,0.08)",color:"rgba(255,255,255,0.6)",border:"none",borderRadius:6,fontSize:"0.78rem",cursor:"pointer",textDecoration:"none",textAlign:"center",fontWeight:600}}>
            View App
          </Link>
          <button onClick={handleLogout} style={{flex:1,padding:"0.6rem",background:"rgba(220,38,38,0.15)",color:"#fca5a5",border:"none",borderRadius:6,fontSize:"0.78rem",cursor:"pointer",fontWeight:600}}>
            Sign Out
          </button>
        </div>
      </div>
    </div>
  )

  return (
    <div style={{minHeight:"100vh",display:"flex",flexDirection:"column",fontFamily:"Barlow,system-ui,sans-serif",background:"#f9fafb"}}>

      <div style={{display:"flex",alignItems:"center",justifyContent:"space-between",padding:"0.75rem 1rem",background:"#0f1d47",borderBottom:"1px solid rgba(255,255,255,0.08)",position:"sticky",top:0,zIndex:200}}>
        <div style={{display:"flex",alignItems:"center",gap:"0.75rem"}}>
          <button onClick={() => setSidebarOpen(!sidebarOpen)} style={{background:"rgba(255,255,255,0.1)",border:"none",borderRadius:8,width:36,height:36,display:"flex",alignItems:"center",justifyContent:"center",cursor:"pointer",color:"white"}}>
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <line x1="3" y1="6" x2="21" y2="6"/><line x1="3" y1="12" x2="21" y2="12"/><line x1="3" y1="18" x2="21" y2="18"/>
            </svg>
          </button>
          <div>
            <span style={{color:"#f89b24",fontWeight:800,fontSize:"1rem"}}>SOLAR</span>
            <span style={{color:"white",fontWeight:800,fontSize:"1rem"}}> ACADEMY</span>
            <span style={{color:"rgba(255,255,255,0.4)",fontSize:"0.75rem",fontWeight:600,marginLeft:"0.5rem"}}>Admin</span>
          </div>
        </div>
        <div style={{display:"flex",alignItems:"center",gap:"0.5rem"}}>
          <Link href="/" style={{padding:"0.5rem 0.75rem",background:"rgba(255,255,255,0.1)",color:"white",borderRadius:6,fontSize:"0.78rem",fontWeight:600,textDecoration:"none"}}>
            View App
          </Link>
          <button onClick={handleLogout} style={{padding:"0.5rem 0.75rem",background:"rgba(220,38,38,0.2)",color:"#fca5a5",border:"none",borderRadius:6,fontSize:"0.78rem",fontWeight:600,cursor:"pointer"}}>
            Sign Out
          </button>
        </div>
      </div>

      <div style={{display:"flex",flex:1,position:"relative"}}>

        {sidebarOpen && (
          <div onClick={() => setSidebarOpen(false)} style={{position:"fixed",inset:0,background:"rgba(0,0,0,0.5)",zIndex:150}} />
        )}

        <div style={{position:"fixed",top:0,left:0,height:"100vh",zIndex:160,transform:sidebarOpen?"translateX(0)":"translateX(-100%)",transition:"transform 0.25s ease",paddingTop:52}}>
          <Sidebar />
        </div>

        <div style={{display:"none"}} className="desktop-sidebar">
          <Sidebar />
        </div>

        <main style={{flex:1,padding:"1.5rem",maxWidth:"100%",overflowX:"hidden"}}>
          {children}
        </main>
      </div>

      <style>{
        \`@media (min-width: 768px) {
          .desktop-sidebar { display: flex !important; position: sticky; top: 52px; height: calc(100vh - 52px); flex-shrink: 0; }
        }\`
      }</style>
    </div>
  )
}
`;
fs.writeFileSync("src/app/admin/layout.tsx", content, "utf8");
console.log("done - admin layout written");
