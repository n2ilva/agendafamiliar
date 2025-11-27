// ================== SISTEMA DE CORES - AGENDA FAMILIAR ==================
// Paleta de cores padronizada para facilitar manutenção e consistência

/**
 * CORES PRINCIPAIS DO APP
 * Define a identidade visual base (Azul e Branco)
 */
export const APP_COLORS = {
  // Cores Primárias (Azul)
  primary: {
    main: '#2196F3',      // Azul principal
    light: '#64B5F6',     // Azul claro
    lighter: '#BBDEFB',   // Azul muito claro
    dark: '#1976D2',      // Azul escuro
    darker: '#0D47A1',    // Azul muito escuro
  },
  
  // Cores Secundárias (Complementares)
  secondary: {
    main: '#03A9F4',      // Azul cyan
    light: '#4FC3F7',     // Cyan claro
    lighter: '#B3E5FC',   // Cyan muito claro
    dark: '#0288D1',      // Cyan escuro
  },
  
  // Cores de Fundo
  background: {
    white: '#FFFFFF',
    lightGray: '#F5F7FA',
    gray: '#ECEFF1',
    darkGray: '#263238',
    dark: '#1A1A1A',
  },
  
  // Cores de Texto
  text: {
    primary: '#212529',
    secondary: '#6C757D',
    light: '#ADB5BD',
    white: '#FFFFFF',
    muted: '#868E96',
  },
  
  // Cores de Estado/Feedback
  status: {
    success: '#4CAF50',
    successLight: '#E8F5E9',
    successDark: '#155724',
    warning: '#FF9800',
    warningLight: '#FFF3E0',
    warningDark: '#856404',
    error: '#F44336',
    errorLight: '#FFEBEE',
    errorDark: '#721c24',
    info: '#2196F3',
    infoLight: '#E3F2FD',
  },
  
  // Cores de Borda
  border: {
    light: '#E0E0E0',
    medium: '#BDBDBD',
    dark: '#757575',
  },
  
  // Cores de Sombra
  shadow: {
    light: 'rgba(0, 0, 0, 0.05)',
    medium: 'rgba(0, 0, 0, 0.1)',
    dark: 'rgba(0, 0, 0, 0.2)',
  },
};

/**
 * CORES DE CATEGORIAS DE TAREFAS
 * Paleta otimizada para diferenciar visualmente as categorias
 */
export const CATEGORY_COLORS = {
  trabalho: {
    color: '#2196F3',
    bgColor: '#E3F2FD',
    icon: 'briefcase',
  },
  pessoal: {
    color: '#9C27B0',
    bgColor: '#F3E5F5',
    icon: 'person',
  },
  compras: {
    color: '#FF9800',
    bgColor: '#FFF3E0',
    icon: 'cart',
  },
  saude: {
    color: '#F44336',
    bgColor: '#FFEBEE',
    icon: 'fitness',
  },
  estudos: {
    color: '#009688',
    bgColor: '#E0F2F1',
    icon: 'school',
  },
  lazer: {
    color: '#FFC107',
    bgColor: '#FFF8E1',
    icon: 'game-controller',
  },
};

/**
 * TEMAS DO APP (Light/Dark)
 */
export const THEMES = {
  light: {
    name: 'Claro',
    colors: {
      background: APP_COLORS.background.white,
      surface: APP_COLORS.background.lightGray,
      card: APP_COLORS.background.white,
      text: APP_COLORS.text.primary,
      textSecondary: APP_COLORS.text.secondary,
      primary: APP_COLORS.primary.main,
      border: APP_COLORS.border.light,
      statusBarStyle: 'dark-content' as const,
    },
  },
  dark: {
    name: 'Escuro',
    colors: {
      background: APP_COLORS.background.dark,
      surface: APP_COLORS.background.darkGray,
      card: '#2C2C2C',
      text: APP_COLORS.text.white,
      textSecondary: APP_COLORS.text.light,
      primary: APP_COLORS.primary.light,
      border: '#424242',
      statusBarStyle: 'light-content' as const,
    },
  },
};

export interface ColorPair {
  color: string;
  bgColor: string;
}

export interface ThemeInfo {
  name: string;
  description: string;
  period: string;
  colors: ColorPair[];
}