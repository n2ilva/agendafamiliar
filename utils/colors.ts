// Centralized color palette and category color mappings

export type ColorPair = { color: string; bgColor: string };

// Theme groups (for reference/reuse if needed elsewhere)
export const THEME_COPY_OF_HAPPY_KID: ColorPair[] = [
  { color: '#A3659E', bgColor: '#F6EAF5' },
  { color: '#76B0C2', bgColor: '#EAF5F9' },
  { color: '#C7D48E', bgColor: '#F7FAE9' },
  { color: '#F09C60', bgColor: '#FFF0E3' },
  { color: '#ED5A55', bgColor: '#FFE9E8' },
];

export const THEME_HAPPY_KIDS: ColorPair[] = [
  { color: '#73B96E', bgColor: '#E8F6E7' },
  { color: '#46915C', bgColor: '#E4F3E9' },
  { color: '#F25E44', bgColor: '#FFE9E5' },
  { color: '#489FB2', bgColor: '#E3F7FB' },
  { color: '#FFD96C', bgColor: '#FFF7D9' },
];

export const THEME_HAPPY_MOM: ColorPair[] = [
  { color: '#3FB8AF', bgColor: '#E2F7F5' },
  { color: '#7FC7AF', bgColor: '#EAF7F1' },
  { color: '#DAD8A7', bgColor: '#F9F8EA' },
  { color: '#FF9E9D', bgColor: '#FFECEC' },
  { color: '#FF3D7F', bgColor: '#FFE6F0' },
];

// Unified palette available for custom categories/color picking
export const AVAILABLE_COLORS: ColorPair[] = [
  ...THEME_COPY_OF_HAPPY_KID,
  ...THEME_HAPPY_KIDS,
  ...THEME_HAPPY_MOM,
];

// Default category color mapping
export const DEFAULT_CATEGORY_COLOR_MAP: Record<string, ColorPair> = {
  work: { color: '#489FB2', bgColor: '#E3F7FB' },
  home: { color: '#A3659E', bgColor: '#F6EAF5' },
  health: { color: '#73B96E', bgColor: '#E8F6E7' },
  study: { color: '#FFD96C', bgColor: '#FFF7D9' },
};

// Semantic app theme (for components/screens)
export const THEME = {
  primary: '#489FB2',
  primaryBg: '#E3F7FB',
  success: '#73B96E',
  successBg: '#E8F6E7',
  warning: '#F09C60',
  warningBg: '#FFF0E3',
  danger: '#ED5A55',
  dangerBg: '#FFE9E8',
  accent: '#A3659E',
  accentBg: '#F6EAF5',
  highlight: '#FFD96C',
  highlightBg: '#FFF7D9',
  // neutrals
  background: '#f5f5f5',
  surface: '#fff',
  border: '#e0e0e0',
  textPrimary: '#333',
  textSecondary: '#666',
};
