import type { MenuTokenUsageSummary } from '../../../app/shell/menuTokenUsage';
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
  onBack: () => void;
};

function formatPercent(numerator: number, denominator: number) {
  if (denominator <= 0) return '0%';
  return `${Math.round((numerator / denominator) * 100)}%`;
}

export function MenuUsagePage({ summary, onBack }: MenuUsagePageProps) {
  const copy = useI18n();
  const { t, formatNumber } = copy;
  const hasReportedCacheRate = summary.cacheObservedInputTokens > 0 && summary.cacheReportedReplyCount > 0;
  const hasCompleteCacheCoverage = hasReportedCacheRate && summary.cacheUnreportedReplyCount === 0;
  const observedCacheRate = hasReportedCacheRate
    ? formatPercent(summary.cachedInputTokens, summary.cacheObservedInputTokens)
    : t('settings.usage.notRecorded');
  // The global coverage cannot treat providers that omit cache usage as zero hits.
  const cacheReadRate = hasCompleteCacheCoverage
    ? observedCacheRate
    : t('settings.usage.notRecorded');
  const cacheMissLabel = summary.cacheReportedReplyCount > 0
    ? t('settings.usage.cacheMissShort', { tokens: formatSummaryNumber(summary.cacheMissInputTokens, copy) })
    : t('settings.usage.cacheMissUnreported');
  const cacheReadBarWidth = hasCompleteCacheCoverage
    ? Math.min(100, Math.round((summary.cachedInputTokens / summary.cacheObservedInputTokens) * 100))
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
