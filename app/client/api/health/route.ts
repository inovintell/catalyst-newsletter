import { NextResponse } from 'next/server'
import { prisma } from '@/lib/db'

export async function GET() {
  try {
    // Test basic database connectivity
    await prisma.$queryRaw`SELECT 1`

    // Verify NewsSource table exists by attempting a count query
    // This will fail if migrations haven't been run
    const sourceCount = await prisma.newsSource.count()

    return NextResponse.json({
      status: 'healthy',
      database: 'connected',
      migrations: 'applied',
      sourceCount,
      timestamp: new Date().toISOString()
    })
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error'
    const isMigrationError = errorMessage.includes('does not exist') ||
                            errorMessage.includes('relation') ||
                            errorMessage.includes('table')

    return NextResponse.json({
      status: 'unhealthy',
      database: isMigrationError ? 'connected' : 'disconnected',
      migrations: isMigrationError ? 'not_applied' : 'unknown',
      error: errorMessage,
      recommendation: isMigrationError
        ? 'Run database migrations: npx prisma migrate deploy'
        : 'Check database connection and credentials',
      timestamp: new Date().toISOString()
    }, { status: 503 })
  }
}