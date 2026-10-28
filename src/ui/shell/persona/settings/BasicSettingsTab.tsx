import { useEffect, useId, useRef } from 'react';
import { useI18n } from '../../../../i18n/useI18n';
import { type PersonaTabProps } from '../personaUiShared';
import { CollaboratorAvatarEditor } from '../../../collection/info/CollaboratorAvatarEditor';
import { isProductGuidePersona } from '../../../../engines/personaBuiltin';
import { PromptSettingsTab } from './PromptSettingsTab';

export function BasicSettingsTab({
  activePersona,
  activeCollaboratorId,
  onSelectPersonaAvatar,
  onSetPersonaAvatarIcon,
  onSetPersonaAvatarShape,
  onSetPersonaAvatarSize,
  onUpdatePersona,
  onDeletePersona,
  deletePersonaLabel,
  deletePersonaHint
}: PersonaTabProps) {
  const { t } = useI18n();
  const fieldId = useId();
  const isGuide = isProductGuidePersona(activePersona);
  const lastNonEmptyNameRef = useRef(activePersona?.name?.trim() || t('collaborator.basic.defaultName'));
  const collaboratorName = activePersona?.name.trim() || t('collaborator.info.fallbackName');
  const resolvedDeleteLabel = deletePersonaLabel ?? t('collaborator.info.deleteLabel', { name: collaboratorName });
  const resolvedDeleteHint = deletePersonaHint ?? t('collaborator.info.deleteHint');

  useEffect(() => {
    const trimmedName = activePersona?.name.trim();
    if (trimmedName) {
      lastNonEmptyNameRef.current = trimmedName;
    }
  }, [activePersona?.id, activePersona?.name]);

  return (
    <>
      {activePersona && onSelectPersonaAvatar && onSetPersonaAvatarIcon && onSetPersonaAvatarShape && onSetPersonaAvatarSize ? (
        <details className="conflux-role-avatar-settings">
          <summary>头像设置</summary>
          <div className="collaborator-avatar-inline-grid">
            {(['assistant', 'user'] as const).map(role => (
              <CollaboratorAvatarEditor
                key={role}
                compact
                label={role === 'assistant' ? collaboratorName : t('room.settings.userAvatarLabel')}
                role={role}
                seed={activePersona.id}
                assetId={role === 'assistant' ? activePersona.assistantAvatarAssetId : activePersona.userAvatarAssetId}
                iconId={role === 'assistant' ? activePersona.assistantAvatarIconId : activePersona.userAvatarIconId}
                shape={role === 'assistant' ? activePersona.assistantAvatarShape : activePersona.userAvatarShape}
                size={role === 'assistant' ? activePersona.assistantAvatarSize : activePersona.userAvatarSize}
                onSelectFiles={files => onSelectPersonaAvatar(role, files)}
                onSetIcon={icon => onSetPersonaAvatarIcon(role, icon)}
                onSetShape={shape => onSetPersonaAvatarShape(role, shape)}
                onSetSize={size => onSetPersonaAvatarSize(role, size)}
              />
            ))}
          </div>
        </details>
      ) : null}
      <div className="ps-field">
        <label className="ps-field-label" htmlFor={`${fieldId}-name`}>角色名称</label>
        <input
          id={`${fieldId}-name`}
          className="ps-input"
          value={activePersona?.name || ''}
          readOnly={isGuide}
          onChange={event => onUpdatePersona({ name: event.target.value })}
          onBlur={() => {
            if (activePersona?.name.trim()) return;
            onUpdatePersona({ name: lastNonEmptyNameRef.current });
          }}
          placeholder={t('collaborator.basic.namePlaceholder')}
        />
      </div>
      <div className="ps-field">
        <label className="ps-field-label" htmlFor={`${fieldId}-description`}>角色简介</label>
        <input id={`${fieldId}-description`} className="ps-input" readOnly={isGuide} value={activePersona?.description || ''}
          onChange={event => onUpdatePersona({ description: event.target.value })} placeholder={t('collaborator.basic.descriptionPlaceholder')} />
      </div>

      <div className="ps-field">
        <div className="ps-field-head">
          <label className="ps-field-label" htmlFor={`${fieldId}-user`}>{t('collaborator.basic.userNameLabel')}</label>
          <span className="ps-field-hint">{t('collaborator.basic.userNameHint')}</span>
        </div>
        <input
          className="ps-input"
          id={`${fieldId}-user`}
          value={activePersona?.userName || ''}
          onChange={(event) => onUpdatePersona({ userName: event.target.value })}
          placeholder={t('collaborator.basic.userNamePlaceholder')}
        />
      </div>

      <div className="ps-field">
        <div className="ps-field-head">
          <label className="ps-field-label" htmlFor={`${fieldId}-purpose`}>{t('collaborator.basic.purposeLabel')}</label>
          <span className="ps-field-hint">{t('collaborator.basic.purposeHint')}</span>
        </div>
        <textarea
          className="ps-textarea"
          id={`${fieldId}-purpose`}
          rows={3}
          readOnly={isGuide}
          value={activePersona?.purpose || ''}
          onChange={(e) => onUpdatePersona({ purpose: e.target.value })}
          placeholder={t('collaborator.basic.purposePlaceholder')}
        />
      </div>

      <PromptSettingsTab activeCollaboratorId={activeCollaboratorId} activePersona={activePersona} onUpdatePersona={onUpdatePersona} />

      {activePersona && onDeletePersona ? (
        <div className="collaborator-identity-danger-zone">
          <button
            type="button"
            className="collaborator-identity-delete-button"
            onClick={onDeletePersona}
          >
            {resolvedDeleteLabel}
          </button>
          <span>{resolvedDeleteHint}</span>
        </div>
      ) : null}
    </>
  );
}
