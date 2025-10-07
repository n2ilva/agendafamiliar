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
        // For multiple buttons, use confirm and handle accordingly
        const confirmed = window.confirm(`${title}\n\n${message || ''}`);
        
        // Find the appropriate button based on confirmation
        const yesButton = buttons.find(btn => 
          btn.style === 'default' || 
          btn.text?.toLowerCase().includes('sim') || 
          btn.text?.toLowerCase().includes('ok') ||
          btn.text?.toLowerCase().includes('confirmar')
        );
        
        const noButton = buttons.find(btn => 
          btn.style === 'cancel' || 
          btn.text?.toLowerCase().includes('não') || 
          btn.text?.toLowerCase().includes('cancelar')
        );
        
        if (confirmed && yesButton?.onPress) {
          yesButton.onPress();
        } else if (!confirmed && noButton?.onPress) {
          noButton.onPress();
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