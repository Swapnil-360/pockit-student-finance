import React, { useState } from 'react';
import {
  Modal,
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  TextInput,
  KeyboardAvoidingView,
  Platform,
  Alert,
  ActivityIndicator,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useTheme } from '../constants/ThemeContext';
import { createPeerDebt, PeerDebtItem } from '../services/api';

interface PeerDebtModalProps {
  visible: boolean;
  onClose: () => void;
  userId: string;
  language: 'en' | 'bn';
  onSuccess: () => void;
}

export const PeerDebtModal: React.FC<PeerDebtModalProps> = ({
  visible,
  onClose,
  userId,
  language,
  onSuccess,
}) => {
  const { isDark, theme } = useTheme();
  const insets = useSafeAreaInsets();
  const safeBottom = Math.max(insets.bottom, 16);

  const [type, setType] = useState<'owed_to_me' | 'i_owe'>('owed_to_me');
  const [personName, setPersonName] = useState('');
  const [amount, setAmount] = useState('');
  const [note, setNote] = useState('');
  const [loading, setLoading] = useState(false);

  const isOwedToMe = type === 'owed_to_me';
  const brandColor = isOwedToMe ? '#10B981' : '#F47B4E';
  const tintBg = isOwedToMe
    ? (isDark ? 'rgba(16, 185, 129, 0.16)' : '#E6F9F0')
    : (isDark ? 'rgba(244, 123, 78, 0.16)' : '#FDECE4');

  const fontBnFamily = Platform.select({ web: '"Hind Siliguri", -apple-system, sans-serif', default: undefined });
  const fontEnDisplay = Platform.select({ web: '"Plus Jakarta Sans", -apple-system, sans-serif', default: undefined });
  const fontEnLabel = Platform.select({ web: '"Inter", -apple-system, sans-serif', default: undefined });

  const handleAmountChange = (text: string) => {
    let clean = text.replace(/[^0-9.]/g, '');
    if (clean.length > 1 && clean.startsWith('0') && clean[1] !== '.') {
      clean = clean.replace(/^0+/, '');
    }
    setAmount(clean);
  };

  const handleSave = async () => {
    if (!personName.trim()) {
      Alert.alert(
        language === 'bn' ? 'নাম প্রয়োজন' : 'Name Required',
        language === 'bn' ? 'অনুগ্রহ করে ব্যক্তির নাম লিখুন।' : 'Please enter the person\'s name.'
      );
      return;
    }
    const num = parseFloat(amount.trim());
    if (isNaN(num) || num <= 0) {
      Alert.alert(
        language === 'bn' ? 'সঠিক টাকা লিখুন' : 'Valid Amount Required',
        language === 'bn' ? 'টাকার পরিমাণ শূন্যের বেশি হতে হবে।' : 'Amount must be greater than zero.'
      );
      return;
    }

    setLoading(true);
    try {
      await createPeerDebt({
        user_id: userId,
        type,
        person_name: personName.trim(),
        amount: num,
        note: note.trim() || undefined,
      });

      try { Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success); } catch {}
      setPersonName('');
      setAmount('');
      setNote('');
      onSuccess();
      onClose();
    } catch (e: any) {
      Alert.alert(
        language === 'bn' ? 'ত্রুটি' : 'Error',
        language === 'bn' ? 'ধার বা দেনার হিসাব সংরক্ষণ করা যায়নি।' : `Failed to save debt: ${e.message}`
      );
    } finally {
      setLoading(false);
    }
  };

  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
      <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined} style={styles.overlay}>
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
          <View style={[styles.dragHandle, { backgroundColor: isDark ? 'rgba(255, 255, 255, 0.15)' : '#CBD5E1' }]} />

          {/* Header */}
          <View style={[styles.headerRow, { borderBottomColor: isDark ? 'rgba(255, 255, 255, 0.06)' : 'rgba(90, 130, 150, 0.08)' }]}>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
              <Ionicons name="people-outline" size={20} color={brandColor} />
              <Text style={[styles.title, { color: theme.textPrimary, fontFamily: language === 'bn' ? fontBnFamily : fontEnDisplay }]}>
                {language === 'bn' ? 'দেনা-পাওনা ও ধার খাতা' : 'Campus Peer Debt Ledger'}
              </Text>
            </View>
            <TouchableOpacity onPress={onClose} style={[styles.closeBtn, { backgroundColor: isDark ? 'rgba(255, 255, 255, 0.06)' : '#F1F5F9' }]}>
              <Ionicons name="close" size={18} color={theme.textSecondary} />
            </TouchableOpacity>
          </View>

          {/* Type Switcher Segmented Control */}
          <View style={[styles.typeSwitcher, { backgroundColor: isDark ? '#1E293B' : '#EDF2F7' }]}>
            <TouchableOpacity
              style={[
                styles.typeTab,
                isOwedToMe && [styles.typeTabActive, { backgroundColor: isDark ? '#334155' : '#FFFFFF' }],
              ]}
              onPress={() => {
                try { Haptics.selectionAsync(); } catch {}
                setType('owed_to_me');
              }}
              activeOpacity={0.8}
            >
              <Ionicons name="arrow-down-circle" size={15} color={isOwedToMe ? '#10B981' : theme.textSecondary} />
              <Text style={[styles.typeTabText, { color: isOwedToMe ? '#10B981' : theme.textSecondary, fontFamily: language === 'bn' ? fontBnFamily : fontEnLabel }]}>
                {language === 'bn' ? 'আমি পাবো (Owed to Me)' : 'Owed to Me'}
              </Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={[
                styles.typeTab,
                !isOwedToMe && [styles.typeTabActive, { backgroundColor: isDark ? '#334155' : '#FFFFFF' }],
              ]}
              onPress={() => {
                try { Haptics.selectionAsync(); } catch {}
                setType('i_owe');
              }}
              activeOpacity={0.8}
            >
              <Ionicons name="arrow-up-circle" size={15} color={!isOwedToMe ? '#F47B4E' : theme.textSecondary} />
              <Text style={[styles.typeTabText, { color: !isOwedToMe ? '#F47B4E' : theme.textSecondary, fontFamily: language === 'bn' ? fontBnFamily : fontEnLabel }]}>
                {language === 'bn' ? 'আমি দেবো (I Owe)' : 'I Owe'}
              </Text>
            </TouchableOpacity>
          </View>

          {/* Form Inputs */}
          <View style={styles.formContent}>
            {/* Person Name Input */}
            <Text style={[styles.fieldLabel, { color: theme.textSecondary, fontFamily: language === 'bn' ? fontBnFamily : fontEnLabel }]}>
              {language === 'bn' ? 'ব্যক্তি বা বন্ধুর নাম' : "Person / Friend's Name"}
            </Text>
            <TextInput
              style={[
                styles.input,
                {
                  backgroundColor: isDark ? 'rgba(255, 255, 255, 0.04)' : '#F8FAFC',
                  borderColor: isDark ? 'rgba(255, 255, 255, 0.08)' : '#DCE5EC',
                  color: theme.textPrimary,
                  fontFamily: language === 'bn' ? fontBnFamily : fontEnLabel,
                },
              ]}
              placeholder={language === 'bn' ? 'উদা: সাকিব, মামুন ভাই, ক্যান্টিন মামা' : 'e.g. Shakib, Tanvir, Canteen'}
              placeholderTextColor="rgba(100, 116, 139, 0.45)"
              value={personName}
              onChangeText={setPersonName}
            />

            {/* Amount Input */}
            <Text style={[styles.fieldLabel, { color: theme.textSecondary, fontFamily: language === 'bn' ? fontBnFamily : fontEnLabel, marginTop: 12 }]}>
              {language === 'bn' ? 'টাকার পরিমাণ (৳)' : 'Amount (৳)'}
            </Text>
            <View
              style={[
                styles.amountRow,
                {
                  backgroundColor: isDark ? 'rgba(255, 255, 255, 0.04)' : '#F8FAFC',
                  borderColor: isDark ? 'rgba(255, 255, 255, 0.08)' : '#DCE5EC',
                },
              ]}
            >
              <Text style={[styles.currencyPrefix, { color: brandColor }]}>৳</Text>
              <TextInput
                style={[
                  styles.amountInput,
                  { color: theme.textPrimary, fontFamily: fontEnDisplay },
                ]}
                keyboardType="numeric"
                placeholder="0"
                placeholderTextColor="rgba(100, 116, 139, 0.45)"
                value={amount}
                onChangeText={handleAmountChange}
              />
            </View>

            {/* Note Input */}
            <Text style={[styles.fieldLabel, { color: theme.textSecondary, fontFamily: language === 'bn' ? fontBnFamily : fontEnLabel, marginTop: 12 }]}>
              {language === 'bn' ? 'বিবরণ বা কারণ (ঐচ্ছিক)' : 'Note / Reason (Optional)'}
            </Text>
            <TextInput
              style={[
                styles.input,
                {
                  backgroundColor: isDark ? 'rgba(255, 255, 255, 0.04)' : '#F8FAFC',
                  borderColor: isDark ? 'rgba(255, 255, 255, 0.08)' : '#DCE5EC',
                  color: theme.textPrimary,
                  fontFamily: language === 'bn' ? fontBnFamily : fontEnLabel,
                },
              ]}
              placeholder={language === 'bn' ? 'উদা: ক্যান্টিনের লাঞ্চ, রিকশা ভাড়া' : 'e.g. Canteen lunch, rickshaw'}
              placeholderTextColor="rgba(100, 116, 139, 0.45)"
              value={note}
              onChangeText={setNote}
            />

            {/* Submit Button */}
            <TouchableOpacity
              style={[styles.saveBtn, { backgroundColor: brandColor, opacity: loading ? 0.7 : 1 }]}
              onPress={handleSave}
              disabled={loading}
              activeOpacity={0.8}
            >
              {loading ? (
                <ActivityIndicator color="#FFFFFF" size="small" />
              ) : (
                <Text style={[styles.saveBtnText, { fontFamily: language === 'bn' ? fontBnFamily : fontEnDisplay }]}>
                  {isOwedToMe
                    ? (language === 'bn' ? 'পাওনা টাকা রেকর্ড করুন' : 'Record Money Owed to Me')
                    : (language === 'bn' ? 'দেনা রেকর্ড করুন' : 'Record Loan I Owe')}
                </Text>
              )}
            </TouchableOpacity>
          </View>
        </View>
      </KeyboardAvoidingView>
    </Modal>
  );
};

const styles = StyleSheet.create({
  overlay: { flex: 1, justifyContent: 'flex-end' },
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
  },
  dragHandle: {
    width: 38,
    height: 4,
    borderRadius: 2,
    alignSelf: 'center',
    marginTop: 10,
    marginBottom: 6,
  },
  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingVertical: 14,
    borderBottomWidth: 1,
  },
  title: { fontSize: 16.5, fontWeight: '700' },
  closeBtn: {
    width: 32,
    height: 32,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
  },
  typeSwitcher: {
    flexDirection: 'row',
    borderRadius: 14,
    padding: 3,
    marginHorizontal: 20,
    marginTop: 14,
  },
  typeTab: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 8,
    borderRadius: 11,
    gap: 6,
  },
  typeTabActive: {
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1.5 },
    shadowOpacity: 0.08,
    shadowRadius: 3,
    elevation: 2,
  },
  typeTabText: { fontSize: 13, fontWeight: '700' },
  formContent: { paddingHorizontal: 20, paddingTop: 14, paddingBottom: 10 },
  fieldLabel: { fontSize: 12.5, fontWeight: '600', marginBottom: 6 },
  input: {
    borderWidth: 1,
    borderRadius: 14,
    paddingHorizontal: 14,
    paddingVertical: 11,
    fontSize: 14,
  },
  amountRow: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    borderRadius: 14,
    paddingHorizontal: 14,
    paddingVertical: 4,
  },
  currencyPrefix: { fontSize: 20, fontWeight: '700', marginRight: 6 },
  amountInput: { flex: 1, fontSize: 22, fontWeight: '700', paddingVertical: 6 },
  saveBtn: {
    borderRadius: 16,
    paddingVertical: 14,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 18,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.12,
    shadowRadius: 6,
    elevation: 3,
  },
  saveBtnText: { color: '#FFFFFF', fontSize: 15, fontWeight: '700' },
});
