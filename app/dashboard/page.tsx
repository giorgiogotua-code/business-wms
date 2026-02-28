"use client"

import { useRouter } from "next/navigation"
import Link from "next/link"
import useSWR from "swr"
import { createClient } from "@/lib/supabase/client"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Package, TrendingUp, TrendingDown, DollarSign, BarChart3, LineChart as LineChartIcon, PieChart as PieChartIcon } from "lucide-react"
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
  PieChart,
  Pie,
} from "recharts"

const supabase = createClient()

async function fetchDashboardData() {
  const [productsRes, transactionsRes, categoriesRes] = await Promise.all([
    supabase.from("products").select("*"),
    supabase.from("transactions").select("*"),
    supabase.from("categories").select("*"),
  ])

  const products = productsRes.data || []
  const transactions = transactionsRes.data || []
  const categories = categoriesRes.data || []

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
      "მოგება": sales - purchases,
    }
  })

  // Product helper maps
  const productsMap = new Map(products.map(p => [p.id, p]))
  const catsMap = new Map(categories.map(c => [c.id, c.name]))

  // Top products data
  const productSales: Record<string, { name: string; amount: number }> = {}
  transactions
    .filter((t) => t.type === "sale")
    .forEach((t) => {
      const pId = t.product_id
      if (!productSales[pId]) {
        productSales[pId] = { name: productsMap.get(pId)?.name || "უცნობი", amount: 0 }
      }
      productSales[pId].amount += Number(t.total_amount)
    })

  const topProductsData = Object.entries(productSales)
    .map(([_, data]) => data)
    .sort((a, b) => b.amount - a.amount)
    .slice(0, 5)

  // Category sales distribution
  const categorySales: Record<string, number> = {}
  transactions
    .filter((t) => t.type === "sale")
    .forEach((t) => {
      const product = productsMap.get(t.product_id)
      const catId = product?.category_id || "uncategorized"
      categorySales[catId] = (categorySales[catId] || 0) + Number(t.total_amount)
    })

  const categoryPieData = Object.entries(categorySales).map(([id, amount]) => ({
    name: id === "uncategorized" ? "სხვა" : catsMap.get(id) || "სხვა",
    value: amount,
  }))

  return {
    totalProducts,
    totalStock,
    lowStockCount,
    totalPurchases,
    totalSales,
    balance: totalSales - totalPurchases,
    trendData,
    topProductsData,
    categoryPieData,
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
      suffix: " \u20BE",
      icon: TrendingDown,
      color: "text-destructive",
      href: "/dashboard/accounting",
    },
    {
      label: "გაყიდვები",
      value: `${(data?.totalSales || 0).toFixed(2)}`,
      suffix: " \u20BE",
      icon: TrendingUp,
      color: "text-success",
      href: "/dashboard/accounting",
    },
    {
      label: "ბალანსი",
      value: `${(data?.balance || 0).toFixed(2)}`,
      suffix: " \u20BE",
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

  const COLORS = ["#10b981", "#3b82f6", "#f59e0b", "#ef4444", "#8b5cf6"]

  return (
    <div>
      <h1 className="mb-6 text-2xl font-bold text-foreground">{"მთავარი"}</h1>

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
                      stroke="#10b981"
                      strokeWidth={3}
                      dot={{ r: 4, fill: "#10b981" }}
                      activeDot={{ r: 6 }}
                    />
                    <Line
                      type="monotone"
                      dataKey="შესყიდვა"
                      stroke="#ef4444"
                      strokeWidth={3}
                      dot={{ r: 4, fill: "#ef4444" }}
                      activeDot={{ r: 6 }}
                    />
                    <Line
                      type="monotone"
                      dataKey="მოგება"
                      stroke="#3b82f6"
                      strokeWidth={3}
                      strokeDasharray="5 5"
                      dot={{ r: 4, fill: "#3b82f6" }}
                      activeDot={{ r: 6 }}
                    />
                  </LineChart>
                </ResponsiveContainer>
              </div>
            </CardContent>
          </Card>

          {/* Category Distribution Chart */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-lg">
                <PieChartIcon className="h-5 w-5 text-primary" />
                {"გაყიდვები კატეგორიების მიხედვით"}
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="h-[300px] w-full mt-4">
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie
                      data={data?.categoryPieData}
                      cx="50%"
                      cy="50%"
                      innerRadius={60}
                      outerRadius={80}
                      paddingAngle={5}
                      dataKey="value"
                      label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}
                    >
                      {data?.categoryPieData?.map((_, index) => (
                        <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                      ))}
                    </Pie>
                    <Tooltip
                      contentStyle={{
                        backgroundColor: "hsl(var(--background))",
                        border: "1px solid hsl(var(--border))",
                        borderRadius: "8px"
                      }}
                    />
                    <Legend />
                  </PieChart>
                </ResponsiveContainer>
              </div>
            </CardContent>
          </Card>

          {/* Top Products Chart */}
          <Card className="lg:col-span-2">
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-lg">
                <BarChart3 className="h-5 w-5 text-primary" />
                {"ტოპ 5 პროდუქტი (გაყიდვებით)"}
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="h-[350px] w-full mt-4">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={data?.topProductsData} layout="vertical" margin={{ left: 40, right: 40 }}>
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
                      width={120}
                    />
                    <Tooltip
                      cursor={{ fill: "hsl(var(--muted)/0.2)" }}
                      contentStyle={{
                        backgroundColor: "hsl(var(--background))",
                        border: "1px solid hsl(var(--border))",
                        borderRadius: "8px"
                      }}
                    />
                    <Bar dataKey="amount" name="ჯამი" radius={[0, 4, 4, 0]} barSize={30}>
                      {data?.topProductsData.map((_, index) => (
                        <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
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


