import { NextResponse } from "next/server"
import { deleteWaybill, closeWaybill, getWaybills } from "@/lib/rs-ge/waybill"
import { getRsCredentials, handleRsError } from "../api-utils"

export async function DELETE(req: Request) {
    try {
        const creds = await getRsCredentials()
        if (!creds) return NextResponse.json({ success: false, error: "rs.ge პარამეტრები არ არის კონფიგურირებული" }, { status: 401 })
        const { waybillId } = await req.json()
        await deleteWaybill(creds, waybillId)
        return NextResponse.json({ success: true })
    } catch (error) { return handleRsError(error) }
}

export async function PUT(req: Request) {
    try {
        const creds = await getRsCredentials()
        if (!creds) return NextResponse.json({ success: false, error: "rs.ge პარამეტრები არ არის კონფიგურირებული" }, { status: 401 })
        const { waybillId } = await req.json()
        await closeWaybill(creds, waybillId)
        return NextResponse.json({ success: true })
    } catch (error) { return handleRsError(error) }
}

export async function GET(req: Request) {
    try {
        const creds = await getRsCredentials()
        if (!creds) return NextResponse.json({ success: false, error: "rs.ge პარამეტრები არ არის კონფიგურირებული" }, { status: 401 })
        const { searchParams } = new URL(req.url)
        const from = searchParams.get("from") || ""
        const to = searchParams.get("to") || ""
        const result = await getWaybills(creds, from, to)
        return NextResponse.json({ success: true, data: result })
    } catch (error) { return handleRsError(error) }
}
