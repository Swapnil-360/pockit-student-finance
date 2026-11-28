import React, { useState } from 'react';
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
import { addExpense } from '../services/api';
import { parseMobileBankingSms } from '../utils/smsParser';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

interface LogExpenseModalProps {
  visible: boolean;
  onClose: () => void;
  userId: string;
  language: Language;
  onExpenseAdded: () => void;
}

const CATEGORIES = [
  { key: 'Food', en: 'Food & Meals', bn: 'খাবার ও নাস্তা' },
  { key: 'Transport', en: 'Transport', bn: 'যাতায়াত' },
  { key: 'Entertainment', en: 'Hangout & Shopping', bn: 'আড্ডা ও শপিং' },
  { key: 'Rent', en: 'Rent & Bills', bn: 'মেস ও বিল' },
  { key: 'Academic', en: 'Books & Study', bn: 'বই ও পড়াশোনা' },
  { key: 'Bills', en: 'Recharge / Net', bn: 'রিচার্জ ও নেট' },
  { key: 'Borrowing', en: 'Debt Repayment', bn: 'ধার পরিশোধ' },
  { key: 'Other', en: 'Personal / Other', bn: 'অন্যান্য খরচ' },
];

const PAYMENT_METHODS = [
  { key: 'Cash', label: 'Cash' },
  { key: 'bKash', label: 'bKash' },
  { key: 'Nagad', label: 'Nagad' },
  { key: 'Rocket', label: 'Rocket' },
  { key: 'Bank', label: 'Bank' },
];

export const LogExpenseModal: React.FC<LogExpenseModalProps> = ({
  visible,
  onClose,
  userId,
  language,
  onExpenseAdded,
}) => {
  const { isDark, theme } = useTheme();
  const [amount, setAmount] = useState('');
  const [category, setCategory] = useState('Food');
  const [paymentMethod, setPaymentMethod] = useState('Cash');
  const [note, setNote] = useState('');
  const [smsOpen, setSmsOpen] = useState(false);
  const [smsText, setSmsText] = useState('');
  const [loading, setLoading] = useState(false);
  const insets = useSafeAreaInsets();
  const safeBottom = Math.max(insets.bottom, 16);

  const t = TRANSLATIONS[language];

  // Auto-strip leading zeros and keep only valid currency digits/decimal
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

    setLoading(true);
    try {
      await addExpense({
        user_id: userId,
        amount: num,
        category,
        payment_method: paymentMethod,
        note: note.trim() || undefined,
      });

      // Reset form
      setAmount('');
      setNote('');
      setCategory('Food');
      setPaymentMethod('Cash');
      try {
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      } catch {}
      onExpenseAdded();
      onClose();
    } catch (error) {
      Alert.alert(
        language === 'bn' ? 'ত্রুটি' : 'Error',
        language === 'bn' ? 'খরচ সংরক্ষণ করা যায়নি।' : `Failed to save expense: ${String(error)}`
      );
    } finally {
      setLoading(false);
    }
  };

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
          {/* Subtle Top Handle */}
          <View style={[styles.dragHandle, { backgroundColor: isDark ? 'rgba(255, 255, 255, 0.15)' : '#CBD5E1' }]} />

          {/* Clean Fintech Header */}
          <View style={[styles.headerRow, { borderBottomColor: isDark ? 'rgba(255, 255, 255, 0.06)' : 'rgba(90, 130, 150, 0.08)' }]}>
            <View style={styles.headerTitleWrap}>
              <View style={[styles.modeIndicatorDot, { backgroundColor: '#F47B4E' }]} />
              <Text
                style={[
                  styles.title,
                  {
                    color: theme.textPrimary,
                    fontFamily: language === 'bn' ? fontBnFamily : fontEnDisplay,
                  },
                ]}
              >
                {language === 'bn' ? 'দৈনিক খরচ যোগ করুন' : 'Log Daily Expense'}
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
            {/* Quick Paste bKash / Nagad SMS Auto-Fill */}
            <TouchableOpacity
              onPress={() => setSmsOpen((v) => !v)}
              style={{
                flexDirection: 'row',
                alignItems: 'center',
                justifyContent: 'center',
                gap: 6,
                paddingVertical: 8,
                paddingHorizontal: 12,
                borderRadius: 10,
                borderWidth: 1,
                borderColor: isDark ? 'rgba(244, 123, 78, 0.35)' : '#FED7AA',
                backgroundColor: isDark ? 'rgba(244, 123, 78, 0.12)' : '#FFF7ED',
                marginBottom: 12,
              }}
              activeOpacity={0.75}
            >
              <Ionicons name="clipboard-outline" size={14} color="#F47B4E" />
              <Text style={{ fontSize: 12, fontWeight: '700', color: '#F47B4E' }}>
                {language === 'bn' ? 'bKash / Nagad SMS পেস্ট করে অটো-ফিল করুন' : 'Paste bKash / Nagad SMS to Auto-Fill'}
              </Text>
            </TouchableOpacity>

            {smsOpen && (
              <View style={{ marginBottom: 12 }}>
                <TextInput
                  value={smsText}
                  onChangeText={(txt) => {
                    setSmsText(txt);
                    const parsed = parseMobileBankingSms(txt);
                    if (parsed.amount) setAmount(String(parsed.amount));
                    if (parsed.paymentMethod) setPaymentMethod(parsed.paymentMethod);
                    if (parsed.note) setNote(parsed.note);
                  }}
                  placeholder={language === 'bn' ? 'এখানে bKash বা Nagad SMS পেস্ট করুন...' : 'Paste bKash/Nagad SMS here...'}
                  placeholderTextColor={theme.textMuted}
                  multiline
                  numberOfLines={2}
                  style={{
                    borderWidth: 1,
                    borderColor: theme.border,
                    borderRadius: 12,
                    padding: 10,
                    fontSize: 12.5,
                    color: theme.textPrimary,
                    backgroundColor: isDark ? '#1E293B' : '#F8FAFC',
                  }}
                />
              </View>
            )}

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
                {language === 'bn' ? 'খরচের পরিমাণ লিখুন' : 'Enter amount spent'}
              </Text>

              <View style={styles.amountContentRow}>
                <Text
                  style={[
                    styles.currencySymbol,
                    {
                      color: '#F47B4E',
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
                  selectionColor="#F47B4E"
                />
              </View>
            </View>

            {/* 2. Category Selector */}
            <Text
              style={[
                styles.sectionLabel,
                {
                  color: theme.textSecondary,
                  fontFamily: language === 'bn' ? fontBnFamily : fontEnLabel,
                },
              ]}
            >
              {language === 'bn' ? 'খরচের খাত' : 'Category'}
            </Text>
            <View style={styles.chipGrid}>
              {CATEGORIES.map((cat) => {
                const isSelected = category === cat.key;
                return (
                  <TouchableOpacity
                    key={cat.key}
                    style={[
                      styles.pillChip,
                      {
                        backgroundColor: isSelected
                          ? isDark
                            ? 'rgba(244, 123, 78, 0.16)'
                            : '#F47B4E18'
                          : isDark
                          ? 'rgba(255, 255, 255, 0.04)'
                          : '#F8FAFC',
                        borderColor: isSelected
                          ? '#F47B4E'
                          : isDark
                          ? 'rgba(255, 255, 255, 0.08)'
                          : '#E2E8F0',
                      },
                    ]}
                    onPress={() => {
                      try { Haptics.selectionAsync(); } catch {}
                      setCategory(cat.key);
                    }}
                    activeOpacity={0.75}
                  >
                    <Text
                      style={[
                        styles.chipText,
                        {
                          color: isSelected ? '#F47B4E' : theme.textSecondary,
                          fontWeight: isSelected ? '700' : '500',
                          fontFamily: language === 'bn' ? fontBnFamily : fontEnLabel,
                        },
                      ]}
                    >
                      {language === 'bn' ? cat.bn : cat.en}
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
                          ? isDark
                            ? 'rgba(244, 123, 78, 0.16)'
                            : '#F47B4E18'
                          : isDark
                          ? 'rgba(255, 255, 255, 0.04)'
                          : '#F8FAFC',
                        borderColor: isSelected
                          ? '#F47B4E'
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
                          color: isSelected ? '#F47B4E' : theme.textSecondary,
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
              placeholder={language === 'bn' ? 'যেমন: দুপুরের খাবার, রিকশা ভাড়া...' : 'e.g. Canteen lunch, rickshaw fare...'}
              placeholderTextColor="rgba(100, 116, 139, 0.45)"
              value={note}
              onChangeText={setNote}
              maxLength={80}
            />

            {/* 5. Modern Full-Width Pill CTA Button */}
            <TouchableOpacity
              style={[styles.ctaWrapper, loading && styles.ctaDisabled]}
              onPress={handleSave}
              disabled={loading}
              activeOpacity={0.88}
            >
              <LinearGradient
                colors={['#F47B4E', '#E06A3B']}
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
                    {language === 'bn' ? 'খরচ সংরক্ষণ করুন' : 'Save Expense'}
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
    maxHeight: '90%',
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
    fontSize: 18,
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
    paddingTop: 16,
    paddingBottom: 24,
  },

  // 1. Unified Borderless Hero Amount Box
  heroAmountCard: {
    borderRadius: 20,
    borderWidth: 1,
    paddingVertical: 16,
    paddingHorizontal: 18,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 16,
  },
  heroAmountHint: {
    fontSize: 12,
    fontWeight: '500',
    marginBottom: 4,
    letterSpacing: 0.1,
  },
  amountContentRow: {
    flexDirection: 'row',
    alignItems: 'baseline',
    justifyContent: 'center',
  },
  currencySymbol: {
    fontSize: 28,
    fontWeight: '600',
    marginRight: 6,
    lineHeight: 38,
  },
  amountInput: {
    fontSize: 40,
    fontWeight: '700',
    fontVariant: ['tabular-nums'],
    minWidth: 44,
    textAlign: 'left',
    paddingVertical: 0,
    marginVertical: 0,
  },

  // Typography Section Labels
  sectionLabel: {
    fontSize: 13,
    fontWeight: '600',
    marginTop: 10,
    marginBottom: 8,
    letterSpacing: 0.1,
  },

  // Modern Pill Chips
  chipGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    marginBottom: 10,
  },
  pillChip: {
    paddingVertical: 9,
    paddingHorizontal: 14,
    borderRadius: 12,
    borderWidth: 1,
  },
  chipText: {
    fontSize: 12,
  },

  // Payment Method Row
  pmRow: {
    flexDirection: 'row',
    gap: 6,
    marginBottom: 10,
  },
  pmPill: {
    flex: 1,
    minHeight: 38,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 12,
    borderWidth: 1,
    paddingHorizontal: 4,
  },
  pmText: {
    fontSize: 12,
  },

  // Note Input
  noteInput: {
    borderRadius: 14,
    borderWidth: 1,
    paddingHorizontal: 14,
    paddingVertical: 11,
    fontSize: 13,
    marginBottom: 20,
  },

  // Modern Full-Width Pill CTA Button
  ctaWrapper: {
    borderRadius: 16,
    overflow: 'hidden',
    shadowColor: '#F47B4E',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.18,
    shadowRadius: 10,
    elevation: 3,
  },
  ctaDisabled: {
    opacity: 0.55,
  },
  ctaGradient: {
    height: 52,
    alignItems: 'center',
    justifyContent: 'center',
  },
  ctaText: {
    fontSize: 16,
    fontWeight: '700',
    color: '#FFFFFF',
    letterSpacing: 0.1,
  },
});
