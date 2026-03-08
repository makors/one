'use client'

import { useState } from "react"
import { ExternalLink, MapPin, Loader2 } from "lucide-react"
import { Button } from "@/components/ui/button"
import { formatCoordinates, type LocationObjectCoords } from "@/lib/location"

type LocationMapProps = {
  location: LocationObjectCoords | null
}

function clampLatitude(value: number) {
  return Math.max(-85, Math.min(85, value))
}

function buildBoundingBox(latitude: number, longitude: number, zoom = 17) {
  const lat = clampLatitude(latitude)
  const radians = (lat * Math.PI) / 180
  const worldWidthInDegrees = 360 / Math.pow(2, zoom)
  const lngDelta = worldWidthInDegrees * 2.4
  const latDelta = worldWidthInDegrees * Math.cos(radians) * 1.8

  return {
    minLng: longitude - lngDelta,
    minLat: lat - latDelta,
    maxLng: longitude + lngDelta,
    maxLat: lat + latDelta,
  }
}

function buildSatelliteImageUrl(latitude: number, longitude: number) {
  const bbox = buildBoundingBox(latitude, longitude)

  return [
    "https://services.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/export",
    `?bbox=${bbox.minLng},${bbox.minLat},${bbox.maxLng},${bbox.maxLat}`,
    "&bboxSR=4326",
    "&imageSR=4326",
    "&size=1200,900",
    "&format=jpg",
    "&f=image",
  ].join("")
}

function buildOpenStreetMapUrl(latitude: number, longitude: number) {
  return `https://www.openstreetmap.org/?mlat=${latitude}&mlon=${longitude}#map=18/${latitude}/${longitude}`
}

export default function LocationMap({ location }: LocationMapProps) {
  const [loaded, setLoaded] = useState(false)

  if (!location) {
    return (
      <div className="relative flex-1 overflow-hidden bg-muted/30">
        <div className="absolute inset-0 flex items-center justify-center p-6">
          <div className="space-y-2 text-center">
            <MapPin className="mx-auto size-8 text-muted-foreground/20" />
            <p className="text-xs text-muted-foreground/50">No location available</p>
          </div>
        </div>
      </div>
    )
  }

  const { latitude, longitude } = location
  const coordinateLabel = formatCoordinates(location)
  const imageUrl = buildSatelliteImageUrl(latitude, longitude)
  const mapsUrl = buildOpenStreetMapUrl(latitude, longitude)

  return (
    <div className="relative flex-1 overflow-hidden bg-muted/30">
      {/* Loading placeholder */}
      {!loaded && (
        <div className="absolute inset-0 flex items-center justify-center">
          <Loader2 className="size-5 text-muted-foreground/30 animate-spin" />
        </div>
      )}

      <img
        alt={`Satellite map for ${coordinateLabel}`}
        src={imageUrl}
        referrerPolicy="no-referrer"
        onLoad={() => setLoaded(true)}
        className={`absolute inset-0 h-full w-full object-cover transition-opacity duration-500 ${loaded ? "opacity-100" : "opacity-0"}`}
      />

      {/* Overlays — only show after image loads */}
      <div className={`transition-opacity duration-500 ${loaded ? "opacity-100" : "opacity-0"}`}>
        <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_center,transparent_0%,transparent_48%,rgba(0,0,0,0.18)_100%)]" />
        <div className="pointer-events-none absolute inset-x-0 top-0 h-28 bg-gradient-to-b from-black/55 via-black/15 to-transparent" />
        <div className="pointer-events-none absolute inset-x-0 bottom-0 h-24 bg-gradient-to-t from-black/35 via-black/10 to-transparent" />

        <div className="pointer-events-none absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-full">
          <div className="relative">
            <div className="absolute left-1/2 top-[22px] h-10 w-10 -translate-x-1/2 rounded-full bg-red-500/25 blur-md" />
            <div className="relative flex h-11 w-11 items-center justify-center rounded-full border border-white/45 bg-red-500 text-white shadow-[0_10px_30px_rgba(0,0,0,0.35)]">
              <MapPin className="size-5 fill-current" />
            </div>
            <div className="absolute left-1/2 top-full h-3 w-px -translate-x-1/2 bg-white/70" />
          </div>
        </div>

        <div className="absolute left-4 top-4 right-4 flex items-start justify-between gap-3">
          <div />
          <Button
            asChild
            size="sm"
            variant="secondary"
            className="border border-white/15 bg-black/55 text-white shadow-lg shadow-black/20 backdrop-blur-md hover:bg-black/70"
          >
            <a
              href={mapsUrl}
              target="_blank"
              rel="noreferrer"
              className="pointer-events-auto"
            >
              Open map
              <ExternalLink className="size-3.5" />
            </a>
          </Button>
        </div>
      </div>
    </div>
  )
}
