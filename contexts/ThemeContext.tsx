import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { useColorScheme } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';

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
  primary: '#4A90E2',
  primaryLight: '#6FA8F0',
  primaryDark: '#3A7BC8',
  
  background: '#F5F7FA',
  surface: '#FFFFFF',
  surfaceSecondary: '#F8F9FA',
  card: '#FFFFFF',
  
  textPrimary: '#1A1A1A',
  textSecondary: '#666666',
  textTertiary: '#999999',
  textInverse: '#FFFFFF',
  
  border: '#E0E0E0',
  divider: '#F0F0F0',
  
  success: '#4CAF50',
  warning: '#FF9800',
  error: '#F44336',
  info: '#2196F3',
  
  overlay: 'rgba(0, 0, 0, 0.5)',
  modalBackground: 'rgba(0, 0, 0, 0.5)',
  
  inputBackground: '#F8F9FA',
  inputBorder: '#E0E0E0',
  inputPlaceholder: '#999999',
  
  shadowColor: '#000000',
  statusBarStyle: 'dark-content',
};

const darkColors: ThemeColors = {
  primary: '#5BA3FF',
  primaryLight: '#7AB8FF',
  primaryDark: '#4A8FE6',
  
  background: '#121212',
  surface: '#1E1E1E',
  surfaceSecondary: '#2A2A2A',
  card: '#1E1E1E',
  
  textPrimary: '#FFFFFF',
  textSecondary: '#B0B0B0',
  textTertiary: '#808080',
  textInverse: '#1A1A1A',
  
  border: '#3A3A3A',
  divider: '#2A2A2A',
  
  success: '#66BB6A',
  warning: '#FFA726',
  error: '#EF5350',
  info: '#42A5F5',
  
  overlay: 'rgba(0, 0, 0, 0.7)',
  modalBackground: 'rgba(0, 0, 0, 0.7)',
  
  inputBackground: '#2A2A2A',
  inputBorder: '#3A3A3A',
  inputPlaceholder: '#808080',
  
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
