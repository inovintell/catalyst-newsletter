import { NextRequest, NextResponse } from 'next/server'
import { generateAgentConfig } from '@/lib/agent-manager'
import fs from 'fs/promises'
import path from 'path'

export async function GET(request: NextRequest) {
  try {
    // Try to load existing config first
    const configPath = path.join(process.cwd(), 'agent-configs', 'latest.json')

    try {
      const existingConfig = await fs.readFile(configPath, 'utf-8')
      return NextResponse.json(JSON.parse(existingConfig))
    } catch {
      // If no existing config, generate new one
      const config = await generateAgentConfig()
      return NextResponse.json(config)
    }

  } catch (error) {
    console.error('Error fetching agent config:', error)
    return NextResponse.json(
      { error: 'Failed to fetch agent configuration' },
      { status: 500 }
    )
  }
}