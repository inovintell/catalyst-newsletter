import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/db'
import { updateAgentOnSourceChange } from '@/lib/agent-manager'

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    const source = await prisma.newsSource.findUnique({
      where: { id: parseInt(id) }
    })

    if (!source) {
      return NextResponse.json(
        { error: 'Source not found' },
        { status: 404 }
      )
    }

    return NextResponse.json(source)
  } catch (error) {
    console.error('Error fetching source:', error)
    return NextResponse.json(
      { error: 'Failed to fetch source' },
      { status: 500 }
    )
  }
}

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    const body = await request.json()

    const source = await prisma.newsSource.update({
      where: { id: parseInt(id) },
      data: {
        website: body.website,
        topic: body.topic,
        link: body.link,
        comment: body.comment,
        geoScope: body.geoScope,
        importanceLevel: body.importanceLevel,
        requiresScreening: body.requiresScreening,
        active: body.active
      }
    })

    // Update agent configuration when source is modified
    await updateAgentOnSourceChange()

    return NextResponse.json(source)
  } catch (error) {
    console.error('Error updating source:', error)
    return NextResponse.json(
      { error: 'Failed to update source' },
      { status: 500 }
    )
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    await prisma.newsSource.delete({
      where: { id: parseInt(id) }
    })

    // Update agent configuration when source is deleted
    await updateAgentOnSourceChange()

    return NextResponse.json({ message: 'Source deleted successfully' })
  } catch (error) {
    console.error('Error deleting source:', error)
    return NextResponse.json(
      { error: 'Failed to delete source' },
      { status: 500 }
    )
  }
}