"use client"

import { UserButton } from "@clerk/nextjs"
import { DotIcon } from "lucide-react"

import { useIncidentsStore } from "@/lib/stores/alerts"

import { Badge } from "../ui/badge"
import OneLogo from "../ui/logo"
import { cn } from "@/lib/utils"

export default function DashboardHeader() {
  const alerts = useIncidentsStore((state) => state.alerts)
  const activeAlerts = alerts.filter((a) => a.status === "active");

  return (
    <div className="relative flex items-center justify-between border-b px-8 py-4">
      <OneLogo />
      <div className="flex items-center gap-2">
        <UserButton />
      </div>
    </div>
  )
}
