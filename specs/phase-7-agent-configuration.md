# Phase 7: Agent Configuration Updates

## Overview
Implement automatic Claude Code sub-agent configuration updates when news sources change, enabling real-time synchronization between the application and the AI agent.

## Completed Features

### 1. Agent Configuration System (`/lib/agent-manager.ts`)
- **Configuration Generation**:
  - Dynamically generate agent config from active sources
  - Include source metadata (importance, screening requirements)
  - Generate specialized prompts for healthcare/pharma domain

- **Automatic Updates**:
  - Trigger on source add/edit/delete
  - Save configuration to filesystem
  - Version control for configurations

### 2. API Integration
- **Source Management Hooks**:
  - POST /api/sources - Creates source and updates agent
  - PUT /api/sources/[id] - Updates source and agent
  - DELETE /api/sources/[id] - Removes source and updates agent

- **Manual Update Endpoint**:
  - POST /api/sources/update-agent - Force agent reconfiguration
  - GET /api/agent-config - Retrieve current configuration

### 3. Agent Configuration Viewer (`/agent-config`)
- Visual interface for agent configuration
- Display active sources and capabilities
- Download configuration as JSON
- Manual update trigger button

### 4. Environment Configuration
- Claude API settings in .env.sample
- Agent webhook configuration
- Auto-update toggles

## Technical Implementation

### Configuration Structure
```typescript
interface AgentConfig {
  name: string
  version: string
  description: string
  prompt_template: string
  sources: NewsSource[]
  capabilities: string[]
  parameters: {
    temperature: number
    max_tokens: number
    model: string
  }
  created_at: string
  updated_at: string
}
```

### Automatic Update Flow
1. User modifies news source (add/edit/delete)
2. API endpoint processes database change
3. `updateAgentOnSourceChange()` triggered
4. New configuration generated from active sources
5. Configuration saved to `agent-configs/latest.json`
6. Webhook notification sent (production)
7. Agent redeployed with new sources

### File System Structure
```
agent-configs/
├── latest.json                    # Current active configuration
└── agent-config-[timestamp].json  # Historical configurations
```

## Integration Points

### With Newsletter Generation
- Agent uses updated source list for content aggregation
- Prompt template optimized for configured sources
- Importance levels guide content prioritization

### With Source Management
- Every source change triggers reconfiguration
- Bulk import updates agent once after all imports
- Inactive sources excluded from agent

### With Refinement System
- Agent configuration includes refinement capabilities
- User feedback incorporated into prompt templates
- Section-specific refinement instructions

## Production Deployment

### Claude Code Integration
```javascript
// Production implementation would include:
async function deployAgentToClaudeCode(config) {
  const response = await fetch(process.env.CLAUDE_AGENT_ENDPOINT, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${process.env.CLAUDE_API_KEY}`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({
      agent_name: config.name,
      configuration: config,
      deploy: true
    })
  })

  return response.json()
}
```

### Webhook Notifications
- Notify external systems of configuration changes
- Track deployment status
- Handle rollback if deployment fails

## Success Criteria
✅ Agent configuration automatically generated from sources
✅ Configuration updates on source changes
✅ Visual interface for viewing configuration
✅ Configuration files saved to filesystem
✅ Environment variables configured
✅ Manual update capability available
✅ Source metadata included in configuration

## Future Enhancements
- Real Claude API integration
- Configuration versioning and rollback
- A/B testing different configurations
- Performance metrics tracking
- Source quality scoring
- Dynamic prompt optimization based on results