import DashboardHeader from "@/components/dashboard/header"

export default function DashboardLayout({
    children,
}: {
    children: React.ReactNode
}) {
    return (
        <div className="flex h-dvh flex-col"> {/* h-dvh is sourced by codex, debug debug debug! */}
            <DashboardHeader />
            <main className="min-h-0 flex-1">{children}</main> {/* horrible workaround... */}
        </div>
    )
}