import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/db'

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

    const text = await file.text()
    const lines = text.split('\n').filter(line => line.trim())

    // Skip header line if it exists
    const dataLines = lines[0].includes('Website') ? lines.slice(1) : lines

    const imported = []
    const skipped = []
    const updated = []
    const errors = []

    for (let i = 0; i < dataLines.length; i++) {
      const line = dataLines[i]
      // Parse CSV line (handling semicolon delimiter as in the sample)
      const parts = line.split(';').map(p => p.trim())

      if (parts.length < 5) {
        errors.push(`Line ${i + 2}: Invalid format`)
        continue
      }

      const [website, topic, link, comment, geoScope, ...rest] = parts

      try {
        // Check for existing source with same website and topic
        const existingSource = await prisma.newsSource.findFirst({
          where: {
            website: website || 'Unknown',
            topic: topic || 'General'
          }
        })

        const sourceData = {
          website: website || 'Unknown',
          topic: topic || 'General',
          link: link || '',
          comment: comment || null,
          geoScope: geoScope || 'Global',
          importanceLevel: comment?.includes('Important') ? 'Important' :
                         comment?.includes('Less important') ? 'Less important' : null,
          requiresScreening: comment?.includes('Requires screening') || false,
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
        errors.push(`Line ${i + 2}: Failed to import - ${error}`)
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