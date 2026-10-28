import { useState } from 'react';
import { resolveProviderCapability } from '../../engines/provider-runtime';
import {
  formatProviderBatchConnectionErrorReport,
  type ProviderBatchConnectionTestCopy,
  type ProviderBatchConnectionTestState
} from '../../app/shell/providerBatchConnectionTest';
import { useI18n } from '../../i18n/useI18n';
import type { I18nTranslator } from '../../i18n/translator';
import type { ProviderProfile } from '../../types/domain';
import { Icon, type IconName } from '../Icon';
import { getProviderMissingFields, getProviderModelDisplayLabel } from './apiProviderDisplay';

type ApiProviderListViewProps = {
  providers: ProviderProfile[];
  activeProviderId: string | null;
  batchTestState: ProviderBatchConnectionTestState;
  onCreateProvider: () => void;
  onSelectProvider: (providerId: string) => void;
  onRunProviderBatchTest: () => Promise<void>;
};

type ProviderListStatus = {
  label: string;
  tone: 'active' | 'ready' | 'warning' | 'muted';
};

function createBatchTestCopy(t: I18nTranslator['t']): ProviderBatchConnectionTestCopy {
  return {
    missingModel: t('apiProvider.batch.missingModel'),
    queued: t('apiProvider.batch.queued'),
    empty: t('apiProvider.batch.empty'),
    running: t('apiProvider.batch.running'),
    missingProvider: t('apiProvider.batch.missingProvider'),
    connected: t('apiProvider.batch.connected'),
    doneWithFailures: (failed, passed) => t('apiProvider.batch.doneWithFailures', { failed, passed }),
    doneSuccess: (passed) => t('apiProvider.batch.doneSuccess', { passed }),
    reportTitle: t('apiProvider.batch.reportTitle'),
    reportResult: (message) => t('apiProvider.batch.reportResult', { message }),
    reportProgress: (state) => t('apiProvider.batch.reportProgress', state)
  };
}

function resolveProviderListStatus(
  provider: ProviderProfile,
  t: I18nTranslator['t']
): ProviderListStatus | null {
  if (resolveProviderCapability(provider).route.isBuiltInTrial) {
    return { label: t('apiProvider.list.statusBuiltIn'), tone: 'muted' };
  }

  const missing = getProviderMissingFields(provider);
  if (missing.includes('baseUrl') || missing.includes('model')) {
    return { label: t('apiProvider.list.statusIncomplete'), tone: 'muted' };
  }

  if (missing.includes('apiKey')) {
    return { label: t('apiProvider.list.statusMissingKey'), tone: 'warning' };
  }

  return { label: t('apiProvider.list.statusReady'), tone: 'ready' };
}

function getProviderListDetail(provider: ProviderProfile, t: I18nTranslator['t']) {
  return getProviderModelDisplayLabel(
    provider,
    t('apiProvider.model.emptyFallback'),
    t('apiProvider.model.builtInPlaceholder')
  );
}

function resolveBatchTestStatusLabel(state: ProviderBatchConnectionTestState, t: I18nTranslator['t']) {
  if (state.status === 'running') return t('apiProvider.list.batchRunning', { completed: state.completed, total: state.total });
  if (state.status === 'success') return t('apiProvider.list.batchSuccess', { passed: state.passed });
  if (state.status === 'error') return state.total > 0 ? t('apiProvider.list.batchError', { failed: state.failed }) : t('apiProvider.list.batchUnavailable');
  return t('apiProvider.list.batchIdle');
}

function resolveBatchTestIconName(state: ProviderBatchConnectionTestState): IconName {
  if (state.status === 'success') return 'check';
  if (state.status === 'error') return 'x';
  return 'sparkle';
}

export function ApiProviderListView({
  providers,
  activeProviderId,
  batchTestState,
  onCreateProvider,
  onSelectProvider,
  onRunProviderBatchTest
}: ApiProviderListViewProps) {
  const { t } = useI18n();
  const [detailsOpen, setDetailsOpen] = useState(false);
  const [copyCopied, setCopyCopied] = useState(false);
  const batchTestRunning = batchTestState.status === 'running';
  const batchTestFailed = batchTestState.status === 'error';
  const batchTestCopy = createBatchTestCopy(t);
  const batchTestReport = formatProviderBatchConnectionErrorReport(batchTestState, batchTestCopy);

  async function copyBatchTestReport() {
    await navigator.clipboard?.writeText(batchTestReport);
    setCopyCopied(true);
    window.setTimeout(() => setCopyCopied(false), 1200);
  }

  return (
    <div className="api-provider-list-view">
      <p className="api-provider-inline-note">{t('apiProvider.setup.routeScope')}</p>
      <div className="api-provider-list-actions">
        <button type="button" className="btn-secondary api-provider-create-button" onClick={onCreateProvider}>
          <Icon name="plus" size={14} />
          <span>{t('apiProvider.defaultRouteNamePrefix')}</span>
        </button>
      </div>
      <div className="api-provider-list-card">
        {providers.map((provider) => {
          const active = provider.id === activeProviderId;
          const builtInProvider = resolveProviderCapability(provider).route.isBuiltInTrial;
          const status = resolveProviderListStatus(provider, t);
          return (
            <button
              key={provider.id}
              type="button"
              className={`api-provider-list-row ${active ? 'active' : ''} ${builtInProvider ? 'readonly' : ''}`}
              onClick={() => {
                onSelectProvider(provider.id);
              }}
            >
              <span className="api-provider-list-icon">
                <Icon name={active ? 'check' : 'providerRoute'} size={17} />
              </span>
              <span className="api-provider-list-copy">
                <strong>{provider.name}</strong>
                <span>{getProviderListDetail(provider, t)}</span>
                {active ? <small className="api-provider-default-label">{t('apiProvider.list.statusActive')}</small> : null}
              </span>
              {status ? <span className={`api-provider-list-pill ${status.tone}`}>{status.label}</span> : null}
              {!builtInProvider ? (
                <span className="api-provider-list-chevron">
                  <Icon name="chevron" size={16} />
                </span>
              ) : null}
            </button>
          );
        })}
      </div>
      <details className="api-provider-more-settings">
        <summary>{t('apiProvider.setup.connectionChecks')}</summary>
        <p className="api-provider-inline-note">{t('apiProvider.setup.testCost')}</p>
        <div className="api-provider-batch-test">
          <button
            type="button"
            className="btn-secondary api-provider-batch-test-button"
            onClick={() => { void onRunProviderBatchTest(); }}
            disabled={batchTestRunning}
          >
            <Icon name="sparkle" size={14} />
            <span>{t('apiProvider.list.runBatchTest')}</span>
          </button>
          <button
            type="button"
            className={`api-provider-batch-test-status ${batchTestState.status}`}
            aria-label={batchTestFailed ? t('apiProvider.list.viewBatchError') : resolveBatchTestStatusLabel(batchTestState, t)}
            onClick={() => {
              if (batchTestFailed) setDetailsOpen((current) => !current);
            }}
            disabled={!batchTestFailed}
          >
            <span className={`api-provider-batch-test-orbit ${batchTestRunning ? 'spinning' : ''}`} aria-hidden="true">
              <Icon name={resolveBatchTestIconName(batchTestState)} size={14} />
            </span>
            <span>{resolveBatchTestStatusLabel(batchTestState, t)}</span>
          </button>
        </div>
        {detailsOpen && batchTestFailed ? (
          <div className="api-provider-batch-error-popover" role="dialog" aria-label={t('apiProvider.list.batchErrorTitle')}>
            <div className="api-provider-batch-error-head">
              <strong>{t('apiProvider.list.batchErrorTitle')}</strong>
              <button
                type="button"
                className="api-provider-batch-error-close"
                aria-label={t('apiProvider.list.closeBatchError')}
                onClick={() => setDetailsOpen(false)}
              >
                <Icon name="x" size={13} />
              </button>
            </div>
            <div className="api-provider-batch-error-list">
              {batchTestState.entries.filter((entry) => entry.status === 'error').map((entry) => (
                <div key={entry.providerId} className="api-provider-batch-error-item">
                  <strong>{entry.providerName}</strong>
                  <span>{entry.model}</span>
                  <p>{entry.message}</p>
                </div>
              ))}
              {batchTestState.entries.every((entry) => entry.status !== 'error') && batchTestState.message ? (
                <div className="api-provider-batch-error-item">
                  <p>{batchTestState.message}</p>
                </div>
              ) : null}
            </div>
            <button
              type="button"
              className="btn-secondary compact api-provider-batch-error-copy"
              onClick={() => { void copyBatchTestReport(); }}
            >
              <Icon name="copy" size={13} />
              <span>{copyCopied ? t('apiProvider.list.copied') : t('apiProvider.list.copyError')}</span>
            </button>
          </div>
        ) : null}
      </details>
    </div>
  );
}
