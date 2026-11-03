import type { ProviderProfile } from '../../types/domain';
import { useI18n } from '../../i18n/useI18n';
import { Icon } from '../Icon';
import { ApiProviderRouteCardSection } from './ApiProviderRouteCardSection';

type ApiProviderAddViewProps = {
  api: ProviderProfile;
  onCreateProvider: () => void;
  onImportProvider: (provider: Partial<ProviderProfile>) => void;
  onImported: () => void;
};

export function ApiProviderAddView({
  api,
  onCreateProvider,
  onImportProvider,
  onImported
}: ApiProviderAddViewProps) {
  const { t } = useI18n();
  return (
    <div className="api-provider-add-view">
      <section className="api-provider-section api-provider-section-config api-provider-add-section">
        <div className="api-provider-section-head">
          <span className="api-provider-section-kicker">{t('apiProvider.add.kicker')}</span>
          <h3>{t('apiProvider.add.emptyTitle')}</h3>
        </div>
        <button type="button" className="btn-secondary api-provider-add-primary" onClick={onCreateProvider}>
          <Icon name="plus" size={14} />
          <span>{t('apiProvider.add.emptyAction')}</span>
        </button>
      </section>

      <ApiProviderRouteCardSection
        api={api}
        onImportProvider={onImportProvider}
        onImported={onImported}
      />
    </div>
  );
}
