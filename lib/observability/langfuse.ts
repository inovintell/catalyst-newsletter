/**
 * Langfuse client singleton and tracing utilities
 */

import { Langfuse } from 'langfuse';
import type {
  ClaudeTraceMetadata,
  ClaudeTracingConfig,
  TracedClaudeResult,
  TraceContext,
} from './types';

let langfuseClient: Langfuse | null = null;
let initializationAttempted = false;

/**
 * Check if Langfuse is enabled via environment variable
 */
export function isLangfuseEnabled(): boolean {
  const enabled = process.env.LANGFUSE_ENABLED;
  return enabled !== 'false' && enabled !== '0';
}

/**
 * Initialize and get the Langfuse client singleton
 * Returns null if Langfuse is disabled or credentials are missing
 */
export function getLangfuseClient(): Langfuse | null {
  if (!isLangfuseEnabled()) {
    return null;
  }

  if (langfuseClient) {
    return langfuseClient;
  }

  if (initializationAttempted) {
    return null;
  }

  initializationAttempted = true;

  try {
    const publicKey = process.env.LANGFUSE_PUBLIC_KEY;
    const secretKey = process.env.LANGFUSE_SECRET_KEY;
    const host = process.env.LANGFUSE_HOST || 'https://cloud.langfuse.com';

    if (!publicKey || !secretKey) {
      console.warn(
        'Langfuse credentials not configured. Observability disabled. Set LANGFUSE_PUBLIC_KEY and LANGFUSE_SECRET_KEY to enable.'
      );
      return null;
    }

    langfuseClient = new Langfuse({
      publicKey,
      secretKey,
      baseUrl: host,
      flushAt: 1, // Flush immediately for development, adjust for production
      flushInterval: 1000, // 1 second
    });

    const environment = process.env.NODE_ENV || process.env.APP_ENV || 'local';
    console.log(`Langfuse observability initialized successfully (environment: ${environment})`);
    return langfuseClient;
  } catch (error) {
    console.error('Failed to initialize Langfuse client:', error);
    return null;
  }
}

/**
 * Create a trace for a generation request
 */
export function createGenerationTrace(
  name: string,
  metadata: Record<string, unknown> = {},
  userId?: string
): TraceContext {
  const client = getLangfuseClient();
  if (!client) {
    return {};
  }

  try {
    const environment = process.env.NODE_ENV || process.env.APP_ENV || 'local';

    const trace = client.trace({
      name,
      metadata: {
        ...metadata,
        environment, // Add environment to metadata
      },
      userId,
      tags: [`env:${environment}`], // Add environment as tag for filtering
    });

    return {
      traceId: trace.id,
    };
  } catch (error) {
    console.error('Failed to create Langfuse trace:', error);
    return {};
  }
}

/**
 * Get an existing trace by ID to add generation spans to it
 */
export function getTraceById(traceId: string) {
  const client = getLangfuseClient();
  if (!client || !traceId) {
    return null;
  }

  try {
    // Get the trace by ID
    const trace = client.trace({
      id: traceId,
    });

    return trace;
  } catch (error) {
    console.error('Failed to retrieve Langfuse trace:', error);
    return null;
  }
}

/**
 * Wrapper for non-streaming Claude API calls with automatic tracing
 */
export async function withGenerationTrace<T>(
  config: ClaudeTracingConfig,
  apiCall: () => Promise<T>,
  extractUsage?: (result: T) => { promptTokens: number; completionTokens: number; totalTokens: number }
): Promise<TracedClaudeResult<T>> {
  const client = getLangfuseClient();

  // If Langfuse is disabled, just execute the API call
  if (!client) {
    const result = await apiCall();
    return {
      result,
      traceId: '',
      usage: extractUsage ? extractUsage(result) : undefined,
    };
  }

  const startTime = Date.now();
  let generation;

  try {
    const environment = process.env.NODE_ENV || process.env.APP_ENV || 'local';

    // Create a trace
    const trace = client.trace({
      name: config.name,
      userId: config.userId,
      sessionId: config.sessionId,
      metadata: {
        ...config.metadata,
        environment, // Add environment to metadata
      },
      tags: [...(config.tags || []), `env:${environment}`], // Add environment tag
    });

    // Create a generation span
    const modelParameters: Record<string, string | number | boolean | string[] | null> = {};
    if (config.metadata.temperature !== undefined) {
      modelParameters.temperature = config.metadata.temperature;
    }
    if (config.metadata.maxTokens !== undefined) {
      modelParameters.maxTokens = config.metadata.maxTokens;
    }

    generation = trace.generation({
      name: config.metadata.operation,
      model: config.metadata.model,
      modelParameters,
      metadata: config.metadata as Record<string, unknown>,
    });

    // Execute the API call
    const result = await apiCall();
    const endTime = Date.now();
    const latencyMs = endTime - startTime;

    // Extract usage information if available
    const usage = extractUsage ? extractUsage(result) : undefined;

    // Update the generation with results
    generation.end({
      metadata: {
        ...config.metadata,
        latencyMs,
      },
      usage: usage
        ? {
            input: usage.promptTokens,
            output: usage.completionTokens,
            total: usage.totalTokens,
          }
        : undefined,
    });

    // Flush to ensure data is sent
    await client.flushAsync();

    return {
      result,
      traceId: trace.id,
      usage,
    };
  } catch (error) {
    const endTime = Date.now();
    const latencyMs = endTime - startTime;

    // Capture error in trace
    if (generation) {
      generation.end({
        metadata: {
          ...config.metadata,
          latencyMs,
          error: {
            type: error instanceof Error ? error.constructor.name : 'Unknown',
            message: error instanceof Error ? error.message : String(error),
            stack: error instanceof Error ? error.stack : undefined,
          },
        },
        level: 'ERROR',
      });
    }

    // Flush error trace
    try {
      await client.flushAsync();
    } catch (flushError) {
      console.error('Failed to flush Langfuse error trace:', flushError);
    }

    // Re-throw the original error
    throw error;
  }
}

/**
 * Wrapper for streaming Claude API calls with automatic tracing
 */
export async function withStreamingGenerationTrace<T>(
  config: ClaudeTracingConfig,
  streamCall: () => Promise<T>,
  onStreamComplete?: (
    result: T,
    accumulatedTokens: { input: number; output: number; total: number }
  ) => void
): Promise<TracedClaudeResult<T>> {
  const client = getLangfuseClient();

  // If Langfuse is disabled, just execute the stream call
  if (!client) {
    const result = await streamCall();
    return {
      result,
      traceId: '',
    };
  }

  const startTime = Date.now();
  let generation;

  try {
    const environment = process.env.NODE_ENV || process.env.APP_ENV || 'local';

    // Create a trace
    const trace = client.trace({
      name: config.name,
      userId: config.userId,
      sessionId: config.sessionId,
      metadata: {
        ...config.metadata,
        environment, // Add environment to metadata
      },
      tags: [...(config.tags || []), `env:${environment}`], // Add environment tag
    });

    // Create a generation span
    const modelParameters: Record<string, string | number | boolean | string[] | null> = {};
    if (config.metadata.temperature !== undefined) {
      modelParameters.temperature = config.metadata.temperature;
    }
    if (config.metadata.maxTokens !== undefined) {
      modelParameters.maxTokens = config.metadata.maxTokens;
    }

    generation = trace.generation({
      name: config.metadata.operation,
      model: config.metadata.model,
      modelParameters,
      metadata: config.metadata as Record<string, unknown>,
    });

    // Execute the streaming call
    const result = await streamCall();
    const endTime = Date.now();
    const latencyMs = endTime - startTime;

    // Note: Token usage will be updated after stream completes
    // The caller should call finalizeStreamingTrace with accumulated tokens

    return {
      result,
      traceId: trace.id,
    };
  } catch (error) {
    const endTime = Date.now();
    const latencyMs = endTime - startTime;

    // Capture error in trace
    if (generation) {
      generation.end({
        metadata: {
          ...config.metadata,
          latencyMs,
          error: {
            type: error instanceof Error ? error.constructor.name : 'Unknown',
            message: error instanceof Error ? error.message : String(error),
            stack: error instanceof Error ? error.stack : undefined,
          },
        },
        level: 'ERROR',
      });
    }

    // Flush error trace
    try {
      await client.flushAsync();
    } catch (flushError) {
      console.error('Failed to flush Langfuse error trace:', flushError);
    }

    // Re-throw the original error
    throw error;
  }
}

/**
 * Finalize a streaming trace with accumulated token usage
 */
export async function finalizeStreamingTrace(
  traceId: string,
  metadata: ClaudeTraceMetadata,
  usage: { input: number; output: number; total: number }
): Promise<void> {
  const client = getLangfuseClient();
  if (!client || !traceId) {
    return;
  }

  try {
    // Note: The generation was already created in withStreamingGenerationTrace
    // Here we just need to flush any pending data
    // The actual usage update would need to be done through the generation object
    // which we don't have a reference to here

    // For now, we'll flush any pending traces
    await client.flushAsync();
  } catch (error) {
    console.error('Failed to finalize streaming trace:', error);
  }
}

/**
 * Update trace metadata after generation completes
 */
export async function updateTraceMetadata(
  traceId: string,
  metadata: Record<string, unknown>
): Promise<void> {
  const client = getLangfuseClient();
  if (!client || !traceId) {
    return;
  }

  try {
    // Update trace with additional metadata
    // Note: Langfuse SDK doesn't have a direct updateTrace method
    // Metadata should be included during trace creation
    // This function is a placeholder for future SDK capabilities
    await client.flushAsync();
  } catch (error) {
    console.error('Failed to update trace metadata:', error);
  }
}

/**
 * Get Langfuse dashboard URL for a trace
 */
export function getTraceUrl(traceId: string): string | null {
  if (!traceId) {
    return null;
  }

  const host = process.env.LANGFUSE_HOST || 'https://cloud.langfuse.com';
  return `${host}/trace/${traceId}`;
}

/**
 * Flush all pending traces (useful for serverless environments)
 */
export async function flushTraces(): Promise<void> {
  const client = getLangfuseClient();
  if (!client) {
    return;
  }

  try {
    await client.flushAsync();
  } catch (error) {
    console.error('Failed to flush Langfuse traces:', error);
  }
}

/**
 * Shutdown Langfuse client gracefully
 */
export async function shutdownLangfuse(): Promise<void> {
  const client = getLangfuseClient();
  if (!client) {
    return;
  }

  try {
    await client.shutdownAsync();
    langfuseClient = null;
    initializationAttempted = false;
  } catch (error) {
    console.error('Failed to shutdown Langfuse client:', error);
  }
}
