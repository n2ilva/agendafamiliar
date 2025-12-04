/**
 * ErrorBoundary Component
 * 
 * Captura erros em componentes filhos e exibe uma UI de fallback.
 * Previne que erros isolados causem crash de toda a aplicação.
 */

import React, { Component, ErrorInfo, ReactNode } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ScrollView } from 'react-native';
import { Ionicons } from '@expo/vector-icons';

interface Props {
  children: ReactNode;
  fallback?: ReactNode;
  onError?: (error: Error, errorInfo: ErrorInfo) => void;
  showDetails?: boolean;
}

interface State {
  hasError: boolean;
  error: Error | null;
  errorInfo: ErrorInfo | null;
  showErrorDetails: boolean;
}

export class ErrorBoundary extends Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = {
      hasError: false,
      error: null,
      errorInfo: null,
      showErrorDetails: false,
    };
  }

  static getDerivedStateFromError(error: Error): Partial<State> {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo): void {
    this.setState({ errorInfo });
    
    // Log do erro
    console.error('❌ [ErrorBoundary] Erro capturado:', error);
    console.error('📍 [ErrorBoundary] Stack:', errorInfo.componentStack);
    
    // Callback opcional para logging externo
    this.props.onError?.(error, errorInfo);
  }

  handleRetry = (): void => {
    this.setState({
      hasError: false,
      error: null,
      errorInfo: null,
      showErrorDetails: false,
    });
  };

  toggleErrorDetails = (): void => {
    this.setState(prev => ({ showErrorDetails: !prev.showErrorDetails }));
  };

  render(): ReactNode {
    if (this.state.hasError) {
      // Fallback customizado
      if (this.props.fallback) {
        return this.props.fallback;
      }

      // Fallback padrão
      return (
        <View style={styles.container}>
          <View style={styles.content}>
            <Ionicons name="warning-outline" size={64} color="#EF4444" />
            
            <Text style={styles.title}>Ops! Algo deu errado</Text>
            <Text style={styles.subtitle}>
              Ocorreu um erro inesperado. Por favor, tente novamente.
            </Text>

            <TouchableOpacity style={styles.retryButton} onPress={this.handleRetry}>
              <Ionicons name="refresh" size={20} color="#FFFFFF" />
              <Text style={styles.retryButtonText}>Tentar Novamente</Text>
            </TouchableOpacity>

            {this.props.showDetails !== false && (
              <TouchableOpacity 
                style={styles.detailsButton} 
                onPress={this.toggleErrorDetails}
              >
                <Text style={styles.detailsButtonText}>
                  {this.state.showErrorDetails ? 'Ocultar detalhes' : 'Ver detalhes'}
                </Text>
                <Ionicons 
                  name={this.state.showErrorDetails ? 'chevron-up' : 'chevron-down'} 
                  size={16} 
                  color="#6B7280" 
                />
              </TouchableOpacity>
            )}

            {this.state.showErrorDetails && this.state.error && (
              <ScrollView style={styles.errorDetails}>
                <Text style={styles.errorName}>{this.state.error.name}</Text>
                <Text style={styles.errorMessage}>{this.state.error.message}</Text>
                {this.state.errorInfo && (
                  <Text style={styles.errorStack}>
                    {this.state.errorInfo.componentStack}
                  </Text>
                )}
              </ScrollView>
            )}
          </View>
        </View>
      );
    }

    return this.props.children;
  }
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F9FAFB',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  content: {
    alignItems: 'center',
    maxWidth: 400,
  },
  title: {
    fontSize: 24,
    fontWeight: '700',
    color: '#1F2937',
    marginTop: 16,
    textAlign: 'center',
  },
  subtitle: {
    fontSize: 16,
    color: '#6B7280',
    marginTop: 8,
    textAlign: 'center',
    lineHeight: 24,
  },
  retryButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#3B82F6',
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 8,
    marginTop: 24,
    gap: 8,
  },
  retryButtonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '600',
  },
  detailsButton: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 16,
    gap: 4,
  },
  detailsButtonText: {
    color: '#6B7280',
    fontSize: 14,
  },
  errorDetails: {
    marginTop: 16,
    backgroundColor: '#FEE2E2',
    borderRadius: 8,
    padding: 12,
    maxHeight: 200,
    width: '100%',
  },
  errorName: {
    fontSize: 14,
    fontWeight: '700',
    color: '#991B1B',
  },
  errorMessage: {
    fontSize: 13,
    color: '#B91C1C',
    marginTop: 4,
  },
  errorStack: {
    fontSize: 11,
    color: '#7F1D1D',
    marginTop: 8,
    fontFamily: 'monospace',
  },
});

/**
 * HOC para envolver componentes com ErrorBoundary
 */
export function withErrorBoundary<P extends object>(
  WrappedComponent: React.ComponentType<P>,
  fallback?: ReactNode
): React.FC<P> {
  return function WithErrorBoundaryWrapper(props: P) {
    return (
      <ErrorBoundary fallback={fallback}>
        <WrappedComponent {...props} />
      </ErrorBoundary>
    );
  };
}

export default ErrorBoundary;
