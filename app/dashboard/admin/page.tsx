"use client"

import { useState, useRef } from "react"
import useSWR, { mutate } from "swr"
import { createClient } from "@/lib/supabase/client"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Badge } from "@/components/ui/badge"
import { UserPlus, Shield, Users, Download, Upload, Database, Loader2, FileText, History } from "lucide-react"
import { toast } from "sonner"
import { exportToExcel, importFromExcel } from "@/lib/excel"
import { logAction } from "@/lib/audit"

const supabase = createClient()

interface Profile {
  id: string
  email: string
  full_name: string | null
  role: string
  created_at: string
}

async function fetchProfiles(): Promise<Profile[]> {
  const { data } = await supabase.from("profiles").select("*").order("created_at")
  return (data as Profile[]) || []
}

async function fetchAuditLogs() {
  const { data } = await supabase
    .from("audit_logs")
    .select("*, profiles(full_name, email)")
    .order("created_at", { ascending: false })
    .limit(100)
  return data || []
}

export default function AdminPage() {
  const { data: profiles = [] } = useSWR("profiles", fetchProfiles)
  const { data: auditLogs = [] } = useSWR("audit-logs", fetchAuditLogs)
  const [email, setEmail] = useState("")
  const [password, setPassword] = useState("")
  const [fullName, setFullName] = useState("")
  const [role, setRole] = useState("cashier")
  const [loading, setLoading] = useState(false)
  const [backupLoading, setBackupLoading] = useState(false)
  const [restoreLoading, setRestoreLoading] = useState(false)
  const restoreInputRef = useRef<HTMLInputElement>(null)

  async function handleCreateUser(e: React.FormEvent) {
    e.preventDefault()
    setLoading(true)

    const { error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        emailRedirectTo: `${window.location.origin}/auth/callback`,
        data: {
          full_name: fullName,
          role,
        },
      },
    })

    if (error) {
      toast.error(`შეცდომა: ${error.message}`)
      setLoading(false)
      return
    }

    toast.success("მომხმარებელი შეიქმნა")
    await logAction("მომხმარებლის შექმნა", { email, role, fullName })
    setEmail("")
    setPassword("")
    setFullName("")
    setRole("cashier")
    setLoading(false)
    mutate("profiles")
  }

  async function handleRoleChange(profileId: string, newRole: string) {
    const { error } = await supabase
      .from("profiles")
      .update({ role: newRole })
      .eq("id", profileId)

    if (error) {
      toast.error("როლის შეცვლა ვერ მოხერხდა")
      return
    }

    toast.success("როლი განახლდა")
    await logAction("როლის შეცვლა", { profileId, newRole })
    mutate("profiles")
  }

  // === BACKUP: Export all data as JSON ===
  async function handleBackup() {
    setBackupLoading(true)
    try {
      const [productsRes, categoriesRes, transactionsRes, expensesRes, profilesRes] = await Promise.all([
        supabase.from("products").select("*"),
        supabase.from("categories").select("*"),
        supabase.from("transactions").select("*"),
        supabase.from("expenses").select("*"),
        supabase.from("profiles").select("*"),
      ])

      const backup = {
        version: "1.0",
        created_at: new Date().toISOString(),
        data: {
          categories: categoriesRes.data || [],
          products: productsRes.data || [],
          transactions: transactionsRes.data || [],
          expenses: expensesRes.data || [],
          profiles: profilesRes.data || [],
        },
      }

      const blob = new Blob([JSON.stringify(backup, null, 2)], { type: "application/json" })
      const url = URL.createObjectURL(blob)
      const a = document.createElement("a")
      a.href = url
      a.download = `backup_DASTA_${new Date().toISOString().slice(0, 10)}.json`
      document.body.appendChild(a)
      a.click()
      document.body.removeChild(a)
      URL.revokeObjectURL(url)

      toast.success("ბექაფი წარმატებით ჩამოიტვირთა")
    } catch {
      toast.error("ბექაფის შექმნა ვერ მოხერხდა")
    }
    setBackupLoading(false)
  }

  // === BACKUP: Export all data as Excel ===
  async function handleBackupExcel() {
    setBackupLoading(true)
    try {
      const [productsRes, transactionsRes, expensesRes] = await Promise.all([
        supabase.from("products").select("*, categories(name)"),
        supabase.from("transactions").select("*, products(name)"),
        supabase.from("expenses").select("*"),
      ])

      // Products sheet
      const productsData = (productsRes.data || []).map((p: Record<string, unknown>) => ({
        "სახელი": (p as { name: string }).name,
        "კატეგორია": ((p as { categories: { name: string } | null }).categories)?.name || "-",
        "შესყიდვის ფასი": (p as { purchase_price: number }).purchase_price,
        "გასაყიდი ფასი": (p as { sale_price: number }).sale_price,
        "რაოდენობა": (p as { quantity: number }).quantity,
        "ერთეული": (p as { unit: string }).unit,
        "ბარკოდი": (p as { barcode: string }).barcode || "-",
      }))
      exportToExcel(productsData, `ბექაფი_პროდუქტები_${new Date().toISOString().slice(0, 10)}`, "პროდუქტები")

      // Transactions sheet
      const txData = (transactionsRes.data || []).map((t: Record<string, unknown>) => ({
        "პროდუქტი": ((t as { products: { name: string } | null }).products)?.name || "უცნობი",
        "ტიპი": (t as { type: string }).type === "purchase" ? "შესყიდვა" : "გაყიდვა",
        "რაოდენობა": (t as { quantity: number }).quantity,
        "ფასი": (t as { price_per_unit: number }).price_per_unit,
        "ჯამი": (t as { total_amount: number }).total_amount,
        "თარიღი": new Date((t as { created_at: string }).created_at).toLocaleDateString("ka-GE"),
      }))
      exportToExcel(txData, `ბექაფი_ტრანზაქციები_${new Date().toISOString().slice(0, 10)}`, "ტრანზაქციები")

      // Expenses sheet
      const expData = (expensesRes.data || []).map((e: Record<string, unknown>) => ({
        "აღწერა": (e as { description: string }).description,
        "თანხა": (e as { amount: number }).amount,
        "თარიღი": new Date((e as { created_at: string }).created_at).toLocaleDateString("ka-GE"),
      }))
      exportToExcel(expData, `ბექაფი_ხარჯები_${new Date().toISOString().slice(0, 10)}`, "ხარჯები")

      toast.success("Excel ბექაფი ჩამოიტვირთა (3 ფაილი)")
    } catch {
      toast.error("ბექაფის შექმნა ვერ მოხერხდა")
    }
    setBackupLoading(false)
  }

  // === RESTORE from JSON backup ===
  async function handleRestore(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (!file) return

    if (!confirm("ბექაფიდან აღდგენა ჩაანაცვლებს არსებულ მონაცემებს. გსურთ გაგრძელება?")) {
      if (restoreInputRef.current) restoreInputRef.current.value = ""
      return
    }

    setRestoreLoading(true)
    try {
      const text = await file.text()
      const backup = JSON.parse(text)

      if (!backup.data) {
        toast.error("არასწორი ბექაფის ფაილი")
        setRestoreLoading(false)
        return
      }

      // Clear existing data (order matters due to FK constraints)
      await supabase.from("transactions").delete().neq("id", "00000000-0000-0000-0000-000000000000")
      await supabase.from("expenses").delete().neq("id", "00000000-0000-0000-0000-000000000000")
      await supabase.from("products").delete().neq("id", "00000000-0000-0000-0000-000000000000")
      await supabase.from("categories").delete().neq("id", "00000000-0000-0000-0000-000000000000")

      // Restore categories
      if (backup.data.categories?.length > 0) {
        await supabase.from("categories").insert(backup.data.categories)
      }

      // Restore products
      if (backup.data.products?.length > 0) {
        await supabase.from("products").insert(backup.data.products)
      }

      // Restore transactions
      if (backup.data.transactions?.length > 0) {
        await supabase.from("transactions").insert(backup.data.transactions)
      }

      // Restore expenses
      if (backup.data.expenses?.length > 0) {
        await supabase.from("expenses").insert(backup.data.expenses)
      }

      toast.success("ბექაფი წარმატებით აღდგა!")
      mutate("products")
      mutate("categories")
      mutate("expenses")
      mutate("dashboard-data")
      mutate("profiles")
    } catch {
      toast.error("აღდგენის შეცდომა")
    }
    setRestoreLoading(false)
    if (restoreInputRef.current) restoreInputRef.current.value = ""
  }

  return (
    <div>
      <h1 className="mb-6 text-2xl font-bold text-foreground">{"ადმინ პანელი"}</h1>

      <Tabs defaultValue="users">
        <TabsList className="mb-4 grid w-full grid-cols-3">
          <TabsTrigger value="users" className="gap-2">
            <Users className="h-4 w-4" />
            {"მომხმარებლები"}
          </TabsTrigger>
          <TabsTrigger value="create" className="gap-2">
            <UserPlus className="h-4 w-4" />
            {"შექმნა"}
          </TabsTrigger>
          <TabsTrigger value="backup" className="gap-2">
            <Database className="h-4 w-4" />
            {"ბექაფი"}
          </TabsTrigger>
          <TabsTrigger value="logs" className="gap-2">
            <History className="h-4 w-4" />
            {"ლოგები"}
          </TabsTrigger>
        </TabsList>

        {/* Users Tab */}
        <TabsContent value="users">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Users className="h-5 w-5" />
                {"მომხმარებლების სია"}
              </CardTitle>
            </CardHeader>
            <CardContent>
              {profiles.length === 0 ? (
                <p className="py-8 text-center text-muted-foreground">{"მომხმარებლები არ არის"}</p>
              ) : (
                <div className="flex flex-col gap-3">
                  {profiles.map((profile: Profile) => (
                    <div key={profile.id} className="flex items-center justify-between rounded-lg border border-border p-4">
                      <div>
                        <p className="font-medium text-foreground">{profile.full_name || profile.email}</p>
                        <p className="text-sm text-muted-foreground">{profile.email}</p>
                        <p className="text-xs text-muted-foreground">
                          {"რეგისტრაცია: "}{new Date(profile.created_at).toLocaleDateString("ka-GE")}
                        </p>
                      </div>
                      <div className="flex items-center gap-3">
                        <Badge variant={profile.role === "admin" ? "default" : profile.role === "accountant" ? "outline" : "secondary"}>
                          {profile.role === "admin" ? "ადმინი" : profile.role === "accountant" ? "ბუღალტერი" : "მოლარე"}
                        </Badge>
                        <Select value={profile.role} onValueChange={(v) => handleRoleChange(profile.id, v)}>
                          <SelectTrigger className="w-36">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="admin">{"ადმინი"}</SelectItem>
                            <SelectItem value="cashier">{"მოლარე"}</SelectItem>
                            <SelectItem value="accountant">{"ბუღალტერი"}</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* Create User Tab */}
        <TabsContent value="create">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <UserPlus className="h-5 w-5" />
                {"ახალი მომხმარებლის შექმნა"}
              </CardTitle>
            </CardHeader>
            <CardContent>
              <form onSubmit={handleCreateUser} className="flex flex-col gap-4 max-w-md">
                <div className="flex flex-col gap-2">
                  <Label>{"სრული სახელი"}</Label>
                  <Input placeholder="სახელი გვარი" value={fullName} onChange={(e) => setFullName(e.target.value)} />
                </div>
                <div className="flex flex-col gap-2">
                  <Label>{"ელ-ფოსტა *"}</Label>
                  <Input type="email" placeholder="example@email.com" value={email} onChange={(e) => setEmail(e.target.value)} required />
                </div>
                <div className="flex flex-col gap-2">
                  <Label>{"პაროლი *"}</Label>
                  <Input type="password" placeholder="მინიმუმ 6 სიმბოლო" value={password} onChange={(e) => setPassword(e.target.value)} required minLength={6} />
                </div>
                <div className="flex flex-col gap-2">
                  <Label>{"როლი"}</Label>
                  <Select value={role} onValueChange={setRole}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="admin">
                        <div className="flex items-center gap-2">
                          <Shield className="h-4 w-4" />
                          {"ადმინი - სრული უფლება"}
                        </div>
                      </SelectItem>
                      <SelectItem value="cashier">
                        <div className="flex items-center gap-2">
                          <Users className="h-4 w-4" />
                          {"მოლარე - შეზღუდული უფლება"}
                        </div>
                      </SelectItem>
                      <SelectItem value="accountant">
                        <div className="flex items-center gap-2">
                          <FileText className="h-4 w-4" />
                          {"ბუღალტერი - საფინანსო წვდომა"}
                        </div>
                      </SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <Button type="submit" disabled={loading} className="gap-2">
                  <UserPlus className="h-4 w-4" />
                  {loading ? "იქმნება..." : "შექმნა"}
                </Button>
              </form>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Backup Tab */}
        <TabsContent value="backup">
          <div className="flex flex-col gap-6">
            {/* Export Section */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Download className="h-5 w-5" />
                  {"მონაცემების ექსპორტი / ბექაფი"}
                </CardTitle>
              </CardHeader>
              <CardContent>
                <p className="mb-4 text-sm text-muted-foreground">
                  {"ჩამოტვირთეთ მთლიანი მონაცემების ბექაფი. JSON ფორმატი გამოდგება აღდგენისთვის, Excel - ხელით წაკითხვისთვის."}
                </p>
                <div className="flex flex-wrap gap-3">
                  <Button onClick={handleBackup} disabled={backupLoading} className="gap-2">
                    {backupLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Download className="h-4 w-4" />}
                    {"JSON ბექაფი"}
                  </Button>
                  <Button variant="outline" onClick={handleBackupExcel} disabled={backupLoading} className="gap-2">
                    {backupLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Download className="h-4 w-4" />}
                    {"Excel ბექაფი"}
                  </Button>
                </div>
              </CardContent>
            </Card>

            {/* Restore Section */}
            <Card className="border-warning/50">
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-warning">
                  <Upload className="h-5 w-5" />
                  {"მონაცემების აღდგენა"}
                </CardTitle>
              </CardHeader>
              <CardContent>
                <p className="mb-4 text-sm text-muted-foreground">
                  {"JSON ბექაფის ფაილიდან აღდგენა. ყურადღება: ეს ჩაანაცვლებს არსებულ მონაცემებს!"}
                </p>
                <div className="flex flex-wrap gap-3">
                  <Button variant="outline" onClick={() => restoreInputRef.current?.click()} disabled={restoreLoading} className="gap-2">
                    {restoreLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Upload className="h-4 w-4" />}
                    {restoreLoading ? "აღდგება..." : "JSON ფაილის ატვირთვა"}
                  </Button>
                  <input ref={restoreInputRef} type="file" accept=".json" className="hidden" onChange={handleRestore} />
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        {/* Audit Logs Tab */}
        <TabsContent value="logs">
          <Card>
            <CardHeader>
              <CardTitle>{"ისტორია"}</CardTitle>
            </CardHeader>
            <CardContent>
              {auditLogs.length === 0 ? (
                <p className="py-8 text-center text-muted-foreground">{"ლოგები არ არის. დარწმუნდით რომ SQL სკრიპტი გაშვებულია."}</p>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="border-b border-border">
                        <th className="p-3 text-left font-medium text-muted-foreground">{"თარიღი"}</th>
                        <th className="p-3 text-left font-medium text-muted-foreground">{"მომხმარებელი"}</th>
                        <th className="p-3 text-left font-medium text-muted-foreground">{"მოქმედება"}</th>
                        <th className="p-3 text-left font-medium text-muted-foreground">{"დეტალები"}</th>
                      </tr>
                    </thead>
                    <tbody>
                      {auditLogs.map((log: any) => (
                        <tr key={log.id} className="border-b border-border/50">
                          <td className="p-3 text-muted-foreground">
                            {new Date(log.created_at).toLocaleString("ka-GE")}
                          </td>
                          <td className="p-3">
                            <p className="font-medium text-foreground">{log.profiles?.full_name || "-"}</p>
                            <p className="text-xs text-muted-foreground">{log.profiles?.email}</p>
                          </td>
                          <td className="p-3">
                            <Badge variant="secondary">{log.action}</Badge>
                          </td>
                          <td className="p-3 text-xs text-muted-foreground">
                            <pre className="max-w-[200px] overflow-hidden text-ellipsis">
                              {JSON.stringify(log.details)}
                            </pre>
                          </td>
                        </tr>
                      ))}
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
