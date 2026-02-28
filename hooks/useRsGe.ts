"use client"

import { useState } from "react"
import { TinLookupResult, WaybillListItem } from "@/lib/rs-ge/types"

export function useRsGe() {
    const [loading, setLoading] = useState(false)
    const [error, setError] = useState<string | null>(null)

    const apiFetch = async (url: string, method = "GET", body?: any) => {
        setLoading(true)
        setError(null)
        try {
            const res = await fetch(url, {
                method,
                headers: { "Content-Type": "application/json" },
                body: body ? JSON.stringify(body) : undefined
            })
            const result = await res.json()
            if (!result.success) throw new Error(result.error)
            return result.data
        } catch (err: any) {
            setError(err.message)
            return null
        } finally {
            setLoading(false)
        }
    }

    const lookupTin = (tin: string): Promise<TinLookupResult | null> =>
        apiFetch(`/api/rs-ge/tin/${tin}`)

    const saveWaybill = (data: any) =>
        apiFetch("/api/rs-ge/waybill/save", "POST", data)

    const sendWaybill = (waybillId: string) =>
        apiFetch("/api/rs-ge/waybill/send", "POST", { waybillId })

    const deleteWaybill = (waybillId: string) =>
        apiFetch("/api/rs-ge/waybill", "DELETE", { waybillId })

    const closeWaybill = (waybillId: string) =>
        apiFetch("/api/rs-ge/waybill", "PUT", { waybillId })

    const getWaybills = (from: string, to: string): Promise<WaybillListItem[]> =>
        apiFetch(`/api/rs-ge/waybill?from=${from}&to=${to}`)

    const saveInvoice = (data: any) =>
        apiFetch("/api/rs-ge/invoice", "POST", data)

    const getInvoices = (from: string, to: string) =>
        apiFetch(`/api/rs-ge/invoice?from=${from}&to=${to}`)

    const clearError = () => setError(null)

    return {
        lookupTin,
        saveWaybill,
        sendWaybill,
        deleteWaybill,
        closeWaybill,
        getWaybills,
        saveInvoice,
        getInvoices,
        clearError,
        loading,
        error
    }
}
