import { Alert, Platform } from 'react-native';

/**
 * Polyfill Alert.alert for React Native for Web.
 * By default, react-native-web provides a completely empty dummy stub: `class Alert { static alert() {} }`.
 * This polyfill enables full confirmation dialogs via window.confirm and notices via window.alert,
 * correctly triggering the appropriate button onPress callbacks.
 */
if (Platform.OS === 'web') {
  const webAlert = (
    title: string,
    message?: string,
    buttons?: Array<{
      text?: string;
      onPress?: () => void;
      style?: 'default' | 'cancel' | 'destructive';
    }>,
    options?: any
  ) => {
    const fullText = [title, message].filter(Boolean).join('\n\n');

    if (buttons && buttons.length > 1) {
      const confirmed = typeof window !== 'undefined' ? window.confirm(fullText) : true;
      if (confirmed) {
        const actionBtn =
          buttons.find((b) => b.style !== 'cancel' && typeof b.onPress === 'function') ||
          buttons[buttons.length - 1];
        if (actionBtn && typeof actionBtn.onPress === 'function') {
          actionBtn.onPress();
        }
      } else {
        const cancelBtn = buttons.find((b) => b.style === 'cancel');
        if (cancelBtn && typeof cancelBtn.onPress === 'function') {
          cancelBtn.onPress();
        }
      }
    } else {
      if (typeof window !== 'undefined') {
        window.alert(fullText);
      }
      if (buttons && buttons[0] && typeof buttons[0].onPress === 'function') {
        buttons[0].onPress();
      }
    }
  };

  (Alert as any).alert = webAlert;
}

export {};

