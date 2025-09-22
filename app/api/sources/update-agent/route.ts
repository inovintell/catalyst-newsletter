import { NextRequest, NextResponse } from 'next/server'
import { updateAgentOnSourceChange } from '@/lib/agent-manager'

export async function POST(request: NextRequest) {
  try {
    // Trigger agent configuration update
    await updateAgentOnSourceChange()

    return NextResponse.json({
      success: true,
      message: 'Agent configuration updated successfully',
      timestamp: new Date().toISOString()
    })

  } catch (error) {
    console.error('Error updating agent:', error)
    return NextResponse.json(
      { error: 'Failed to update agent configuration' },
      { status: 500 }
    )
  }
}