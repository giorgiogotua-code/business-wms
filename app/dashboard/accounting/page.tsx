"use client"

import { useState, useMemo, useRef } from "react"
import useSWR, { mutate } from "swr"
import { createClient } from "@/lib/supabase/client"
import { Card, CardContent } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { TrendingDown, TrendingUp, AlertCircle, BarChart3, Printer, Download, Upload, Trash2 } from "lucide-react"
import { toast } from "sonner"
import { exportToExcel, importFromExcel } from "@/lib/excel"
import { PrintHeader } from "@/components/print-header"
import { logAction } from "@/lib/audit"

const supabase = createClient()

interface Transaction {
  id: string
  product_id: string
  type: "purchase" | "sale"
  quantity: number
  price_per_unit: number
  total_amount: number
  notes: string | null
  created_at: string
  products: { name: string } | null
  user_id: string | null
}

interface Expense {
  id: string
  description: string
  amount: number
  created_at: string
}

interface Profile {
  id: string
  email: string
  full_name: string | null
  role: string
  created_at: string
}

async function fetchTransactions(): Promise<Transaction[]> {
  const { data } = await supabase
    .from("transactions")
    .select("*, products(name)")
    .order("created_at", { ascending: false })
  return (data as Transaction[]) || []
}

async function fetchExpenses(): Promise<Expense[]> {
  const { data } = await supabase.from("expenses").select("*").order("created_at", { ascending: false })
  return (data as Expense[]) || []
}

async function fetchProfiles(): Promise<Profile[]> {
  const { data } = await supabase.from("profiles").select("*").order("created_at")
  return (data as Profile[]) || []
}

export default function AccountingPage() {
  const { data: transactions = [] } = useSWR("accounting-transactions", fetchTransactions)
  const { data: expenses = [] } = useSWR("expenses", fetchExpenses)
  const { data: profiles = [] } = useSWR("accounting-profiles", fetchProfiles)
  const [dateFrom, setDateFrom] = useState("")
  const [dateTo, setDateTo] = useState("")
  const [txFilter, setTxFilter] = useState<"all" | "purchase" | "sale">("all")
  const [txSearch, setTxSearch] = useState("")
  const fileInputRef = useRef<HTMLInputElement>(null)

  const filtered = useMemo(() => {
    let txs = transactions
    if (dateFrom) {
      txs = txs.filter((t) => new Date(t.created_at) >= new Date(dateFrom))
    }
    if (dateTo) {
      const to = new Date(dateTo)
      to.setHours(23, 59, 59)
      txs = txs.filter((t) => new Date(t.created_at) <= to)
    }
    if (txFilter !== "all") {
      txs = txs.filter((t) => t.type === txFilter)
    }
    if (txSearch.trim()) {
      const q = txSearch.trim().toLowerCase()
      txs = txs.filter((t) => t.products?.name?.toLowerCase().includes(q))
    }
    return txs
  }, [transactions, dateFrom, dateTo, txFilter, txSearch])

  const filteredExpenses = useMemo(() => {
    let exps = expenses
    if (dateFrom) {
      exps = exps.filter((e) => new Date(e.created_at) >= new Date(dateFrom))
    }
    if (dateTo) {
      const to = new Date(dateTo)
      to.setHours(23, 59, 59)
      exps = exps.filter((e) => new Date(e.created_at) <= to)
    }
    return exps
  }, [expenses, dateFrom, dateTo])

  const totalPurchases = filtered
    .filter((t) => t.type === "purchase")
    .reduce((sum, t) => sum + Number(t.total_amount), 0)

  const totalSales = filtered
    .filter((t) => t.type === "sale")
    .reduce((sum, t) => sum + Number(t.total_amount), 0)

  const totalExpenses = filteredExpenses.reduce((sum, e) => sum + Number(e.amount), 0)
  const balance = totalSales - totalPurchases - totalExpenses

  // Profitability data
  const profitability = useMemo(() => {
    const salesByProduct: Record<string, { name: string; revenue: number; cost: number; qty: number }> = {}
    const sales = transactions.filter((t) => t.type === "sale")
    const purchases = transactions.filter((t) => t.type === "purchase")

    sales.forEach((s) => {
      const name = s.products?.name || "უცნობი"
      if (!salesByProduct[s.product_id]) {
        salesByProduct[s.product_id] = { name, revenue: 0, cost: 0, qty: 0 }
      }
      salesByProduct[s.product_id].revenue += Number(s.total_amount)
      salesByProduct[s.product_id].qty += s.quantity
    })

    purchases.forEach((p) => {
      if (salesByProduct[p.product_id]) {
        salesByProduct[p.product_id].cost += Number(p.total_amount)
      }
    })

    return Object.values(salesByProduct).map((item) => ({
      ...item,
      profit: item.revenue - item.cost,
      margin: item.revenue > 0 ? ((item.revenue - item.cost) / item.revenue) * 100 : 0,
    }))
  }, [transactions])

  function handleExportTransactions() {
    const data = filtered.map((t) => ({
      "პროდუქტი": t.products?.name || "უცნობი",
      "ტიპი": t.type === "purchase" ? "შესყიდვა" : "გაყიდვა",
      "რაოდენობა": t.quantity,
      "ფასი": Number(t.price_per_unit).toFixed(2),
      "ჯამი": Number(t.total_amount).toFixed(2),
      "თარიღი": new Date(t.created_at).toLocaleDateString("ka-GE"),
    }))
    exportToExcel(data, `ტრანზაქციები_${new Date().toISOString().slice(0, 10)}`, "ტრანზაქციები")
    toast.success("Excel ფაილი ჩამოიტვირთა")
  }

  function handleExportExpenses() {
    const data = filteredExpenses.map((e) => ({
      "აღწერა": e.description,
      "თანხა": Number(e.amount).toFixed(2),
      "თარიღი": new Date(e.created_at).toLocaleDateString("ka-GE"),
    }))
    exportToExcel(data, `ხარჯები_${new Date().toISOString().slice(0, 10)}`, "ხარჯები")
    toast.success("Excel ფაილი ჩამოიტვირთა")
  }

  async function handleImportExpenses(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (!file) return
    try {
      const rows = await importFromExcel(file)
      let count = 0
      for (const row of rows) {
        const desc = (row["აღწერა"] as string) || (row["description"] as string)
        const amt = Number(row["თანხა"] || row["amount"] || 0)
        if (desc && amt > 0) {
          const { data: { user } } = await supabase.auth.getUser()
          await supabase.from("expenses").insert({ description: desc, amount: amt, user_id: user?.id })
          count++
        }
      }
      toast.success(`${count} ხარჯი იმპორტირდა`)
      await logAction("ხარჯების იმპორტი", { count })
      mutate("expenses")
      mutate("dashboard-data")
    } catch {
      toast.error("ფაილის წაკითხვის შეცდომა")
    }
    if (fileInputRef.current) fileInputRef.current.value = ""
  }

  function handlePrint() {
    window.print()
  }

  return (
    <div>
      <PrintHeader title="ბუღალტერია" />

      <div className="mb-6 flex items-center justify-between">
        <h1 className="text-2xl font-bold text-foreground">{"ბუღალტერია"}</h1>
        <div className="flex gap-2 no-print">
          <Button variant="outline" size="icon" onClick={handleExportTransactions} aria-label="ჩამოტვირთვა">
            <Download className="h-5 w-5" />
          </Button>
          <Button variant="outline" size="icon" onClick={handlePrint} aria-label="ბეჭდვა">
            <Printer className="h-5 w-5" />
          </Button>
        </div>
      </div>

      {/* Date Filter */}
      <Card className="mb-6 no-print">
        <CardContent className="flex flex-wrap items-end gap-4 p-4">
          <span className="text-sm font-medium text-muted-foreground">{"ფილტრი:"}</span>
          <div className="flex flex-col gap-1">
            <Label className="text-xs text-muted-foreground">{"დან"}</Label>
            <Input type="date" value={dateFrom} onChange={(e) => setDateFrom(e.target.value)} className="w-auto" />
          </div>
          <div className="flex flex-col gap-1">
            <Label className="text-xs text-muted-foreground">{"მდე"}</Label>
            <Input type="date" value={dateTo} onChange={(e) => setDateTo(e.target.value)} className="w-auto" />
          </div>
          {(dateFrom || dateTo) && (
            <Button variant="ghost" size="sm" onClick={() => { setDateFrom(""); setDateTo("") }}>
              {"გასუფთავება"}
            </Button>
          )}
        </CardContent>
      </Card>

      {/* Summary Cards */}
      <div className="mb-6 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4 no-print">
        <Card>
          <CardContent className="flex flex-col items-center gap-2 p-6">
            <TrendingDown className="h-8 w-8 text-destructive" />
            <p className="text-sm text-muted-foreground">{"შესყიდვები"}</p>
            <p className="text-xl font-bold text-destructive">{totalPurchases.toFixed(2)} {"\u20BE"}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="flex flex-col items-center gap-2 p-6">
            <TrendingUp className="h-8 w-8 text-success" />
            <p className="text-sm text-muted-foreground">{"გაყიდვები"}</p>
            <p className="text-xl font-bold text-success">{totalSales.toFixed(2)} {"\u20BE"}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="flex flex-col items-center gap-2 p-6">
            <AlertCircle className="h-8 w-8 text-destructive" />
            <p className="text-sm text-muted-foreground">{"სხვა ხარჯები"}</p>
            <p className="text-xl font-bold text-destructive">{totalExpenses.toFixed(2)} {"\u20BE"}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="flex flex-col items-center gap-2 p-6">
            <BarChart3 className="h-8 w-8 text-chart-3" />
            <p className="text-sm text-muted-foreground">{"ბალანსი"}</p>
            <p className={`text-xl font-bold ${balance >= 0 ? "text-success" : "text-destructive"}`}>
              {balance.toFixed(2)} {"\u20BE"}
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Tabs matching screenshot: ისტორია, მომგებიანობა, ხარჯები, მოლარეები */}
      <Tabs defaultValue="history">
        <TabsList className="mb-4 w-full grid grid-cols-4 no-print">
          <TabsTrigger value="history">{"ისტორია"}</TabsTrigger>
          <TabsTrigger value="profitability">{"მომგებიანობა"}</TabsTrigger>
          <TabsTrigger value="expenses">{"ხარჯები"}</TabsTrigger>
          <TabsTrigger value="cashiers">{"მოლარეები"}</TabsTrigger>
        </TabsList>

        {/* ისტორია Tab */}
        <TabsContent value="history">
          <Card>
            <CardContent className="p-4">
              <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
                <h3 className="text-lg font-bold text-foreground">{"ტრანზაქციების ისტორია"}</h3>
                <div className="flex flex-wrap items-center gap-2 no-print">
                  <Input
                    placeholder="პროდუქტის ძებნა..."
                    value={txSearch}
                    onChange={(e) => setTxSearch(e.target.value)}
                    className="w-48 h-8 text-sm"
                  />
                  <Button
                    variant={txFilter === "purchase" ? "default" : "outline"}
                    size="sm"
                    onClick={() => setTxFilter(txFilter === "purchase" ? "all" : "purchase")}
                  >
                    {"შესყიდვები"}
                  </Button>
                  <Button
                    variant={txFilter === "sale" ? "default" : "outline"}
                    size="sm"
                    onClick={() => setTxFilter(txFilter === "sale" ? "all" : "sale")}
                  >
                    {"გაყიდვები"}
                  </Button>
                  <Button
                    variant={txFilter === "all" ? "default" : "outline"}
                    size="sm"
                    onClick={() => setTxFilter("all")}
                  >
                    {"ყველა"}
                  </Button>
                </div>
              </div>

              {filtered.length === 0 ? (
                <p className="py-8 text-center text-muted-foreground">{"ტრანზაქციები არ არის"}</p>
              ) : (
                <>
                  {/* Table view for print and desktop */}
                  <div className="overflow-x-auto">
                    <table className="w-full text-sm">
                      <thead>
                        <tr className="border-b border-border">
                          <th className="p-3 text-left font-medium text-muted-foreground">{"პროდუქტი"}</th>
                          <th className="p-3 text-left font-medium text-muted-foreground">{"ტიპი"}</th>
                          <th className="p-3 text-right font-medium text-muted-foreground">{"რაოდენობა"}</th>
                          <th className="p-3 text-right font-medium text-muted-foreground">{"ფასი"}</th>
                          <th className="p-3 text-right font-medium text-muted-foreground">{"ჯამი"}</th>
                          <th className="p-3 text-right font-medium text-muted-foreground">{"თარიღი"}</th>
                        </tr>
                      </thead>
                      <tbody>
                        {filtered.map((tx) => (
                          <tr key={tx.id} className="border-b border-border/50 hover:bg-muted/50 transition-colors">
                            <td className="p-3 font-medium text-foreground">{tx.products?.name || "უცნობი"}</td>
                            <td className="p-3">
                              <span className={`inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium ${tx.type === "sale" ? "bg-success/10 text-success" : "bg-destructive/10 text-destructive"}`}>
                                {tx.type === "purchase" ? "შესყიდვა" : "გაყიდვა"}
                              </span>
                            </td>
                            <td className="p-3 text-right text-foreground">{tx.quantity}</td>
                            <td className="p-3 text-right text-foreground">{Number(tx.price_per_unit).toFixed(2)} {"\u20BE"}</td>
                            <td className={`p-3 text-right font-bold ${tx.type === "sale" ? "text-success" : "text-destructive"}`}>
                              {tx.type === "sale" ? "+" : "-"}{Number(tx.total_amount).toFixed(2)} {"\u20BE"}
                            </td>
                            <td className="p-3 text-right text-muted-foreground">{new Date(tx.created_at).toLocaleDateString("ka-GE")}</td>
                          </tr>
                        ))}
                      </tbody>
                      <tfoot>
                        <tr className="border-t-2 border-border">
                          <td colSpan={4} className="p-3 font-bold text-foreground">{"ჯამი"}</td>
                          <td className={`p-3 text-right font-bold ${balance >= 0 ? "text-success" : "text-destructive"}`}>
                            {filtered.reduce((sum, t) => sum + (t.type === "sale" ? 1 : -1) * Number(t.total_amount), 0).toFixed(2)} {"\u20BE"}
                          </td>
                          <td></td>
                        </tr>
                      </tfoot>
                    </table>
                  </div>
                </>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* მომგებიანობა Tab */}
        <TabsContent value="profitability">
          <Card>
            <CardContent className="p-4">
              <div className="mb-4 flex items-center justify-between">
                <h3 className="text-lg font-bold text-foreground">{"მომგებიანობის ანალიზი"}</h3>
                <Button
                  variant="outline"
                  size="sm"
                  className="gap-2 no-print"
                  onClick={() => {
                    const data = profitability.map((p) => ({
                      "პროდუქტი": p.name,
                      "შემოსავალი": p.revenue.toFixed(2),
                      "თვითღირებულება": p.cost.toFixed(2),
                      "მოგება": p.profit.toFixed(2),
                      "მარჟა %": p.margin.toFixed(1),
                      "გაყიდული რაოდენობა": p.qty,
                    }))
                    exportToExcel(data, `მომგებიანობა_${new Date().toISOString().slice(0, 10)}`, "მომგებიანობა")
                    toast.success("Excel ჩამოიტვირთა")
                  }}
                >
                  <Download className="h-4 w-4" />
                  {"Excel"}
                </Button>
              </div>

              {profitability.length === 0 ? (
                <p className="py-8 text-center text-muted-foreground">{"გაყიდვების მონაცემები არ არის"}</p>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="border-b border-border">
                        <th className="p-3 text-left font-medium text-muted-foreground">{"პროდუქტი"}</th>
                        <th className="p-3 text-right font-medium text-muted-foreground">{"გაყიდული"}</th>
                        <th className="p-3 text-right font-medium text-muted-foreground">{"შემოსავალი"}</th>
                        <th className="p-3 text-right font-medium text-muted-foreground">{"თვითღირებულება"}</th>
                        <th className="p-3 text-right font-medium text-muted-foreground">{"მოგება"}</th>
                        <th className="p-3 text-right font-medium text-muted-foreground">{"მარჟა"}</th>
                      </tr>
                    </thead>
                    <tbody>
                      {profitability.sort((a, b) => b.profit - a.profit).map((item, idx) => (
                        <tr key={idx} className="border-b border-border/50 hover:bg-muted/50 transition-colors">
                          <td className="p-3 font-medium text-foreground">{item.name}</td>
                          <td className="p-3 text-right text-foreground">{item.qty}</td>
                          <td className="p-3 text-right text-foreground">{item.revenue.toFixed(2)} {"\u20BE"}</td>
                          <td className="p-3 text-right text-foreground">{item.cost.toFixed(2)} {"\u20BE"}</td>
                          <td className={`p-3 text-right font-bold ${item.profit >= 0 ? "text-success" : "text-destructive"}`}>
                            {item.profit.toFixed(2)} {"\u20BE"}
                          </td>
                          <td className={`p-3 text-right font-medium ${item.margin >= 0 ? "text-success" : "text-destructive"}`}>
                            {item.margin.toFixed(1)}%
                          </td>
                        </tr>
                      ))}
                    </tbody>
                    <tfoot>
                      <tr className="border-t-2 border-border">
                        <td className="p-3 font-bold text-foreground">{"ჯამი"}</td>
                        <td className="p-3 text-right font-bold text-foreground">{profitability.reduce((s, p) => s + p.qty, 0)}</td>
                        <td className="p-3 text-right font-bold text-foreground">{profitability.reduce((s, p) => s + p.revenue, 0).toFixed(2)} {"\u20BE"}</td>
                        <td className="p-3 text-right font-bold text-foreground">{profitability.reduce((s, p) => s + p.cost, 0).toFixed(2)} {"\u20BE"}</td>
                        <td className={`p-3 text-right font-bold ${profitability.reduce((s, p) => s + p.profit, 0) >= 0 ? "text-success" : "text-destructive"}`}>
                          {profitability.reduce((s, p) => s + p.profit, 0).toFixed(2)} {"\u20BE"}
                        </td>
                        <td></td>
                      </tr>
                    </tfoot>
                  </table>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* ხარჯები Tab */}
        <TabsContent value="expenses">
          <ExpensesTab
            expenses={filteredExpenses}
            onExport={handleExportExpenses}
            onImport={handleImportExpenses}
            fileInputRef={fileInputRef}
          />
        </TabsContent>

        {/* მოლარეები Tab */}
        <TabsContent value="cashiers">
          <Card>
            <CardContent className="p-4">
              <h3 className="mb-4 text-lg font-bold text-foreground">{"მოლარეების სია"}</h3>
              {profiles.length === 0 ? (
                <p className="py-8 text-center text-muted-foreground">{"მოლარეები არ არის"}</p>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="border-b border-border">
                        <th className="p-3 text-left font-medium text-muted-foreground">{"სახელი"}</th>
                        <th className="p-3 text-left font-medium text-muted-foreground">{"ელ-ფოსტა"}</th>
                        <th className="p-3 text-left font-medium text-muted-foreground">{"როლი"}</th>
                        <th className="p-3 text-right font-medium text-muted-foreground">{"გაყიდვები"}</th>
                        <th className="p-3 text-right font-medium text-muted-foreground">{"რეგისტრაცია"}</th>
                      </tr>
                    </thead>
                    <tbody>
                      {profiles.map((p) => {
                        const userSales = transactions
                          .filter((t) => t.user_id === p.id && t.type === "sale")
                          .reduce((sum, t) => sum + Number(t.total_amount), 0)

                        return (
                          <tr key={p.id} className="border-b border-border/50 hover:bg-muted/50 transition-colors">
                            <td className="p-3 font-medium text-foreground">{p.full_name || "-"}</td>
                            <td className="p-3 text-foreground">{p.email}</td>
                            <td className="p-3">
                              <span className={`inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium ${p.role === "admin" ? "bg-primary/10 text-primary" : p.role === "accountant" ? "bg-outline text-foreground border border-border" : "bg-muted text-muted-foreground"}`}>
                                {p.role === "admin" ? "ადმინი" : p.role === "accountant" ? "ბუღალტერი" : "მოლარე"}
                              </span>
                            </td>
                            <td className="p-3 text-right font-bold text-success">
                              {userSales.toFixed(2)} {"\u20BE"}
                            </td>
                            <td className="p-3 text-right text-muted-foreground">{new Date(p.created_at).toLocaleDateString("ka-GE")}</td>
                          </tr>
                        )
                      })}
                    </tbody>
                  </table>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  )
}

function ExpensesTab({
  expenses,
  onExport,
  onImport,
  fileInputRef,
}: {
  expenses: Expense[]
  onExport: () => void
  onImport: (e: React.ChangeEvent<HTMLInputElement>) => void
  fileInputRef: React.RefObject<HTMLInputElement | null>
}) {
  const [description, setDescription] = useState("")
  const [amount, setAmount] = useState("")
  const [loading, setLoading] = useState(false)

  async function handleAddExpense(e: React.FormEvent) {
    e.preventDefault()
    setLoading(true)

    const { data: { user } } = await supabase.auth.getUser()

    const { error } = await supabase.from("expenses").insert({
      description,
      amount: Number(amount),
      user_id: user?.id
    })

    if (error) {
      toast.error("შეცდომა ხარჯის დამატებისას")
      setLoading(false)
      return
    }

    toast.success("ხარჯი დაემატა")
    await logAction("ხარჯის დამატება", { description, amount })
    setDescription("")
    setAmount("")
    setLoading(false)
    mutate("expenses")
    mutate("dashboard-data")
  }

  async function handleDeleteExpense(id: string) {
    if (!confirm("წაშალოთ ეს ხარჯი?")) return
    const { error } = await supabase.from("expenses").delete().eq("id", id)
    if (error) {
      toast.error("წაშლა ვერ მოხერხდა")
      return
    }
    toast.success("ხარჯი წაიშალა")
    await logAction("ხარჯის წაშლა", { id })
    mutate("expenses")
    mutate("dashboard-data")
  }

  return (
    <Card>
      <CardContent className="p-4">
        <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
          <h3 className="text-lg font-bold text-foreground">{"ხარჯები"}</h3>
          <div className="flex gap-2 no-print">
            <Button variant="outline" size="sm" className="gap-2" onClick={onExport}>
              <Download className="h-4 w-4" />
              {"Excel"}
            </Button>
            <Button variant="outline" size="sm" className="gap-2" onClick={() => fileInputRef.current?.click()}>
              <Upload className="h-4 w-4" />
              {"იმპორტი"}
            </Button>
            <input ref={fileInputRef} type="file" accept=".xlsx,.xls,.csv" className="hidden" onChange={onImport} />
          </div>
        </div>

        <form onSubmit={handleAddExpense} className="mb-4 flex flex-wrap items-end gap-3 no-print">
          <div className="flex flex-1 flex-col gap-1 min-w-[200px]">
            <Label className="text-xs">{"აღწერა"}</Label>
            <Input
              placeholder="ხარჯის აღწერა..."
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              required
            />
          </div>
          <div className="flex flex-col gap-1">
            <Label className="text-xs">{`თანხა (\u20BE)`}</Label>
            <Input
              type="number"
              step="0.01"
              min="0"
              placeholder="0.00"
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
              required
              className="w-32"
            />
          </div>
          <Button type="submit" disabled={loading}>
            {loading ? "ემატება..." : "დამატება"}
          </Button>
        </form>

        {expenses.length === 0 ? (
          <p className="py-8 text-center text-muted-foreground">{"ხარჯები არ არის"}</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-border">
                  <th className="p-3 text-left font-medium text-muted-foreground">{"აღწერა"}</th>
                  <th className="p-3 text-right font-medium text-muted-foreground">{"თანხა"}</th>
                  <th className="p-3 text-right font-medium text-muted-foreground">{"თარიღი"}</th>
                  <th className="p-3 text-right font-medium text-muted-foreground no-print">{""}</th>
                </tr>
              </thead>
              <tbody>
                {expenses.map((exp) => (
                  <tr key={exp.id} className="border-b border-border/50 hover:bg-muted/50 transition-colors">
                    <td className="p-3 font-medium text-foreground">{exp.description}</td>
                    <td className="p-3 text-right font-bold text-destructive">
                      {"-"}{Number(exp.amount).toFixed(2)} {"\u20BE"}
                    </td>
                    <td className="p-3 text-right text-muted-foreground">
                      {new Date(exp.created_at).toLocaleDateString("ka-GE")}
                    </td>
                    <td className="p-3 text-right no-print">
                      <Button variant="ghost" size="icon" onClick={() => handleDeleteExpense(exp.id)} className="h-8 w-8 text-destructive hover:text-destructive">
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </td>
                  </tr>
                ))}
              </tbody>
              <tfoot>
                <tr className="border-t-2 border-border">
                  <td className="p-3 font-bold text-foreground">{"ჯამი"}</td>
                  <td className="p-3 text-right font-bold text-destructive">
                    {"-"}{expenses.reduce((sum, e) => sum + Number(e.amount), 0).toFixed(2)} {"\u20BE"}
                  </td>
                  <td colSpan={2}></td>
                </tr>
              </tfoot>
            </table>
          </div>
        )}
      </CardContent>
    </Card>
  )
}
