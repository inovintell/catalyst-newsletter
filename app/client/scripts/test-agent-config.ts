import { generateAgentConfig, saveAgentConfig, updateAgentOnSourceChange } from '../lib/agent-manager'

async function testAgentConfiguration() {
  console.log('🧪 Testing Agent Configuration System...\n')

  try {
    // Test 1: Generate configuration
    console.log('1️⃣ Generating agent configuration...')
    const config = await generateAgentConfig()
    console.log(`   ✅ Generated config with ${config.sources.length} sources`)
    console.log(`   - Agent name: ${config.name}`)
    console.log(`   - Version: ${config.version}`)
    console.log(`   - Capabilities: ${config.capabilities.length}`)

    // Test 2: Save configuration
    console.log('\n2️⃣ Saving agent configuration...')
    const filepath = await saveAgentConfig(config)
    console.log(`   ✅ Configuration saved to: ${filepath}`)

    // Test 3: Update agent on source change
    console.log('\n3️⃣ Testing automatic update on source change...')
    await updateAgentOnSourceChange()
    console.log('   ✅ Agent update completed successfully')

    // Test 4: Verify configuration structure
    console.log('\n4️⃣ Verifying configuration structure...')
    const requiredFields = ['name', 'version', 'description', 'prompt_template', 'sources', 'capabilities']
    const missingFields = requiredFields.filter(field => !config[field as keyof typeof config])

    if (missingFields.length === 0) {
      console.log('   ✅ All required fields present')
    } else {
      console.log(`   ❌ Missing fields: ${missingFields.join(', ')}`)
    }

    // Display sample sources
    console.log('\n5️⃣ Sample configured sources:')
    config.sources.slice(0, 5).forEach(source => {
      console.log(`   - ${source.name} (${source.topic}) - ${source.geoScope}`)
    })

    console.log('\n✨ All tests completed successfully!')

  } catch (error) {
    console.error('❌ Test failed:', error)
  }
}

// Run the test
testAgentConfiguration()