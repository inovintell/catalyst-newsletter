import { NextRequest, NextResponse } from 'next/server'
import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params

    // Try to find in newsletters table first
    let newsletter = await prisma.newsletter.findUnique({
      where: { id: parseInt(id) }
    })

    if (!newsletter) {
      // Try to find in generations table
      const generation = await prisma.newsletterGeneration.findUnique({
        where: { id: parseInt(id) }
      })

      if (generation) {
        // Format generation as newsletter
        newsletter = {
          id: generation.id,
          title: `Newsletter Generation ${generation.id}`,
          content: { output: generation.output } as any,
          sourcesUsed: generation.config as any,
          parameters: generation.config as any,
          status: generation.status,
          createdAt: generation.createdAt,
          updatedAt: generation.updatedAt
        }
      }
    }

    if (!newsletter) {
      return NextResponse.json(
        { error: 'Newsletter not found' },
        { status: 404 }
      )
    }

    return NextResponse.json(newsletter)

  } catch (error) {
    console.error('Error fetching newsletter:', error)
    return NextResponse.json(
      { error: 'Failed to fetch newsletter' },
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

    const newsletter = await prisma.newsletter.update({
      where: { id: parseInt(id) },
      data: {
        title: body.title,
        content: body.content,
        sourcesUsed: body.sourcesUsed,
        parameters: body.parameters,
        status: body.status
      }
    })

    return NextResponse.json(newsletter)

  } catch (error) {
    console.error('Error updating newsletter:', error)
    return NextResponse.json(
      { error: 'Failed to update newsletter' },
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

    // Try to delete from newsletters table
    try {
      await prisma.newsletter.delete({
        where: { id: parseInt(id) }
      })
    } catch {
      // If not found in newsletters, try generations
      await prisma.newsletterGeneration.delete({
        where: { id: parseInt(id) }
      })
    }

    return NextResponse.json({ message: 'Newsletter deleted successfully' })

  } catch (error) {
    console.error('Error deleting newsletter:', error)
    return NextResponse.json(
      { error: 'Failed to delete newsletter' },
      { status: 500 }
    )
  }
}