/**
 * Job Processor API Endpoint
 * Long-running streaming endpoint that keeps Cloud Run instance alive
 * while the job queue service processes background jobs
 */

import { NextRequest } from 'next/server'
import { jobQueueService } from '@/lib/job-queue'

export const dynamic = 'force-dynamic'
export const maxDuration = 300 // 5 minutes max

let processorStarted = false

export async function GET(request: NextRequest) {
  // Prevent duplicate processors
  if (processorStarted) {
    console.log('[JobProcessor] Already running, returning heartbeat stream')
  } else {
    console.log('[JobProcessor] Starting job queue service')
    processorStarted = true

    // Start the job queue service (singleton)
    await jobQueueService.start()
  }

  // Create readable stream for SSE
  const encoder = new TextEncoder()

  const stream = new ReadableStream({
    async start(controller) {
      // Send initial connected event
      controller.enqueue(encoder.encode('data: {"type":"connected","message":"Job processor active"}\n\n'))

      // Send heartbeat every 30 seconds
      const heartbeatInterval = setInterval(() => {
        try {
          const status = jobQueueService.getStatus()
          controller.enqueue(
            encoder.encode(`data: ${JSON.stringify({
              type: 'heartbeat',
              timestamp: new Date().toISOString(),
              status
            })}\n\n`)
          )
        } catch (error) {
          console.error('[JobProcessor] Heartbeat error:', error)
        }
      }, 30000)

      // Handle abort signal
      request.signal.addEventListener('abort', () => {
        console.log('[JobProcessor] Client disconnected, cleaning up')
        clearInterval(heartbeatInterval)
        controller.close()
      })

      // Keep stream open (it will close when client disconnects or timeout)
    }
  })

  return new Response(stream, {
    headers: {
      'Content-Type': 'text/event-stream',
      'Cache-Control': 'no-cache',
      'Connection': 'keep-alive',
    },
  })
}
