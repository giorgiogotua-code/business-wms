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
  barcode: string | null
}

interface CartItem {
  id: string
  name: string
  quantity: number
  price: number
  unit: string
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
  const [cart, setCart] = useState<CartItem[]>([])
  const [loading, setLoading] = useState(false)
  const [barcodeScan, setBarcodeScan] = useState("")

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
      setQuantity("1")
    }
  }

  function addToCart(e: React.FormEvent) {
    e.preventDefault()
    if (!selectedProduct) return

    const qty = Number(quantity)
    if (qty > selectedProduct.quantity) {
      toast.error(`მარაგში მხოლოდ ${selectedProduct.quantity} ${selectedProduct.unit} არის`)
      return
    }

    if (qty <= 0) {
      toast.error("რაოდენობა უნდა იყოს 0-ზე მეტი")
      return
    }

    const existingIndex = cart.findIndex(item => item.id === selectedProduct.id)
    if (existingIndex > -1) {
      const newCart = [...cart]
      newCart[existingIndex].quantity += qty
      setCart(newCart)
    } else {
      setCart([...cart, {
        id: selectedProduct.id,
        name: selectedProduct.name,
        quantity: qty,
        price: Number(salePrice),
        unit: selectedProduct.unit
      }])
    }

    setSelectedProductId("")
    setQuantity("")
    setSalePrice("")
    toast.success(`${selectedProduct.name} დაემატა კალათაში`)
  }

  function handleBarcodeSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!barcodeScan) return

    const product = products.find(p => p.barcode === barcodeScan)
    if (!product) {
      toast.error("პროდუქტი ბარკოდით ვერ მოიძებნა")
      setBarcodeScan("")
      return
    }

    if (product.quantity <= 0) {
      toast.error("პროდუქტი ამოწურულია")
      setBarcodeScan("")
      return
    }

    // Add to cart logic (similar to addToCart but automated)
    const existingIndex = cart.findIndex(item => item.id === product.id)
    if (existingIndex > -1) {
      const newCart = [...cart]
      if (newCart[existingIndex].quantity + 1 > product.quantity) {
        toast.error("მარაგი არ არის საკმარისი")
      } else {
        newCart[existingIndex].quantity += 1
        setCart(newCart)
        toast.success(`${product.name} დაემატა (+1)`)
      }
    } else {
      setCart([...cart, {
        id: product.id,
        name: product.name,
        quantity: 1,
        price: product.sale_price,
        unit: product.unit
      }])
      toast.success(`${product.name} დაემატა კალათაში`)
    }

    setBarcodeScan("")
  }

  function removeFromCart(id: string) {
    setCart(cart.filter(item => item.id !== id))
  }

  const cartTotal = cart.reduce((sum, item) => sum + (item.price * item.quantity), 0)

  async function handleCheckout() {
    if (cart.length === 0) return
    setLoading(true)

    try {
      const { data: { user } } = await supabase.auth.getUser()

      for (const item of cart) {
        const product = products.find(p => p.id === item.id)
        if (!product) continue

        // 1. Update Inventory
        const { error: pError } = await supabase
          .from("products")
          .update({ quantity: product.quantity - item.quantity })
          .eq("id", item.id)

        if (pError) throw pError

        // 2. Insert Transaction
        const { error: tError } = await supabase.from("transactions").insert({
          product_id: item.id,
          type: "sale",
          quantity: item.quantity,
          price_per_unit: item.price,
          total_amount: item.price * item.quantity,
          user_id: user?.id
        })

        if (tError) throw tError
      }

      toast.success("გაყიდვა წარმატებით დასრულდა")
      await logAction("ჯგუფური გაყიდვა", { items: cart.length, total: cartTotal })
      setCart([])
      mutate("products")
      mutate("dashboard-data")
    } catch (error) {
      console.error(error)
      toast.error("დაფიქსირდა შეცდომა")
    } finally {
      setLoading(false)
    }
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

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
        {/* Selection Form */}
        <div className="lg:col-span-2 space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>{"პროდუქტის შერჩევა"}</CardTitle>
            </CardHeader>
            <CardContent className="space-y-6">
              {/* Barcode Scanner Input */}
              <form onSubmit={handleBarcodeSubmit} className="relative">
                <div className="flex flex-col gap-2">
                  <Label className="text-primary flex items-center gap-2">
                    <span className="flex h-2 w-2 rounded-full bg-primary animate-pulse" />
                    {"ბარკოდის სკანერი (დაასკანერეთ)"}
                  </Label>
                  <Input
                    placeholder="დაასკანერეთ შტრიხკოდი..."
                    className="h-12 text-lg border-primary/50 focus:border-primary focus:ring-primary/20"
                    value={barcodeScan}
                    onChange={(e) => setBarcodeScan(e.target.value)}
                    autoFocus
                  />
                </div>
              </form>

              <div className="relative py-2">
                <div className="absolute inset-0 flex items-center">
                  <span className="w-full border-t" />
                </div>
                <div className="relative flex justify-center text-xs uppercase">
                  <span className="bg-card px-2 text-muted-foreground">{"ან ხელით შერჩევა"}</span>
                </div>
              </div>

              <form onSubmit={addToCart} className="flex flex-col gap-4">
                <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                  {/* Category Filter */}
                  <div className="flex flex-col gap-2">
                    <Label>{"კატეგორია"}</Label>
                    <Select value={categoryFilter} onValueChange={setCategoryFilter}>
                      <SelectTrigger><SelectValue /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="all">{"ყველა"}</SelectItem>
                        {categories.map((cat) => (
                          <SelectItem key={cat.id} value={cat.id}>{cat.name}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  {/* Product Selection */}
                  <div className="flex flex-col gap-2">
                    <Label>{"პროდუქტი *"}</Label>
                    <Select value={selectedProductId} onValueChange={handleProductSelect}>
                      <SelectTrigger><SelectValue placeholder="აირჩიეთ პროდუქტი" /></SelectTrigger>
                      <SelectContent>
                        {filteredProducts.map((p) => (
                          <SelectItem key={p.id} value={p.id}>
                            {p.name} {`(ნაშთი: ${p.quantity} ${p.unit})`}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                </div>

                {selectedProduct && (
                  <div className="rounded-lg bg-muted p-3 text-sm flex justify-between items-center">
                    <div>
                      <p>გასაყიდი ფასი: <strong>{Number(selectedProduct.sale_price).toFixed(2)} ⾾</strong></p>
                      <p>ნაშთი: <strong>{selectedProduct.quantity} {selectedProduct.unit}</strong></p>
                    </div>
                  </div>
                )}

                <div className="grid grid-cols-2 gap-4">
                  <div className="flex flex-col gap-2">
                    <Label>{"რაოდენობა *"}</Label>
                    <Input
                      type="number"
                      min="1"
                      max={selectedProduct?.quantity}
                      value={quantity}
                      onChange={(e) => setQuantity(e.target.value)}
                      required
                    />
                  </div>
                  <div className="flex flex-col gap-2">
                    <Label>{"ფასი (⾾) *"}</Label>
                    <Input
                      type="number"
                      step="0.01"
                      value={salePrice}
                      onChange={(e) => setSalePrice(e.target.value)}
                      required
                    />
                  </div>
                </div>

                <Button type="submit" variant="outline" className="gap-2 border-primary text-primary hover:bg-primary/10">
                  <ShoppingCart className="h-4 w-4" />
                  კალათაში დამატება
                </Button>
              </form>
            </CardContent>
          </Card>
        </div>

        {/* Cart Sidebar */}
        <div className="lg:col-span-1">
          <Card className="h-full flex flex-col sticky top-6">
            <CardHeader className="border-b">
              <CardTitle className="flex items-center gap-2">
                <ShoppingCart className="h-5 w-5 text-primary" />
                კალათა
              </CardTitle>
            </CardHeader>
            <CardContent className="flex-1 p-0 overflow-auto max-h-[500px]">
              {cart.length === 0 ? (
                <div className="p-8 text-center text-muted-foreground italic">
                  კალათა ცარიელია
                </div>
              ) : (
                <div className="divide-y">
                  {cart.map((item) => (
                    <div key={item.id} className="p-4 flex justify-between items-center group">
                      <div>
                        <p className="font-bold">{item.name}</p>
                        <p className="text-xs text-muted-foreground">{item.quantity} {item.unit} x {item.price.toFixed(2)} ⾾</p>
                      </div>
                      <div className="flex items-center gap-3">
                        <p className="font-bold">{(item.quantity * item.price).toFixed(2)} ⾾</p>
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-8 w-8 text-destructive opacity-0 group-hover:opacity-100 transition-opacity"
                          onClick={() => removeFromCart(item.id)}
                        >
                          &times;
                        </Button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
            {cart.length > 0 && (
              <div className="p-4 border-t space-y-4 bg-muted/20">
                <div className="flex justify-between items-center text-lg">
                  <span className="font-bold">სულ:</span>
                  <span className="font-bold text-2xl text-primary">{cartTotal.toFixed(2)} ⾾</span>
                </div>
                <Button
                  className="w-full h-12 text-lg gap-2"
                  disabled={loading}
                  onClick={handleCheckout}
                >
                  <ShoppingCart className="h-5 w-5" />
                  {loading ? "მუშავდება..." : "გაფორმება"}
                </Button>
                <Button
                  variant="ghost"
                  className="w-full text-xs text-muted-foreground h-8"
                  onClick={() => setCart([])}
                  disabled={loading}
                >
                  გასუფთავება
                </Button>
              </div>
            )}
          </Card>
        </div>
      </div>
    </div>
  )
}
