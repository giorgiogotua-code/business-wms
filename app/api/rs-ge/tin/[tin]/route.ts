import { NextResponse } from "next/server"
import { getNameFromTin, isVatPayer } from "@/lib/rs-ge/waybill"
import { handleRsError } from "../../api-utils"

export async function GET(req: Request, { params }: { params: { tin: string } }) {
    try {
        const { tin } = params
        const [name, vat] = await Promise.all([
            getNameFromTin(tin),
            isVatPayer(tin)
        ])
        return NextResponse.json({ success: true, data: { tin, name, isVatPayer: vat } })
    } catch (error) {
        return handleRsError(error)
    }
}
