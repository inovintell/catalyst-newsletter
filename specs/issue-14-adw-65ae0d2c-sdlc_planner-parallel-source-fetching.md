# Feature: Parallel Source Fetching with Claude Agent SDK Subagents

## Metadata
issue_number: `14`
adw_id: `65ae0d2c`
issue_json: `{"number":14,"title":"Parallel Source Fetching with Claude Agent SDK Subagents","body":"# Parallel Source Fetching with Claude Agent SDK Subagents\n\n## Overview\n\nIntegrate Claude Agent SDK's programmatic subagent feature to enable parallel fetching of newsletter sources. The main orchestrator agent will spawn multiple `source-fetcher` subagents (one per source) that run concurrently.\n\n## Architecture\n\n```\nMain Agent (orchestrator)\n  ↓ spawns via agents config\n  ├─→ source-fetcher subagent (NICE)    ─┐\n  ├─→ source-fetcher subagent (EMA)     ─┤ Run in parallel\n  └─→ source-fetcher subagent (ISPOR)   ─┘\n        ↓ return JSON results\n  ← aggregates & formats newsletter\n```\n\n## Agent SDK Primitive: `agents` Configuration\n\nThe SDK's `query()` function accepts an `agents` parameter for defining subagents:\n\n```typescript\nconst result = query({\n  prompt: \"Main orchestrator prompt\",\n  options: {\n    agents: {\n      'source-fetcher': {\n        description: 'Fetches news from a single source within date range',\n        prompt: 'Subagent system prompt...',\n        tools: ['WebSearch', 'WebFetch'],\n        model: 'sonnet'\n      }\n    }\n  }\n})\n```\n## Source fetcher subagent\n```xml\n<definition>\n---\nname: source-fetcher\ndescription: Use for fetching news from a single specific source within a date range. Specialist for extracting structured health technology assessment and regulatory news data from individual sources.\ntools: WebSearch, WebFetch\nmodel: sonnet\ncolor: cyan\n---\n\n# Purpose\n\nYou are a specialized news fetcher agent designed to extract structured health technology assessment and regulatory news from a single specific source. You operate as part of a parallel processing system where multiple instances of you may be running simultaneously, each handling a different source.\n\n## Instructions\n\nWhen invoked, you must follow these steps:\n\n1. **Parse Input Parameters** from the user's prompt:\n   - `source_name`: Name of the news source (e.g., \"NICE\", \"EMA\")\n   - `source_url`: Base URL to fetch from\n   - `topic`: Topic focus (e.g., \"HTA Decisions\", \"Drug Approvals\")\n   - `geo_scope`: Geographic scope (e.g., \"UK\", \"EU\", \"Global\")\n   - `start_date`: Beginning of date range (YYYY-MM-DD format)\n   - `end_date`: End of date range (YYYY-MM-DD format)\n   - `comment`: Optional additional context about the source\n\n2. **Execute Site-Specific Search**:\n   - Construct WebSearch query: `site:{source_url} after:{start_date} before:{end_date}`\n   - Add relevant keywords based on topic: HTA, HEOR, reimbursement, pricing, market access, approval, guidance, recommendation, assessment\n   - Focus on news, announcements, and decision pages\n\n3. **Apply Strict Date Filtering**:\n   - CRITICAL: Only include items with publication dates within the specified range\n   - Parse dates from search results and content\n   - Reject any item with a date outside [start_date, end_date]\n   - If date is ambiguous, flag with `date_uncertain: true` but include if likely within range\n\n4. **Fetch Detailed Content**:\n   - For each search result passing date filter (up to 20 most relevant):\n   - Use WebFetch to retrieve full page content\n   - Extract: title, publication date, summary, key decisions, implications\n\n5. **Extract Structured Information**:\n   - **Title**: Official headline or decision name\n   - **Date**: Publication/announcement date (YYYY-MM-DD)\n   - **URL**: Direct link to the source\n   - **Summary**: 2-3 sentence overview\n   - **Category**: Classify as one of: HTA, HEOR, Regulatory, Market Access, Clinical, Other\n   - **Relevance Score**: Rate 0-10 based on:\n     - Direct topic match (5 points)\n     - Decision/guidance vs news mention (3 points)\n     - Geographic relevance (2 points)\n   - **Key Points**: List 3-5 bullet points of main takeaways\n   - **Implications**: Brief statement on market/patient impact\n   - **Entities**: Extract drug names, company names, therapeutic areas, indications\n\n6. **Score and Categorize**:\n   - Relevance scoring rubric:\n     - 9-10: Direct HTA/regulatory decision matching topic and geography\n     - 7-8: Related guidance or significant update in scope\n     - 5-6: Relevant news or announcement with indirect impact\n     - 3-4: Peripheral mention or broader industry news\n     - 0-2: Minimal relevance, include only if nothing better found\n\n7. **Handle Errors Gracefully**:\n   - If source unreachable: Set `status: \"failed\"` with error details\n   - If partial content retrieved: Set `status: \"partial\"`\n   - Always return valid JSON structure even on complete failure\n\n**Best Practices:**\n- Prioritize official announcements and decisions over news coverage\n- Extract specific drug names, not just therapeutic areas\n- Identify both positive and negative decisions\n- Flag items requiring urgent attention with high relevance scores\n- Be conservative with date filtering - when in doubt, exclude\n- Preserve original source URLs for verification\n- Focus on actionable intelligence for market access teams\n\n## Report / Response\n\nReturn your findings as a single JSON object with this exact structure:\n\n{\n  \"source\": {\n    \"name\": \"<source_name>\",\n    \"url\": \"<source_url>\",\n    \"topic\": \"<topic>\",\n    \"geo_scope\": \"<geo_scope>\"\n  },\n  \"date_range\": {\n    \"start\": \"<start_date>\",\n    \"end\": \"<end_date>\"\n  },\n  \"fetch_timestamp\": \"<ISO-8601 timestamp>\",\n  \"status\": \"success|partial|failed\",\n  \"items_found\": <number>,\n  \"items\": [\n    {\n      \"title\": \"<article title>\",\n      \"date\": \"<YYYY-MM-DD>\",\n      \"date_uncertain\": <true|false>,\n      \"url\": \"<direct URL>\",\n      \"summary\": \"<2-3 sentence summary>\",\n      \"category\": \"HTA|HEOR|Regulatory|Market Access|Clinical|Other\",\n      \"relevance_score\": <0-10>,\n      \"key_points\": [\n        \"<key point 1>\",\n        \"<key point 2>\",\n        \"<key point 3>\"\n      ],\n      \"implications\": \"<market/patient impact statement>\",\n      \"entities\": {\n        \"drugs\": [\"<drug name 1>\", \"<drug name 2>\"],\n        \"companies\": [\"<company 1>\", \"<company 2>\"],\n        \"indications\": [\"<indication 1>\", \"<indication 2>\"]\n      }\n    }\n  ],\n  \"errors\": [\"<error message if any>\"]\n}\n\nSort items by relevance_score (descending), then by date (most recent first). Include a maximum of 20 items, focusing on the most relevant content within the date range.\n```\n</definition>\n\n## Expected Behavior\n\n### Parallel Execution\n\nThe SDK will:\n1. Parse the main prompt\n2. Recognize multiple source-fetcher invocations\n3. Spawn subagent instances concurrently (one per source)\n4. Each subagent runs independently with its own context\n5. Main agent receives all results when subagents complete\n6. Main agent aggregates and formats the newsletter\n\n### Performance\n\n**Sequential (without subagents)**:\n```\nSource 1: 15s\nSource 2: 15s\nSource 3: 15s\nTotal: 45s\n```\n\n**Parallel (with subagents)**:\n```\nAll sources: 15s (longest source)\nAggregation: 2s\nTotal: 17s (~2.6x faster)\n```\n\n### Error Handling\n\n- If one subagent fails: Others continue, partial results returned\n- If all subagents fail: Main agent reports comprehensive error\n- Each subagent returns status in JSON (success/partial/failed)\n\n## Files to Modify\n\n1. **`app/client/lib/claude-agent.ts`**\n   - Add `SOURCE_FETCHER_SUBAGENT` definition\n   - Add `agents` config to `queryNewsletterAgent()`\n   - Add `agents` config to `streamNewsletterAgent()`\n\n2. **`app/client/lib/agent-config.ts`**\n   - Update `generateAgentPrompt()` with subagent invocation instructions\n   - Update prompt to emphasize parallel invocation\n\n## Summary\n\n**The primitive**: Agent SDK's `agents` parameter in `query()` options\n\n**Implementation**:\n1. Define `SOURCE_FETCHER_SUBAGENT` object\n2. Add to `agents` config in `queryNewsletterAgent()`\n3. Update prompts to invoke subagents for each source\n4. SDK handles parallel execution automatically\n\n**Result**: True concurrent subagent execution with isolated contexts, no CLI needed.\n"}`

## Feature Description
This feature integrates the Claude Agent SDK's programmatic subagent capability to enable parallel, concurrent fetching of newsletter content from multiple sources. Instead of the main orchestrator agent sequentially processing each news source one-by-one, it will spawn dedicated `source-fetcher` subagents that run simultaneously. Each subagent specializes in extracting structured HTA/HEOR news from a single source, returning standardized JSON results. The main agent then aggregates these parallel results and formats the final newsletter. This architectural change will reduce newsletter generation time from ~45s (sequential) to ~17s (parallel) for 3 sources - a 2.6x performance improvement.

## User Story
As a newsletter administrator
I want the system to fetch news from multiple sources simultaneously using parallel subagents
So that newsletter generation completes significantly faster and users receive time-sensitive HTA/market access intelligence more quickly

## Problem Statement
Currently, the newsletter generation process fetches content from news sources sequentially. When processing multiple sources (e.g., NICE, EMA, ISPOR, G-BA), each source must wait for the previous one to complete before starting. This creates a bottleneck where total generation time equals the sum of all individual source fetch times. For time-sensitive HTA and regulatory intelligence, this delay reduces the value proposition of the newsletter service.

## Solution Statement
Leverage the Claude Agent SDK's `agents` configuration parameter to define a specialized `source-fetcher` subagent. The main orchestrator agent will be updated to invoke multiple instances of this subagent in parallel - one per configured news source. The SDK handles concurrent execution automatically, allowing all sources to be fetched simultaneously. Each subagent returns structured JSON results that the main agent aggregates and formats into the final newsletter. This solution requires minimal code changes (defining the subagent config and updating the orchestrator prompt) while delivering significant performance gains.

## Relevant Files
Use these files to implement the feature:

- **app/client/lib/claude-agent.ts** (lines 1-352)
  - Contains `queryNewsletterAgent()` and `streamNewsletterAgent()` functions that interface with Claude Agent SDK
  - Currently defines `systemPrompt` but no subagent configuration
  - Need to add `SOURCE_FETCHER_SUBAGENT` constant definition
  - Need to add `agents` property to `options` parameter in both `query()` calls

- **app/client/lib/agent-config.ts** (lines 1-98)
  - Contains `generateAgentPrompt()` that constructs the orchestrator prompt
  - Currently instructs agent to "search each source" without specifying parallel invocation
  - Need to update prompt to explicitly instruct parallel subagent invocation
  - Need to add instructions for aggregating JSON results from subagents

- **app/client/api/generate/stream/route.ts** (lines 1-433)
  - Server-side route that calls `streamNewsletterAgent()` with generated prompt
  - Currently builds source list and prompt (lines 205-261) that gets passed to agent
  - No changes needed to this file, but it will benefit from updated agent behavior

- **README.md** (lines 1-407)
  - Documents current tech stack including "Claude Agent SDK"
  - Should be updated to document the parallel subagent architecture in Phase 10 or new phase

### New Files

- **.claude/commands/e2e/test_parallel_source_fetching.md**
  - E2E test to validate parallel source fetching behavior
  - Will verify multiple sources are processed and newsletter is generated successfully
  - Will check performance improvement indicators (if measurable via UI)
  - Will validate error handling when individual subagents fail

## Implementation Plan

### Phase 1: Foundation
Define the `source-fetcher` subagent configuration object as a constant in `app/client/lib/claude-agent.ts`. This subagent will encapsulate all logic for fetching news from a single source, including date filtering, content extraction, relevance scoring, and structured JSON output. The subagent definition includes the system prompt (detailed instructions), tool permissions (WebSearch, WebFetch), and model selection.

### Phase 2: Core Implementation
Integrate the subagent into both `queryNewsletterAgent()` and `streamNewsletterAgent()` functions by adding the `agents` configuration to the SDK `query()` options. Update the orchestrator system prompt in `generateAgentPrompt()` to instruct the main agent to invoke the `source-fetcher` subagent once per news source, passing source-specific parameters. The orchestrator will aggregate the JSON results and format the newsletter.

### Phase 3: Integration
Update the main orchestrator prompt to provide clear instructions for:
- Invoking subagents in parallel (not sequentially)
- Passing correct parameters to each subagent (source name, URL, topic, geo scope, date range)
- Handling partial failures gracefully (some subagents succeed, others fail)
- Aggregating JSON results into cohesive newsletter sections
- Preserving source attribution and relevance scoring in the final output

## Step by Step Tasks
IMPORTANT: Execute every step in order, top to bottom.

### Step 1: Define SOURCE_FETCHER_SUBAGENT constant
- Create a new constant `SOURCE_FETCHER_SUBAGENT` in `app/client/lib/claude-agent.ts` after the imports and before the interface definitions
- Define the subagent configuration object with:
  - `description`: "Use for fetching news from a single specific source within a date range. Specialist for extracting structured health technology assessment and regulatory news data from individual sources."
  - `prompt`: Full system prompt from the issue specification (instructions, parameter parsing, search execution, date filtering, content extraction, JSON output format)
  - `tools`: Array containing `['WebSearch', 'WebFetch']`
  - `model`: `'sonnet'` for cost-effectiveness
- Export the constant for potential reuse

### Step 2: Update generateAgentPrompt() to invoke subagents
- Modify `app/client/lib/agent-config.ts` function `generateAgentPrompt()`
- Replace the current "search each source" instruction with explicit subagent invocation guidance
- Add section instructing the main agent to:
  - Invoke the `source-fetcher` subagent once per source in the sources list
  - Pass parameters: `source_name`, `source_url`, `topic`, `geo_scope`, `start_date`, `end_date`, `comment`
  - Execute subagent invocations in parallel, not sequentially
  - Wait for all subagents to complete before aggregating results
- Add section on aggregation:
  - Parse JSON results from each subagent
  - Group items by category (HTA, Regulatory, Market Access, etc.)
  - Sort by relevance score within each category
  - Handle partial failures (some subagents return errors)
  - Format aggregated results into newsletter sections
- Update the output format instructions to clarify that the main agent receives JSON from subagents and should transform it into the markdown newsletter format

### Step 3: Integrate subagent into queryNewsletterAgent()
- In `app/client/lib/claude-agent.ts`, locate the `queryNewsletterAgent()` function
- Add `agents` property to the `options` object passed to `query()` (after `allowedTools`, before `permissionMode`)
- Set `agents` to an object with a single key `'source-fetcher'` mapped to the `SOURCE_FETCHER_SUBAGENT` constant
- Verify the agent invocation will now have access to the subagent definition

### Step 4: Integrate subagent into streamNewsletterAgent()
- In `app/client/lib/claude-agent.ts`, locate the `streamNewsletterAgent()` function
- Add the same `agents` configuration as in Step 3 to the `options` object in the `query()` call (around line 182)
- Ensure consistency between streaming and non-streaming agent configurations

### Step 5: Create E2E test file for parallel source fetching
- Create new file `.claude/commands/e2e/test_parallel_source_fetching.md`
- Follow the structure from `.claude/commands/e2e/test_excel_import.md` as a template
- Define User Story: "As a newsletter administrator, I want sources to be fetched in parallel, so that newsletter generation is faster"
- Create test steps:
  1. Navigate to dashboard, select 3+ active sources with different topics
  2. Configure date range (last 7 days)
  3. Click "Generate Newsletter" and start streaming generation
  4. Take screenshot of generation progress
  5. Verify newsletter generates successfully
  6. Verify output includes content from all selected sources
  7. Verify no errors in browser console or server logs
  8. Take screenshot of completed newsletter
- Add validation criteria: newsletter contains sections from all sources, generation completes without errors
- Note: Measuring actual parallel performance (timing) may not be feasible in E2E test, but functional correctness is the priority

### Step 6: Run validation commands
- Execute all commands in the "Validation Commands" section below to ensure:
  - TypeScript compilation succeeds with no type errors
  - No linting errors introduced
  - Server tests pass (pytest)
  - E2E test validates parallel source fetching functionality
  - Application builds successfully for production

## Testing Strategy

### Unit Tests
Since this is a prompt engineering and configuration change rather than complex business logic:
- No new unit tests required for the subagent definition itself (it's a configuration object)
- Verify existing tests in `tests/` directory continue to pass
- If agent invocation is mocked in existing tests, verify mocks are compatible with the new `agents` parameter

### Integration Tests
- Manual testing of newsletter generation with 2-3 sources to verify:
  - Subagents are invoked (visible in Claude API logs if logging is enabled)
  - JSON results are correctly aggregated
  - Newsletter output includes content from all sources
  - Partial failures are handled gracefully (manually disable one source URL to simulate failure)
- Verify streaming behavior still works correctly with updated agent configuration

### Edge Cases
1. **Single source selected**: Subagent invocation still works correctly for a single source
2. **All subagents fail**: Main agent returns meaningful error message explaining that no sources could be fetched
3. **Partial failure**: Some subagents succeed, others fail - main agent generates newsletter from successful results and notes failed sources
4. **Empty results from subagent**: Subagent returns zero items - main agent handles gracefully without crashing
5. **Invalid JSON from subagent**: Main agent handles malformed JSON responses from subagents
6. **Date range with no results**: All subagents return zero items within date range - main agent generates empty newsletter or informative message

## Acceptance Criteria
- [ ] `SOURCE_FETCHER_SUBAGENT` constant is defined in `app/client/lib/claude-agent.ts` with complete system prompt and configuration
- [ ] `queryNewsletterAgent()` includes `agents` configuration in SDK `query()` options
- [ ] `streamNewsletterAgent()` includes `agents` configuration in SDK `query()` options
- [ ] `generateAgentPrompt()` instructs the main agent to invoke `source-fetcher` subagents in parallel
- [ ] `generateAgentPrompt()` provides clear instructions for aggregating JSON results from subagents
- [ ] TypeScript compilation succeeds with no errors (`npm run build` or equivalent)
- [ ] Server tests pass (`cd tests && uv run pytest`)
- [ ] E2E test validates newsletter generation with multiple sources completes successfully
- [ ] Generated newsletter includes content from all selected sources
- [ ] No errors in server logs or browser console during newsletter generation
- [ ] Partial failures (one subagent fails) are handled gracefully without breaking the entire generation
- [ ] Documentation updated in README.md or relevant docs to mention parallel subagent architecture

## Validation Commands
Execute every command to validate the feature works correctly with zero regressions.

- `npm run type-check` - Verify TypeScript compilation succeeds
- `npm run lint` - Verify no linting errors introduced
- `cd tests && uv run pytest` - Run server tests to validate the feature works with zero regressions
- Read `.claude/commands/test_e2e.md`, then read and execute `.claude/commands/e2e/test_parallel_source_fetching.md` to validate parallel source fetching functionality
- `npm run build` - Verify production build succeeds
- Manual validation: Generate a newsletter with 3+ sources and verify output includes content from all sources

## Notes
- **Performance measurement**: While the issue states expected 2.6x speedup, actual performance depends on source response times and Claude API latency. The architectural change enables parallelization; actual speedup may vary.
- **Token usage**: Parallel subagent execution may increase concurrent token usage. Monitor Claude API costs and rate limits during testing.
- **Error context**: When a subagent fails, the main agent should preserve error details (source name, error message) to help users understand which sources couldn't be fetched.
- **Future optimization**: Consider adding a timeout parameter to subagents to prevent slow sources from blocking the entire generation.
- **Model selection**: Subagents use `'sonnet'` model for cost-effectiveness. This can be adjusted if extraction quality is insufficient.
- **Logging and observability**: The existing Langfuse tracing should capture subagent invocations. Verify traces show parallel execution structure.
- **SDK version compatibility**: Ensure Claude Agent SDK version supports the `agents` parameter. Check package.json and SDK documentation if issues arise.
