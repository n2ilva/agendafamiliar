import React, { useEffect } from 'react';
import { StatusBar } from 'react-native';

interface SyncSystemBarsAndroidProps {
  backgroundColor: string;
  theme: 'light' | 'dark';
}

export const SyncSystemBarsAndroid: React.FC<SyncSystemBarsAndroidProps> = ({ backgroundColor, theme }) => {
  useEffect(() => {
    try {
      StatusBar.setBarStyle(theme === 'dark' ? 'light-content' : 'dark-content', true);
      StatusBar.setBackgroundColor(backgroundColor, true);
    } catch {}

    // Tentar ajustar a barra de navegação se o módulo estiver disponível
    (async () => {
      try {
        const req: any = (eval as any)('require');
        const NavigationBar: any = req ? req('expo-navigation-bar') : null;
        if (NavigationBar && NavigationBar.setBackgroundColorAsync && NavigationBar.setButtonStyleAsync) {
          await NavigationBar.setBackgroundColorAsync(backgroundColor);
          await NavigationBar.setButtonStyleAsync(theme === 'dark' ? 'light' : 'dark');
        }
      } catch {
        // Módulo não disponível; ignorar silenciosamente
      }
    })();
  }, [backgroundColor, theme]);

  return null;
};
