/**
 * Accessibility Utilities - Utilitários para acessibilidade
 * 
 * Helpers para adicionar suporte a acessibilidade em componentes React Native.
 * Seguindo as diretrizes WCAG 2.1.
 */

import { AccessibilityRole, AccessibilityState, Platform } from 'react-native';

/**
 * Props de acessibilidade padrão para componentes
 */
export interface AccessibilityProps {
  accessible?: boolean;
  accessibilityLabel?: string;
  accessibilityHint?: string;
  accessibilityRole?: AccessibilityRole;
  accessibilityState?: AccessibilityState;
  accessibilityValue?: {
    min?: number;
    max?: number;
    now?: number;
    text?: string;
  };
  testID?: string;
}

/**
 * Gera props de acessibilidade para botões
 */
export function getButtonAccessibilityProps(
  label: string,
  options?: {
    hint?: string;
    disabled?: boolean;
    selected?: boolean;
    testID?: string;
  }
): AccessibilityProps {
  return {
    accessible: true,
    accessibilityLabel: label,
    accessibilityHint: options?.hint,
    accessibilityRole: 'button',
    accessibilityState: {
      disabled: options?.disabled,
      selected: options?.selected,
    },
    testID: options?.testID,
  };
}

/**
 * Gera props de acessibilidade para checkboxes/switches
 */
export function getCheckboxAccessibilityProps(
  label: string,
  checked: boolean,
  options?: {
    hint?: string;
    disabled?: boolean;
    testID?: string;
  }
): AccessibilityProps {
  return {
    accessible: true,
    accessibilityLabel: `${label}, ${checked ? 'marcado' : 'não marcado'}`,
    accessibilityHint: options?.hint ?? 'Toque duas vezes para alternar',
    accessibilityRole: 'checkbox',
    accessibilityState: {
      checked,
      disabled: options?.disabled,
    },
    testID: options?.testID,
  };
}

/**
 * Gera props de acessibilidade para campos de texto
 */
export function getTextInputAccessibilityProps(
  label: string,
  options?: {
    hint?: string;
    value?: string;
    required?: boolean;
    error?: string;
    testID?: string;
  }
): AccessibilityProps {
  let accessibilityLabel = label;
  
  if (options?.required) {
    accessibilityLabel += ', obrigatório';
  }
  
  if (options?.error) {
    accessibilityLabel += `, erro: ${options.error}`;
  }

  return {
    accessible: true,
    accessibilityLabel,
    accessibilityHint: options?.hint ?? 'Toque para editar',
    accessibilityRole: 'none', // TextInput tem seu próprio role
    accessibilityValue: options?.value ? { text: options.value } : undefined,
    testID: options?.testID,
  };
}

/**
 * Gera props de acessibilidade para headers/títulos
 */
export function getHeaderAccessibilityProps(
  text: string,
  level: 1 | 2 | 3 | 4 | 5 | 6 = 1,
  options?: {
    testID?: string;
  }
): AccessibilityProps {
  return {
    accessible: true,
    accessibilityLabel: text,
    accessibilityRole: 'header',
    testID: options?.testID,
  };
}

/**
 * Gera props de acessibilidade para imagens
 */
export function getImageAccessibilityProps(
  description: string,
  options?: {
    isDecorative?: boolean;
    testID?: string;
  }
): AccessibilityProps {
  // Imagens decorativas devem ser ignoradas por leitores de tela
  if (options?.isDecorative) {
    return {
      accessible: false,
      accessibilityLabel: '',
      testID: options?.testID,
    };
  }

  return {
    accessible: true,
    accessibilityLabel: description,
    accessibilityRole: 'image',
    testID: options?.testID,
  };
}

/**
 * Gera props de acessibilidade para links
 */
export function getLinkAccessibilityProps(
  text: string,
  options?: {
    hint?: string;
    testID?: string;
  }
): AccessibilityProps {
  return {
    accessible: true,
    accessibilityLabel: text,
    accessibilityHint: options?.hint ?? 'Toque para abrir link',
    accessibilityRole: 'link',
    testID: options?.testID,
  };
}

/**
 * Gera props de acessibilidade para listas
 */
export function getListAccessibilityProps(
  totalItems: number,
  options?: {
    label?: string;
    testID?: string;
  }
): AccessibilityProps {
  return {
    accessible: true,
    accessibilityLabel: options?.label ?? `Lista com ${totalItems} itens`,
    accessibilityRole: 'list',
    testID: options?.testID,
  };
}

/**
 * Gera props de acessibilidade para item de lista
 */
export function getListItemAccessibilityProps(
  label: string,
  index: number,
  total: number,
  options?: {
    hint?: string;
    selected?: boolean;
    testID?: string;
  }
): AccessibilityProps {
  return {
    accessible: true,
    accessibilityLabel: `${label}, item ${index + 1} de ${total}`,
    accessibilityHint: options?.hint,
    accessibilityRole: 'none',
    accessibilityState: {
      selected: options?.selected,
    },
    testID: options?.testID,
  };
}

/**
 * Gera props de acessibilidade para tabs
 */
export function getTabAccessibilityProps(
  label: string,
  index: number,
  total: number,
  selected: boolean,
  options?: {
    hint?: string;
    testID?: string;
  }
): AccessibilityProps {
  return {
    accessible: true,
    accessibilityLabel: `${label}, aba ${index + 1} de ${total}${selected ? ', selecionada' : ''}`,
    accessibilityHint: options?.hint ?? 'Toque para selecionar',
    accessibilityRole: 'tab',
    accessibilityState: {
      selected,
    },
    testID: options?.testID,
  };
}

/**
 * Gera props de acessibilidade para alertas/mensagens
 */
export function getAlertAccessibilityProps(
  message: string,
  type: 'info' | 'warning' | 'error' | 'success' = 'info',
  options?: {
    testID?: string;
  }
): AccessibilityProps {
  const typeLabels = {
    info: 'Informação',
    warning: 'Aviso',
    error: 'Erro',
    success: 'Sucesso',
  };

  return {
    accessible: true,
    accessibilityLabel: `${typeLabels[type]}: ${message}`,
    accessibilityRole: 'alert',
    testID: options?.testID,
  };
}

/**
 * Gera props de acessibilidade para indicadores de carregamento
 */
export function getLoadingAccessibilityProps(
  message: string = 'Carregando',
  options?: {
    testID?: string;
  }
): AccessibilityProps {
  return {
    accessible: true,
    accessibilityLabel: message,
    accessibilityRole: Platform.OS === 'ios' ? 'none' : 'progressbar',
    accessibilityState: {
      busy: true,
    },
    testID: options?.testID,
  };
}

/**
 * Gera props de acessibilidade para tarefas
 */
export function getTaskAccessibilityProps(
  title: string,
  completed: boolean,
  options?: {
    category?: string;
    dueDate?: string;
    assignee?: string;
    priority?: 'low' | 'medium' | 'high';
    index?: number;
    total?: number;
    testID?: string;
  }
): AccessibilityProps {
  let label = `Tarefa: ${title}`;
  
  if (completed) {
    label += ', concluída';
  }
  
  if (options?.category) {
    label += `, categoria ${options.category}`;
  }
  
  if (options?.dueDate) {
    label += `, prazo ${options.dueDate}`;
  }
  
  if (options?.assignee) {
    label += `, atribuída a ${options.assignee}`;
  }
  
  if (options?.priority) {
    const priorityLabels = { low: 'baixa', medium: 'média', high: 'alta' };
    label += `, prioridade ${priorityLabels[options.priority]}`;
  }

  if (options?.index !== undefined && options?.total !== undefined) {
    label += `, item ${options.index + 1} de ${options.total}`;
  }

  return {
    accessible: true,
    accessibilityLabel: label,
    accessibilityHint: 'Toque para abrir, toque duas vezes para marcar como concluída',
    accessibilityRole: 'button',
    accessibilityState: {
      checked: completed,
    },
    testID: options?.testID,
  };
}

/**
 * Anuncia uma mensagem para leitores de tela
 * Útil para feedback após ações
 */
export function announceForAccessibility(message: string) {
  // Em React Native, isso pode ser feito com AccessibilityInfo
  const { AccessibilityInfo } = require('react-native');
  AccessibilityInfo.announceForAccessibility(message);
}

export default {
  getButtonAccessibilityProps,
  getCheckboxAccessibilityProps,
  getTextInputAccessibilityProps,
  getHeaderAccessibilityProps,
  getImageAccessibilityProps,
  getLinkAccessibilityProps,
  getListAccessibilityProps,
  getListItemAccessibilityProps,
  getTabAccessibilityProps,
  getAlertAccessibilityProps,
  getLoadingAccessibilityProps,
  getTaskAccessibilityProps,
  announceForAccessibility,
};
