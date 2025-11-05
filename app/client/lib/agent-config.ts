export interface AgentConfiguration {
  sources: NewsSource[]
  dateRange: {
    from: string
    to: string
  }
  outputFormat: 'executive' | 'detailed' | 'custom'
  includeExecutiveSummary: boolean
  groupByTopic: boolean
  topics?: string[]
  geoScopes?: string[]
}

export interface NewsSource {
  id: number
  website: string
  topic: string
  link: string
  comment?: string | null
  geoScope: string
  importanceLevel?: string | null
  requiresScreening: boolean
}

/**
 * Generates the user prompt for the newsletter agent
 * This contains ONLY dynamic variables (dates, sources, format preferences)
 * All instructions, role definition, and output format are in claude-agent.ts systemPrompt
 */
export function generateAgentPrompt(config: AgentConfiguration): string {
  const sourcesText = config.sources
    .map(source => {
      return `- ${source.website} (${source.topic}, ${source.geoScope}): ${source.link}${source.comment ? ` - ${source.comment}` : ''}`
    })
    .join('\n')

  return `Date Range: ${config.dateRange.from} to ${config.dateRange.to}

News Sources to Monitor:
${sourcesText}

Output Format: ${config.outputFormat}
${config.includeExecutiveSummary ? 'Include Executive Summary: Yes\n' : ''}${config.groupByTopic ? 'Group By Topic: Yes\n' : ''}${config.topics?.length ? `Focus Topics: ${config.topics.join(', ')}\n` : ''}${config.geoScopes?.length ? `Focus Regions: ${config.geoScopes.join(', ')}\n` : ''}`

}

export function generateAgentConfig(sources: NewsSource[]): object {
  return {
    name: "newsletter-agent",
    description: "Generates healthcare and life sciences newsletters from configured news sources",
    version: "1.0.0",
    sources: sources.map(source => ({
      id: source.id,
      url: source.link,
      name: source.website,
      topic: source.topic,
      geoScope: source.geoScope,
      importance: source.importanceLevel,
      requiresScreening: source.requiresScreening,
      notes: source.comment
    })),
    capabilities: [
      "web_search",
      "content_aggregation",
      "summary_generation",
      "trend_analysis"
    ],
    outputFormats: ["executive", "detailed", "custom"],
    lastUpdated: new Date().toISOString()
  }
}