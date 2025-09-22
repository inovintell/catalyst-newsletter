import { NextRequest, NextResponse } from 'next/server'
import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams
    const status = searchParams.get('status')
    const limit = searchParams.get('limit')

    const where: any = {}
    if (status && status !== 'all') {
      where.status = status
    }

    const newsletters = await prisma.newsletter.findMany({
      where,
      orderBy: { createdAt: 'desc' },
      take: limit ? parseInt(limit) : undefined
    })

    // Also include generation records
    const generations = await prisma.newsletterGeneration.findMany({
      where: status && status !== 'all' ? { status } : {},
      orderBy: { createdAt: 'desc' },
      take: limit ? parseInt(limit) : undefined
    })

    // Combine and format the results
    const combined = [
      ...newsletters.map(n => ({
        id: n.id,
        title: n.title,
        status: n.status,
        createdAt: n.createdAt,
        content: n.content,
        parameters: n.parameters,
        type: 'newsletter'
      })),
      ...generations.map(g => ({
        id: g.id,
        title: `Newsletter Generation ${g.id}`,
        status: g.status,
        createdAt: g.createdAt,
        content: { output: g.output },
        parameters: g.config,
        type: 'generation'
      }))
    ].sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())

    return NextResponse.json(combined)

  } catch (error) {
    console.error('Error fetching newsletters:', error)
    return NextResponse.json(
      { error: 'Failed to fetch newsletters' },
      { status: 500 }
    )
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()

    const newsletter = await prisma.newsletter.create({
      data: {
        title: body.title || 'Untitled Newsletter',
        content: body.content || {},
        sourcesUsed: body.sourcesUsed || [],
        parameters: body.parameters || {},
        status: body.status || 'draft'
      }
    })

    return NextResponse.json(newsletter, { status: 201 })

  } catch (error) {
    console.error('Error creating newsletter:', error)
    return NextResponse.json(
      { error: 'Failed to create newsletter' },
      { status: 500 }
    )
  }
}