import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/db'
import { parseExcelFile } from '@/lib/excelParser'

export async function POST(request: NextRequest) {
  try {
    const formData = await request.formData()
    const file = formData.get('file') as File
    const duplicateAction = formData.get('duplicateAction') as string || 'skip'

    if (!file) {
      return NextResponse.json(
        { error: 'No file provided' },
        { status: 400 }
      )
    }

    // Validate file extension
    if (!file.name.endsWith('.xlsx') && !file.name.endsWith('.xls')) {
      return NextResponse.json(
        { error: 'Please upload an Excel file (.xlsx or .xls)' },
        { status: 400 }
      )
    }

    const imported = []
    const skipped = []
    const updated = []
    const errors = []

    let parsedData
    try {
      parsedData = await parseExcelFile(file)
    } catch (error) {
      return NextResponse.json(
        { error: `Failed to parse Excel file: ${error}` },
        { status: 400 }
      )
    }

    for (let i = 0; i < parsedData.length; i++) {
      const row = parsedData[i]

      try {
        // Check for existing source with same website and topic
        const existingSource = await prisma.newsSource.findFirst({
          where: {
            website: row.website,
            topic: row.topic
          }
        })

        const sourceData = {
          website: row.website,
          topic: row.topic,
          link: row.link,
          comment: row.comment,
          geoScope: row.geoScope,
          importanceLevel: row.comment?.includes('Important') ? 'Important' :
                         row.comment?.includes('Less important') ? 'Less important' : null,
          requiresScreening: row.comment?.includes('Requires screening') || false,
          active: true
        }

        if (existingSource) {
          if (duplicateAction === 'update') {
            const updatedSource = await prisma.newsSource.update({
              where: { id: existingSource.id },
              data: sourceData
            })
            updated.push(updatedSource)
          } else {
            skipped.push({
              website: sourceData.website,
              topic: sourceData.topic,
              reason: 'Duplicate found'
            })
          }
        } else {
          const source = await prisma.newsSource.create({
            data: sourceData
          })
          imported.push(source)
        }
      } catch (error) {
        errors.push(`Row ${i + 2}: Failed to import - ${error}`)
      }
    }

    return NextResponse.json({
      imported: imported.length,
      updated: updated.length,
      skipped: skipped.length,
      errors: errors.length,
      errorDetails: errors,
      skippedDetails: skipped,
      sources: imported
    })
  } catch (error) {
    console.error('Error importing sources:', error)
    return NextResponse.json(
      { error: 'Failed to import sources' },
      { status: 500 }
    )
  }
}