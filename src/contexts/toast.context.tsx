/**
 * Toast Notification Context
 * 
 * Sistema centralizado de notificações toast para feedback ao usuário.
 * Suporta mensagens de sucesso, erro, aviso e informação.
 */

import React, { createContext, useContext, useState, useCallback, useRef, ReactNode } from 'react';
import { 
  View, 
  Text, 
  StyleSheet, 
  Animated, 
  TouchableOpacity,
  Platform 
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

// ============ Types ============
export type ToastType = 'success' | 'error' | 'warning' | 'info';

export interface ToastMessage {
  id: string;
  type: ToastType;
  title: string;
  message?: string;
  duration?: number;
  action?: {
    label: string;
    onPress: () => void;
  };
}

interface ToastContextValue {
  showToast: (toast: Omit<ToastMessage, 'id'>) => void;
  success: (title: string, message?: string) => void;
  error: (title: string, message?: string) => void;
  warning: (title: string, message?: string) => void;
  info: (title: string, message?: string) => void;
  hideToast: (id: string) => void;
  hideAll: () => void;
}

// ============ Context ============
const ToastContext = createContext<ToastContextValue | undefined>(undefined);

// ============ Toast Item Component ============
interface ToastItemProps {
  toast: ToastMessage;
  onHide: (id: string) => void;
}

const ToastItem: React.FC<ToastItemProps> = ({ toast, onHide }) => {
  const translateY = useRef(new Animated.Value(-100)).current;
  const opacity = useRef(new Animated.Value(0)).current;

  React.useEffect(() => {
    // Animação de entrada
    Animated.parallel([
      Animated.timing(translateY, {
        toValue: 0,
        duration: 300,
        useNativeDriver: true,
      }),
      Animated.timing(opacity, {
        toValue: 1,
        duration: 300,
        useNativeDriver: true,
      }),
    ]).start();

    // Auto-hide após duração
    const timer = setTimeout(() => {
      hideToast();
    }, toast.duration || 4000);

    return () => clearTimeout(timer);
  }, []);

  const hideToast = () => {
    Animated.parallel([
      Animated.timing(translateY, {
        toValue: -100,
        duration: 200,
        useNativeDriver: true,
      }),
      Animated.timing(opacity, {
        toValue: 0,
        duration: 200,
        useNativeDriver: true,
      }),
    ]).start(() => {
      onHide(toast.id);
    });
  };

  const config = getToastConfig(toast.type);

  return (
    <Animated.View 
      style={[
        styles.toastItem, 
        { 
          backgroundColor: config.bgColor,
          transform: [{ translateY }],
          opacity,
        }
      ]}
    >
      <View style={styles.toastContent}>
        <View style={[styles.iconContainer, { backgroundColor: config.iconBg }]}>
          <Ionicons name={config.icon as any} size={20} color={config.iconColor} />
        </View>
        
        <View style={styles.textContainer}>
          <Text style={[styles.toastTitle, { color: config.titleColor }]}>
            {toast.title}
          </Text>
          {toast.message && (
            <Text style={[styles.toastMessage, { color: config.messageColor }]}>
              {toast.message}
            </Text>
          )}
        </View>

        <TouchableOpacity onPress={hideToast} style={styles.closeButton}>
          <Ionicons name="close" size={20} color={config.titleColor} />
        </TouchableOpacity>
      </View>

      {toast.action && (
        <TouchableOpacity 
          style={[styles.actionButton, { borderTopColor: config.borderColor }]} 
          onPress={() => {
            toast.action?.onPress();
            hideToast();
          }}
        >
          <Text style={[styles.actionText, { color: config.actionColor }]}>
            {toast.action.label}
          </Text>
        </TouchableOpacity>
      )}
    </Animated.View>
  );
};

// ============ Toast Config ============
const getToastConfig = (type: ToastType) => {
  switch (type) {
    case 'success':
      return {
        bgColor: '#ECFDF5',
        iconBg: '#D1FAE5',
        iconColor: '#059669',
        icon: 'checkmark-circle',
        titleColor: '#065F46',
        messageColor: '#047857',
        borderColor: '#A7F3D0',
        actionColor: '#059669',
      };
    case 'error':
      return {
        bgColor: '#FEF2F2',
        iconBg: '#FEE2E2',
        iconColor: '#DC2626',
        icon: 'alert-circle',
        titleColor: '#991B1B',
        messageColor: '#B91C1C',
        borderColor: '#FECACA',
        actionColor: '#DC2626',
      };
    case 'warning':
      return {
        bgColor: '#FFFBEB',
        iconBg: '#FEF3C7',
        iconColor: '#D97706',
        icon: 'warning',
        titleColor: '#92400E',
        messageColor: '#B45309',
        borderColor: '#FDE68A',
        actionColor: '#D97706',
      };
    case 'info':
    default:
      return {
        bgColor: '#EFF6FF',
        iconBg: '#DBEAFE',
        iconColor: '#2563EB',
        icon: 'information-circle',
        titleColor: '#1E40AF',
        messageColor: '#1D4ED8',
        borderColor: '#BFDBFE',
        actionColor: '#2563EB',
      };
  }
};

// ============ Provider ============
interface ToastProviderProps {
  children: ReactNode;
  maxToasts?: number;
}

export const ToastProvider: React.FC<ToastProviderProps> = ({ 
  children, 
  maxToasts = 3 
}) => {
  const [toasts, setToasts] = useState<ToastMessage[]>([]);
  const insets = useSafeAreaInsets();
  const idCounter = useRef(0);

  const generateId = () => {
    idCounter.current += 1;
    return `toast-${idCounter.current}-${Date.now()}`;
  };

  const showToast = useCallback((toast: Omit<ToastMessage, 'id'>) => {
    const id = generateId();
    setToasts(prev => {
      const newToasts = [...prev, { ...toast, id }];
      // Limita quantidade de toasts
      if (newToasts.length > maxToasts) {
        return newToasts.slice(-maxToasts);
      }
      return newToasts;
    });
  }, [maxToasts]);

  const hideToast = useCallback((id: string) => {
    setToasts(prev => prev.filter(t => t.id !== id));
  }, []);

  const hideAll = useCallback(() => {
    setToasts([]);
  }, []);

  // Helpers
  const success = useCallback((title: string, message?: string) => {
    showToast({ type: 'success', title, message });
  }, [showToast]);

  const error = useCallback((title: string, message?: string) => {
    showToast({ type: 'error', title, message, duration: 6000 });
  }, [showToast]);

  const warning = useCallback((title: string, message?: string) => {
    showToast({ type: 'warning', title, message });
  }, [showToast]);

  const info = useCallback((title: string, message?: string) => {
    showToast({ type: 'info', title, message });
  }, [showToast]);

  return (
    <ToastContext.Provider value={{ showToast, success, error, warning, info, hideToast, hideAll }}>
      {children}
      <View 
        style={[
          styles.container, 
          { top: insets.top + (Platform.OS === 'android' ? 10 : 0) }
        ]}
        pointerEvents="box-none"
      >
        {toasts.map(toast => (
          <ToastItem key={toast.id} toast={toast} onHide={hideToast} />
        ))}
      </View>
    </ToastContext.Provider>
  );
};

// ============ Hook ============
export const useToast = (): ToastContextValue => {
  const context = useContext(ToastContext);
  if (!context) {
    throw new Error('useToast must be used within a ToastProvider');
  }
  return context;
};

// ============ Styles ============
const styles = StyleSheet.create({
  container: {
    position: 'absolute',
    left: 16,
    right: 16,
    zIndex: 9999,
    elevation: 9999,
  },
  toastItem: {
    borderRadius: 12,
    marginBottom: 8,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.15,
    shadowRadius: 8,
    elevation: 5,
    overflow: 'hidden',
  },
  toastContent: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 12,
  },
  iconContainer: {
    width: 36,
    height: 36,
    borderRadius: 18,
    justifyContent: 'center',
    alignItems: 'center',
  },
  textContainer: {
    flex: 1,
    marginLeft: 12,
    marginRight: 8,
  },
  toastTitle: {
    fontSize: 15,
    fontWeight: '600',
  },
  toastMessage: {
    fontSize: 13,
    marginTop: 2,
  },
  closeButton: {
    padding: 4,
  },
  actionButton: {
    borderTopWidth: 1,
    paddingVertical: 10,
    alignItems: 'center',
  },
  actionText: {
    fontSize: 14,
    fontWeight: '600',
  },
});

export default ToastProvider;
