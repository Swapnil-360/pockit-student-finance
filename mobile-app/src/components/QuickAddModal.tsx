import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  Modal,
  StyleSheet,
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  Alert,
} from 'react-native';
import { useTheme } from '../constants/ThemeContext';
import { TRANSLATIONS, Language } from '../constants/translations';
import { addExpense, addIncome } from '../services/api';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

export type QuickAddMode = 'income' | 'expense';

interface QuickAddModalProps {
  visible: boolean;
  onClose: () => void;
  userId: string;
  language: Language;
  onSuccess?: () => void;
  initialMode?: QuickAddMode;
}

const EXPENSE_CATEGORIES = [
  { key: 'Food', en: 'Food / Canteen', bn: 'খাবার / ক্যান্টিন' },
  { key: 'Transport', en: 'Transport', bn: 'যাতায়াত / ভাড়া' },
  { key: 'Academic', en: 'Academic / Books', bn: 'পড়াশোনা / ফটোকপি' },
  { key: 'Entertainment', en: 'Hangout / Coffee', bn: 'আড্ডা / নাশতা' },
  { key: 'Bills', en: 'Mobile / Wifi', bn: 'মোবাইল রিচার্জ / বিল' },
  { key: 'Personal', en: 'Personal / Meds', bn: 'ওষুধ / ব্যক্তিগত' },
];

const INCOME_SOURCES = [
  { key: 'Family', en: 'Family Allowance', bn: 'পরিবারের টাকা' },
  { key: 'Tuition-job', en: 'Tuition / Job', bn: 'টিউশন / পার্ট-টাইম' },
  { key: 'Freelancing', en: 'Freelance / Gig', bn: 'ফ্রিল্যান্সিং / গিগ' },
  { key: 'Scholarship', en: 'Scholarship', bn: 'বৃত্তি / স্টাইপেন্ড' },
  { key: 'Gift/Other', en: 'Gift / Other', bn: 'উপহার / অন্যান্য' },
];

const PAYMENT_METHODS = [
  { key: 'bKash', label: 'bKash' },
  { key: 'Nagad', label: 'Nagad' },
  { key: 'Cash', label: 'Cash' },
  { key: 'Rocket', label: 'Rocket' },
  { key: 'Bank', label: 'Bank' },
];

export const QuickAddModal: React.FC<QuickAddModalProps> = ({
  visible,
  onClose,
  userId,
  language,
  onSuccess,
  initialMode = 'expense',
}) => {
  const { isDark, theme } = useTheme();
  const [mode, setMode] = useState<QuickAddMode>(initialMode);
  const [amount, setAmount] = useState('');
  const [category, setCategory] = useState('Food');
  const [source, setSource] = useState('Family');
  const [paymentMethod, setPaymentMethod] = useState('bKash');
  const [includeCashoutFee, setIncludeCashoutFee] = useState(false);
  const [note, setNote] = useState('');
  const [loading, setLoading] = useState(false);
  const insets = useSafeAreaInsets();
  const safeBottom = Math.max(insets.bottom, 16);

  const isMfs = paymentMethod === 'bKash' || paymentMethod === 'Nagad';
  const feeRate = 0.0149; // 1.49% standard app cashout fee
  const numAmount = parseFloat(amount.trim()) || 0;
  const cashoutFee = isMfs && includeCashoutFee && numAmount > 0 ? Math.round(numAmount * feeRate * 10) / 10 : 0;
  const effectiveTotal = numAmount + cashoutFee;

  useEffect(() => {
    if (visible) {
      setMode(initialMode);
      setAmount('');
      setNote('');
      setIncludeCashoutFee(false);
    }
  }, [visible, initialMode]);

  // Clean and auto-strip leading zero so cursor blinks cleanly beside ৳ symbol
  const handleAmountChange = (text: string) => {
    let clean = text.replace(/[^0-9.]/g, '');
    if (clean.length > 1 && clean.startsWith('0') && clean[1] !== '.') {
      clean = clean.replace(/^0+/, '');
    }
    setAmount(clean);
  };

  const handleSave = async () => {
    const num = parseFloat(amount.trim());
    if (isNaN(num) || num <= 0) {
      Alert.alert(
        language === 'bn' ? 'সতর্কতা' : 'Validation',
        language === 'bn' ? 'দয়া করে সঠিক টাকার পরিমাণ লিখুন।' : 'Please enter a valid amount.'
      );
      return;
    }

    const finalAmount = effectiveTotal > 0 ? effectiveTotal : num;
    let finalNote = note.trim();
    if (includeCashoutFee && cashoutFee > 0) {
      const feeNote = `(inc. ৳${cashoutFee.toFixed(1)} ${paymentMethod} fee)`;
      finalNote = finalNote ? `${finalNote} ${feeNote}` : `${paymentMethod} Cash-Out ${feeNote}`;
    }

    setLoading(true);
    try {
      if (mode === 'income') {
        await addIncome({
          user_id: userId,
          amount: finalAmount,
          source,
          payment_method: paymentMethod,
          note: finalNote || undefined,
        });
      } else {
        await addExpense({
          user_id: userId,
          amount: finalAmount,
          category,
          payment_method: paymentMethod,
          note: finalNote || undefined,
        });
      }

      setAmount('');
      setNote('');
      setIncludeCashoutFee(false);
      try {
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      } catch {}
      if (onSuccess) onSuccess();
      onClose();
    } catch (error) {
      Alert.alert(
        language === 'bn' ? 'ত্রুটি' : 'Error',
        language === 'bn'
          ? `${mode === 'income' ? 'ফান্ড' : 'খরচ'} সংরক্ষণ করা যায়নি।`
          : `Failed to save ${mode}: ${String(error)}`
      );
    } finally {
      setLoading(false);
    }
  };

  const isIncome = mode === 'income';
  const primaryBrandColor = isIncome ? '#0F9D6B' : '#F47B4E';
  const activeTintBg = isIncome ? (isDark ? 'rgba(16, 185, 129, 0.16)' : '#10B98118') : (isDark ? 'rgba(244, 123, 78, 0.16)' : '#F47B4E18');
  const activeBorderColor = isIncome ? '#059669' : '#F47B4E';

  const fontBnFamily = Platform.select({ web: '"Hind Siliguri", -apple-system, sans-serif', default: undefined });
  const fontEnDisplay = Platform.select({ web: '"Plus Jakarta Sans", -apple-system, sans-serif', default: undefined });
  const fontEnLabel = Platform.select({ web: '"Inter", -apple-system, sans-serif', default: undefined });

  return (
    <Modal
      visible={visible}
      transparent
      animationType="slide"
      onRequestClose={onClose}
    >
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
              borderColor: isDark ? 'rgba(255, 255, 255, 0.08)' : theme.border,
              paddingBottom: safeBottom + 12,
            },
          ]}
        >
          {/* Subtle Drag Handle */}
          <View style={[styles.dragHandle, { backgroundColor: isDark ? 'rgba(255, 255, 255, 0.15)' : '#CBD5E1' }]} />

          {/* Mode Switcher Segmented Control */}
          <View style={[styles.modeSwitcherContainer, { backgroundColor: isDark ? '#1E293B' : '#EDF2F7' }]}>
            <TouchableOpacity
              style={[
                styles.modeTab,
                !isIncome && [styles.modeTabActive, { backgroundColor: isDark ? '#334155' : '#FFFFFF' }],
              ]}
              onPress={() => {
                try { Haptics.selectionAsync(); } catch {}
                setMode('expense');
              }}
              activeOpacity={0.8}
            >
              <Ionicons
                name="arrow-down"
                size={14}
                color={!isIncome ? '#F47B4E' : theme.textSecondary}
              />
              <Text
                style={[
                  styles.modeTabText,
                  {
                    color: !isIncome ? theme.textPrimary : theme.textSecondary,
                    fontWeight: !isIncome ? '700' : '500',
                    fontFamily: language === 'bn' ? fontBnFamily : fontEnLabel,
                  },
                ]}
              >
                {language === 'bn' ? 'খরচ (Expense)' : 'Expense'}
              </Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={[
                styles.modeTab,
                isIncome && [styles.modeTabActive, { backgroundColor: isDark ? '#334155' : '#FFFFFF' }],
              ]}
              onPress={() => {
                try { Haptics.selectionAsync(); } catch {}
                setMode('income');
              }}
              activeOpacity={0.8}
            >
              <Ionicons
                name="arrow-up"
                size={14}
                color={isIncome ? '#0F9D6B' : theme.textSecondary}
              />
              <Text
                style={[
                  styles.modeTabText,
                  {
                    color: isIncome ? theme.textPrimary : theme.textSecondary,
                    fontWeight: isIncome ? '700' : '500',
                    fontFamily: language === 'bn' ? fontBnFamily : fontEnLabel,
                  },
                ]}
              >
                {language === 'bn' ? 'আয় (Income)' : 'Income'}
              </Text>
            </TouchableOpacity>
          </View>

          {/* Header Row */}
          <View style={[styles.headerRow, { borderBottomColor: isDark ? 'rgba(255, 255, 255, 0.06)' : 'rgba(90, 130, 150, 0.08)' }]}>
            <View style={styles.headerTitleWrap}>
              <View style={[styles.modeIndicatorDot, { backgroundColor: primaryBrandColor }]} />
              <Text
                style={[
                  styles.title,
                  {
                    color: theme.textPrimary,
                    fontFamily: language === 'bn' ? fontBnFamily : fontEnDisplay,
                  },
                ]}
              >
                {isIncome
                  ? (language === 'bn' ? 'মাসের ফান্ড বা আয় যোগ করুন' : 'Add Monthly Income')
                  : (language === 'bn' ? 'দৈনিক খরচ যোগ করুন' : 'Log Daily Expense')}
              </Text>
            </View>
            <TouchableOpacity
              onPress={onClose}
              style={[
                styles.closeBtn,
                { backgroundColor: isDark ? 'rgba(255, 255, 255, 0.06)' : '#F1F5F9' },
              ]}
              hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
              activeOpacity={0.7}
            >
              <Ionicons name="close" size={18} color={theme.textSecondary} />
            </TouchableOpacity>
          </View>

          <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.scrollContent}>
            {/* 1. Unified, Borderless Hero Amount Display */}
            <View
              style={[
                styles.heroAmountCard,
                {
                  backgroundColor: isDark ? '#1E293B' : '#F4F7F9',
                  borderColor: isDark ? 'rgba(255, 255, 255, 0.06)' : 'rgba(90, 130, 150, 0.08)',
                },
              ]}
            >
              <Text
                style={[
                  styles.heroAmountHint,
                  {
                    color: theme.textMuted,
                    fontFamily: language === 'bn' ? fontBnFamily : fontEnLabel,
                  },
                ]}
              >
                {isIncome
                  ? (language === 'bn' ? 'টাকার পরিমাণ লিখুন' : 'Enter amount')
                  : (language === 'bn' ? 'খরচের পরিমাণ লিখুন' : 'Enter amount spent')}
              </Text>

              <View style={styles.amountContentRow}>
                <Text
                  style={[
                    styles.currencySymbol,
                    {
                      color: primaryBrandColor,
                      fontFamily: fontEnDisplay,
                    },
                  ]}
                >
                  ৳
                </Text>

                <TextInput
                  style={[
                    styles.amountInput,
                    {
                      color: theme.textPrimary,
                      fontFamily: fontEnDisplay,
                    },
                  ]}
                  keyboardType="numeric"
                  placeholder="0"
                  placeholderTextColor="rgba(100, 116, 139, 0.35)"
                  value={amount}
                  onChangeText={handleAmountChange}
                  autoFocus
                  textAlign="left"
                  selectionColor={primaryBrandColor}
                />
              </View>
            </View>

            {/* 2. Category / Source Selector */}
            <Text
              style={[
                styles.sectionLabel,
                {
                  color: theme.textSecondary,
                  fontFamily: language === 'bn' ? fontBnFamily : fontEnLabel,
                },
              ]}
            >
              {isIncome
                ? (language === 'bn' ? 'আর্থিক উৎস' : 'Funding Source')
                : (language === 'bn' ? 'খরচের খাত' : 'Category')}
            </Text>

            <View style={styles.chipGrid}>
              {(isIncome ? INCOME_SOURCES : EXPENSE_CATEGORIES).map((item) => {
                const isSelected = isIncome ? source === item.key : category === item.key;
                return (
                  <TouchableOpacity
                    key={item.key}
                    style={[
                      styles.pillChip,
                      {
                        backgroundColor: isSelected
                          ? activeTintBg
                          : isDark
                          ? 'rgba(255, 255, 255, 0.04)'
                          : '#F8FAFC',
                        borderColor: isSelected
                          ? activeBorderColor
                          : isDark
                          ? 'rgba(255, 255, 255, 0.08)'
                          : '#E2E8F0',
                      },
                    ]}
                    onPress={() => {
                      try { Haptics.selectionAsync(); } catch {}
                      if (isIncome) {
                        setSource(item.key);
                      } else {
                        setCategory(item.key);
                      }
                    }}
                    activeOpacity={0.75}
                  >
                    <Text
                      style={[
                        styles.chipText,
                        {
                          color: isSelected ? activeBorderColor : theme.textSecondary,
                          fontWeight: isSelected ? '700' : '500',
                          fontFamily: language === 'bn' ? fontBnFamily : fontEnLabel,
                        },
                      ]}
                    >
                      {language === 'bn' ? item.bn : item.en}
                    </Text>
                  </TouchableOpacity>
                );
              })}
            </View>

            {/* 3. Payment Method Selector */}
            <Text
              style={[
                styles.sectionLabel,
                {
                  color: theme.textSecondary,
                  fontFamily: language === 'bn' ? fontBnFamily : fontEnLabel,
                },
              ]}
            >
              {language === 'bn' ? 'পেমেন্ট মাধ্যম' : 'Payment Method'}
            </Text>

            <View style={styles.pmRow}>
              {PAYMENT_METHODS.map((pm) => {
                const isSelected = paymentMethod === pm.key;
                return (
                  <TouchableOpacity
                    key={pm.key}
                    style={[
                      styles.pmPill,
                      {
                        backgroundColor: isSelected
                          ? activeTintBg
                          : isDark
                          ? 'rgba(255, 255, 255, 0.04)'
                          : '#F8FAFC',
                        borderColor: isSelected
                          ? activeBorderColor
                          : isDark
                          ? 'rgba(255, 255, 255, 0.08)'
                          : '#E2E8F0',
                      },
                    ]}
                    onPress={() => {
                      try { Haptics.selectionAsync(); } catch {}
                      setPaymentMethod(pm.key);
                    }}
                    activeOpacity={0.75}
                  >
                    <Text
                      style={[
                        styles.pmText,
                        {
                          color: isSelected ? activeBorderColor : theme.textSecondary,
                          fontWeight: isSelected ? '700' : '600',
                          fontFamily: fontEnLabel,
                        },
                      ]}
                    >
                      {pm.label}
                    </Text>
                  </TouchableOpacity>
                );
              })}
            </View>

            {/* 3B. MFS Stealth Cash-out Fee Helper */}
            {isMfs && (
              <TouchableOpacity
                style={[
                  styles.feeToggleCard,
                  {
                    backgroundColor: includeCashoutFee
                      ? (isDark ? 'rgba(244, 123, 78, 0.14)' : '#FFF7ED')
                      : (isDark ? 'rgba(255, 255, 255, 0.03)' : '#F8FAFC'),
                    borderColor: includeCashoutFee
                      ? primaryBrandColor
                      : (isDark ? 'rgba(255, 255, 255, 0.08)' : '#E2E8F0'),
                  },
                ]}
                onPress={() => {
                  try { Haptics.selectionAsync(); } catch {}
                  setIncludeCashoutFee(!includeCashoutFee);
                }}
                activeOpacity={0.8}
              >
                <View style={styles.feeToggleRow}>
                  <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6, flex: 1 }}>
                    <Ionicons
                      name="flash-outline"
                      size={15}
                      color={includeCashoutFee ? primaryBrandColor : theme.textSecondary}
                    />
                    <Text
                      style={[
                        styles.feeToggleText,
                        {
                          color: includeCashoutFee ? primaryBrandColor : theme.textSecondary,
                          fontFamily: language === 'bn' ? fontBnFamily : fontEnLabel,
                        },
                      ]}
                    >
                      {language === 'bn'
                        ? `${paymentMethod} ক্যাশ-আউট চার্জ যোগ করুন (+১.৪৯%)`
                        : `Include ${paymentMethod} Cash-Out Fee (+1.49%)`}
                    </Text>
                  </View>
                  <Ionicons
                    name={includeCashoutFee ? 'checkbox' : 'square-outline'}
                    size={18}
                    color={includeCashoutFee ? primaryBrandColor : theme.textMuted}
                  />
                </View>

                {includeCashoutFee && numAmount > 0 && (
                  <Text
                    style={[
                      styles.feeCalcSubtext,
                      {
                        color: theme.textSecondary,
                        fontFamily: language === 'bn' ? fontBnFamily : fontEnDisplay,
                      },
                    ]}
                  >
                    {language === 'bn'
                      ? `মূল টাকা: ৳${numAmount.toLocaleString()} + চার্জ: ৳${cashoutFee.toFixed(1)} = মোট: ৳${effectiveTotal.toFixed(1)}`
                      : `Base: ৳${numAmount.toLocaleString()} + Fee: ৳${cashoutFee.toFixed(1)} = Total: ৳${effectiveTotal.toFixed(1)}`}
                  </Text>
                )}
              </TouchableOpacity>
            )}

            {/* 4. Note Input */}
            <Text
              style={[
                styles.sectionLabel,
                {
                  color: theme.textSecondary,
                  fontFamily: language === 'bn' ? fontBnFamily : fontEnLabel,
                },
              ]}
            >
              {language === 'bn' ? 'মন্তব্য বা বিবরণ (ঐচ্ছিক)' : 'Note / Description (Optional)'}
            </Text>

            <TextInput
              style={[
                styles.noteInput,
                {
                  backgroundColor: isDark ? 'rgba(255, 255, 255, 0.04)' : '#F8FAFC',
                  borderColor: isDark ? 'rgba(255, 255, 255, 0.08)' : '#DCE5EC',
                  color: theme.textPrimary,
                  fontFamily: language === 'bn' ? fontBnFamily : fontEnLabel,
                },
              ]}
              placeholder={
                isIncome
                  ? (language === 'bn' ? 'যেমন: আব্বুর পাঠানো টাকা, টিউশন ফি...' : 'e.g. Monthly allowance, physics tuition...')
                  : (language === 'bn' ? 'যেমন: দুপুরের খাবার, রিকশা ভাড়া...' : 'e.g. Canteen lunch, rickshaw fare...')
              }
              placeholderTextColor="rgba(100, 116, 139, 0.45)"
              value={note}
              onChangeText={setNote}
              maxLength={80}
            />

            {/* 5. Cohesive Full-Width Pill CTA (No checkmark circle, high-end fintech) */}
            <TouchableOpacity
              style={[styles.ctaWrapper, loading && styles.ctaDisabled]}
              onPress={handleSave}
              disabled={loading}
              activeOpacity={0.88}
            >
              <LinearGradient
                colors={isIncome ? ['#10B981', '#059669'] : ['#F47B4E', '#E06A3B']}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 0 }}
                style={styles.ctaGradient}
              >
                {loading ? (
                  <ActivityIndicator color="#FFFFFF" size="small" />
                ) : (
                  <Text
                    style={[
                      styles.ctaText,
                      {
                        fontFamily: language === 'bn' ? fontBnFamily : fontEnDisplay,
                      },
                    ]}
                  >
                    {isIncome
                      ? (language === 'bn' ? 'ওয়ালেটে যোগ করুন' : 'Add to Wallet')
                      : (language === 'bn' ? 'খরচ সংরক্ষণ করুন' : 'Save Expense')}
                  </Text>
                )}
              </LinearGradient>
            </TouchableOpacity>
          </ScrollView>
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
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(15, 23, 42, 0.60)',
  },
  sheetContainer: {
    borderTopLeftRadius: 28,
    borderTopRightRadius: 28,
    borderWidth: 1,
    borderBottomWidth: 0,
    maxHeight: '92%',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: -4 },
    shadowOpacity: 0.12,
    shadowRadius: 16,
    elevation: 10,
  },
  dragHandle: {
    width: 44,
    height: 4.5,
    borderRadius: 3,
    alignSelf: 'center',
    marginTop: 10,
    marginBottom: 6,
  },
  modeSwitcherContainer: {
    flexDirection: 'row',
    borderRadius: 14,
    marginHorizontal: 20,
    marginTop: 6,
    marginBottom: 6,
    padding: 3,
  },
  modeTab: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 8,
    borderRadius: 11,
    gap: 6,
  },
  modeTabActive: {
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1.5 },
    shadowOpacity: 0.08,
    shadowRadius: 3,
    elevation: 2,
  },
  modeTabText: {
    fontSize: 13,
  },
  headerRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 12,
    borderBottomWidth: 1,
  },
  headerTitleWrap: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  modeIndicatorDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  title: {
    fontSize: 17,
    fontWeight: '700',
    letterSpacing: -0.3,
  },
  closeBtn: {
    width: 32,
    height: 32,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
  },
  scrollContent: {
    paddingHorizontal: 20,
    paddingTop: 14,
    paddingBottom: 24,
  },
  heroAmountCard: {
    borderRadius: 20,
    paddingHorizontal: 18,
    paddingVertical: 16,
    marginBottom: 16,
    borderWidth: 1,
  },
  heroAmountHint: {
    fontSize: 11.5,
    fontWeight: '600',
    textTransform: 'uppercase',
    letterSpacing: 0.6,
    marginBottom: 6,
  },
  amountContentRow: {
    flexDirection: 'row',
    alignItems: 'baseline',
  },
  currencySymbol: {
    fontSize: 28,
    fontWeight: '700',
    marginRight: 6,
    lineHeight: 38,
  },
  amountInput: {
    flex: 1,
    fontSize: 40,
    fontWeight: '800',
    padding: 0,
    margin: 0,
    lineHeight: 46,
    fontVariant: ['tabular-nums'],
    ...(Platform.OS === 'web' ? ({ outlineStyle: 'none' } as any) : {}),
  },
  sectionLabel: {
    fontSize: 12,
    fontWeight: '600',
    marginBottom: 8,
    marginTop: 4,
    letterSpacing: 0.2,
  },
  chipGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    marginBottom: 14,
  },
  pillChip: {
    paddingVertical: 9,
    paddingHorizontal: 14,
    borderRadius: 12,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  chipText: {
    fontSize: 13,
  },
  pmRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    marginBottom: 14,
  },
  pmPill: {
    paddingVertical: 8,
    paddingHorizontal: 14,
    borderRadius: 12,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  pmText: {
    fontSize: 12.5,
  },
  noteInput: {
    borderWidth: 1,
    borderRadius: 14,
    paddingHorizontal: 14,
    paddingVertical: 11,
    fontSize: 13.5,
    marginBottom: 20,
    ...(Platform.OS === 'web' ? ({ outlineStyle: 'none' } as any) : {}),
  },
  ctaWrapper: {
    height: 52,
    borderRadius: 16,
    overflow: 'hidden',
    marginTop: 4,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.12,
    shadowRadius: 8,
    elevation: 3,
  },
  ctaDisabled: {
    opacity: 0.65,
  },
  ctaGradient: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  ctaText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '700',
    letterSpacing: 0.2,
  },
  feeToggleCard: {
    borderWidth: 1,
    borderRadius: 14,
    paddingVertical: 10,
    paddingHorizontal: 12,
    marginTop: 8,
    marginBottom: 4,
  },
  feeToggleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  feeToggleText: {
    fontSize: 12.5,
    fontWeight: '600',
  },
  feeCalcSubtext: {
    fontSize: 11,
    marginTop: 4,
  },
});
