'use client';

import { useState } from "react"
import { useAlertsStore, AlertStatus } from "@/lib/stores/alerts"
import { useAlertStream } from "@/hooks/use-alert-stream"
import AlertCard from "@/components/dashboard/alert-card"
import AlertDetail from "@/components/dashboard/alert-detail"
import {
    Empty,
    EmptyDescription,
    EmptyHeader,
    EmptyMedia,
    EmptyTitle,
} from "@/components/ui/empty"
import { CircleAlert, MousePointerClick } from "lucide-react";
import { cn } from "@/lib/utils";

const tabs = [
    { key: "active", label: "Active" },
    { key: "resolved", label: "Resolved" },
] as const;

export default function DashboardPage() {
    useAlertStream(); // subscribe to SSE for live alerts
    const [activeTab, setActiveTab] = useState<AlertStatus>("active");
    const [selectedId, setSelectedId] = useState<string | null>(null);
    const alerts = useAlertsStore((state) => state.alerts);
    const filteredAlerts = alerts.filter((alert) => alert.status === activeTab);
    const selectedAlert = selectedId ? alerts.find((a) => a.id === selectedId) : null;

    const counts = {
        active: alerts.filter((a) => a.status === "active").length,
        resolved: alerts.filter((a) => a.status === "resolved").length,
    };

    // AI helped with the tabs system, but other than that, all us :-)

    return (
        <div className="flex h-full">
            {/* Left panel — alert list */}
            <div className="flex flex-col h-full w-full shrink-0 border-r md:w-80 lg:w-96 overflow-y-auto">
                <div className="w-full sticky top-0 bg-background z-10">
                    <div className="flex items-center border-b">
                        {tabs.map((tab) => (
                            <button
                                key={tab.key}
                                onClick={() => setActiveTab(tab.key)}
                                className={cn(
                                    "relative flex-1 px-4 py-3 text-xs font-medium tracking-wide transition-colors",
                                    "hover:text-foreground",
                                    activeTab === tab.key
                                        ? "text-foreground"
                                        : "text-muted-foreground/60"
                                )}
                            >
                                <span className="flex items-center justify-center gap-1.5">
                                    {tab.label}
                                    {counts[tab.key] > 0 && (
                                        <span className={cn(
                                            "inline-flex items-center justify-center rounded-full px-1.5 min-w-[1.125rem] h-[1.125rem] text-[10px] font-semibold tabular-nums",
                                            activeTab === tab.key
                                                ? "bg-foreground text-background"
                                                : "bg-muted text-muted-foreground"
                                        )}>
                                            {counts[tab.key]}
                                        </span>
                                    )}
                                </span>
                                {activeTab === tab.key && (
                                    <span className="absolute bottom-0 left-0 right-0 h-px bg-foreground" />
                                )}
                            </button>
                        ))}
                    </div>
                </div>
                {filteredAlerts.length === 0 ? (
                    <Empty className="h-full">
                        <EmptyHeader>
                            <EmptyMedia variant="icon">
                                <CircleAlert className="size-10 bg-[oklch(0.145_0_0)]" />
                            </EmptyMedia>
                            <EmptyTitle>No {activeTab} alerts</EmptyTitle>
                            <EmptyDescription className="max-w-xs text-pretty">
                                {activeTab === "active"
                                    ? "You're all caught up. New alerts will appear here."
                                    : "No resolved alerts yet."}
                            </EmptyDescription>
                        </EmptyHeader>
                    </Empty>
                ) : (
                    filteredAlerts.map((alert) => (
                        <AlertCard
                            key={alert.id}
                            alert={alert}
                            selected={alert.id === selectedId}
                            onClick={() => setSelectedId(alert.id)}
                        />
                    ))
                )}
            </div>

            {/* Right panel — detail */}
            <div className="hidden md:flex flex-1 min-w-0 h-full">
                {selectedAlert ? (
                    <div className="flex-1 min-w-0 h-full">
                        <AlertDetail alert={selectedAlert} />
                    </div>
                ) : (
                    <Empty className="flex-1">
                        <EmptyHeader>
                            <EmptyMedia variant="icon">
                                <MousePointerClick className="size-10 bg-[oklch(0.145_0_0)]" />
                            </EmptyMedia>
                            <EmptyTitle>Select an alert</EmptyTitle>
                            <EmptyDescription className="max-w-xs text-pretty">
                                Choose an alert from the list to view its full details, transcript, and questions.
                            </EmptyDescription>
                        </EmptyHeader>
                    </Empty>
                )}
            </div>
        </div>
    )
}
