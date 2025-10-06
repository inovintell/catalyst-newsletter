/**
 * Runtime type validation utilities
 * Ensures data integrity at runtime, especially for API responses
 */

/**
 * Safely converts any data to an array
 * @param data - Unknown data that should be an array
 * @param context - Optional context for logging (e.g., "sources API")
 * @returns A valid array, empty if data is invalid
 */
export function ensureArray<T>(data: unknown, context?: string): T[] {
  // If data is already an array, return it
  if (Array.isArray(data)) {
    return data as T[]
  }

  // Log warning when data is not in expected format
  if (context && data !== null && data !== undefined) {
    console.warn(
      `[Validation] Expected array in ${context}, received:`,
      typeof data === 'object' ? JSON.stringify(data) : data
    )
  }

  // Return empty array as safe fallback
  return []
}

/**
 * Type guard to check if data is an array
 * @param data - Data to check
 * @returns true if data is an array
 */
export function isArray(data: unknown): data is unknown[] {
  return Array.isArray(data)
}
