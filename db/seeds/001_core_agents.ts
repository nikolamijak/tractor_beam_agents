import { Knex } from 'knex';

export async function seed(knex: Knex): Promise<void> {
  // Delete existing entries in reverse dependency order
  await knex('agent_definitions').del();
  await knex('technology_extensions').del();
  await knex('models').del();
  await knex('providers').del();

  // ============================================================================
  // PROVIDERS - Insert parent table first
  // ============================================================================

  const [anthropicProvider] = await knex('providers')
    .insert({
      provider_name: 'anthropic',
      display_name: 'Anthropic Claude',
      provider_type: 'api',
      api_base_url: 'https://api.anthropic.com/v1',
      auth_type: 'api_key',
      api_key: process.env.ANTHROPIC_API_KEY || null,
      is_active: true,
      is_default: true,
      supports_streaming: true,
      supports_function_calling: true,
      supports_vision: true,
      configuration: JSON.stringify({
        api_version: '2023-06-01',
        default_max_tokens: 8192,
      }),
      metadata: JSON.stringify({
        documentation_url: 'https://docs.anthropic.com',
        support_email: 'support@anthropic.com',
      }),
    })
    .returning('id');

  const providerId = anthropicProvider.id;

  console.log('✅ Seeded 1 provider (Anthropic)');

  // ============================================================================
  // MODELS - Insert Anthropic models
  // ============================================================================

  const models = [
    {
      provider_id: providerId,
      model_name: 'claude-sonnet-4-20250514',
      display_name: 'Claude Sonnet 4',
      description: 'Balanced intelligence and speed for enterprise workloads',
      model_family: 'claude-4',
      is_active: true,
      is_recommended: true,
      capabilities: JSON.stringify({
        vision: true,
        function_calling: true,
        streaming: true,
        prompt_caching: true,
        extended_thinking: false,
      }),
      max_tokens: 8192,
      context_window: 200000,
      supports_streaming: true,
      supports_function_calling: true,
      supports_vision: true,
      supports_prompt_caching: true,
      pricing: JSON.stringify({
        input_per_mtok: 3.0,
        output_per_mtok: 15.0,
        cache_creation_per_mtok: 3.75,
        cache_read_per_mtok: 0.3,
        context_pricing_tiers: [
          { min_tokens: 0, max_tokens: 200000, input_per_mtok: 3.0 },
        ],
      }),
      performance_tier: 'balanced',
      avg_latency_ms: 2000,
      release_date: '2025-05-14',
      metadata: JSON.stringify({
        category: 'general_purpose',
        use_cases: ['coding', 'analysis', 'writing', 'reasoning'],
      }),
    },
    {
      provider_id: providerId,
      model_name: 'claude-opus-4-20250514',
      display_name: 'Claude Opus 4',
      description: 'Most powerful model for complex tasks requiring deep reasoning',
      model_family: 'claude-4',
      is_active: true,
      is_recommended: false,
      capabilities: JSON.stringify({
        vision: true,
        function_calling: true,
        streaming: true,
        prompt_caching: true,
        extended_thinking: false,
      }),
      max_tokens: 8192,
      context_window: 200000,
      supports_streaming: true,
      supports_function_calling: true,
      supports_vision: true,
      supports_prompt_caching: true,
      pricing: JSON.stringify({
        input_per_mtok: 5.0,
        output_per_mtok: 25.0,
        cache_creation_per_mtok: 6.25,
        cache_read_per_mtok: 0.5,
        context_pricing_tiers: [
          { min_tokens: 0, max_tokens: 200000, input_per_mtok: 5.0 },
        ],
      }),
      performance_tier: 'powerful',
      avg_latency_ms: 3000,
      release_date: '2025-05-14',
      metadata: JSON.stringify({
        category: 'advanced_reasoning',
        use_cases: ['research', 'complex_analysis', 'strategic_planning'],
      }),
    },
    {
      provider_id: providerId,
      model_name: 'claude-haiku-4.5-20250514',
      display_name: 'Claude Haiku 4.5',
      description: 'Fastest model for high-volume, low-latency tasks',
      model_family: 'claude-4',
      is_active: true,
      is_recommended: false,
      capabilities: JSON.stringify({
        vision: true,
        function_calling: true,
        streaming: true,
        prompt_caching: true,
        extended_thinking: false,
      }),
      max_tokens: 8192,
      context_window: 200000,
      supports_streaming: true,
      supports_function_calling: true,
      supports_vision: true,
      supports_prompt_caching: true,
      pricing: JSON.stringify({
        input_per_mtok: 1.0,
        output_per_mtok: 5.0,
        cache_creation_per_mtok: 1.25,
        cache_read_per_mtok: 0.1,
        context_pricing_tiers: [
          { min_tokens: 0, max_tokens: 200000, input_per_mtok: 1.0 },
        ],
      }),
      performance_tier: 'fast',
      avg_latency_ms: 800,
      release_date: '2025-05-14',
      metadata: JSON.stringify({
        category: 'high_volume',
        use_cases: ['classification', 'extraction', 'simple_tasks'],
      }),
    },
  ];

  await knex('models').insert(models);

  // Get the Claude Sonnet 4 model ID for agent seeding
  const claudeSonnet4Model = await knex('models')
    .where({ provider_id: providerId, model_name: 'claude-sonnet-4-20250514' })
    .first();

  console.log(`✅ Seeded ${models.length} Anthropic models`);

  // ============================================================================
  // WORKFLOW AGENTS (8) - Technology-Agnostic
  // ============================================================================

  await knex('agent_definitions').insert([
    {
      agent_name: 'dmas-orchestrator',
      display_name: 'Intelligent Workflow Orchestrator',
      description: 'Entry point agent that detects user intent and dispatches to appropriate workflows',
      category: 'workflow',
      technology: null,
      system_prompt: `You are the Orchestrator Agent for the Tractor Beam.

Your responsibilities:
- Analyze user input to detect intent
- Determine which agents or workflows to invoke
- Coordinate multi-step execution with context chaining
- Route requests to the appropriate specialized agents

Available agents:
- dmas-intake: Parse documents and extract requirements
- dmas-ideation: Convert requirements to epics/stories
- dmas-product-owner: Assign story IDs and prioritize backlog
- dmas-developer: Generate code
- dmas-qa: Validate tests and coverage
- dmas-devops: Create deployment configs
- dmas-summarizer: Reduce token usage

Always output JSON with your routing decision:
{
  "intent": "document_to_stories | implement_story | deploy | custom",
  "workflow": "workflow_name",
  "agents": ["agent1", "agent2"],
  "reasoning": "Why you chose this approach"
}`,
      model_id: claudeSonnet4Model.id,
      max_tokens: 2048,
      temperature: 0.7,
      is_core: true,
      is_enabled: true,
    },
    {
      agent_name: 'dmas-intake',
      display_name: 'Document Intake Specialist',
      description: 'Parses 56+ document formats and extracts structured requirements',
      category: 'workflow',
      technology: null,
      system_prompt: `You are the Document Intake Specialist for the Tractor Beam.

Your responsibilities:
- Parse documents in 56+ formats (PDF, DOCX, XLSX, MD, images, etc.)
- Extract requirements, constraints, and business rules
- Identify stakeholders and key objectives
- Generate structured intake artifacts

Always output JSON with the following schema:
{
  "projectName": "string",
  "extractedRequirements": ["requirement1", "requirement2", ...],
  "constraints": ["constraint1", "constraint2", ...],
  "stakeholders": ["stakeholder1", "stakeholder2", ...],
  "openQuestions": ["question1", "question2", ...],
  "artifacts": [
    {
      "name": "project-context.md",
      "content": "markdown content..."
    },
    {
      "name": "extracted-requirements.md",
      "content": "markdown content..."
    }
  ]
}

Be thorough and capture ALL requirements, even implicit ones.`,
      model_id: claudeSonnet4Model.id,
      max_tokens: 4096,
      temperature: 0.7,
      is_core: true,
      is_enabled: true,
    },
    {
      agent_name: 'dmas-ideation',
      display_name: 'Requirements Analyst & Solution Architect',
      description: 'Converts requirements into epics, user stories, and architecture decisions',
      category: 'workflow',
      technology: null,
      system_prompt: `You are the Ideation Agent for the Tractor Beam.

Your responsibilities:
- Convert requirements into epics and user stories
- Create Architecture Decision Records (ADRs)
- Analyze non-functional requirements
- Identify technical risks and dependencies

Always output JSON with the following schema:
{
  "epics": [
    {
      "name": "Epic Name",
      "description": "Epic description",
      "stories": [
        {
          "title": "As a [user], I want to [action] so that [benefit]",
          "description": "Detailed description",
          "acceptanceCriteria": ["criterion1", "criterion2", ...],
          "technicalNotes": "Implementation notes",
          "estimatedEffort": "small | medium | large",
          "dependencies": ["dependency1", ...]
        }
      ]
    }
  ],
  "adrs": [
    {
      "title": "ADR-001: Technology Choice",
      "status": "accepted",
      "context": "Why we needed to make this decision",
      "decision": "What we decided",
      "consequences": "Implications of this decision"
    }
  ],
  "risks": [
    {
      "risk": "Risk description",
      "severity": "low | medium | high",
      "mitigation": "How to mitigate"
    }
  ]
}

Focus on creating clear, implementable user stories with full traceability.`,
      model_id: claudeSonnet4Model.id,
      max_tokens: 8192,
      temperature: 0.7,
      is_core: true,
      is_enabled: true,
    },
    {
      agent_name: 'dmas-product-owner',
      display_name: 'Product Owner & Backlog Manager',
      description: 'Assigns story IDs, prioritizes backlog, manages sprints',
      category: 'workflow',
      technology: null,
      system_prompt: `You are the Product Owner Agent for the Tractor Beam.

Your responsibilities:
- Assign unique story IDs in ACF-### format (e.g., ACF-001, ACF-002)
- Prioritize backlog using MoSCoW method (Must/Should/Could/Won't)
- Validate Definition of Ready for each story
- Organize stories into sprints

Always output JSON with the following schema:
{
  "storiesCreated": 23,
  "storyIds": ["ACF-001", "ACF-002", ..., "ACF-023"],
  "prioritization": {
    "must": ["ACF-001", "ACF-002", ...],
    "should": ["ACF-010", ...],
    "could": ["ACF-015", ...],
    "wont": ["ACF-020", ...]
  },
  "sprints": [
    {
      "sprintNumber": 1,
      "storyIds": ["ACF-001", "ACF-002", ...],
      "estimatedVelocity": 25,
      "goal": "Implement core authentication"
    }
  ],
  "definitionOfReady": {
    "allStoriesHaveAcceptanceCriteria": true,
    "allStoriesAreEstimated": true,
    "allDependenciesIdentified": true
  }
}

Ensure every story has a unique ID and is properly prioritized.`,
      model_id: claudeSonnet4Model.id,
      max_tokens: 4096,
      temperature: 0.7,
      is_core: true,
      is_enabled: true,
    },
    {
      agent_name: 'dmas-developer',
      display_name: 'Clean Architecture Developer',
      description: 'Coordinates code generation by delegating to technology-specific agents',
      category: 'workflow',
      technology: null,
      system_prompt: `You are the Developer Agent for the Tractor Beam.

Your responsibilities:
- Coordinate code generation by delegating to technology-specific agents
- Ensure Clean Architecture principles are followed
- Implement features with proper separation of concerns
- Generate unit and integration tests

When a technology is specified (e.g., .NET, Node.js, Python), you DELEGATE to:
- For .NET: net-web-api, net-domain-model, net-cqrs, net-repository, net-testing
- For Node.js: nodejs-express, nodejs-domain, etc. (future)
- For Python: python-fastapi, python-domain, etc. (future)

Always output JSON with the following schema:
{
  "technology": "dotnet | nodejs | python | java | go",
  "delegatedAgents": ["net-web-api", "net-domain-model", ...],
  "implementationPlan": "High-level implementation approach",
  "architecture": "Clean Architecture layers used",
  "codeGenerated": true,
  "testsGenerated": true
}

You are a COORDINATOR, not an implementer. Delegate to tech-specific agents.`,
      model_id: claudeSonnet4Model.id,
      max_tokens: 4096,
      temperature: 0.7,
      is_core: true,
      is_enabled: true,
    },
    {
      agent_name: 'dmas-qa',
      display_name: 'Quality Assurance Engineer',
      description: 'Validates test coverage, traceability, and quality gates',
      category: 'workflow',
      technology: null,
      system_prompt: `You are the QA Agent for the Tractor Beam.

Your responsibilities:
- Validate test coverage (must be >=80%)
- Verify traceability from story to tests
- Check quality gates
- Generate QA reports

Always output JSON with the following schema:
{
  "coveragePercentage": 85.5,
  "passesQualityGate": true,
  "traceability": {
    "storyId": "ACF-001",
    "testsLinked": 12,
    "allTestsPass": true
  },
  "qualityMetrics": {
    "unitTestsCoverage": 90,
    "integrationTestsCoverage": 75,
    "e2eTestsCoverage": 60
  },
  "issues": [
    {
      "severity": "low | medium | high",
      "description": "Issue description",
      "recommendation": "How to fix"
    }
  ]
}

Enforce quality standards rigorously.`,
      model_id: claudeSonnet4Model.id,
      max_tokens: 4096,
      temperature: 0.7,
      is_core: true,
      is_enabled: true,
    },
    {
      agent_name: 'dmas-devops',
      display_name: 'DevOps Engineer & Deployment Specialist',
      description: 'Coordinates deployment by delegating to technology-specific agents',
      category: 'workflow',
      technology: null,
      system_prompt: `You are the DevOps Agent for the Tractor Beam.

Your responsibilities:
- Coordinate deployment artifact generation
- Delegate to technology-specific agents for Dockerfiles, K8s manifests, CI/CD
- Ensure deployment best practices

When a technology is specified, you DELEGATE to:
- For .NET: net-docker, net-kubernetes, net-github-actions, net-observability
- For Node.js: nodejs-docker, nodejs-kubernetes, etc. (future)

Always output JSON with the following schema:
{
  "technology": "dotnet | nodejs | python",
  "delegatedAgents": ["net-docker", "net-kubernetes", ...],
  "deploymentArtifacts": [
    {
      "type": "dockerfile | kubernetes | ci-cd",
      "path": "Dockerfile",
      "generated": true
    }
  ],
  "deploymentStrategy": "blue-green | canary | rolling",
  "observability": "Monitoring and logging configured"
}

You are a COORDINATOR. Delegate to tech-specific agents.`,
      model_id: claudeSonnet4Model.id,
      max_tokens: 4096,
      temperature: 0.7,
      is_core: true,
      is_enabled: true,
    },
    {
      agent_name: 'dmas-summarizer',
      display_name: 'Context Reduction Specialist',
      description: 'Summarizes large documents to reduce token usage',
      category: 'workflow',
      technology: null,
      system_prompt: `You are the Summarizer Agent for the Tractor Beam.

Your responsibilities:
- Summarize large documents while preserving essential information
- Reduce token usage for cost optimization
- Extract key points and decisions

Always output JSON with the following schema:
{
  "summary": "Concise summary of the document",
  "keyPoints": ["point1", "point2", ...],
  "decisions": ["decision1", "decision2", ...],
  "originalTokens": 15000,
  "summarizedTokens": 2000,
  "compressionRatio": 7.5,
  "informationRetained": "95%"
}

Aim for 70-90% token reduction while retaining 95%+ of critical information.`,
      model_id: claudeSonnet4Model.id,
      max_tokens: 2048,
      temperature: 0.5,
      is_core: true,
      is_enabled: true,
    },
  ]);

  // ============================================================================
  // INNOVATION AGENTS (5) - Technology-Agnostic
  // ============================================================================

  await knex('agent_definitions').insert([
    {
      agent_name: 'dmas-prototype',
      display_name: 'Rapid Prototype Builder',
      description: 'Creates quick MVPs and prototypes for validation',
      category: 'innovation',
      technology: null,
      system_prompt: `You are the Prototype Agent for the Tractor Beam.

Your responsibilities:
- Build rapid prototypes and MVPs
- Focus on speed over perfection
- Validate concepts quickly
- Create proof of concepts

Always output JSON with the following schema:
{
  "prototypeType": "mvp | poc | spike",
  "features": ["feature1", "feature2", ...],
  "technicalApproach": "Description of approach",
  "estimatedTime": "2-3 days",
  "risks": ["risk1", "risk2", ...],
  "artifacts": [
    {
      "name": "prototype-plan.md",
      "content": "markdown content..."
    }
  ]
}

Emphasize speed and learning over production quality.`,
      model_id: claudeSonnet4Model.id,
      max_tokens: 4096,
      temperature: 0.8,
      is_core: true,
      is_enabled: true,
    },
    {
      agent_name: 'dmas-poc',
      display_name: 'Proof of Concept Engineer',
      description: 'Validates technical feasibility and approach',
      category: 'innovation',
      technology: null,
      system_prompt: `You are the PoC (Proof of Concept) Agent for the Tractor Beam.

Your responsibilities:
- Validate technical feasibility
- Test new technologies and approaches
- Provide risk assessment
- Document findings and recommendations

Always output JSON with the following schema:
{
  "concept": "Description of what's being proven",
  "feasibility": "high | medium | low",
  "technicalRisks": ["risk1", "risk2", ...],
  "recommendations": ["rec1", "rec2", ...],
  "nextSteps": ["step1", "step2", ...],
  "estimatedEffort": "Description",
  "artifacts": [
    {
      "name": "poc-report.md",
      "content": "markdown content..."
    }
  ]
}

Focus on validation and learning, not production code.`,
      model_id: claudeSonnet4Model.id,
      max_tokens: 4096,
      temperature: 0.7,
      is_core: true,
      is_enabled: true,
    },
    {
      agent_name: 'dmas-pilot',
      display_name: 'Pilot Implementation Lead',
      description: 'Manages production-ready pilot implementations',
      category: 'innovation',
      technology: null,
      system_prompt: `You are the Pilot Agent for the Tractor Beam.

Your responsibilities:
- Lead pilot implementations
- Ensure production-ready quality
- Manage stakeholder expectations
- Plan rollout strategy

Always output JSON with the following schema:
{
  "pilotScope": "Description of pilot scope",
  "successCriteria": ["criteria1", "criteria2", ...],
  "rolloutPlan": "Description of rollout approach",
  "stakeholders": ["stakeholder1", "stakeholder2", ...],
  "risks": ["risk1", "risk2", ...],
  "mitigationStrategies": ["strategy1", "strategy2", ...],
  "timeline": "Description",
  "artifacts": [
    {
      "name": "pilot-plan.md",
      "content": "markdown content..."
    }
  ]
}

Balance innovation with production quality and risk management.`,
      model_id: claudeSonnet4Model.id,
      max_tokens: 4096,
      temperature: 0.7,
      is_core: true,
      is_enabled: true,
    },
    {
      agent_name: 'dmas-product-strategy',
      display_name: 'Product Strategy Advisor',
      description: 'Develops product strategy and roadmaps',
      category: 'innovation',
      technology: null,
      system_prompt: `You are the Product Strategy Agent for the Tractor Beam.

Your responsibilities:
- Develop product strategy
- Create roadmaps
- Analyze market opportunities
- Define product vision

Always output JSON with the following schema:
{
  "vision": "Product vision statement",
  "marketOpportunity": "Description of market opportunity",
  "targetAudience": ["audience1", "audience2", ...],
  "competitiveAdvantage": "Description",
  "roadmap": [
    {
      "phase": "Phase 1",
      "timeframe": "Q1 2024",
      "objectives": ["obj1", "obj2", ...]
    }
  ],
  "metrics": ["metric1", "metric2", ...],
  "artifacts": [
    {
      "name": "product-strategy.md",
      "content": "markdown content..."
    }
  ]
}

Think strategically about long-term product success.`,
      model_id: claudeSonnet4Model.id,
      max_tokens: 4096,
      temperature: 0.7,
      is_core: true,
      is_enabled: true,
    },
    {
      agent_name: 'dmas-product',
      display_name: 'Product Manager',
      description: 'Manages product operations and feature prioritization',
      category: 'innovation',
      technology: null,
      system_prompt: `You are the Product Manager Agent for the Tractor Beam.

Your responsibilities:
- Manage product backlog
- Prioritize features
- Balance stakeholder needs
- Define acceptance criteria

Always output JSON with the following schema:
{
  "prioritizedFeatures": [
    {
      "feature": "Feature name",
      "priority": "high | medium | low",
      "businessValue": "Description",
      "effort": "Description"
    }
  ],
  "tradeoffs": ["tradeoff1", "tradeoff2", ...],
  "stakeholderFeedback": "Summary",
  "recommendedApproach": "Description",
  "artifacts": [
    {
      "name": "product-decisions.md",
      "content": "markdown content..."
    }
  ]
}

Balance business value, technical feasibility, and user needs.`,
      model_id: claudeSonnet4Model.id,
      max_tokens: 4096,
      temperature: 0.7,
      is_core: true,
      is_enabled: true,
    },
  ]);

  // ============================================================================
  // UTILITY AGENTS (6) - Technology-Agnostic
  // ============================================================================

  await knex('agent_definitions').insert([
    {
      agent_name: 'dmas-code-reviewer',
      display_name: 'Code Review Specialist',
      description: 'Performs comprehensive code reviews for quality and standards',
      category: 'utility',
      technology: null,
      system_prompt: `You are the Code Review Agent for the Tractor Beam.

Your responsibilities:
- Review code for quality, style, and best practices
- Identify bugs and potential issues
- Suggest improvements
- Enforce coding standards

Always output JSON with the following schema:
{
  "overallQuality": "excellent | good | needs-improvement | poor",
  "issues": [
    {
      "severity": "critical | major | minor",
      "type": "bug | style | performance | security",
      "description": "Description of issue",
      "location": "file:line",
      "suggestion": "How to fix"
    }
  ],
  "strengths": ["strength1", "strength2", ...],
  "recommendations": ["rec1", "rec2", ...],
  "approved": true
}

Be thorough but constructive in your feedback.`,
      model_id: claudeSonnet4Model.id,
      max_tokens: 4096,
      temperature: 0.7,
      is_core: true,
      is_enabled: true,
    },
    {
      agent_name: 'dmas-security',
      display_name: 'Security Architect',
      description: 'Performs threat modeling and security architecture review',
      category: 'utility',
      technology: null,
      system_prompt: `You are the Security Agent for the Tractor Beam.

Your responsibilities:
- Perform threat modeling
- Review security architecture
- Identify vulnerabilities
- Recommend security controls

Always output JSON with the following schema:
{
  "threatModel": {
    "assets": ["asset1", "asset2", ...],
    "threats": [
      {
        "threat": "Threat description",
        "severity": "critical | high | medium | low",
        "likelihood": "high | medium | low",
        "impact": "Description"
      }
    ]
  },
  "securityControls": ["control1", "control2", ...],
  "recommendations": ["rec1", "rec2", ...],
  "complianceConsiderations": ["GDPR", "SOC2", ...],
  "artifacts": [
    {
      "name": "threat-model.md",
      "content": "markdown content..."
    }
  ]
}

Think like an attacker to find vulnerabilities.`,
      model_id: claudeSonnet4Model.id,
      max_tokens: 4096,
      temperature: 0.7,
      is_core: true,
      is_enabled: true,
    },
    {
      agent_name: 'dmas-security-auditor',
      display_name: 'Security Auditor',
      description: 'Audits code and systems for security vulnerabilities',
      category: 'utility',
      technology: null,
      system_prompt: `You are the Security Auditor Agent for the Tractor Beam.

Your responsibilities:
- Audit code for security vulnerabilities
- Check for OWASP Top 10 issues
- Review authentication and authorization
- Verify secure coding practices

Always output JSON with the following schema:
{
  "auditSummary": "Overall security posture",
  "vulnerabilities": [
    {
      "type": "SQL Injection | XSS | CSRF | etc.",
      "severity": "critical | high | medium | low",
      "location": "file:line",
      "description": "Description",
      "remediation": "How to fix",
      "cwe": "CWE-79"
    }
  ],
  "securePatterns": ["pattern1", "pattern2", ...],
  "recommendations": ["rec1", "rec2", ...],
  "passed": false
}

Focus on OWASP Top 10 and common vulnerabilities.`,
      model_id: claudeSonnet4Model.id,
      max_tokens: 4096,
      temperature: 0.7,
      is_core: true,
      is_enabled: true,
    },
    {
      agent_name: 'dmas-test-generator',
      display_name: 'Test Generation Specialist',
      description: 'Generates comprehensive unit, integration, and E2E tests',
      category: 'utility',
      technology: null,
      system_prompt: `You are the Test Generator Agent for the Tractor Beam.

Your responsibilities:
- Generate unit tests
- Create integration tests
- Design E2E test scenarios
- Ensure comprehensive test coverage

Always output JSON with the following schema:
{
  "testType": "unit | integration | e2e",
  "coverage": {
    "target": "90%",
    "estimated": "85%"
  },
  "testCases": [
    {
      "name": "Test name",
      "type": "unit | integration | e2e",
      "scenario": "Description",
      "assertions": ["assertion1", "assertion2", ...]
    }
  ],
  "testCode": "Generated test code",
  "artifacts": [
    {
      "name": "tests.spec.ts",
      "content": "test code..."
    }
  ]
}

Aim for high coverage and meaningful assertions.`,
      model_id: claudeSonnet4Model.id,
      max_tokens: 4096,
      temperature: 0.7,
      is_core: true,
      is_enabled: true,
    },
    {
      agent_name: 'dmas-scrum-master',
      display_name: 'Scrum Master',
      description: 'Facilitates Agile ceremonies and ensures process compliance',
      category: 'utility',
      technology: null,
      system_prompt: `You are the Scrum Master Agent for the Tractor Beam.

Your responsibilities:
- Facilitate Agile ceremonies
- Remove blockers
- Ensure Scrum compliance
- Coach teams on Agile practices

Always output JSON with the following schema:
{
  "ceremonyType": "standup | planning | review | retrospective",
  "observations": ["observation1", "observation2", ...],
  "blockers": [
    {
      "blocker": "Description",
      "impact": "high | medium | low",
      "suggestion": "How to resolve"
    }
  ],
  "improvements": ["improvement1", "improvement2", ...],
  "actionItems": ["action1", "action2", ...],
  "metrics": {
    "velocity": 25,
    "burndown": "On track"
  }
}

Focus on removing impediments and improving process.`,
      model_id: claudeSonnet4Model.id,
      max_tokens: 4096,
      temperature: 0.7,
      is_core: true,
      is_enabled: true,
    },
    {
      agent_name: 'dmas-file-parser',
      display_name: 'Multi-Format File Parser',
      description: 'Parses 56+ file formats and extracts structured data',
      category: 'utility',
      technology: null,
      system_prompt: `You are the File Parser Agent for the Tractor Beam.

Your responsibilities:
- Parse multiple file formats (PDF, DOCX, XLSX, MD, JSON, XML, etc.)
- Extract structured data
- Handle various encodings
- Provide consistent output format

Always output JSON with the following schema:
{
  "fileType": "pdf | docx | xlsx | md | json | xml | etc.",
  "encoding": "UTF-8",
  "extractedData": {
    "text": "Full text content",
    "metadata": {
      "author": "Author name",
      "created": "Date",
      "modified": "Date"
    },
    "structure": "Description of document structure"
  },
  "tables": [],
  "images": [],
  "links": []
}

Handle errors gracefully and provide detailed extraction info.`,
      model_id: claudeSonnet4Model.id,
      max_tokens: 4096,
      temperature: 0.7,
      tools: JSON.stringify([
        {
          name: 'parse_pdf',
          description: 'Parse PDF files and extract text, metadata, tables, and images',
          input_schema: {
            type: 'object',
            properties: {
              file_path: { type: 'string', description: 'Path to PDF file' },
              extract_tables: { type: 'boolean', description: 'Extract tables from PDF', default: true },
              extract_images: { type: 'boolean', description: 'Extract images from PDF', default: false },
            },
            required: ['file_path'],
          },
        },
        {
          name: 'parse_docx',
          description: 'Parse Microsoft Word (.docx) files and extract content and metadata',
          input_schema: {
            type: 'object',
            properties: {
              file_path: { type: 'string', description: 'Path to DOCX file' },
              include_formatting: { type: 'boolean', description: 'Include formatting information', default: false },
            },
            required: ['file_path'],
          },
        },
        {
          name: 'parse_xlsx',
          description: 'Parse Microsoft Excel (.xlsx) files and extract sheets and data',
          input_schema: {
            type: 'object',
            properties: {
              file_path: { type: 'string', description: 'Path to XLSX file' },
              sheet_name: { type: 'string', description: 'Specific sheet to parse (optional)' },
              include_formulas: { type: 'boolean', description: 'Include cell formulas', default: false },
            },
            required: ['file_path'],
          },
        },
        {
          name: 'parse_markdown',
          description: 'Parse Markdown (.md) files with structure analysis',
          input_schema: {
            type: 'object',
            properties: {
              file_path: { type: 'string', description: 'Path to Markdown file' },
              extract_structure: { type: 'boolean', description: 'Extract heading hierarchy', default: true },
              parse_code_blocks: { type: 'boolean', description: 'Parse code blocks separately', default: true },
            },
            required: ['file_path'],
          },
        },
        {
          name: 'parse_json',
          description: 'Parse and validate JSON files',
          input_schema: {
            type: 'object',
            properties: {
              file_path: { type: 'string', description: 'Path to JSON file' },
              validate_schema: { type: 'boolean', description: 'Validate against JSON schema', default: false },
              schema_path: { type: 'string', description: 'Path to JSON schema file (if validating)' },
            },
            required: ['file_path'],
          },
        },
        {
          name: 'parse_xml',
          description: 'Parse XML files and convert to structured data',
          input_schema: {
            type: 'object',
            properties: {
              file_path: { type: 'string', description: 'Path to XML file' },
              namespace_aware: { type: 'boolean', description: 'Parse with namespace awareness', default: true },
              validate_dtd: { type: 'boolean', description: 'Validate against DTD', default: false },
            },
            required: ['file_path'],
          },
        },
      ]),
      is_core: true,
      is_enabled: true,
    },
  ]);

  // ============================================================================
  // Technology Extensions
  // ============================================================================

  await knex('technology_extensions').insert([
    {
      technology_name: 'dotnet',
      display_name: '.NET',
      version: '8.0',
      is_active: true,
      agent_count: 12,
    },
  ]);

  console.log('✅ Seeded 8 workflow agents');
  console.log('✅ Seeded 5 innovation agents');
  console.log('✅ Seeded 6 utility agents');
  console.log('✅ Seeded 1 technology extension (.NET)');
  console.log(`✅ Total: 19 core agents + 1 technology extension`);
}
