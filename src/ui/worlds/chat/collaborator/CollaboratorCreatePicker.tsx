import { HelpHint } from '../../../HelpHint';
import { Icon } from '../../../Icon';
import { useI18n } from '../../../../i18n/useI18n';

type CollaboratorCreatePickerProps = {
  showCloseButton?: boolean;
  onCloseCreatePicker: () => void;
  onCreateFromBuilder: () => void;
  onCreateCustomCollaborator: () => void;
};

export function CollaboratorCreatePicker({
  showCloseButton = true,
  onCloseCreatePicker,
  onCreateFromBuilder,
  onCreateCustomCollaborator
}: CollaboratorCreatePickerProps) {
  const { t } = useI18n();

  return (
    <div className="persona-create-picker">
      <div className="persona-create-picker-head">
        <div className="persona-create-picker-title">
          <span className="menu-section-kicker menu-section-kicker-row">
            {t('collaborator.create.title')}
            <HelpHint
              label={t('collaborator.create.helpLabel')}
              text={t('collaborator.create.helpText')}
            />
          </span>
        </div>
        {showCloseButton ? (
          <button type="button" className="persona-create-picker-close" onClick={onCloseCreatePicker} aria-label={t('collaborator.create.closeAria')}>
            <Icon name="x" size={12} />
          </button>
        ) : null}
      </div>
      <div className="persona-create-picker-actions">
        <button type="button" className="persona-create-choice" onClick={onCreateFromBuilder}>
          <span className="persona-create-choice-icon" aria-hidden="true">
            <Icon name="personaCreate" size={22} />
          </span>
          <span className="persona-create-choice-copy">
            <strong>{t('collaborator.create.builder')}</strong>
          </span>
        </button>
        <button type="button" className="persona-create-choice persona-create-choice--primary" onClick={onCreateCustomCollaborator}>
          <span className="persona-create-choice-icon" aria-hidden="true">
            <Icon name="personaCustom" size={22} />
          </span>
          <span className="persona-create-choice-copy">
            <strong>{t('collaborator.create.custom')}</strong>
          </span>
        </button>
      </div>
    </div>
  );
}
