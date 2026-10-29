import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it } from 'vitest';
import type { MenuTokenUsageSummary } from '../../../app/shell/menuTokenUsage';
import { MenuUsagePage } from './MenuUsagePage';

function createSummary(): MenuTokenUsageSummary {
  return {
    replyCount: 1,
    requestReceiptCount: 2,
    totalTokens: 360,
    inputTokens: 240,
    outputTokens: 120,
    cachedInputTokens: 120,
    cacheMissInputTokens: 120,
    cacheObservedInputTokens: 240,
    cacheCreationInputTokens: 30,
    cacheReportedReplyCount: 1,
    cacheUnreportedReplyCount: 0,
    cacheZeroReadReplyCount: 0,
    reasoningTokens: 0,
    cacheEligibleRequestCount: 2,
    duplicateInfoGroupCount: 1,
    shrinkPlanCount: 1,
    shrinkPlanSavingsTokens: 42,
    providerGroups: [{
      id: 'Packy',
      providerName: 'Packy',
      modelNames: ['model-a'],
      assistantNames: ['灯塔'],
      replyCount: 2,
      latestTimestamp: 2,
      totalTokens: 360,
      inputTokens: 240,
      outputTokens: 120,
      cachedInputTokens: 120,
      cacheMissInputTokens: 120,
      cacheObservedInputTokens: 240,
      cacheCreationInputTokens: 30,
      cacheReportedReplyCount: 1,
      cacheUnreportedReplyCount: 0,
      cacheZeroReadReplyCount: 0,
      reasoningTokens: 0
    }],
    modelGroups: [{
      id: 'model-a',
      model: 'model-a',
      assistantNames: ['灯塔'],
      replyCount: 2,
      latestTimestamp: 2,
      totalTokens: 360,
      inputTokens: 240,
      outputTokens: 120,
      cachedInputTokens: 120,
      cacheMissInputTokens: 120,
      cacheObservedInputTokens: 240,
      cacheCreationInputTokens: 30,
      cacheReportedReplyCount: 1,
      cacheUnreportedReplyCount: 0,
      cacheZeroReadReplyCount: 0,
      reasoningTokens: 0
    }],
    recentEntries: [],
    recentRequestReceipts: [],
    requestTrends: [{
      laneId: 'Packy:灯塔:model-a',
      assistantName: '灯塔',
      providerName: 'Packy',
      modelId: 'model-a',
      requestCount: 2,
      latestTimestamp: 2,
      stableChangedCount: 0,
      dynamicChangedCount: 1,
      toolChangedCount: 1,
      averageCacheReadRate: 0.5,
      duplicateInfoDeltaTotal: 1,
      latestCacheBreakpoints: [{
        name: 'capability_prefix',
        eligible: true,
        estimatedTokens: 2048,
        deltaTokens: 256,
        reason: null,
        fingerprint: 'breakpoint-hash-latest',
        fingerprintStatus: 'changed'
      }],
      latestCachePrefixBlocks: [{
        id: 'prompt:tool_catalog_capability',
        label: '工具目录',
        intent: 'tool_capability',
        estimatedTokens: 160,
        deltaTokens: 32,
        fingerprint: 'tool-block-hash-latest',
        fingerprintStatus: 'changed'
      }],
      latestIntentBreakdown: [
        {
          intent: 'tool_capability',
          blockCount: 2,
          estimatedTokens: 160,
          deltaTokens: 32
        },
        {
          intent: 'task_context',
          blockCount: 1,
          estimatedTokens: 64,
          deltaTokens: -32
        }
      ],
      recentRequests: [{
        requestId: 'req-latest',
        timestamp: 2,
        fingerprints: {
          stablePrompt: 'stable-hash-latest',
          dynamicContext: 'dynamic-hash-latest',
          toolCapabilities: 'tool-hash-latest',
          fullRequest: 'full-hash-latest'
        },
        stablePrompt: 'same',
        dynamicContext: 'changed',
        toolCapabilities: 'changed',
        changedDynamicIntents: ['task_context'],
        cacheReadRate: 0.5,
        duplicateInfoDelta: 1,
        duplicateInfoCount: 1,
        shrinkPlanCount: 1,
        shrinkPlanSavingsTokens: 42,
        shrinkPlans: [{
          planId: 'shrink:test:exact',
          overlapKey: 'test:tool',
          strategy: 'exact_duplicate',
          confidence: 'high',
          reason: 'test shrink plan',
          estimatedSavingsTokens: 42,
          affectedLanes: ['tool_schema'],
          affectedLabels: ['工具目录', '系统身份'],
          keepBlockLabels: ['工具目录'],
          candidateDropBlockLabels: ['系统身份']
        }],
        cacheEligibleBreakpoints: 1,
        cacheBreakpoints: [{
          name: 'capability_prefix',
          eligible: true,
          estimatedTokens: 2048,
          deltaTokens: 256,
          reason: null,
          fingerprint: 'breakpoint-hash-latest',
          fingerprintStatus: 'changed'
        }],
        cachePrefixBlocks: [{
          id: 'prompt:tool_catalog_capability',
          label: '工具目录',
          intent: 'tool_capability',
          estimatedTokens: 160,
          deltaTokens: 32,
          fingerprint: 'tool-block-hash-latest',
          fingerprintStatus: 'changed'
        }],
        tokenUsage: {
          inputTokens: 240,
          cachedInputTokens: 120,
          cacheMissInputTokens: 120,
          cacheCreationInputTokens: 30
        },
        cacheReportStatus: 'reported',
        intentBreakdown: [
          {
            intent: 'tool_capability',
            blockCount: 2,
            estimatedTokens: 160,
            deltaTokens: 32
          }
        ]
      }]
    }]
  };
}

describe('MenuUsagePage', () => {
  it('does not present unreported cache usage as a zero-percent cache hit', () => {
    const summary = {
      ...createSummary(),
      cachedInputTokens: 0,
      cacheMissInputTokens: 0,
      cacheObservedInputTokens: 0,
      cacheReportedReplyCount: 0,
      cacheUnreportedReplyCount: 1
    };
    const html = renderToStaticMarkup(<MenuUsagePage summary={summary} onBack={() => {}} />);

    expect(html).toContain('缓存覆盖率</span><strong>未记录</strong>');
    expect(html).toContain('已报告命中率</span><strong>未记录</strong>');
  });

  it('keeps the reported-only rate when some replies have no cache report', () => {
    const summary = {
      ...createSummary(),
      cacheUnreportedReplyCount: 1
    };
    const html = renderToStaticMarkup(<MenuUsagePage summary={summary} onBack={() => {}} />);

    expect(html).toContain('缓存覆盖率</span><strong>未记录</strong>');
    expect(html).toContain('已报告命中率</span><strong>50%</strong>');
  });

  it('renders expandable request trend details', () => {
    const html = renderToStaticMarkup(<MenuUsagePage summary={createSummary()} onBack={() => {}} />);

    expect(html).toContain('最新结构分布');
    expect(html).toContain('缓存省下');
    expect(html).toContain('供应商分布');
    expect(html).toContain('Packy');
    expect(html).toContain('模型分布');
    expect(html).toContain('model-a');
    expect(html).toContain('能力断点');
    expect(html).toContain('工具目录');
    expect(html).toContain('+256');
    expect(html).toContain('未命中');
    expect(html).toContain('数字后面是相对上一轮的变化');
    expect(html).toContain('工具');
    expect(html).toContain('+32');
    expect(html).toContain('命中/未命中');
    expect(html).toContain('动态变化');
    expect(html).toContain('缩减候选');
    expect(html).toContain('完全重复');
    expect(html).toContain('预计省');
  });
});
