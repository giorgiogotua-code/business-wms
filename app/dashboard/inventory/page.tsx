"use client"

import { useState, useRef } from "react"
import useSWR, { mutate } from "swr"
import { createClient } from "@/lib/supabase/client"
import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Search, ArrowUpDown, Printer, Pencil, Trash2, AlertTriangle, DollarSign, Download, Upload, Package } from "lucide-react"
import { toast } from "sonner"
import { exportToExcel, importFromExcel } from "@/lib/excel"
import { cn } from "@/lib/utils"
import { Badge } from "@/components/ui/badge"
import { PrintHeader } from "@/components/print-header"
import { logAction } from "@/lib/audit"
import { useRouter } from "next/navigation"

const supabase = createClient()

interface Product {
  id: string
  name: string
  category_id: string | null
  description: string | null
  purchase_price: number
  sale_price: number
  quantity: number
  unit: string
  low_stock_threshold: number
  categories: { name: string } | null
  barcode: string | null
}

async function fetchProducts(): Promise<Product[]> {
  const { data } = await supabase
    .from("products")
    .select("*, categories(name)")
    .order("name")
  return (data as Product[]) || []
}

async function fetchCategories() {
  const { data } = await supabase.from("categories").select("*").order("name")
  return data || []
}

export default function InventoryPage() {
  const { data: products = [] } = useSWR("products", fetchProducts)
  const { data: categories = [] } = useSWR("categories", fetchCategories)
  const [search, setSearch] = useState("")
  const [sortBy, setSortBy] = useState<"name" | "price" | "stock">("name")
  const [selectedCategory, setSelectedCategory] = useState("all")
  const [editProduct, setEditProduct] = useState<Product | null>(null)
  const [editForm, setEditForm] = useState({
    name: "",
    purchase_price: "",
    sale_price: "",
    quantity: "",
    unit: "",
    low_stock_threshold: "",
    category_id: "",
    barcode: "",
  })
  const [sellingProduct, setSellingProduct] = useState<Product | null>(null)
  const [sellForm, setSellForm] = useState({ quantity: "1", price: "" })
  const fileInputRef = useRef<HTMLInputElement>(null)
  const router = useRouter()

  const lowStockProducts = products.filter((p) => p.quantity <= p.low_stock_threshold)

  const filteredProducts = products
    .filter((p) => {
      const matchesSearch = p.name.toLowerCase().includes(search.toLowerCase()) ||
        (p.barcode && p.barcode.toLowerCase().includes(search.toLowerCase()))
      const matchesCategory =
        selectedCategory === "all" ||
        (selectedCategory === "uncategorized" ? !p.category_id : p.category_id === selectedCategory)
      return matchesSearch && matchesCategory
    })
    .sort((a, b) => {
      if (sortBy === "name") return a.name.localeCompare(b.name)
      if (sortBy === "price") return b.sale_price - a.sale_price
      return a.quantity - b.quantity
    })

  const categoryCounts = categories.map((cat: { id: string; name: string }) => ({
    ...cat,
    count: products.filter((p) => p.category_id === cat.id).length,
  }))

  function openEdit(product: Product) {
    setEditProduct(product)
    setEditForm({
      name: product.name,
      purchase_price: String(product.purchase_price),
      sale_price: String(product.sale_price),
      quantity: String(product.quantity),
      unit: product.unit,
      low_stock_threshold: String(product.low_stock_threshold),
      category_id: product.category_id || "",
      barcode: product.barcode || "",
    })
  }

  async function handleEdit(e: React.FormEvent) {
    e.preventDefault()
    if (!editProduct) return

    const { error } = await supabase
      .from("products")
      .update({
        name: editForm.name,
        purchase_price: Number(editForm.purchase_price),
        sale_price: Number(editForm.sale_price),
        quantity: Number(editForm.quantity),
        unit: editForm.unit,
        low_stock_threshold: Number(editForm.low_stock_threshold),
        category_id: editForm.category_id || null,
        barcode: editForm.barcode || null,
        updated_at: new Date().toISOString(),
      })
      .eq("id", editProduct.id)

    if (error) {
      toast.error("შეცდომა რედაქტირებისას")
      return
    }

    toast.success("პროდუქტი განახლდა")
    await logAction("პროდუქტის რედაქტირება", { name: editForm.name })
    setEditProduct(null)
    mutate("products")
    mutate("dashboard-data")
  }

  async function handleDelete(id: string, name: string) {
    if (!confirm(`წაშალოთ "${name}"?`)) return

    const { error } = await supabase.from("products").delete().eq("id", id)
    if (error) {
      toast.error("შეცდომა წაშლისას")
      return
    }

    toast.success("პროდუქტი წაიშალა")
    await logAction("პროდუქტის წაშლა", { name })
    mutate("products")
    mutate("dashboard-data")
  }

  function openQuickSell(product: Product) {
    setSellingProduct(product)
    setSellForm({ quantity: "1", price: String(product.sale_price) })
  }

  async function handleQuickSell(e: React.FormEvent) {
    e.preventDefault()
    if (!sellingProduct) return

    const qty = Number(sellForm.quantity)
    const price = Number(sellForm.price)

    if (qty > sellingProduct.quantity) {
      toast.error("მარაგი არ არის საკმარისი")
      return
    }

    const total = qty * price

    // 1. Update product quantity
    const { error: pError } = await supabase
      .from("products")
      .update({ quantity: sellingProduct.quantity - qty })
      .eq("id", sellingProduct.id)

    if (pError) {
      toast.error("შეცდომა მარაგის განახლებისას")
      return
    }

    // 2. Create transaction
    const { error: tError } = await supabase.from("transactions").insert({
      product_id: sellingProduct.id,
      type: "sale",
      quantity: qty,
      price_per_unit: price,
      total_amount: total,
    })

    if (tError) {
      toast.error("შეცდომა ტრანზაქციისას")
      return
    }

    toast.success("გაყიდვა წარმატებით დასრულდა")
    await logAction("სწრაფი გაყიდვა (ნაშთიდან)", { name: sellingProduct.name, qty, total })
    setSellingProduct(null)
    mutate("products")
    mutate("dashboard-data")
  }

  function handleExport() {
    const data = filteredProducts.map((p) => ({
      "სახელი": p.name,
      "კატეგორია": p.categories?.name || "-",
      "შესყიდვის ფასი": Number(p.purchase_price).toFixed(2),
      "გასაყიდი ფასი": Number(p.sale_price).toFixed(2),
      "რაოდენობა": p.quantity,
      "ერთეული": p.unit,
      "მინ. მარაგი": p.low_stock_threshold,
      "ბარკოდი": p.barcode || "-",
    }))
    exportToExcel(data, `ნაშთი_${new Date().toISOString().slice(0, 10)}`, "ნაშთი")
    toast.success("Excel ჩამოიტვირთა")
  }

  async function handleImport(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (!file) return
    try {
      const rows = await importFromExcel(file)
      let count = 0
      for (const row of rows) {
        const name = (row["სახელი"] as string) || (row["name"] as string)
        const purchasePrice = Number(row["შესყიდვის ფასი"] || row["purchase_price"] || 0)
        const salePrice = Number(row["გასაყიდი ფასი"] || row["sale_price"] || 0)
        const quantity = Number(row["რაოდენობა"] || row["quantity"] || 0)
        const unit = (row["ერთეული"] as string) || (row["unit"] as string) || "ცალი"
        const barcode = (row["ბარკოდი"] as string) || (row["barcode"] as string) || null
        if (name && salePrice > 0) {
          await supabase.from("products").insert({
            name, purchase_price: purchasePrice, sale_price: salePrice, quantity, unit, barcode,
          })
          count++
        }
      }
      toast.success(`${count} პროდუქტი იმპორტირდა`)
      await logAction("პროდუქტების იმპორტი (ნაშთი)", { count, fileName: file.name })
      mutate("products")
    } catch {
      toast.error("ფაილის წაკითხვის შეცდომა")
    }
    if (fileInputRef.current) fileInputRef.current.value = ""
  }

  return (
    <div>
      <PrintHeader title="ნაშთი / ინვენტარი" />

      <div className="mb-6 flex items-center justify-between">
        <h1 className="text-2xl font-bold text-foreground">{"ნაშთი"}</h1>
        <div className="flex gap-2 no-print">
          <Button variant="outline" onClick={handleExport} aria-label="Excel ექსპორტი">
            <Download className="mr-2 h-5 w-5" /> Excel ექსპორტი
          </Button>
          <Button variant="outline" onClick={() => fileInputRef.current?.click()} aria-label="Excel იმპორტი">
            <Upload className="mr-2 h-5 w-5" /> Excel იმპორტი
          </Button>
          <input ref={fileInputRef} type="file" accept=".xlsx,.xls,.csv" className="hidden" onChange={handleImport} />
          <Button variant="outline" size="icon" onClick={() => window.print()} aria-label="ბეჭდვა">
            <Printer className="h-5 w-5" />
          </Button>
        </div>
      </div>

      {/* Search and Sort */}
      <div className="mb-4 flex flex-wrap items-center gap-3 no-print">
        <div className="relative flex-1 min-w-[200px]">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            placeholder="პროდუქტის ძიება..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-10"
          />
        </div>
        <Button variant={sortBy === "name" ? "default" : "outline"} size="sm" onClick={() => setSortBy("name")} className="gap-1">
          <ArrowUpDown className="h-3 w-3" />{"სახელი"}
        </Button>
        <Button variant={sortBy === "price" ? "default" : "outline"} size="sm" onClick={() => setSortBy("price")} className="gap-1">
          <DollarSign className="h-3 w-3" />{"ფასი"}
        </Button>
        <Button variant={sortBy === "stock" ? "default" : "outline"} size="sm" onClick={() => setSortBy("stock")}>
          {"მარაგი"}
        </Button>
      </div>

      {/* Category filters */}
      <div className="mb-4 flex flex-wrap gap-2 no-print">
        <Button variant={selectedCategory === "all" ? "default" : "outline"} size="sm" onClick={() => setSelectedCategory("all")}>
          {`ყველა (${products.length})`}
        </Button>
        {categoryCounts.map((cat: any) => (
          <Button key={cat.id} variant={selectedCategory === cat.id ? "default" : "outline"} size="sm" onClick={() => setSelectedCategory(cat.id)}>
            {`${cat.name} (${cat.count})`}
          </Button>
        ))}
      </div>

      {/* Low Stock Warning */}
      {lowStockProducts.length > 0 && (
        <Card className="mb-4 border-warning/50 bg-warning/5 no-print">
          <CardContent className="p-4">
            <div className="flex items-center gap-2 mb-2">
              <AlertTriangle className="h-5 w-5 text-warning" />
              <h3 className="font-bold text-warning-foreground">{"დაბალი მარაგი!"}</h3>
            </div>
            {lowStockProducts.map((p) => (
              <p key={p.id} className="text-sm text-foreground">
                <span className="font-bold">{p.name}</span>
                {` \u2014 ${p.quantity} ${p.unit} დარჩენილია`}
              </p>
            ))}
          </CardContent>
        </Card>
      )}

      {/* Products List */}
      <div className="flex flex-col gap-3">
        {filteredProducts.length === 0 ? (
          <Card>
            <CardContent className="p-8 text-center text-muted-foreground">{"პროდუქტები არ მოიძებნა"}</CardContent>
          </Card>
        ) : (
          filteredProducts.map((product) => {
            const status = product.quantity === 0
              ? { label: "ამოწურულია", color: "bg-destructive text-destructive-foreground" }
              : product.quantity <= product.low_stock_threshold
                ? { label: "დაბალი მარაგი", color: "bg-warning text-warning-foreground" }
                : { label: "მარაგშია", color: "bg-success text-success-foreground" }

            return (
              <Card key={product.id} className="overflow-hidden group hover:border-primary/50 transition-colors">
                <CardContent className="flex items-center justify-between p-4">
                  <div className="flex gap-4 items-center">
                    <div className="h-12 w-12 rounded-lg bg-muted flex items-center justify-center text-muted-foreground shrink-0 border">
                      <Package className="h-6 w-6" />
                    </div>
                    <div>
                      <div className="flex items-center gap-2">
                        <h3 className="text-lg font-bold text-foreground">{product.name}</h3>
                        <Badge className={cn("text-[10px] h-5", status.color)} variant="outline">
                          {status.label}
                        </Badge>
                      </div>
                      <div className="mt-1 flex flex-wrap gap-x-4 gap-y-1 text-sm text-muted-foreground">
                        {product.categories?.name && <span>{product.categories.name}</span>}
                        <span>{`გასაყიდი: ${Number(product.sale_price).toFixed(2)} \u20BE`}</span>
                        <span>{`რაოდენობა: ${product.quantity} ${product.unit}`}</span>
                        {product.barcode && <span className="text-primary font-mono">{`ბარკოდი: ${product.barcode}`}</span>}
                      </div>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <div className="flex items-center gap-1 no-print">
                      <Button variant="outline" size="sm" className="hidden sm:flex gap-2 text-success hover:text-success border-success/20 hover:bg-success/10" onClick={() => openQuickSell(product)}>
                        <DollarSign className="h-4 w-4" /> Quick Sell
                      </Button>
                      <Button variant="ghost" size="icon" onClick={() => openEdit(product)} aria-label="რედაქტირება">
                        <Pencil className="h-4 w-4" />
                      </Button>
                      <Button variant="ghost" size="icon" onClick={() => handleDelete(product.id, product.name)} aria-label="წაშლა" className="text-destructive hover:text-destructive">
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                </CardContent>
              </Card>
            )
          })
        )}
      </div>

      {/* Edit Dialog */}
      <Dialog open={!!editProduct} onOpenChange={() => setEditProduct(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{"პროდუქტის რედაქტირება"}</DialogTitle>
          </DialogHeader>
          <form onSubmit={handleEdit} className="flex flex-col gap-4">
            <div className="flex flex-col gap-2">
              <Label>{"სახელი"}</Label>
              <Input value={editForm.name} onChange={(e) => setEditForm({ ...editForm, name: e.target.value })} required />
            </div>
            <div className="flex flex-col gap-2">
              <Label>{"კატეგორია"}</Label>
              <Select value={editForm.category_id} onValueChange={(v) => setEditForm({ ...editForm, category_id: v })}>
                <SelectTrigger><SelectValue placeholder="არჩევა" /></SelectTrigger>
                <SelectContent>
                  {categories.map((cat: { id: string; name: string }) => (
                    <SelectItem key={cat.id} value={cat.id}>{cat.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="flex flex-col gap-2">
                <Label>{`შესყიდვის ფასი (\u20BE)`}</Label>
                <Input type="number" step="0.01" value={editForm.purchase_price} onChange={(e) => setEditForm({ ...editForm, purchase_price: e.target.value })} required />
              </div>
              <div className="flex flex-col gap-2">
                <Label>{`გასაყიდი ფასი (\u20BE)`}</Label>
                <Input type="number" step="0.01" value={editForm.sale_price} onChange={(e) => setEditForm({ ...editForm, sale_price: e.target.value })} required />
              </div>
            </div>
            <div className="grid grid-cols-3 gap-4">
              <div className="flex flex-col gap-2">
                <Label>{"რაოდენობა"}</Label>
                <Input type="number" value={editForm.quantity} onChange={(e) => setEditForm({ ...editForm, quantity: e.target.value })} required />
              </div>
              <div className="flex flex-col gap-2">
                <Label>{"ერთეული"}</Label>
                <Select value={editForm.unit} onValueChange={(v) => setEditForm({ ...editForm, unit: v })}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="ცალი">{"ცალი"}</SelectItem>
                    <SelectItem value="კგ">{"კგ"}</SelectItem>
                    <SelectItem value="ლიტრი">{"ლიტრი"}</SelectItem>
                    <SelectItem value="მეტრი">{"მეტრი"}</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="flex flex-col gap-2">
                <Label>{"ბარკოდი"}</Label>
                <Input value={editForm.barcode} onChange={(e) => setEditForm({ ...editForm, barcode: e.target.value })} placeholder="ბარკოდი / შტრიხკოდი" />
              </div>
              <div className="flex flex-col gap-2">
                <Label>{"მინ. მარაგი"}</Label>
                <Input type="number" value={editForm.low_stock_threshold} onChange={(e) => setEditForm({ ...editForm, low_stock_threshold: e.target.value })} />
              </div>
            </div>
            <div className="flex justify-end gap-3">
              <Button type="button" variant="outline" onClick={() => setEditProduct(null)}>{"გაუქმება"}</Button>
              <Button type="submit">{"შენახვა"}</Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>

      {/* Quick Sell Dialog */}
      <Dialog open={!!sellingProduct} onOpenChange={() => setSellingProduct(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{sellingProduct?.name} - სწრაფი გაყიდვა</DialogTitle>
          </DialogHeader>
          <form onSubmit={handleQuickSell} className="flex flex-col gap-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="flex flex-col gap-2">
                <Label>რაოდენობა (მარაგი: {sellingProduct?.quantity} {sellingProduct?.unit})</Label>
                <Input
                  type="number"
                  value={sellForm.quantity}
                  onChange={(e) => setSellForm({ ...sellForm, quantity: e.target.value })}
                  max={sellingProduct?.quantity}
                  min="1"
                  required
                />
              </div>
              <div className="flex flex-col gap-2">
                <Label>გასაყიდი ფასი (⾾)</Label>
                <Input
                  type="number"
                  step="0.01"
                  value={sellForm.price}
                  onChange={(e) => setSellForm({ ...sellForm, price: e.target.value })}
                  required
                />
              </div>
            </div>
            <div className="rounded-lg bg-muted p-3 text-center">
              <p className="text-sm text-muted-foreground">ჯამური თანხა</p>
              <p className="text-2xl font-bold">{(Number(sellForm.quantity) * Number(sellForm.price)).toFixed(2)} ⾾</p>
            </div>
            <div className="flex justify-end gap-3">
              <Button type="button" variant="outline" onClick={() => setSellingProduct(null)}>გაუქმება</Button>
              <Button type="submit" className="bg-success hover:bg-success/90">გაყიდვის დადასტურება</Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  )
}
