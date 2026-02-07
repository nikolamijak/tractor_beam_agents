/**
 * Database repositories for type-safe data access
 * Provides high-level methods for common database operations
 */

import { db } from './client';
import type {
  Provider,
  ProviderInsert,
  ProviderUpdate,
  Model,
  ModelInsert,
  ModelUpdate,
  ModelWithProvider,
  AgentDefinition,
  AgentDefinitionInsert,
  AgentDefinitionUpdate,
  AgentMessage,
  AgentMessageInsert,
  Session,
  SessionInsert,
  SessionUpdate,
  Story,
  StoryInsert,
  StoryUpdate,
  AgentHealth,
  AgentHealthInsert,
  AgentHealthUpdate,
} from './types';

// ============================================================================
// Providers Repository
// ============================================================================
export const providersRepo = {
  /**
   * List all providers with optional filters
   */
  async list(filters?: { isActive?: boolean }): Promise<Provider[]> {
    if (filters?.isActive !== undefined) {
      const result = await db.raw(
        `SELECT * FROM providers WHERE is_active = ? ORDER BY display_name ASC`,
        [filters.isActive]
      );
      return result.rows;
    }

    const result = await db.raw(`SELECT * FROM providers ORDER BY display_name ASC`);
    return result.rows;
  },

  /**
   * Find provider by ID
   */
  async findById(id: string): Promise<Provider | null> {
    const result = await db.raw(`SELECT * FROM providers WHERE id = ?`, [id]);
    return result.rows[0] || null;
  },

  /**
   * Find provider by name
   */
  async findByName(providerName: string): Promise<Provider | null> {
    const result = await db.raw(
      `SELECT * FROM providers WHERE provider_name = ?`,
      [providerName]
    );
    return result.rows[0] || null;
  },

  /**
   * Get default provider
   */
  async getDefault(): Promise<Provider | null> {
    const result = await db.raw(
      `SELECT * FROM providers WHERE is_default = true AND is_active = true LIMIT 1`
    );
    return result.rows[0] || null;
  },

  /**
   * Create new provider
   */
  async create(provider: ProviderInsert): Promise<Provider> {
    const result = await db.raw(
      `INSERT INTO providers (
        provider_name, display_name, provider_type, api_base_url, auth_type,
        is_active, is_default, supports_streaming, supports_function_calling,
        supports_vision, configuration, metadata
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?::jsonb, ?::jsonb)
      RETURNING *`,
      [
        provider.provider_name,
        provider.display_name,
        provider.provider_type,
        provider.api_base_url || null,
        provider.auth_type || null,
        provider.is_active,
        provider.is_default,
        provider.supports_streaming,
        provider.supports_function_calling,
        provider.supports_vision,
        JSON.stringify(provider.configuration),
        JSON.stringify(provider.metadata),
      ]
    );
    return result.rows[0];
  },

  /**
   * Update provider
   */
  async update(id: string, updates: ProviderUpdate): Promise<Provider | null> {
    const fields: string[] = [];
    const values: any[] = [];

    Object.entries(updates).forEach(([key, value]) => {
      if (key === 'updated_at') return; // Skip, we'll handle this separately
      if (key === 'configuration' || key === 'metadata') {
        fields.push(`${key} = ?::jsonb`);
        values.push(JSON.stringify(value));
      } else {
        fields.push(`${key} = ?`);
        values.push(value);
      }
    });

    fields.push(`updated_at = NOW()`);
    values.push(id);

    const result = await db.raw(
      `UPDATE providers SET ${fields.join(', ')} WHERE id = ? RETURNING *`,
      values
    );
    return result.rows[0] || null;
  },

  /**
   * Delete provider
   */
  async delete(id: string): Promise<boolean> {
    const result = await db.raw(`DELETE FROM providers WHERE id = ?`, [id]);
    return result.rowCount > 0;
  },

  /**
   * Set provider as default (unsets all others)
   */
  async setDefault(id: string): Promise<Provider | null> {
    return db.transaction(async (trx) => {
      await trx.raw(`UPDATE providers SET is_default = false`);
      const result = await trx.raw(
        `UPDATE providers SET is_default = true, updated_at = NOW() WHERE id = ? RETURNING *`,
        [id]
      );
      return result.rows[0] || null;
    });
  },
};

// ============================================================================
// Models Repository
// ============================================================================
export const modelsRepo = {
  /**
   * List models with optional filters
   */
  async list(filters?: {
    providerId?: string;
    isActive?: boolean;
    modelFamily?: string;
  }): Promise<Model[]> {
    const conditions: string[] = [];
    const values: any[] = [];

    if (filters?.providerId) {
      conditions.push(`provider_id = ?`);
      values.push(filters.providerId);
    }
    if (filters?.isActive !== undefined) {
      conditions.push(`is_active = ?`);
      values.push(filters.isActive);
    }
    if (filters?.modelFamily) {
      conditions.push(`model_family = ?`);
      values.push(filters.modelFamily);
    }

    const whereClause = conditions.length > 0 ? `WHERE ${conditions.join(' AND ')}` : '';
    const result = await db.raw(
      `SELECT * FROM models ${whereClause} ORDER BY display_name ASC`,
      values
    );
    return result.rows;
  },

  /**
   * List models with provider joined
   */
  async listWithProvider(filters?: {
    providerId?: string;
    isActive?: boolean;
    modelFamily?: string;
  }): Promise<ModelWithProvider[]> {
    const conditions: string[] = [];
    const values: any[] = [];

    if (filters?.providerId) {
      conditions.push(`m.provider_id = ?`);
      values.push(filters.providerId);
    }
    if (filters?.isActive !== undefined) {
      conditions.push(`m.is_active = ?`);
      values.push(filters.isActive);
    }
    if (filters?.modelFamily) {
      conditions.push(`m.model_family = ?`);
      values.push(filters.modelFamily);
    }

    const whereClause = conditions.length > 0 ? `WHERE ${conditions.join(' AND ')}` : '';
    const result = await db.raw(
      `SELECT m.*,
        jsonb_build_object(
          'id', p.id,
          'provider_name', p.provider_name,
          'display_name', p.display_name,
          'provider_type', p.provider_type,
          'api_base_url', p.api_base_url,
          'is_active', p.is_active,
          'supports_streaming', p.supports_streaming,
          'supports_function_calling', p.supports_function_calling,
          'supports_vision', p.supports_vision
        ) as provider
      FROM models m
      INNER JOIN providers p ON m.provider_id = p.id
      ${whereClause}
      ORDER BY m.display_name ASC`,
      values
    );
    return result.rows;
  },

  /**
   * Find model by ID
   */
  async findById(id: string): Promise<Model | null> {
    const result = await db.raw(`SELECT * FROM models WHERE id = ?`, [id]);
    return result.rows[0] || null;
  },

  /**
   * Find model by ID with provider joined
   */
  async findByIdWithProvider(id: string): Promise<ModelWithProvider | null> {
    const result = await db.raw(
      `SELECT m.*,
        jsonb_build_object(
          'id', p.id,
          'provider_name', p.provider_name,
          'display_name', p.display_name,
          'provider_type', p.provider_type,
          'api_base_url', p.api_base_url,
          'is_active', p.is_active,
          'supports_streaming', p.supports_streaming,
          'supports_function_calling', p.supports_function_calling,
          'supports_vision', p.supports_vision
        ) as provider
      FROM models m
      INNER JOIN providers p ON m.provider_id = p.id
      WHERE m.id = ?`,
      [id]
    );
    return result.rows[0] || null;
  },

  /**
   * Find model by provider name and model name
   */
  async findByModelName(
    providerName: string,
    modelName: string
  ): Promise<Model | null> {
    const result = await db.raw(
      `SELECT m.* FROM models m
      INNER JOIN providers p ON m.provider_id = p.id
      WHERE p.provider_name = ? AND m.model_name = ?`,
      [providerName, modelName]
    );
    return result.rows[0] || null;
  },

  /**
   * Create new model
   */
  async create(model: ModelInsert): Promise<Model> {
    const result = await db.raw(
      `INSERT INTO models (
        provider_id, model_name, display_name, description, model_family,
        is_active, is_recommended, capabilities, max_tokens, context_window,
        supports_streaming, supports_function_calling, supports_vision,
        supports_prompt_caching, pricing, performance_tier, avg_latency_ms,
        release_date, deprecation_date, metadata
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?::jsonb, ?, ?, ?, ?, ?, ?, ?::jsonb, ?, ?, ?, ?, ?::jsonb)
      RETURNING *`,
      [
        model.provider_id,
        model.model_name,
        model.display_name,
        model.description || null,
        model.model_family || null,
        model.is_active,
        model.is_recommended,
        JSON.stringify(model.capabilities),
        model.max_tokens || null,
        model.context_window || null,
        model.supports_streaming,
        model.supports_function_calling,
        model.supports_vision,
        model.supports_prompt_caching,
        JSON.stringify(model.pricing),
        model.performance_tier || null,
        model.avg_latency_ms || null,
        model.release_date || null,
        model.deprecation_date || null,
        JSON.stringify(model.metadata),
      ]
    );
    return result.rows[0];
  },

  /**
   * Update model
   */
  async update(id: string, updates: ModelUpdate): Promise<Model | null> {
    const fields: string[] = [];
    const values: any[] = [];

    Object.entries(updates).forEach(([key, value]) => {
      if (key === 'updated_at') return;
      if (key === 'capabilities' || key === 'pricing' || key === 'metadata') {
        fields.push(`${key} = ?::jsonb`);
        values.push(JSON.stringify(value));
      } else {
        fields.push(`${key} = ?`);
        values.push(value);
      }
    });

    if (fields.length === 0) return null;

    fields.push(`updated_at = NOW()`);
    values.push(id);

    const result = await db.raw(
      `UPDATE models SET ${fields.join(', ')} WHERE id = ? RETURNING *`,
      values
    );
    return result.rows[0] || null;
  },

  /**
   * Delete model
   */
  async delete(id: string): Promise<boolean> {
    const result = await db.raw(`DELETE FROM models WHERE id = ?`, [id]);
    return result.rowCount > 0;
  },

  /**
   * Get active models by provider
   */
  async getActiveByProvider(providerId: string): Promise<Model[]> {
    const result = await db.raw(
      `SELECT * FROM models WHERE provider_id = ? AND is_active = true ORDER BY display_name ASC`,
      [providerId]
    );
    return result.rows;
  },
};

// ============================================================================
// Agent Definitions Repository
// ============================================================================
export const agentDefinitionsRepo = {
  /**
   * Find agent by name
   */
  async findByName(agentName: string): Promise<AgentDefinition | null> {
    const agent = await db('agent_definitions')
      .where({ agent_name: agentName })
      .first();
    return agent || null;
  },

  /**
   * Find agent by ID
   */
  async findById(id: string): Promise<AgentDefinition | null> {
    const agent = await db('agent_definitions').where({ id }).first();
    return agent || null;
  },

  /**
   * Find agent by ID with model and provider information
   */
  async findByIdWithModel(id: string): Promise<any | null> {
    const sql = `
      SELECT
        ad.*,
        json_build_object(
          'id', m.id,
          'model_name', m.model_name,
          'display_name', m.display_name,
          'context_window', m.context_window,
          'max_tokens', m.max_tokens,
          'pricing', m.pricing,
          'provider', json_build_object(
            'id', p.id,
            'provider_name', p.provider_name,
            'display_name', p.display_name
          )
        ) as model
      FROM agent_definitions ad
      LEFT JOIN models m ON ad.model_id = m.id
      LEFT JOIN providers p ON m.provider_id = p.id
      WHERE ad.id = ?
    `;

    const result = await db.raw(sql, [id]);
    return result.rows[0] || null;
  },

  /**
   * List all agents (optionally filtered)
   */
  async list(filters?: {
    category?: string;
    technology?: string | null;
    isEnabled?: boolean;
    isCore?: boolean;
    model_id?: string;
  }): Promise<AgentDefinition[]> {
    let query = db('agent_definitions');

    if (filters?.category) {
      query = query.where({ category: filters.category });
    }
    if (filters?.technology !== undefined) {
      query = query.where({ technology: filters.technology });
    }
    if (filters?.isEnabled !== undefined) {
      query = query.where({ is_enabled: filters.isEnabled });
    }
    if (filters?.isCore !== undefined) {
      query = query.where({ is_core: filters.isCore });
    }
    if (filters?.model_id !== undefined) {
      query = query.where({ model_id: filters.model_id });
    }

    return query.orderBy('category').orderBy('agent_name');
  },

  /**
   * List all agents with model and provider information joined
   */
  async listWithModels(filters?: {
    category?: string;
    technology?: string | null;
    isEnabled?: boolean;
    isCore?: boolean;
  }): Promise<any[]> {
    const sql = `
      SELECT
        ad.*,
        json_build_object(
          'id', m.id,
          'model_name', m.model_name,
          'display_name', m.display_name,
          'provider', json_build_object(
            'id', p.id,
            'provider_name', p.provider_name,
            'display_name', p.display_name
          )
        ) as model
      FROM agent_definitions ad
      LEFT JOIN models m ON ad.model_id = m.id
      LEFT JOIN providers p ON m.provider_id = p.id
      WHERE 1=1
        ${filters?.category ? `AND ad.category = ?` : ''}
        ${filters?.technology !== undefined ? `AND ad.technology ${filters.technology === null ? 'IS NULL' : '= ?'}` : ''}
        ${filters?.isEnabled !== undefined ? `AND ad.is_enabled = ?` : ''}
        ${filters?.isCore !== undefined ? `AND ad.is_core = ?` : ''}
      ORDER BY ad.category, ad.agent_name
    `;

    const params: any[] = [];
    if (filters?.category) params.push(filters.category);
    if (filters?.technology !== undefined && filters.technology !== null) params.push(filters.technology);
    if (filters?.isEnabled !== undefined) params.push(filters.isEnabled);
    if (filters?.isCore !== undefined) params.push(filters.isCore);

    const result = await db.raw(sql, params);
    return result.rows;
  },

  /**
   * Create new agent
   */
  async create(agent: AgentDefinitionInsert): Promise<AgentDefinition> {
    const [created] = await db('agent_definitions').insert(agent).returning('*');
    return created;
  },

  /**
   * Update agent
   */
  async update(
    id: string,
    updates: AgentDefinitionUpdate
  ): Promise<AgentDefinition | null> {
    const [updated] = await db('agent_definitions')
      .where({ id })
      .update({ ...updates, updated_at: new Date() })
      .returning('*');
    return updated || null;
  },

  /**
   * Delete agent
   */
  async delete(id: string): Promise<boolean> {
    const deleted = await db('agent_definitions').where({ id }).del();
    return deleted > 0;
  },
};

// ============================================================================
// Sessions Repository
// ============================================================================
export const sessionsRepo = {
  /**
   * Create new session
   */
  async create(session: SessionInsert): Promise<Session> {
    const [created] = await db('sessions').insert(session).returning('*');
    return created;
  },

  /**
   * Find session by ID
   */
  async findById(id: string): Promise<Session | null> {
    const session = await db('sessions').where({ id }).first();
    return session || null;
  },

  /**
   * Update session
   */
  async update(id: string, updates: SessionUpdate): Promise<Session | null> {
    const [updated] = await db('sessions')
      .where({ id })
      .update({ ...updates, updated_at: new Date() })
      .returning('*');
    return updated || null;
  },

  /**
   * List sessions by user
   */
  async listByUser(userId: string): Promise<Session[]> {
    return db('sessions')
      .where({ user_id: userId })
      .orderBy('created_at', 'desc');
  },

  /**
   * Delete session
   */
  async delete(id: string): Promise<boolean> {
    const deleted = await db('sessions').where({ id }).del();
    return deleted > 0;
  },

  /**
   * Update session cost aggregates (called after each message)
   */
  async updateCosts(
    sessionId: string,
    tokenDeltas: {
      inputTokens: number;
      outputTokens: number;
      cacheCreationTokens: number;
      cacheReadTokens: number;
      costUsd: number;
    }
  ): Promise<void> {
    await db.raw(
      `UPDATE sessions
      SET
        total_messages = total_messages + 1,
        total_input_tokens = total_input_tokens + ?,
        total_output_tokens = total_output_tokens + ?,
        total_cache_creation_tokens = total_cache_creation_tokens + ?,
        total_cache_read_tokens = total_cache_read_tokens + ?,
        total_cost_usd = total_cost_usd + ?,
        updated_at = NOW()
      WHERE id = ?`,
      [
        tokenDeltas.inputTokens,
        tokenDeltas.outputTokens,
        tokenDeltas.cacheCreationTokens,
        tokenDeltas.cacheReadTokens,
        tokenDeltas.costUsd,
        sessionId,
      ]
    );
  },
};

// ============================================================================
// Agent Messages Repository
// ============================================================================
export const messagesRepo = {
  /**
   * Create new message
   */
  async create(message: AgentMessageInsert): Promise<AgentMessage> {
    const [created] = await db('agent_messages').insert(message).returning('*');
    return created;
  },

  /**
   * Get messages for a session
   */
  async getBySession(
    sessionId: string,
    limit?: number
  ): Promise<AgentMessage[]> {
    let query = db('agent_messages')
      .where({ session_id: sessionId })
      .orderBy('created_at', 'asc');

    if (limit) {
      query = query.limit(limit);
    }

    return query;
  },

  /**
   * Get recent messages for a session
   */
  async getRecentBySession(
    sessionId: string,
    limit: number = 10
  ): Promise<AgentMessage[]> {
    return db('agent_messages')
      .where({ session_id: sessionId })
      .orderBy('created_at', 'desc')
      .limit(limit)
      .then((messages) => messages.reverse()); // Return in chronological order
  },

  /**
   * Delete all messages for a session
   */
  async deleteBySession(sessionId: string): Promise<number> {
    return db('agent_messages').where({ session_id: sessionId }).del();
  },
};

// ============================================================================
// Stories Repository
// ============================================================================
export const storiesRepo = {
  /**
   * Create new story
   */
  async create(story: StoryInsert): Promise<Story> {
    const [created] = await db('stories').insert(story).returning('*');
    return created;
  },

  /**
   * Find story by story_id (e.g., "ACF-001")
   */
  async findByStoryId(storyId: string): Promise<Story | null> {
    const story = await db('stories').where({ story_id: storyId }).first();
    return story || null;
  },

  /**
   * List stories (with optional filters)
   */
  async list(filters?: {
    status?: string;
    technology?: string;
    epic?: string;
  }): Promise<Story[]> {
    let query = db('stories');

    if (filters?.status) {
      query = query.where({ status: filters.status });
    }
    if (filters?.technology) {
      query = query.where({ technology: filters.technology });
    }
    if (filters?.epic) {
      query = query.where({ epic: filters.epic });
    }

    return query.orderBy('created_at', 'desc');
  },

  /**
   * Update story
   */
  async update(id: string, updates: StoryUpdate): Promise<Story | null> {
    const [updated] = await db('stories')
      .where({ id })
      .update({ ...updates, updated_at: new Date() })
      .returning('*');
    return updated || null;
  },

  /**
   * Delete story
   */
  async delete(id: string): Promise<boolean> {
    const deleted = await db('stories').where({ id }).del();
    return deleted > 0;
  },
};

// ============================================================================
// Agent Health Repository
// ============================================================================
export const agentHealthRepo = {
  /**
   * Get or create health record for agent
   */
  async getOrCreate(agentDefinitionId: string): Promise<AgentHealth> {
    const existing = await db('agent_health')
      .where({ agent_definition_id: agentDefinitionId })
      .first();

    if (existing) {
      return existing;
    }

    const [created] = await db('agent_health')
      .insert({
        agent_definition_id: agentDefinitionId,
        status: 'healthy',
        total_requests: 0,
        failed_requests: 0,
        total_tokens_used: 0,
      })
      .returning('*');

    return created;
  },

  /**
   * Update health metrics
   */
  async update(
    agentDefinitionId: string,
    updates: AgentHealthUpdate
  ): Promise<AgentHealth | null> {
    const [updated] = await db('agent_health')
      .where({ agent_definition_id: agentDefinitionId })
      .update({ ...updates, last_health_check: new Date() })
      .returning('*');
    return updated || null;
  },

  /**
   * Increment request counts
   */
  async incrementRequests(
    agentDefinitionId: string,
    tokensUsed: number,
    failed: boolean = false
  ): Promise<void> {
    await db('agent_health')
      .where({ agent_definition_id: agentDefinitionId })
      .increment('total_requests', 1)
      .increment('total_tokens_used', tokensUsed)
      .increment('failed_requests', failed ? 1 : 0);
  },

  /**
   * Get health status for all agents
   */
  async listAll(): Promise<AgentHealth[]> {
    return db('agent_health').orderBy('last_health_check', 'desc');
  },
};

// Export all repositories as a single object
export const repositories = {
  providers: providersRepo,
  models: modelsRepo,
  agentDefinitions: agentDefinitionsRepo,
  sessions: sessionsRepo,
  messages: messagesRepo,
  stories: storiesRepo,
  agentHealth: agentHealthRepo,
};
