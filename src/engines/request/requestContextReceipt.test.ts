import { describe, expect, it } from 'vitest';
import type { AssistantPromptPart } from './requestAudit';
import { assembleAssistantContext } from './requestContext';
import { buildRequestContextReceipt, fingerprintRequestContextValue } from './requestContextReceipt';

function promptPart(seed: {
  name: AssistantPromptPart['name'];
  label: string;
  layer: AssistantPromptPart['layer'];
  content: string;
}): AssistantPromptPart & { role: 'system' } {
  return {
    ...seed,
    role: 'system',
    truncationPriority: 10,
    enabled: Boolean(seed.content),
    charCount: seed.content.length
  };
}

function emptyCachePlan() {
  return {
    minimumBreakpointTokens: 1024,
    requestApplication: {
      status: 'provider_automatic_or_unknown' as const,
      label: 'provider cache',
      sendsExplicitCacheControl: false
    },
    breakpoints: []
  };
}

function emptyMemoryPlan() {
  return {
    selectedLines: [],
    estimatedTokens: 0,
    maxTokens: null,
    status: 'empty' as const,
    entries: []
  };
}

function emptyConversationSummaryPlan() {
  return {
    status: 'empty' as const,
    selectedSummaries: [],
    estimatedTokens: 0,
    maxTokens: null,
    maxChars: null,
    entries: []
  };
}

function emptySemanticRecallPlan() {
  return {
    status: 'not_configured' as const,
    strategy: 'none' as const,
    config: {
      recentTailConversationCount: 3,
      recentTailUserMessageCount: 3,
      voiceAnchorCount: 3
    },
    selectedCandidates: [],
    estimatedTokens: 0,
    maxTokens: null,
    entries: []
  };
}

describe('requestContextReceipt', () => {
  it('keeps stable, dynamic, tool, and full request fingerprints separate', () => {
    const selectedPromptParts = [
      promptPart({
        name: 'system_identity',
        label: 'system identity',
        layer: 'identity',
        content: 'fixed identity'
      }),
      promptPart({
        name: 'model_runtime_context',
        label: 'model runtime',
        layer: 'context',
        content: 'runtime hint one'
      }),
      promptPart({
        name: 'tool_catalog_capability',
        label: 'tools',
        layer: 'capability',
        content: 'tool A'
      })
    ];
    const context = assembleAssistantContext({
      systemPrompts: selectedPromptParts.map((part) => part.content),
      messages: [{
        id: 'user-1',
        role: 'user',
        content: 'hello',
        timestamp: 1
      }],
      messagesPrepared: true,
      tools: [{
        type: 'function',
        function: {
          name: 'createCodeCard',
          description: 'create card',
          parameters: {}
        }
      }],
      toolChoice: 'auto'
    });
    const contextPlan = {
      protectedMessageId: 'user-1',
      historyMode: 'conversation' as const,
      entries: [],
      units: [{
        unitId: 'unit-1',
        kind: 'user_turn' as const,
        messageIds: ['user-1'],
        estimatedTokens: 12,
        status: 'kept' as const,
        protectedBy: 'current_user_message' as const
      }],
      summaries: []
    };
    const receipt = buildRequestContextReceipt({
      selectedPromptParts,
      context,
      contextPlan,
      memoryPlan: emptyMemoryPlan(),
      conversationSummaryPlan: emptyConversationSummaryPlan(),
      semanticRecallPlan: emptySemanticRecallPlan(),
      cachePlan: emptyCachePlan(),
      tooling: {
        enabled: true,
        toolCount: 1,
        toolChoice: 'auto',
        toolNames: ['createCodeCard']
      }
    });
    const changedDynamicReceipt = buildRequestContextReceipt({
      selectedPromptParts: selectedPromptParts.map((part) => (
        part.name === 'model_runtime_context'
          ? { ...part, content: 'runtime hint two', charCount: 'runtime hint two'.length }
          : part
      )),
      context,
      contextPlan,
      memoryPlan: emptyMemoryPlan(),
      conversationSummaryPlan: emptyConversationSummaryPlan(),
      semanticRecallPlan: emptySemanticRecallPlan(),
      cachePlan: emptyCachePlan(),
      tooling: {
        enabled: true,
        toolCount: 1,
        toolChoice: 'auto',
        toolNames: ['createCodeCard']
      }
    });

    expect(receipt.fingerprints.stablePrompt).toBe(changedDynamicReceipt.fingerprints.stablePrompt);
    expect(receipt.fingerprints.dynamicContext).not.toBe(changedDynamicReceipt.fingerprints.dynamicContext);
    expect(receipt.fingerprints.toolCapabilities).toBe(changedDynamicReceipt.fingerprints.toolCapabilities);
    expect(receipt.fingerprints.fullRequest).not.toBe(changedDynamicReceipt.fingerprints.fullRequest);
    expect(receipt.blocks.find((block) => block.id === 'prompt:system_identity')?.topography).toMatchObject({
      lane: 'hard_rule',
      authority: 'hard_rule',
      sourceOwner: 'prompt_layers',
      overlapKey: 'identity:hard-rule'
    });
    expect(receipt.blocks.find((block) => block.id === 'tooling:schema')?.topography).toMatchObject({
      lane: 'tool_schema',
      authority: 'high',
      sourceOwner: 'tool_registry'
    });
    expect(receipt.blocks.find((block) => block.id === 'tooling:schema')).toMatchObject({
      charCount: expect.any(Number),
      estimatedTokens: expect.any(Number)
    });
    expect(receipt.blocks.find((block) => block.id === 'tooling:schema')?.charCount)
      .toBeGreaterThan('createCodeCard'.length);
  });

  it('records exact duplicate prompt information without storing another raw copy', () => {
    const repeated = 'same visible instruction';
    const selectedPromptParts = [
      promptPart({
        name: 'tool_capability',
        label: 'tool contract',
        layer: 'capability',
        content: repeated
      }),
      promptPart({
        name: 'tool_protocol_capability',
        label: 'tool protocol',
        layer: 'capability',
        content: repeated
      })
    ];
    const context = assembleAssistantContext({
      systemPrompts: selectedPromptParts.map((part) => part.content),
      messages: [],
      messagesPrepared: true,
    });
    const receipt = buildRequestContextReceipt({
      selectedPromptParts,
      context,
      contextPlan: {
        protectedMessageId: null,
        historyMode: 'conversation',
        entries: [],
        units: [],
        summaries: []
      },
      cachePlan: emptyCachePlan(),
      memoryPlan: emptyMemoryPlan(),
      conversationSummaryPlan: emptyConversationSummaryPlan(),
      semanticRecallPlan: emptySemanticRecallPlan(),
      tooling: {
        enabled: false,
        toolCount: 0,
        toolChoice: null,
        toolNames: []
      }
    });

    expect(receipt.duplicateInfo).toContainEqual(
      expect.objectContaining({
        count: 2,
        labels: ['tool contract', 'tool protocol']
      })
    );
    expect(receipt.topographyOverlap).toContainEqual(
      expect.objectContaining({
        overlapKey: 'tool:visible-capability',
        count: 2,
        labels: ['tool contract', 'tool protocol'],
        lanes: ['tool_schema'],
        sourceOwners: ['tool_registry'],
        exactDuplicateCount: 1
      })
    );
    expect(receipt.shrinkPlan).toContainEqual(
      expect.objectContaining({
        overlapKey: 'tool:visible-capability',
        strategy: 'exact_duplicate',
        confidence: 'high',
        keepBlockIds: ['prompt:tool_capability'],
        candidateDropBlockIds: ['prompt:tool_protocol_capability'],
        estimatedSavingsTokens: expect.any(Number),
        affectedLanes: ['tool_schema']
      })
    );
    expect(receipt.shrinkPlan[0]?.estimatedSavingsTokens).toBeGreaterThan(0);
    expect(JSON.stringify(receipt.duplicateInfo)).not.toContain(repeated);
    expect(JSON.stringify(receipt.topographyOverlap)).not.toContain(repeated);
    expect(JSON.stringify(receipt.shrinkPlan)).not.toContain(repeated);
  });

  it('fingerprints object key order deterministically', () => {
    expect(fingerprintRequestContextValue({ a: 1, b: 2 })).toBe(
      fingerprintRequestContextValue({ b: 2, a: 1 })
    );
  });

  it('records reference directories as expandable topography without duplicating prompt parts', () => {
    const selectedPromptParts = [
      promptPart({
        name: 'system_identity',
        label: 'system identity',
        layer: 'identity',
        content: 'fixed identity'
      })
    ];
    const context = assembleAssistantContext({
      systemPromptParts: selectedPromptParts,
      messages: [{
        id: 'user-1',
        role: 'user',
        content: 'read the reference if needed',
        timestamp: 1
      }],
      messagesPrepared: true,
      workspaceReferenceDocs: [{
        id: 'ref-1',
        projectId: 'project-1',
        title: 'World notes',
        summary: 'background',
        content: 'full body',
        source: 'manual',
        createdAt: 1,
        updatedAt: 1
      }]
    });
    const receipt = buildRequestContextReceipt({
      selectedPromptParts,
      context,
      contextPlan: {
        protectedMessageId: 'user-1',
        historyMode: 'conversation',
        entries: [{
          messageId: 'user-1',
          role: 'user',
          estimatedTokens: 12,
          status: 'kept',
          protectedBy: 'current_user_message'
        }],
        units: [],
        summaries: []
      },
      cachePlan: emptyCachePlan(),
      memoryPlan: emptyMemoryPlan(),
      conversationSummaryPlan: emptyConversationSummaryPlan(),
      semanticRecallPlan: emptySemanticRecallPlan(),
      tooling: {
        enabled: false,
        toolCount: 0,
        toolChoice: null,
        toolNames: []
      }
    });

    expect(receipt.blocks.filter((block) => block.id.startsWith('prompt:'))).toHaveLength(1);
    expect(receipt.blocks.find((block) => block.label === 'reference directory')).toMatchObject({
      intent: 'app_context',
      source: 'context_segment',
      cachePrefixEligible: true,
      topography: {
        lane: 'reference_directory',
        authority: 'medium',
        sourceOwner: 'app_runtime',
        expandability: 'directory_then_tool_read',
        overlapKey: 'reference:directory'
      }
    });
  });

  it('records user quote evidence as an observation without adding another request block', () => {
    const selectedPromptParts = [
      promptPart({
        name: 'system_identity',
        label: 'system identity',
        layer: 'identity',
        content: 'fixed identity'
      })
    ];
    const context = assembleAssistantContext({
      systemPromptParts: selectedPromptParts,
      messages: [
        {
          id: 'user-1',
          role: 'user',
          content: '用户 wants memory to feel grounded in actual phrasing.',
          timestamp: 1
        },
        {
          id: 'assistant-1',
          role: 'assistant',
          content: 'Understood.',
          timestamp: 2
        }
      ],
      messagesPrepared: true
    });
    const receipt = buildRequestContextReceipt({
      selectedPromptParts,
      context,
      contextPlan: {
        protectedMessageId: 'user-1',
        historyMode: 'conversation',
        entries: [{
          messageId: 'user-1',
          role: 'user',
          estimatedTokens: 12,
          status: 'kept',
          protectedBy: 'current_user_message'
        }],
        units: [],
        summaries: []
      },
      cachePlan: emptyCachePlan(),
      memoryPlan: emptyMemoryPlan(),
      conversationSummaryPlan: emptyConversationSummaryPlan(),
      semanticRecallPlan: emptySemanticRecallPlan(),
      tooling: {
        enabled: false,
        toolCount: 0,
        toolChoice: null,
        toolNames: []
      }
    });

    expect(receipt.blocks.filter((block) => block.topography.lane === 'quote_evidence')).toHaveLength(0);
    expect(receipt.topographyEvidence).toContainEqual(
      expect.objectContaining({
        id: 'evidence:quote:user-raw-tail',
        label: 'user quote evidence',
        itemCount: 1,
        sourceBlockIds: ['segment:1:conversation'],
        sourceMessageIds: ['user-1'],
        sourceMemoryIndexes: [],
        contentFingerprints: [expect.any(String)],
        topography: expect.objectContaining({
          lane: 'quote_evidence',
          authority: 'medium',
          sourceOwner: 'conversation_history',
          expandability: 'raw_history',
          overlapKey: 'quote:user-raw-tail'
        })
      })
    );
    expect(JSON.stringify(receipt.topographyEvidence)).not.toContain('actual phrasing');
  });

  it('detects exact fingerprint overlap between confirmed memory and quote evidence without storing raw text', () => {
    const selectedPromptParts = [
      promptPart({
        name: 'system_identity',
        label: 'system identity',
        layer: 'identity',
        content: 'fixed identity'
      })
    ];
    const rememberedLine = '用户 wants memory to feel grounded in actual phrasing.';
    const context = assembleAssistantContext({
      systemPromptParts: selectedPromptParts,
      messages: [{
        id: 'user-1',
        role: 'user',
        content: rememberedLine,
        timestamp: 1
      }],
      messagesPrepared: true,
      memoryLines: [rememberedLine]
    });
    const receipt = buildRequestContextReceipt({
      selectedPromptParts,
      context,
      contextPlan: {
        protectedMessageId: 'user-1',
        historyMode: 'conversation',
        entries: [{
          messageId: 'user-1',
          role: 'user',
          estimatedTokens: 12,
          status: 'kept',
          protectedBy: 'current_user_message'
        }],
        units: [],
        summaries: []
      },
      memoryPlan: {
        selectedLines: [rememberedLine],
        estimatedTokens: 12,
        maxTokens: null,
        status: 'within_budget',
        entries: [{
          text: rememberedLine,
          estimatedTokens: 12,
          status: 'kept'
        }]
      },
      conversationSummaryPlan: emptyConversationSummaryPlan(),
      semanticRecallPlan: emptySemanticRecallPlan(),
      cachePlan: emptyCachePlan(),
      tooling: {
        enabled: false,
        toolCount: 0,
        toolChoice: null,
        toolNames: []
      }
    });

    expect(receipt.topographyEvidence.map((entry) => entry.topography.lane)).toEqual([
      'quote_evidence',
      'confirmed_memory'
    ]);
    expect(receipt.topographyEvidenceOverlap).toEqual([
      expect.objectContaining({
        count: 2,
        lanes: ['quote_evidence', 'confirmed_memory'],
        evidenceIds: ['evidence:quote:user-raw-tail', 'evidence:memory:confirmed-lines'],
        sourceMessageIds: ['user-1'],
        sourceMemoryIndexes: [0]
      })
    ]);
    expect(JSON.stringify(receipt.topographyEvidenceOverlap)).not.toContain('actual phrasing');
  });

  it('records semantic recall candidates as candidate evidence without promoting them to memory', () => {
    const selectedPromptParts = [
      promptPart({
        name: 'system_identity',
        label: 'system identity',
        layer: 'identity',
        content: 'fixed identity'
      })
    ];
    const rememberedLine = '用户 wants memory to feel grounded in actual phrasing.';
    const candidateFingerprint = fingerprintRequestContextValue({
      kind: 'context-topography-evidence',
      text: rememberedLine
    });
    const context = assembleAssistantContext({
      systemPromptParts: selectedPromptParts,
      messages: [],
      messagesPrepared: true,
      memoryLines: [rememberedLine],
      semanticRecallCandidates: [{
        id: 'recall-1',
        kind: 'matched_context',
        label: 'older conversation candidate',
        sourceConversationId: 'conv-old',
        sourceMessageIds: ['user-old'],
        score: 0.8,
        text: rememberedLine
      }]
    });
    const receipt = buildRequestContextReceipt({
      selectedPromptParts,
      context,
      contextPlan: {
        protectedMessageId: null,
        historyMode: 'conversation',
        entries: [],
        units: [],
        summaries: []
      },
      memoryPlan: {
        selectedLines: [rememberedLine],
        estimatedTokens: 12,
        maxTokens: null,
        status: 'within_budget',
        entries: [{
          text: rememberedLine,
          estimatedTokens: 12,
          status: 'kept'
        }]
      },
      conversationSummaryPlan: emptyConversationSummaryPlan(),
      semanticRecallPlan: {
        status: 'within_budget',
        strategy: 'local_scan',
        config: {
          recentTailConversationCount: 3,
          recentTailUserMessageCount: 3,
          voiceAnchorCount: 3
        },
        selectedCandidates: [{
          id: 'recall-1',
          kind: 'matched_context',
          label: 'older conversation candidate',
          sourceConversationId: 'conv-old',
          sourceMessageIds: ['user-old'],
          estimatedTokens: 12,
          charCount: rememberedLine.length,
          score: 0.8,
          contentFingerprint: candidateFingerprint,
          status: 'kept'
        }],
        estimatedTokens: 12,
        maxTokens: null,
        entries: [{
          id: 'recall-1',
          kind: 'matched_context',
          label: 'older conversation candidate',
          sourceConversationId: 'conv-old',
          sourceMessageIds: ['user-old'],
          estimatedTokens: 12,
          charCount: rememberedLine.length,
          score: 0.8,
          contentFingerprint: candidateFingerprint,
          status: 'kept'
        }]
      },
      cachePlan: emptyCachePlan(),
      tooling: {
        enabled: false,
        toolCount: 0,
        toolChoice: null,
        toolNames: []
      }
    });

    expect(receipt.topographyEvidence.map((entry) => entry.topography.lane)).toEqual([
      'confirmed_memory',
      'retrieved_candidate'
    ]);
    expect(receipt.topographyEvidence).toContainEqual(
      expect.objectContaining({
        id: 'evidence:semantic-recall:candidates',
        source: 'semantic_recall_candidate',
        sourceBlockIds: ['segment:2:semantic_recall'],
        sourceMessageIds: ['user-old'],
        sourceMemoryIndexes: [],
        contentFingerprints: [candidateFingerprint],
        topography: expect.objectContaining({
          lane: 'retrieved_candidate',
          authority: 'candidate',
          sourceOwner: 'semantic_recall_plan',
          overlapKey: 'memory:retrieved-candidate'
        })
      })
    );
    expect(receipt.topographyEvidenceOverlap).toEqual([
      expect.objectContaining({
        lanes: ['confirmed_memory', 'retrieved_candidate'],
        evidenceIds: ['evidence:memory:confirmed-lines', 'evidence:semantic-recall:candidates'],
        sourceMessageIds: ['user-old'],
        sourceMemoryIndexes: [0]
      })
    ]);
    expect(JSON.stringify(receipt.topographyEvidenceOverlap)).not.toContain('actual phrasing');
  });

  it('records conversation summaries as summary-only cross-conversation material', () => {
    const selectedPromptParts = [
      promptPart({
        name: 'system_identity',
        label: 'system identity',
        layer: 'identity',
        content: 'fixed identity'
      })
    ];
    const content = '用户 常用短句指出结构问题，助手需要补完整责任链。';
    const contentFingerprint = fingerprintRequestContextValue({
      kind: 'conversation-summary',
      text: content.replace(/\s+/g, ' ')
    });
    const context = assembleAssistantContext({
      systemPromptParts: selectedPromptParts,
      messages: [],
      messagesPrepared: true,
      conversationSummaries: [{
        id: 'summary-profile',
        kind: 'relational_profile',
        title: '互动画像',
        content,
        sequence: 1,
        sourceConversationIds: ['conversation-old'],
        sourceMessageIds: ['user-old'],
        sourceCharCount: 50_000,
        estimatedTokens: 20,
        charCount: content.length,
        contentFingerprint,
        generatedAt: 1,
        updatedAt: 2,
        expiresAt: null,
        status: 'kept'
      }]
    });
    const receipt = buildRequestContextReceipt({
      selectedPromptParts,
      context,
      contextPlan: {
        protectedMessageId: null,
        historyMode: 'conversation',
        entries: [],
        units: [],
        summaries: []
      },
      memoryPlan: emptyMemoryPlan(),
      conversationSummaryPlan: {
        status: 'within_budget',
        selectedSummaries: [{
          id: 'summary-profile',
          kind: 'relational_profile',
          title: '互动画像',
          content,
          sequence: 1,
          sourceConversationIds: ['conversation-old'],
          sourceMessageIds: ['user-old'],
          sourceCharCount: 50_000,
          estimatedTokens: 20,
          charCount: content.length,
          contentFingerprint,
          generatedAt: 1,
          updatedAt: 2,
          expiresAt: null,
          status: 'kept'
        }],
        estimatedTokens: 20,
        maxTokens: null,
        maxChars: null,
        entries: []
      },
      semanticRecallPlan: emptySemanticRecallPlan(),
      cachePlan: emptyCachePlan(),
      tooling: {
        enabled: false,
        toolCount: 0,
        toolChoice: null,
        toolNames: []
      }
    });

    expect(receipt.blocks.find((block) => block.id.endsWith(':conversation_summary'))).toMatchObject({
      label: 'conversation_summary',
      intent: 'conversation_summary',
      source: 'context_segment',
      cachePrefixEligible: true,
      topography: {
        lane: 'conversation_summary',
        authority: 'medium',
        sourceOwner: 'conversation_summary_plan',
        overlapKey: 'memory:conversation-summary'
      }
    });
    expect(receipt.topographyEvidence).toContainEqual(expect.objectContaining({
      id: 'evidence:conversation-summary:entries',
      source: 'conversation_summary',
      sourceBlockIds: ['segment:1:conversation_summary'],
      sourceMessageIds: ['user-old'],
      sourceMemoryIndexes: [],
      contentFingerprints: [contentFingerprint],
      topography: expect.objectContaining({
        lane: 'conversation_summary',
        expandability: 'summary_only'
      })
    }));
    expect(JSON.stringify(receipt.blocks)).not.toContain('用户 常用短句');
  });

  it('records semantic recall context segments as retrieved-candidate material', () => {
    const selectedPromptParts = [
      promptPart({
        name: 'system_identity',
        label: 'system identity',
        layer: 'identity',
        content: 'fixed identity'
      })
    ];
    const context = assembleAssistantContext({
      systemPromptParts: selectedPromptParts,
      messages: [],
      messagesPrepared: true,
      semanticRecallCandidates: [{
        id: 'recall:old:user-old',
        kind: 'matched_context',
        label: '旧对话',
        sourceConversationId: 'old',
        sourceMessageIds: ['user-old'],
        score: 0.42,
        text: '召回候选片段应该作为候选材料进入上下文。'
      }]
    });
    const receipt = buildRequestContextReceipt({
      selectedPromptParts,
      context,
      contextPlan: {
        protectedMessageId: null,
        historyMode: 'conversation',
        entries: [],
        units: [],
        summaries: []
      },
      memoryPlan: emptyMemoryPlan(),
      conversationSummaryPlan: emptyConversationSummaryPlan(),
      semanticRecallPlan: emptySemanticRecallPlan(),
      cachePlan: emptyCachePlan(),
      tooling: {
        enabled: false,
        toolCount: 0,
        toolChoice: null,
        toolNames: []
      }
    });

    expect(receipt.blocks.find((block) => block.id.endsWith(':semantic_recall'))).toMatchObject({
      label: 'semantic_recall',
      intent: 'semantic_recall',
      source: 'context_segment',
      cachePrefixEligible: false,
      topography: {
        lane: 'retrieved_candidate',
        authority: 'candidate',
        sourceOwner: 'semantic_recall_plan',
        overlapKey: 'memory:retrieved-candidate'
      }
    });
    expect(JSON.stringify(receipt.blocks)).not.toContain('召回候选片段');
  });
});
