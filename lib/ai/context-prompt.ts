import { createClient } from "@/lib/supabase/server"

export async function getBusinessContext() {
  const supabase = await createClient()

  const [productsRes, transactionsRes, categoriesRes] = await Promise.all([
    supabase.from("products").select("*, categories(name)"),
    supabase.from("transactions").select("*").order("created_at", { ascending: false }).limit(20),
    supabase.from("categories").select("*"),
  ])

  const products = productsRes.data || []
  const transactions = transactionsRes.data || []
  const categories = categoriesRes.data || []

  const lowStock = products.filter(p => p.quantity <= p.low_stock_threshold)

  const totalSales = transactions
    .filter(t => t.type === "sale")
    .reduce((sum, t) => sum + Number(t.total_amount), 0)

  let context = `შენ ხარ JabsOna AI ასისტენტი, პროფესიონალი ბიზნეს კონსულტანტი.
აქ მოცემულია კომპანიის მიმდინარე მდგომარეობა:

კატეგორიები: ${categories.map(c => c.name).join(", ")}

პროდუქტების ჯამური რაოდენობა: ${products.length}
დაბალი მარაგის მქონე პროდუქტები (${lowStock.length} ცალი):
${lowStock.map(p => `- ${p.name}: დარჩენილია ${p.quantity} ${p.unit} (მინიმალური: ${p.low_stock_threshold})`).join("\n")}

ბოლო 20 ტრანზაქცია (ჯამური გაყიდვები ბოლო პერიოდში: ${totalSales.toFixed(2)} ₾):
${transactions.map(t => `- ${t.type === "sale" ? "გაყიდვა" : "შესყიდვა"}: ${Number(t.total_amount).toFixed(2)} ₾ (${new Date(t.created_at).toLocaleDateString("ka-GE")})`).join("\n")}

ქცევის წესები:
1. პასუხი გაეცი ქართულად, მეგობრულად და პროფესიონალურად.
2. თუ გეკითხებიან ანალიტიკაზე, გამოიყენე ზემოთ მოცემული მონაცემები.
3. თუ მონაცემები არ გყოფნის, სთხოვე დამატებითი ინფორმაცია.
4. იყავი მოკლე და კონკრეტული.
`

  return context
}
