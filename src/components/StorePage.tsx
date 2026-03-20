"use client"
import { useEffect, useState } from "react"
import StoreModal from "./StoreModal"

type Variant = { id: string; title: string; price: number; available: boolean }
type Product = { id: string; title: string; description: string; price: number; currency: string; image: string | null; imageAlt: string; variants: Variant[] }

export default function StorePage() {
  const [products, setProducts] = useState<Product[]>([])
  const [loading, setLoading] = useState(true)
  const [selected, setSelected] = useState<Product | null>(null)

  useEffect(() => {
    async function load() {
      try {
        const res = await fetch("/api/shopify/products")
        const data = await res.json()
        if (data.products) setProducts(data.products)
      } catch (err) {
        console.error("Store load error:", err)
      }
      setLoading(false)
    }
    load()
  }, [])

  return (
    <div style={{ maxWidth: 1000, margin: "0 auto", fontFamily: "Barlow,system-ui,sans-serif" }}>
      <div style={{ background: "linear-gradient(135deg,#0f1d47 0%,#1a2f6e 100%)", borderRadius: 16, padding: "2rem", marginBottom: "1.5rem", color: "white", position: "relative", overflow: "hidden" }}>
        <div style={{ position: "absolute", right: -20, top: -20, width: 200, height: 200, borderRadius: "50%", background: "rgba(248,155,36,0.08)" }} />
        <h1 style={{ fontSize: "2rem", fontWeight: 800, margin: "0 0 0.5rem 0" }}>Windmar Store</h1>
        <p style={{ opacity: 0.85, margin: 0, fontSize: "1rem" }}>Official company merch and apparel</p>
      </div>

      {loading ? (
        <div style={{ background: "white", borderRadius: 14, padding: "3rem", textAlign: "center", color: "#9ca3af", fontWeight: 600 }}>Loading products...</div>
      ) : products.length === 0 ? (
        <div style={{ background: "white", borderRadius: 14, padding: "3rem", textAlign: "center", color: "#9ca3af", fontWeight: 600 }}>No products available yet.</div>
      ) : (
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill,minmax(280px,1fr))", gap: "1.25rem" }}>
          {products.map(p => (
            <div key={p.id} onClick={() => setSelected(p)}
              style={{ background: "white", borderRadius: 14, boxShadow: "0 2px 12px rgba(0,0,0,0.08)", border: "1px solid #f3f4f6", overflow: "hidden", cursor: "pointer", transition: "transform 0.2s,box-shadow 0.2s" }}
              onMouseEnter={(e: any) => { e.currentTarget.style.transform = "translateY(-4px)"; e.currentTarget.style.boxShadow = "0 8px 32px rgba(0,0,0,0.12)" }}
              onMouseLeave={(e: any) => { e.currentTarget.style.transform = "translateY(0)"; e.currentTarget.style.boxShadow = "0 2px 12px rgba(0,0,0,0.08)" }}>
              <div style={{ background: "#f9fafb", display: "flex", alignItems: "center", justifyContent: "center", padding: "1rem" }}>
                {p.image ? (
                  <img src={p.image} alt={p.imageAlt} style={{ width: "100%", maxHeight: 340, objectFit: "contain", borderRadius: 8 }} />
                ) : (
                  <div style={{ width: "100%", height: 260, display: "flex", alignItems: "center", justifyContent: "center", background: "linear-gradient(135deg,#0f1d47,#1a2f6e)", borderRadius: 8 }}>
                    <span style={{ fontSize: "3rem" }}>👕</span>
                  </div>
                )}
              </div>
              <div style={{ padding: "1.25rem" }}>
                <div style={{ fontWeight: 800, color: "#1a2f6e", fontSize: "1.05rem", marginBottom: "0.25rem" }}>{p.title}</div>
                {p.description && (
                  <div style={{ fontSize: "0.85rem", color: "#6b7280", marginBottom: "0.75rem", lineHeight: 1.5, display: "-webkit-box", WebkitLineClamp: 2, WebkitBoxOrient: "vertical", overflow: "hidden" } as any}>
                    {p.description}
                  </div>
                )}
                <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
                  <div style={{ fontSize: "1.2rem", fontWeight: 800, color: "#1a2f6e" }}>${p.price.toFixed(2)}</div>
                  <button style={{ padding: "0.5rem 1.25rem", background: "#f89b24", color: "white", border: "none", borderRadius: 8, fontSize: "0.85rem", fontWeight: 700, cursor: "pointer", fontFamily: "Barlow,system-ui,sans-serif" }}>
                    Buy Now
                  </button>
                </div>
                {p.variants.length > 1 && (
                  <div style={{ fontSize: "0.75rem", color: "#9ca3af", marginTop: "0.4rem" }}>{p.variants.length} options available</div>
                )}
              </div>
            </div>
          ))}
        </div>
      )}

      {selected && <StoreModal product={selected} onClose={() => setSelected(null)} />}
    </div>
  )
}
