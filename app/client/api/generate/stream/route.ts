import { NextRequest, NextResponse } from 'next/server'
import { PrismaClient } from '@prisma/client'
import { streamNewsletterAgent, ClaudeAPIError } from '@/lib/claude-agent'
import { generateAgentConfig } from '@/lib/agent-manager'

const prisma = new PrismaClient()

export async function GET(request: NextRequest) {
  const searchParams = request.nextUrl.searchParams
  const generationId = searchParams.get('id')

  if (!generationId) {
    return NextResponse.json(
      { error: 'Generation ID required' },
      { status: 400 }
    )
  }

  // Generate unique request ID for tracking
  const requestId = crypto.randomUUID()
  console.log(`[${requestId}] Starting newsletter generation for ID: ${generationId}`)

  const encoder = new TextEncoder()

  const stream = new ReadableStream({
    async start(controller) {
      let isClosed = false

      const sendEvent = (event: string, data: any) => {
        if (!isClosed) {
          controller.enqueue(
            encoder.encode(`event: ${event}\ndata: ${JSON.stringify(data)}\n\n`)
          )
        }
      }

      const closeController = () => {
        if (!isClosed) {
          isClosed = true
          controller.close()
        }
      }

      try {
        // Initial status
        sendEvent('status', { message: 'Initializing newsletter generation...' })

        // Get generation record
        const generation = await prisma.newsletterGeneration.findUnique({
          where: { id: parseInt(generationId) }
        })

        if (!generation) {
          sendEvent('error', { message: 'Generation not found' })
          closeController()
          return
        }

        // Update status to processing
        await prisma.newsletterGeneration.update({
          where: { id: parseInt(generationId) },
          data: { status: 'processing' }
        })

        sendEvent('status', { message: 'Fetching news sources...' })

        // Get the selected sources
        const config = generation.config as any
        console.log(`[${requestId}] Retrieved generation config:`, {
          generationId,
          configKeys: Object.keys(config || {}),
          hasSelectedSources: !!config?.selectedSources,
          selectedSourcesType: Array.isArray(config?.selectedSources) ? 'array' : typeof config?.selectedSources
        })

        const selectedSourceIds = config.selectedSources || []
        console.log(`[${requestId}] Extracted selectedSourceIds:`, {
          count: selectedSourceIds.length,
          ids: selectedSourceIds
        })

        // Validate we have source IDs
        if (!selectedSourceIds || selectedSourceIds.length === 0) {
          console.error(`[${requestId}] No source IDs found in config`)
          sendEvent('error', {
            message: 'No sources configured for this generation. The generation config is missing source IDs.',
            generationId,
            configSnapshot: JSON.stringify(config).substring(0, 500)
          })
          closeController()
          return
        }

        const sources = await prisma.newsSource.findMany({
          where: {
            id: { in: selectedSourceIds },
            active: true
          },
          orderBy: [
            { importanceLevel: 'desc' },
            { topic: 'asc' }
          ]
        })

        console.log(`[${requestId}] Database query results:`, {
          requestedIds: selectedSourceIds,
          foundCount: sources.length,
          foundIds: sources.map(s => s.id),
          foundNames: sources.map(s => s.website)
        })

        // Validate we found sources
        if (sources.length === 0) {
          console.error(`[${requestId}] No active sources found in database`, {
            requestedIds: selectedSourceIds
          })
          sendEvent('error', {
            message: 'No active sources found in database. The requested sources may be inactive or have been deleted.',
            generationId,
            requestedIds: selectedSourceIds
          })

          // Update generation status to failed
          await prisma.newsletterGeneration.update({
            where: { id: parseInt(generationId) },
            data: {
              status: 'failed',
              error: 'No active sources found',
              completedAt: new Date()
            }
          })

          closeController()
          return
        }

        sendEvent('status', { message: `Analyzing ${sources.length} sources...` })

        // Build the source list for the agent
        const sourceList = sources.map(s =>
          `- ${s.website} (${s.topic}, ${s.geoScope}): ${s.link}${s.comment ? ` - ${s.comment}` : ''}`
        ).join('\n')

        // Build user prompt with dynamic variables only
        const agentPrompt = `Date Range: ${config.dateRange?.from || 'Last 7 days'} to ${config.dateRange?.to || 'Today'}

News Sources to Monitor:
${sourceList}

Output Format: ${config.outputFormat || 'detailed'}
${config.includeExecutiveSummary ? 'Include Executive Summary: Yes\n' : ''}${config.groupByTopic ? 'Group By Topic: Yes\n' : ''}${config.topics?.length ? `Focus Topics: ${config.topics.join(', ')}\n` : ''}${config.geoScopes?.length ? `Focus Regions: ${config.geoScopes.join(', ')}\n` : ''}`

        sendEvent('status', { message: 'Generating newsletter with Claude AI...' })

        let newsletterContent = ''

        // Check if we have an API key to use real Claude Agent
        if (process.env.ANTHROPIC_API_KEY) {
          try {
            // Use the Claude Agent SDK with streaming and tracing
            // Pass the traceId from the generation record to link to the parent trace
            for await (const chunk of streamNewsletterAgent(agentPrompt, {
              name: 'Newsletter Agent Streaming Generation',
              traceId: generation.traceId || undefined, // Link to parent trace
              metadata: {
                model: process.env.CLAUDE_MODEL || 'claude-sonnet-4-5-20250929',
                temperature: 0.7,
                maxTokens: 8000,
                operation: 'agent_streaming_generation',
                generationId,
                sourcesCount: sources.length,
                dateRange: config.dateRange,
                outputFormat: config.outputFormat,
                agentTools: ['WebFetch', 'WebSearch', 'Read', 'Write'],
              },
              tags: ['newsletter', 'streaming', 'generation', 'agent'],
            })) {
              newsletterContent += chunk
              // Send chunks to client for real-time display
              sendEvent('content', { chunk })
            }
          } catch (apiError: any) {
            // Log full technical API error details server-side
            console.error(`[${requestId}] Claude API error:`, {
              error: apiError,
              status: apiError?.status,
              message: apiError?.message,
              stack: apiError?.stack,
              timestamp: new Date().toISOString()
            })

            // Send error event with prompt information to client
            if (apiError instanceof ClaudeAPIError) {
              sendEvent('error', {
                type: apiError.type,
                message: apiError.message,
                status: apiError.status,
                prompt: apiError.prompt,
                details: apiError.details
              })
            } else {
              // Handle non-ClaudeAPIError cases
              sendEvent('error', {
                type: 'unknown',
                message: apiError?.message || 'An unexpected error occurred',
                status: apiError?.status,
                prompt: agentPrompt,
                details: apiError?.stack || 'No additional details available'
              })
            }

            // Mark generation as failed
            await prisma.newsletterGeneration.update({
              where: { id: parseInt(generationId) },
              data: {
                status: 'failed',
                completedAt: new Date()
              }
            })

            // End the stream with error
            sendEvent('done', {
              success: false,
              error: apiError?.message || 'Generation failed'
            })
            closeController()
            return
          }
        } else {
          // No API key configured - send error
          console.log('No ANTHROPIC_API_KEY found')
          sendEvent('error', {
            type: 'authentication',
            message: 'ANTHROPIC_API_KEY is not configured',
            prompt: agentPrompt,
            details: 'Please configure ANTHROPIC_API_KEY environment variable'
          })

          await prisma.newsletterGeneration.update({
            where: { id: parseInt(generationId) },
            data: {
              status: 'failed',
              completedAt: new Date()
            }
          })

          sendEvent('done', {
            success: false,
            error: 'ANTHROPIC_API_KEY is not configured'
          })
          closeController()
          return
        }

        sendEvent('status', { message: 'Formatting output...' })

        // Update generation with output
        await prisma.newsletterGeneration.update({
          where: { id: parseInt(generationId) },
          data: {
            status: 'completed',
            output: newsletterContent,
            completedAt: new Date()
          }
        })

        // Also create a newsletter record for archive
        await prisma.newsletter.create({
          data: {
            title: `Healthcare Newsletter - ${new Date().toLocaleDateString()}`,
            content: { output: newsletterContent } as any,
            sourcesUsed: generation.config as any,
            parameters: generation.config as any,
            status: 'completed'
          }
        })

        sendEvent('complete', {
          message: 'Newsletter generated successfully!',
          generationId,
          output: newsletterContent
        })

      } catch (error) {
        // Log full technical error details server-side with request ID
        console.error(`[${requestId}] Generation error:`, {
          generationId,
          error: error instanceof Error ? {
            message: error.message,
            stack: error.stack,
            name: error.name
          } : error,
          timestamp: new Date().toISOString()
        })

        await prisma.newsletterGeneration.update({
          where: { id: parseInt(generationId) },
          data: {
            status: 'failed',
            error: error instanceof Error ? error.message : 'Unknown error',
            completedAt: new Date()
          }
        })

        // Send user-friendly error message with request ID only
        sendEvent('error', {
          message: 'We encountered an issue generating your newsletter.',
          requestId: requestId
        })
      } finally {
        closeController()
      }
    }
  })

  return new NextResponse(stream, {
    headers: {
      'Content-Type': 'text/event-stream',
      'Cache-Control': 'no-cache',
      'Connection': 'keep-alive'
    }
  })
}