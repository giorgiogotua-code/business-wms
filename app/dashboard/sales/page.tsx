"use client"

import { useState, useMemo } from "react"
import useSWR, { mutate } from "swr"
import { createClient } from "@/lib/supabase/client"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Printer, ShoppingCart, Download } from "lucide-react"
import { toast } from "sonner"
import { exportToExcel } from "@/lib/excel"
import { PrintHeader } from "@/components/print-header"
import { logAction } from "@/lib/audit"

const supabase = createClient()

interface Product {
  id: string
  name: string
  category_id: string | null
  purchase_price: number
  sale_price: number
  quantity: number
  unit: string
  categories: { name: string } | null
}

async function fetchProducts(): Promise<Product[]> {
  const { data } = await supabase.from("products").select("*, categories(name)").order("name")
  return (data as Product[]) || []
}

async function fetchCategories() {
  const { data } = await supabase.from("categories").select("*").order("name")
  return data || []
}

export default function SalesPage() {
  const { data: products = [] } = useSWR("products", fetchProducts)
  const { data: categories = [] } = useSWR("categories", fetchCategories)
  const [categoryFilter, setCategoryFilter] = useState("all")
  const [selectedProductId, setSelectedProductId] = useState("")
  const [quantity, setQuantity] = useState("")
  const [salePrice, setSalePrice] = useState("")
  const [loading, setLoading] = useState(false)

  const filteredProducts = useMemo(() => {
    if (categoryFilter === "all") return products.filter((p) => p.quantity > 0)
    return products.filter(
      (p) => p.quantity > 0 && p.category_id === categoryFilter
    )
  }, [products, categoryFilter])

  const selectedProduct = products.find((p) => p.id === selectedProductId)

  const totalAmount = Number(quantity) * Number(salePrice)

  function handleProductSelect(productId: string) {
    setSelectedProductId(productId)
    const product = products.find((p) => p.id === productId)
    if (product) {
      setSalePrice(String(product.sale_price))
    }
  }

  async function handleSale(e: React.FormEvent) {
    e.preventDefault()
    if (!selectedProduct) return
    setLoading(true)

    const qty = Number(quantity)
    if (qty > selectedProduct.quantity) {
      toast.error(`მარაგში მხოლოდ ${selectedProduct.quantity} ${selectedProduct.unit} არის`)
      setLoading(false)
      return
    }

    if (qty <= 0) {
      toast.error("რაოდენობა უნდა იყოს 0-ზე მეტი")
      setLoading(false)
      return
    }

    // Update product quantity
    const { error: updateError } = await supabase
      .from("products")
      .update({
        quantity: selectedProduct.quantity - qty,
        updated_at: new Date().toISOString(),
      })
      .eq("id", selectedProduct.id)

    if (updateError) {
      toast.error("შეცდომა გაყიდვისას")
      setLoading(false)
      return
    }

    const { data: { user } } = await supabase.auth.getUser()

    // Record transaction
    const { error: txError } = await supabase.from("transactions").insert({
      product_id: selectedProduct.id,
      type: "sale",
      quantity: qty,
      price_per_unit: Number(salePrice),
      total_amount: totalAmount,
      user_id: user?.id
    })

    if (txError) {
      toast.error("ტრანზაქციის შეცდომა")
      setLoading(false)
      return
    }

    toast.success(`${selectedProduct.name} - ${qty} ${selectedProduct.unit} გაიყიდა`)
    await logAction("გაყიდვა", { product: selectedProduct.name, quantity: qty, total: totalAmount })
    setSelectedProductId("")
    setQuantity("")
    setSalePrice("")
    setLoading(false)
    mutate("products")
    mutate("dashboard-data")
  }

  function handleExportSales() {
    const data = products.filter((p) => p.quantity > 0).map((p) => ({
      "პროდუქტი": p.name,
      "კატეგორია": p.categories?.name || "-",
      "შესყიდვის ფასი": Number(p.purchase_price).toFixed(2),
      "გასაყიდი ფასი": Number(p.sale_price).toFixed(2),
      "ნაშთი": p.quantity,
      "ერთეული": p.unit,
    }))
    exportToExcel(data, `გაყიდვა_პროდუქტები_${new Date().toISOString().slice(0, 10)}`, "პროდუქტები")
    toast.success("Excel ჩამოიტვირთა")
  }

  return (
    <div>
      <PrintHeader title="გაყიდვა" />
      <div className="mb-6 flex items-center justify-between">
        <h1 className="text-2xl font-bold text-foreground">{"გაყიდვა"}</h1>
        <div className="flex gap-2 no-print">
          <Button variant="outline" onClick={handleExportSales} aria-label="Excel ექსპორტი">
            <Download className="mr-2 h-5 w-5" /> Excel ექსპორტი
          </Button>
          <Button variant="outline" size="icon" onClick={() => window.print()} aria-label="ბეჭდვა">
            <Printer className="h-5 w-5" />
          </Button>
        </div>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>{"ახალი გაყიდვა"}</CardTitle>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSale} className="flex flex-col gap-4">
            {/* Category Filter */}
            <div className="flex flex-col gap-2">
              <Label>{"კატეგორია (ფილტრი)"}</Label>
              <Select value={categoryFilter} onValueChange={setCategoryFilter}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">{"ყველა"}</SelectItem>
                  {categories.map((cat) => (
                    <SelectItem key={cat.id} value={cat.id}>
                      {cat.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Product Selection */}
            <div className="flex flex-col gap-2">
              <Label>{"პროდუქტი *"}</Label>
              <Select value={selectedProductId} onValueChange={handleProductSelect}>
                <SelectTrigger>
                  <SelectValue placeholder="აირჩიეთ პროდუქტი" />
                </SelectTrigger>
                <SelectContent>
                  {filteredProducts.map((p) => (
                    <SelectItem key={p.id} value={p.id}>
                      {p.name} {`(ნაშთი: ${p.quantity} ${p.unit})`}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Product details */}
            {selectedProduct && (
              <div className="rounded-lg bg-muted p-3 text-sm">
                <div className="flex flex-wrap gap-x-6 gap-y-1">
                  <span>{"შესყიდვის ფასი: "}<strong>{Number(selectedProduct.purchase_price).toFixed(2)} {"\u20BE"}</strong></span>
                  <span>{"გასაყიდი ფასი: "}<strong>{Number(selectedProduct.sale_price).toFixed(2)} {"\u20BE"}</strong></span>
                  <span>{"ნაშთი: "}<strong>{selectedProduct.quantity} {selectedProduct.unit}</strong></span>
                </div>
              </div>
            )}

            {/* Quantity and Price */}
            <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
              <div className="flex flex-col gap-2">
                <Label>{"რაოდენობა *"}</Label>
                <Input
                  type="number"
                  min="1"
                  max={selectedProduct?.quantity}
                  placeholder="0"
                  value={quantity}
                  onChange={(e) => setQuantity(e.target.value)}
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
                  value={salePrice}
                  onChange={(e) => setSalePrice(e.target.value)}
                  required
                />
              </div>
            </div>

            {/* Total */}
            {quantity && salePrice && (
              <div className="rounded-lg bg-primary/5 p-4 text-center">
                <p className="text-sm text-muted-foreground">{"ჯამი"}</p>
                <p className="text-3xl font-bold text-foreground">
                  {totalAmount.toFixed(2)} {"\u20BE"}
                </p>
              </div>
            )}

            <Button type="submit" disabled={loading || !selectedProductId} size="lg" className="gap-2">
              <ShoppingCart className="h-5 w-5" />
              {loading ? "იტვირთება..." : "გაყიდვა"}
            </Button>
          </form>
        </CardContent>
      </Card>
    </div>
  )
}
