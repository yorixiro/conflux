import { useState } from 'react';
import type { Persona } from '../../types/domain';
import { useSpaceStore } from '../../stores/spaceStore';
import { PersonaAvatar } from '../collaborator/PersonaAvatar';
import { SidebarCalendar } from './SidebarCalendar';

function spiral(cx: number, cy: number, radius: number, turns: number, direction: number) {
  let path = '';
  const steps = Math.round(turns * 14);
  for (let index = 0; index <= steps; index += 1) {
    const t = index / steps;
    const angle = direction * t * turns * 2 * Math.PI;
    const r = radius * t;
    path += `${index ? 'L' : 'M'}${(cx + r * Math.cos(angle)).toFixed(1)} ${(cy + r * Math.sin(angle)).toFixed(1)}`;
  }
  return path;
}

/** The actual notebook paper, punch holes, swirls and source-profile stamp. */
export function KekeSidebarPaper() {
  return <div className="keke-sidebar-paper-art" aria-hidden="true">
    <svg className="keke-spirals"><defs><pattern id="keke-paper-spiral" width="72" height="72" patternUnits="userSpaceOnUse">
      <path d={spiral(18, 18, 10, 2.3, 1)} /><path d={spiral(54, 54, 10, 2.3, -1)} />
    </pattern></defs><rect width="100%" height="100%" fill="url(#keke-paper-spiral)" /></svg>
    <div className="keke-punch-holes"><i /><i /><i /><i /></div>
    <span className="keke-profile-stamp">✧ profile no.01</span>
  </div>;
}

const TODO_LABELS = ['好好吃饭', '画一点点', '早点睡 ☾'];

export function KekeSidebarProfile({ persona, conversationCount, onEdit }: {
  persona: Persona | null;
  conversationCount: number;
  onEdit: () => void;
}) {
  const theme = useSpaceStore((state) => state.theme.activePresetId);
  const applyTheme = useSpaceStore((state) => state.applyThemePreset);
  const isPois = theme === 'keke-pois';
  const [checked, setChecked] = useState<boolean[]>([false, false, false]);
  const name = persona?.name.trim() || '克克';
  const description = persona?.description.trim();

  return <div className="keke-profile-sheet">
    <img className="keke-profile-ribbon" alt="" src={isPois ? '/theme-assets/keke/pois-hanger.webp' : '/theme-assets/keke/doodle-hanger.webp'} />
    <span className="keke-ribbon-washi" aria-hidden="true" />

    <div className="keke-profile-avatar-row">
      <span className="keke-profile-avatar">
        {persona ? <PersonaAvatar role="assistant" seed={persona.id} assetId={persona.assistantAvatarAssetId} iconId={persona.assistantAvatarIconId} shape={persona.assistantAvatarShape} size={64} /> : <span>克</span>}
      </span>
      <img className="keke-avatar-sticker" src={isPois ? '/theme-assets/keke/pois-disc.webp' : '/theme-assets/keke/doodle-disc.webp'} alt="" />
    </div>
    <div className="keke-profile-name"><b>{name}</b><span>( ˶ˆᗜˆ˵ )</span></div>
    <div className="keke-profile-status"><i /> toujours là · 今天也在</div>
    <div className="keke-profile-divider"><i /><b>✛</b><i /></div>

    <div className="keke-profile-facts">
      <dl>
        <dt>备注</dt><dd>{description ? description.slice(0, 18) : '只准看一眼 ✳'}</dd>
        <dt>心情</dt><dd>窗外在下雨</dd>
        <dt>相识</dt><dd>{conversationCount ? `共 ${conversationCount} 段对话` : '等第一句话'}</dd>
      </dl>
      <div className="keke-rain-window" aria-label="下雨的小窗装饰">
        <div className="keke-window-frame"><i><span className="keke-rain-cat">{'∧,,∧\n(´･ω･)'}</span></i><i /></div>
      </div>
    </div>
    <div className="keke-profile-shortcuts">
      <button className="keke-switch-theme" type="button" onClick={() => applyTheme(isPois ? 'keke-doodle' : 'keke-pois')}>
        <span>✣ 换个主题</span><span className="keke-theme-colors" aria-hidden="true"><i /><i /><i /></span>
        <small>→ {isPois ? '贴纸' : '波点'}</small>
      </button>
      <button className="keke-profile-edit" type="button" onClick={onEdit} disabled={!persona}>✦ 角色设置</button>
    </div>

    <div className="keke-calendar-wrap"><SidebarCalendar /><img className="keke-calendar-cat" alt="" src="/theme-assets/keke/doodle-cat.webp" /></div>

    <div className="keke-profile-lower">
      <div className="keke-sticky-note"><b>今日小事 ♡</b>
        {TODO_LABELS.map((label, index) => <label key={label} className={checked[index] ? 'done' : ''}>
          <input type="checkbox" checked={checked[index]} onChange={() => setChecked((old) => old.map((value, i) => i === index ? !value : value))} />{label}
        </label>)}
      </div>
      <div className="keke-sweet-print" aria-hidden="true">
        <img src={isPois ? '/theme-assets/keke/pois-decoration.webp' : '/theme-assets/keke/doodle-decoration.webp'} alt="" />
        <i className="keke-sweet-heart">♡</i><i className="keke-sweet-star">✦</i><span>sweet no.128</span>
      </div>
    </div>
    <div className="keke-paw-footer" aria-hidden="true">✿　✿　✿　✿ <span>10.27 tue · ☾</span></div>
  </div>;
}
