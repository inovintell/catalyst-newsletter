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

## Parallel Source Fetching Instructions

You have access to a specialized \`source-fetcher\` subagent designed for parallel news extraction. Follow these steps:

1. **Invoke Subagents in Parallel**:
   - For each source in the list above, invoke the \`source-fetcher\` subagent with these parameters:
     - \`source_name\`: The website name (e.g., "NICE", "EMA")
     - \`source_url\`: The link URL
     - \`topic\`: The topic from the source (e.g., "HTA Decisions")
     - \`geo_scope\`: The geographic scope (e.g., "UK", "EU")
     - \`start_date\`: ${config.dateRange.from}
     - \`end_date\`: ${config.dateRange.to}
     - \`comment\`: Any additional context from the source
   - CRITICAL: Invoke all subagents in parallel, NOT sequentially
   - Wait for all subagents to complete before proceeding

2. **Aggregate JSON Results**:
   - Each subagent returns a JSON object with structured news items
   - Parse all JSON responses from the subagents
   - Combine items from all sources into a unified collection
   - Handle partial failures gracefully (some subagents may fail while others succeed)

3. **Process and Format**:
   - Group items by category (HTA, HEOR, Regulatory, Market Access, Clinical, Other)
   - Within each category, sort by relevance_score (descending), then by date (most recent first)
   - For failed sources, note which sources could not be fetched and why
   - Transform the aggregated JSON data into the newsletter format specified above

4. **Newsletter Structure**:
   - Start with an executive summary highlighting the most important developments (top 3-5 items by relevance score)
   - Organize content by category or source as specified in the output format
   - For each news item, include:
     - Title with source attribution
     - Publication date
     - Summary and key points
     - Implications for market access and HTA
     - Relevant entities (drugs, companies, indications)
   - Use professional, clear language suitable for pharmaceutical and biotech executives
   - Preserve source URLs for verification

5. **Error Handling**:
   - If all subagents fail, report a comprehensive error explaining the issue
   - If some subagents fail, generate the newsletter from successful results and note failed sources
   - If a subagent returns empty results, acknowledge the source was checked but no relevant news was found

Focus on actionable intelligence, highlight urgent items with high relevance scores, and ensure the newsletter provides strategic value for market access teams.`
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