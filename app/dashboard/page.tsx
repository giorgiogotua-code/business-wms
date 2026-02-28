"use client"

import { useRouter } from "next/navigation"
import Link from "next/link"
import useSWR from "swr"
import { createClient } from "@/lib/supabase/client"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Package, TrendingUp, TrendingDown, DollarSign } from "lucide-react"
import { cn } from "@/lib/utils"
import { SalesTrendChart } from "@/components/dashboard/SalesTrendChart"
import { TopProductsChart } from "@/components/dashboard/TopProductsChart"
import { aggregateDailyData, getTopProducts } from "@/lib/analytics"

const supabase = createClient()

async function fetchDashboardData() {
  const [productsRes, transactionsRes] = await Promise.all([
    supabase.from("products").select("*, categories(name)"),
    supabase.from("transactions").select("*, products(name)"),
  ])

  const products = productsRes.data || []
  const transactions = transactionsRes.data || []

  const totalProducts = products.length
  const totalStock = products.reduce((sum, p) => sum + (p.quantity || 0), 0)
  const lowStockCount = products.filter((p) => p.quantity <= p.low_stock_threshold).length

  const totalPurchases = transactions
    .filter((t) => t.type === "purchase")
    .reduce((sum, t) => sum + Number(t.total_amount), 0)

  const totalSales = transactions
    .filter((t) => t.type === "sale")
    .reduce((sum, t) => sum + Number(t.total_amount), 0)

  const dailyTrend = aggregateDailyData(transactions, 30)
  const topProducts = getTopProducts(transactions, 5)

  return {
    totalProducts,
    totalStock,
    lowStockCount,
    totalPurchases,
    totalSales,
    balance: totalSales - totalPurchases,
    dailyTrend,
    topProducts,
  }
}

export default function DashboardPage() {
  const { data, isLoading } = useSWR("dashboard-data", fetchDashboardData)
  const router = useRouter()

  const stats = [
    {
      label: "პროდუქტები",
      value: data?.totalProducts || 0,
      suffix: "",
      icon: Package,
      color: "text-primary",
      href: "/dashboard/inventory",
    },
    {
      label: "მთლიანი სტოკი",
      value: data?.totalStock || 0,
      suffix: "",
      icon: Package,
      color: "text-emerald-500",
      href: "/dashboard/inventory",
    },
    {
      label: "შესყიდვები",
      value: `${(data?.totalPurchases || 0).toFixed(2)}`,
      suffix: " ₾",
      icon: TrendingDown,
      color: "text-destructive",
      href: "/dashboard/accounting",
    },
    {
      label: "გაყიდვები",
      value: `${(data?.totalSales || 0).toFixed(2)}`,
      suffix: " ₾",
      icon: TrendingUp,
      color: "text-success",
      href: "/dashboard/accounting",
    },
    {
      label: "ბალანსი",
      value: `${(data?.balance || 0).toFixed(2)}`,
      suffix: " ₾",
      icon: DollarSign,
      color: "text-emerald-600",
      href: "/dashboard/accounting",
    },
    {
      label: "დაბალი მარაგი",
      value: data?.lowStockCount || 0,
      suffix: "",
      icon: Package,
      color: "text-warning",
      href: "/dashboard/inventory",
    },
  ]

  return (
    <div className="flex flex-col gap-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-foreground">{"მთავარი"}</h1>
      </div>

      {isLoading ? (
        <div className="grid grid-cols-2 gap-4 lg:grid-cols-3">
          {Array.from({ length: 6 }).map((_, i) => (
            <Card key={i} className="animate-pulse">
              <CardContent className="flex flex-col items-center gap-2 p-6">
                <div className="h-8 w-8 rounded-full bg-muted" />
                <div className="h-4 w-24 rounded bg-muted" />
                <div className="h-6 w-16 rounded bg-muted" />
              </CardContent>
            </Card>
          ))}
        </div>
      ) : (
        <>
          <div className="grid grid-cols-2 gap-4 lg:grid-cols-3">
            {stats.map((stat) => (
              <Link key={stat.label} href={stat.href}>
                <Card className="hover:bg-accent/50 transition-colors cursor-pointer group">
                  <CardContent className="flex flex-col items-center gap-2 p-6">
                    <stat.icon className={cn("h-8 w-8 transition-transform group-hover:scale-110", stat.color)} />
                    <p className="text-xs sm:text-sm text-muted-foreground">{stat.label}</p>
                    <p className={cn("text-lg sm:text-xl font-bold", stat.color)}>
                      {stat.value}
                      {stat.suffix}
                    </p>
                  </CardContent>
                </Card>
              </Link>
            ))}
          </div>

          <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
            <SalesTrendChart data={data?.dailyTrend || []} />
            <TopProductsChart data={data?.topProducts || []} />
          </div>
        </>
      )}
    </div>
  )
}


