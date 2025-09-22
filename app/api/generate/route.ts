import { NextRequest, NextResponse } from 'next/server'
import { PrismaClient } from '@prisma/client'
import { generateAgentPrompt, generateAgentConfig, type AgentConfiguration } from '@/lib/agent-config'
import { withAuth } from '@/lib/auth/middleware'

const prisma = new PrismaClient()

export const POST = withAuth(async (request: NextRequest, context) => {
  try {
    const body = await request.json()
    const { dateRange, selectedSources, outputFormat, includeExecutiveSummary, groupByTopic, topics, geoScopes } = body

    // Fetch selected sources from database
    const sources = await prisma.newsSource.findMany({
      where: {
        id: {
          in: selectedSources
        },
        active: true
      }
    })

    if (sources.length === 0) {
      return NextResponse.json(
        { error: 'No active sources selected' },
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

    // Generate prompt for the agent
    const prompt = generateAgentPrompt(agentConfig)

    // Generate agent configuration file
    const configFile = generateAgentConfig(sources)

    // Store generation request in database
    const generation = await prisma.newsletterGeneration.create({
      data: {
        status: 'pending',
        config: agentConfig as any,
        prompt,
        startedAt: new Date()
      }
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