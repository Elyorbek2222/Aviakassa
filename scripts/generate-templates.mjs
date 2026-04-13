import XLSX from 'xlsx'
import { mkdirSync } from 'fs'

mkdirSync('templates', { recursive: true })

// ============================================
// BITTA EXCEL — 3 ta SHEET
// ============================================

const workbook = XLSX.utils.book_new()

// ===== SHEET 1: BILETLAR =====
const biletHeaders = [
  'SANA',
  "UZAIRWAYS",
  'SILK AVIA',
  'CENTRUM',
  'DON AVIA',
  'EASYBOOKING',
  'BOSHQA',
  'BOSHQA NOMI',
  'BILET RAQAM',
  "YO'LOVCHI",
  'TARIF',
  'SOTISH NARXI',
  'AGENT',
]

const biletNamuna = [
  ['13.04.2026', 5200000, '', '', '', '', '', '', '250-1234567890', 'KARIMOV JASUR', 4800000, 5200000, 'Begzod'],
  ['13.04.2026', '', '', 3100000, '', '', '', '', 'CTM-0987654321', 'RAHIMOVA NILUFAR / 2', 2900000, 3100000, 'Begzod'],
  ['14.04.2026', '', 4500000, '', '', '', '', '', 'SLK-1122334455', 'TOSHMATOV ALISHER', 4200000, 4500000, 'Begzod'],
  ['14.04.2026', '', '', '', 2800000, '', '', '', 'DON-5566778899', 'SAIDOVA MADINA', 2600000, 2800000, 'Begzod'],
  ['15.04.2026', '', '', '', '', 3500000, '', '', 'EASY-1357924680', 'UMAROV SARDOR / 3', 3200000, 3500000, 'Begzod'],
  ['15.04.2026', '', '', '', '', '', 4100000, 'Turkish Airlines', 'TK-9876543210', 'ABDULLAYEV BOBUR', 3800000, 4100000, 'Begzod'],
]

const biletWS = XLSX.utils.aoa_to_sheet([biletHeaders, ...biletNamuna])
biletWS['!cols'] = [
  { wch: 12 }, { wch: 12 }, { wch: 12 }, { wch: 12 }, { wch: 12 },
  { wch: 12 }, { wch: 12 }, { wch: 18 }, { wch: 20 }, { wch: 28 },
  { wch: 12 }, { wch: 14 }, { wch: 12 },
]
XLSX.utils.book_append_sheet(workbook, biletWS, 'Biletlar')

// ===== SHEET 2: TOLOVLAR =====
const tolovHeaders = [
  'SANA',
  'MIJOZ ISMI',
  'SUMMA',
  "TO'LOV TURI",
  'BILET RAQAM',
  'VALYUTA',
  'DOLLAR SUMMA',
  'KURS',
  'IZOH',
]

const tolovNamuna = [
  ['13.04.2026', 'KARIMOV JASUR', 5200000, 'Naqd', '250-1234567890', 'UZS', '', '', "To'liq to'ladi"],
  ['13.04.2026', 'RAHIMOVA NILUFAR', 1500000, 'Plastik', 'CTM-0987654321', 'UZS', '', '', 'Qisman'],
  ['14.04.2026', 'TOSHMATOV ALISHER', '', 'Naqd', 'SLK-1122334455', 'USD', 350, 12850, 'Dollar bilan'],
  ['14.04.2026', 'SAIDOVA MADINA', 2800000, 'Perechisleniya', 'DON-5566778899', 'UZS', '', '', "To'liq bank orqali"],
  ['15.04.2026', 'UMAROV SARDOR', 2000000, 'Naqd', 'EASY-1357924680', 'UZS', '', '', 'Qisman naqd'],
]

const tolovWS = XLSX.utils.aoa_to_sheet([tolovHeaders, ...tolovNamuna])
tolovWS['!cols'] = [
  { wch: 12 }, { wch: 24 }, { wch: 14 }, { wch: 16 }, { wch: 20 },
  { wch: 10 }, { wch: 14 }, { wch: 10 }, { wch: 24 },
]
XLSX.utils.book_append_sheet(workbook, tolovWS, 'Tolovlar')

// ===== SHEET 3: INKASSATSIYA =====
const inkHeaders = [
  'SANA',
  'PARTNYYOR',
  'SUMMA',
  'IZOH',
]

const inkNamuna = [
  ['15.04.2026', "O'zbekiston Havo Yo'llari", 4800000, "Aprel oyining 1-yarmi uchun to'lov"],
  ['15.04.2026', 'Centrum', 2900000, "CTM biletlar bo'yicha"],
  ['16.04.2026', 'Silk Avia', 4200000, "Silk Avia to'lovi"],
]

const inkWS = XLSX.utils.aoa_to_sheet([inkHeaders, ...inkNamuna])
inkWS['!cols'] = [
  { wch: 12 }, { wch: 30 }, { wch: 14 }, { wch: 30 },
]
XLSX.utils.book_append_sheet(workbook, inkWS, 'Inkassatsiya')

// ===== YOZISH =====
XLSX.writeFile(workbook, 'templates/AviaKassa.xlsx')
console.log('✅ templates/AviaKassa.xlsx yaratildi')
console.log('')
console.log('📋 3 ta sheet (varaq):')
console.log('   1. Biletlar      — Begzod to\'ldiradi')
console.log('   2. Tolovlar      — Kassir to\'ldiradi')
console.log('   3. Inkassatsiya  — Buxgalter to\'ldiradi')
