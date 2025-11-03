/**
 * Type definitions for LLM observability with Langfuse
 */

/**
 * Metadata for newsletter generation operations
 */
export interface GenerationMetadata {
  userId?: string;
  tenantId?: string;
  dateRange?: {
    start: string;
    end: string;
  };
  sourcesCount?: number;
  outputFormat?: string;
  sections?: string[];
  filters?: Record<string, unknown>;
}

/**
 * Metadata for Claude API calls
 */
export interface ClaudeTraceMetadata {
  model: string;
  temperature?: number;
  maxTokens?: number;
  operation: 'newsletter_generation' | 'refinement' | 'streaming_generation' | 'agent_generation' | 'agent_streaming_generation';
  promptTokens?: number;
  completionTokens?: number;
  totalTokens?: number;
  latencyMs?: number;
  error?: {
    type: string;
    message: string;
    statusCode?: number;
    stack?: string;
  };
  // Allow additional custom metadata
  [key: string]: unknown;
}

/**
 * Context for linking traces to parent traces
 */
export interface TraceContext {
  traceId?: string;
  spanId?: string;
  parentTraceId?: string;
  generationId?: string;
}

/**
 * Configuration for Claude API tracing
 */
export interface ClaudeTracingConfig {
  name: string;
  metadata: ClaudeTraceMetadata;
  userId?: string;
  sessionId?: string;
  tags?: string[];
}

/**
 * Result of a traced Claude API call
 */
export interface TracedClaudeResult<T> {
  result: T;
  traceId: string;
  usage?: {
    promptTokens: number;
    completionTokens: number;
    totalTokens: number;
  };
}
