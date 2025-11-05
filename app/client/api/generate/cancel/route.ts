/**
 * Cancellation API Endpoint
 * Allows users to cancel running or queued newsletter generation jobs
 */

import { NextRequest, NextResponse } from 'next/server'
import { PrismaClient } from '@prisma/client'
import { withAuth } from '@/lib/auth/middleware'
import { jobQueueService } from '@/lib/job-queue'

const prisma = new PrismaClient()

export const POST = withAuth(async (request: NextRequest) => {
  try {
    const body = await request.json()
    const { generationId } = body

    if (!generationId) {
      return NextResponse.json(
        { error: 'Generation ID is required' },
        { status: 400 }
      )
    }

    // Fetch the job
    const job = await prisma.newsletterGeneration.findUnique({
      where: { id: parseInt(generationId) }
    })

    if (!job) {
      return NextResponse.json(
        { error: 'Generation not found' },
        { status: 404 }
      )
    }

    // Check if job is already in terminal state
    if (job.jobStatus === 'completed' || job.jobStatus === 'failed') {
      return NextResponse.json(
        {
          error: `Cannot cancel job - already ${job.jobStatus}`,
          jobStatus: job.jobStatus
        },
        { status: 400 }
      )
    }

    // Cancel the job
    console.log(`[Cancel] Cancelling generation ${generationId}`)
    await jobQueueService.cancelJob(parseInt(generationId))

    return NextResponse.json({
      success: true,
      message: 'Job cancelled successfully',
      generationId: generationId
    })

  } catch (error) {
    console.error('Error cancelling generation:', error)
    return NextResponse.json(
      { error: 'Failed to cancel generation' },
      { status: 500 }
    )
  }
})
