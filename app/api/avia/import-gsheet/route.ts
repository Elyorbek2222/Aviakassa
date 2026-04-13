import { NextRequest, NextResponse } from 'next/server'
import * as XLSX from 'xlsx'
import { addTickets, addPayments, addInkassatsiya, clearTickets, clearPayments } from '@/lib/avia-storage'
import { parseTicketsExcel, parsePaymentsExcel, parseInkassatsiyaExcel } from '@/lib/avia-parser'

const SPREADSHEET_ID = '1neMhF_fvLogrYleY_-sQWLFC5SHGvUBTBbPPx83bzZg'

async function fetchSheetCSV(sheetName: string): Promise<string | null> {
  try {
    const url = `https://docs.google.com/spreadsheets/d/${SPREADSHEET_ID}/gviz/tq?tqx=out:csv&sheet=${encodeURIComponent(sheetName)}`
    const res = await fetch(url, { cache: 'no-store' })
    if (!res.ok) return null
    return await res.text()
  } catch {
    return null
  }
}

function csvToBuffer(csv: string): Buffer {
  // CSV ni xlsx workbook ga aylantiramiz
  const workbook = XLSX.read(csv, { type: 'string' })
  const buffer = XLSX.write(workbook, { type: 'buffer', bookType: 'xlsx' })
  return buffer
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json().catch(() => ({}))
    const fresh = body.fresh === true // true bo'lsa — eski datani tozalab, yangidan yuklaydi

    const results: string[] = []

    // Sheet 1: Biletlar
    const biletCSV = await fetchSheetCSV('Biletlar')
    if (biletCSV) {
      const buffer = csvToBuffer(biletCSV)
      const tickets = parseTicketsExcel(buffer)
      if (tickets.length > 0) {
        if (fresh) clearTickets()
        addTickets(tickets)
        results.push(`${tickets.length} ta bilet`)
      }
    }

    // Sheet 2: Tolovlar
    const tolovCSV = await fetchSheetCSV('Tolovlar')
    if (tolovCSV) {
      const buffer = csvToBuffer(tolovCSV)
      const payments = parsePaymentsExcel(buffer)
      if (payments.length > 0) {
        if (fresh) clearPayments()
        addPayments(payments)
        results.push(`${payments.length} ta to'lov`)
      }
    }

    // Sheet 3: Inkassatsiya
    const inkCSV = await fetchSheetCSV('Inkassatsiya')
    if (inkCSV) {
      const buffer = csvToBuffer(inkCSV)
      const items = parseInkassatsiyaExcel(buffer)
      if (items.length > 0) {
        for (const item of items) addInkassatsiya(item)
        results.push(`${items.length} ta inkassatsiya`)
      }
    }

    if (results.length === 0) {
      return NextResponse.json({ error: "Google Sheets'dan ma'lumot topilmadi" }, { status: 400 })
    }

    return NextResponse.json({
      message: `Google Sheets'dan yuklandi: ${results.join(', ')}`,
      details: results,
    })
  } catch (err) {
    console.error('GSheet import error:', err)
    return NextResponse.json({ error: "Google Sheets'dan o'qishda xatolik" }, { status: 500 })
  }
}
