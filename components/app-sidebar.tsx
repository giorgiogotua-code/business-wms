"use client"

import { useState } from "react"
import Link from "next/link"
import { usePathname, useRouter } from "next/navigation"
import { createClient } from "@/lib/supabase/client"
import {
  Home,
  ShoppingCart,
  TrendingUp,
  Package,
  FileText,
  Settings,
  LogOut,
  ChevronLeft,
  ChevronRight,
  Sun,
  Moon,
  Truck,
  Receipt,
} from "lucide-react"
import { cn } from "@/lib/utils"
import { Button } from "@/components/ui/button"
import { useTheme } from "next-themes"
import { TetrisLogo } from "@/components/tetris-logo"

interface AppSidebarProps {
  userRole: string
}

const allNavItems = [
  { href: "/dashboard", label: "მთავარი", icon: Home, roles: ["admin", "cashier", "accountant"] },
  { href: "/dashboard/waybills", label: "ზედნადებები", icon: Truck, roles: ["admin", "cashier", "accountant"] },
  { href: "/dashboard/invoices", label: "ფაქტურები", icon: Receipt, roles: ["admin", "accountant"] },
  { href: "/dashboard/purchases", label: "შესყიდვა", icon: ShoppingCart, roles: ["admin", "cashier"] },
  { href: "/dashboard/sales", label: "გაყიდვა", icon: TrendingUp, roles: ["admin", "cashier"] },
  { href: "/dashboard/inventory", label: "ნაშთი", icon: Package, roles: ["admin", "cashier", "accountant"] },
  { href: "/dashboard/suppliers", label: "მომწოდებლები", icon: Truck, roles: ["admin", "cashier", "accountant"] },
  { href: "/dashboard/accounting", label: "ბუღალტერია", icon: FileText, roles: ["admin", "accountant"] },
  { href: "/dashboard/settings", label: "პარამეტრები", icon: Settings, roles: ["admin", "accountant"] },
  { href: "/dashboard/admin", label: "ადმინ პანელი", icon: Settings, roles: ["admin"] },
]

export function AppSidebar({ userRole }: AppSidebarProps) {
  const [collapsed, setCollapsed] = useState(false)
  const pathname = usePathname()
  const router = useRouter()
  const supabase = createClient()
  const { theme, setTheme } = useTheme()

  const navItems = allNavItems.filter((item) => item.roles.includes(userRole))

  async function handleLogout() {
    await supabase.auth.signOut()
    router.push("/auth/login")
    router.refresh()
  }

  return (
    <aside
      className={cn(
        "relative flex h-screen flex-col border-r border-sidebar-border bg-sidebar text-sidebar-foreground transition-all duration-300",
        collapsed ? "w-[68px]" : "w-[260px]"
      )}
    >
      {/* Header */}
      <div className="flex items-center justify-center border-b border-sidebar-border h-24 overflow-hidden relative">
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 scale-[0.4]">
          <TetrisLogo />
        </div>
      </div>

      {/* Toggle */}
      <button
        onClick={() => setCollapsed(!collapsed)}
        className="absolute -right-3 top-16 flex h-6 w-6 items-center justify-center rounded-full border border-sidebar-border bg-sidebar text-sidebar-foreground hover:bg-sidebar-accent"
        aria-label={collapsed ? "გახსნა" : "დაკეცვა"}
      >
        {collapsed ? <ChevronRight className="h-3 w-3" /> : <ChevronLeft className="h-3 w-3" />}
      </button>

      {/* Navigation */}
      <nav className="flex flex-1 flex-col gap-1 overflow-y-auto p-3">
        {navItems.map((item) => {
          const isActive = pathname === item.href || (item.href !== "/dashboard" && pathname.startsWith(item.href))
          return (
            <Link
              key={item.href}
              href={item.href}
              className={cn(
                "flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-colors",
                isActive
                  ? "bg-sidebar-accent text-sidebar-accent-foreground"
                  : "text-sidebar-foreground/70 hover:bg-sidebar-accent/50 hover:text-sidebar-foreground"
              )}
            >
              <item.icon className="h-5 w-5 shrink-0" />
              {!collapsed && <span>{item.label}</span>}
            </Link>
          )
        })}
      </nav>

      {/* Footer */}
      <div className="border-t border-sidebar-border p-3 flex flex-col gap-1">
        <Button
          variant="ghost"
          onClick={() => setTheme(theme === "dark" ? "light" : "dark")}
          className={cn(
            "w-full justify-start gap-3 text-sidebar-foreground",
            collapsed && "justify-center px-0"
          )}
        >
          {theme === "dark" ? (
            <Sun className="h-5 w-5 shrink-0" />
          ) : (
            <Moon className="h-5 w-5 shrink-0" />
          )}
          {!collapsed && <span>{theme === "dark" ? "ნათელი" : "ბნელი"}</span>}
        </Button>
        <Button
          variant="ghost"
          onClick={handleLogout}
          className={cn(
            "w-full justify-start gap-3 text-red-400 hover:bg-red-500/10 hover:text-red-300",
            collapsed && "justify-center px-0"
          )}
        >
          <LogOut className="h-5 w-5 shrink-0" />
          {!collapsed && <span>{"გასვლა"}</span>}
        </Button>
      </div>
    </aside>
  )
}
