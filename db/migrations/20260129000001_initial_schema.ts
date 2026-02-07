import { Knex } from 'knex';

export async function up(knex: Knex): Promise<void> {
  // ============================================================================
  // Agent Definitions - 100% dynamic agent system
  // ============================================================================
  await knex.schema.createTable('agent_definitions', (table) => {
    table.uuid('id').primary().defaultTo(knex.raw('gen_random_uuid()'));
    table.string('agent_name', 100).notNullable().unique();
    table.string('display_name', 200).notNullable();
    table.text('description');
    table.string('category', 50).notNullable(); // 'workflow', 'innovation', 'utility', 'technology'
    table.string('technology', 50).nullable(); // NULL for core, 'dotnet', 'nodejs', 'python'
    table.text('system_prompt').notNullable(); // ★ Stored in DB, not code!
    table.string('model', 50).defaultTo('claude-sonnet-4');
    table.integer('max_tokens').defaultTo(4096);
    table.decimal('temperature', 3, 2).defaultTo(0.7);
    table.jsonb('tools').defaultTo('[]');
    table.jsonb('capabilities').defaultTo('{}');
    table.boolean('is_core').defaultTo(false);
    table.boolean('is_enabled').defaultTo(true);
    table.string('version', 20).defaultTo('1.0.0');
    table.timestamp('created_at').defaultTo(knex.fn.now());
    table.timestamp('updated_at').defaultTo(knex.fn.now());

    // Indexes
    table.index('category');
    table.index('technology');
    table.index('is_enabled');
  });

  // ============================================================================
  // Agent Health Monitoring
  // ============================================================================
  await knex.schema.createTable('agent_health', (table) => {
    table.increments('id').primary();
    table.uuid('agent_definition_id').notNullable()
      .references('id').inTable('agent_definitions').onDelete('CASCADE');
    table.string('status', 20).notNullable(); // 'healthy', 'degraded', 'down'
    table.timestamp('last_health_check').defaultTo(knex.fn.now());
    table.integer('response_time_ms');
    table.bigInteger('total_requests').defaultTo(0);
    table.bigInteger('failed_requests').defaultTo(0);
    table.bigInteger('total_tokens_used').defaultTo(0);
    table.text('error_message');
    table.jsonb('metadata').defaultTo('{}');

    // Indexes
    table.index('agent_definition_id');
    table.index('status');
  });

  // ============================================================================
  // Sessions - User sessions
  // ============================================================================
  await knex.schema.createTable('sessions', (table) => {
    table.uuid('id').primary().defaultTo(knex.raw('gen_random_uuid()'));
    table.string('user_id', 100).notNullable();
    table.string('technology', 50).nullable(); // Which tech stack user is working with
    table.jsonb('state').notNullable().defaultTo('{}');
    table.jsonb('context').notNullable().defaultTo('{}');
    table.timestamp('created_at').defaultTo(knex.fn.now());
    table.timestamp('updated_at').defaultTo(knex.fn.now());
    table.timestamp('expires_at');
    table.jsonb('metadata').defaultTo('{}');

    // Indexes
    table.index('user_id');
    table.index('technology');
    table.index('created_at');
  });

  // ============================================================================
  // Agent Messages - Conversation history
  // ============================================================================
  await knex.schema.createTable('agent_messages', (table) => {
    table.bigIncrements('id').primary();
    table.uuid('session_id').notNullable()
      .references('id').inTable('sessions').onDelete('CASCADE');
    table.uuid('agent_definition_id').notNullable()
      .references('id').inTable('agent_definitions');
    table.string('role', 20).notNullable(); // 'user', 'assistant', 'system'
    table.text('content').notNullable();
    table.integer('tokens_used').defaultTo(0);
    table.string('model', 50);
    table.jsonb('metadata').defaultTo('{}');
    table.timestamp('created_at').defaultTo(knex.fn.now());

    // Indexes
    table.index('session_id');
    table.index('agent_definition_id');
    table.index('created_at');
  });

  // ============================================================================
  // Stories - For traceability (ACF-### format)
  // ============================================================================
  await knex.schema.createTable('stories', (table) => {
    table.uuid('id').primary().defaultTo(knex.raw('gen_random_uuid()'));
    table.string('story_id', 20).notNullable().unique(); // ACF-001, ACF-002, etc.
    table.string('title', 500).notNullable();
    table.text('description');
    table.text('acceptance_criteria');
    table.string('epic', 200);
    table.string('priority', 20);
    table.string('status', 50).defaultTo('backlog');
    table.string('technology', 50).nullable();
    table.timestamp('created_at').defaultTo(knex.fn.now());
    table.timestamp('updated_at').defaultTo(knex.fn.now());
    table.jsonb('metadata').defaultTo('{}');

    // Indexes
    table.index('story_id');
    table.index('status');
    table.index('technology');
  });

  // ============================================================================
  // Artifacts - Generated code, configs, documents
  // ============================================================================
  await knex.schema.createTable('artifacts', (table) => {
    table.uuid('id').primary().defaultTo(knex.raw('gen_random_uuid()'));
    table.uuid('session_id').nullable()
      .references('id').inTable('sessions');
    table.uuid('story_id').nullable()
      .references('id').inTable('stories');
    table.string('artifact_type', 100).notNullable(); // 'code', 'test', 'config', 'document'
    table.string('path', 1000);
    table.text('content');
    table.string('content_type', 100);
    table.bigInteger('size_bytes');
    table.uuid('created_by_agent')
      .references('id').inTable('agent_definitions');
    table.timestamp('created_at').defaultTo(knex.fn.now());
    table.jsonb('metadata').defaultTo('{}');

    // Indexes
    table.index('session_id');
    table.index('story_id');
    table.index('artifact_type');
    table.index('created_by_agent');
  });

  // ============================================================================
  // Technology Extensions - Plugin system
  // ============================================================================
  await knex.schema.createTable('technology_extensions', (table) => {
    table.uuid('id').primary().defaultTo(knex.raw('gen_random_uuid()'));
    table.string('technology_name', 50).notNullable().unique(); // 'dotnet', 'nodejs', 'python'
    table.string('display_name', 100).notNullable();
    table.string('version', 20).notNullable();
    table.boolean('is_active').defaultTo(true);
    table.integer('agent_count').defaultTo(0);
    table.timestamp('installation_date').defaultTo(knex.fn.now());
    table.jsonb('metadata').defaultTo('{}');

    // Indexes
    table.index('is_active');
  });
}

export async function down(knex: Knex): Promise<void> {
  // Drop tables in reverse order (respect foreign keys)
  await knex.schema.dropTableIfExists('technology_extensions');
  await knex.schema.dropTableIfExists('artifacts');
  await knex.schema.dropTableIfExists('stories');
  await knex.schema.dropTableIfExists('agent_messages');
  await knex.schema.dropTableIfExists('sessions');
  await knex.schema.dropTableIfExists('agent_health');
  await knex.schema.dropTableIfExists('agent_definitions');
}
