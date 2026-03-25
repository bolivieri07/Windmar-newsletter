'use client'
import { useState } from "react"
import { createClient } from "@/lib/supabase/client"

export default function CreateAdminPage() {
  const [email, setEmail] = useState("")
  const [password, setPassword] = useState("")
  const [confirmPassword, setConfirmPassword] = useState("")
  const [loading, setLoading] = useState(false)
  const [toast, setToast] = useState<{ msg: string; type: "success" | "error" } | null>(null)

  function showToast(msg: string, type: "success" | "error") {
    setToast({ msg, type })
    setTimeout(() => setToast(null), 4000)
  }

  async function handleCreate(e: React.FormEvent) {
    e.preventDefault()

    if (!email.trim() || !password.trim()) {
      showToast("Email and password are required", "error")
      return
    }
    if (password.length < 6) {
      showToast("Password must be at least 6 characters", "error")
      return
    }
    if (password !== confirmPassword) {
      showToast("Passwords do not match", "error")
      return
    }

    setLoading(true)
    try {
      const res = await fetch("/api/admin/create-user", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: email.trim(), password }),
      })
      const data = await res.json()

      if (!res.ok) {
        showToast(data.error || "Failed to create admin", "error")
      } else {
        showToast(`Admin account created for ${email}`, "success")
        setEmail("")
        setPassword("")
        setConfirmPassword("")
      }
    } catch (err: any) {
      showToast(err.message || "Something went wrong", "error")
    }
    setLoading(false)
  }

  const inputStyle = {
    width: "100%", padding: "0.8rem 1rem", border: "1.5px solid #e5e7eb",
    borderRadius: 8, fontSize: "0.95rem", fontFamily: "Barlow,system-ui,sans-serif",
    outline: "none", color: "#1f2937", boxSizing: "border-box" as const, background: "white",
  }

  const labelStyle = {
    display: "block", color: "#374151", fontSize: "0.78rem", fontWeight: 700,
    marginBottom: "0.4rem", textTransform: "uppercase" as const, letterSpacing: "0.04em",
  }

  return (
    <div style={{ maxWidth: 500, margin: "0 auto" }}>
      {toast && (
        <div style={{
          position: "fixed", top: 20, right: 20, zIndex: 9999,
          padding: "12px 20px", borderRadius: 8, fontSize: 14, fontWeight: 700,
          background: toast.type === "success" ? "#15803d" : "#dc2626",
          color: "white", boxShadow: "0 4px 12px rgba(0,0,0,0.2)",
        }}>
          {toast.msg}
        </div>
      )}

      <div style={{ marginBottom: "1.5rem" }}>
        <h1 style={{ color: "#1a2f6e", fontSize: "1.75rem", fontWeight: 800, margin: "0 0 0.25rem 0" }}>Create Admin</h1>
        <p style={{ color: "#6b7280", fontSize: "0.9rem", margin: 0 }}>Add a new admin user to the portal</p>
      </div>

      <div style={{
        background: "white", borderRadius: 14, padding: "2rem",
        boxShadow: "0 2px 12px rgba(0,0,0,0.08)", border: "1px solid #f3f4f6",
      }}>
        <form onSubmit={handleCreate}>
          <div style={{ marginBottom: "1rem" }}>
            <label style={labelStyle}>Email *</label>
            <input type="email" value={email} onChange={(e) => setEmail(e.target.value)}
              required placeholder="newadmin@windmarhome.com" style={inputStyle}
              onFocus={(e) => e.currentTarget.style.borderColor = "#1a2f6e"}
              onBlur={(e) => e.currentTarget.style.borderColor = "#e5e7eb"} />
          </div>

          <div style={{ marginBottom: "1rem" }}>
            <label style={labelStyle}>Password *</label>
            <input type="password" value={password} onChange={(e) => setPassword(e.target.value)}
              required placeholder="Min 6 characters" style={inputStyle}
              onFocus={(e) => e.currentTarget.style.borderColor = "#1a2f6e"}
              onBlur={(e) => e.currentTarget.style.borderColor = "#e5e7eb"} />
          </div>

          <div style={{ marginBottom: "1.5rem" }}>
            <label style={labelStyle}>Confirm Password *</label>
            <input type="password" value={confirmPassword} onChange={(e) => setConfirmPassword(e.target.value)}
              required placeholder="Re-enter password" style={inputStyle}
              onFocus={(e) => e.currentTarget.style.borderColor = "#1a2f6e"}
              onBlur={(e) => e.currentTarget.style.borderColor = "#e5e7eb"} />
          </div>

          <button type="submit" disabled={loading}
            style={{
              width: "100%", padding: "0.8rem", background: loading ? "#9ca3af" : "#1a2f6e",
              color: "white", border: "none", borderRadius: 8, fontSize: "0.95rem",
              fontWeight: 700, cursor: loading ? "not-allowed" : "pointer",
              fontFamily: "Barlow,system-ui,sans-serif", opacity: loading ? 0.7 : 1,
            }}>
            {loading ? "Creating..." : "Create Admin Account"}
          </button>
        </form>
      </div>
    </div>
  )
}
