// Cross-platform Alert utility for React Native/Expo
import { Alert as RNAlert, Platform } from 'react-native';

interface AlertButton {
  text?: string;
  onPress?: () => void;
  style?: 'default' | 'cancel' | 'destructive';
}

/**
 * Cross-platform Alert utility that works on both mobile and web
 */
export class Alert {
  /**
   * Show a simple alert with OK button
   */
  static alert(title: string, message?: string, buttons?: AlertButton[]): void {
    if (Platform.OS === 'web') {
      // Web implementation using browser alert/confirm
      if (buttons && buttons.length > 1) {
        // Para múltiplos botões, usar confirm e mapear callbacks corretamente
        const normalized = buttons ?? [];

        const confirmKeywords = ['sair', 'excluir', 'apagar', 'deletar', 'remover', 'confirmar', 'ok', 'sim'];
        const cancelKeywords = ['cancelar', 'não', 'nao', 'voltar', 'fechar'];

        const toText = (t?: string) => (t || '').toLowerCase();

        // Priorizar botão destrutivo como confirmação
        let confirmButton = normalized.find(b => b.style === 'destructive');
        if (!confirmButton) {
          // Depois, tentar por palavras-chave de confirmação
          confirmButton = normalized.find(b => confirmKeywords.some(k => toText(b.text).includes(k)));
        }
        if (!confirmButton) {
          // Depois, aceitar style default
          confirmButton = normalized.find(b => b.style === 'default');
        }
        if (!confirmButton) {
          // Fallback comum: último botão é o de confirmação
          confirmButton = normalized[normalized.length - 1];
        }

        // Cancelar: priorizar style 'cancel' ou palavras-chave
        let cancelButton = normalized.find(b => b.style === 'cancel');
        if (!cancelButton) {
          cancelButton = normalized.find(b => cancelKeywords.some(k => toText(b.text).includes(k)));
        }

        const confirmed = window.confirm(`${title}\n\n${message || ''}`);

        if (confirmed) {
          confirmButton?.onPress?.();
        } else {
          cancelButton?.onPress?.();
        }
      } else {
        // Simple alert
        window.alert(`${title}${message ? '\n\n' + message : ''}`);
        if (buttons && buttons[0]?.onPress) {
          buttons[0].onPress();
        }
      }
    } else {
      // Native React Native implementation
      RNAlert.alert(title, message, buttons);
    }
  }

  /**
   * Show a confirmation dialog
   */
  static confirm(
    title: string, 
    message: string, 
    onConfirm: () => void, 
    onCancel?: () => void
  ): void {
    const buttons: AlertButton[] = [
      {
        text: 'Cancelar',
        style: 'cancel',
        onPress: onCancel
      },
      {
        text: 'Confirmar',
        style: 'default',
        onPress: onConfirm
      }
    ];

    Alert.alert(title, message, buttons);
  }

  /**
   * Show a simple info alert
   */
  static info(title: string, message?: string): void {
    Alert.alert(title, message);
  }

  /**
   * Show an error alert
   */
  static error(message: string, title: string = 'Erro'): void {
    Alert.alert(title, message);
  }

  /**
   * Show a success alert
   */
  static success(message: string, title: string = 'Sucesso'): void {
    Alert.alert(title, message);
  }
}

// Export default for easier imports
export default Alert;