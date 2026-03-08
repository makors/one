'use client'

import { Alert } from "@/lib/stores/alerts"
import { cn } from "@/lib/utils"
import { MapContainer, TileLayer, Marker, Popup, Circle, useMap } from "react-leaflet"
import { Icon } from "leaflet"
import { useEffect, useState } from "react"

// Fix for default marker icon in Leaflet with Next.js
const markerIcon = new Icon({
  iconUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png",
  iconRetinaUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png",
  shadowUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png",
  iconSize: [25, 41],
  iconAnchor: [12, 41],
  popupAnchor: [1, -34],
  shadowSize: [41, 41],
})

const priorityColors = {
  critical: "#ef4444",
  high: "#f97316",
  medium: "#eab308",
}

// Component to handle map resize when container changes
function MapResizer() {
  const map = useMap()
  
  useEffect(() => {
    // Small delay to ensure container has final size
    const timer = setTimeout(() => {
      map.invalidateSize()
    }, 100)
    
    // Also invalidate on window resize
    const handleResize = () => map.invalidateSize()
    window.addEventListener('resize', handleResize)
    
    return () => {
      clearTimeout(timer)
      window.removeEventListener('resize', handleResize)
    }
  }, [map])
  
  return null
}

export function RealMap({ alert, className }: { alert: Alert; className?: string }) {
  const position: [number, number] = [alert.lat, alert.lng]
  const color = priorityColors[alert.priority]
  const accuracyRadius = alert.priority === 'critical' ? 100 : 
                         alert.priority === 'high' ? 200 : 300
  const [mounted, setMounted] = useState(false)

  // Only render map on client to avoid hydration issues
  useEffect(() => {
    setMounted(true)
  }, [])

  if (!mounted) {
    return (
      <div className={cn("relative overflow-hidden rounded-lg border bg-muted flex items-center justify-center", className)}>
        <div className="text-muted-foreground text-sm">Loading map...</div>
      </div>
    )
  }

  return (
    <div className={cn("relative overflow-hidden rounded-lg border", className)}>
      <MapContainer
        center={position}
        zoom={15}
        scrollWheelZoom={false}
        className="h-full w-full"
        zoomControl={false}
      >
        <MapResizer />
        
        {/* ESRI World Imagery (Satellite) - free to use */}
        <TileLayer
          attribution='Tiles &copy; Esri &mdash; Source: Esri, i-cubed, USDA, USGS, AEX, GeoEye, Getmapping, Aerogrid, IGN, IGP, UPR-EGP, and the GIS User Community'
          url="https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}"
        />
        
        <Circle 
          center={position}
          radius={accuracyRadius}
          pathOptions={{ 
            color: color, 
            fillColor: color, 
            fillOpacity: 0.15,
            weight: 2,
            dashArray: '5, 5',
          }}
        />
        
        <Marker position={position} icon={markerIcon}>
          <Popup>
            <div className="p-1">
              <p className="font-semibold text-sm">{alert.location.split('—')[0]?.trim()}</p>
              <p className="text-xs text-gray-500 mt-0.5 capitalize">{alert.priority} priority</p>
              <p className="text-xs text-gray-400 mt-0.5">Accuracy: ±{accuracyRadius}m</p>
            </div>
          </Popup>
        </Marker>
      </MapContainer>
      
      {/* GPS Status overlay */}
      <div className="absolute top-0 left-0 right-0 bg-white/95 dark:bg-black/90 backdrop-blur px-3 py-2 flex items-center justify-between text-xs z-[1000] pointer-events-none">
        <div className="flex items-center gap-2">
          <div className="w-2 h-2 rounded-full bg-green-500 animate-pulse" />
          <span className="font-mono text-muted-foreground">LIVE GPS</span>
        </div>
        <span className="font-mono text-muted-foreground">
          {alert.lat.toFixed(4)}° N, {Math.abs(alert.lng).toFixed(4)}° W
        </span>
      </div>

      {/* Location info card */}
      <div className="absolute bottom-3 left-3 bg-white/95 dark:bg-black/90 backdrop-blur rounded-lg shadow-md p-3 max-w-[200px] z-[1000]">
        <p className="text-xs font-semibold truncate">{alert.location.split('—')[0]?.trim()}</p>
        <p className="text-[10px] text-muted-foreground mt-1">Accuracy: ±{accuracyRadius}m</p>
        <div className="flex items-center gap-1 mt-1">
          <div 
            className="w-1.5 h-1.5 rounded-full" 
            style={{ backgroundColor: color }}
          />
          <span className="text-[10px] text-muted-foreground capitalize">{alert.priority} priority</span>
        </div>
      </div>

      {/* Zoom controls - visual only for now */}
      <div className="absolute bottom-3 right-3 bg-white/95 dark:bg-black/90 backdrop-blur rounded-lg shadow-md overflow-hidden z-[1000]">
        <button 
          className="w-8 h-8 flex items-center justify-center hover:bg-muted border-b border-border text-lg font-bold transition-colors cursor-default"
          type="button"
        >
          +
        </button>
        <button 
          className="w-8 h-8 flex items-center justify-center hover:bg-muted text-lg font-bold transition-colors cursor-default"
          type="button"
        >
          −
        </button>
      </div>
    </div>
  )
}
