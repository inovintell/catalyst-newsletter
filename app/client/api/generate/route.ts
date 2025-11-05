import { NextRequest, NextResponse } from 'next/server'
import { PrismaClient } from '@prisma/client'
import { generateAgentPrompt, generateAgentConfig, type AgentConfiguration } from '@/lib/agent-config'
import { withAuth } from '@/lib/auth/middleware'
import { createGenerationTrace } from '@/lib/observability/langfuse'

const prisma = new PrismaClient()

export const GET = withAuth(async (request: NextRequest) => {
  try {
    const searchParams = request.nextUrl.searchParams
    const id = searchParams.get('id')
    const jobStatus = searchParams.get('jobStatus')

    // If jobStatus filter is provided, return all matching jobs
    if (jobStatus) {
      const statuses = jobStatus.split(',').map(s => s.trim())
      const generations = await prisma.newsletterGeneration.findMany({
        where: {
          jobStatus: {
            in: statuses
          }
        },
        orderBy: {
          createdAt: 'desc'
        },
        select: {
          id: true,
          jobStatus: true,
          currentStep: true,
          createdAt: true,
          progress: true
        }
      })

      return NextResponse.json(generations)
    }

    // Single generation lookup
    if (!id) {
      return NextResponse.json(
        { error: 'Generation ID is required' },
        { status: 400 }
      )
    }

    const generation = await prisma.newsletterGeneration.findUnique({
      where: { id: parseInt(id) }
    })

    if (!generation) {
      return NextResponse.json(
        { error: 'Generation not found' },
        { status: 404 }
      )
    }

    return NextResponse.json({
      id: generation.id,
      status: generation.status,
      jobStatus: generation.jobStatus,
      currentStep: generation.currentStep,
      output: generation.output,
      error: generation.error,
      completedAt: generation.completedAt,
      progress: generation.progress
    })

  } catch (error) {
    console.error('Error fetching generation status:', error)
    return NextResponse.json(
      { error: 'Failed to fetch generation status' },
      { status: 500 }
    )
  }
})

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

    // Create Langfuse trace for this generation request
    const traceContext = createGenerationTrace(
      'Newsletter Generation Request',
      {
        dateRange,
        sourcesCount: sources.length,
        outputFormat,
        includeExecutiveSummary,
        groupByTopic,
        topics,
        geoScopes,
      },
      context.user?.email || undefined // Use user email as userId if available
    )

    // Store generation request in database with jobStatus='queued'
    const generation = await prisma.newsletterGeneration.create({
      data: {
        status: 'pending',
        jobStatus: 'queued', // Queue for background processing
        config: {
          ...agentConfig,
          selectedSources: selectedSources // Explicitly store selectedSources IDs
        } as any,
        prompt,
        startedAt: new Date(),
        traceId: traceContext.traceId || null,
        currentStep: 'Job queued for processing',
        progress: {
          logs: ['Job created and queued'],
          metadata: {
            createdAt: new Date().toISOString()
          }
        }
      }
    })

    console.log('[/api/generate POST] Generation created:', {
      generationId: generation.id,
      jobStatus: generation.jobStatus,
      sourcesInConfig: sources.length,
      configStored: JSON.stringify(generation.config).substring(0, 200)
    })

    // Return generation ID for tracking (immediate response)
    return NextResponse.json({
      generationId: generation.id,
      status: 'queued',
      message: 'Job queued for processing',
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