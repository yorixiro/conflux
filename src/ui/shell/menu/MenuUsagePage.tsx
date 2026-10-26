import type { MenuTokenUsageSummary } from '../../../app/shell/menuTokenUsage';
import type { RequestInsightEntry } from '../../../engines/request/requestInsightRuntime';
import { Icon } from '../../Icon';
import {
  MetricTile,
  ModelUsageGroupRow,
  ProviderUsageGroupRow,
  RequestReceiptRow,
  UsageEntryRow,
  formatSummaryNumber
} from './MenuUsageRows';
import { RequestTrendRow } from './MenuUsageTrendRows';
import { useI18n } from '../../../i18n';

type MenuUsagePageProps = {
  summary: MenuTokenUsageSummary;
  insights?: RequestInsightEntry[];
  onBack: () => void;
};

function formatPercent(numerator: number, denominator: number) {
  if (denominator <= 0) return '0%';
  return `${Math.round((numerator / denominator) * 100)}%`;
}

function RequestInsightCard({ entry, expanded }: { entry: RequestInsightEntry; expanded: boolean }) {
  const { t, formatNumber, language } = useI18n();
  const buckets = [
    { key: 'identity', tokens: entry.estimate.buckets.identity },
    { key: 'capability', tokens: entry.estimate.buckets.capability },
    { key: 'memory', tokens: entry.estimate.buckets.memory },
    { key: 'history', tokens: entry.estimate.buckets.history }
  ] as const;
  const bucketTotal = buckets.reduce((total, bucket) => total + bucket.tokens, 0);
  const usage = entry.usage;
  const cacheReported = usage && [usage.cachedInputTokens, usage.cacheMissInputTokens, usage.cacheCreationInputTokens]
    .some((value) => typeof value === 'number' && Number.isFinite(value));
  const cacheRead = usage?.cachedInputTokens;
  const cacheMiss = usage?.cacheMissInputTokens;
  const cacheDenominator = (cacheRead ?? 0) + (cacheMiss ?? 0);
  const cacheRate = cacheReported && typeof cacheRead === 'number' && cacheDenominator > 0
    ? formatPercent(cacheRead, cacheDenominator)
    : null;
  const numberOrUnreported = (value: number | undefined) =>
    typeof value === 'number' && Number.isFinite(value) ? formatNumber(value) : t('settings.usage.notRecorded');
  const totalRemoved = entry.material.removedByBudget + entry.material.removedByLimit + entry.material.removedToolMessages;
  const cachePlan = entry.cache.plan === 'explicit_anthropic_cache_control'
    ? t('settings.usage.insight.cacheExplicit')
    : entry.cache.plan === 'provider_automatic_or_unknown'
      ? t('settings.usage.insight.cacheAutomatic')
      : t('settings.usage.insight.cacheNotApplied');
  const phase = entry.phase === 'completed'
    ? t('settings.usage.phase.completed')
    : entry.phase === 'failed'
      ? t('settings.usage.phase.failed')
      : t('settings.usage.phase.prepared');

  return (
    <details className="usage-insight-card" open={expanded}>
      <summary className="usage-insight-summary">
        <span className="usage-insight-title">
          <strong>{entry.assistantName} · {entry.modelId}</strong>
          <small>{new Intl.DateTimeFormat(language, { hour: '2-digit', minute: '2-digit' }).format(new Date(entry.at))} · {entry.providerName} · {phase}</small>
        </span>
        <span className="usage-insight-total">{t('settings.usage.insight.estimated')} {formatNumber(entry.estimate.totalTokens)}</span>
      </summary>
      <div className="usage-insight-body">
        <div className="usage-insight-numbers">
          <span><small>{t('settings.usage.insight.estimatedInput')}</small><strong>{formatNumber(entry.estimate.totalTokens)}</strong></span>
          <span><small>{t('settings.usage.insight.actualInput')}</small><strong>{numberOrUnreported(usage?.inputTokens)}</strong></span>
          <span><small>{t('settings.usage.insight.actualOutput')}</small><strong>{numberOrUnreported(usage?.outputTokens)}</strong></span>
          <span><small>{t('settings.usage.insight.cacheRead')}</small><strong>{cacheReported ? numberOrUnreported(cacheRead) : t('settings.usage.notRecorded')}</strong></span>
        </div>
        <p className="usage-insight-hint">{t('settings.usage.insight.estimateNote', { budget: formatNumber(entry.estimate.budgetTokens) })}</p>
        {entry.estimate.overBudget ? <p className="usage-insight-warning">{t('settings.usage.insight.overBudget')}</p> : null}
        <div className="usage-insight-subhead">{t('settings.usage.insight.materials')}</div>
        <div className="usage-insight-buckets">
          {buckets.map((bucket) => (
            <div className="usage-insight-bucket" key={bucket.key}>
              <div className="usage-insight-bucket-label">
                <span>{t(`settings.usage.insight.bucket.${bucket.key}`)}</span>
                <strong>{formatNumber(bucket.tokens)}</strong>
              </div>
              <div className="usage-insight-track"><i style={{ width: `${bucketTotal > 0 ? (bucket.tokens / bucketTotal) * 100 : 0}%` }} /></div>
            </div>
          ))}
        </div>
        <p className="usage-insight-hint">{t('settings.usage.insight.bucketNote')}</p>
        <div className="usage-insight-facts">
          <span>{t('settings.usage.insight.history', { kept: formatNumber(entry.material.keptMessages), total: formatNumber(entry.material.sourceMessages) })}</span>
          <span>{t('settings.usage.insight.dropped', { count: formatNumber(totalRemoved) })}</span>
          <span>{t('settings.usage.insight.memory', { count: formatNumber(entry.material.memories), dropped: formatNumber(entry.material.memoryDropped) })}</span>
          <span>{t('settings.usage.insight.summaries', { count: formatNumber(entry.material.summaries) })}</span>
          <span>{t('settings.usage.insight.recall', { count: formatNumber(entry.material.recallCandidates) })}</span>
          <span>{t('settings.usage.insight.tools', { count: formatNumber(entry.material.tools) })}</span>
          <span>{t('settings.usage.insight.attachments', { count: formatNumber(entry.material.attachments) })}</span>
        </div>
        <p className="usage-insight-hint">{t('settings.usage.insight.droppedDetail', {
          limit: formatNumber(entry.material.removedByLimit),
          budget: formatNumber(entry.material.removedByBudget),
          tools: formatNumber(entry.material.removedToolMessages)
        })}</p>
        <div className="usage-insight-subhead">{t('settings.usage.insight.cacheState')}</div>
        <p className="usage-insight-hint">{cachePlan} · {t('settings.usage.insight.cacheCandidates', { count: formatNumber(entry.cache.eligibleBreakpoints) })}</p>
        <div className="usage-insight-cache-result">
          {cacheReported
            ? <strong>{t('settings.usage.insight.cacheObserved', { tokens: numberOrUnreported(cacheRead), rate: cacheRate ?? t('settings.usage.notRecorded') })}</strong>
            : <strong>{t('settings.usage.insight.cacheUnknown')}</strong>}
          {cacheReported ? <span>{t('settings.usage.insight.cacheMissObserved', { tokens: numberOrUnreported(cacheMiss) })}</span> : null}
        </div>
        <p className="usage-insight-hint">{t('settings.usage.insight.cacheNote')}</p>
      </div>
    </details>
  );
}

export function MenuUsagePage({ summary, insights = [], onBack }: MenuUsagePageProps) {
  const copy = useI18n();
  const { t, formatNumber } = copy;
  const cacheReadRate = summary.cacheReportedReplyCount > 0 && (summary.inputTokens || summary.cacheObservedInputTokens) > 0
    ? formatPercent(summary.cachedInputTokens, summary.inputTokens || summary.cacheObservedInputTokens)
    : t('settings.usage.notRecorded');
  const observedCacheRate = summary.cacheReportedReplyCount > 0 && summary.cacheObservedInputTokens > 0
    ? formatPercent(summary.cachedInputTokens, summary.cacheObservedInputTokens)
    : t('settings.usage.notRecorded');
  const cacheMissLabel = summary.cacheMissInputTokens > 0
    ? t('settings.usage.cacheMissShort', { tokens: formatSummaryNumber(summary.cacheMissInputTokens, copy) })
    : t('settings.usage.cacheMissUnreported');
  const cacheReadBarWidth = (summary.inputTokens || summary.cacheObservedInputTokens) > 0
    ? Math.min(100, Math.round((summary.cachedInputTokens / (summary.inputTokens || summary.cacheObservedInputTokens)) * 100))
    : 0;

  return (
    <div className="menu-sheet-page menu-usage-page">
      <div className="menu-sheet-header">
        <button type="button" className="menu-sheet-back" aria-label={t('settings.pageBack')} onClick={onBack}>
          <span className="menu-sheet-back-icon"><Icon name="chevron" size={26} /></span>
        </button>
        <div className="menu-sheet-title">
          <small>{t('settings.usage.sectionRequestLedger')}</small>
          <h2>{t('settings.usage.title')}</h2>
        </div>
      </div>

      <section className="menu-section usage-insight-section">
        <div className="menu-section-head">
          <span className="menu-section-kicker">{t('settings.usage.insight.section')}</span>
        </div>
        <p className="usage-insight-intro">{t('settings.usage.insight.intro')}</p>
        {insights.length > 0 ? (
          <div className="usage-insight-list">
            {insights.map((entry, index) => (
              <RequestInsightCard key={entry.requestId} entry={entry} expanded={index === 0} />
            ))}
          </div>
        ) : <div className="usage-empty-state">{t('settings.usage.insight.empty')}</div>}
      </section>

      <section className="menu-section">
        <div className="menu-section-head">
          <span className="menu-section-kicker">{t('settings.usage.sectionSummary')}</span>
        </div>
        <div className="usage-overview-grid">
          <MetricTile label={t('settings.usage.totalTokens')} value={summary.totalTokens} detail={t('settings.usage.replyCount', { count: formatNumber(summary.replyCount) })} tone="primary" />
          <MetricTile
            label={t('settings.usage.cacheCoverage')}
            value={cacheReadRate}
            detail={t('settings.usage.cacheReadDetail', {
              cached: formatSummaryNumber(summary.cachedInputTokens, copy),
              input: formatSummaryNumber(summary.inputTokens, copy)
            })}
            tone="primary"
          />
          <MetricTile
            label={t('settings.usage.reportedHitRate')}
            value={observedCacheRate}
            detail={t('settings.usage.reportedDetail', {
              reported: formatNumber(summary.cacheReportedReplyCount),
              unreported: formatNumber(summary.cacheUnreportedReplyCount)
            })}
          />
          <MetricTile label={t('settings.usage.requestReceipts')} value={summary.requestReceiptCount} detail={t('settings.usage.cacheCandidateCount', { count: formatNumber(summary.cacheEligibleRequestCount) })} />
          <MetricTile label={t('settings.usage.duplicateInfoGroups')} value={summary.duplicateInfoGroupCount} detail={t('settings.usage.byRequestHash')} />
          <MetricTile label={t('settings.usage.shrinkCandidates')} value={summary.shrinkPlanCount} detail={t('settings.usage.estimatedSavings', { tokens: formatSummaryNumber(summary.shrinkPlanSavingsTokens, copy) })} />
        </div>
        <div className="usage-cache-panel">
          <div className="usage-cache-panel-head">
            <strong>{t('settings.usage.cacheSaved')}</strong>
            <span>{formatSummaryNumber(summary.cachedInputTokens, copy)} input token</span>
          </div>
          <div className="usage-cache-bar" aria-label={t('settings.usage.cacheReadRateAria', { rate: cacheReadRate })}>
            <i style={{ width: `${cacheReadBarWidth}%` }} />
          </div>
          <div className="usage-cache-panel-foot">
            <span>{t('settings.usage.cacheRead')} {formatSummaryNumber(summary.cachedInputTokens, copy)}</span>
            <span>{cacheMissLabel}</span>
            <span>{t('settings.usage.cacheUnreportedCount', { count: formatNumber(summary.cacheUnreportedReplyCount) })}</span>
            <span>{t('settings.usage.cacheZeroReadCount', { count: formatNumber(summary.cacheZeroReadReplyCount) })}</span>
          </div>
        </div>
        {summary.providerGroups.length > 0 ? (
          <div className="usage-model-panel">
            <div className="usage-model-panel-head">
              <strong>{t('settings.usage.providerDistribution')}</strong>
              <span>{t('settings.usage.providerCount', { count: formatNumber(summary.providerGroups.length) })}</span>
            </div>
            <div className="usage-model-list">
              {summary.providerGroups.map((group) => (
                <ProviderUsageGroupRow key={group.id} group={group} />
              ))}
            </div>
          </div>
        ) : null}
        {summary.modelGroups.length > 0 ? (
          <div className="usage-model-panel">
            <div className="usage-model-panel-head">
              <strong>{t('settings.usage.modelDistribution')}</strong>
              <span>{t('settings.usage.modelCount', { count: formatNumber(summary.modelGroups.length) })}</span>
            </div>
            <div className="usage-model-list">
              {summary.modelGroups.map((group) => (
                <ModelUsageGroupRow key={group.id} group={group} />
              ))}
            </div>
          </div>
        ) : null}
        <div className="usage-metric-grid usage-secondary-metrics">
          <MetricTile label={t('settings.usage.input')} value={summary.inputTokens} />
          <MetricTile label={t('settings.usage.output')} value={summary.outputTokens} />
          <MetricTile label={t('settings.usage.cacheRead')} value={summary.cachedInputTokens} />
          <MetricTile label={t('settings.usage.cacheMiss')} value={summary.cacheMissInputTokens} />
          <MetricTile label={t('settings.usage.cacheWrite')} value={summary.cacheCreationInputTokens} />
          {summary.reasoningTokens > 0 ? <MetricTile label={t('settings.usage.reasoning')} value={summary.reasoningTokens} /> : null}
        </div>
      </section>

      <section className="menu-section">
        <div className="menu-section-head">
          <span className="menu-section-kicker">{t('settings.usage.sectionReceipts')}</span>
        </div>
        {summary.requestTrends.length > 0 ? (
          <div className="usage-trend-list">
            {summary.requestTrends.map((trend) => (
              <RequestTrendRow key={trend.laneId} trend={trend} />
            ))}
          </div>
        ) : null}
        {summary.recentRequestReceipts.length > 0 ? (
          <div className="usage-entry-list">
            {summary.recentRequestReceipts.map((entry) => (
              <RequestReceiptRow key={entry.requestId} entry={entry} />
            ))}
          </div>
        ) : (
          <div className="usage-empty-state">{t('settings.usage.noRequestReceipts')}</div>
        )}
      </section>

      <section className="menu-section">
        <div className="menu-section-head">
          <span className="menu-section-kicker">{t('settings.usage.sectionRecent')}</span>
        </div>
        {summary.recentEntries.length > 0 ? (
          <div className="usage-entry-list">
            {summary.recentEntries.map((entry) => (
              <UsageEntryRow key={entry.id} entry={entry} />
            ))}
          </div>
        ) : (
          <div className="usage-empty-state">{t('settings.usage.noUsageEntries')}</div>
        )}
      </section>
    </div>
  );
}
