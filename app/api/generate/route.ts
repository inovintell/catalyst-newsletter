import { NextRequest, NextResponse } from 'next/server'
import { PrismaClient } from '@prisma/client'
import { generateAgentPrompt, generateAgentConfig, type AgentConfiguration } from '@/lib/agent-config'
import { withAuth } from '@/lib/auth/middleware'

const prisma = new PrismaClient()

export const POST = withAuth(async (request: NextRequest, context) => {
  try {
    const body = await request.json()
    const { dateRange, selectedSources, outputFormat, includeExecutiveSummary, groupByTopic, topics, geoScopes } = body

    // Log received request data
    console.log('[/api/generate POST] Received request:', {
      selectedSourcesCount: selectedSources?.length || 0,
      selectedSourceIds: selectedSources,
      dateRange,
      outputFormat
    })

    // Validate selectedSources is provided
    if (!selectedSources || !Array.isArray(selectedSources) || selectedSources.length === 0) {
      console.error('[/api/generate POST] No sources provided in request')
      return NextResponse.json(
        { error: 'No sources selected. Please select at least one active source.' },
        { status: 400 }
      )
    }

    // Fetch selected sources from database
    const sources = await prisma.newsSource.findMany({
      where: {
        id: {
          in: selectedSources
        },
        active: true
      }
    })

    // Log query results
    console.log('[/api/generate POST] Database query results:', {
      requestedSourceIds: selectedSources,
      foundSourcesCount: sources.length,
      foundSourceIds: sources.map(s => s.id),
      foundSourceNames: sources.map(s => s.website)
    })

    if (sources.length === 0) {
      console.error('[/api/generate POST] No active sources found in database', {
        requestedIds: selectedSources
      })
      return NextResponse.json(
        {
          error: 'No active sources found. The selected sources may be inactive or not exist in the database.',
          requestedIds: selectedSources
        },
        { status: 400 }
      )
    }

    // Create agent configuration
    const agentConfig: AgentConfiguration = {
      sources,
      dateRange,
      outputFormat,
      includeExecutiveSummary,
      groupByTopic,
      topics,
      geoScopes
    }

    // Log config before storing
    console.log('[/api/generate POST] Creating agentConfig:', {
      sourcesCount: agentConfig.sources.length,
      selectedSources: selectedSources,
      dateRange: agentConfig.dateRange
    })

    // Generate prompt for the agent
    const prompt = generateAgentPrompt(agentConfig)

    // Generate agent configuration file
    const configFile = generateAgentConfig(sources)

    // Store generation request in database
    const generation = await prisma.newsletterGeneration.create({
      data: {
        status: 'pending',
        config: {
          ...agentConfig,
          selectedSources: selectedSources // Explicitly store selectedSources IDs
        } as any,
        prompt,
        startedAt: new Date()
      }
    })

    console.log('[/api/generate POST] Generation created:', {
      generationId: generation.id,
      sourcesInConfig: sources.length,
      configStored: JSON.stringify(generation.config).substring(0, 200)
    })

    // Return generation ID for tracking
    return NextResponse.json({
      generationId: generation.id,
      prompt,
      configFile,
      sources: sources.length,
      dateRange
    })

  } catch (error) {
    console.error('Error starting generation:', error)
    return NextResponse.json(
      { error: 'Failed to start newsletter generation' },
      { status: 500 }
    )
  }
})