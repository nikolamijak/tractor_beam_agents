import type { Knex } from 'knex';

export async function seed(knex: Knex): Promise<void> {
  // ============================================================================
  // 1. OPENAI PROVIDER
  // ============================================================================
  const [openaiProvider] = await knex('providers')
    .insert({
      provider_name: 'openai',
      display_name: 'OpenAI',
      provider_type: 'api',
      api_base_url: 'https://api.openai.com/v1',
      auth_type: 'api_key',
      api_key: process.env.OPENAI_API_KEY || null,
      api_key_encrypted: null,
      api_key_last_rotated: null,
      is_active: true,
      is_default: false,
      supports_streaming: true,
      supports_function_calling: true,
      supports_vision: true,
      configuration: JSON.stringify({
        api_version: 'v1',
        organization: process.env.OPENAI_ORG_ID || null,
      }),
      metadata: JSON.stringify({
        documentation_url: 'https://platform.openai.com/docs',
        support_email: 'support@openai.com',
      }),
    })
    .returning('id');

  const openaiProviderId = openaiProvider.id;

  const openaiModels = [
    {
      provider_id: openaiProviderId,
      model_name: 'gpt-4o',
      display_name: 'GPT-4o',
      description: 'High intelligence flagship model for complex, multi-step tasks',
      model_family: 'gpt-4',
      is_active: true,
      is_recommended: true,
      capabilities: JSON.stringify({
        vision: true,
        function_calling: true,
        streaming: true,
        prompt_caching: false,
        json_mode: true,
      }),
      max_tokens: 16384,
      context_window: 128000,
      supports_streaming: true,
      supports_function_calling: true,
      supports_vision: true,
      supports_prompt_caching: false,
      pricing: JSON.stringify({
        input_per_mtok: 2.5,
        output_per_mtok: 10.0,
        context_pricing_tiers: [
          { min_tokens: 0, max_tokens: 128000, input_per_mtok: 2.5 },
        ],
      }),
      performance_tier: 'balanced',
      avg_latency_ms: 2500,
      release_date: '2024-05-13',
      metadata: JSON.stringify({
        category: 'general_purpose',
        use_cases: ['coding', 'analysis', 'vision', 'reasoning'],
      }),
    },
    {
      provider_id: openaiProviderId,
      model_name: 'gpt-4-turbo',
      display_name: 'GPT-4 Turbo',
      description: 'Previous generation flagship with vision capabilities',
      model_family: 'gpt-4',
      is_active: true,
      is_recommended: false,
      capabilities: JSON.stringify({
        vision: true,
        function_calling: true,
        streaming: true,
        prompt_caching: false,
        json_mode: true,
      }),
      max_tokens: 4096,
      context_window: 128000,
      supports_streaming: true,
      supports_function_calling: true,
      supports_vision: true,
      supports_prompt_caching: false,
      pricing: JSON.stringify({
        input_per_mtok: 10.0,
        output_per_mtok: 30.0,
        context_pricing_tiers: [
          { min_tokens: 0, max_tokens: 128000, input_per_mtok: 10.0 },
        ],
      }),
      performance_tier: 'powerful',
      avg_latency_ms: 3500,
      release_date: '2024-04-09',
      metadata: JSON.stringify({
        category: 'general_purpose',
        use_cases: ['complex_reasoning', 'vision', 'long_context'],
      }),
    },
    {
      provider_id: openaiProviderId,
      model_name: 'gpt-4',
      display_name: 'GPT-4',
      description: 'Original GPT-4 model, powerful but slower',
      model_family: 'gpt-4',
      is_active: true,
      is_recommended: false,
      capabilities: JSON.stringify({
        vision: false,
        function_calling: true,
        streaming: true,
        prompt_caching: false,
        json_mode: false,
      }),
      max_tokens: 8192,
      context_window: 8192,
      supports_streaming: true,
      supports_function_calling: true,
      supports_vision: false,
      supports_prompt_caching: false,
      pricing: JSON.stringify({
        input_per_mtok: 30.0,
        output_per_mtok: 60.0,
        context_pricing_tiers: [
          { min_tokens: 0, max_tokens: 8192, input_per_mtok: 30.0 },
        ],
      }),
      performance_tier: 'powerful',
      avg_latency_ms: 4000,
      release_date: '2023-03-14',
      metadata: JSON.stringify({
        category: 'general_purpose',
        use_cases: ['complex_reasoning', 'analysis'],
      }),
    },
    {
      provider_id: openaiProviderId,
      model_name: 'gpt-3.5-turbo',
      display_name: 'GPT-3.5 Turbo',
      description: 'Fast and cost-effective model for simple tasks',
      model_family: 'gpt-3.5',
      is_active: true,
      is_recommended: false,
      capabilities: JSON.stringify({
        vision: false,
        function_calling: true,
        streaming: true,
        prompt_caching: false,
        json_mode: true,
      }),
      max_tokens: 4096,
      context_window: 16385,
      supports_streaming: true,
      supports_function_calling: true,
      supports_vision: false,
      supports_prompt_caching: false,
      pricing: JSON.stringify({
        input_per_mtok: 0.5,
        output_per_mtok: 1.5,
        context_pricing_tiers: [
          { min_tokens: 0, max_tokens: 16385, input_per_mtok: 0.5 },
        ],
      }),
      performance_tier: 'fast',
      avg_latency_ms: 1000,
      release_date: '2023-03-01',
      metadata: JSON.stringify({
        category: 'high_volume',
        use_cases: ['classification', 'simple_tasks', 'chat'],
      }),
    },
    {
      provider_id: openaiProviderId,
      model_name: 'o1-preview',
      display_name: 'O1 Preview',
      description: 'Reasoning model that thinks before answering, best for complex problems',
      model_family: 'o1',
      is_active: true,
      is_recommended: false,
      capabilities: JSON.stringify({
        vision: false,
        function_calling: false,
        streaming: true,
        prompt_caching: false,
        reasoning: true,
      }),
      max_tokens: 32768,
      context_window: 128000,
      supports_streaming: true,
      supports_function_calling: false,
      supports_vision: false,
      supports_prompt_caching: false,
      pricing: JSON.stringify({
        input_per_mtok: 15.0,
        output_per_mtok: 60.0,
        reasoning_per_mtok: 60.0, // Reasoning tokens billed at output rate
        context_pricing_tiers: [
          { min_tokens: 0, max_tokens: 128000, input_per_mtok: 15.0 },
        ],
      }),
      performance_tier: 'powerful',
      avg_latency_ms: 8000,
      release_date: '2024-09-12',
      metadata: JSON.stringify({
        category: 'advanced_reasoning',
        use_cases: ['complex_math', 'science', 'coding', 'problem_solving'],
      }),
    },
    {
      provider_id: openaiProviderId,
      model_name: 'o1-mini',
      display_name: 'O1 Mini',
      description: 'Faster, cheaper reasoning model for coding and STEM',
      model_family: 'o1',
      is_active: true,
      is_recommended: false,
      capabilities: JSON.stringify({
        vision: false,
        function_calling: false,
        streaming: true,
        prompt_caching: false,
        reasoning: true,
      }),
      max_tokens: 65536,
      context_window: 128000,
      supports_streaming: true,
      supports_function_calling: false,
      supports_vision: false,
      supports_prompt_caching: false,
      pricing: JSON.stringify({
        input_per_mtok: 3.0,
        output_per_mtok: 12.0,
        reasoning_per_mtok: 12.0,
        context_pricing_tiers: [
          { min_tokens: 0, max_tokens: 128000, input_per_mtok: 3.0 },
        ],
      }),
      performance_tier: 'balanced',
      avg_latency_ms: 5000,
      release_date: '2024-09-12',
      metadata: JSON.stringify({
        category: 'reasoning',
        use_cases: ['coding', 'math', 'science'],
      }),
    },
  ];

  await knex('models').insert(openaiModels);

  // ============================================================================
  // 2. AZURE OPENAI PROVIDER
  // ============================================================================
  const [azureProvider] = await knex('providers')
    .insert({
      provider_name: 'azure-openai',
      display_name: 'Azure OpenAI',
      provider_type: 'cloud',
      api_base_url: process.env.AZURE_OPENAI_ENDPOINT || null,
      auth_type: 'api_key',
      api_key: process.env.AZURE_OPENAI_API_KEY || null,
      api_key_encrypted: null,
      api_key_last_rotated: null,
      is_active: false, // Disabled by default until configured
      is_default: false,
      supports_streaming: true,
      supports_function_calling: true,
      supports_vision: true,
      configuration: JSON.stringify({
        api_version: '2024-02-15-preview',
        deployment_name: process.env.AZURE_OPENAI_DEPLOYMENT || null,
        requires_deployment: true,
      }),
      metadata: JSON.stringify({
        documentation_url: 'https://learn.microsoft.com/en-us/azure/ai-services/openai/',
        note: 'Azure OpenAI uses deployment-specific endpoints. Configure AZURE_OPENAI_ENDPOINT and AZURE_OPENAI_DEPLOYMENT.',
      }),
    })
    .returning('id');

  const azureProviderId = azureProvider.id;

  // Azure models reference OpenAI models but are deployment-specific
  const azureModels = [
    {
      provider_id: azureProviderId,
      model_name: 'gpt-4o',
      display_name: 'GPT-4o (Azure)',
      description: 'Azure-hosted GPT-4o deployment',
      model_family: 'gpt-4',
      is_active: false,
      is_recommended: true,
      capabilities: JSON.stringify({
        vision: true,
        function_calling: true,
        streaming: true,
        prompt_caching: false,
      }),
      max_tokens: 16384,
      context_window: 128000,
      supports_streaming: true,
      supports_function_calling: true,
      supports_vision: true,
      supports_prompt_caching: false,
      pricing: JSON.stringify({
        input_per_mtok: 2.5,
        output_per_mtok: 10.0,
        context_pricing_tiers: [
          { min_tokens: 0, max_tokens: 128000, input_per_mtok: 2.5 },
        ],
      }),
      performance_tier: 'balanced',
      avg_latency_ms: 2500,
      release_date: '2024-05-13',
      metadata: JSON.stringify({
        category: 'general_purpose',
        deployment_required: true,
      }),
    },
    {
      provider_id: azureProviderId,
      model_name: 'gpt-4-turbo',
      display_name: 'GPT-4 Turbo (Azure)',
      description: 'Azure-hosted GPT-4 Turbo deployment',
      model_family: 'gpt-4',
      is_active: false,
      is_recommended: false,
      capabilities: JSON.stringify({
        vision: true,
        function_calling: true,
        streaming: true,
        prompt_caching: false,
      }),
      max_tokens: 4096,
      context_window: 128000,
      supports_streaming: true,
      supports_function_calling: true,
      supports_vision: true,
      supports_prompt_caching: false,
      pricing: JSON.stringify({
        input_per_mtok: 10.0,
        output_per_mtok: 30.0,
        context_pricing_tiers: [
          { min_tokens: 0, max_tokens: 128000, input_per_mtok: 10.0 },
        ],
      }),
      performance_tier: 'powerful',
      avg_latency_ms: 3500,
      release_date: '2024-04-09',
      metadata: JSON.stringify({
        category: 'general_purpose',
        deployment_required: true,
      }),
    },
  ];

  await knex('models').insert(azureModels);

  // ============================================================================
  // 3. GROQ PROVIDER
  // ============================================================================
  const [groqProvider] = await knex('providers')
    .insert({
      provider_name: 'groq',
      display_name: 'Groq',
      provider_type: 'api',
      api_base_url: 'https://api.groq.com/openai/v1',
      auth_type: 'api_key',
      api_key: process.env.GROQ_API_KEY || null,
      api_key_encrypted: null,
      api_key_last_rotated: null,
      is_active: true,
      is_default: false,
      supports_streaming: true,
      supports_function_calling: true,
      supports_vision: false,
      configuration: JSON.stringify({
        api_compatible: 'openai',
        hardware: 'LPU (Language Processing Unit)',
      }),
      metadata: JSON.stringify({
        documentation_url: 'https://console.groq.com/docs',
        note: 'Groq provides ultra-fast inference using custom LPU hardware',
      }),
    })
    .returning('id');

  const groqProviderId = groqProvider.id;

  const groqModels = [
    {
      provider_id: groqProviderId,
      model_name: 'llama-3.3-70b-versatile',
      display_name: 'Llama 3.3 70B',
      description: 'Latest Llama model with balanced performance',
      model_family: 'llama-3',
      is_active: true,
      is_recommended: true,
      capabilities: JSON.stringify({
        vision: false,
        function_calling: true,
        streaming: true,
      }),
      max_tokens: 32768,
      context_window: 128000,
      supports_streaming: true,
      supports_function_calling: true,
      supports_vision: false,
      supports_prompt_caching: false,
      pricing: JSON.stringify({
        input_per_mtok: 0.59,
        output_per_mtok: 0.79,
        context_pricing_tiers: [
          { min_tokens: 0, max_tokens: 128000, input_per_mtok: 0.59 },
        ],
      }),
      performance_tier: 'fast',
      avg_latency_ms: 400,
      release_date: '2024-12-06',
      metadata: JSON.stringify({
        category: 'open_source',
        use_cases: ['general_purpose', 'coding', 'reasoning'],
      }),
    },
    {
      provider_id: groqProviderId,
      model_name: 'llama-3.1-70b-versatile',
      display_name: 'Llama 3.1 70B',
      description: 'Previous Llama 70B with extended context',
      model_family: 'llama-3',
      is_active: true,
      is_recommended: false,
      capabilities: JSON.stringify({
        vision: false,
        function_calling: true,
        streaming: true,
      }),
      max_tokens: 8000,
      context_window: 131072,
      supports_streaming: true,
      supports_function_calling: true,
      supports_vision: false,
      supports_prompt_caching: false,
      pricing: JSON.stringify({
        input_per_mtok: 0.59,
        output_per_mtok: 0.79,
        context_pricing_tiers: [
          { min_tokens: 0, max_tokens: 131072, input_per_mtok: 0.59 },
        ],
      }),
      performance_tier: 'fast',
      avg_latency_ms: 450,
      release_date: '2024-07-23',
      metadata: JSON.stringify({
        category: 'open_source',
        use_cases: ['long_context', 'coding', 'analysis'],
      }),
    },
    {
      provider_id: groqProviderId,
      model_name: 'llama-3.1-8b-instant',
      display_name: 'Llama 3.1 8B',
      description: 'Ultra-fast small model for high-volume tasks',
      model_family: 'llama-3',
      is_active: true,
      is_recommended: false,
      capabilities: JSON.stringify({
        vision: false,
        function_calling: true,
        streaming: true,
      }),
      max_tokens: 8000,
      context_window: 131072,
      supports_streaming: true,
      supports_function_calling: true,
      supports_vision: false,
      supports_prompt_caching: false,
      pricing: JSON.stringify({
        input_per_mtok: 0.05,
        output_per_mtok: 0.08,
        context_pricing_tiers: [
          { min_tokens: 0, max_tokens: 131072, input_per_mtok: 0.05 },
        ],
      }),
      performance_tier: 'fast',
      avg_latency_ms: 200,
      release_date: '2024-07-23',
      metadata: JSON.stringify({
        category: 'high_volume',
        use_cases: ['classification', 'simple_tasks', 'extraction'],
      }),
    },
    {
      provider_id: groqProviderId,
      model_name: 'mixtral-8x7b-32768',
      display_name: 'Mixtral 8x7B',
      description: 'Mixture of experts model with strong performance',
      model_family: 'mixtral',
      is_active: true,
      is_recommended: false,
      capabilities: JSON.stringify({
        vision: false,
        function_calling: true,
        streaming: true,
      }),
      max_tokens: 32768,
      context_window: 32768,
      supports_streaming: true,
      supports_function_calling: true,
      supports_vision: false,
      supports_prompt_caching: false,
      pricing: JSON.stringify({
        input_per_mtok: 0.24,
        output_per_mtok: 0.24,
        context_pricing_tiers: [
          { min_tokens: 0, max_tokens: 32768, input_per_mtok: 0.24 },
        ],
      }),
      performance_tier: 'fast',
      avg_latency_ms: 350,
      release_date: '2024-01-08',
      metadata: JSON.stringify({
        category: 'open_source',
        use_cases: ['coding', 'analysis', 'multilingual'],
      }),
    },
    {
      provider_id: groqProviderId,
      model_name: 'gemma-7b-it',
      display_name: 'Gemma 7B Instruct',
      description: 'Google\'s open model optimized for instruction following',
      model_family: 'gemma',
      is_active: true,
      is_recommended: false,
      capabilities: JSON.stringify({
        vision: false,
        function_calling: false,
        streaming: true,
      }),
      max_tokens: 8192,
      context_window: 8192,
      supports_streaming: true,
      supports_function_calling: false,
      supports_vision: false,
      supports_prompt_caching: false,
      pricing: JSON.stringify({
        input_per_mtok: 0.07,
        output_per_mtok: 0.07,
        context_pricing_tiers: [
          { min_tokens: 0, max_tokens: 8192, input_per_mtok: 0.07 },
        ],
      }),
      performance_tier: 'fast',
      avg_latency_ms: 300,
      release_date: '2024-02-21',
      metadata: JSON.stringify({
        category: 'open_source',
        use_cases: ['instruction_following', 'chat'],
      }),
    },
  ];

  await knex('models').insert(groqModels);

  // ============================================================================
  // 4. HUGGINGFACE PROVIDER
  // ============================================================================
  const [hfProvider] = await knex('providers')
    .insert({
      provider_name: 'huggingface',
      display_name: 'HuggingFace',
      provider_type: 'api',
      api_base_url: 'https://api-inference.huggingface.co',
      auth_type: 'api_key',
      api_key: process.env.HUGGINGFACE_API_KEY || null,
      api_key_encrypted: null,
      api_key_last_rotated: null,
      is_active: true,
      is_default: false,
      supports_streaming: true,
      supports_function_calling: false,
      supports_vision: false,
      configuration: JSON.stringify({
        inference_api: true,
        supports_custom_models: true,
      }),
      metadata: JSON.stringify({
        documentation_url: 'https://huggingface.co/docs/api-inference',
        note: 'HuggingFace Inference API supports thousands of open-source models',
      }),
    })
    .returning('id');

  const hfProviderId = hfProvider.id;

  const hfModels = [
    {
      provider_id: hfProviderId,
      model_name: 'meta-llama/Llama-3.2-3B-Instruct',
      display_name: 'Llama 3.2 3B Instruct',
      description: 'Compact Llama model for efficient inference',
      model_family: 'llama-3',
      is_active: true,
      is_recommended: true,
      capabilities: JSON.stringify({
        vision: false,
        function_calling: false,
        streaming: true,
      }),
      max_tokens: 8192,
      context_window: 8192,
      supports_streaming: true,
      supports_function_calling: false,
      supports_vision: false,
      supports_prompt_caching: false,
      pricing: JSON.stringify({
        input_per_mtok: 0.0,
        output_per_mtok: 0.0,
        note: 'Free tier available, usage-based pricing for hosted inference',
        context_pricing_tiers: [
          { min_tokens: 0, max_tokens: 8192, input_per_mtok: 0.0 },
        ],
      }),
      performance_tier: 'fast',
      avg_latency_ms: 1500,
      release_date: '2024-09-25',
      metadata: JSON.stringify({
        category: 'open_source',
        use_cases: ['chat', 'instruction_following'],
      }),
    },
    {
      provider_id: hfProviderId,
      model_name: 'mistralai/Mistral-7B-Instruct-v0.3',
      display_name: 'Mistral 7B Instruct v0.3',
      description: 'High-performance 7B model with instruction tuning',
      model_family: 'mistral',
      is_active: true,
      is_recommended: true,
      capabilities: JSON.stringify({
        vision: false,
        function_calling: false,
        streaming: true,
      }),
      max_tokens: 32768,
      context_window: 32768,
      supports_streaming: true,
      supports_function_calling: false,
      supports_vision: false,
      supports_prompt_caching: false,
      pricing: JSON.stringify({
        input_per_mtok: 0.0,
        output_per_mtok: 0.0,
        note: 'Free tier available',
        context_pricing_tiers: [
          { min_tokens: 0, max_tokens: 32768, input_per_mtok: 0.0 },
        ],
      }),
      performance_tier: 'fast',
      avg_latency_ms: 1200,
      release_date: '2024-05-22',
      metadata: JSON.stringify({
        category: 'open_source',
        use_cases: ['coding', 'reasoning', 'chat'],
      }),
    },
    {
      provider_id: hfProviderId,
      model_name: 'google/flan-t5-xxl',
      display_name: 'FLAN-T5 XXL',
      description: 'Google\'s instruction-tuned T5 model (11B parameters)',
      model_family: 't5',
      is_active: true,
      is_recommended: false,
      capabilities: JSON.stringify({
        vision: false,
        function_calling: false,
        streaming: false,
      }),
      max_tokens: 512,
      context_window: 512,
      supports_streaming: false,
      supports_function_calling: false,
      supports_vision: false,
      supports_prompt_caching: false,
      pricing: JSON.stringify({
        input_per_mtok: 0.0,
        output_per_mtok: 0.0,
        note: 'Free tier available',
        context_pricing_tiers: [
          { min_tokens: 0, max_tokens: 512, input_per_mtok: 0.0 },
        ],
      }),
      performance_tier: 'fast',
      avg_latency_ms: 800,
      release_date: '2023-02-03',
      metadata: JSON.stringify({
        category: 'open_source',
        use_cases: ['classification', 'question_answering', 'summarization'],
      }),
    },
    {
      provider_id: hfProviderId,
      model_name: 'facebook/bart-large-cnn',
      display_name: 'BART Large CNN',
      description: 'Specialized model for summarization tasks',
      model_family: 'bart',
      is_active: true,
      is_recommended: false,
      capabilities: JSON.stringify({
        vision: false,
        function_calling: false,
        streaming: false,
      }),
      max_tokens: 1024,
      context_window: 1024,
      supports_streaming: false,
      supports_function_calling: false,
      supports_vision: false,
      supports_prompt_caching: false,
      pricing: JSON.stringify({
        input_per_mtok: 0.0,
        output_per_mtok: 0.0,
        note: 'Free tier available',
        context_pricing_tiers: [
          { min_tokens: 0, max_tokens: 1024, input_per_mtok: 0.0 },
        ],
      }),
      performance_tier: 'fast',
      avg_latency_ms: 600,
      release_date: '2020-10-12',
      metadata: JSON.stringify({
        category: 'specialized',
        use_cases: ['summarization', 'text_generation'],
      }),
    },
  ];

  await knex('models').insert(hfModels);
}
