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

/**
 * Call Claude API to generate newsletter content
 */
export async function generateNewsletterWithClaude(prompt: string): Promise<ClaudeResponse> {
  try {
    const message = await anthropic.messages.create({
      model: process.env.CLAUDE_MODEL || 'claude-3-opus-20240229',
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

    // Map common errors to user-friendly messages
    if (error?.status === 401 || error?.status === 403) {
      throw new Error('Service temporarily unavailable')
    } else if (error?.status === 429) {
      throw new Error('Service temporarily unavailable')
    } else if (error?.message?.includes('credit') || error?.message?.includes('balance')) {
      throw new Error('Service temporarily unavailable')
    } else if (error?.code === 'ECONNREFUSED' || error?.code === 'ETIMEDOUT') {
      throw new Error('Unable to connect to service')
    }

    throw new Error('Service temporarily unavailable')
  }
}

/**
 * Stream newsletter generation for real-time updates
 */
export async function* streamNewsletterGeneration(prompt: string) {
  try {
    const stream = await anthropic.messages.create({
      model: process.env.CLAUDE_MODEL || 'claude-3-opus-20240229',
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

    // Map common errors to user-friendly messages
    if (error?.status === 401 || error?.status === 403) {
      throw new Error('Service temporarily unavailable')
    } else if (error?.status === 429) {
      throw new Error('Service temporarily unavailable')
    } else if (error?.message?.includes('credit') || error?.message?.includes('balance')) {
      throw new Error('Service temporarily unavailable')
    } else if (error?.code === 'ECONNREFUSED' || error?.code === 'ETIMEDOUT') {
      throw new Error('Unable to connect to service')
    }

    throw new Error('Service temporarily unavailable')
  }
}