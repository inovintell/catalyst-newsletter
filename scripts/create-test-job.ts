import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

async function createTestJob() {
  const generation = await prisma.newsletterGeneration.create({
    data: {
      status: 'pending',
      jobStatus: 'queued',
      config: {
        selectedSources: [1, 2, 3],
        dateRange: { from: '2025-01-28', to: '2025-02-05' },
        outputFormat: 'detailed',
        includeExecutiveSummary: true,
        groupByTopic: true
      },
      prompt: 'Generate newsletter based on recent news',
      startedAt: new Date(),
      currentStep: 'Job queued for processing',
      priority: 1,
      progress: {
        logs: ['Job created for testing']
      }
    }
  })

  console.log('Test job created with ID:', generation.id)
  return generation.id
}

createTestJob()
  .then(() => process.exit(0))
  .catch(e => { console.error(e); process.exit(1) })
