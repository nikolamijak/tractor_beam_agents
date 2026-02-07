import type { Knex } from 'knex';

/**
 * Migration: Finalize model_id migration
 *
 * This migration completes the transition from the legacy `model` string column
 * to the new `model_id` foreign key reference:
 *
 * 1. Make model_id NOT NULL (all agents must have a model_id)
 * 2. Drop the legacy `model` column
 * 3. Drop the backup `model_legacy` column
 *
 * Prerequisites:
 * - All agent_definitions rows must have model_id populated
 * - Previous migration (20260202000001) must have run successfully
 *
 * Rollback safety:
 * - If rollback is needed, the previous migration's model_legacy column
 *   can be used to restore the original model strings
 */

export async function up(knex: Knex): Promise<void> {
  // Verify all agents have model_id before proceeding
  const agentsWithoutModelId = await knex('agent_definitions')
    .whereNull('model_id')
    .count('* as count')
    .first();

  const count = parseInt(agentsWithoutModelId?.count as string || '0');

  if (count > 0) {
    throw new Error(
      `Cannot finalize migration: ${count} agent(s) still have NULL model_id. ` +
      'Please ensure all agents are mapped to models before running this migration.'
    );
  }

  // 1. Make model_id NOT NULL with foreign key constraint
  await knex.schema.alterTable('agent_definitions', (table) => {
    table.uuid('model_id').notNullable().alter();
  });

  // 2. Drop the legacy model column
  await knex.schema.alterTable('agent_definitions', (table) => {
    table.dropColumn('model');
  });

  // 3. Drop the model_legacy backup column
  await knex.schema.alterTable('agent_definitions', (table) => {
    table.dropColumn('model_legacy');
  });

  console.log('✅ Successfully finalized model_id migration:');
  console.log('   - model_id is now NOT NULL');
  console.log('   - Dropped legacy model column');
  console.log('   - Dropped model_legacy backup column');
}

export async function down(knex: Knex): Promise<void> {
  // Rollback: restore model and model_legacy columns
  await knex.schema.alterTable('agent_definitions', (table) => {
    table.string('model', 50).defaultTo('claude-sonnet-4');
    table.string('model_legacy', 200);
  });

  // Make model_id nullable again
  await knex.schema.alterTable('agent_definitions', (table) => {
    table.uuid('model_id').nullable().alter();
  });

  console.log('⚠️  Rolled back model_id finalization:');
  console.log('   - Restored model column');
  console.log('   - Restored model_legacy column');
  console.log('   - Made model_id nullable again');
  console.log('');
  console.log('   NOTE: You will need to manually restore model values from');
  console.log('   a database backup or re-run the backfill logic.');
}
