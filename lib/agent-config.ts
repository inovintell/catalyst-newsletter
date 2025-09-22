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

export function generateAgentPrompt(config: AgentConfiguration): string {
  const sourcesText = config.sources
    .map(source => {
      return `- ${source.website} (${source.topic}, ${source.geoScope}): ${source.link}${source.comment ? ` - ${source.comment}` : ''}`
    })
    .join('\n')

  const formatInstructions = {
    executive: `Create an executive summary with:
- Key highlights and trends
- Most important developments
- Strategic implications
- Recommended actions`,
    detailed: `Create a comprehensive report with:
- Executive summary
- Detailed analysis by topic
- Individual news items with context
- Market implications
- Regulatory updates
- Competitive landscape`,
    custom: `Create a customized newsletter focusing on:
${config.includeExecutiveSummary ? '- Executive summary\n' : ''}
${config.groupByTopic ? '- News grouped by topic\n' : '- Chronological news listing\n'}
${config.topics?.length ? `- Focus on topics: ${config.topics.join(', ')}\n` : ''}
${config.geoScopes?.length ? `- Focus on regions: ${config.geoScopes.join(', ')}\n` : ''}`
  }

  return `You are a healthcare and life sciences newsletter generator for InovIntell, specializing in HTA, HEOR, and market access intelligence.

Generate a newsletter for the period from ${config.dateRange.from} to ${config.dateRange.to}.

News Sources to Monitor:
${sourcesText}

Output Format Requirements:
${formatInstructions[config.outputFormat]}

Guidelines:
1. Search each source for relevant news within the date range
2. Focus on developments in HTA (Health Technology Assessment), HEOR (Health Economics and Outcomes Research), and market access
3. Highlight regulatory changes, pricing decisions, and reimbursement updates
4. Include relevant clinical trial results and drug approvals
5. Note any significant partnerships, acquisitions, or strategic moves
6. Provide context and implications for each major development
7. Use professional, clear language suitable for pharmaceutical and biotech executives

Please search the provided sources and generate the newsletter content.`
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