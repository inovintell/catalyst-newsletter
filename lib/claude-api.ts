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
  } catch (error) {
    console.error('Error calling Claude API:', error)
    throw new Error('Failed to generate newsletter content')
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
  } catch (error) {
    console.error('Error streaming from Claude API:', error)
    throw new Error('Failed to stream newsletter content')
  }
}