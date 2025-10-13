import { Alert as RNAlert, Platform } from 'react-native';

interface AlertButton {
  text?: string;
  onPress?: () => void;
  style?: 'default' | 'cancel' | 'destructive';
}

/**
 * Utilitário de Alert multiplataforma (mobile e web)
 */
export class Alert {
  static alert(title: string, message?: string, buttons?: AlertButton[]): void {
    if (Platform.OS === 'web') {
      if (buttons && buttons.length > 1) {
        const normalized = buttons ?? [];
        const confirmKeywords = ['sair', 'excluir', 'apagar', 'deletar', 'remover', 'confirmar', 'ok', 'sim'];
        const cancelKeywords = ['cancelar', 'não', 'nao', 'voltar', 'fechar'];

        const toText = (t?: string) => (t || '').toLowerCase();

        // Encontrar botão de confirmação
        let confirmButton = normalized.find(b => b.style === 'destructive');
        if (!confirmButton) {
          confirmButton = normalized.find(b => confirmKeywords.some(k => toText(b.text).includes(k)));
        }
        if (!confirmButton) {
          confirmButton = normalized.find(b => b.style === 'default');
        }
        if (!confirmButton) {
          confirmButton = normalized[normalized.length - 1];
        }

        // Encontrar botão de cancelamento
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
        window.alert(`${title}${message ? '\n\n' + message : ''}`);
        if (buttons && buttons[0]?.onPress) {
          buttons[0].onPress();
        }
      }
    } else {
      RNAlert.alert(title, message, buttons);
    }
  }

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

  static info(title: string, message?: string): void {
    Alert.alert(title, message);
  }

  static error(message: string, title: string = 'Erro'): void {
    Alert.alert(title, message);
  }

  static success(message: string, title: string = 'Sucesso'): void {
    Alert.alert(title, message);
  }
}

export default Alert;