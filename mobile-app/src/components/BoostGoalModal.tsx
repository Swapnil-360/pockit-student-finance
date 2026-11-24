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
import { Ionicons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useTheme } from '../constants/ThemeContext';
import { TRANSLATIONS, Language } from '../constants/translations';
import { boostSavingsGoal, SavingsGoal } from '../services/api';

interface BoostGoalModalProps {
  visible: boolean;
  goal: SavingsGoal | null;
  userId: string;
  language: Language;
  onClose: () => void;
  onGoalBoosted: (updatedGoal: SavingsGoal) => void;
}

const PRESETS = [200, 500, 1000, 2000];

export const BoostGoalModal: React.FC<BoostGoalModalProps> = ({
  visible,
  goal,
  userId,
  language,
  onClose,
  onGoalBoosted,
}) => {
  const { isDark, theme } = useTheme();
  const t = TRANSLATIONS[language];
  const insets = useSafeAreaInsets();
  const safeBottom = Math.max(insets.bottom, 16);

  const [amountStr, setAmountStr] = useState('500');
  const [loading, setLoading] = useState(false);

  if (!goal) return null;

  const boostAmount = parseFloat(amountStr) || 0;
  const newTotal = goal.current_saved + boostAmount;
  const newRemaining = Math.max(0, goal.target_amount - newTotal);
  const isTimelineMode = goal.planning_mode === 'target_timeline';

  // Mode A: Floating duration (Monthly Budget mode)
  const newMonthsLeft = goal.monthly_commitment > 0 ? Math.ceil(newRemaining / goal.monthly_commitment) : 0;
  const monthsSaved = Math.max(0, (goal.estimated_months_left || 0) - newMonthsLeft);

  // Mode B: Fixed deadline, lowering required monthly savings
  const remainingMonths = Math.max(1, goal.target_months || goal.estimated_months_left || 1);
  const newRequiredMonthly = isTimelineMode ? Math.ceil(newRemaining / remainingMonths) : 0;
  const monthlySavingsDrop = isTimelineMode ? Math.max(0, Math.round((goal.required_monthly_savings || goal.monthly_commitment) - newRequiredMonthly)) : 0;

  const handleBoost = async () => {
    if (boostAmount <= 0) {
      Alert.alert(language === 'bn' ? 'ভুল পরিমাণ' : 'Invalid Amount', language === 'bn' ? 'সঠিক টাকার পরিমাণ লিখুন।' : 'Please enter a valid boost amount.');
      return;
    }

    try {
      setLoading(true);
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
      const updated = await boostSavingsGoal(goal.id, userId, boostAmount);
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      onGoalBoosted(updated);
      onClose();
    } catch (e: any) {
      Alert.alert('Error', e.message || 'Failed to boost savings');
    } finally {
      setLoading(false);
    }
  };

  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        style={styles.modalOverlay}
      >
        <TouchableOpacity style={StyleSheet.absoluteFill} activeOpacity={1} onPress={onClose} />

        <View
          style={[
            styles.sheetContent,
            {
              backgroundColor: isDark ? '#172538' : '#FFFFFF',
              borderColor: isDark ? 'rgba(255, 255, 255, 0.1)' : 'rgba(83, 122, 150, 0.15)',
              paddingBottom: safeBottom,
            },
          ]}
        >
          {/* Header */}
          <View style={styles.sheetHeader}>
            <View>
              <Text style={[styles.sheetTitle, { color: theme.textPrimary }]}>
                {language === 'bn' ? 'তাৎক্ষণিক সঞ্চয় বুস্ট' : 'Instant Savings Boost'}
              </Text>
              <Text style={[styles.sheetSub, { color: theme.textSecondary }]}>
                {goal.title}
              </Text>
            </View>
            <TouchableOpacity onPress={onClose} hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}>
              <Ionicons name="close-circle" size={26} color={theme.textSecondary} />
            </TouchableOpacity>
          </View>

          {/* Quick Preset Pills */}
          <Text style={[styles.label, { color: theme.textPrimary }]}>
            {language === 'bn' ? 'দ্রুত পরিমাণ নির্বাচন' : 'Quick Amount'}
          </Text>
          <View style={styles.presetRow}>
            {PRESETS.map((val) => {
              const selected = amountStr === String(val);
              return (
                <TouchableOpacity
                  key={val}
                  style={[
                    styles.presetPill,
                    {
                      backgroundColor: selected
                        ? theme.primaryAccent
                        : isDark ? 'rgba(255, 255, 255, 0.06)' : '#EEF3F7',
                    },
                  ]}
                  onPress={() => {
                    try { Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light); } catch {}
                    setAmountStr(String(val));
                  }}
                >
                  <Text
                    style={[
                      styles.presetText,
                      { color: selected ? '#FFFFFF' : theme.textPrimary },
                    ]}
                  >
                    +৳{val}
                  </Text>
                </TouchableOpacity>
              );
            })}
          </View>

          {/* Custom Input */}
          <View style={styles.inputGroup}>
            <Text style={[styles.label, { color: theme.textPrimary }]}>
              {language === 'bn' ? 'কাস্টম পরিমাণ (৳)' : 'Custom Amount (৳)'}
            </Text>
            <TextInput
              style={[
                styles.textInput,
                {
                  backgroundColor: isDark ? 'rgba(255, 255, 255, 0.05)' : '#F4F7FA',
                  borderColor: isDark ? 'rgba(255, 255, 255, 0.1)' : '#D5E4EF',
                  color: theme.textPrimary,
                },
              ]}
              placeholder="e.g. 500"
              placeholderTextColor={theme.textSecondary}
              keyboardType="numeric"
              value={amountStr}
              onChangeText={setAmountStr}
            />
          </View>

          {/* Impact Projection */}
          {boostAmount > 0 && (
            <View style={[styles.projectionBox, { backgroundColor: isDark ? 'rgba(16, 185, 129, 0.15)' : '#ECFDF5' }]}>
              <Ionicons name="flash-outline" size={20} color="#10B981" style={{ marginRight: 8 }} />
              <View style={{ flex: 1 }}>
                <Text style={[styles.projectionTitle, { color: isDark ? '#6EE7B7' : '#065F46' }]}>
                  {language === 'bn'
                    ? `নতুন মোট সঞ্চয়: ৳${Math.round(newTotal).toLocaleString()}`
                    : `New Total: ৳${Math.round(newTotal).toLocaleString()}`}
                </Text>
                <Text style={[styles.projectionSub, { color: isDark ? '#A7F3D0' : '#047857' }]}>
                  {isTimelineMode ? (
                    monthlySavingsDrop > 0
                      ? language === 'bn'
                        ? `৳${Math.round(boostAmount)} বুস্টের পর, বাকি ${remainingMonths} মাসের জন্য আপনার মাত্র ৳${Math.round(newRequiredMonthly)}/মাস জমাতে হবে (মাসিক চাপ ৳${monthlySavingsDrop} কমেছে)!`
                        : `After ৳${Math.round(boostAmount)} boost, you only need ৳${Math.round(newRequiredMonthly)}/mo for the remaining ${remainingMonths} months (lowered by ৳${monthlySavingsDrop}/mo)!`
                      : language === 'bn'
                      ? `বাকি ${remainingMonths} মাসের জন্য প্রয়োজন ৳${Math.round(newRequiredMonthly)}/মাস`
                      : `৳${Math.round(newRequiredMonthly)}/mo required for remaining ${remainingMonths} months`
                  ) : monthsSaved > 0 ? (
                    language === 'bn'
                      ? `লক্ষ্যটি প্রায় ${monthsSaved} মাস দ্রুত অর্জিত হবে!`
                      : `You will reach this goal ~${monthsSaved} month${monthsSaved > 1 ? 's' : ''} faster!`
                  ) : (
                    language === 'bn'
                      ? `অবশিষ্ট থাকবে ৳${Math.round(newRemaining).toLocaleString()}`
                      : `৳${Math.round(newRemaining).toLocaleString()} remaining to completion`
                  )}
                </Text>
              </View>
            </View>
          )}

          {/* Confirm Button */}
          <TouchableOpacity
            style={[styles.submitBtn, { backgroundColor: theme.primaryAccent }]}
            onPress={handleBoost}
            disabled={loading}
            activeOpacity={0.85}
          >
            {loading ? (
              <ActivityIndicator color="#FFFFFF" size="small" />
            ) : (
              <Text style={styles.submitBtnText}>
                {language === 'bn' ? `৳${boostAmount || 0} জমা নিশ্চিত করুন` : `Confirm ৳${boostAmount || 0} Deposit`}
              </Text>
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
    backgroundColor: 'rgba(0, 0, 0, 0.55)',
    justifyContent: 'flex-end',
  },
  sheetContent: {
    borderTopLeftRadius: 26,
    borderTopRightRadius: 26,
    borderWidth: 1,
    borderBottomWidth: 0,
    paddingHorizontal: 20,
    paddingTop: 20,
  },
  sheetHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 16,
  },
  sheetTitle: {
    fontSize: 18,
    fontWeight: '700',
  },
  sheetSub: {
    fontSize: 13,
    marginTop: 2,
  },
  label: {
    fontSize: 13,
    fontWeight: '600',
    marginBottom: 8,
  },
  presetRow: {
    flexDirection: 'row',
    gap: 8,
    marginBottom: 16,
  },
  presetPill: {
    flex: 1,
    paddingVertical: 10,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  presetText: {
    fontSize: 14,
    fontWeight: '700',
  },
  inputGroup: {
    marginBottom: 16,
  },
  textInput: {
    borderRadius: 12,
    borderWidth: 1,
    paddingHorizontal: 14,
    paddingVertical: 12,
    fontSize: 16,
    fontWeight: '600',
  },
  projectionBox: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 12,
    borderRadius: 12,
    marginBottom: 18,
  },
  projectionTitle: {
    fontSize: 13,
    fontWeight: '700',
    marginBottom: 2,
  },
  projectionSub: {
    fontSize: 12,
    fontWeight: '500',
  },
  submitBtn: {
    paddingVertical: 14,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 12,
  },
  submitBtnText: {
    color: '#FFFFFF',
    fontSize: 15,
    fontWeight: '700',
  },
});

