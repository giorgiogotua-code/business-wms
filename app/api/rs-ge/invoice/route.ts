import { NextResponse } from "next/server"
import { saveInvoice, getInvoices } from "@/lib/rs-ge/invoice"
import { getRsCredentials, handleRsError } from "../api-utils"

export async function POST(req: Request) {
    try {
        const creds = await getRsCredentials()
        if (!creds) return NextResponse.json({ success: false, error: "rs.ge პარამეტრები არ არის კონფიგურირებული" }, { status: 401 })
        const body = await req.json()
        const result = await saveInvoice(creds, body)
        return NextResponse.json({ success: true, data: result })
    } catch (error) { return handleRsError(error) }
}

export async function GET(req: Request) {
    try {
        const creds = await getRsCredentials()
        if (!creds) return NextResponse.json({ success: false, error: "rs.ge პარამეტრები არ არის კონფიგურირებული" }, { status: 401 })
        const { searchParams } = new URL(req.url)
        const from = searchParams.get("from") || ""
        const to = searchParams.get("to") || ""
        const result = await getInvoices(creds, from, to)
        return NextResponse.json({ success: true, data: result })
    } catch (error) { return handleRsError(error) }
}
