import type { Knex } from 'knex';

export async function up(knex: Knex): Promise<void> {
  // 1. Create providers table
  await knex.schema.createTable('providers', (table) => {
    table.uuid('id').primary().defaultTo(knex.raw('gen_random_uuid()'));
    table.string('provider_name', 100).notNullable().unique();
    table.string('display_name', 200).notNullable();
    table.string('provider_type', 50).notNullable(); // 'api', 'self_hosted', 'cloud'
    table.text('api_base_url');
    table.string('auth_type', 50); // 'api_key', 'oauth', 'service_account'
    table.boolean('is_active').notNullable().defaultTo(true);
    table.boolean('is_default').notNullable().defaultTo(false);
    table.boolean('supports_streaming').notNullable().defaultTo(false);
    table.boolean('supports_function_calling').notNullable().defaultTo(false);
    table.boolean('supports_vision').notNullable().defaultTo(false);
    table.jsonb('configuration').defaultTo('{}');
    table.jsonb('metadata').defaultTo('{}');
    table.timestamps(true, true);

    // Indexes
    table.index('is_active');
    table.index('is_default');
  });

  // 2. Create models table
  await knex.schema.createTable('models', (table) => {
    table.uuid('id').primary().defaultTo(knex.raw('gen_random_uuid()'));
    table.uuid('provider_id').notNullable().references('id').inTable('providers').onDelete('CASCADE');
    table.string('model_name', 200).notNullable();
    table.string('display_name', 200).notNullable();
    table.text('description');
    table.string('model_family', 100);
    table.boolean('is_active').notNullable().defaultTo(true);
    table.boolean('is_recommended').notNullable().defaultTo(false);
    table.jsonb('capabilities').defaultTo('{}');
    table.integer('max_tokens'); // max output tokens
    table.integer('context_window'); // max input + output
    table.boolean('supports_streaming').notNullable().defaultTo(false);
    table.boolean('supports_function_calling').notNullable().defaultTo(false);
    table.boolean('supports_vision').notNullable().defaultTo(false);
    table.boolean('supports_prompt_caching').notNullable().defaultTo(false);
    table.jsonb('pricing').notNullable().defaultTo('{}');
    table.string('performance_tier', 50); // 'fast', 'balanced', 'powerful'
    table.integer('avg_latency_ms');
    table.date('release_date');
    table.date('deprecation_date');
    table.jsonb('metadata').defaultTo('{}');
    table.timestamps(true, true);

    // Unique constraint
    table.unique(['provider_id', 'model_name']);

    // Indexes
    table.index('provider_id');
    table.index('is_active');
    table.index('is_recommended');
    table.index('model_family');
  });

  // 3. Add new columns to agent_definitions
  await knex.schema.alterTable('agent_definitions', (table) => {
    table.uuid('model_id').references('id').inTable('models').onDelete('SET NULL');
    table.string('model_legacy', 200); // backup of old model string

    table.index('model_id');
  });

  // Backup existing model values to model_legacy
  await knex.raw(`
    UPDATE agent_definitions
    SET model_legacy = model
    WHERE model IS NOT NULL
  `);

  // 4. Add new token columns to agent_messages
  await knex.schema.alterTable('agent_messages', (table) => {
    table.integer('input_tokens').notNullable().defaultTo(0);
    table.integer('output_tokens').notNullable().defaultTo(0);
    table.integer('cache_creation_tokens').notNullable().defaultTo(0);
    table.integer('cache_read_tokens').notNullable().defaultTo(0);
    table.integer('extended_thinking_tokens').notNullable().defaultTo(0);
    table.decimal('total_cost_usd', 10, 6).notNullable().defaultTo(0);
    table.jsonb('pricing_snapshot').defaultTo('{}');

    table.index('total_cost_usd');
  });

  // 5. Add cost tracking columns to sessions
  await knex.schema.alterTable('sessions', (table) => {
    table.integer('total_messages').notNullable().defaultTo(0);
    table.bigInteger('total_input_tokens').notNullable().defaultTo(0);
    table.bigInteger('total_output_tokens').notNullable().defaultTo(0);
    table.bigInteger('total_cache_creation_tokens').notNullable().defaultTo(0);
    table.bigInteger('total_cache_read_tokens').notNullable().defaultTo(0);
    table.decimal('total_cost_usd', 10, 4).notNullable().defaultTo(0);

    table.index('total_cost_usd');
  });
}

export async function down(knex: Knex): Promise<void> {
  // Remove columns from sessions
  await knex.schema.alterTable('sessions', (table) => {
    table.dropColumn('total_messages');
    table.dropColumn('total_input_tokens');
    table.dropColumn('total_output_tokens');
    table.dropColumn('total_cache_creation_tokens');
    table.dropColumn('total_cache_read_tokens');
    table.dropColumn('total_cost_usd');
  });

  // Remove columns from agent_messages
  await knex.schema.alterTable('agent_messages', (table) => {
    table.dropColumn('input_tokens');
    table.dropColumn('output_tokens');
    table.dropColumn('cache_creation_tokens');
    table.dropColumn('cache_read_tokens');
    table.dropColumn('extended_thinking_tokens');
    table.dropColumn('total_cost_usd');
    table.dropColumn('pricing_snapshot');
  });

  // Remove columns from agent_definitions
  await knex.schema.alterTable('agent_definitions', (table) => {
    table.dropColumn('model_id');
    table.dropColumn('model_legacy');
  });

  // Drop tables
  await knex.schema.dropTableIfExists('models');
  await knex.schema.dropTableIfExists('providers');
}
