import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Alert,
  Platform,
  StatusBar,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { THEME } from '../constants/theme';
import { TRANSLATIONS, Language } from '../constants/translations';
import { getStoredAppPin, authenticateWithBiometrics, isBiometricsAvailable } from '../services/security';

interface PinLockScreenProps {
  language: Language;
  onUnlockSuccess: () => void;
  onSignOutFallback?: () => void;
}

export const PinLockScreen: React.FC<PinLockScreenProps> = ({
  language,
  onUnlockSuccess,
  onSignOutFallback,
}) => {
  const [pin, setPin] = useState('');
  const [hasBio, setHasBio] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');

  const t = TRANSLATIONS[language];

  useEffect(() => {
    checkBiometrics();
  }, []);

  const checkBiometrics = async () => {
    const available = await isBiometricsAvailable();
    setHasBio(available);
    if (available) {
      handleBiometricAuth();
    }
  };

  const handleBiometricAuth = async () => {
    const success = await authenticateWithBiometrics(t.biometricPrompt);
    if (success) {
      onUnlockSuccess();
    }
  };

  const handleKeyPress = async (val: string) => {
    if (pin.length >= 4) return;
    const newPin = pin + val;
    setPin(newPin);
    setErrorMsg('');

    if (newPin.length === 4) {
      const storedPin = await getStoredAppPin();
      if (storedPin && storedPin === newPin) {
        onUnlockSuccess();
      } else {
        setErrorMsg(language === 'bn' ? 'ভুল পিন কোড। পুনরায় চেষ্টা করুন।' : 'Incorrect PIN. Try again.');
        setTimeout(() => {
          setPin('');
        }, 500);
      }
    }
  };

  const handleDelete = () => {
    if (pin.length > 0) {
      setPin(pin.slice(0, -1));
      setErrorMsg('');
    }
  };

  const insets = useSafeAreaInsets();
  const safeTop = Math.max(insets.top, Platform.OS === 'android' ? (StatusBar.currentHeight || 36) : 44) + 12;
  const safeBottom = Math.max(insets.bottom, 16);

  return (
    <View style={[styles.container, { paddingTop: safeTop, paddingBottom: safeBottom + 12 }]}>
      {/* Header */}
      <View style={styles.header}>
        <View style={styles.lockBadge}>
          <Text style={styles.lockIconText}>🔒</Text>
        </View>
        <Text style={styles.title}>{t.pinLockTitle}</Text>
        <Text style={styles.subtitle}>{t.pinLockSub}</Text>
      </View>

      {/* 4-Digit Pin Dots */}
      <View style={styles.dotsContainer}>
        {[0, 1, 2, 3].map((idx) => {
          const filled = idx < pin.length;
          return (
            <View
              key={idx}
              style={[
                styles.dot,
                filled && styles.dotFilled,
                Boolean(errorMsg) && styles.dotError,
              ]}
            />
          );
        })}
      </View>

      {Boolean(errorMsg) && <Text style={styles.errorText}>{errorMsg}</Text>}

      {/* Number Pad Grid */}
      <View style={styles.keypad}>
        {[
          ['1', '2', '3'],
          ['4', '5', '6'],
          ['7', '8', '9'],
        ].map((row, rIdx) => (
          <View key={rIdx} style={styles.keypadRow}>
            {row.map((num) => (
              <TouchableOpacity
                key={num}
                style={styles.keyBtn}
                onPress={() => handleKeyPress(num)}
                activeOpacity={0.7}
              >
                <Text style={styles.keyText}>{num}</Text>
              </TouchableOpacity>
            ))}
          </View>
        ))}

        {/* Bottom Row: Biometrics / Empty | 0 | Backspace */}
        <View style={styles.keypadRow}>
          {hasBio ? (
            <TouchableOpacity
              style={styles.keyBtnAux}
              onPress={handleBiometricAuth}
              activeOpacity={0.7}
            >
              <Text style={styles.keyAuxText}>BIO</Text>
            </TouchableOpacity>
          ) : (
            <View style={styles.keyBtnPlaceholder} />
          )}

          <TouchableOpacity
            style={styles.keyBtn}
            onPress={() => handleKeyPress('0')}
            activeOpacity={0.7}
          >
            <Text style={styles.keyText}>0</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.keyBtnAux}
            onPress={handleDelete}
            activeOpacity={0.7}
          >
            <Text style={styles.keyAuxText}>⌫</Text>
          </TouchableOpacity>
        </View>
      </View>

      {onSignOutFallback && (
        <TouchableOpacity style={styles.forgotBtn} onPress={onSignOutFallback}>
          <Text style={styles.forgotBtnText}>
            {language === 'bn' ? 'পিন ভুলে গেছেন? লগআউট করুন' : 'Forgot PIN? Sign Out'}
          </Text>
        </TouchableOpacity>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: THEME.colors.background,
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: THEME.spacing.xl,
    paddingBottom: 40,
  },
  header: {
    alignItems: 'center',
  },
  lockBadge: {
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: THEME.colors.surfaceSubtle,
    borderWidth: 1,
    borderColor: THEME.colors.border,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: THEME.spacing.md,
  },
  lockIconText: {
    fontSize: 28,
  },
  title: {
    ...THEME.typography.h2,
    color: THEME.colors.textPrimary,
    marginBottom: 6,
  },
  subtitle: {
    ...THEME.typography.bodySmall,
    color: THEME.colors.textSecondary,
    textAlign: 'center',
    maxWidth: 260,
  },
  dotsContainer: {
    flexDirection: 'row',
    gap: 20,
    marginVertical: 24,
  },
  dot: {
    width: 18,
    height: 18,
    borderRadius: 9,
    borderWidth: 2,
    borderColor: THEME.colors.border,
    backgroundColor: THEME.colors.surfaceSubtle,
  },
  dotFilled: {
    borderColor: THEME.colors.primaryLight,
    backgroundColor: THEME.colors.primaryLight,
  },
  dotError: {
    borderColor: THEME.colors.riskHigh,
    backgroundColor: THEME.colors.riskHighBg,
  },
  errorText: {
    ...THEME.typography.bodySmall,
    color: THEME.colors.riskHigh,
    marginTop: -10,
    marginBottom: 10,
  },
  keypad: {
    width: '100%',
    maxWidth: 320,
  },
  keypadRow: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    marginBottom: 16,
  },
  keyBtn: {
    width: 72,
    height: 72,
    borderRadius: 36,
    backgroundColor: THEME.colors.surfaceSubtle,
    borderWidth: 1,
    borderColor: THEME.colors.border,
    alignItems: 'center',
    justifyContent: 'center',
  },
  keyText: {
    fontSize: 26,
    fontWeight: '700',
    color: THEME.colors.textPrimary,
  },
  keyBtnAux: {
    width: 72,
    height: 72,
    borderRadius: 36,
    alignItems: 'center',
    justifyContent: 'center',
  },
  keyAuxText: {
    fontSize: 22,
    fontWeight: '700',
    color: THEME.colors.textSecondary,
  },
  keyBtnPlaceholder: {
    width: 72,
    height: 72,
  },
  forgotBtn: {
    paddingVertical: 12,
  },
  forgotBtnText: {
    ...THEME.typography.caption,
    color: THEME.colors.textMuted,
  },
});

