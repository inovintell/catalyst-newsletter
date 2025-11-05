import { NextRequest, NextResponse } from 'next/server'
import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

export async function GET(request: NextRequest) {
  const searchParams = request.nextUrl.searchParams
  const generationId = searchParams.get('id')

  if (!generationId) {
    return NextResponse.json(
      { error: 'Generation ID required' },
      { status: 400 }
    )
  }

  const requestId = crypto.randomUUID()
  console.log(`[${requestId}] Starting status stream for generation ID: ${generationId}`)

  const encoder = new TextEncoder()

  const stream = new ReadableStream({
    async start(controller) {
      let isClosed = false
      let pollInterval: NodeJS.Timeout | null = null

      const sendEvent = (event: string, data: any) => {
        if (!isClosed) {
          try {
            controller.enqueue(
              encoder.encode(`event: ${event}\ndata: ${JSON.stringify(data)}\n\n`)
            )
          } catch (e) {
            console.log(`[${requestId}] Failed to enqueue (controller closed)`)
            isClosed = true
          }
        }
      }

      const closeController = () => {
        if (!isClosed) {
          isClosed = true
          if (pollInterval) {
            clearInterval(pollInterval)
          }
          controller.close()
        }
      }

      // Handle client disconnect
      request.signal.addEventListener('abort', () => {
        console.log(`[${requestId}] Client disconnected, stopping stream`)
        closeController()
      })

      try {
        // Verify generation exists
        const generation = await prisma.newsletterGeneration.findUnique({
          where: { id: parseInt(generationId) }
        })

        if (!generation) {
          sendEvent('error', { message: 'Generation not found' })
          closeController()
          return
        }

        // Send initial status
        sendEvent('status', {
          message: generation.currentStep || 'Job queued for processing',
          jobStatus: generation.jobStatus
        })

        let lastProgressUpdate = ''
        let startTime = Date.now()
        const maxPollTime = 10 * 60 * 1000 // 10 minutes timeout

        // Poll database for updates every 2 seconds
        pollInterval = setInterval(async () => {
          try {
            if (isClosed || request.signal.aborted) {
              closeController()
              return
            }

            // Check timeout
            if (Date.now() - startTime > maxPollTime) {
              sendEvent('error', { message: 'Generation timeout - no progress after 10 minutes' })
              closeController()
              return
            }

            const job = await prisma.newsletterGeneration.findUnique({
              where: { id: parseInt(generationId) }
            })

            if (!job) {
              sendEvent('error', { message: 'Generation not found' })
              closeController()
              return
            }

            // Handle different job states
            switch (job.jobStatus) {
              case 'queued':
                // Send status update if currentStep changed
                if (job.currentStep && job.currentStep !== lastProgressUpdate) {
                  sendEvent('status', {
                    message: job.currentStep,
                    jobStatus: 'queued'
                  })
                  lastProgressUpdate = job.currentStep
                }
                break

              case 'running':
                // Send progress updates
                const progress = job.progress as any
                if (progress?.logs) {
                  const latestLog = progress.logs[progress.logs.length - 1]
                  if (latestLog !== lastProgressUpdate) {
                    sendEvent('status', {
                      message: job.currentStep || latestLog,
                      jobStatus: 'running',
                      progress: progress
                    })
                    lastProgressUpdate = latestLog
                  }
                }

                // If we have output, stream chunks
                if (job.output) {
                  // Send content chunks (simulate streaming by sending in parts)
                  const chunkSize = 100
                  const output = job.output
                  for (let i = 0; i < output.length; i += chunkSize) {
                    const chunk = output.substring(i, i + chunkSize)
                    sendEvent('content', { chunk })
                  }
                }
                break

              case 'completed':
                // Send completion event
                sendEvent('status', {
                  message: 'Newsletter generation completed',
                  jobStatus: 'completed'
                })

                if (job.output) {
                  sendEvent('complete', {
                    message: 'Newsletter generated successfully!',
                    generationId: job.id,
                    output: job.output
                  })
                }

                // Create newsletter record for archive if not exists
                const existingNewsletter = await prisma.newsletter.findFirst({
                  where: {
                    parameters: {
                      path: ['generationId'],
                      equals: job.id
                    }
                  }
                })

                if (!existingNewsletter && job.output) {
                  await prisma.newsletter.create({
                    data: {
                      title: `Healthcare Newsletter - ${new Date().toLocaleDateString()}`,
                      content: { output: job.output } as any,
                      sourcesUsed: job.config as any,
                      parameters: {
                        ...job.config as any,
                        generationId: job.id
                      } as any,
                      status: 'completed'
                    }
                  })
                }

                closeController()
                return

              case 'failed':
                sendEvent('error', {
                  message: job.error || 'Generation failed',
                  jobStatus: 'failed'
                })
                sendEvent('done', {
                  success: false,
                  error: job.error || 'Generation failed'
                })
                closeController()
                return

              case 'cancelled':
                sendEvent('error', {
                  message: 'Generation was cancelled',
                  jobStatus: 'cancelled'
                })
                sendEvent('done', {
                  success: false,
                  error: 'Generation cancelled'
                })
                closeController()
                return
            }

          } catch (pollError) {
            console.error(`[${requestId}] Polling error:`, pollError)
          }
        }, 2000) // Poll every 2 seconds

      } catch (error) {
        console.error(`[${requestId}] Stream error:`, error)
        sendEvent('error', {
          message: 'Failed to stream generation status'
        })
        closeController()
      }
    }
  })

  return new NextResponse(stream, {
    headers: {
      'Content-Type': 'text/event-stream',
      'Cache-Control': 'no-cache',
      'Connection': 'keep-alive'
    }
  })
}
