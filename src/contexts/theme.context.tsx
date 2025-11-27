import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { useColorScheme } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { APP_COLORS, THEMES } from '../constants/colors';

export type ThemeMode = 'light' | 'dark' | 'auto';
export type ActiveTheme = 'light' | 'dark';

interface ThemeContextType {
  themeMode: ThemeMode;
  activeTheme: ActiveTheme;
  setThemeMode: (mode: ThemeMode) => void;
  toggleTheme: () => void;
  colors: ThemeColors;
}

export interface ThemeColors {
  // Cores principais
  primary: string;
  primaryLight: string;
  primaryDark: string;
  
  // Backgrounds
  background: string;
  surface: string;
  surfaceSecondary: string;
  card: string;
  
  // Textos
  textPrimary: string;
  textSecondary: string;
  textTertiary: string;
  textInverse: string;
  
  // Borders e divisores
  border: string;
  divider: string;
  
  // Estados
  success: string;
  warning: string;
  error: string;
  info: string;
  
  // Overlays
  overlay: string;
  modalBackground: string;
  
  // Inputs
  inputBackground: string;
  inputBorder: string;
  inputPlaceholder: string;
  
  // Shadows (usados em elevation)
  shadowColor: string;
  
  // Status bar
  statusBarStyle: 'light-content' | 'dark-content';
}

const lightColors: ThemeColors = {
  primary: APP_COLORS.primary.main,
  primaryLight: APP_COLORS.primary.light,
  primaryDark: APP_COLORS.primary.dark,
  
  background: APP_COLORS.background.lightGray,
  surface: APP_COLORS.background.white,
  surfaceSecondary: APP_COLORS.background.gray,
  card: APP_COLORS.background.white,
  
  textPrimary: APP_COLORS.text.primary,
  textSecondary: APP_COLORS.text.secondary,
  textTertiary: APP_COLORS.text.light,
  textInverse: APP_COLORS.text.white,
  
  border: APP_COLORS.border.light,
  divider: APP_COLORS.border.light,
  
  success: APP_COLORS.status.success,
  warning: APP_COLORS.status.warning,
  error: APP_COLORS.status.error,
  info: APP_COLORS.status.info,
  
  overlay: 'rgba(0, 0, 0, 0.5)',
  modalBackground: 'rgba(0, 0, 0, 0.5)',
  
  inputBackground: APP_COLORS.background.gray,
  inputBorder: APP_COLORS.border.light,
  inputPlaceholder: APP_COLORS.text.muted,
  
  shadowColor: '#000000',
  statusBarStyle: 'dark-content',
};

const darkColors: ThemeColors = {
  primary: APP_COLORS.primary.light,
  primaryLight: APP_COLORS.primary.lighter,
  primaryDark: APP_COLORS.primary.main,
  
  background: APP_COLORS.background.dark,
  surface: APP_COLORS.background.darkGray,
  surfaceSecondary: '#2A2A2A',
  card: '#2C2C2C',
  
  textPrimary: APP_COLORS.text.white,
  textSecondary: APP_COLORS.text.light,
  textTertiary: APP_COLORS.text.muted,
  textInverse: APP_COLORS.text.primary,
  
  border: '#424242',
  divider: '#2A2A2A',
  
  success: '#66BB6A',
  warning: '#FFA726',
  error: '#EF5350',
  info: APP_COLORS.secondary.light,
  
  overlay: 'rgba(0, 0, 0, 0.7)',
  modalBackground: 'rgba(0, 0, 0, 0.7)',
  
  inputBackground: '#2A2A2A',
  inputBorder: '#424242',
  inputPlaceholder: APP_COLORS.text.muted,
  
  shadowColor: '#000000',
  statusBarStyle: 'light-content',
};

const ThemeContext = createContext<ThemeContextType | undefined>(undefined);

const THEME_STORAGE_KEY = '@app_theme_mode';

export const ThemeProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const systemColorScheme = useColorScheme();
  const [themeMode, setThemeModeState] = useState<ThemeMode>('auto');
  const [isLoaded, setIsLoaded] = useState(false);

  // Determinar tema ativo baseado no modo escolhido
  const activeTheme: ActiveTheme = 
    themeMode === 'auto' 
      ? (systemColorScheme === 'dark' ? 'dark' : 'light')
      : themeMode;

  const colors = activeTheme === 'dark' ? darkColors : lightColors;

  // Carregar preferência salva
  useEffect(() => {
    loadThemePreference();
  }, []);

  const loadThemePreference = async () => {
    try {
      const saved = await AsyncStorage.getItem(THEME_STORAGE_KEY);
      if (saved && (saved === 'light' || saved === 'dark' || saved === 'auto')) {
        setThemeModeState(saved as ThemeMode);
      }
    } catch (error) {
      console.warn('Erro ao carregar preferência de tema:', error);
    } finally {
      setIsLoaded(true);
    }
  };

  const setThemeMode = async (mode: ThemeMode) => {
    setThemeModeState(mode);
    try {
      await AsyncStorage.setItem(THEME_STORAGE_KEY, mode);
    } catch (error) {
      console.warn('Erro ao salvar preferência de tema:', error);
    }
  };

  const toggleTheme = () => {
    // Ciclo: light -> dark -> auto -> light
    const modes: ThemeMode[] = ['light', 'dark', 'auto'];
    const currentIndex = modes.indexOf(themeMode);
    const nextIndex = (currentIndex + 1) % modes.length;
    setThemeMode(modes[nextIndex]);
  };

  // Não renderizar até carregar a preferência
  if (!isLoaded) {
    return null;
  }

  return (
    <ThemeContext.Provider value={{ themeMode, activeTheme, setThemeMode, toggleTheme, colors }}>
      {children}
    </ThemeContext.Provider>
  );
};

export const useTheme = (): ThemeContextType => {
  const context = useContext(ThemeContext);
  if (!context) {
    throw new Error('useTheme deve ser usado dentro de um ThemeProvider');
  }
  return context;
};
