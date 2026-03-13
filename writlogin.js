const fs = require("fs");
const content = `'use client'
import { useState } from "react"
import { createClient } from "@/lib/supabase/client"
import { useRouter } from "next/navigation"

export default function LoginPage() {
  const [email, setEmail] = useState("")
  const [password, setPassword] = useState("")
  const [error, setError] = useState("")
  const [loading, setLoading] = useState(false)
  const router = useRouter()
  const supabase = createClient()

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setError("")
    const { error } = await supabase.auth.signInWithPassword({ email, password })
    if (error) { setError(error.message); setLoading(false) }
    else { router.push("/admin") }
  }

  return (
    <div style={{minHeight:"100vh",display:"flex",alignItems:"center",justifyContent:"center",background:"linear-gradient(160deg,#0f1d47 0%,#1a2f6e 50%,#2a4a9e 100%)",fontFamily:"Barlow,system-ui,sans-serif",padding:"1rem"}}>
      <div style={{width:"100%",maxWidth:"420px"}}>

        <div style={{textAlign:"center",marginBottom:"2rem"}}>
          <div style={{display:"inline-flex",alignItems:"center",justifyContent:"center",width:72,height:72,borderRadius:"50%",background:"#f89b24",marginBottom:"1rem"}}>
            <svg width="36" height="36" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2">
              <path d="M22 10v6M2 10l10-5 10 5-10 5z"/>
              <path d="M6 12v5c3 3 9 3 12 0v-5"/>
            </svg>
          </div>
          <h1 style={{color:"white",fontSize:"1.75rem",fontWeight:800,margin:"0 0 0.25rem 0",letterSpacing:"0.01em"}}>Solar Academy</h1>
          <p style={{color:"rgba(255,255,255,0.6)",fontSize:"0.9rem",margin:0,fontWeight:600}}>Admin Portal</p>
        </div>

        <div style={{background:"white",borderRadius:20,padding:"2rem",boxShadow:"0 20px 60px rgba(0,0,0,0.3)"}}>
          <h2 style={{color:"#1a2f6e",fontSize:"1.3rem",fontWeight:800,margin:"0 0 0.25rem 0"}}>Welcome back</h2>
          <p style={{color:"#6b7280",fontSize:"0.875rem",margin:"0 0 1.5rem 0"}}>Sign in to manage the academy</p>

          {error && (
            <div style={{padding:"0.75rem 1rem",background:"#fef2f2",border:"1px solid #fecaca",borderRadius:8,color:"#dc2626",fontSize:"0.875rem",marginBottom:"1rem",fontWeight:600}}>
              {error}
            </div>
          )}

          <div style={{marginBottom:"1rem"}}>
            <label style={{display:"block",color:"#374151",fontSize:"0.8rem",fontWeight:700,marginBottom:"0.4rem",textTransform:"uppercase",letterSpacing:"0.04em"}}>Email</label>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="admin@windmar.com"
              style={{width:"100%",padding:"0.8rem 1rem",border:"1.5px solid #e5e7eb",borderRadius:8,fontSize:"1rem",fontFamily:"Barlow,system-ui,sans-serif",outline:"none",boxSizing:"border-box",color:"#1f2937"}}
            />
          </div>

          <div style={{marginBottom:"1.5rem"}}>
            <label style={{display:"block",color:"#374151",fontSize:"0.8rem",fontWeight:700,marginBottom:"0.4rem",textTransform:"uppercase",letterSpacing:"0.04em"}}>Password</label>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="Your password"
              onKeyDown={(e) => e.key === "Enter" && handleLogin(e as any)}
              style={{width:"100%",padding:"0.8rem 1rem",border:"1.5px solid #e5e7eb",borderRadius:8,fontSize:"1rem",fontFamily:"Barlow,system-ui,sans-serif",outline:"none",boxSizing:"border-box",color:"#1f2937"}}
            />
          </div>

          <button
            onClick={handleLogin}
            disabled={loading}
            style={{width:"100%",padding:"0.9rem",background:loading?"#d4811a":"#f89b24",color:"white",border:"none",borderRadius:8,fontSize:"1rem",fontWeight:700,cursor:loading?"not-allowed":"pointer",fontFamily:"Barlow,system-ui,sans-serif",letterSpacing:"0.02em",transition:"background 0.2s"}}
          >
            {loading ? "Signing in..." : "Sign In"}
          </button>

          <div style={{textAlign:"center",marginTop:"1.25rem"}}>
            <a href="/" style={{color:"#1a2f6e",fontSize:"0.85rem",fontWeight:600,textDecoration:"none"}}>
              Back to Academy App
            </a>
          </div>
        </div>

        <p style={{textAlign:"center",color:"rgba(255,255,255,0.4)",fontSize:"0.75rem",marginTop:"1.5rem",fontWeight:600}}>
          We Train You. We Value You. We Promote You.
        </p>
      </div>
    </div>
  )
}
`;
fs.writeFileSync("src/app/login/page.tsx", content, "utf8");
console.log("done - login page written");
