import * as XLSX from 'xlsx'

export interface ParsedSourceRow {
  website: string
  topic: string
  link: string
  comment: string | null
  geoScope: string
}

export async function parseExcelFile(file: File): Promise<ParsedSourceRow[]> {
  const arrayBuffer = await file.arrayBuffer()
  const workbook = XLSX.read(arrayBuffer, { type: 'array' })

  // Get first worksheet
  const firstSheetName = workbook.SheetNames[0]
  const worksheet = workbook.Sheets[firstSheetName]

  if (!worksheet) {
    throw new Error('Excel file contains no worksheets')
  }

  // Convert to JSON with header row
  const jsonData = XLSX.utils.sheet_to_json(worksheet, { header: 1 }) as any[][]

  if (jsonData.length < 2) {
    throw new Error('Excel file must contain header row and at least one data row')
  }

  // Extract headers (first row)
  const headers = jsonData[0].map((h: any) => String(h).trim().toLowerCase())

  // Find column indices
  const websiteIdx = headers.findIndex((h: string) => h.includes('website'))
  const topicIdx = headers.findIndex((h: string) => h.includes('topic'))
  const linkIdx = headers.findIndex((h: string) => h.includes('link'))
  const commentIdx = headers.findIndex((h: string) => h.includes('comment'))
  const geoScopeIdx = headers.findIndex((h: string) => h.includes('geo') || h.includes('scope'))

  if (websiteIdx === -1 || topicIdx === -1 || linkIdx === -1) {
    throw new Error('Excel file must contain Website, Topic, and Link columns')
  }

  const results: ParsedSourceRow[] = []

  // Process data rows
  for (let i = 1; i < jsonData.length; i++) {
    const row = jsonData[i]

    if (!row || row.length === 0) continue

    // Get cell addresses for hyperlink extraction
    const linkCellAddress = XLSX.utils.encode_cell({ r: i, c: linkIdx })
    const cell = worksheet[linkCellAddress]

    // Extract URL from hyperlink or cell value
    let linkValue = ''
    if (cell) {
      // Check for hyperlink
      if (cell.l && cell.l.Target) {
        linkValue = cell.l.Target
      } else {
        linkValue = String(cell.v || '').trim()
      }
    }

    results.push({
      website: String(row[websiteIdx] || 'Unknown').trim(),
      topic: String(row[topicIdx] || 'General').trim(),
      link: linkValue,
      comment: commentIdx !== -1 && row[commentIdx] ? String(row[commentIdx]).trim() : null,
      geoScope: geoScopeIdx !== -1 && row[geoScopeIdx] ? String(row[geoScopeIdx]).trim() : 'Global'
    })
  }

  return results
}
