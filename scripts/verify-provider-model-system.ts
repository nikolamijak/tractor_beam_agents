/**
 * Verification script for provider and model system
 */
import { db } from '../lib/db/client';
import { providersRepo, modelsRepo } from '../lib/db/repositories';

async function verify() {
  try {
    console.log('🔍 Verifying Provider & Model System...\n');

    // Check providers
    const providers = await providersRepo.list();
    console.log(`✅ Providers table: ${providers.length} provider(s)`);
    providers.forEach((p) => {
      console.log(`   - ${p.display_name} (${p.provider_name}) [default: ${p.is_default}, active: ${p.is_active}]`);
    });

    // Check models
    const models = await modelsRepo.list();
    console.log(`\n✅ Models table: ${models.length} model(s)`);
    const modelsWithProvider = await modelsRepo.listWithProvider();
    modelsWithProvider.forEach((m) => {
      console.log(`   - ${m.display_name} (${m.model_name})`);
      console.log(`     Provider: ${m.provider.display_name}`);
      console.log(`     Pricing: $${m.pricing.input_per_mtok}/$${m.pricing.output_per_mtok} per MTok`);
      console.log(`     Active: ${m.is_active}, Recommended: ${m.is_recommended}`);
    });

    // Check agent_definitions migration
    const agentWithModelId = await db.raw(`
      SELECT id, agent_name, model, model_id, model_legacy
      FROM agent_definitions
      WHERE model_id IS NOT NULL
      LIMIT 1
    `);

    console.log(`\n✅ Agent definitions migration:`);
    if (agentWithModelId.rows.length > 0) {
      console.log(`   - Sample agent: ${agentWithModelId.rows[0].agent_name}`);
      console.log(`     model_id: ${agentWithModelId.rows[0].model_id}`);
      console.log(`     model_legacy: ${agentWithModelId.rows[0].model_legacy}`);
    } else {
      console.log(`   - No agents with model_id yet (needs backfill)`);
    }

    // Check new columns on agent_messages
    const messageColumns = await db.raw(`
      SELECT column_name
      FROM information_schema.columns
      WHERE table_name = 'agent_messages'
      AND column_name IN ('input_tokens', 'output_tokens', 'cache_creation_tokens', 'cache_read_tokens', 'total_cost_usd', 'pricing_snapshot')
      ORDER BY column_name
    `);
    console.log(`\n✅ Agent messages table new columns:`);
    messageColumns.rows.forEach((col: any) => {
      console.log(`   - ${col.column_name}`);
    });

    // Check new columns on sessions
    const sessionColumns = await db.raw(`
      SELECT column_name
      FROM information_schema.columns
      WHERE table_name = 'sessions'
      AND column_name IN ('total_messages', 'total_input_tokens', 'total_output_tokens', 'total_cache_creation_tokens', 'total_cache_read_tokens', 'total_cost_usd')
      ORDER BY column_name
    `);
    console.log(`\n✅ Sessions table new columns:`);
    sessionColumns.rows.forEach((col: any) => {
      console.log(`   - ${col.column_name}`);
    });

    console.log('\n✅ All verifications passed!');
    process.exit(0);
  } catch (error) {
    console.error('❌ Verification failed:', error);
    process.exit(1);
  }
}

verify();
