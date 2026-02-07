/**
 * Database table types
 * Matches the schema defined in db/migrations/
 */

// ============================================================================
// Providers
// ============================================================================
export interface Provider {
  id: string;
  provider_name: string;
  display_name: string;
  provider_type: 'api' | 'self_hosted' | 'cloud';
  api_base_url: string | null;
  auth_type: string | null;
  api_key: string | null; // API key for this provider
  api_key_encrypted: string | null; // Encrypted version (future use)
  api_key_last_rotated: Date | null; // Last key rotation timestamp
  is_active: boolean;
  is_default: boolean;
  supports_streaming: boolean;
  supports_function_calling: boolean;
  supports_vision: boolean;
  configuration: Record<string, any>;
  metadata: Record<string, any>;
  created_at: Date;
  updated_at: Date;
}

export interface ProviderInsert extends Omit<Provider, 'id' | 'created_at' | 'updated_at'> {}

export interface ProviderUpdate extends Partial<Omit<Provider, 'id' | 'created_at'>> {
  updated_at: Date;
}

// ============================================================================
// Models
// ============================================================================
export interface ModelPricing {
  input_per_mtok: number;
  output_per_mtok: number;
  cache_creation_per_mtok?: number;
  cache_read_per_mtok?: number;
  context_pricing_tiers?: Array<{
    min_tokens: number;
    max_tokens: number | null;
    input_per_mtok: number;
  }>;
}

export interface ModelCapabilities {
  vision?: boolean;
  function_calling?: boolean;
  streaming?: boolean;
  prompt_caching?: boolean;
  extended_thinking?: boolean;
  [key: string]: any;
}

export interface Model {
  id: string;
  provider_id: string;
  model_name: string;
  display_name: string;
  description: string | null;
  model_family: string | null;
  is_active: boolean;
  is_recommended: boolean;
  capabilities: ModelCapabilities;
  max_tokens: number | null;
  context_window: number | null;
  supports_streaming: boolean;
  supports_function_calling: boolean;
  supports_vision: boolean;
  supports_prompt_caching: boolean;
  pricing: ModelPricing;
  performance_tier: string | null;
  avg_latency_ms: number | null;
  release_date: string | null;
  deprecation_date: string | null;
  metadata: Record<string, any>;
  created_at: Date;
  updated_at: Date;
}

export interface ModelWithProvider extends Model {
  provider: Provider;
}

export interface ModelInsert extends Omit<Model, 'id' | 'created_at' | 'updated_at'> {}

export interface ModelUpdate extends Partial<Omit<Model, 'id' | 'created_at'>> {
  updated_at: Date;
}

// ============================================================================
// Token Usage & Cost Tracking
// ============================================================================
export interface TokenUsage {
  input_tokens: number;
  output_tokens: number;
  cache_creation_tokens?: number;
  cache_read_tokens?: number;
  extended_thinking_tokens?: number;
}

export interface CostBreakdown {
  input_cost: number;
  output_cost: number;
  cache_creation_cost: number;
  cache_read_cost: number;
  extended_thinking_cost: number;
  total_cost: number;
}

// ============================================================================
// Agent Definitions
// ============================================================================
export interface AgentDefinition {
  id: string;
  agent_name: string;
  display_name: string;
  description: string | null;
  category: 'workflow' | 'innovation' | 'utility' | 'technology';
  technology: string | null; // 'dotnet', 'nodejs', 'python', etc.
  system_prompt: string; // ★ Stored in DB!
  model_id: string; // FK to models table (NOT NULL after migration)
  max_tokens: number;
  temperature: number;
  tools: Record<string, any>[];
  capabilities: Record<string, any>;
  is_core: boolean;
  is_enabled: boolean;
  version: string;
  created_at: Date;
  updated_at: Date;
}

export interface AgentDefinitionInsert extends Omit<AgentDefinition, 'id' | 'created_at' | 'updated_at'> {}

export interface AgentDefinitionUpdate extends Partial<Omit<AgentDefinition, 'id' | 'created_at'>> {
  updated_at: Date;
}

// ============================================================================
// Agent Health
// ============================================================================
export interface AgentHealth {
  id: number;
  agent_definition_id: string;
  status: 'healthy' | 'degraded' | 'down';
  last_health_check: Date;
  response_time_ms: number | null;
  total_requests: number;
  failed_requests: number;
  total_tokens_used: number;
  error_message: string | null;
  metadata: Record<string, any>;
}

export interface AgentHealthInsert extends Omit<AgentHealth, 'id'> {}

export interface AgentHealthUpdate extends Partial<Omit<AgentHealth, 'id' | 'agent_definition_id'>> {}

// ============================================================================
// Sessions
// ============================================================================
export interface Session {
  id: string;
  user_id: string;
  technology: string | null;
  state: Record<string, any>;
  context: Record<string, any>;
  total_messages: number;
  total_input_tokens: number;
  total_output_tokens: number;
  total_cache_creation_tokens: number;
  total_cache_read_tokens: number;
  total_cost_usd: number;
  created_at: Date;
  updated_at: Date;
  expires_at: Date | null;
  metadata: Record<string, any>;
}

export interface SessionInsert extends Omit<Session, 'id' | 'created_at' | 'updated_at'> {}

export interface SessionUpdate extends Partial<Omit<Session, 'id' | 'created_at'>> {
  updated_at: Date;
}

// ============================================================================
// Agent Messages
// ============================================================================
export interface AgentMessage {
  id: number;
  session_id: string;
  agent_definition_id: string;
  role: 'user' | 'assistant' | 'system';
  content: string;
  tokens_used: number;
  input_tokens: number;
  output_tokens: number;
  cache_creation_tokens: number;
  cache_read_tokens: number;
  extended_thinking_tokens: number;
  total_cost_usd: number;
  pricing_snapshot: ModelPricing;
  model: string | null;
  metadata: Record<string, any>;
  created_at: Date;
}

export interface AgentMessageInsert extends Omit<AgentMessage, 'id' | 'created_at'> {}

// ============================================================================
// Stories
// ============================================================================
export interface Story {
  id: string;
  story_id: string; // ACF-001, ACF-002, etc.
  title: string;
  description: string | null;
  acceptance_criteria: string | null;
  epic: string | null;
  priority: string | null;
  status: string;
  technology: string | null;
  created_at: Date;
  updated_at: Date;
  metadata: Record<string, any>;
}

export interface StoryInsert extends Omit<Story, 'id' | 'created_at' | 'updated_at'> {}

export interface StoryUpdate extends Partial<Omit<Story, 'id' | 'created_at'>> {
  updated_at: Date;
}

// ============================================================================
// Artifacts
// ============================================================================
export interface Artifact {
  id: string;
  session_id: string | null;
  story_id: string | null;
  artifact_type: string; // 'code', 'test', 'config', 'document'
  path: string | null;
  content: string | null;
  content_type: string | null;
  size_bytes: number | null;
  created_by_agent: string | null;
  created_at: Date;
  metadata: Record<string, any>;
}

export interface ArtifactInsert extends Omit<Artifact, 'id' | 'created_at'> {}

// ============================================================================
// Technology Extensions
// ============================================================================
export interface TechnologyExtension {
  id: string;
  technology_name: string; // 'dotnet', 'nodejs', 'python'
  display_name: string;
  version: string;
  is_active: boolean;
  agent_count: number;
  installation_date: Date;
  metadata: Record<string, any>;
}

export interface TechnologyExtensionInsert extends Omit<TechnologyExtension, 'id' | 'installation_date'> {}

export interface TechnologyExtensionUpdate extends Partial<Omit<TechnologyExtension, 'id' | 'installation_date'>> {}

// ============================================================================
// Database Tables Interface (for type-safe queries)
// ============================================================================
export interface Database {
  providers: Provider;
  models: Model;
  agent_definitions: AgentDefinition;
  agent_health: AgentHealth;
  sessions: Session;
  agent_messages: AgentMessage;
  stories: Story;
  artifacts: Artifact;
  technology_extensions: TechnologyExtension;
}
