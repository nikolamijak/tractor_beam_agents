import { db } from '../lib/db/client';

async function verify() {
  try {
    const providers = await db('providers').count('* as count');
    const models = await db('models').count('* as count');
    const agents = await db('agent_definitions').count('* as count');
    const agentsWithModel = await db('agent_definitions')
      .whereNotNull('model_id')
      .count('* as count');

    console.log('\n📊 Database Seed Verification:\n');
    console.log('✅ Providers:', providers[0].count);
    console.log('✅ Models:', models[0].count);
    console.log('✅ Agents:', agents[0].count);
    console.log('✅ Agents with model_id:', agentsWithModel[0].count);

    // Show provider and model details
    const providerDetails = await db('providers').select('provider_name', 'display_name', 'is_default');
    console.log('\n📦 Providers:');
    providerDetails.forEach((p) => {
      console.log(`  - ${p.display_name} (${p.provider_name})${p.is_default ? ' [DEFAULT]' : ''}`);
    });

    const modelDetails = await db('models')
      .select('model_name', 'display_name', 'is_recommended')
      .orderBy('model_name');
    console.log('\n🤖 Models:');
    modelDetails.forEach((m) => {
      console.log(`  - ${m.display_name} (${m.model_name})${m.is_recommended ? ' [RECOMMENDED]' : ''}`);
    });

    console.log('\n✨ Seed verification complete!\n');
  } catch (error) {
    console.error('❌ Error:', error);
  } finally {
    await db.destroy();
  }
}

verify();
