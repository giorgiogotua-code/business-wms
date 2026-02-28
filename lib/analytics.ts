import { format, subDays, startOfDay, isWithinInterval } from "date-fns"

export interface TransactionData {
    created_at: string
    type: "purchase" | "sale"
    total_amount: number
    products?: {
        name: string
    }
}

export function aggregateDailyData(transactions: TransactionData[], days: number = 30) {
    const dataMap = new Map()
    const now = new Date()

    // Initialize map with last N days
    for (let i = days - 1; i >= 0; i--) {
        const date = format(subDays(now, i), "yyyy-MM-dd")
        dataMap.set(date, { date, sales: 0, purchases: 0 })
    }

    transactions.forEach((t) => {
        const date = format(new Date(t.created_at), "yyyy-MM-dd")
        if (dataMap.has(date)) {
            const entry = dataMap.get(date)
            if (t.type === "sale") entry.sales += Number(t.total_amount)
            else entry.purchases += Number(t.total_amount)
        }
    })

    return Array.from(dataMap.values())
}

export function getTopProducts(transactions: TransactionData[], limit: number = 5) {
    const productMap = new Map<string, number>()

    transactions
        .filter((t) => t.type === "sale")
        .forEach((t) => {
            const name = t.products?.name || "უცნობი"
            productMap.set(name, (productMap.get(name) || 0) + Number(t.total_amount))
        })

    return Array.from(productMap.entries())
        .map(([name, value]) => ({ name, value }))
        .sort((a, b) => b.value - a.value)
        .slice(0, limit)
}
