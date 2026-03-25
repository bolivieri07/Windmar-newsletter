'use client'
import { useState } from "react"

type ViewMode = "day" | "week" | "month"

interface EventDateFilterProps {
  onFilterChange: (start: Date, end: Date, view: ViewMode) => void
}

export default function EventDateFilter({ onFilterChange }: EventDateFilterProps) {
  const [view, setView] = useState<ViewMode>("week")
  const [anchor, setAnchor] = useState(() => {
    const now = new Date()
    now.setHours(0, 0, 0, 0)
    return now
  })
  const [pickerOpen, setPickerOpen] = useState(false)
  const [pickerValue, setPickerValue] = useState("")

  function getWeekStart(date: Date): Date {
    const d = new Date(date)
    d.setDate(d.getDate() - d.getDay())
    d.setHours(0, 0, 0, 0)
    return d
  }

  function getMonthStart(date: Date): Date {
    return new Date(date.getFullYear(), date.getMonth(), 1)
  }

  function getRange(v: ViewMode, d: Date): [Date, Date] {
    if (v === "day") {
      const s = new Date(d); s.setHours(0, 0, 0, 0)
      const e = new Date(d); e.setHours(23, 59, 59, 999)
      return [s, e]
    }
    if (v === "week") {
      const s = getWeekStart(d)
      const e = new Date(s); e.setDate(e.getDate() + 6); e.setHours(23, 59, 59, 999)
      return [s, e]
    }
    const s = getMonthStart(d)
    const e = new Date(s.getFullYear(), s.getMonth() + 1, 0, 23, 59, 59, 999)
    return [s, e]
  }

  function navigate(dir: number) {
    const d = new Date(anchor)
    if (view === "day") d.setDate(d.getDate() + dir)
    else if (view === "week") d.setDate(d.getDate() + dir * 7)
    else d.setMonth(d.getMonth() + dir)
    d.setHours(0, 0, 0, 0)
    setAnchor(d)
    const [s, e] = getRange(view, d)
    onFilterChange(s, e, view)
  }

  function changeView(v: ViewMode) {
    setView(v)
    const [s, e] = getRange(v, anchor)
    onFilterChange(s, e, v)
  }

  function goToday() {
    const now = new Date(); now.setHours(0, 0, 0, 0)
    setAnchor(now)
    const [s, e] = getRange(view, now)
    onFilterChange(s, e, view)
  }

  function pickDate(val: string) {
    if (!val) return
    const d = new Date(val + "T00:00:00")
    setAnchor(d)
    setPickerOpen(false)
    setPickerValue(val)
    const [s, e] = getRange(view, d)
    onFilterChange(s, e, view)
  }

  function formatLabel(): string {
    const [start, end] = getRange(view, anchor)
    const opts: Intl.DateTimeFormatOptions = { month: "short", day: "numeric" }
    if (view === "day") {
      return anchor.toLocaleDateString("en-US", { weekday: "long", month: "long", day: "numeric", year: "numeric" })
    }
    if (view === "week") {
      const s = start.toLocaleDateString("en-US", opts)
      const e = end.toLocaleDateString("en-US", { ...opts, year: "numeric" })
      return `${s} - ${e}`
    }
    return anchor.toLocaleDateString("en-US", { month: "long", year: "numeric" })
  }

  // Fire initial filter on mount
  useState(() => {
    const [s, e] = getRange("week", anchor)
    onFilterChange(s, e, "week")
  })

  const btnBase = {
    padding: "0.4rem 0.9rem", borderRadius: 8, fontSize: "0.82rem", fontWeight: 700,
    cursor: "pointer", fontFamily: "Barlow,system-ui,sans-serif", transition: "all 0.15s",
  }

  return (
    <div style={{ background: "white", borderRadius: 12, padding: "0.75rem 1rem", boxShadow: "0 2px 8px rgba(0,0,0,0.06)", border: "1px solid #f3f4f6", marginBottom: "1.25rem" }}>
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", flexWrap: "wrap", gap: "0.75rem" }}>

        {/* View toggles */}
        <div style={{ display: "flex", gap: "0.35rem", background: "#f3f4f6", borderRadius: 8, padding: 3 }}>
          {([["day", "Day"], ["week", "Week"], ["month", "Month"]] as [ViewMode, string][]).map(([v, label]) => (
            <button key={v} onClick={() => changeView(v)}
              style={{
                ...btnBase,
                border: "none",
                background: view === v ? "white" : "transparent",
                color: view === v ? "#1a2f6e" : "#6b7280",
                boxShadow: view === v ? "0 1px 4px rgba(0,0,0,0.1)" : "none",
              }}>
              {label}
            </button>
          ))}
        </div>

        {/* Navigation */}
        <div style={{ display: "flex", alignItems: "center", gap: "0.5rem" }}>
          <button onClick={() => navigate(-1)}
            style={{ ...btnBase, border: "1.5px solid #e5e7eb", background: "white", color: "#374151", width: 34, height: 34, padding: 0, display: "flex", alignItems: "center", justifyContent: "center" }}>
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><polyline points="15 18 9 12 15 6" /></svg>
          </button>

          <button onClick={goToday}
            style={{ ...btnBase, border: "1.5px solid #e5e7eb", background: "white", color: "#1a2f6e" }}>
            Today
          </button>

          <button onClick={() => navigate(1)}
            style={{ ...btnBase, border: "1.5px solid #e5e7eb", background: "white", color: "#374151", width: 34, height: 34, padding: 0, display: "flex", alignItems: "center", justifyContent: "center" }}>
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><polyline points="9 18 15 12 9 6" /></svg>
          </button>

          <div style={{ fontWeight: 800, color: "#1a2f6e", fontSize: "0.95rem", marginLeft: "0.25rem", whiteSpace: "nowrap" }}>
            {formatLabel()}
          </div>
        </div>

        {/* Date picker */}
        <div style={{ position: "relative" }}>
          <button onClick={() => setPickerOpen(!pickerOpen)}
            style={{ ...btnBase, border: "1.5px solid #e5e7eb", background: "white", color: "#6b7280", display: "flex", alignItems: "center", gap: "0.4rem" }}>
            <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <rect x="3" y="4" width="18" height="18" rx="2" /><line x1="16" y1="2" x2="16" y2="6" /><line x1="8" y1="2" x2="8" y2="6" /><line x1="3" y1="10" x2="21" y2="10" />
            </svg>
            Pick Date
          </button>
          {pickerOpen && (
            <div style={{ position: "absolute", top: "100%", right: 0, marginTop: 6, zIndex: 50, background: "white", borderRadius: 10, padding: "0.75rem", boxShadow: "0 8px 32px rgba(0,0,0,0.15)", border: "1px solid #e5e7eb" }}>
              <input type="date" value={pickerValue} onChange={(e) => pickDate(e.target.value)} autoFocus
                style={{ padding: "0.5rem", border: "1.5px solid #e5e7eb", borderRadius: 8, fontSize: "0.9rem", fontFamily: "Barlow,system-ui,sans-serif", outline: "none" }} />
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
