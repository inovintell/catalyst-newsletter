/**
 * Job Processor Trigger Endpoint
 * Designed for Cloud Scheduler - starts processor and returns immediately
 * No streaming, no long-running connection
 */

import { NextRequest, NextResponse } from 'next/server'
import { jobQueueService } from '@/lib/job-queue'

export const dynamic = 'force-dynamic'
export const maxDuration = 10 // Quick 10 second timeout

export async function GET(request: NextRequest) {
  try {
    console.log('[JobTrigger] Received trigger request from Cloud Scheduler')

    // Get current status
    const status = jobQueueService.getStatus()

    // Start the processor if not already running
    if (!status.isRunning) {
      console.log('[JobTrigger] Starting job queue service')
      // Start in background, don't await
      jobQueueService.start().catch(err => {
        console.error('[JobTrigger] Error starting job queue:', err)
      })

      return NextResponse.json({
        success: true,
        message: 'Job processor started',
        status: 'started',
        timestamp: new Date().toISOString()
      })
    }

    // Already running
    console.log('[JobTrigger] Job processor already running', status)
    return NextResponse.json({
      success: true,
      message: 'Job processor already running',
      status: 'running',
      activeJob: status.currentJobId,
      timestamp: new Date().toISOString()
    })

  } catch (error) {
    console.error('[JobTrigger] Error:', error)
    return NextResponse.json(
      {
        success: false,
        error: 'Failed to trigger job processor',
        message: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    )
  }
}

// Also support POST for Cloud Scheduler flexibility
export async function POST(request: NextRequest) {
  return GET(request)
}
