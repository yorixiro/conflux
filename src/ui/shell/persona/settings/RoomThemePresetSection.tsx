import { listStudioThemePresets } from '../../../../config/theme/themePresets';

type RoomThemePresetSectionProps = {
  activePresetId: string | null;
  onApplyPreset: (presetId: string) => void;
};

const PRESET_DESCRIPTIONS: Record<string, string> = {
  'polaris-default': '原始简约外观',
  'keke-doodle': '铅笔线条 · 手账贴纸',
  'keke-pois': '灰粉波点 · 像素贴饰'
};

export function RoomThemePresetSection({ activePresetId, onApplyPreset }: RoomThemePresetSectionProps) {
  return (
    <section className="theme-studio-section room-theme-preset-section" aria-label="聊天主题">
      <div className="theme-studio-section-head">
        <div>
          <h3>聊天主题</h3>
          <p>切换外观；原来的角色、对话、消息和操作都会保留。</p>
        </div>
      </div>
      <div className="room-theme-preset-grid" role="group" aria-label="可用主题">
        {listStudioThemePresets().map((preset) => (
          <button
            key={preset.id}
            type="button"
            className={`room-theme-preset-card${activePresetId === preset.id ? ' active' : ''}`}
            data-theme-preview={preset.id}
            aria-pressed={activePresetId === preset.id}
            onClick={() => onApplyPreset(preset.id)}
          >
            <span className="room-theme-preset-art" aria-hidden="true">
              <span className="room-theme-preset-bubble" />
              <span className="room-theme-preset-bubble" />
            </span>
            <strong>{preset.id === 'polaris-default' ? '默认' : preset.name.replace('克克 / ', '')}</strong>
            <span className="room-theme-preset-description">{PRESET_DESCRIPTIONS[preset.id]}</span>
          </button>
        ))}
      </div>
    </section>
  );
}
