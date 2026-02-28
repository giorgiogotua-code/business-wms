"use client"

import { useState, useRef } from "react"
import useSWR, { mutate } from "swr"
import { createClient } from "@/lib/supabase/client"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Plus, Package, Printer, Download, Upload } from "lucide-react"
import { toast } from "sonner"
import { CategoryManager } from "@/components/category-manager"
import { exportToExcel, importFromExcel } from "@/lib/excel"
import { PrintHeader } from "@/components/print-header"
import { logAction } from "@/lib/audit"

const supabase = createClient()

async function fetchCategories() {
  const { data } = await supabase.from("categories").select("*").order("name")
  return data || []
}

async function fetchProducts() {
  const { data } = await supabase.from("products").select("*, categories(name)").order("created_at", { ascending: false })
  return data || []
}

async function fetchSuppliers() {
  const { data } = await supabase.from("suppliers").select("*").order("name")
  return data || []
}

export default function PurchasesPage() {
  const { data: categories = [] } = useSWR("categories", fetchCategories)
  const { data: products = [] } = useSWR("products", fetchProducts)
  const { data: suppliers = [] } = useSWR("suppliers", fetchSuppliers)
  const [showNewProduct, setShowNewProduct] = useState(false)
  const [showAddStock, setShowAddStock] = useState(false)
  const [loading, setLoading] = useState(false)
  const fileInputRef = useRef<HTMLInputElement>(null)

  function handleDownloadTemplate() {
    const templateData = [
      {
        "სახელი": "მაგალითი პროდუქტი",
        "შესყიდვის ფასი": "10.00",
        "გასაყიდი ფასი": "15.00",
        "რაოდენობა": "100",
        "ერთეული": "ცალი",
      }
    ]
    exportToExcel(templateData, "შესყიდვების_შაბლონი", "შაბლონი")
    toast.info("შაბლონი ჩამოიტვირთა. გთხოვთ შეავსოთ მონაცემები.")
  }

  function handleExportProducts() {
    const data = products.map((p: Record<string, unknown>) => ({
      "სახელი": (p as { name: string }).name,
      "კატეგორია": ((p as { categories: { name: string } | null }).categories)?.name || "-",
      "შესყიდვის ფასი": Number((p as { purchase_price: number }).purchase_price).toFixed(2),
      "გასაყიდი ფასი": Number((p as { sale_price: number }).sale_price).toFixed(2),
      "რაოდენობა": (p as { quantity: number }).quantity,
      "ერთეული": (p as { unit: string }).unit,
    }))
    exportToExcel(data, `პროდუქტები_${new Date().toISOString().slice(0, 10)}`, "პროდუქტები")
    toast.success("Excel ჩამოიტვირთა")
  }

  async function handleImportProducts(e: React.ChangeEvent<HTMLInputElement>) {
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
        if (name && salePrice > 0) {
          const { data: { user } } = await supabase.auth.getUser()
          const { data: product } = await supabase.from("products").insert({ name, purchase_price: purchasePrice, sale_price: salePrice, quantity, unit }).select().single()
          if (product && quantity > 0) {
            await supabase.from("transactions").insert({
              product_id: product.id,
              type: "purchase",
              quantity,
              price_per_unit: purchasePrice,
              total_amount: purchasePrice * quantity,
              user_id: user?.id
            })
          }
          count++
        }
      }
      toast.success(`${count} პროდუქტი იმპორტირდა`)
      await logAction("პროდუქტების იმპორტი", { count, fileName: file.name })
      mutate("products")
      mutate("dashboard-data")
    } catch {
      toast.error("ფაილის წაკითხვის შეცდომა")
    }
    if (fileInputRef.current) fileInputRef.current.value = ""
  }

  // New product form
  const [productName, setProductName] = useState("")
  const [categoryId, setCategoryId] = useState("")
  const [description, setDescription] = useState("")
  const [purchasePrice, setPurchasePrice] = useState("")
  const [salePrice, setSalePrice] = useState("")
  const [quantity, setQuantity] = useState("")
  const [unit, setUnit] = useState("ცალი")
  const [supplierId, setSupplierId] = useState("")

  // Add stock form
  const [stockProductId, setStockProductId] = useState("")
  const [stockQuantity, setStockQuantity] = useState("")
  const [stockPrice, setStockPrice] = useState("")
  const [stockSupplierId, setStockSupplierId] = useState("")

  async function handleAddProduct(e: React.FormEvent) {
    e.preventDefault()
    setLoading(true)

    const { data: product, error } = await supabase
      .from("products")
      .insert({
        name: productName,
        category_id: categoryId || null,
        description: description || null,
        purchase_price: Number(purchasePrice),
        sale_price: Number(salePrice),
        quantity: Number(quantity),
        unit,
        supplier_id: supplierId || null,
      })
      .select()
      .single()

    const { data: { user } } = await supabase.auth.getUser()

    if (error) {
      toast.error("შეცდომა პროდუქტის დამატებისას")
      setLoading(false)
      return
    }

    // Record as purchase transaction
    if (Number(quantity) > 0) {
      await supabase.from("transactions").insert({
        product_id: product.id,
        type: "purchase",
        quantity: Number(quantity),
        price_per_unit: Number(purchasePrice),
        total_amount: Number(purchasePrice) * Number(quantity),
        user_id: user?.id,
        supplier_id: supplierId || null,
      })
    }

    toast.success("პროდუქტი წარმატებით დაემატა")
    await logAction("პროდუქტის რეგისტრაცია", { name: productName, purchase_price: purchasePrice })
    setProductName("")
    setCategoryId("")
    setDescription("")
    setPurchasePrice("")
    setSalePrice("")
    setQuantity("")
    setUnit("ცალი")
    setSupplierId("")
    setShowNewProduct(false)
    setLoading(false)
    mutate("products")
    mutate("categories")
    mutate("dashboard-data")
  }

  async function handleAddStock(e: React.FormEvent) {
    e.preventDefault()
    setLoading(true)

    const product = products.find((p) => p.id === stockProductId)
    if (!product) {
      toast.error("პროდუქტი ვერ მოიძებნა")
      setLoading(false)
      return
    }

    const price = Number(stockPrice) || product.purchase_price
    const qty = Number(stockQuantity)

    // Update product quantity and purchase price
    const { error: updateError } = await supabase
      .from("products")
      .update({
        quantity: product.quantity + qty,
        purchase_price: price,
        supplier_id: stockSupplierId || product.supplier_id,
        updated_at: new Date().toISOString(),
      })
      .eq("id", stockProductId)

    if (updateError) {
      toast.error("შეცდომა სტოკის დამატებისას")
      setLoading(false)
      return
    }

    const { data: { user } } = await supabase.auth.getUser()

    // Record transaction
    await supabase.from("transactions").insert({
      product_id: stockProductId,
      type: "purchase",
      quantity: qty,
      price_per_unit: price,
      total_amount: price * qty,
      user_id: user?.id,
      supplier_id: stockSupplierId || null,
    })

    toast.success("სტოკი წარმატებით დაემატა")
    await logAction("სტოკის დამატება", { product_id: stockProductId, quantity: qty })
    setStockProductId("")
    setStockQuantity("")
    setStockPrice("")
    setStockSupplierId("")
    setShowAddStock(false)
    setLoading(false)
    mutate("products")
    mutate("dashboard-data")
  }

  return (
    <div>
      <PrintHeader title="შესყიდვები" />
      <div className="mb-6 flex items-center justify-between">
        <h1 className="text-2xl font-bold text-foreground">{"შესყიდვები"}</h1>
        <div className="flex gap-2 no-print">
          <Button variant="outline" onClick={handleDownloadTemplate} aria-label="Excel შაბლონი">
            <Download className="mr-2 h-5 w-5" /> Excel შაბლონი
          </Button>
          <Button variant="outline" onClick={handleExportProducts} aria-label="Excel ექსპორტი">
            <Download className="mr-2 h-5 w-5" /> Excel ექსპორტი
          </Button>
          <Button variant="outline" onClick={() => fileInputRef.current?.click()} aria-label="Excel იმპორტი">
            <Upload className="mr-2 h-5 w-5" /> Excel იმპორტი
          </Button>
          <input ref={fileInputRef} type="file" accept=".xlsx,.xls,.csv" className="hidden" onChange={handleImportProducts} />
          <Button variant="outline" size="icon" onClick={() => window.print()} aria-label="ბეჭდვა">
            <Printer className="h-5 w-5" />
          </Button>
        </div>
      </div>

      {/* Category Manager */}
      <CategoryManager categories={categories} />

      {/* Action Buttons */}
      <div className="mb-6 flex flex-wrap items-center gap-3">
        <Button onClick={() => { setShowNewProduct(true); setShowAddStock(false) }} className="gap-2">
          <Plus className="h-4 w-4" />
          {"ახალი პროდუქტი"}
        </Button>
        <Button variant="outline" onClick={() => { setShowAddStock(true); setShowNewProduct(false) }} className="gap-2">
          <Package className="h-4 w-4" />
          {"სტოკის დამატება"}
        </Button>
      </div>

      {/* New Product Form */}
      {showNewProduct && (
        <Card className="mb-6">
          <CardHeader>
            <CardTitle>{"ახალი პროდუქტის დამატება"}</CardTitle>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleAddProduct} className="flex flex-col gap-4">
              <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                <div className="flex flex-col gap-2">
                  <Label>{"პროდუქტის სახელი *"}</Label>
                  <Input
                    placeholder="მაგ: კოკა-კოლა 0.5ლ"
                    value={productName}
                    onChange={(e) => setProductName(e.target.value)}
                    required
                  />
                </div>
                <div className="flex flex-col gap-2">
                  <Label>{"კატეგორია"}</Label>
                  <Select value={categoryId} onValueChange={setCategoryId}>
                    <SelectTrigger>
                      <SelectValue placeholder="აირჩიეთ (არასავალდებულო)" />
                    </SelectTrigger>
                    <SelectContent>
                      {categories.map((cat) => (
                        <SelectItem key={cat.id} value={cat.id}>
                          {cat.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div className="flex flex-col gap-2">
                <Label>{"აღწერა"}</Label>
                <Textarea
                  placeholder="პროდუქტის აღწერა..."
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                />
              </div>

              <div className="grid grid-cols-2 gap-4 md:grid-cols-4">
                <div className="flex flex-col gap-2">
                  <Label>{`შესყიდვის ფასი (\u20BE) *`}</Label>
                  <Input
                    type="number"
                    step="0.01"
                    min="0"
                    placeholder="0.00"
                    value={purchasePrice}
                    onChange={(e) => setPurchasePrice(e.target.value)}
                    required
                  />
                </div>
                <div className="flex flex-col gap-2">
                  <Label>{`გასაყიდი ფასი (\u20BE) *`}</Label>
                  <Input
                    type="number"
                    step="0.01"
                    min="0"
                    placeholder="0.00"
                    value={salePrice}
                    onChange={(e) => setSalePrice(e.target.value)}
                    required
                  />
                </div>
                <div className="flex flex-col gap-2">
                  <Label>{"რაოდენობა *"}</Label>
                  <Input
                    type="number"
                    min="0"
                    placeholder="0"
                    value={quantity}
                    onChange={(e) => setQuantity(e.target.value)}
                    required
                  />
                </div>
                <div className="flex flex-col gap-2">
                  <Label>{"ერთეული"}</Label>
                  <Select value={unit} onValueChange={setUnit}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="ცალი">{"ცალი"}</SelectItem>
                      <SelectItem value="კგ">{"კგ"}</SelectItem>
                      <SelectItem value="ლიტრი">{"ლიტრი"}</SelectItem>
                      <SelectItem value="მეტრი">{"მეტრი"}</SelectItem>
                      <SelectItem value="კომპლექტი">{"კომპლექტი"}</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div className="flex flex-col gap-2">
                <Label>{"მომწოდებელი"}</Label>
                <Select value={supplierId} onValueChange={setSupplierId}>
                  <SelectTrigger>
                    <SelectValue placeholder="აირჩიეთ მომწოდებელი" />
                  </SelectTrigger>
                  <SelectContent>
                    {suppliers.map((s: any) => (
                      <SelectItem key={s.id} value={s.id}>
                        {s.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="flex justify-end gap-3">
                <Button type="button" variant="outline" onClick={() => setShowNewProduct(false)}>
                  {"გაუქმება"}
                </Button>
                <Button type="submit" disabled={loading}>
                  {loading ? "ემატება..." : "დამატება"}
                </Button>
              </div>
            </form>
          </CardContent>
        </Card>
      )}

      {/* Add Stock Form */}
      {showAddStock && (
        <Card className="mb-6">
          <CardHeader>
            <CardTitle>{"სტოკის დამატება"}</CardTitle>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleAddStock} className="flex flex-col gap-4">
              <div className="flex flex-col gap-2">
                <Label>{"პროდუქტი *"}</Label>
                <Select value={stockProductId} onValueChange={(v) => {
                  setStockProductId(v)
                  const p = products.find((pr) => pr.id === v)
                  if (p) setStockPrice(String(p.purchase_price))
                }}>
                  <SelectTrigger>
                    <SelectValue placeholder="აირჩიეთ პროდუქტი" />
                  </SelectTrigger>
                  <SelectContent>
                    {products.map((p) => (
                      <SelectItem key={p.id} value={p.id}>
                        {p.name} {"(ნაშთი: "}{p.quantity}{")"}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="flex flex-col gap-2">
                <Label>{"მომწოდებელი"}</Label>
                <Select value={stockSupplierId} onValueChange={setStockSupplierId}>
                  <SelectTrigger>
                    <SelectValue placeholder="აირჩიეთ მომწოდებელი" />
                  </SelectTrigger>
                  <SelectContent>
                    {suppliers.map((s: any) => (
                      <SelectItem key={s.id} value={s.id}>
                        {s.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                <div className="flex flex-col gap-2">
                  <Label>{"რაოდენობა *"}</Label>
                  <Input
                    type="number"
                    min="1"
                    placeholder="0"
                    value={stockQuantity}
                    onChange={(e) => setStockQuantity(e.target.value)}
                    required
                  />
                </div>
                <div className="flex flex-col gap-2">
                  <Label>{`ფასი (\u20BE) *`}</Label>
                  <Input
                    type="number"
                    step="0.01"
                    min="0"
                    placeholder="0.00"
                    value={stockPrice}
                    onChange={(e) => setStockPrice(e.target.value)}
                    required
                  />
                </div>
              </div>
              {stockProductId && stockQuantity && stockPrice && (
                <div className="rounded-lg bg-muted p-3 text-sm">
                  <span className="font-medium">{"ჯამი: "}</span>
                  <span className="text-lg font-bold">
                    {(Number(stockQuantity) * Number(stockPrice)).toFixed(2)} {"\u20BE"}
                  </span>
                </div>
              )}
              <div className="flex justify-end gap-3">
                <Button type="button" variant="outline" onClick={() => setShowAddStock(false)}>
                  {"გაუქმება"}
                </Button>
                <Button type="submit" disabled={loading}>
                  {loading ? "ემატება..." : "დამატება"}
                </Button>
              </div>
            </form>
          </CardContent>
        </Card>
      )}
    </div>
  )
}
