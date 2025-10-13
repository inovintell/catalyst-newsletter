import { NextRequest, NextResponse } from 'next/server'
import { PrismaClient } from '@prisma/client'
import { generateNewsletterWithClaude, streamNewsletterGeneration, ClaudeAPIError } from '@/lib/claude-api'
import { generateAgentConfig } from '@/lib/agent-manager'

const prisma = new PrismaClient()

// Helper function to generate mock newsletter
function generateMockNewsletter(sources: any[], config: any): string {
  const importantSources = sources.filter(s => s.importanceLevel === 'Important')
  const criticalSources = sources.filter(s => s.importanceLevel === '100% Important')

  return `# HTA & Market Access Intelligence Update
## ${new Date().toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' })} - Last 7 Days

### Executive Highlights
- Neil Grubert LinkedIn: New insights on EU HTA Regulation implementation timeline
- European Commission JCA: Updated guidance on joint clinical assessments starting Q1 2025
- NICE announces major methodology review affecting all future appraisals
- FDA publishes final guidance on real-world evidence for regulatory submissions
- Germany's G-BA implements new fast-track pathway for innovative therapies

### CRITICAL SOURCES - 100% Important Content
${criticalSources.length > 0 ? criticalSources.map(s => `
#### ${s.website}
- Topic: ${s.topic}
- Geographic Scope: ${s.geoScope}
- [MOCK] Latest update from this critical source regarding ${s.topic}
- Impact: High relevance for market access strategies`).join('\n') : '- No critical sources configured'}

### HTA Agency Decisions

#### NICE (United Kingdom)
**Positive Recommendation for Novel Gene Therapy**
- Source: NICE, ${new Date().toLocaleDateString()}
- Summary: NICE recommends innovative gene therapy for rare metabolic disorder following successful managed access agreement
- Why it matters: Sets precedent for future gene therapy evaluations
- Link: https://www.nice.org.uk/guidance/[mock]

#### G-BA (Germany)
**Updated AMNOG Assessment for Oncology Treatment**
- Source: G-BA, ${new Date().toLocaleDateString()}
- Summary: Considerable added benefit recognized for first-line treatment in specific patient population
- Why it matters: Influences pricing negotiations and market access strategy
- Link: https://www.g-ba.de/[mock]

### Policy & Regulatory Updates

**European Commission Finalizes JCA Implementation**
- Timeline confirmed for mandatory joint clinical assessments
- First wave of products to undergo JCA process identified
- Member states align on procedural guidelines

**FDA Real-World Evidence Framework**
- New guidance clarifies acceptable RWE study designs
- Emphasis on data quality and regulatory-grade standards
- Implications for post-market evidence generation

### Industry & Market Access News
${importantSources.length > 0 ? importantSources.slice(0, 5).map(s => `
**${s.website} - ${s.topic}**
- Geographic focus: ${s.geoScope}
- [MOCK] Recent development in ${s.topic.toLowerCase()}
- Relevance: ${s.requiresScreening ? 'Requires screening for HTA/MA relevance' : 'Direct HTA/MA impact'}`).join('\n') : '- Configure sources to see industry news'}

### Emerging Trends
- Increased focus on real-world evidence in HTA submissions
- Growing importance of patient-reported outcomes
- Shift toward value-based pricing agreements
- Digital health technologies gaining HTA attention
- Sustainability considerations in health technology assessment

### Upcoming Key Dates
- January 31, 2025: Deadline for JCA pilot program applications
- February 15, 2025: NICE methods review consultation closes
- March 1, 2025: ISPOR Europe abstract submission deadline
- March 15, 2025: G-BA quarterly review publication

---
*Generated on ${new Date().toLocaleDateString()} | ${sources.length} sources analyzed*
*Note: Using mock generation - check your Anthropic API credits or configure a valid ANTHROPIC_API_KEY*`
}

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
      const sendEvent = (event: string, data: any) => {
        controller.enqueue(
          encoder.encode(`event: ${event}\ndata: ${JSON.stringify(data)}\n\n`)
        )
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
          controller.close()
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
          controller.close()
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

          controller.close()
          return
        }

        sendEvent('status', { message: `Analyzing ${sources.length} sources...` })

        // Build the source list for the agent
        const sourceList = sources.map(s =>
          `- ${s.website} - ${s.topic} - ${s.link} (${s.importanceLevel || 'Standard'})`
        ).join('\n')

        // Load the real agent prompt from the newsletter-agent.md content
        const agentPrompt = `# Purpose

You are a specialized Health Technology Assessment (HTA) and Market Access intelligence analyst. Your role is to systematically search for, identify, and aggregate the most relevant and impactful news, documents, and developments in HTA, HEOR (Health Economics and Outcomes Research), and market access from authoritative sources worldwide.

## Current Date
${new Date().toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' })}

## Parameters
- Date Range: ${config.dateRange?.from || 'Last 7 days'} to ${config.dateRange?.to || 'Today'}
- Include Executive Summary: ${config.includeExecutiveSummary || true}
- Group by Topic: ${config.groupByTopic || false}
- Output Format: ${config.outputFormat || 'markdown'}

## Active Sources (${sources.length} total)
Sources to fetch content from:

${sourceList}

## Task
Generate a comprehensive HTA & Market Access Intelligence Update newsletter based on the above sources and parameters.

Provide your final response as a structured newsletter draft in ${config.outputFormat || 'markdown'} format:

# HTA & Market Access Intelligence Update
## [Current Date] - [Date Range Coverage]

### Executive Highlights
- Top 3-5 most impactful developments

### HTA Agency Decisions
[Structured entries with source, summary, impact, and link]

### Policy & Regulatory Updates
[Structured entries as above]

### Methodology & Framework Developments
[Structured entries as above]

### Industry & Market Access News
[Structured entries as above]

### Emerging Trends
- Bullet points of patterns observed across sources

### Upcoming Key Dates
- Important deadlines, conferences, or expected decisions`

        sendEvent('status', { message: 'Generating newsletter with Claude AI...' })

        let newsletterContent = ''

        // Check if we have an API key to use real Claude
        if (process.env.ANTHROPIC_API_KEY) {
          try {
            // Use the real Claude API with streaming
            for await (const chunk of streamNewsletterGeneration(agentPrompt)) {
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
            controller.close()
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
          controller.close()
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
        controller.close()
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