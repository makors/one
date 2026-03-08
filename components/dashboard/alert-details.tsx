'use client'

import { Alert } from "@/lib/stores/alerts"
import { Badge } from "@/components/ui/badge"
import { MapPin, Mic, MicOff, Shield, Home, Heart, AlertTriangle, Phone, Navigation, Video, Play } from "lucide-react"
import { Map as IncidentMap } from "./map"
import { cn } from "@/lib/utils"

const priorityConfig = {
  critical: { badge: "bg-red-500/10 text-red-600 border-red-200 dark:border-red-900" },
  high:     { badge: "bg-orange-500/10 text-orange-600 border-orange-200 dark:border-orange-900" },
  medium:   { badge: "bg-yellow-500/10 text-yellow-700 border-yellow-200 dark:border-yellow-900" },
}

const typeConfig = {
  "school-threat":     { label: "School Threat",     Icon: Shield },
  "domestic-violence": { label: "Domestic Violence", Icon: Home },
  "medical":           { label: "Medical",            Icon: Heart },
  "home-invasion":     { label: "Home Invasion",      Icon: AlertTriangle },
}

const statusConfig = {
  active:      { dot: "bg-red-500 animate-pulse", label: "Active" },
  stabilizing: { dot: "bg-yellow-500",            label: "Stabilizing" },
  resolved:    { dot: "bg-green-500",             label: "Resolved" },
}

function timeAgo(iso: string) {
  const diff = Math.floor((Date.now() - new Date(iso).getTime()) / 1000)
  if (diff < 60)   return `${diff}s ago`
  if (diff < 3600) return `${Math.floor(diff / 60)}m ago`
  return `${Math.floor(diff / 3600)}h ago`
}

export function AlertDetailsPanel({ alert }: { alert: Alert }) {
  const priority = priorityConfig[alert.priority]
  const type = typeConfig[alert.type]
  const status = statusConfig[alert.status]
  const { Icon } = type

  return (
    <div className="h-full flex flex-col">
      {/* Header */}
      <div className="border-b px-6 py-4 bg-background">
        <div className="flex items-center gap-2 text-xs text-muted-foreground mb-2">
          <Icon className="size-3.5" />
          <span>{type.label}</span>
          <span className="text-muted-foreground/40">•</span>
          <span className="tabular-nums">{timeAgo(alert.createdAt)}</span>
        </div>
        <h1 className="text-xl font-semibold leading-tight mb-3">{alert.summary}</h1>
        
        <div className="flex items-center gap-3 text-sm text-muted-foreground">
          <MapPin className="size-4" />
          <span>{alert.location}</span>
        </div>

        <div className="flex items-center gap-2 mt-4">
          <Badge variant="outline" className={cn("capitalize", priority.badge)}>
            {alert.priority}
          </Badge>
          <Badge variant="outline" className="gap-1.5 font-normal">
            <span className={cn("size-1.5 rounded-full", status.dot)} />
            {status.label}
          </Badge>

          {alert.safeToSpeak ? (
            <Badge variant="outline" className="gap-1.5 font-normal text-green-600 border-green-200">
              <Mic className="size-3" />
              Safe to speak
            </Badge>
          ) : (
            <Badge variant="outline" className="gap-1.5 font-normal text-muted-foreground">
              <MicOff className="size-3" />
              Silent
            </Badge>
          )}
        </div>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-y-auto">
        <div className="p-6 space-y-6">
          {/* Map */}
          <section>
            <h3 className="flex items-center gap-2 text-sm font-semibold uppercase tracking-wider text-muted-foreground mb-3">
              <Navigation className="size-4" />
              Location
            </h3>
            <IncidentMap alert={alert} className="w-full h-[220px]" />
          </section>

          {/* Video Feed Placeholder */}
          <section>
            <h3 className="flex items-center gap-2 text-sm font-semibold uppercase tracking-wider text-muted-foreground mb-3">
              <Video className="size-4" />
              Video Feed
            </h3>
            {/* Shell template for video - replace with actual video component later */}
            <div className="relative w-full aspect-video bg-muted rounded-lg border overflow-hidden group">
              {/* Video placeholder background */}
              <div className="absolute inset-0 bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900">
                {/* Grid pattern overlay */}
                <div className="absolute inset-0 opacity-10">
                  <div className="absolute inset-0" style={{
                    backgroundImage: `linear-gradient(rgba(255,255,255,.1) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,.1) 1px, transparent 1px)`,
                    backgroundSize: '40px 40px'
                  }} />
                </div>
                
                {/* Center play button */}
                <div className="absolute inset-0 flex items-center justify-center">
                  <div className="relative">
                    {/* Pulse ring */}
                    <div className="absolute inset-0 -m-4 rounded-full border-2 border-white/20 animate-ping" style={{ animationDuration: '2s' }} />
                    {/* Play button */}
                    <button className="relative w-16 h-16 rounded-full bg-white/10 backdrop-blur border border-white/20 flex items-center justify-center hover:bg-white/20 transition-colors group-hover:scale-105">
                      <Play className="size-6 text-white fill-white ml-1" />
                    </button>
                  </div>
                </div>

                {/* Corner indicators */}
                <div className="absolute top-3 left-3 flex items-center gap-2">
                  <div className="flex items-center gap-1.5">
                    <div className="w-2 h-2 rounded-full bg-red-500 animate-pulse" />
                    <span className="text-[10px] font-mono text-white/70 uppercase tracking-wider">Live</span>
                  </div>
                </div>
                
                <div className="absolute top-3 right-3">
                  <span className="text-[10px] font-mono text-white/50">CAM-01</span>
                </div>

                {/* Bottom info bar */}
                <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/60 to-transparent px-3 py-2">
                  <div className="flex items-center justify-between">
                    <span className="text-[10px] text-white/60 font-mono">00:00:00</span>
                    <span className="text-[10px] text-white/60">No signal</span>
                  </div>
                </div>
              </div>
            </div>
            <p className="text-xs text-muted-foreground mt-2">
              Video feed will appear here when available.
            </p>
          </section>

          {/* Transcript */}
          <section>
            <h3 className="flex items-center gap-2 text-sm font-semibold uppercase tracking-wider text-muted-foreground mb-4">
              <Phone className="size-4" />
              Transcript
            </h3>
            <div className="space-y-3">
              {alert.transcript.length === 0 ? (
                <p className="text-sm text-muted-foreground italic">No transcript available</p>
              ) : (
                alert.transcript.map((line, i) => (
                  <div key={i} className="flex gap-3">
                    <span className="text-xs text-muted-foreground/60 tabular-nums shrink-0 pt-0.5">
                      {new Date(line.at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' })}
                    </span>
                    <p className="text-sm text-foreground/90">{line.text}</p>
                  </div>
                ))
              )}
            </div>
          </section>
        </div>
      </div>
    </div>
  )
}
