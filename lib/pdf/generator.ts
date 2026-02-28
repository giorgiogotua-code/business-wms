import jsPDF from "jspdf"
import autoTable from "jspdf-autotable"
import { NOTO_SANS_GEORGIAN_BASE64 } from "./fonts"

// Helper to register Georgian font
const setupFonts = (doc: jsPDF) => {
    if (NOTO_SANS_GEORGIAN_BASE64 && NOTO_SANS_GEORGIAN_BASE64.length > 100) {
        doc.addFileToVFS("NotoSans-Regular.ttf", NOTO_SANS_GEORGIAN_BASE64)
        doc.addFont("NotoSans-Regular.ttf", "NotoSans", "normal")
        doc.setFont("NotoSans")
        return true
    }
    return false
}

export async function generateWaybillPDF(data: any) {
    const doc = new jsPDF()
    const hasFont = setupFonts(doc)

    // Header
    doc.setFontSize(22)
    doc.setTextColor(40)
    doc.text("სასაქონლო ზედნადები", 105, 20, { align: "center" })

    doc.setFontSize(10)
    doc.text(`ნომერი: ${data.number || "---"}`, 15, 30)
    doc.text(`თარიღი: ${data.createDate || new Date().toLocaleDateString("ka-GE")}`, 15, 35)

    // Buyer/Seller Info
    doc.setDrawColor(200)
    doc.line(15, 40, 195, 40)

    doc.setFontSize(12)
    doc.text("მყიდველი:", 15, 50)
    doc.setFontSize(10)
    doc.text(data.buyerName || "---", 15, 55)
    doc.text(`ს/კ: ${data.buyerTin || "---"}`, 15, 60)

    doc.setFontSize(12)
    doc.text("მისამართი:", 120, 50)
    doc.setFontSize(10)
    doc.text(`საიდან: ${data.startAddress || "---"}`, 120, 55)
    doc.text(`სად: ${data.endAddress || "---"}`, 120, 60)

    // Goods Table
    const tableData = (data.goods || []).map((g: any, i: number) => [
        i + 1,
        g.name,
        g.quantity,
        g.price.toFixed(2),
        (g.quantity * g.price).toFixed(2)
    ])

    autoTable(doc, {
        startY: 70,
        head: [["#", "დასახელება", "რაოდენობა", "ფასი", "ჯამი"]],
        body: tableData,
        styles: { font: hasFont ? "NotoSans" : "helvetica", fontSize: 10 },
        headStyles: { fillColor: [63, 81, 181], font: hasFont ? "NotoSans" : "helvetica" },
        margin: { left: 15, right: 15 }
    })

    // Footer / Signatures
    const finalY = (doc as any).lastAutoTable.finalY + 20
    doc.text("ჩააბარა: ____________________", 15, finalY)
    doc.text("ჩაიბარა: ____________________", 120, finalY)

    doc.save(`Zeadnadebi_${data.number || "new"}.pdf`)
}

export async function generateInvoicePDF(data: any) {
    const doc = new jsPDF()
    const hasFont = setupFonts(doc)

    doc.setFontSize(22)
    doc.text("საგადასახადო ფაქტურა", 105, 20, { align: "center" })

    doc.setFontSize(10)
    doc.text(`ნომერი: ${data.number || "---"}`, 15, 35)

    const tableData = (data.items || []).map((item: any) => [
        item.name,
        item.quantity,
        item.price.toFixed(2),
        "18%",
        ((item.quantity * item.price) * 0.18).toFixed(2),
        (item.quantity * item.price * 1.18).toFixed(2)
    ])

    autoTable(doc, {
        startY: 50,
        head: [["დასახელება", "რაოდ.", "ფასი", "დღგ %", "დღგ", "სულ"]],
        body: tableData,
        headStyles: { fillColor: [46, 125, 50], font: hasFont ? "NotoSans" : "helvetica" },
        styles: { font: hasFont ? "NotoSans" : "helvetica" }
    })

    doc.save(`Invoice_${data.number || "new"}.pdf`)
}
