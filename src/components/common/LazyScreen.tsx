/**
 * LazyScreen - Componente para lazy loading de telas
 * 
 * React Native não suporta React.lazy() nativamente como na web,
 * mas podemos usar dynamic imports com InteractionManager para
 * adiar o carregamento de componentes pesados.
 * 
 * @example
 * ```tsx
 * <LazyScreen
 *   loader={() => import('./screens/TaskScreen')}
 *   fallback={<LoadingScreen />}
 *   componentKey="TaskScreen"
 * />
 * ```
 */

import React, { useState, useEffect, useRef, ComponentType } from 'react';
import { InteractionManager } from 'react-native';
import { LoadingScreen } from './LoadingScreen';
import { useTheme } from '../../contexts/theme.context';

interface LazyScreenProps<T extends ComponentType<any>> {
  /**
   * Função que retorna a Promise do import dinâmico
   */
  loader: () => Promise<{ default: T } | T>;
  
  /**
   * Componente a ser mostrado enquanto carrega
   */
  fallback?: React.ReactNode;
  
  /**
   * Props a serem passadas para o componente carregado
   */
  componentProps?: React.ComponentProps<T>;
  
  /**
   * Key única para cache do componente
   */
  componentKey?: string;
  
  /**
   * Delay mínimo para mostrar loading (evita flicker)
   */
  minLoadingTime?: number;
}

// Cache de componentes já carregados
const componentCache = new Map<string, ComponentType<any>>();

export function LazyScreen<T extends ComponentType<any>>({
  loader,
  fallback,
  componentProps = {} as React.ComponentProps<T>,
  componentKey,
  minLoadingTime = 0
}: LazyScreenProps<T>) {
  const [Component, setComponent] = useState<ComponentType<any> | null>(
    componentKey ? componentCache.get(componentKey) ?? null : null
  );
  const [error, setError] = useState<Error | null>(null);
  const mountedRef = useRef(true);
  const { colors } = useTheme();

  useEffect(() => {
    mountedRef.current = true;

    // Se já está em cache, não precisa carregar
    if (componentKey && componentCache.has(componentKey)) {
      return;
    }

    const startTime = Date.now();

    // Usar InteractionManager para carregar após animações
    const interactionPromise = InteractionManager.runAfterInteractions(async () => {
      try {
        const module = await loader();
        const LoadedComponent = 'default' in module ? module.default : module;
        
        // Aplicar delay mínimo se necessário
        const elapsed = Date.now() - startTime;
        if (minLoadingTime > 0 && elapsed < minLoadingTime) {
          await new Promise(resolve => setTimeout(resolve, minLoadingTime - elapsed));
        }

        if (mountedRef.current) {
          // Salvar em cache
          if (componentKey) {
            componentCache.set(componentKey, LoadedComponent);
          }
          setComponent(() => LoadedComponent);
        }
      } catch (err) {
        if (mountedRef.current) {
          setError(err as Error);
          console.error('LazyScreen: Erro ao carregar componente:', err);
        }
      }
    });

    return () => {
      mountedRef.current = false;
      interactionPromise.cancel();
    };
  }, [loader, componentKey, minLoadingTime]);

  if (error) {
    // Poderia usar ErrorBoundary aqui também
    return (
      <LoadingScreen 
        colors={colors} 
        message="Erro ao carregar tela"
      />
    );
  }

  if (!Component) {
    return fallback ?? <LoadingScreen colors={colors} />;
  }

  return <Component {...componentProps} />;
}

/**
 * Hook para pré-carregar componentes
 * Útil para carregar telas em background antes de navegar
 */
export function usePreloadScreen(
  key: string,
  loader: () => Promise<{ default: ComponentType<any> } | ComponentType<any>>
) {
  const preload = React.useCallback(async () => {
    if (componentCache.has(key)) {
      return componentCache.get(key);
    }

    try {
      const module = await loader();
      const LoadedComponent = 'default' in module ? module.default : module;
      componentCache.set(key, LoadedComponent);
      return LoadedComponent;
    } catch (error) {
      console.error(`usePreloadScreen: Erro ao pré-carregar ${key}:`, error);
      return null;
    }
  }, [key, loader]);

  return { preload, isLoaded: componentCache.has(key) };
}

/**
 * Limpar cache de componentes (útil em logout)
 */
export function clearLazyScreenCache() {
  componentCache.clear();
}

export default LazyScreen;
