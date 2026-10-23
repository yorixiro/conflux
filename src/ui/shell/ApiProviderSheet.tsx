import { useEffect, useRef, useState } from 'react';
import type { PointerEvent as ReactPointerEvent } from 'react';
import { resolveProviderCapability } from '../../engines/provider-runtime';
import type { ProviderBatchConnectionTestState } from '../../app/shell/providerBatchConnectionTest';
import { useI18n } from '../../i18n/useI18n';
import type { ProviderProfile } from '../../types/domain';
import { HelpHint } from '../HelpHint';
import { Icon } from '../Icon';
import { RuntimePerformanceSurfaceMounted } from '../runtime-performance/RuntimePerformanceSurfaceSignals';
import { ApiProviderAddView } from './ApiProviderAddView';
import { ApiProviderConfigForm } from './ApiProviderConfigForm';
import { ApiProviderListView } from './ApiProviderListView';
import { getProviderModelDisplayLabel } from './apiProviderDisplay';

type ApiTestResult = null | { ok: boolean; message: string };

type ApiProviderSheetProps = {
  open: boolean;
  providers: ProviderProfile[];
  activeProviderId: string | null;
  api: ProviderProfile;
  apiTesting: boolean;
  apiTestResult: ApiTestResult;
  apiBatchTestState: ProviderBatchConnectionTestState;
  onBackToMenu: () => void;
  onClose: () => void;
  onSetActiveProvider: (providerId: string) => void;
  onCreateProvider: (namePrefix?: string) => void;
  onImportProvider: (provider: Partial<ProviderProfile>) => void;
  onDuplicateProvider: (duplicateName?: string) => void;
  onDeleteProvider: () => void;
  onSetApiConfig: (patch: Partial<ProviderProfile>) => void;
  onRunApiTest: () => Promise<void>;
  onRunProviderBatchTest: () => Promise<void>;
};

export function ApiProviderSheet({
  open,
  providers,
  activeProviderId,
  api,
  apiTesting,
  apiTestResult,
  apiBatchTestState,
  onBackToMenu,
  onClose,
  onSetActiveProvider,
  onCreateProvider,
  onImportProvider,
  onDuplicateProvider,
  onDeleteProvider,
  onSetApiConfig,
  onRunApiTest,
  onRunProviderBatchTest
}: ApiProviderSheetProps) {
  const { t } = useI18n();
  if (!open) return null;
  const builtInProvider = resolveProviderCapability(api).route.isBuiltInTrial;
  const publicTrialProvider = builtInProvider;

  const [view, setView] = useState<'list' | 'add' | 'detail'>('list');
  const [modelPickerOpen, setModelPickerOpen] = useState(false);
  const [sheetHeight, setSheetHeight] = useState<number | null>(null);
  const [dragging, setDragging] = useState(false);
  const sheetRef = useRef<HTMLDivElement | null>(null);
  const dragStateRef = useRef<null | {
    pointerId: number;
    startY: number;
    startHeight: number;
    minHeight: number;
    maxHeight: number;
  }>(null);

  // The provider sheet should keep a stable frame while the keyboard opens.
  // visualViewport shrinks on iOS input focus, which makes the whole drawer
  // jump downward; use the layout viewport instead so only the visible area changes.
  const getViewportHeight = () => window.innerHeight;
  const getMinSheetHeight = () => {
    const viewportHeight = getViewportHeight();
    return Math.round(viewportHeight * (window.innerWidth <= 640 ? 0.94 : 0.9));
  };
  const getMaxSheetHeight = () => Math.max(getMinSheetHeight(), Math.round(getViewportHeight() - 8));

  useEffect(() => {
    setModelPickerOpen(false);
  }, [activeProviderId, api.baseUrl, api.path, api.protocol, open, view]);

  useEffect(() => {
    const syncSheetHeight = () => {
      const nextMin = getMinSheetHeight();
      const nextMax = getMaxSheetHeight();
      setSheetHeight((current) => {
        if (current == null) return nextMin;
        return Math.min(nextMax, Math.max(nextMin, current));
      });
    };

    syncSheetHeight();
    window.addEventListener('resize', syncSheetHeight);
    window.addEventListener('orientationchange', syncSheetHeight);
    window.visualViewport?.addEventListener('resize', syncSheetHeight);
    return () => {
      window.removeEventListener('resize', syncSheetHeight);
      window.removeEventListener('orientationchange', syncSheetHeight);
      window.visualViewport?.removeEventListener('resize', syncSheetHeight);
    };
  }, []);

  useEffect(() => {
    const handlePointerMove = (event: PointerEvent) => {
      const dragState = dragStateRef.current;
      if (!dragState || event.pointerId !== dragState.pointerId) return;
      const delta = dragState.startY - event.clientY;
      const nextHeight = Math.min(
        dragState.maxHeight,
        Math.max(dragState.minHeight, dragState.startHeight + delta)
      );
      setSheetHeight(nextHeight);
    };

    const finishDrag = (event: PointerEvent) => {
      const dragState = dragStateRef.current;
      if (!dragState || event.pointerId !== dragState.pointerId) return;
      dragStateRef.current = null;
      setDragging(false);
    };

    window.addEventListener('pointermove', handlePointerMove);
    window.addEventListener('pointerup', finishDrag);
    window.addEventListener('pointercancel', finishDrag);
    return () => {
      window.removeEventListener('pointermove', handlePointerMove);
      window.removeEventListener('pointerup', finishDrag);
      window.removeEventListener('pointercancel', finishDrag);
    };
  }, []);

  const handlePointerDown = (event: ReactPointerEvent<HTMLDivElement>) => {
    if (event.button !== 0) return;
    const minHeight = getMinSheetHeight();
    const maxHeight = getMaxSheetHeight();
    const startHeight = sheetRef.current?.getBoundingClientRect().height ?? sheetHeight ?? minHeight;
    dragStateRef.current = {
      pointerId: event.pointerId,
      startY: event.clientY,
      startHeight,
      minHeight,
      maxHeight
    };
    setDragging(true);
    event.preventDefault();
  };

  const showingDetail = view === 'detail';
  const showingAdd = view === 'add';

  const handleBackClick = () => {
    if (showingDetail || showingAdd) {
      setView('list');
      return;
    }
    onBackToMenu();
  };

  const handleSelectProvider = (providerId: string) => {
    const nextProvider = providers.find((provider) => provider.id === providerId) ?? null;
    onSetActiveProvider(providerId);
    if (nextProvider && resolveProviderCapability(nextProvider).route.isBuiltInTrial) {
      return;
    }
    setView('detail');
  };

  const handleCreateProvider = () => {
    onCreateProvider(t('apiProvider.defaultRouteNamePrefix'));
    setView('detail');
  };

  const handleDeleteProvider = () => {
    onDeleteProvider();
    setView('list');
  };

  return (
    <div className="settings-overlay api-provider-overlay" onClick={(event) => { if (event.target === event.currentTarget) onClose(); }}>
      <div
        ref={sheetRef}
        className={`settings-sheet api-provider-sheet ${dragging ? 'dragging' : ''}`}
        style={sheetHeight ? { height: `${sheetHeight}px` } : undefined}
      >
        <RuntimePerformanceSurfaceMounted surface="provider-sheet" />
        <div className="sheet-drag-zone" onPointerDown={handlePointerDown}>
          <div className="sheet-handle sheet-handle-draggable" />
        </div>
        <div className="sheet-surface-header">
          <button
            type="button"
            className="menu-sheet-back"
            aria-label={showingDetail || showingAdd ? t('apiProvider.backToList') : t('apiProvider.backToMenu')}
            onClick={handleBackClick}
          >
            <span className="menu-sheet-back-icon"><Icon name="chevron" size={26} /></span>
          </button>
          <button type="button" className="close-btn" aria-label={t('apiProvider.close')} onClick={onClose}>
            <Icon name="x" size={14} />
          </button>
        </div>
        <div className="api-provider-hero">
          <div className="api-provider-hero-copy">
            <h2>
              {showingDetail ? api.name : showingAdd ? t('apiProvider.addTitle') : t('apiProvider.title')}
              <HelpHint
                className="help-hint--inline-title help-hint--below"
                label={t('apiProvider.helpLabel')}
                text={t('apiProvider.helpText')}
              />
            </h2>
          </div>
          {showingDetail ? (
            <div className={`api-provider-hero-badge ${publicTrialProvider ? 'locked' : ''}`}>
              <strong>{t('apiProvider.routeConfigBadge')}</strong>
              <span>
                {getProviderModelDisplayLabel(
                  api,
                  t('apiProvider.model.emptyFallback'),
                  t('apiProvider.model.builtInPlaceholder')
                )}
              </span>
            </div>
          ) : null}
        </div>

        <div className="api-provider-sheet-scroll">
          {!showingDetail ? (
            showingAdd ? (
              <ApiProviderAddView
                api={api}
                onCreateProvider={handleCreateProvider}
                onImportProvider={onImportProvider}
                onImported={() => setView('detail')}
              />
            ) : (
              <ApiProviderListView
                providers={providers}
                activeProviderId={activeProviderId}
                batchTestState={apiBatchTestState}
                onCreateProvider={() => setView('add')}
                onSelectProvider={handleSelectProvider}
                onRunProviderBatchTest={onRunProviderBatchTest}
              />
            )
          ) : (
            <>
              <ApiProviderConfigForm
                api={api}
                providers={providers}
                modelPickerOpen={modelPickerOpen}
                apiTesting={apiTesting}
                apiTestResult={apiTestResult}
                onSetApiConfig={onSetApiConfig}
                onToggleModelPicker={() => setModelPickerOpen((prev) => !prev)}
                onRunApiTest={onRunApiTest}
              />
              <details className="api-provider-more-settings">
                <summary>{t('apiProvider.setup.manage')}</summary>
                <div className="provider-stack api-provider-control-layer api-provider-detail-actions">
                  <div className="provider-inline-actions api-provider-inline-actions">
                    <button
                      type="button"
                      className="btn-secondary"
                      onClick={() => onDuplicateProvider(t('apiProvider.duplicateName', { name: api.name }))}
                      disabled={!activeProviderId || builtInProvider}
                    >
                      {t('apiProvider.duplicateAsNew')}
                    </button>
                    <button type="button" className="btn-secondary danger" onClick={handleDeleteProvider} disabled={!activeProviderId || providers.length <= 1 || builtInProvider}>
                      {t('apiProvider.deleteCurrent')}
                    </button>
                  </div>
                </div>
              </details>
            </>
          )}
        </div>
        <div className="api-provider-footer">
          <button type="button" className="btn-secondary" onClick={onClose}>{t('apiProvider.done')}</button>
        </div>
      </div>
    </div>
  );
}
