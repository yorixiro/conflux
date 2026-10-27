type ThemePresetStableMood = 'warm' | 'night' | 'airy' | 'sharp' | 'sweet' | 'quiet' | 'dreamy';
type ThemePresetStableMaterial = 'matte' | 'paper' | 'glass' | 'glow';
type ThemePresetStableDensity = 'airy' | 'balanced';
type ThemePresetStableDepth = 'flat' | 'soft' | 'lifted';

export type ThemePresetStableProfile = {
  seedColor: string;
  mood?: ThemePresetStableMood;
  material?: ThemePresetStableMaterial;
  density?: ThemePresetStableDensity;
  depth?: ThemePresetStableDepth;
  intensity?: number;
};

const THEME_PRESET_STABLE_PROFILES: Record<string, ThemePresetStableProfile> = {
  'polaris-default': {
    seedColor: '#bca27d',
    mood: 'warm',
    material: 'matte',
    depth: 'soft',
    intensity: 0.42
  },
  'polaris-night': {
    seedColor: '#d8b46c',
    mood: 'night',
    material: 'matte',
    depth: 'lifted',
    intensity: 0.48
  },
  'paper-butter': {
    seedColor: '#d4789a',
    mood: 'warm',
    material: 'paper',
    density: 'airy',
    depth: 'soft',
    intensity: 0.56
  },
  'keke-doodle': {
    seedColor: '#b0838c',
    mood: 'sweet',
    material: 'paper',
    density: 'balanced',
    depth: 'soft',
    intensity: 0.5
  },
  'keke-pois': {
    seedColor: '#a5858c',
    mood: 'quiet',
    material: 'paper',
    density: 'airy',
    depth: 'flat',
    intensity: 0.42
  },
  'glass-mint': {
    seedColor: '#3ba56f',
    mood: 'airy',
    material: 'glass',
    depth: 'lifted',
    intensity: 0.6
  },
  'neon-prism': {
    seedColor: '#ff4f79',
    mood: 'sharp',
    material: 'glow',
    depth: 'lifted',
    intensity: 0.78
  },
  'plush-rose': {
    seedColor: '#d16486',
    mood: 'sweet',
    material: 'matte',
    depth: 'lifted',
    intensity: 0.58
  },
  'ink-bamboo': {
    seedColor: '#6f8b78',
    mood: 'quiet',
    material: 'paper',
    depth: 'flat',
    intensity: 0.38
  },
  'caramel-latte': {
    seedColor: '#b87945',
    mood: 'warm',
    material: 'paper',
    density: 'balanced',
    depth: 'soft',
    intensity: 0.46
  },
  'aurora-drift': {
    seedColor: '#ac84f0',
    mood: 'dreamy',
    material: 'glass',
    density: 'airy',
    depth: 'lifted',
    intensity: 0.66
  },
  'obsidian-ember': {
    seedColor: '#b86445',
    mood: 'sharp',
    material: 'matte',
    depth: 'lifted',
    intensity: 0.64
  },
  'porcelain-rain': {
    seedColor: '#8d8b98',
    mood: 'quiet',
    material: 'glass',
    density: 'airy',
    depth: 'soft',
    intensity: 0.44
  },
  'moss-lantern': {
    seedColor: '#b58a54',
    mood: 'warm',
    material: 'matte',
    depth: 'lifted',
    intensity: 0.5
  },
  'apricot-linen': {
    seedColor: '#cf9557',
    mood: 'warm',
    material: 'paper',
    density: 'airy',
    depth: 'soft',
    intensity: 0.54
  }
};

export function getThemePresetStableProfile(presetId: string | null | undefined) {
  if (!presetId) return null;
  return THEME_PRESET_STABLE_PROFILES[presetId] ?? null;
}
