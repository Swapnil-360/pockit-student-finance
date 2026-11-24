import React, { useState } from 'react';
import {
  View,
  Text,
  Modal,
  StyleSheet,
  TouchableOpacity,
  TextInput,
  ActivityIndicator,
  Alert,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import { THEME } from '../constants/theme';
import { TRANSLATIONS, Language } from '../constants/translations';
import { forgotPasswordApi } from '../services/api';

interface ForgotPasswordModalProps {
  visible: boolean;
  onClose: () => void;
  language: Language;
}

export const ForgotPasswordModal: React.FC<ForgotPasswordModalProps> = ({
  visible,
  onClose,
  language,
}) => {
  const [email, setEmail] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [loading, setLoading] = useState(false);

  const t = TRANSLATIONS[language];

  const handleReset = async () => {
    if (!email.trim() || !newPassword.trim()) {
      Alert.alert(
        language === 'bn' ? 'সতর্কতা' : 'Required',
        language === 'bn' ? 'ইমেইল এবং নতুন পাসওয়ার্ড উভয়টিই প্রদান করুন।' : 'Please enter both email and new password.'
      );
      return;
    }

    if (newPassword.trim().length < 6) {
      Alert.alert(
        language === 'bn' ? 'দুর্বল পাসওয়ার্ড' : 'Password Length',
        language === 'bn' ? 'পাসওয়ার্ড কমপক্ষে ৬ অক্ষরের হতে হবে।' : 'Password must be at least 6 characters.'
      );
      return;
    }

    setLoading(true);
    try {
      await forgotPasswordApi(email.trim(), newPassword.trim());
      Alert.alert(
        language === 'bn' ? 'সফল হয়েছে' : 'Success',
        t.resetSuccess,
        [
          {
            text: 'OK',
            onPress: () => {
              setEmail('');
              setNewPassword('');
              onClose();
            },
          },
        ]
      );
    } catch (e: any) {
      Alert.alert(
        language === 'bn' ? 'ত্রুটি' : 'Reset Failed',
        e.message || 'Could not reset password. Please check your email.'
      );
    } finally {
      setLoading(false);
    }
  };

  return (
    <Modal visible={visible} animationType="fade" transparent onRequestClose={onClose}>
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        style={styles.modalOverlay}
      >
        <View style={styles.cardContainer}>
          <View style={styles.headerRow}>
            <Text style={styles.modalTitle}>{t.resetPasswordTitle}</Text>
            <TouchableOpacity onPress={onClose} style={styles.closeBtn}>
              <Text style={styles.closeBtnText}>✕</Text>
            </TouchableOpacity>
          </View>

          <Text style={styles.subText}>
            {language === 'bn'
              ? 'আপনার নিবন্ধিত শিক্ষার্থীয় ইমেইল ও নতুন পাসওয়ার্ড লিখুন।'
              : 'Enter your registered student email and your new password.'}
          </Text>

          <Text style={styles.inputLabel}>{t.emailLabel}</Text>
          <TextInput
            style={styles.input}
            placeholder={t.emailPlaceholder}
            placeholderTextColor={THEME.colors.textMuted}
            keyboardType="email-address"
            autoCapitalize="none"
            value={email}
            onChangeText={setEmail}
          />

          <Text style={styles.inputLabel}>{t.newPasswordLabel}</Text>
          <TextInput
            style={styles.input}
            placeholder={t.passwordPlaceholder}
            placeholderTextColor={THEME.colors.textMuted}
            secureTextEntry
            value={newPassword}
            onChangeText={setNewPassword}
          />

          <TouchableOpacity
            style={[styles.resetBtn, loading && styles.btnDisabled]}
            onPress={handleReset}
            disabled={loading}
            activeOpacity={0.85}
          >
            {loading ? (
              <ActivityIndicator color="#0D1117" />
            ) : (
              <Text style={styles.resetBtnText}>{t.resetPasswordBtn}</Text>
            )}
          </TouchableOpacity>
        </View>
      </KeyboardAvoidingView>
    </Modal>
  );
};

const styles = StyleSheet.create({
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.75)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: THEME.spacing.lg,
  },
  cardContainer: {
    width: '100%',
    backgroundColor: THEME.colors.surface,
    borderRadius: THEME.radius.md,
    padding: THEME.spacing.lg,
    borderWidth: 1,
    borderColor: THEME.colors.border,
  },
  headerRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: THEME.spacing.sm,
  },
  modalTitle: {
    ...THEME.typography.h3,
    color: THEME.colors.textPrimary,
  },
  closeBtn: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: THEME.colors.surfaceSubtle,
    alignItems: 'center',
    justifyContent: 'center',
  },
  closeBtnText: {
    color: THEME.colors.textMuted,
    fontSize: 14,
    fontWeight: 'bold',
  },
  subText: {
    ...THEME.typography.bodySmall,
    color: THEME.colors.textSecondary,
    marginBottom: THEME.spacing.md,
  },
  inputLabel: {
    ...THEME.typography.caption,
    color: THEME.colors.textSecondary,
    marginBottom: 6,
    fontWeight: '600',
  },
  input: {
    backgroundColor: THEME.colors.surfaceSubtle,
    borderWidth: 1,
    borderColor: THEME.colors.border,
    borderRadius: THEME.radius.sm,
    color: THEME.colors.textPrimary,
    minHeight: 48,
    paddingHorizontal: THEME.spacing.md,
    fontSize: 15,
    marginBottom: THEME.spacing.md,
  },
  resetBtn: {
    backgroundColor: THEME.colors.primaryLight,
    borderRadius: THEME.radius.sm,
    minHeight: THEME.layout.minTouchTarget,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: THEME.spacing.sm,
  },
  btnDisabled: {
    opacity: 0.6,
  },
  resetBtnText: {
    ...THEME.typography.body,
    fontWeight: '700',
    color: '#0D1117',
  },
});

