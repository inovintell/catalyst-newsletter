import { NextRequest, NextResponse } from 'next/server'
import { generateNewsletterWithClaude } from '@/lib/claude-api'

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { generationId, content, refinementPrompt, selectedSection } = body

    // Build refinement prompt for Claude
    const fullPrompt = `You are a professional newsletter editor. Your task is to refine the following newsletter content based on the user's instructions.

USER INSTRUCTIONS: ${refinementPrompt}

${selectedSection !== 'all' ? `SECTION TO REFINE: ${selectedSection}\nOnly refine the specified section while keeping the rest unchanged.` : 'Refine the entire newsletter content.'}

ORIGINAL CONTENT:
${content}

Please provide the refined version of the newsletter. Maintain the same structure and format (markdown) but apply the requested refinements. Return only the refined content without any explanations or meta-commentary.`

    // Use Claude API with tracing for refinement
    const response = await generateNewsletterWithClaude(fullPrompt, {
      name: 'Newsletter Refinement',
      metadata: {
        model: process.env.CLAUDE_MODEL || 'claude-sonnet-4-5-20250929',
        temperature: 0.7,
        maxTokens: 4000,
        operation: 'refinement',
        generationId,
        refinementPrompt,
        selectedSection,
        originalContentLength: content.length,
      },
      tags: ['newsletter', 'refinement'],
    })

    return NextResponse.json({
      success: true,
      refinedContent: response.content,
      refinementApplied: refinementPrompt,
      section: selectedSection,
      usage: response.usage,
    })

  } catch (error) {
    console.error('Refinement error:', error)
    return NextResponse.json(
      { error: 'Failed to refine content' },
      { status: 500 }
    )
  }
}