import type { ThemePreset } from '../../types/domain';
import {
  AURORA_PRESET_CSS,
  GLASS_PRESET_CSS,
  NEON_PRESET_CSS,
  PAPER_PRESET_CSS,
  PLUSH_PRESET_CSS,
  POLARIS_PRESET_CSS,
  createPreset
} from './themePresetShared';

export const LEGACY_THEME_PRESET_ID_ALIASES: Record<string, string> = {
  polaris: 'polaris-night',
  'amber-mist': 'polaris-default',
  'moon-harbor': 'polaris-default',
  'mint-garden': 'glass-mint',
  'rose-dusk': 'plush-rose',
  'prism-soda': 'neon-prism'
};

const VISIBLE_THEME_PRESETS: ThemePreset[] = [
  createPreset(
    'polaris-default',
    'Polaris / Default',
    '黑白收藏、黑白对话、最安静的默认底色',
    '不加纹理、不加装饰，让收藏区和对话区一起回到干净的黑白灰，作为 Polaris 最基础的默认空间。',
    {
      '--bg': 'linear-gradient(168deg, #ffffff 0%, #f4f4f4 42%, #e9e9e9 100%)',
      '--surface': 'rgba(255, 255, 255, 0.74)',
      '--surface-solid': '#ffffff',
      '--surface-deep': 'rgba(245, 245, 245, 0.92)',
      '--border': 'rgba(17, 17, 17, 0.08)',
      '--border-hover': 'rgba(17, 17, 17, 0.22)',
      '--text': '#1a1a1a',
      '--text-soft': '#5d5d5d',
      '--text-muted': '#999999',
      '--accent': '#1a1a1a',
      '--accent-soft': 'rgba(17, 17, 17, 0.08)',
      '--accent-glow': 'rgba(17, 17, 17, 0.08)',
      '--card-bg': 'linear-gradient(180deg, rgba(255,255,255,0.98) 0%, rgba(245,247,251,0.94) 100%)',
      '--shadow': '0 2px 20px rgba(17, 17, 17, 0.04), 0 0 0 1px rgba(17, 17, 17, 0.08)',
      '--shadow-hover': '0 8px 32px rgba(17, 17, 17, 0.08), 0 0 0 1px rgba(17, 17, 17, 0.16)',
      '--shadow-panel': '0 12px 28px rgba(17, 17, 17, 0.08)',
      '--chat-bg': 'linear-gradient(168deg, #ffffff 0%, #f4f4f4 42%, #e9e9e9 100%)',
      '--cool-bg': 'linear-gradient(168deg, #ffffff 0%, #f4f4f4 42%, #e9e9e9 100%)',
      '--cool-surface': 'rgba(255, 255, 255, 0.74)',
      '--cool-surface-solid': '#ffffff',
      '--cool-surface-deep': 'rgba(245, 245, 245, 0.92)',
      '--cool-border': 'rgba(17, 17, 17, 0.08)',
      '--cool-border-hover': 'rgba(17, 17, 17, 0.22)',
      '--cool-text': '#1a1a1a',
      '--cool-text-soft': '#5d5d5d',
      '--cool-text-muted': '#999999',
      '--cool-accent': '#1a1a1a',
      '--cool-accent-soft': 'rgba(17, 17, 17, 0.08)',
      '--cool-accent-glow': 'rgba(17, 17, 17, 0.08)',
      '--bubble-user': 'linear-gradient(135deg, rgba(24, 24, 24, 0.12) 0%, rgba(24, 24, 24, 0.04) 100%)',
      '--bubble-ai': 'linear-gradient(135deg, rgba(255,255,255,0.98) 0%, rgba(241,241,241,0.94) 100%)'
    },
    {
      css: '',
      recipe: { name: '默认', note: '安静的黑白灰底色，什么都不多。' },
      styleLabel: 'Default',
      visibleInStudio: false
    }
  ),
  createPreset(
    'polaris-night',
    'Polaris / Night',
    '深空蓝金、北极星辉、夜航者的默认天空',
    '把整页沉入深夜蓝，用金色微光和冷蓝边界把层次撑开，让 Polaris 从落点开始就像夜里发亮的工作台。',
    {
      '--bg': 'linear-gradient(156deg, #04070d 0%, #08101d 34%, #0c1430 66%, #050914 100%)',
      '--chat-bg': 'linear-gradient(156deg, #04070d 0%, #08101d 34%, #0c1430 66%, #050914 100%)',
      '--cool-bg': 'linear-gradient(156deg, #04070d 0%, #08101d 34%, #0c1430 66%, #050914 100%)',
      '--surface': 'rgba(9, 14, 30, 0.9)',
      '--surface-solid': '#09101f',
      '--surface-deep': 'rgba(8, 13, 28, 0.98)',
      '--border': 'rgba(196, 167, 105, 0.2)',
      '--border-hover': 'rgba(224, 192, 126, 0.38)',
      '--text': '#c7a15a',
      '--text-soft': '#9f7f4a',
      '--text-muted': 'rgba(180, 149, 92, 0.72)',
      '--accent': '#d8b46c',
      '--accent-soft': 'rgba(216, 180, 108, 0.16)',
      '--accent-glow': 'rgba(243, 214, 151, 0.22)',
      '--card-bg': 'linear-gradient(138deg, rgba(8, 13, 28, 0.98) 0%, rgba(13, 20, 42, 0.94) 100%)',
      '--shadow': '0 16px 38px rgba(3, 6, 15, 0.42), 0 0 0 1px rgba(130, 160, 225, 0.07)',
      '--shadow-hover': '0 24px 52px rgba(3, 6, 15, 0.52), 0 0 0 1px rgba(160, 190, 255, 0.12)',
      '--shadow-panel': '0 20px 48px rgba(3, 6, 15, 0.34)',
      '--shadow-bubble': '0 8px 20px rgba(3, 6, 15, 0.22)',
      '--bubble-user': 'linear-gradient(135deg, rgba(110, 145, 220, 0.16) 0%, rgba(70, 100, 185, 0.10) 60%, rgba(90, 120, 200, 0.13) 100%)',
      '--bubble-ai': 'linear-gradient(135deg, rgba(13, 19, 40, 0.97) 0%, rgba(18, 26, 52, 0.94) 100%)',
      '--radius-sm': '8px',
      '--radius-md': '10px',
      '--radius-lg': '14px',
      '--radius-xl': '16px',
      '--radius-2xl': '18px',
      '--radius-pill': '20px',
      '--radius-panel': '24px'
    },
    {
      css: POLARIS_PRESET_CSS,
      recipe: { name: '北极星夜航', note: '深夜蓝底、微金星辉、为 Polaris 准备的默认夜空。' },
      styleLabel: 'Polaris'
    }
  ),
  createPreset(
    'paper-butter',
    'Paper / Bloom',
    '粉蓝手账、纸胶带、奶油纸页',
    '粉白蓝渐变的手账页面，虚线边框、纸胶带装饰、圆润贴纸感。像翻开一本私人日记。',
    {
      '--bg': 'linear-gradient(156deg, #fff2f6 0%, #fde8ef 28%, #f0eafc 56%, #e6f0ff 100%)',
      '--chat-bg': 'linear-gradient(158deg, #fdf4f8 0%, #f4eafa 38%, #eaf0ff 100%)',
      '--cool-bg': 'linear-gradient(158deg, #fdf4f8 0%, #f4eafa 38%, #eaf0ff 100%)',
      '--surface': 'rgba(255, 248, 252, 0.84)',
      '--surface-solid': '#fff8fb',
      '--surface-deep': 'rgba(255, 248, 252, 0.97)',
      '--border': 'rgba(210, 160, 186, 0.28)',
      '--border-hover': 'rgba(210, 160, 186, 0.50)',
      '--text': '#3d2a3a',
      '--text-soft': '#8a6580',
      '--text-muted': '#bc9aaf',
      '--accent': '#d4789a',
      '--accent-soft': 'rgba(212, 120, 154, 0.16)',
      '--accent-glow': 'rgba(212, 150, 178, 0.14)',
      '--card-bg': 'linear-gradient(138deg, rgba(255,250,253,0.99) 0%, rgba(248,236,246,0.95) 42%, rgba(236,238,255,0.92) 100%)',
      '--shadow': '0 12px 30px rgba(172, 120, 152, 0.10), 0 0 0 1px rgba(210, 160, 186, 0.12)',
      '--shadow-hover': '0 20px 46px rgba(172, 120, 152, 0.16), 0 0 0 1px rgba(210, 160, 186, 0.22)',
      '--bubble-user': 'linear-gradient(135deg, rgba(255, 220, 236, 0.62) 0%, rgba(224, 218, 255, 0.48) 100%)',
      '--bubble-ai': 'linear-gradient(135deg, rgba(255, 252, 254, 0.98) 0%, rgba(242, 238, 255, 0.94) 100%)',
      '--radius-sm': '10px',
      '--radius-md': '13px',
      '--radius-lg': '16px',
      '--radius-xl': '18px',
      '--radius-2xl': '20px',
      '--radius-pill': '22px',
      '--radius-panel': '26px'
    },
    {
      css: PAPER_PRESET_CSS,
      recipe: { name: '奶油纸页', note: '纸纹、奶油表面和更安静的默认停留感。' },
      styleLabel: 'Paper'
    }
  ),
  createPreset(
    'keke-doodle',
    '克克 / 铅笔贴纸',
    '奶灰粉、铅笔线、手账撕纸和猫猫贴饰',
    '由克克设计文件拆出的铅笔贴纸主题。映射到真实消息、输入框、角色资料和对话库。',
    {
      '--chat-bg': '#faf7f5',
      '--cool-bg': '#faf7f5',
      '--cool-surface': '#faf7f5',
      '--cool-surface-solid': '#faf7f5',
      '--cool-surface-deep': '#f3e9ea',
      '--cool-border': 'rgba(122,109,113,.3)',
      '--cool-border-hover': 'rgba(122,109,113,.64)',
      '--cool-text': '#5d5357',
      '--cool-text-soft': '#7a6d71',
      '--cool-text-muted': '#a39599',
      '--cool-accent': '#b0838c',
      '--cool-accent-soft': 'rgba(214,186,191,.38)',
      '--cool-accent-glow': 'rgba(176,131,140,.2)',
      '--bubble-user': '#f3e9ea',
      '--bubble-ai': '#faf7f5',
      '--radius-xl': '18px',
      '--radius-2xl': '20px'
    },
    { css: '', recipe: { name: '铅笔贴纸', note: '原样素材，真实 Conflux 聊天功能。' }, styleLabel: 'Sticker' }
  ),
  createPreset(
    'keke-pois',
    '克克 / 灰粉波点',
    '灰白圆点、低饱和粉、像素贴饰和透明气泡',
    '由克克设计文件拆出的灰粉波点主题。聊天、收藏、角色操作继续使用 Conflux 的真实数据。',
    {
      '--chat-bg': '#c6c4c5',
      '--cool-bg': '#c6c4c5',
      '--cool-surface': 'rgba(246,245,245,.86)',
      '--cool-surface-solid': '#f6f5f5',
      '--cool-surface-deep': '#f3f0f0',
      '--cool-border': 'rgba(90,80,84,.18)',
      '--cool-border-hover': 'rgba(90,80,84,.38)',
      '--cool-text': '#4d484a',
      '--cool-text-soft': '#6e6668',
      '--cool-text-muted': '#77716f',
      '--cool-accent': '#a5858c',
      '--cool-accent-soft': 'rgba(201,163,170,.4)',
      '--cool-accent-glow': 'rgba(185,147,154,.18)',
      '--bubble-user': 'rgba(236,215,219,.58)',
      '--bubble-ai': 'rgba(242,242,242,.5)',
      '--radius-xl': '16px',
      '--radius-2xl': '18px'
    },
    { css: '', recipe: { name: '灰粉波点', note: '低饱和灰粉，像素装饰，真实对话。' }, styleLabel: 'Pois' }
  )
];

/** Presets that AI can reference via applyPreset but don't show in Theme Studio UI */
const AI_ONLY_PRESETS: ThemePreset[] = [
  createPreset(
    'glass-mint', 'Glass / Mint',
    '雾面玻璃、海盐薄荷、层次靠透感站住',
    '把整页做成真正更通透的玻璃和薄荷冷雾，不靠换色，靠 blur、反光和边界轻重把层次拉开。',
    { '--bg': 'linear-gradient(160deg, #f9fff8 0%, #dff7e7 40%, #b8ead1 100%)', '--surface': 'rgba(238, 244, 241, 0.72)', '--surface-solid': '#eef5f1', '--surface-deep': 'rgba(238, 244, 241, 0.9)', '--border': 'rgba(105, 150, 132, 0.34)', '--border-hover': 'rgba(85, 169, 135, 0.62)', '--text': '#1f4135', '--text-soft': '#527b69', '--text-muted': '#7ca792', '--accent': '#3ba56f', '--accent-soft': 'rgba(59, 165, 111, 0.18)', '--accent-glow': 'rgba(59, 165, 111, 0.18)', '--card-bg': 'linear-gradient(145deg, rgba(251,254,252,0.82) 0%, rgba(228,236,233,0.74) 54%, rgba(198,240,224,0.52) 100%)', '--shadow': '0 18px 36px rgba(62, 116, 95, 0.14), 0 0 0 1px rgba(105, 150, 132, 0.16)', '--shadow-hover': '0 26px 54px rgba(62, 116, 95, 0.2), 0 0 0 1px rgba(85, 169, 135, 0.28)', '--bubble-user': 'linear-gradient(135deg, rgba(174, 255, 241, 0.64) 0%, rgba(126, 229, 183, 0.46) 100%)', '--bubble-ai': 'linear-gradient(135deg, rgba(250, 255, 255, 0.88) 0%, rgba(224, 239, 240, 0.72) 56%, rgba(213, 247, 241, 0.54) 100%)', '--radius-xl': '18px', '--radius-2xl': '21px', '--radius-pill': '24px', '--radius-panel': '26px' },
    { css: GLASS_PRESET_CSS, recipe: { name: '薄荷玻璃', note: '靠反光、blur 和边界轻重把整页做得更通透。' }, styleLabel: 'Glass', visibleInStudio: false }
  ),
  createPreset(
    'neon-prism', 'Neon / Prism',
    '高对比霓边、棱镜跳色、结构一眼更硬',
    '把按钮、卡片和边框做出更明确的存在感，用高对比和发光边把前 3 套彻底拉开。',
    { '--bg': 'linear-gradient(152deg, #fff1f3 0%, #ffd8cc 28%, #ffe6b9 54%, #d6e6ff 100%)', '--surface': 'rgba(255, 245, 241, 0.86)', '--surface-solid': '#fff5f1', '--surface-deep': 'rgba(255, 245, 241, 0.99)', '--border': 'rgba(255, 107, 123, 0.42)', '--border-hover': 'rgba(255, 107, 123, 0.72)', '--text': '#4d2130', '--text-soft': '#955457', '--text-muted': '#c7826c', '--accent': '#ff4f79', '--accent-soft': 'rgba(255, 79, 121, 0.22)', '--accent-glow': 'rgba(255, 79, 121, 0.28)', '--card-bg': 'linear-gradient(140deg, rgba(255,247,243,0.99) 0%, rgba(255,223,209,0.92) 34%, rgba(255,239,174,0.9) 58%, rgba(214,232,255,0.9) 100%)', '--shadow': '0 18px 40px rgba(255, 79, 121, 0.18), 0 0 0 1px rgba(255, 107, 123, 0.18)', '--shadow-hover': '0 30px 60px rgba(255, 79, 121, 0.28), 0 0 0 1px rgba(255, 107, 123, 0.34)', '--bubble-user': 'linear-gradient(135deg, rgba(255, 113, 162, 0.5) 0%, rgba(255, 210, 128, 0.36) 34%, rgba(52, 194, 255, 0.4) 66%, rgba(129, 118, 255, 0.48) 100%)', '--bubble-ai': 'linear-gradient(135deg, rgba(246, 255, 255, 0.99) 0%, rgba(214, 242, 255, 0.92) 52%, rgba(231, 223, 255, 0.92) 100%)', '--shadow-panel': '0 18px 44px rgba(70, 98, 178, 0.18)', '--shadow-bubble': '0 6px 18px rgba(70, 98, 178, 0.12)', '--radius-sm': '6px', '--radius-md': '8px', '--radius-lg': '10px', '--radius-xl': '12px', '--radius-2xl': '14px', '--radius-pill': '18px', '--radius-panel': '18px' },
    { css: NEON_PRESET_CSS, recipe: { name: '棱镜霓边', note: '更明确的边框、发光和高对比结构。' }, styleLabel: 'Neon', visibleInStudio: false }
  ),
  createPreset(
    'plush-rose',
    'Plush / Rose',
    '软绒晚霞、奶霜玫瑰、贴身一点但不闷',
    '把圆角、阴影和按钮手感一起做软，让这套更像绒面块和奶霜气泡，负责陪伴感和贴身感。',
    {
      '--bg': 'linear-gradient(160deg, #fff3ef 0%, #f8ddd8 40%, #f0c0c8 100%)',
      '--surface': 'rgba(255, 248, 247, 0.84)',
      '--surface-solid': '#fff8f7',
      '--surface-deep': 'rgba(255, 248, 247, 0.97)',
      '--border': 'rgba(209, 116, 139, 0.32)',
      '--border-hover': 'rgba(209, 116, 139, 0.54)',
      '--text': '#4a2831',
      '--text-soft': '#8e5965',
      '--text-muted': '#c08898',
      '--accent': '#d16486',
      '--accent-soft': 'rgba(209, 100, 134, 0.22)',
      '--accent-glow': 'rgba(209, 100, 134, 0.2)',
      '--card-bg': 'linear-gradient(140deg, rgba(255,249,248,0.99) 0%, rgba(251,224,230,0.94) 58%, rgba(244,205,216,0.92) 100%)',
      '--shadow': '0 16px 36px rgba(170, 79, 116, 0.14), 0 0 0 1px rgba(209, 116, 139, 0.16)',
      '--shadow-hover': '0 26px 54px rgba(170, 79, 116, 0.2), 0 0 0 1px rgba(209, 116, 139, 0.28)',
      '--bubble-user': 'linear-gradient(135deg, rgba(247, 193, 214, 0.72) 0%, rgba(200, 164, 255, 0.52) 100%)',
      '--bubble-ai': 'linear-gradient(135deg, rgba(255, 244, 248, 0.98) 0%, rgba(240, 226, 250, 0.94) 100%)',
      '--radius-sm': '12px',
      '--radius-md': '14px',
      '--radius-lg': '18px',
      '--radius-xl': '22px',
      '--radius-2xl': '26px',
      '--radius-pill': '999px',
      '--radius-panel': '30px'
    },
    {
      css: PLUSH_PRESET_CSS,
      recipe: { name: '绒玫陪伴', note: '更软更糯的圆角、阴影和贴身气泡。' },
      styleLabel: 'Plush',
      visibleInStudio: false
    }
  ),
  createPreset(
    'ink-bamboo',
    'Ink / Bamboo',
    '墨灰竹影、留白偏冷、像被雨水洗过的纸面',
    '让界面像一张带水汽的宣纸，靠冷灰、淡青和细边界撑住呼吸感，不靠花哨对比取胜。',
    {
      '--bg': 'linear-gradient(156deg, #f3f0e8 0%, #e4ded3 42%, #d7d7d0 100%)',
      '--surface': 'rgba(245, 243, 238, 0.86)',
      '--surface-solid': '#f5f3ee',
      '--surface-deep': 'rgba(242, 239, 233, 0.97)',
      '--border': 'rgba(110, 118, 110, 0.22)',
      '--border-hover': 'rgba(92, 108, 98, 0.38)',
      '--text': '#2d342f',
      '--text-soft': '#637067',
      '--text-muted': 'rgba(99, 112, 103, 0.72)',
      '--accent': '#6f8b78',
      '--accent-soft': 'rgba(111, 139, 120, 0.14)',
      '--accent-glow': 'rgba(111, 139, 120, 0.12)',
      '--card-bg': 'linear-gradient(142deg, rgba(248,246,241,0.98) 0%, rgba(232,230,224,0.94) 58%, rgba(217,222,214,0.92) 100%)',
      '--bubble-user': 'linear-gradient(135deg, rgba(201, 215, 204, 0.62) 0%, rgba(177, 194, 188, 0.5) 100%)',
      '--bubble-ai': 'linear-gradient(135deg, rgba(248, 248, 244, 0.98) 0%, rgba(228, 235, 233, 0.94) 100%)',
      '--radius-lg': '13px',
      '--radius-xl': '15px',
      '--radius-2xl': '17px',
      '--radius-pill': '20px',
      '--radius-panel': '22px'
    },
    {
      css: PAPER_PRESET_CSS,
      recipe: { name: '墨竹留白', note: '冷灰宣纸、竹影淡青、边界轻而稳。' },
      styleLabel: 'Ink',
      visibleInStudio: false
    }
  ),
  createPreset(
    'caramel-latte',
    'Caramel / Latte',
    '焦糖奶咖、木质暖光、像傍晚咖啡馆的桌面',
    '把界面做成更中性的暖棕和奶霜层次，让空间像木桌、陶杯和慢慢降下来的店内灯光。',
    {
      '--bg': 'linear-gradient(156deg, #f6ebde 0%, #e7cfb4 40%, #d1ae8c 100%)',
      '--surface': 'rgba(247, 239, 229, 0.86)',
      '--surface-solid': '#f7efe5',
      '--surface-deep': 'rgba(243, 231, 216, 0.97)',
      '--border': 'rgba(144, 103, 67, 0.24)',
      '--border-hover': 'rgba(144, 103, 67, 0.42)',
      '--text': '#4a3022',
      '--text-soft': '#89624c',
      '--text-muted': 'rgba(137, 98, 76, 0.72)',
      '--accent': '#b87945',
      '--accent-soft': 'rgba(184, 121, 69, 0.18)',
      '--accent-glow': 'rgba(184, 121, 69, 0.14)',
      '--card-bg': 'linear-gradient(140deg, rgba(251,245,237,0.99) 0%, rgba(237,219,198,0.94) 56%, rgba(214,184,156,0.9) 100%)',
      '--bubble-user': 'linear-gradient(135deg, rgba(226, 188, 146, 0.62) 0%, rgba(196, 145, 106, 0.48) 100%)',
      '--bubble-ai': 'linear-gradient(135deg, rgba(250, 245, 240, 0.98) 0%, rgba(233, 223, 213, 0.94) 100%)',
      '--radius-md': '10px',
      '--radius-lg': '14px',
      '--radius-xl': '18px',
      '--radius-2xl': '22px',
      '--radius-pill': '28px',
      '--radius-panel': '24px'
    },
    {
      css: PLUSH_PRESET_CSS,
      recipe: { name: '焦糖慢烘', note: '木感暖棕、奶咖层次和更慢的包裹感。' },
      styleLabel: 'Latte',
      visibleInStudio: false
    }
  ),
  createPreset(
    'aurora-drift',
    'Aurora / Drift',
    '冷暖交界、极光浮动、像夜里轻轻流动的雾',
    '让界面带一点极光漂移的感觉，颜色交界是柔的，空间是浮起来的，像寒夜里的发光云层。',
    {
      '--bg': 'linear-gradient(155deg, #fff1f8 0%, #e5d8ff 32%, #c1e4ff 68%, #c7ffe7 100%)',
      '--surface': 'rgba(248, 243, 255, 0.8)',
      '--surface-solid': '#f7f1ff',
      '--surface-deep': 'rgba(240, 234, 252, 0.94)',
      '--border': 'rgba(162, 132, 220, 0.28)',
      '--border-hover': 'rgba(132, 204, 214, 0.46)',
      '--text': '#43355f',
      '--text-soft': '#766693',
      '--text-muted': 'rgba(118, 102, 147, 0.72)',
      '--accent': '#ac84f0',
      '--accent-soft': 'rgba(172, 132, 240, 0.18)',
      '--accent-glow': 'rgba(172, 132, 240, 0.18)',
      '--card-bg': 'linear-gradient(145deg, rgba(251,246,255,0.92) 0%, rgba(228,233,255,0.78) 52%, rgba(204,255,235,0.56) 100%)',
      '--bubble-user': 'linear-gradient(135deg, rgba(194, 157, 255, 0.54) 0%, rgba(130, 226, 220, 0.42) 100%)',
      '--bubble-ai': 'linear-gradient(135deg, rgba(250, 254, 255, 0.92) 0%, rgba(223, 241, 255, 0.78) 56%, rgba(240, 227, 255, 0.66) 100%)',
      '--radius-lg': '16px',
      '--radius-xl': '20px',
      '--radius-2xl': '24px',
      '--radius-pill': '28px',
      '--radius-panel': '28px'
    },
    {
      css: AURORA_PRESET_CSS,
      recipe: { name: '极光漂移', note: '冷暖渐层、半透明光雾和漂浮感。' },
      styleLabel: 'Aurora',
      visibleInStudio: false
    }
  ),
  createPreset(
    'obsidian-ember',
    'Obsidian / Ember',
    '黑曜石面、余烬暗红、像刚熄火的炉膛边缘',
    '让界面沉到更黑的底里，再从边缘慢慢泛出一点余烬红和铜色热度，像夜里还带温的矿石。',
    {
      '--bg': 'linear-gradient(156deg, #120a09 0%, #1d100d 38%, #311816 100%)',
      '--surface': 'rgba(27, 16, 14, 0.9)',
      '--surface-solid': '#1b110f',
      '--surface-deep': 'rgba(23, 13, 12, 0.98)',
      '--border': 'rgba(154, 92, 66, 0.24)',
      '--border-hover': 'rgba(184, 112, 78, 0.4)',
      '--text': '#e7c9b4',
      '--text-soft': '#b98d78',
      '--text-muted': 'rgba(185, 141, 120, 0.72)',
      '--accent': '#b86445',
      '--accent-soft': 'rgba(184, 100, 69, 0.18)',
      '--accent-glow': 'rgba(184, 100, 69, 0.18)',
      '--card-bg': 'linear-gradient(140deg, rgba(28,17,15,0.99) 0%, rgba(43,24,21,0.95) 58%, rgba(62,29,25,0.92) 100%)',
      '--bubble-user': 'linear-gradient(135deg, rgba(138, 70, 48, 0.42) 0%, rgba(184, 100, 69, 0.26) 100%)',
      '--bubble-ai': 'linear-gradient(135deg, rgba(28, 31, 40, 0.98) 0%, rgba(36, 39, 49, 0.94) 100%)',
      '--radius-lg': '12px',
      '--radius-xl': '14px',
      '--radius-2xl': '16px',
      '--radius-pill': '20px',
      '--radius-panel': '22px'
    },
    {
      css: POLARIS_PRESET_CSS,
      recipe: { name: '余烬黑曜', note: '黑曜底、铜红热边和更低温的夜感。' },
      styleLabel: 'Ember',
      visibleInStudio: false
    }
  ),
  createPreset(
    'porcelain-rain',
    'Porcelain / Rain',
    '冷白瓷面、细雨蓝灰、像窗边微湿的晨光',
    '把界面做成更克制的冷白和雨灰层次，像被雾气润过的瓷面，轻、冷、但不空。',
    {
      '--bg': 'linear-gradient(160deg, #f6f2ee 0%, #e9e2da 42%, #d7d5d8 100%)',
      '--surface': 'rgba(247, 243, 238, 0.84)',
      '--surface-solid': '#f7f3ee',
      '--surface-deep': 'rgba(242, 237, 232, 0.97)',
      '--border': 'rgba(156, 145, 139, 0.18)',
      '--border-hover': 'rgba(156, 145, 139, 0.32)',
      '--text': '#4b4644',
      '--text-soft': '#837a76',
      '--text-muted': 'rgba(131, 122, 118, 0.72)',
      '--accent': '#8d8b98',
      '--accent-soft': 'rgba(141, 139, 152, 0.14)',
      '--accent-glow': 'rgba(141, 139, 152, 0.1)',
      '--card-bg': 'linear-gradient(144deg, rgba(252,249,246,0.99) 0%, rgba(236,231,226,0.95) 56%, rgba(221,224,229,0.9) 100%)',
      '--bubble-user': 'linear-gradient(135deg, rgba(214, 224, 230, 0.72) 0%, rgba(187, 205, 218, 0.54) 100%)',
      '--bubble-ai': 'linear-gradient(135deg, rgba(252, 253, 255, 0.99) 0%, rgba(232, 239, 245, 0.94) 100%)',
      '--radius-lg': '14px',
      '--radius-xl': '18px',
      '--radius-2xl': '20px',
      '--radius-pill': '24px',
      '--radius-panel': '24px'
    },
    {
      css: GLASS_PRESET_CSS,
      recipe: { name: '雨瓷晨光', note: '冷白瓷面、雨灰层次和更轻的湿润感。' },
      styleLabel: 'Porcelain',
      visibleInStudio: false
    }
  ),
  createPreset(
    'moss-lantern',
    'Moss / Lantern',
    '潮湿苔绿、旧铜灯影、像雨后庭院里还留着一点夜温',
    '让界面像湿过一遍的石阶和苔面，底色沉稳，边缘带一点旧铜灯火，安静但不是死黑。',
    {
      '--bg': 'linear-gradient(156deg, #17140f 0%, #272018 40%, #3a3126 100%)',
      '--surface': 'rgba(34, 28, 21, 0.88)',
      '--surface-solid': '#231c16',
      '--surface-deep': 'rgba(28, 23, 18, 0.97)',
      '--border': 'rgba(152, 125, 84, 0.22)',
      '--border-hover': 'rgba(178, 146, 96, 0.38)',
      '--text': '#dbc8a5',
      '--text-soft': '#ad9675',
      '--text-muted': 'rgba(173, 150, 117, 0.72)',
      '--accent': '#b58a54',
      '--accent-soft': 'rgba(181, 138, 84, 0.16)',
      '--accent-glow': 'rgba(181, 138, 84, 0.16)',
      '--card-bg': 'linear-gradient(142deg, rgba(34,28,21,0.99) 0%, rgba(49,39,29,0.95) 56%, rgba(63,53,41,0.92) 100%)',
      '--bubble-user': 'linear-gradient(135deg, rgba(116, 92, 55, 0.34) 0%, rgba(171, 132, 74, 0.2) 100%)',
      '--bubble-ai': 'linear-gradient(135deg, rgba(27, 34, 29, 0.98) 0%, rgba(35, 44, 38, 0.94) 100%)',
      '--radius-lg': '12px',
      '--radius-xl': '15px',
      '--radius-2xl': '18px',
      '--radius-pill': '22px',
      '--radius-panel': '24px'
    },
    {
      css: POLARIS_PRESET_CSS,
      recipe: { name: '苔灯夜庭', note: '湿苔深绿、旧铜灯火和静静发温的夜色。' },
      styleLabel: 'Moss',
      visibleInStudio: false
    }
  ),
  createPreset(
    'apricot-linen',
    'Apricot / Linen',
    '杏色麻布、日光晾晒、像窗边被风吹起的薄帘',
    '让界面像被太阳晒过的布面和木窗边缘，颜色轻一点、呼吸感大一点，温柔但不发甜。',
    {
      '--bg': 'linear-gradient(158deg, #fff6ec 0%, #f8e3cf 42%, #f2cda8 100%)',
      '--surface': 'rgba(255, 249, 241, 0.86)',
      '--surface-solid': '#fff8f0',
      '--surface-deep': 'rgba(251, 243, 233, 0.97)',
      '--border': 'rgba(196, 153, 108, 0.22)',
      '--border-hover': 'rgba(196, 153, 108, 0.4)',
      '--text': '#4b3728',
      '--text-soft': '#8c6c54',
      '--text-muted': 'rgba(140, 108, 84, 0.72)',
      '--accent': '#cf9557',
      '--accent-soft': 'rgba(207, 149, 87, 0.16)',
      '--accent-glow': 'rgba(207, 149, 87, 0.14)',
      '--card-bg': 'linear-gradient(144deg, rgba(255,251,245,0.99) 0%, rgba(245,229,212,0.95) 58%, rgba(236,205,173,0.9) 100%)',
      '--bubble-user': 'linear-gradient(135deg, rgba(243, 196, 144, 0.5) 0%, rgba(223, 177, 121, 0.34) 100%)',
      '--bubble-ai': 'linear-gradient(135deg, rgba(255, 253, 250, 0.99) 0%, rgba(235, 243, 249, 0.94) 100%)',
      '--radius-lg': '14px',
      '--radius-xl': '18px',
      '--radius-2xl': '22px',
      '--radius-pill': '28px',
      '--radius-panel': '26px'
    },
    {
      css: PAPER_PRESET_CSS,
      recipe: { name: '杏麻日晒', note: '麻布日光、浅木窗边和更松弛的空气感。' },
      styleLabel: 'Apricot',
      visibleInStudio: false
    }
  )
];

export const THEME_PRESETS: ThemePreset[] = [
  ...VISIBLE_THEME_PRESETS,
  ...AI_ONLY_PRESETS
];
