"use client"
import { useState } from "react"

type Variant = { id: string; title: string; price: number; available: boolean }
type Product = { id: string; title: string; description: string; price: number; currency: string; image: string | null; imageAlt: string; variants: Variant[] }

export default function StoreModal({ product, onClose }: { product: Product; onClose: () => void }) {
  const [selected, setSelected] = useState<Variant>(product.variants[0])
  const [loading, setLoading] = useState(false)
  const [errMsg, setErrMsg] = useState("")

  async function handleBuy() {
    if (!selected?.available) return
    setLoading(true)
    setErrMsg("")
    try {
      const res = await fetch("/api/shopify/checkout", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ variantId: selected.id, quantity: 1 }),
      })
      const data = await res.json()
      if (data.checkoutUrl) {
        window.open(data.checkoutUrl, "_blank")
        onClose()
      } else {
        setErrMsg(data.error || "Could not create checkout")
      }
    } catch {
      setErrMsg("Something went wrong")
    }
    setLoading(false)
  }

  return (
    <div style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.5)", zIndex: 400, display: "flex", alignItems: "center", justifyContent: "center", padding: "1rem" }}
      onClick={onClose}>
      <div onClick={e => e.stopPropagation()}
        style={{ background: "white", borderRadius: 16, maxWidth: 480, width: "100%", boxShadow: "0 16px 64px rgba(0,0,0,0.2)", overflow: "hidden", maxHeight: "90vh", overflowY: "auto" }}>

        {product.image && (
          <div style={{ height: 220, overflow: "hidden", background: "#f3f4f6" }}>
            <img src={product.image} alt={product.imageAlt} style={{ width: "100%", height: "100%", objectFit: "cover" }} />
          </div>
        )}

        <div style={{ background: "linear-gradient(135deg,#0f1d47 0%,#1a2f6e 100%)", padding: "1.25rem 1.5rem", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
          <div style={{ color: "white", fontWeight: 800, fontSize: "1.1rem", fontFamily: "Barlow,system-ui,sans-serif" }}>{product.title}</div>
          <button onClick={onClose} style={{ background: "rgba(255,255,255,0.15)", border: "none", borderRadius: 8, width: 32, height: 32, cursor: "pointer", color: "white", fontWeight: 700, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 20 }}>×</button>
        </div>

        <div style={{ padding: "1.5rem", fontFamily: "Barlow,system-ui,sans-serif" }}>
          {product.description && (
            <p style={{ color: "#6b7280", fontSize: "0.9rem", lineHeight: 1.6, marginBottom: "1.25rem", margin: "0 0 1.25rem 0" }}>{product.description}</p>
          )}

          {product.variants.length > 1 && (
            <div style={{ marginBottom: "1.25rem" }}>
              <div style={{ fontSize: "0.78rem", fontWeight: 700, color: "#374151", textTransform: "uppercase", letterSpacing: "0.04em", marginBottom: "0.5rem" }}>Select Option</div>
              <div style={{ display: "flex", gap: "0.5rem", flexWrap: "wrap" }}>
                {product.variants.map(v => (
                  <button key={v.id} onClick={() => v.available && setSelected(v)}
                    style={{ padding: "0.5rem 1rem", borderRadius: 8, border: "1.5px solid", fontFamily: "Barlow,system-ui,sans-serif", fontSize: "0.85rem", fontWeight: 700,
                      cursor: v.available ? "pointer" : "not-allowed",
                      borderColor: selected?.id === v.id ? "#1a2f6e" : "#e5e7eb",
                      background: selected?.id === v.id ? "#1a2f6e" : v.available ? "white" : "#f9fafb",
                      color: selected?.id === v.id ? "white" : v.available ? "#1f2937" : "#9ca3af",
                      opacity: v.available ? 1 : 0.5 }}>
                    {v.title}
                  </button>
                ))}
              </div>
            </div>
          )}

          <div style={{ fontSize: "1.5rem", fontWeight: 800, color: "#1a2f6e", marginBottom: "1.25rem" }}>
            ${selected?.price?.toFixed(2)}{" "}
            <span style={{ fontSize: "0.85rem", color: "#9ca3af", fontWeight: 600 }}>{product.currency}</span>
          </div>

          {errMsg && (
            <div style={{ marginBottom: "1rem", padding: "0.75rem", background: "#fef2f2", border: "1.5px solid #fecaca", borderRadius: 8, color: "#dc2626", fontSize: "0.85rem", fontWeight: 600 }}>{errMsg}</div>
          )}

          <div style={{ display: "flex", gap: "0.75rem" }}>
            <button onClick={handleBuy} disabled={loading || !selected?.available}
              style={{ flex: 1, padding: "0.8rem", background: !selected?.available ? "#9ca3af" : "#f89b24", color: "white", border: "none", borderRadius: 8, fontSize: "0.95rem", fontWeight: 700, cursor: loading ? "not-allowed" : "pointer", opacity: loading ? 0.7 : 1, fontFamily: "Barlow,system-ui,sans-serif" }}>
              {loading ? "Loading..." : !selected?.available ? "Out of Stock" : "Buy Now →"}
            </button>
            <button onClick={onClose}
              style={{ padding: "0.8rem 1.25rem", background: "white", color: "#6b7280", border: "1.5px solid #e5e7eb", borderRadius: 8, fontSize: "0.95rem", fontWeight: 700, cursor: "pointer", fontFamily: "Barlow,system-ui,sans-serif" }}>
              Cancel
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}
