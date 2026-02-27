"use client"

import { AppSidebar } from "@/components/app-sidebar"

interface DashboardShellProps {
  children: React.ReactNode
  userRole: string
}

export function DashboardShell({ children, userRole }: DashboardShellProps) {
  return (
    <div className="flex h-screen overflow-hidden">
      <AppSidebar userRole={userRole} />
      <main className="flex-1 overflow-y-auto bg-background">
        <div className="mx-auto max-w-6xl p-6">{children}</div>
      </main>
    </div>
  )
}
