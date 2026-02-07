import type { Knex } from 'knex';

/**
 * Migration: Add API key to providers
 *
 * This migration adds the ability to store API keys at the provider level,
 * allowing different providers (and thus different agents) to use different
 * API keys for separate billing and token tracking.
 *
 * Changes:
 * - Add api_key column to providers table (TEXT, nullable)
 * - Add api_key_encrypted column for future encryption support
 *
 * Security Note:
 * - In production, api_key should be encrypted at rest
 * - Consider using application-level encryption or database encryption
 * - API keys should never be exposed in GET responses (return masked version)
 */

export async function up(knex: Knex): Promise<void> {
  await knex.schema.alterTable('providers', (table) => {
    // Store API key (plain text for now, encrypt in production)
    table.text('api_key').nullable();

    // Future: encrypted version of API key
    table.text('api_key_encrypted').nullable();

    // Metadata for key rotation
    table.timestamp('api_key_last_rotated').nullable();
  });

  console.log('✅ Added api_key columns to providers table');
  console.log('⚠️  Security: Remember to encrypt API keys in production!');
}

export async function down(knex: Knex): Promise<void> {
  await knex.schema.alterTable('providers', (table) => {
    table.dropColumn('api_key');
    table.dropColumn('api_key_encrypted');
    table.dropColumn('api_key_last_rotated');
  });

  console.log('⚠️  Rolled back: Removed api_key columns from providers table');
}
