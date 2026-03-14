"use client"
import { MapContainer, TileLayer, CircleMarker, Popup, useMapEvents } from "react-leaflet"
import { useState } from "react"
import "leaflet/dist/leaflet.css"

type MapLead = {
  id: string
  firstName: string
  lastName: string
  address: string
  city: string
  state: string
  status: string
  statusColor: string
  lat: number
  lng: number
  ownerName: string
  phone: string
  email: string
}

type NewPin = {
  lat: number
  lng: number
}

function ClickHandler({ onMapClick }: { onMapClick: (lat: number, lng: number) => void }) {
  useMapEvents({
    click(e) {
      onMapClick(e.latlng.lat, e.latlng.lng)
    },
  })
  return null
}

export default function LeadMap({ leads, onSelectLead, onMapClick, newPin }: {
  leads: MapLead[],
  onSelectLead: (lead: MapLead) => void,
  onMapClick?: (lat: number, lng: number) => void,
  newPin?: NewPin | null,
}) {
  const validLeads = leads.filter(l => l.lat && l.lng && l.lat !== 0 && l.lng !== 0)

  if (validLeads.length === 0 && !newPin) {
    return (
      <div style={{height:500,display:"flex",alignItems:"center",justifyContent:"center",flexDirection:"column",gap:"0.5rem",background:"#e8edf8",borderRadius:14}}>
        <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="#9ca3af" strokeWidth="1.5"><path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z"/><circle cx="12" cy="10" r="3"/></svg>
        <div style={{color:"#9ca3af",fontWeight:600}}>Tap anywhere on the map to drop a pin</div>
        <div style={{color:"#c4c4c4",fontSize:"0.82rem"}}>Or pull leads from SalesRabbit</div>
      </div>
    )
  }

  const allLats = [...validLeads.map(l => l.lat), ...(newPin ? [newPin.lat] : [])]
  const allLngs = [...validLeads.map(l => l.lng), ...(newPin ? [newPin.lng] : [])]
  const avgLat = allLats.length > 0 ? allLats.reduce((s, v) => s + v, 0) / allLats.length : 18.2
  const avgLng = allLngs.length > 0 ? allLngs.reduce((s, v) => s + v, 0) / allLngs.length : -66.5

  return (
    <MapContainer center={[avgLat, avgLng]} zoom={12} style={{height:500,width:"100%",borderRadius:14}} scrollWheelZoom={true}>
      <TileLayer
        attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
        url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
      />
      {onMapClick && <ClickHandler onMapClick={onMapClick} />}
      {validLeads.map(lead => (
        <CircleMarker
          key={lead.id}
          center={[lead.lat, lead.lng]}
          radius={8}
          pathOptions={{ fillColor: lead.statusColor, color: "#fff", weight: 2, fillOpacity: 0.9 }}
          eventHandlers={{ click: () => onSelectLead(lead) }}
        >
          <Popup>
            <div style={{fontFamily:"Barlow,system-ui,sans-serif",minWidth:180}}>
              <div style={{fontWeight:800,fontSize:"0.95rem",color:"#1f2937",marginBottom:"0.25rem"}}>{lead.firstName} {lead.lastName}</div>
              <div style={{display:"inline-flex",alignItems:"center",gap:"0.25rem",padding:"0.15rem 0.5rem",borderRadius:12,fontSize:"0.72rem",fontWeight:700,background:lead.statusColor,color:"white",marginBottom:"0.4rem"}}>
                {lead.status}
              </div>
              <div style={{fontSize:"0.82rem",color:"#6b7280"}}>{lead.address}</div>
              {lead.city && <div style={{fontSize:"0.82rem",color:"#6b7280"}}>{lead.city}, {lead.state}</div>}
              {lead.phone && <div style={{fontSize:"0.82rem",color:"#1a2f6e",fontWeight:600,marginTop:"0.3rem"}}>{lead.phone}</div>}
              <div style={{fontSize:"0.78rem",color:"#9ca3af",marginTop:"0.25rem"}}>Rep: {lead.ownerName}</div>
            </div>
          </Popup>
        </CircleMarker>
      ))}
      {newPin && (
        <CircleMarker
          center={[newPin.lat, newPin.lng]}
          radius={10}
          pathOptions={{ fillColor: "#dc2626", color: "#fff", weight: 3, fillOpacity: 1 }}
        >
          <Popup>
            <div style={{fontFamily:"Barlow,system-ui,sans-serif",fontWeight:700,color:"#dc2626"}}>New Pin - Fill out the form</div>
          </Popup>
        </CircleMarker>
      )}
    </MapContainer>
  )
}
