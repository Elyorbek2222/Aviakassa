import { NextRequest, NextResponse } from 'next/server'
import * as XLSX from 'xlsx'
import { addTickets, addPayments, addInkassatsiya } from '@/lib/avia-storage'
import { parseTicketsExcel, parsePaymentsExcel, parseInkassatsiyaExcel } from '@/lib/avia-parser'
import { requireRole } from '@/lib/api-auth'

export async function POST(request: NextRequest) {
  try {
    // Excel yuklash — faqat admin (/upload sahifasi admin-only).
    const auth = await requireRole(['admin'])
    if (auth instanceof NextResponse) return auth

    const formData = await request.formData()
    const file = formData.get('file') as File
    const type = formData.get('type') as string

    if (!file) {
      return NextResponse.json({ error: 'Fayl tanlanmagan' }, { status: 400 })
    }

    const buffer = Buffer.from(await file.arrayBuffer())

    // type === 'all' — bitta Excel, 3 ta sheet (Biletlar, Tolovlar, Inkassatsiya)
    if (type === 'all') {
      const workbook = XLSX.read(buffer, { type: 'buffer' })
      const sheetNames = workbook.SheetNames.map(s => s.toLowerCase())
      const results: string[] = []

      // Sheet 1: Biletlar
      const biletIdx = sheetNames.findIndex(s => s.includes('bilet'))
      if (biletIdx >= 0) {
        const biletSheet = workbook.Sheets[workbook.SheetNames[biletIdx]]
        const biletBuffer = XLSX.write(
          (() => { const wb = XLSX.utils.book_new(); XLSX.utils.book_append_sheet(wb, biletSheet, 'Sheet1'); return wb })(),
          { type: 'buffer' }
        )
        const tickets = parseTicketsExcel(biletBuffer)
        if (tickets.length > 0) {
          await addTickets(tickets)
          results.push(`${tickets.length} ta bilet`)
        }
      }

      // Sheet 2: Tolovlar
      const tolovIdx = sheetNames.findIndex(s => s.includes('tolov'))
      if (tolovIdx >= 0) {
        const tolovSheet = workbook.Sheets[workbook.SheetNames[tolovIdx]]
        const tolovBuffer = XLSX.write(
          (() => { const wb = XLSX.utils.book_new(); XLSX.utils.book_append_sheet(wb, tolovSheet, 'Sheet1'); return wb })(),
          { type: 'buffer' }
        )
        const payments = parsePaymentsExcel(tolovBuffer)
        if (payments.length > 0) {
          await addPayments(payments)
          results.push(`${payments.length} ta to'lov`)
        }
      }

      // Sheet 3: Inkassatsiya
      const inkIdx = sheetNames.findIndex(s => s.includes('inkassats'))
      if (inkIdx >= 0) {
        const inkSheet = workbook.Sheets[workbook.SheetNames[inkIdx]]
        const inkBuffer = XLSX.write(
          (() => { const wb = XLSX.utils.book_new(); XLSX.utils.book_append_sheet(wb, inkSheet, 'Sheet1'); return wb })(),
          { type: 'buffer' }
        )
        const items = parseInkassatsiyaExcel(inkBuffer)
        if (items.length > 0) {
          for (const item of items) await addInkassatsiya(item)
          results.push(`${items.length} ta inkassatsiya`)
        }
      }

      if (results.length === 0) {
        return NextResponse.json({ error: "Sheetlar topilmadi (Biletlar, Tolovlar, Inkassatsiya)" }, { status: 400 })
      }

      return NextResponse.json({ message: `Yuklandi: ${results.join(', ')}` })
    }

    // Alohida sheet yuklash (eski usul ham ishlaydi)
    if (type === 'tickets') {
      const tickets = parseTicketsExcel(buffer)
      await addTickets(tickets)
      return NextResponse.json({ message: `${tickets.length} ta bilet yuklandi`, count: tickets.length })
    }

    if (type === 'payments') {
      const payments = parsePaymentsExcel(buffer)
      await addPayments(payments)
      return NextResponse.json({ message: `${payments.length} ta to'lov yuklandi`, count: payments.length })
    }

    if (type === 'inkassatsiya') {
      const items = parseInkassatsiyaExcel(buffer)
      for (const item of items) await addInkassatsiya(item)
      return NextResponse.json({ message: `${items.length} ta inkassatsiya yuklandi`, count: items.length })
    }

    return NextResponse.json({ error: "Tur tanlang: all, tickets, payments yoki inkassatsiya" }, { status: 400 })
  } catch (err) {
    console.error('Upload error:', err)
    return NextResponse.json({ error: "Faylni o'qishda xatolik" }, { status: 500 })
  }
}
