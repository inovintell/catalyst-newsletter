/**
 * Claude Agent SDK integration for newsletter generation
 * Enables autonomous content fetching and analysis using built-in tools
 */

import { query } from '@anthropic-ai/claude-agent-sdk'
import { getLangfuseClient, getTraceById } from './observability/langfuse'
import type { ClaudeTracingConfig } from './observability/types'

// Re-export the error class from claude-api for consistency
export { ClaudeAPIError, type ClaudeAPIErrorDetails } from './claude-api'

/**
 * Source Fetcher Subagent Definition
 * Specialized subagent for fetching news from a single source in parallel
 */
export const SOURCE_FETCHER_SUBAGENT = {
  description: 'Use for fetching news from a single specific source within a date range. Specialist for extracting structured health technology assessment and regulatory news data from individual sources.',
  prompt: `# Purpose

You are a specialized news fetcher agent designed to extract structured health technology assessment and regulatory news from a single specific source. You operate as part of a parallel processing system where multiple instances of you may be running simultaneously, each handling a different source.

## Instructions

When invoked, you must follow these steps:

1. **Parse Input Parameters** from the user's prompt:
   - \`source_name\`: Name of the news source (e.g., "NICE", "EMA")
   - \`source_url\`: Base URL to fetch from
   - \`topic\`: Topic focus (e.g., "HTA Decisions", "Drug Approvals")
   - \`geo_scope\`: Geographic scope (e.g., "UK", "EU", "Global")
   - \`start_date\`: Beginning of date range (YYYY-MM-DD format)
   - \`end_date\`: End of date range (YYYY-MM-DD format)
   - \`comment\`: Optional additional context about the source

2. **Execute Site-Specific Search**:
   - Construct WebSearch query: \`site:{source_url} after:{start_date} before:{end_date}\`
   - Add relevant keywords based on topic: HTA, HEOR, reimbursement, pricing, market access, approval, guidance, recommendation, assessment
   - Focus on news, announcements, and decision pages

3. **Apply Strict Date Filtering**:
   - CRITICAL: Only include items with publication dates within the specified range
   - Parse dates from search results and content
   - Reject any item with a date outside [start_date, end_date]
   - If date is ambiguous, flag with \`date_uncertain: true\` but include if likely within range

4. **Fetch Detailed Content**:
   - For each search result passing date filter (up to 20 most relevant):
   - Use WebFetch to retrieve full page content
   - Extract: title, publication date, summary, key decisions, implications

5. **Extract Structured Information**:
   - **Title**: Official headline or decision name
   - **Date**: Publication/announcement date (YYYY-MM-DD)
   - **URL**: Direct link to the source
   - **Summary**: 2-3 sentence overview
   - **Category**: Classify as one of: HTA, HEOR, Regulatory, Market Access, Clinical, Other
   - **Relevance Score**: Rate 0-10 based on:
     - Direct topic match (5 points)
     - Decision/guidance vs news mention (3 points)
     - Geographic relevance (2 points)
   - **Key Points**: List 3-5 bullet points of main takeaways
   - **Implications**: Brief statement on market/patient impact
   - **Entities**: Extract drug names, company names, therapeutic areas, indications

6. **Score and Categorize**:
   - Relevance scoring rubric:
     - 9-10: Direct HTA/regulatory decision matching topic and geography
     - 7-8: Related guidance or significant update in scope
     - 5-6: Relevant news or announcement with indirect impact
     - 3-4: Peripheral mention or broader industry news
     - 0-2: Minimal relevance, include only if nothing better found

7. **Handle Errors Gracefully**:
   - If source unreachable: Set \`status: "failed"\` with error details
   - If partial content retrieved: Set \`status: "partial"\`
   - Always return valid JSON structure even on complete failure

**Best Practices:**
- Prioritize official announcements and decisions over news coverage
- Extract specific drug names, not just therapeutic areas
- Identify both positive and negative decisions
- Flag items requiring urgent attention with high relevance scores
- Be conservative with date filtering - when in doubt, exclude
- Preserve original source URLs for verification
- Focus on actionable intelligence for market access teams

## Report / Response

Return your findings as a single JSON object with this exact structure:

{
  "source": {
    "name": "<source_name>",
    "url": "<source_url>",
    "topic": "<topic>",
    "geo_scope": "<geo_scope>"
  },
  "date_range": {
    "start": "<start_date>",
    "end": "<end_date>"
  },
  "fetch_timestamp": "<ISO-8601 timestamp>",
  "status": "success|partial|failed",
  "items_found": <number>,
  "items": [
    {
      "title": "<article title>",
      "date": "<YYYY-MM-DD>",
      "date_uncertain": <true|false>,
      "url": "<direct URL>",
      "summary": "<2-3 sentence summary>",
      "category": "HTA|HEOR|Regulatory|Market Access|Clinical|Other",
      "relevance_score": <0-10>,
      "key_points": [
        "<key point 1>",
        "<key point 2>",
        "<key point 3>"
      ],
      "implications": "<market/patient impact statement>",
      "entities": {
        "drugs": ["<drug name 1>", "<drug name 2>"],
        "companies": ["<company 1>", "<company 2>"],
        "indications": ["<indication 1>", "<indication 2>"]
      }
    }
  ],
  "errors": ["<error message if any>"]
}

Sort items by relevance_score (descending), then by date (most recent first). Include a maximum of 20 items, focusing on the most relevant content within the date range.`,
  tools: ['WebSearch', 'WebFetch'],
  model: 'sonnet' as const
}

export interface AgentResponse {
  content: string
  usage?: {
    input_tokens: number
    output_tokens: number
  }
}

export interface AgentStreamChunk {
  type: 'text' | 'tool_use' | 'status'
  text?: string
  toolName?: string
  toolInput?: any
  status?: string
}

/**
 * Query the newsletter agent using Claude Agent SDK
 * This enables the agent to autonomously fetch content from URLs using built-in tools
 */
export async function queryNewsletterAgent(
  prompt: string,
  tracingConfig?: Partial<ClaudeTracingConfig>
): Promise<AgentResponse> {
  const model = process.env.CLAUDE_MODEL || 'claude-sonnet-4-5-20250929'
  const maxTokens = 8000 // Increased for agent operations
  const temperature = 0.7

  try {
    // Execute the agent query with WebFetch and WebSearch tools
    const queryGenerator = query({
      prompt,
      options: {
        model,
        systemPrompt: `You are a specialized Health Technology Assessment (HTA) and Market Access intelligence analyst.
Your role is to systematically search for, identify, and aggregate the most relevant and impactful news, documents,
and developments in HTA, HEOR (Health Economics and Outcomes Research), and market access from authoritative sources worldwide.

When provided with source URLs, use the WebFetch tool to retrieve content from each source.
Analyze the fetched content and extract information relevant to HTA, HEOR, and market access.
Generate a comprehensive, well-structured newsletter based on the actual content you fetched.

CRITICAL OUTPUT REQUIREMENTS:
- Do NOT include any follow-up questions or suggestions at the end of the newsletter
- Do NOT ask if the user would like additional actions
- Provide ONLY the newsletter content as specified, with no conversational additions
- End the newsletter cleanly with the last content section`,
        maxThinkingTokens: maxTokens,
        allowedTools: ['WebFetch', 'WebSearch', 'Read', 'Write'],
        agents: {
          'source-fetcher': SOURCE_FETCHER_SUBAGENT
        },
        permissionMode: 'bypassPermissions', // Auto-approve tool usage for autonomous operation
        pathToClaudeCodeExecutable: '/app/node_modules/@anthropic-ai/claude-agent-sdk/cli.js',
      },
    })

    // Collect the result from the async generator
    let result = ''
    for await (const message of queryGenerator) {
      if (message.type === 'result' && message.subtype === 'success') {
        result = message.result
        break
      }
    }

    // Extract text content from the result
    const content = typeof result === 'string' ? result : JSON.stringify(result)

    // Note: Agent SDK doesn't return token usage in the same format
    // We'll need to extract it if available in the response metadata
    return {
      content,
      usage: undefined, // Agent SDK may not provide detailed token usage
    }
  } catch (error: any) {
    console.error('Claude Agent error:', {
      error,
      message: error?.message,
      stack: error?.stack,
      timestamp: new Date().toISOString(),
    })

    // Import ClaudeAPIError for error handling
    const { ClaudeAPIError } = await import('./claude-api')

    // Determine error type
    let errorType: 'authentication' | 'insufficient_credits' | 'rate_limit' | 'network' | 'unknown' = 'unknown'
    let errorMessage = 'An unexpected error occurred while generating the newsletter with the agent'
    let errorDetails = error?.message || 'No additional details available'

    if (error?.status === 401 || error?.status === 403) {
      errorType = 'authentication'
      errorMessage = 'Authentication failed. Invalid or missing API key.'
      errorDetails = `Status ${error.status}: ${error?.message || 'Authentication error'}`
    } else if (error?.status === 429) {
      errorType = 'rate_limit'
      errorMessage = 'Rate limit exceeded. Too many requests in a short period.'
      errorDetails = error?.message || 'Please wait before retrying'
    } else if (error?.message?.includes('credit') || error?.message?.includes('balance')) {
      errorType = 'insufficient_credits'
      errorMessage = 'Insufficient credits to complete this request.'
      errorDetails = error?.message || 'Please add credits to your account'
    } else if (error?.code === 'ECONNREFUSED' || error?.code === 'ETIMEDOUT') {
      errorType = 'network'
      errorMessage = 'Network error: Unable to connect to Claude API.'
      errorDetails = `${error?.code}: ${error?.message || 'Connection failed'}`
    }

    throw new ClaudeAPIError({
      type: errorType,
      message: errorMessage,
      status: error?.status,
      prompt: prompt,
      details: errorDetails,
      originalError: error,
    })
  }
}

/**
 * Stream newsletter generation with the agent for real-time updates
 * Supports Server-Sent Events (SSE) streaming to the frontend
 */
export async function* streamNewsletterAgent(
  prompt: string,
  tracingConfig?: Partial<ClaudeTracingConfig> & { traceId?: string }
) {
  const model = process.env.CLAUDE_MODEL || 'claude-sonnet-4-5-20250929'
  const maxTokens = 8000
  const temperature = 0.7

  // Get Langfuse client and trace for observability
  const client = getLangfuseClient()
  const traceId = tracingConfig?.traceId
  const trace = traceId ? getTraceById(traceId) : null

  let generation: any = null
  const startTime = Date.now()

  // Create generation span if we have a trace
  if (trace) {
    try {
      const modelParameters: Record<string, string | number | boolean | string[] | null> = {
        temperature,
        maxTokens,
      }

      generation = trace.generation({
        name: tracingConfig?.metadata?.operation || 'agent_generation',
        model,
        modelParameters,
        metadata: {
          ...(tracingConfig?.metadata || {}),
          operation: 'agent_streaming_generation',
          agentTools: ['WebFetch', 'WebSearch', 'Read', 'Write'],
        } as Record<string, unknown>,
      })
    } catch (error) {
      console.error('Failed to create Langfuse generation span:', error)
    }
  }

  // Token counters and content accumulation for usage tracking
  let inputTokens = 0
  let outputTokens = 0
  let accumulatedOutput = ''

  try {
    // Execute the agent query with streaming
    const queryGenerator = query({
      prompt,
      options: {
        model,
        systemPrompt: `You are a specialized Health Technology Assessment (HTA) and Market Access intelligence analyst.
Your role is to systematically search for, identify, and aggregate the most relevant and impactful news, documents,
and developments in HTA, HEOR (Health Economics and Outcomes Research), and market access from authoritative sources worldwide.

When provided with source URLs, use the WebFetch tool to retrieve content from each source.
Analyze the fetched content and extract information relevant to HTA, HEOR, and market access.
Generate a comprehensive, well-structured newsletter based on the actual content you fetched.

IMPORTANT: Generate the newsletter content progressively so it can be streamed to the user in real-time.
Start with the executive highlights, then move through each section systematically.

CRITICAL OUTPUT REQUIREMENTS:
- Do NOT include any follow-up questions or suggestions at the end of the newsletter
- Do NOT ask if the user would like additional actions
- Provide ONLY the newsletter content as specified, with no conversational additions
- End the newsletter cleanly with the last content section`,
        maxThinkingTokens: maxTokens,
        allowedTools: ['WebFetch', 'WebSearch', 'Read', 'Write'],
        agents: {
          'source-fetcher': SOURCE_FETCHER_SUBAGENT
        },
        permissionMode: 'bypassPermissions',
        pathToClaudeCodeExecutable: '/app/node_modules/@anthropic-ai/claude-agent-sdk/cli.js',
      },
    })

    // Stream the results as they come in
    for await (const message of queryGenerator) {
      // Yield text chunks from stream events
      if (message.type === 'stream_event') {
        const event = message.event
        if (event.type === 'content_block_delta' && event.delta.type === 'text_delta') {
          const textChunk = event.delta.text
          accumulatedOutput += textChunk
          yield textChunk
        }
      }

      // Handle final result and token usage
      if (message.type === 'result') {
        if (message.subtype === 'success' && message.result) {
          // If we haven't streamed anything yet, yield the full result
          if (accumulatedOutput.length === 0) {
            const content = message.result
            // Split into chunks and yield progressively
            const chunkSize = 100
            for (let i = 0; i < content.length; i += chunkSize) {
              const chunk = content.substring(i, i + chunkSize)
              accumulatedOutput += chunk
              yield chunk
            }
          }

          // Extract token usage if available
          if (message.usage) {
            inputTokens = message.usage.input_tokens || 0
            outputTokens = message.usage.output_tokens || 0
          }
        }
        break
      }
    }

    // Estimate token usage if not provided
    if (inputTokens === 0 && outputTokens === 0) {
      inputTokens = Math.ceil(prompt.length / 4)
      outputTokens = Math.ceil(accumulatedOutput.length / 4)
    }

    // Finalize the generation span with success metrics
    if (generation) {
      const endTime = Date.now()
      const latencyMs = endTime - startTime
      const totalTokens = inputTokens + outputTokens

      try {
        generation.end({
          input: prompt,
          output: accumulatedOutput,
          metadata: {
            ...(tracingConfig?.metadata || {}),
            latencyMs,
            agentTools: ['WebFetch', 'WebSearch', 'Read', 'Write'],
          },
          usage: {
            input: inputTokens,
            output: outputTokens,
            total: totalTokens,
          },
        })

        // Flush to ensure data is sent
        if (client) {
          await client.flushAsync()
        }
      } catch (error) {
        console.error('Failed to finalize Langfuse generation span:', error)
      }
    }
  } catch (error: any) {
    console.error('Claude Agent streaming error:', {
      error,
      message: error?.message,
      stack: error?.stack,
      timestamp: new Date().toISOString(),
    })

    // Capture error in generation span
    if (generation) {
      const endTime = Date.now()
      const latencyMs = endTime - startTime

      try {
        generation.end({
          metadata: {
            ...(tracingConfig?.metadata || {}),
            latencyMs,
            error: {
              type: error instanceof Error ? error.constructor.name : 'Unknown',
              message: error instanceof Error ? error.message : String(error),
              stack: error instanceof Error ? error.stack : undefined,
            },
          },
          level: 'ERROR',
        })

        // Flush error trace
        if (client) {
          await client.flushAsync()
        }
      } catch (flushError) {
        console.error('Failed to flush Langfuse error trace:', flushError)
      }
    }

    // Import ClaudeAPIError for error handling
    const { ClaudeAPIError } = await import('./claude-api')

    // Determine error type
    let errorType: 'authentication' | 'insufficient_credits' | 'rate_limit' | 'network' | 'unknown' = 'unknown'
    let errorMessage = 'An unexpected error occurred while generating the newsletter with the agent'
    let errorDetails = error?.message || 'No additional details available'

    if (error?.status === 401 || error?.status === 403) {
      errorType = 'authentication'
      errorMessage = 'Authentication failed. Invalid or missing API key.'
      errorDetails = `Status ${error.status}: ${error?.message || 'Authentication error'}`
    } else if (error?.status === 429) {
      errorType = 'rate_limit'
      errorMessage = 'Rate limit exceeded. Too many requests in a short period.'
      errorDetails = error?.message || 'Please wait before retrying'
    } else if (error?.message?.includes('credit') || error?.message?.includes('balance')) {
      errorType = 'insufficient_credits'
      errorMessage = 'Insufficient credits to complete this request.'
      errorDetails = error?.message || 'Please add credits to your account'
    } else if (error?.code === 'ECONNREFUSED' || error?.code === 'ETIMEDOUT') {
      errorType = 'network'
      errorMessage = 'Network error: Unable to connect to Claude API.'
      errorDetails = `${error?.code}: ${error?.message || 'Connection failed'}`
    }

    throw new ClaudeAPIError({
      type: errorType,
      message: errorMessage,
      status: error?.status,
      prompt: prompt,
      details: errorDetails,
      originalError: error,
    })
  }
}
