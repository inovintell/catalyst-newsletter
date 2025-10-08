import Anthropic from '@anthropic-ai/sdk'

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
export async function generateNewsletterWithClaude(prompt: string): Promise<ClaudeResponse> {
  try {
    const message = await anthropic.messages.create({
      model: process.env.CLAUDE_MODEL || 'claude-sonnet-4-5-20250929',
      max_tokens: 4000,
      temperature: 0.7,
      messages: [
        {
          role: 'user',
          content: prompt
        }
      ]
    })

    // Extract text content from the response
    const content = message.content
      .filter(block => block.type === 'text')
      .map(block => (block as any).text)
      .join('\n')

    return {
      content,
      usage: message.usage ? {
        input_tokens: message.usage.input_tokens,
        output_tokens: message.usage.output_tokens
      } : undefined
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
 * Stream newsletter generation for real-time updates
 */
export async function* streamNewsletterGeneration(prompt: string) {
  try {
    const stream = await anthropic.messages.create({
      model: process.env.CLAUDE_MODEL || 'claude-sonnet-4-5-20250929',
      max_tokens: 4000,
      temperature: 0.7,
      messages: [
        {
          role: 'user',
          content: prompt
        }
      ],
      stream: true
    })

    for await (const messageStreamEvent of stream) {
      if (messageStreamEvent.type === 'content_block_delta' &&
          messageStreamEvent.delta.type === 'text_delta') {
        yield messageStreamEvent.delta.text
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