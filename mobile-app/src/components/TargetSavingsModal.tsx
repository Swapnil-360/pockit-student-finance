import React, { useState, useEffect } from 'react';
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
import { Ionicons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useTheme } from '../constants/ThemeContext';
import { TRANSLATIONS, Language } from '../constants/translations';
import { updateTargetSavings } from '../services/api';

interface TargetSavingsModalProps {
  visible: boolean;
  currentSavings: number;
  userId: string;
  language: Language;
  onClose: () => void;
  onSaved: (newTarget: number) => void;
}

const PRESETS = [0, 500, 1000, 2000];

export const TargetSavingsModal: React.FC<TargetSavingsModalProps> = ({
  visible,
  currentSavings,
  userId,
  language,
  onClose,
  onSaved,
}) => {
  const { isDark, theme } = useTheme();
  const [savingsInput, setSavingsInput] = useState(String(currentSavings || 0));
  const [saving, setSaving] = useState(false);
  const insets = useSafeAreaInsets();
  const safeBottom = Math.max(insets.bottom, 16);
  const t = TRANSLATIONS[language];

  useEffect(() => {
    if (visible) {
      setSavingsInput(String(currentSavings || 0));
    }
  }, [visible, currentSavings]);

  const handleSelectPreset = (amount: number) => {
    try {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    } catch {}
    setSavingsInput(String(amount));
  };

  const handleSave = async () => {
    const val = parseFloat(savingsInput.trim());
    if (isNaN(val) || val < 0) {
      Alert.alert(
        language === 'bn' ? 'সতর্কতা' : 'Invalid Amount',
        language === 'bn'
          ? 'অনুগ্রহ করে সঠিক টাকার পরিমাণ লিখুন (যেমন: ০, ৫০০, ১০০০)।'
          : 'Please enter a valid amount (e.g. 0, 500, 1000).'
      );
      return;
    }

    try {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    } catch {}

    setSaving(true);
    try {
      await updateTargetSavings(userId, val);
      onSaved(val);
      onClose();
    } catch (err: any) {
      Alert.alert(
        language === 'bn' ? 'ত্রুটি' : 'Save Error',
        err.message || 'Could not update target savings.'
      );
    } finally {
      setSaving(false);
    }
  };

  const currentNumeric = parseFloat(savingsInput) || 0;

  return (
    <Modal visible={visible} animationType="slide" transparent onRequestClose={onClose}>
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        style={styles.overlay}
      >
        <TouchableOpacity style={styles.backdrop} activeOpacity={1} onPress={onClose} />
        <View
          style={[
            styles.sheetContainer,
            {
              backgroundColor: theme.surface,
              borderColor: theme.borderMedium,
              paddingBottom: safeBottom + 12,
            },
          ]}
        >
          {/* Header */}
          <View style={styles.headerRow}>
            <View style={styles.headerLeft}>
              <View style={[styles.targetIconBox, { backgroundColor: theme.terracottaSoft }]}>
                <Ionicons name="shield-checkmark" size={20} color={theme.primary} />
              </View>
              <View>
                <Text style={[styles.modalTitle, { color: theme.textPrimary }]}>
                  {t.targetSavingsModalTitle}
                </Text>
                <Text style={[styles.modalSubtitle, { color: theme.textSecondary }]}>
                  {language === 'bn' ? 'মাসিক সংরক্ষিত ফান্ড' : 'Ring-fenced monthly reserve'}
                </Text>
              </View>
            </View>
            <TouchableOpacity onPress={onClose} style={[styles.closeBtn, { backgroundColor: isDark ? '#263B4D' : '#E2EAF1' }]}>
              <Ionicons name="close" size={18} color={theme.textPrimary} />
            </TouchableOpacity>
          </View>

          {/* Educational Note */}
          <View
            style={[
              styles.infoCard,
              {
                backgroundColor: isDark ? '#141E2B' : '#F6F9FB',
                borderColor: theme.border,
              },
            ]}
          >
            <Ionicons name="information-circle" size={18} color={theme.primary} />
            <Text style={[styles.infoText, { color: theme.textSecondary }]}>
              {t.targetSavingsDesc}
            </Text>
          </View>

          {/* Amount Input */}
          <View style={styles.inputContainer}>
            <Text style={[styles.inputLabel, { color: theme.textSecondary }]}>
              {language === 'bn' ? 'সঞ্চয় লক্ষ্য (টাকা)' : 'Target Savings Amount (Tk)'}
            </Text>
            <View
              style={[
                styles.amountInputWrap,
                {
                  backgroundColor: isDark ? '#0F1722' : '#F8FAFC',
                  borderColor: theme.borderMedium,
                },
              ]}
            >
              <Text style={[styles.currencyPrefix, { color: theme.primary }]}>৳</Text>
              <TextInput
                style={[styles.numericInput, { color: theme.textPrimary }]}
                keyboardType="numeric"
                value={savingsInput}
                onChangeText={setSavingsInput}
                placeholder="0"
                placeholderTextColor={theme.textMuted}
                maxLength={6}
              />
            </View>
          </View>

          {/* Quick Preset Chips */}
          <View style={styles.presetsRow}>
            {PRESETS.map((amt) => {
              const active = currentNumeric === amt;
              return (
                <TouchableOpacity
                  key={amt}
                  style={[
                    styles.presetChip,
                    {
                      backgroundColor: active
                        ? theme.primary
                        : isDark
                        ? '#141E2B'
                        : '#EDF4F9',
                      borderColor: active ? theme.primary : theme.border,
                    },
                  ]}
                  onPress={() => handleSelectPreset(amt)}
                  activeOpacity={0.8}
                >
                  <Text
                    style={[
                      styles.presetChipText,
                      {
                        color: active ? '#FFFFFF' : theme.textPrimary,
                        fontWeight: active ? '800' : '600',
                      },
                    ]}
                  >
                    {amt === 0 ? (language === 'bn' ? '০ (নেই)' : '৳0 (None)') : `৳${amt.toLocaleString()}`}
                  </Text>
                </TouchableOpacity>
              );
            })}
          </View>

          {/* Save Action Button */}
          <TouchableOpacity
            style={[styles.saveBtn, { backgroundColor: theme.primary }]}
            onPress={handleSave}
            disabled={saving}
            activeOpacity={0.85}
          >
            {saving ? (
              <ActivityIndicator color="#FFFFFF" size="small" />
            ) : (
              <>
                <Ionicons name="checkmark-circle" size={18} color="#FFFFFF" />
                <Text style={styles.saveBtnText}>{t.saveTargetSavingsBtn}</Text>
              </>
            )}
          </TouchableOpacity>
        </View>
      </KeyboardAvoidingView>
    </Modal>
  );
};

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    justifyContent: 'flex-end',
  },
  backdrop: {
    ...StyleSheet.absoluteFill,
    backgroundColor: 'rgba(15, 23, 42, 0.5)',
  },
  sheetContainer: {
    borderTopLeftRadius: 28,
    borderTopRightRadius: 28,
    borderWidth: 1,
    borderBottomWidth: 0,
    paddingHorizontal: 20,
    paddingTop: 20,
  },
  headerRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  headerLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  targetIconBox: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
  },
  modalTitle: {
    fontSize: 16,
    fontWeight: '800',
    letterSpacing: -0.3,
  },
  modalSubtitle: {
    fontSize: 12,
    marginTop: 2,
  },
  closeBtn: {
    width: 32,
    height: 32,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
  },
  infoCard: {
    flexDirection: 'row',
    padding: 12,
    borderRadius: 14,
    borderWidth: 1,
    gap: 10,
    marginBottom: 18,
    alignItems: 'center',
  },
  infoText: {
    flex: 1,
    fontSize: 12,
    lineHeight: 18,
  },
  inputContainer: {
    marginBottom: 16,
  },
  inputLabel: {
    fontSize: 12,
    fontWeight: '700',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    marginBottom: 8,
  },
  amountInputWrap: {
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: 16,
    borderWidth: 1.5,
    paddingHorizontal: 16,
    height: 56,
  },
  currencyPrefix: {
    fontSize: 24,
    fontWeight: '800',
    marginRight: 8,
  },
  numericInput: {
    flex: 1,
    fontSize: 26,
    fontWeight: '800',
    letterSpacing: -0.5,
    fontVariant: ['tabular-nums'],
  },
  presetsRow: {
    flexDirection: 'row',
    gap: 8,
    marginBottom: 22,
  },
  presetChip: {
    flex: 1,
    height: 40,
    borderRadius: 12,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  presetChipText: {
    fontSize: 12,
  },
  saveBtn: {
    height: 52,
    borderRadius: 16,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
  },
  saveBtnText: {
    color: '#FFFFFF',
    fontSize: 15,
    fontWeight: '800',
  },
});
