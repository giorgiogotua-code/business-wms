"use client"

import useSWR from "swr"
import { createClient } from "@/lib/supabase/client"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Package, TrendingUp, TrendingDown, DollarSign, BarChart3, LineChart as LineChartIcon } from "lucide-react"
import { cn } from "@/lib/utils"
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  BarChart,
  Bar,
  Legend,
  Cell,
} from "recharts"

const supabase = createClient()

async function fetchDashboardData() {
  const [productsRes, transactionsRes] = await Promise.all([
    supabase.from("products").select("*"),
    supabase.from("transactions").select("*"),
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

  // Trend data (last 7 days)
  const last7Days = Array.from({ length: 7 }).map((_, i) => {
    const d = new Date()
    d.setDate(d.getDate() - (6 - i))
    return d.toISOString().split("T")[0]
  })

  const trendData = last7Days.map((date) => {
    const dayTransactions = transactions.filter((t) => t.created_at.startsWith(date))
    const sales = dayTransactions
      .filter((t) => t.type === "sale")
      .reduce((s, t) => s + Number(t.total_amount), 0)
    const purchases = dayTransactions
      .filter((t) => t.type === "purchase")
      .reduce((s, t) => s + Number(t.total_amount), 0)
    return {
      date: new Date(date).toLocaleDateString("ka-GE", { day: "numeric", month: "short" }),
      "გაყიდვა": sales,
      "შესყიდვა": purchases,
    }
  })

  // Top products data
  const productSales: Record<string, { name: string; amount: number }> = {}
  transactions
    .filter((t) => t.type === "sale")
    .forEach((t) => {
      const pId = t.product_id
      if (!productSales[pId]) {
        // Fallback for missing product relation in this fetch
        productSales[pId] = { name: "უცნობი", amount: 0 }
      }
      productSales[pId].amount += Number(t.total_amount)
    })

  // To get names, we need products map
  const productsMap = new Map(products.map(p => [p.id, p.name]))
  const topProductsData = Object.entries(productSales)
    .map(([id, data]) => ({
      name: productsMap.get(id) || "უცნობი",
      amount: data.amount,
    }))
    .sort((a, b) => b.amount - a.amount)
    .slice(0, 5)

  return {
    totalProducts,
    totalStock,
    lowStockCount,
    totalPurchases,
    totalSales,
    balance: totalSales - totalPurchases,
    trendData,
    topProductsData,
  }
}

export default function DashboardPage() {
  const { data, isLoading } = useSWR("dashboard-data", fetchDashboardData)

  const stats = [
    {
      label: "პროდუქტები",
      value: data?.totalProducts || 0,
      suffix: "",
      icon: Package,
      color: "text-primary",
    },
    {
      label: "მთლიანი სტოკი",
      value: data?.totalStock || 0,
      suffix: "",
      icon: Package,
      color: "text-chart-3",
    },
    {
      label: "შესყიდვები",
      value: `${(data?.totalPurchases || 0).toFixed(2)}`,
      suffix: " \u20BE",
      icon: TrendingDown,
      color: "text-destructive",
    },
    {
      label: "გაყიდვები",
      value: `${(data?.totalSales || 0).toFixed(2)}`,
      suffix: " \u20BE",
      icon: TrendingUp,
      color: "text-success",
    },
    {
      label: "ბალანსი",
      value: `${(data?.balance || 0).toFixed(2)}`,
      suffix: " \u20BE",
      icon: DollarSign,
      color: "text-chart-3",
    },
    {
      label: "დაბალი მარაგი",
      value: data?.lowStockCount || 0,
      suffix: "",
      icon: Package,
      color: "text-warning",
    },
  ]

  return (
    <div>
      <h1 className="mb-6 text-2xl font-bold text-foreground">{"მთავარი"}</h1>

      {isLoading ? (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
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
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {stats.map((stat) => (
            <Card key={stat.label}>
              <CardContent className="flex flex-col items-center gap-2 p-6">
                <stat.icon className={cn("h-8 w-8", stat.color)} />
                <p className="text-sm text-muted-foreground">{stat.label}</p>
                <p className={cn("text-xl font-bold", stat.color)}>
                  {stat.value}
                  {stat.suffix}
                </p>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {!isLoading && (
        <div className="mt-6 grid grid-cols-1 gap-6 lg:grid-cols-2">
          {/* Trend Chart */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-lg">
                <LineChartIcon className="h-5 w-5 text-primary" />
                {"ტრენდები (ბოლო 7 დღე)"}
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="h-[300px] w-full mt-4">
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart data={data?.trendData}>
                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="hsl(var(--border))" />
                    <XAxis
                      dataKey="date"
                      fontSize={12}
                      tickLine={false}
                      axisLine={false}
                      stroke="hsl(var(--muted-foreground))"
                    />
                    <YAxis
                      fontSize={12}
                      tickLine={false}
                      axisLine={false}
                      stroke="hsl(var(--muted-foreground))"
                      tickFormatter={(value) => `${value}\u20BE`}
                    />
                    <Tooltip
                      contentStyle={{
                        backgroundColor: "hsl(var(--background))",
                        border: "1px solid hsl(var(--border))",
                        borderRadius: "8px"
                      }}
                      itemStyle={{ fontSize: "12px" }}
                    />
                    <Legend iconType="circle" />
                    <Line
                      type="monotone"
                      dataKey="გაყიდვა"
                      stroke="hsl(var(--success))"
                      strokeWidth={3}
                      dot={{ r: 4, fill: "hsl(var(--success))" }}
                      activeDot={{ r: 6 }}
                    />
                    <Line
                      type="monotone"
                      dataKey="შესყიდვა"
                      stroke="hsl(var(--destructive))"
                      strokeWidth={3}
                      dot={{ r: 4, fill: "hsl(var(--destructive))" }}
                      activeDot={{ r: 6 }}
                    />
                  </LineChart>
                </ResponsiveContainer>
              </div>
            </CardContent>
          </Card>

          {/* Top Products Chart */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-lg">
                <BarChart3 className="h-5 w-5 text-primary" />
                {"ტოპ 5 პროდუქტი (გაყიდვებით)"}
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="h-[300px] w-full mt-4">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={data?.topProductsData} layout="vertical">
                    <CartesianGrid strokeDasharray="3 3" horizontal={false} stroke="hsl(var(--border))" />
                    <XAxis
                      type="number"
                      fontSize={12}
                      tickLine={false}
                      axisLine={false}
                      stroke="hsl(var(--muted-foreground))"
                      tickFormatter={(value) => `${value}\u20BE`}
                    />
                    <YAxis
                      dataKey="name"
                      type="category"
                      fontSize={12}
                      tickLine={false}
                      axisLine={false}
                      stroke="hsl(var(--muted-foreground))"
                      width={100}
                    />
                    <Tooltip
                      cursor={{ fill: "hsl(var(--muted)/0.2)" }}
                      contentStyle={{
                        backgroundColor: "hsl(var(--background))",
                        border: "1px solid hsl(var(--border))",
                        borderRadius: "8px"
                      }}
                    />
                    <Bar dataKey="amount" name="ჯამი" radius={[0, 4, 4, 0]}>
                      {data?.topProductsData.map((_, index) => (
                        <Cell key={`cell-${index}`} fill={`hsl(var(--primary) / ${1 - index * 0.15})`} />
                      ))}
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </CardContent>
          </Card>
        </div>
      )}
    </div>
  )
}


