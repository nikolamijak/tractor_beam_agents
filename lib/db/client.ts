/**
 * Database client using Knex.js
 * Provides query builder and plain SQL execution
 */

import knex, { Knex } from 'knex';
import knexConfig from '@/knexfile';

const environment = process.env.NODE_ENV || 'development';
const config = knexConfig[environment];

// Create Knex instance (singleton)
export const db: Knex = knex(config);

// Helper function to test database connection
export async function testConnection(): Promise<boolean> {
  try {
    await db.raw('SELECT 1');
    console.log('✅ Database connection successful');
    return true;
  } catch (error) {
    console.error('❌ Database connection failed:', error);
    return false;
  }
}

// Execute raw SQL query
export async function query<T = any>(
  sql: string,
  bindings: knex.Knex.RawBinding
): Promise<T[]> {
  const result = await db.raw(sql, bindings);
  return result.rows;
}

// Execute raw SQL query and return first row
export async function queryOne<T = any>(
  sql: string,
  bindings: knex.Knex.RawBinding
): Promise<T | null> {
  const rows = await query<T>(sql, bindings);
  return rows.length > 0 ? rows[0] : null;
}

// Transaction helper
export async function transaction<T>(
  callback: (trx: Knex.Transaction) => Promise<T>
): Promise<T> {
  return await db.transaction(callback);
}

// Graceful shutdown
export async function closeConnection(): Promise<void> {
  await db.destroy();
  console.log('✅ Database connection closed');
}
