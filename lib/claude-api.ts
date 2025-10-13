import Anthropic from '@anthropic-ai/sdk'
import { withGenerationTrace, getTraceById, getLangfuseClient } from './observability/langfuse'
import type { ClaudeTracingConfig } from './observability/types'

// Initialize the Anthropic client
const anthropic = new Anthropic({
  apiKey: process.env.ANTHROPIC_API_KEY!,
})

export interface ClaudeResponse {
  content: string
  usage?: {
    input_tokens: number
    output_tokens: number
  }
}

export interface ClaudeAPIErrorDetails {
  type: 'authentication' | 'insufficient_credits' | 'rate_limit' | 'network' | 'unknown'
  message: string
  status?: number
  prompt: string
  details?: string
  originalError?: any
}

export class ClaudeAPIError extends Error {
  public type: ClaudeAPIErrorDetails['type']
  public status?: number
  public prompt: string
  public details?: string
  public originalError?: any

  constructor(errorDetails: ClaudeAPIErrorDetails) {
    super(errorDetails.message)
    this.name = 'ClaudeAPIError'
    this.type = errorDetails.type
    this.status = errorDetails.status
    this.prompt = errorDetails.prompt
    this.details = errorDetails.details
    this.originalError = errorDetails.originalError
  }

  toJSON() {
    return {
      name: this.name,
      type: this.type,
      message: this.message,
      status: this.status,
      prompt: this.prompt,
      details: this.details
    }
  }
}

/**
 * Call Claude API to generate newsletter content
 */
export async function generateNewsletterWithClaude(
  prompt: string,
  tracingConfig?: Partial<ClaudeTracingConfig>
): Promise<ClaudeResponse> {
  const model = process.env.CLAUDE_MODEL || 'claude-sonnet-4-5-20250929'
  const maxTokens = 4000
  const temperature = 0.7

  // Prepare tracing configuration
  const traceConfig: ClaudeTracingConfig = {
    name: tracingConfig?.name || 'Newsletter Generation',
    metadata: {
      model,
      temperature,
      maxTokens,
      operation: 'newsletter_generation',
      ...tracingConfig?.metadata,
    },
    userId: tracingConfig?.userId,
    sessionId: tracingConfig?.sessionId,
    tags: tracingConfig?.tags || ['newsletter', 'generation'],
  }

  try {
    // Wrap the API call with tracing
    const tracedResult = await withGenerationTrace(
      traceConfig,
      async () => {
        const message = await anthropic.messages.create({
          model,
          max_tokens: maxTokens,
          temperature,
          messages: [
            {
              role: 'user',
              content: prompt,
            },
          ],
        })

        // Extract text content from the response
        const content = message.content
          .filter((block) => block.type === 'text')
          .map((block) => (block as any).text)
          .join('\n')

        return {
          message,
          content,
        }
      },
      (result) => ({
        promptTokens: result.message.usage?.input_tokens || 0,
        completionTokens: result.message.usage?.output_tokens || 0,
        totalTokens:
          (result.message.usage?.input_tokens || 0) +
          (result.message.usage?.output_tokens || 0),
      })
    )

    return {
      content: tracedResult.result.content,
      usage: tracedResult.usage
        ? {
            input_tokens: tracedResult.usage.promptTokens,
            output_tokens: tracedResult.usage.completionTokens,
          }
        : undefined,
    }
  } catch (error: any) {
    // Log full technical error details server-side
    console.error('Claude API error:', {
      error,
      status: error?.status,
      statusText: error?.statusText,
      message: error?.message,
      code: error?.code,
      type: error?.type,
      stack: error?.stack,
      timestamp: new Date().toISOString()
    })

    // Determine error type and create detailed error
    let errorType: ClaudeAPIErrorDetails['type'] = 'unknown'
    let errorMessage = 'An unexpected error occurred while generating the newsletter'
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
      originalError: error
    })
  }
}

/**
 * Stream newsletter generation for real-time updates with Langfuse tracing
 */
export async function* streamNewsletterGeneration(
  prompt: string,
  tracingConfig?: Partial<ClaudeTracingConfig> & { traceId?: string }
) {
  const model = process.env.CLAUDE_MODEL || 'claude-sonnet-4-5-20250929'
  const maxTokens = 4000
  const temperature = 0.7

  // Prepare tracing configuration
  const traceConfig: ClaudeTracingConfig = {
    name: tracingConfig?.name || 'Newsletter Streaming Generation',
    metadata: {
      model,
      temperature,
      maxTokens,
      operation: 'streaming_generation',
      ...tracingConfig?.metadata,
    },
    userId: tracingConfig?.userId,
    sessionId: tracingConfig?.sessionId,
    tags: tracingConfig?.tags || ['newsletter', 'streaming', 'generation'],
  }

  // Get Langfuse client and trace
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
        name: traceConfig.metadata.operation,
        model,
        modelParameters,
        metadata: traceConfig.metadata as Record<string, unknown>,
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
    const stream = await anthropic.messages.create({
      model,
      max_tokens: maxTokens,
      temperature,
      messages: [
        {
          role: 'user',
          content: prompt,
        },
      ],
      stream: true,
    })

    // Process stream events and capture token usage
    for await (const messageStreamEvent of stream) {
      // Capture token usage from message_start event
      if (messageStreamEvent.type === 'message_start') {
        const usage = (messageStreamEvent as any).message?.usage
        if (usage) {
          inputTokens = usage.input_tokens || 0
        }
      }

      // Yield text deltas to the caller and accumulate for tracing
      if (
        messageStreamEvent.type === 'content_block_delta' &&
        messageStreamEvent.delta.type === 'text_delta'
      ) {
        const textChunk = messageStreamEvent.delta.text
        accumulatedOutput += textChunk
        yield textChunk
      }

      // Capture final token usage from message_delta event
      if (messageStreamEvent.type === 'message_delta') {
        const usage = (messageStreamEvent as any).usage
        if (usage) {
          outputTokens = usage.output_tokens || 0
        }
      }
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
            ...traceConfig.metadata,
            latencyMs,
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
    // Log full technical error details server-side
    console.error('Claude API streaming error:', {
      error,
      status: error?.status,
      statusText: error?.statusText,
      message: error?.message,
      code: error?.code,
      type: error?.type,
      stack: error?.stack,
      timestamp: new Date().toISOString()
    })

    // Capture error in generation span
    if (generation) {
      const endTime = Date.now()
      const latencyMs = endTime - startTime

      try {
        generation.end({
          metadata: {
            ...traceConfig.metadata,
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

    // Determine error type and create detailed error
    let errorType: ClaudeAPIErrorDetails['type'] = 'unknown'
    let errorMessage = 'An unexpected error occurred while generating the newsletter'
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
      originalError: error
    })
  }
}