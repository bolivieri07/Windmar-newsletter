import StorePage from "@/components/StorePage"

export const metadata = {
  title: "Windmar Store - Official Merch & Apparel",
  description: "Shop official Windmar Solar + Roofing merchandise and apparel.",
}

export default function StoreSharePage() {
  return (
    <div style={{ minHeight: "100vh", background: "#f9fafb", fontFamily: "Barlow,system-ui,sans-serif" }}>
      <header style={{ background: "linear-gradient(135deg,#0f1d47 0%,#1a2f6e 100%)", padding: "0 1.5rem", display: "flex", alignItems: "center", justifyContent: "space-between", height: 64, boxShadow: "0 2px 16px rgba(0,0,0,0.25)" }}>
        <div style={{ display: "flex", alignItems: "center", gap: "0.75rem" }}>
          <img src="https://assets.cdn.filesafe.space/eTTRenV5nD46gQbZ5A9E/media/6304e4828eb5d962dab34923.png" alt="Windmar" style={{ height: 40 }} />
          <div>
            <span style={{ color: "#f89b24", fontWeight: 800, fontSize: "1rem" }}>WINDMAR</span>
            <span style={{ color: "white", fontWeight: 800, fontSize: "1rem" }}> STORE</span>
          </div>
        </div>
        <a href="/" style={{ padding: "0.5rem 1rem", background: "rgba(255,255,255,0.1)", color: "white", borderRadius: 6, fontSize: "0.82rem", fontWeight: 700, textDecoration: "none" }}>
          Solar Academy
        </a>
      </header>
      <main style={{ maxWidth: 1400, margin: "0 auto", padding: "1.5rem" }}>
        <StorePage />
      </main>
      <footer style={{ textAlign: "center", padding: "2rem", color: "#9ca3af", fontSize: "0.78rem", fontWeight: 600 }}>
        Windmar Solar + Roofing
      </footer>
    </div>
  )
}
