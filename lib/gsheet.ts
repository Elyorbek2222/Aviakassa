/**
 * Google Sheets bilan ikki tomonlama integratsiya.
 * O'QISH: CSV export orqali
 * YOZISH: doGet orqali (URL parameters)
 */

const SPREADSHEET_ID = process.env.GSHEET_SPREADSHEET_ID || '1neMhF_fvLogrYleY_-sQWLFC5SHGvUBTBbPPx83bzZg'
const WEBAPP_URL = process.env.GSHEET_WEBAPP_URL || ''

// ===== O'QISH =====

export async function fetchSheetCSV(sheetName: string): Promise<string | null> {
  try {
    const url = `https://docs.google.com/spreadsheets/d/${SPREADSHEET_ID}/gviz/tq?tqx=out:csv&sheet=${encodeURIComponent(sheetName)}`
    const res = await fetch(url, { cache: 'no-store' })
    if (!res.ok) return null
    return await res.text()
  } catch {
    return null
  }
}

// ===== YOZISH (doGet orqali — 100% ishlaydi) =====

interface AppendResult {
  success: boolean
  error?: string
}

export async function appendToSheet(
  sheetName: string,
  row: (string | number)[]
): Promise<AppendResult> {
  if (!WEBAPP_URL) {
    return { success: false, error: 'GSHEET_WEBAPP_URL sozlanmagan' }
  }

  try {
    const rowEncoded = encodeURIComponent(JSON.stringify(row))
    const url = `${WEBAPP_URL}?sheet=${encodeURIComponent(sheetName)}&row=${rowEncoded}`
    const res = await fetch(url, { cache: 'no-store' })
    if (!res.ok) {
      return { success: false, error: `HTTP ${res.status}` }
    }
    return { success: true }
  } catch (err) {
    return { success: false, error: err instanceof Error ? err.message : 'Xatolik' }
  }
}
