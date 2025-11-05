/**
 * Background Job Queue Service for Newsletter Generation
 * Singleton service that polls database for queued jobs and executes them
 */

import { PrismaClient } from '@prisma/client'
import { streamNewsletterAgent } from './claude-agent'

const prisma = new PrismaClient()

interface JobProgress {
  logs: string[]
  metadata?: Record<string, any>
  startedAt?: string
  lastUpdate?: string
}

class JobQueueService {
  private isRunning = false
  private currentJobId: number | null = null
  private abortControllers: Map<number, AbortController> = new Map()
  private pollInterval = 5000 // 5 seconds
  private heartbeatInterval = 30000 // 30 seconds
  private progressUpdateInterval = 10000 // 10 seconds
  private stalledJobTimeout = 15 * 60 * 1000 // 15 minutes

  /**
   * Start the job queue processor
   */
  async start() {
    if (this.isRunning) {
      console.log('[JobQueue] Already running, skipping start')
      return
    }

    this.isRunning = true
    console.log('[JobQueue] Starting job queue service')

    // Start polling loop
    this.pollLoop()

    // Start stalled job detection
    this.detectStalledJobsLoop()
  }

  /**
   * Stop the job queue processor
   */
  async stop() {
    console.log('[JobQueue] Stopping job queue service')
    this.isRunning = false

    // Cancel any running jobs
    if (this.currentJobId) {
      await this.cancelJob(this.currentJobId)
    }
  }

  /**
   * Main polling loop that checks for queued jobs
   */
  private async pollLoop() {
    while (this.isRunning) {
      try {
        await this.pollForNextJob()
      } catch (error) {
        console.error('[JobQueue] Error in poll loop:', error)
      }

      // Wait before next poll
      await this.sleep(this.pollInterval)
    }
  }

  /**
   * Poll database for next queued job and execute it
   */
  private async pollForNextJob() {
    // Skip if already processing a job
    if (this.currentJobId) {
      return
    }

    // Find next queued job (FIFO with priority)
    const job = await prisma.newsletterGeneration.findFirst({
      where: {
        jobStatus: 'queued'
      },
      orderBy: [
        { priority: 'desc' },
        { createdAt: 'asc' }
      ]
    })

    if (!job) {
      return
    }

    console.log(`[JobQueue] Found queued job: ${job.id}`)
    await this.executeJob(job.id)
  }

  /**
   * Execute a job by its ID
   */
  private async executeJob(generationId: number) {
    this.currentJobId = generationId
    const abortController = new AbortController()
    this.abortControllers.set(generationId, abortController)

    try {
      // Mark job as running
      await prisma.newsletterGeneration.update({
        where: { id: generationId },
        data: {
          jobStatus: 'running',
          status: 'running',
          currentStep: 'Starting newsletter generation',
          processedAt: new Date(),
          lastHeartbeat: new Date(),
          progress: {
            logs: ['Job started'],
            startedAt: new Date().toISOString()
          }
        }
      })

      console.log(`[JobQueue] Executing job: ${generationId}`)

      // Fetch the job data
      const job = await prisma.newsletterGeneration.findUnique({
        where: { id: generationId }
      })

      if (!job) {
        throw new Error(`Job ${generationId} not found`)
      }

      // Setup heartbeat interval
      const heartbeatTimer = setInterval(async () => {
        if (!abortController.signal.aborted) {
          await this.updateHeartbeat(generationId)
        }
      }, this.heartbeatInterval)

      // Setup progress tracking
      let accumulatedOutput = ''
      const progressLogs: string[] = ['Job started']
      let lastProgressUpdate = Date.now()

      try {
        // Execute the agent stream
        for await (const chunk of streamNewsletterAgent(
          job.prompt,
          { traceId: job.traceId || undefined }
        )) {
          // Check for cancellation
          if (abortController.signal.aborted) {
            console.log(`[JobQueue] Job ${generationId} cancelled during execution`)
            throw new Error('Job cancelled')
          }

          accumulatedOutput += chunk

          // Update progress periodically
          const now = Date.now()
          if (now - lastProgressUpdate > this.progressUpdateInterval) {
            await this.updateProgress(generationId, {
              logs: [
                ...progressLogs,
                `Generated ${accumulatedOutput.length} characters so far...`
              ],
              metadata: {
                outputLength: accumulatedOutput.length,
                lastUpdate: new Date().toISOString()
              }
            })
            lastProgressUpdate = now
          }
        }

        // Clear heartbeat timer
        clearInterval(heartbeatTimer)

        // Check for cancellation one final time
        if (abortController.signal.aborted) {
          console.log(`[JobQueue] Job ${generationId} cancelled after execution`)
          throw new Error('Job cancelled')
        }

        // Mark job as completed
        await prisma.newsletterGeneration.update({
          where: { id: generationId },
          data: {
            jobStatus: 'completed',
            status: 'completed',
            currentStep: 'Newsletter generation completed',
            output: accumulatedOutput,
            completedAt: new Date(),
            lastHeartbeat: new Date(),
            progress: {
              logs: [
                ...progressLogs,
                'Generation completed successfully'
              ],
              metadata: {
                outputLength: accumulatedOutput.length,
                completedAt: new Date().toISOString()
              }
            }
          }
        })

        console.log(`[JobQueue] Job ${generationId} completed successfully`)

      } catch (error: any) {
        clearInterval(heartbeatTimer)

        // Don't update if cancelled (status already set)
        if (error.message !== 'Job cancelled') {
          await prisma.newsletterGeneration.update({
            where: { id: generationId },
            data: {
              jobStatus: 'failed',
              status: 'failed',
              currentStep: 'Failed during generation',
              error: error.message || 'Unknown error',
              completedAt: new Date(),
              lastHeartbeat: new Date(),
              progress: {
                logs: [
                  ...progressLogs,
                  `Error: ${error.message || 'Unknown error'}`
                ]
              }
            }
          })

          console.error(`[JobQueue] Job ${generationId} failed:`, error)
        }
      }

    } catch (error) {
      console.error(`[JobQueue] Error executing job ${generationId}:`, error)

      // Mark job as failed
      await prisma.newsletterGeneration.update({
        where: { id: generationId },
        data: {
          jobStatus: 'failed',
          status: 'failed',
          currentStep: 'Failed to start',
          error: error instanceof Error ? error.message : 'Unknown error',
          completedAt: new Date()
        }
      })
    } finally {
      // Cleanup
      this.abortControllers.delete(generationId)
      this.currentJobId = null
    }
  }

  /**
   * Update job progress
   */
  private async updateProgress(generationId: number, progress: JobProgress) {
    try {
      await prisma.newsletterGeneration.update({
        where: { id: generationId },
        data: {
          progress: progress as any,
          currentStep: progress.logs[progress.logs.length - 1] || 'Processing...',
          lastHeartbeat: new Date()
        }
      })
    } catch (error) {
      console.error(`[JobQueue] Failed to update progress for job ${generationId}:`, error)
    }
  }

  /**
   * Update job heartbeat timestamp
   */
  private async updateHeartbeat(generationId: number) {
    try {
      await prisma.newsletterGeneration.update({
        where: { id: generationId },
        data: {
          lastHeartbeat: new Date()
        }
      })
    } catch (error) {
      console.error(`[JobQueue] Failed to update heartbeat for job ${generationId}:`, error)
    }
  }

  /**
   * Cancel a job by its ID
   */
  async cancelJob(generationId: number) {
    console.log(`[JobQueue] Cancelling job: ${generationId}`)

    // Update database status
    await prisma.newsletterGeneration.update({
      where: { id: generationId },
      data: {
        jobStatus: 'cancelled',
        status: 'cancelled',
        currentStep: 'Cancelled by user',
        completedAt: new Date()
      }
    })

    // Trigger abort controller if job is running
    const abortController = this.abortControllers.get(generationId)
    if (abortController) {
      abortController.abort()
    }
  }

  /**
   * Detect and mark stalled jobs as failed
   */
  private async detectStalledJobsLoop() {
    while (this.isRunning) {
      try {
        await this.detectStalledJobs()
      } catch (error) {
        console.error('[JobQueue] Error detecting stalled jobs:', error)
      }

      // Check every 5 minutes
      await this.sleep(5 * 60 * 1000)
    }
  }

  /**
   * Find jobs with old heartbeats and mark them as failed
   */
  private async detectStalledJobs() {
    const stalledThreshold = new Date(Date.now() - this.stalledJobTimeout)

    const stalledJobs = await prisma.newsletterGeneration.findMany({
      where: {
        jobStatus: 'running',
        lastHeartbeat: {
          lt: stalledThreshold
        }
      }
    })

    for (const job of stalledJobs) {
      console.log(`[JobQueue] Detected stalled job: ${job.id}`)

      await prisma.newsletterGeneration.update({
        where: { id: job.id },
        data: {
          jobStatus: 'failed',
          status: 'failed',
          currentStep: 'Job stalled - no heartbeat detected',
          error: 'Job processor stopped responding',
          completedAt: new Date()
        }
      })
    }
  }

  /**
   * Sleep utility
   */
  private sleep(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms))
  }

  /**
   * Get current status
   */
  getStatus() {
    return {
      isRunning: this.isRunning,
      currentJobId: this.currentJobId,
      activeJobs: this.abortControllers.size
    }
  }
}

// Export singleton instance
export const jobQueueService = new JobQueueService()
