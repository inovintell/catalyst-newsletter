import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/db'
import { updateAgentOnSourceChange } from '@/lib/agent-manager'

export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams
    const topic = searchParams.get('topic')
    const geoScope = searchParams.get('geoScope')
    const active = searchParams.get('active')

    const where: any = {}
    if (topic) where.topic = { contains: topic, mode: 'insensitive' }
    if (geoScope) where.geoScope = { contains: geoScope, mode: 'insensitive' }
    if (active !== null) where.active = active === 'true'

    const sources = await prisma.newsSource.findMany({
      where,
      orderBy: { createdAt: 'desc' }
    })

    return NextResponse.json(sources)
  } catch (error) {
    console.error('Error fetching sources:', error)
    return NextResponse.json(
      { error: 'Failed to fetch sources' },
      { status: 500 }
    )
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()

    const source = await prisma.newsSource.create({
      data: {
        website: body.website,
        topic: body.topic,
        link: body.link,
        comment: body.comment || null,
        geoScope: body.geoScope,
        importanceLevel: body.importanceLevel || null,
        requiresScreening: body.requiresScreening || false,
        active: body.active !== false
      }
    })

    // Update agent configuration when source is added
    await updateAgentOnSourceChange()

    return NextResponse.json(source, { status: 201 })
  } catch (error) {
    console.error('Error creating source:', error)
    return NextResponse.json(
      { error: 'Failed to create source' },
      { status: 500 }
    )
  }
}