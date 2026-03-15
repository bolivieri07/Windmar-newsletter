"use client"
import { MapContainer, TileLayer, CircleMarker, Popup, useMapEvents, useMap, Marker } from "react-leaflet"
import { useState, useEffect } from "react"
import L from "leaflet"
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

type NewPin = { lat: number; lng: number }

const userIcon = L.divIcon({
  className: "",
  html: '<div style="width:18px;height:18px;border-radius:50%;background:#3b82f6;border:3px solid white;box-shadow:0 0 10px rgba(59,130,246,0.6)"></div>',
  iconSize: [18, 18],
  iconAnchor: [9, 9],
})

const newPinIcon = L.divIcon({
  className: "",
  html: '<div style="width:20px;height:20px;border-radius:50%;background:#dc2626;border:3px solid white;box-shadow:0 0 12px rgba(220,38,38,0.5);animation:pulse 1.5s infinite"></div><style>@keyframes pulse{0%,100%{transform:scale(1)}50%{transform:scale(1.3)}}</style>',
  iconSize: [20, 20],
  iconAnchor: [10, 10],
})

function ClickHandler({ onMapClick }: { onMapClick: (lat: number, lng: number) => void }) {
  useMapEvents({ click(e) { onMapClick(e.latlng.lat, e.latlng.lng) } })
  return null
}

function LocationMarker({ position }: { position: [number, number] | null }) {
  if (!position) return null
  return <Marker position={position} icon={userIcon} />
}

function FlyToLocation({ position }: { position: [number, number] | null }) {
  const map = useMap()
  useEffect(() => {
    if (position) map.flyTo(position, 17, { duration: 1.5 })
  }, [position])
  return null
}

export default function LeadMap({ leads, onSelectLead, onMapClick, newPin, userLocation, flyTo }: {
  leads: MapLead[]
  onSelectLead: (lead: MapLead) => void
  onMapClick?: (lat: number, lng: number) => void
  newPin?: NewPin | null
  userLocation?: [number, number] | null
  flyTo?: [number, number] | null
}) {
  const validLeads = leads.filter(l => l.lat && l.lng && l.lat !== 0 && l.lng !== 0)
  const centerLat = userLocation ? userLocation[0] : validLeads.length > 0 ? validLeads.reduce((s, l) => s + l.lat, 0) / validLeads.length : 28.0
  const centerLng = userLocation ? userLocation[1] : validLeads.length > 0 ? validLeads.reduce((s, l) => s + l.lng, 0) / validLeads.length : -81.7

  return (
    <MapContainer center={[centerLat, centerLng]} zoom={userLocation ? 17 : 12} style={{height:"100%",width:"100%",borderRadius:14,minHeight:500}} scrollWheelZoom={true} zoomControl={true}>
      <TileLayer
        attribution='Tiles &copy; Esri'
        url="https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}"
      />
      <TileLayer
        url="https://server.arcgisonline.com/ArcGIS/rest/services/Reference/World_Transportation/MapServer/tile/{z}/{y}/{x}"
        opacity={0.7}
      />
      <TileLayer
        url="https://server.arcgisonline.com/ArcGIS/rest/services/Reference/World_Boundaries_and_Places/MapServer/tile/{z}/{y}/{x}"
        opacity={0.8}
      />
      {onMapClick && <ClickHandler onMapClick={onMapClick} />}
      <LocationMarker position={userLocation || null} />
      <FlyToLocation position={flyTo || null} />
      {validLeads.map(lead => (
        <CircleMarker key={lead.id} center={[lead.lat, lead.lng]} radius={8}
          pathOptions={{ fillColor: lead.statusColor, color: "#fff", weight: 2, fillOpacity: 0.9 }}
          eventHandlers={{ click: () => onSelectLead(lead) }}>
          <Popup>
            <div style={{fontFamily:"Barlow,system-ui,sans-serif",minWidth:180}}>
              <div style={{fontWeight:800,fontSize:"0.95rem",color:"#1f2937",marginBottom:"0.25rem"}}>{lead.firstName} {lead.lastName}</div>
              <div style={{display:"inline-flex",alignItems:"center",gap:"0.25rem",padding:"0.15rem 0.5rem",borderRadius:12,fontSize:"0.72rem",fontWeight:700,background:lead.statusColor,color:"white",marginBottom:"0.4rem"}}>{lead.status}</div>
              <div style={{fontSize:"0.82rem",color:"#6b7280"}}>{lead.address}</div>
              {lead.city && <div style={{fontSize:"0.82rem",color:"#6b7280"}}>{lead.city}, {lead.state}</div>}
              {lead.phone && <div style={{fontSize:"0.82rem",color:"#1a2f6e",fontWeight:600,marginTop:"0.3rem"}}>{lead.phone}</div>}
              <div style={{fontSize:"0.78rem",color:"#9ca3af",marginTop:"0.25rem"}}>Rep: {lead.ownerName}</div>
            </div>
          </Popup>
        </CircleMarker>
      ))}
      {newPin && <Marker position={[newPin.lat, newPin.lng]} icon={newPinIcon} />}
    </MapContainer>
  )
}
