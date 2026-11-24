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
  ScrollView,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useTheme } from '../constants/ThemeContext';
import { TRANSLATIONS, Language } from '../constants/translations';
import { createSavingsGoal, SavingsGoal } from '../services/api';

interface CreateGoalModalProps {
  visible: boolean;
  userId: string;
  language: Language;
  onClose: () => void;
  onGoalCreated: (goal: SavingsGoal) => void;
}

const CATEGORIES = ['Gadget', 'Academic', 'Tech', 'Trip', 'Lifestyle'];
const TIMELINE_PRESETS = [3, 6, 9, 12, 18];
const COMMITMENT_PRESETS = [500, 1000, 1500, 2500, 5000];

export const CreateGoalModal: React.FC<CreateGoalModalProps> = ({
  visible,
  userId,
  language,
  onClose,
  onGoalCreated,
}) => {
  const { isDark, theme } = useTheme();
  const t = TRANSLATIONS[language];
  const insets = useSafeAreaInsets();
  const safeBottom = Math.max(insets.bottom, 16);

  const [planningMode, setPlanningMode] = useState<'monthly_amount' | 'target_timeline'>('monthly_amount');
  const [title, setTitle] = useState('');
  const [targetAmount, setTargetAmount] = useState('');
  const [monthlyCommitment, setMonthlyCommitment] = useState('1000');
  const [targetMonths, setTargetMonths] = useState('6');
  const [initialSaved, setInitialSaved] = useState('0');
  const [category, setCategory] = useState('Gadget');
  const [loading, setLoading] = useState(false);

  const target = parseFloat(targetAmount) || 0;
  const initial = parseFloat(initialSaved) || 0;
  const netNeeded = Math.max(0, target - initial);
  const commitment = parseFloat(monthlyCommitment) || 500;
  const durationMonths = parseInt(targetMonths, 10) || 6;

  const monthNamesEn = ["", "January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"];
  const monthNamesBn = ["", "জানুয়ারি", "ফেব্রুয়ারি", "মার্চ", "এপ্রিল", "মে", "জুন", "জুলাই", "আগস্ট", "সেপ্টেম্বর", "অক্টোবর", "নভেম্বর", "ডিসেম্বর"];
  const now = new Date();

  // Mode A: By Monthly Budget Projections
  const modeAMonthsNeeded = commitment > 0 ? Math.ceil(netNeeded / commitment) : 0;
  const modeATargetDateObj = new Date(now.getFullYear(), now.getMonth() + modeAMonthsNeeded, 1);
  const modeADateEn = `${monthNamesEn[modeATargetDateObj.getMonth() + 1]} ${modeATargetDateObj.getFullYear()}`;
  const modeADateBn = `${monthNamesBn[modeATargetDateObj.getMonth() + 1]} ${modeATargetDateObj.getFullYear()}`;

  // Mode B: By Target Timeline Projections
  const modeBRequiredMonthly = durationMonths > 0 ? Math.ceil(netNeeded / durationMonths) : 0;
  const modeBTargetDateObj = new Date(now.getFullYear(), now.getMonth() + durationMonths, 1);
  const modeBDateEn = `${monthNamesEn[modeBTargetDateObj.getMonth() + 1]} ${modeBTargetDateObj.getFullYear()}`;
  const modeBDateBn = `${monthNamesBn[modeBTargetDateObj.getMonth() + 1]} ${modeBTargetDateObj.getFullYear()}`;

  const handleCreate = async () => {
    if (!title.trim()) {
      Alert.alert(language === 'bn' ? 'ত্রুটি' : 'Missing Info', language === 'bn' ? 'অনুগ্রহ করে লক্ষ্যের নাম লিখুন।' : 'Please enter the goal or item name.');
      return;
    }
    if (!target || target <= 0) {
      Alert.alert(language === 'bn' ? 'ত্রুটি' : 'Invalid Price', language === 'bn' ? 'সঠিক লক্ষ্যমূল্য লিখুন।' : 'Please enter a valid target price.');
      return;
    }

    const effectiveCommitment = planningMode === 'target_timeline' ? modeBRequiredMonthly : commitment;
    const finalMonths = planningMode === 'target_timeline' ? durationMonths : modeAMonthsNeeded;
    const finalDate = planningMode === 'target_timeline' ? modeBDateEn : modeADateEn;

    try {
      setLoading(true);
      try { Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium); } catch {}
      const newGoal = await createSavingsGoal({
        user_id: userId,
        title: title.trim(),
        target_amount: target,
        monthly_commitment: effectiveCommitment,
        initial_saved: initial,
        category,
        planning_mode: planningMode,
        target_months: finalMonths,
        target_date: finalDate,
      });

      try { Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success); } catch {}
      setTitle('');
      setTargetAmount('');
      setMonthlyCommitment('1000');
      setTargetMonths('6');
      setInitialSaved('0');
      onGoalCreated(newGoal);
      onClose();
    } catch (e: any) {
      Alert.alert('Error', e.message || 'Failed to create goal');
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
                {language === 'bn' ? 'নতুন সঞ্চয় লক্ষ্য' : 'Create Dream Goal'}
              </Text>
              <Text style={[styles.sheetSub, { color: theme.textSecondary }]}>
                {language === 'bn'
                  ? 'মাসিক বাজেট বা সময়সীমা অনুযায়ী সঞ্চয় সুরক্ষিত রাখুন'
                  : 'Flexible goal planning with auto-paced safe spending'}
              </Text>
            </View>
            <TouchableOpacity onPress={onClose} hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}>
              <Ionicons name="close-circle" size={26} color={theme.textSecondary} />
            </TouchableOpacity>
          </View>

          <ScrollView showsVerticalScrollIndicator={false}>
            {/* 1. DUAL-MODE SEGMENTED TOGGLE */}
            <View style={[styles.modeSegmentContainer, { backgroundColor: isDark ? 'rgba(255, 255, 255, 0.05)' : '#EEF3F7' }]}>
              <TouchableOpacity
                style={[
                  styles.modeSegmentBtn,
                  planningMode === 'monthly_amount' && [styles.modeSegmentActive, { backgroundColor: theme.primaryAccent }],
                ]}
                onPress={() => {
                  try { Haptics.selectionAsync(); } catch {}
                  setPlanningMode('monthly_amount');
                }}
                activeOpacity={0.8}
              >
                <Ionicons
                  name="wallet-outline"
                  size={15}
                  color={planningMode === 'monthly_amount' ? '#FFFFFF' : theme.textSecondary}
                  style={{ marginRight: 6 }}
                />
                <Text
                  style={[
                    styles.modeSegmentText,
                    { color: planningMode === 'monthly_amount' ? '#FFFFFF' : theme.textPrimary, fontWeight: planningMode === 'monthly_amount' ? '700' : '500' },
                  ]}
                  numberOfLines={1}
                >
                  {language === 'bn' ? 'মাসিক বাজেট অনুযায়ী' : 'By Monthly Budget'}
                </Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={[
                  styles.modeSegmentBtn,
                  planningMode === 'target_timeline' && [styles.modeSegmentActive, { backgroundColor: theme.primaryAccent }],
                ]}
                onPress={() => {
                  try { Haptics.selectionAsync(); } catch {}
                  setPlanningMode('target_timeline');
                }}
                activeOpacity={0.8}
              >
                <Ionicons
                  name="time-outline"
                  size={15}
                  color={planningMode === 'target_timeline' ? '#FFFFFF' : theme.textSecondary}
                  style={{ marginRight: 6 }}
                />
                <Text
                  style={[
                    styles.modeSegmentText,
                    { color: planningMode === 'target_timeline' ? '#FFFFFF' : theme.textPrimary, fontWeight: planningMode === 'target_timeline' ? '700' : '500' },
                  ]}
                  numberOfLines={1}
                >
                  {language === 'bn' ? 'নির্ধারিত সময় অনুযায়ী' : 'By Target Timeline'}
                </Text>
              </TouchableOpacity>
            </View>

            {/* Mode Description Tag */}
            <View style={[styles.modeDescBox, { backgroundColor: isDark ? 'rgba(224, 122, 95, 0.08)' : '#FFF6F3', borderColor: isDark ? 'rgba(224, 122, 95, 0.2)' : '#FCDCD2' }]}>
              <Ionicons name="sparkles-outline" size={14} color={theme.primaryAccent} style={{ marginTop: 1, marginRight: 6 }} />
              <Text style={[styles.modeDescText, { color: isDark ? '#FED7AA' : '#9A3412' }]}>
                {planningMode === 'monthly_amount'
                  ? (language === 'bn'
                      ? 'প্রতি মাসে কত টাকা জমাতে চান লিখুন — অ্যাপ স্বয়ংক্রিয়ভাবে কত মাস লাগবে তা হিসাব করে দেবে।'
                      : 'Choose how much you can save each month — the vault automatically computes your target completion date.')
                  : (language === 'bn'
                      ? 'নির্দিষ্ট কত মাসে লক্ষ্যটি অর্জন করতে চান তা বেছে নিন — অ্যাপ প্রতি মাসের প্রয়োজনীয় সঞ্চয় হিসাব করে দৈনিক বাজেটে সুরক্ষিত রাখবে।'
                      : 'Choose your target duration — the vault calculates the required monthly savings and locks it into your Three-Bucket safe limit.')}
              </Text>
            </View>

            {/* Goal Title */}
            <View style={styles.inputGroup}>
              <Text style={[styles.label, { color: theme.textPrimary }]}>
                {language === 'bn' ? 'জিনিস বা লক্ষ্যের নাম' : 'Item / Goal Name & Model'}
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
                placeholder={language === 'bn' ? 'যেমন: LG UltraGear Monitor বা ল্যাপটপ' : 'e.g. LG UltraGear Monitor or Laptop'}
                placeholderTextColor={theme.textSecondary}
                value={title}
                onChangeText={setTitle}
              />
            </View>

            {/* Category Pills */}
            <View style={styles.inputGroup}>
              <Text style={[styles.label, { color: theme.textPrimary }]}>
                {language === 'bn' ? 'ক্যাটাগরি' : 'Category'}
              </Text>
              <View style={styles.catRow}>
                {CATEGORIES.map((cat) => {
                  const selected = category === cat;
                  return (
                    <TouchableOpacity
                      key={cat}
                      style={[
                        styles.catPill,
                        {
                          backgroundColor: selected
                            ? theme.primaryAccent
                            : isDark ? 'rgba(255, 255, 255, 0.06)' : '#EEF3F7',
                        },
                      ]}
                      onPress={() => setCategory(cat)}
                    >
                      <Text
                        style={[
                          styles.catPillText,
                          { color: selected ? '#FFFFFF' : theme.textPrimary },
                        ]}
                      >
                        {cat}
                      </Text>
                    </TouchableOpacity>
                  );
                })}
              </View>
            </View>

            {/* Target Price & Initial Saved Row */}
            <View style={styles.row}>
              <View style={[styles.inputGroup, { flex: 1, marginRight: 8 }]}>
                <Text style={[styles.label, { color: theme.textPrimary }]}>
                  {language === 'bn' ? 'লক্ষ্যমূল্য (৳)' : 'Target Price (৳)'}
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
                  placeholder="e.g. 24000"
                  placeholderTextColor={theme.textSecondary}
                  keyboardType="numeric"
                  value={targetAmount}
                  onChangeText={setTargetAmount}
                />
              </View>

              <View style={[styles.inputGroup, { flex: 1, marginLeft: 8 }]}>
                <Text style={[styles.label, { color: theme.textPrimary }]}>
                  {language === 'bn' ? 'শুরুর জমা (৳)' : 'Initial Saved (৳)'}
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
                  placeholder="0"
                  placeholderTextColor={theme.textSecondary}
                  keyboardType="numeric"
                  value={initialSaved}
                  onChangeText={setInitialSaved}
                />
              </View>
            </View>

            {/* MODE A: Monthly Budget Commitment */}
            {planningMode === 'monthly_amount' && (
              <View style={styles.inputGroup}>
                <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 6 }}>
                  <Text style={[styles.label, { color: theme.textPrimary, marginBottom: 0 }]}>
                    {language === 'bn' ? 'মাসিক কত টাকা সঞ্চয় করবেন? (৳/মাস)' : 'Monthly Savings Commitment (৳/mo)'}
                  </Text>
                  <Text style={{ fontSize: 11, color: theme.primaryAccent, fontWeight: '700' }}>
                    ৳{commitment.toLocaleString()}/mo
                  </Text>
                </View>
                <TextInput
                  style={[
                    styles.textInput,
                    {
                      backgroundColor: isDark ? 'rgba(255, 255, 255, 0.05)' : '#F4F7FA',
                      borderColor: isDark ? 'rgba(255, 255, 255, 0.1)' : '#D5E4EF',
                      color: theme.textPrimary,
                    },
                  ]}
                  placeholder="1000"
                  placeholderTextColor={theme.textSecondary}
                  keyboardType="numeric"
                  value={monthlyCommitment}
                  onChangeText={setMonthlyCommitment}
                />
                {/* Quick Presets */}
                <View style={{ flexDirection: 'row', gap: 6, flexWrap: 'wrap', marginTop: 8 }}>
                  {COMMITMENT_PRESETS.map((amt) => {
                    const isSelected = monthlyCommitment === String(amt);
                    return (
                      <TouchableOpacity
                        key={amt}
                        style={[
                          styles.presetPillSmall,
                          {
                            backgroundColor: isSelected ? 'rgba(224, 122, 95, 0.18)' : isDark ? 'rgba(255, 255, 255, 0.05)' : '#EEF3F7',
                            borderColor: isSelected ? theme.primaryAccent : 'transparent',
                          },
                        ]}
                        onPress={() => setMonthlyCommitment(String(amt))}
                      >
                        <Text style={{ fontSize: 11.5, color: isSelected ? theme.primaryAccent : theme.textSecondary, fontWeight: isSelected ? '700' : '500' }}>
                          ৳{amt.toLocaleString()}
                        </Text>
                      </TouchableOpacity>
                    );
                  })}
                </View>
              </View>
            )}

            {/* MODE B: Target Timeline Duration Selector */}
            {planningMode === 'target_timeline' && (
              <View style={styles.inputGroup}>
                <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 6 }}>
                  <Text style={[styles.label, { color: theme.textPrimary, marginBottom: 0 }]}>
                    {language === 'bn' ? 'কত মাসে লক্ষ্যটি কিনতে চান?' : 'Target Duration (Months)'}
                  </Text>
                  <Text style={{ fontSize: 11, color: theme.primaryAccent, fontWeight: '700' }}>
                    {durationMonths} {language === 'bn' ? 'মাস' : 'months'}
                  </Text>
                </View>

                {/* Duration Presets */}
                <View style={{ flexDirection: 'row', gap: 6, flexWrap: 'wrap', marginBottom: 8 }}>
                  {TIMELINE_PRESETS.map((m) => {
                    const isSelected = targetMonths === String(m);
                    return (
                      <TouchableOpacity
                        key={m}
                        style={[
                          styles.presetPillSmall,
                          {
                            backgroundColor: isSelected ? 'rgba(224, 122, 95, 0.18)' : isDark ? 'rgba(255, 255, 255, 0.05)' : '#EEF3F7',
                            borderColor: isSelected ? theme.primaryAccent : 'transparent',
                          },
                        ]}
                        onPress={() => setTargetMonths(String(m))}
                      >
                        <Text style={{ fontSize: 11.5, color: isSelected ? theme.primaryAccent : theme.textSecondary, fontWeight: isSelected ? '700' : '500' }}>
                          {m} {language === 'bn' ? 'মাস' : 'Months'}
                        </Text>
                      </TouchableOpacity>
                    );
                  })}
                </View>

                <TextInput
                  style={[
                    styles.textInput,
                    {
                      backgroundColor: isDark ? 'rgba(255, 255, 255, 0.05)' : '#F4F7FA',
                      borderColor: isDark ? 'rgba(255, 255, 255, 0.1)' : '#D5E4EF',
                      color: theme.textPrimary,
                    },
                  ]}
                  placeholder={language === 'bn' ? 'বা কাস্টম মাস লিখুন (যেমন: ৫)' : 'Or type custom months (e.g. 5)'}
                  placeholderTextColor={theme.textSecondary}
                  keyboardType="numeric"
                  value={targetMonths}
                  onChangeText={setTargetMonths}
                />
              </View>
            )}

            {/* DYNAMIC REAL-TIME MATH PREVIEW */}
            {target > 0 && (
              <View style={[styles.previewBox, { backgroundColor: isDark ? 'rgba(83, 122, 150, 0.18)' : '#EAF2F8', borderColor: isDark ? 'rgba(83, 122, 150, 0.3)' : '#D0E3F0' }]}>
                <Ionicons name="calculator-outline" size={20} color={theme.slateBlue} style={{ marginRight: 8, marginTop: 2 }} />
                <View style={{ flex: 1 }}>
                  {planningMode === 'monthly_amount' ? (
                    <>
                      <Text style={[styles.previewHeading, { color: theme.textPrimary }]}>
                        {language === 'bn'
                          ? `আনুমানিক ${modeAMonthsNeeded} মাস · ${modeADateBn}`
                          : `Est. ${modeAMonthsNeeded} months · ${modeADateEn}`}
                      </Text>
                      <Text style={[styles.previewText, { color: theme.textSecondary }]}>
                        {language === 'bn'
                          ? `প্রতি মাসে ৳${Math.round(commitment).toLocaleString()} জমালে ${modeADateBn} এ ৳${Math.round(target).toLocaleString()} অর্জন সম্পন্ন হবে।`
                          : `Saving ৳${Math.round(commitment).toLocaleString()}/mo will complete your ৳${Math.round(target).toLocaleString()} goal by ${modeADateEn}.`}
                      </Text>
                    </>
                  ) : (
                    <>
                      <Text style={[styles.previewHeading, { color: theme.textPrimary }]}>
                        {language === 'bn'
                          ? `প্রয়োজনীয় সঞ্চয়: ৳${Math.round(modeBRequiredMonthly).toLocaleString()} / মাস`
                          : `Required Savings: ৳${Math.round(modeBRequiredMonthly).toLocaleString()} / mo`}
                      </Text>
                      <Text style={[styles.previewText, { color: theme.textSecondary }]}>
                        {language === 'bn'
                          ? `${modeBDateBn} (${durationMonths} মাস) এর মধ্যে কিনতে প্রতি মাসে ৳${Math.round(modeBRequiredMonthly).toLocaleString()} আপনার দৈনিক বাজেট থেকে স্বয়ংক্রিয়ভাবে সংরক্ষিত থাকবে।`
                          : `To reach your goal by ${modeBDateEn} (${durationMonths} mo), ৳${Math.round(modeBRequiredMonthly).toLocaleString()}/mo will be ring-fenced in your Three-Bucket daily safe spend.`}
                      </Text>
                    </>
                  )}
                </View>
              </View>
            )}

            {/* Submit Button */}
            <TouchableOpacity
              style={[styles.submitBtn, { backgroundColor: theme.primaryAccent }]}
              onPress={handleCreate}
              disabled={loading}
              activeOpacity={0.85}
            >
              {loading ? (
                <ActivityIndicator color="#FFFFFF" size="small" />
              ) : (
                <Text style={styles.submitBtnText}>
                  {language === 'bn' ? 'সঞ্চয় লক্ষ্য শুরু করুন' : 'Lock In Dream Goal'}
                </Text>
              )}
            </TouchableOpacity>
          </ScrollView>
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
    maxHeight: '90%',
  },
  sheetHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 14,
  },
  sheetTitle: {
    fontSize: 18,
    fontWeight: '700',
  },
  sheetSub: {
    fontSize: 12,
    marginTop: 2,
  },
  modeSegmentContainer: {
    flexDirection: 'row',
    borderRadius: 14,
    padding: 4,
    marginBottom: 10,
  },
  modeSegmentBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 9,
    paddingHorizontal: 6,
    borderRadius: 11,
  },
  modeSegmentActive: {
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.15,
    shadowRadius: 2,
    elevation: 2,
  },
  modeSegmentText: {
    fontSize: 12,
  },
  modeDescBox: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    borderWidth: 1,
    borderRadius: 12,
    padding: 10,
    marginBottom: 14,
  },
  modeDescText: {
    fontSize: 11.5,
    lineHeight: 16,
    flex: 1,
    fontWeight: '500',
  },
  inputGroup: {
    marginBottom: 14,
  },
  label: {
    fontSize: 13,
    fontWeight: '600',
    marginBottom: 6,
  },
  textInput: {
    borderRadius: 12,
    borderWidth: 1,
    paddingHorizontal: 14,
    paddingVertical: 10,
    fontSize: 14,
  },
  catRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  catPill: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 10,
  },
  catPillText: {
    fontSize: 12,
    fontWeight: '600',
  },
  row: {
    flexDirection: 'row',
  },
  presetPillSmall: {
    paddingHorizontal: 11,
    paddingVertical: 5,
    borderRadius: 12,
    borderWidth: 1,
  },
  previewBox: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    padding: 12,
    borderRadius: 13,
    borderWidth: 1,
    marginBottom: 16,
  },
  previewHeading: {
    fontSize: 13.5,
    fontWeight: '700',
    marginBottom: 3,
  },
  previewText: {
    fontSize: 11.5,
    lineHeight: 16,
    fontWeight: '500',
  },
  submitBtn: {
    paddingVertical: 14,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 4,
    marginBottom: 14,
  },
  submitBtnText: {
    color: '#FFFFFF',
    fontSize: 15,
    fontWeight: '700',
  },
});


