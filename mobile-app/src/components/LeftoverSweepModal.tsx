import React, { useState } from 'react';
import {
  View,
  Text,
  Modal,
  StyleSheet,
  TouchableOpacity,
  ActivityIndicator,
  Alert,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useTheme } from '../constants/ThemeContext';
import { TRANSLATIONS, Language } from '../constants/translations';
import { sweepLeftoverToGoal, SavingsGoal } from '../services/api';

interface LeftoverSweepModalProps {
  visible: boolean;
  goal: SavingsGoal | null;
  userId: string;
  sweepAmount: number;
  language: Language;
  onClose: () => void;
  onSwept: (updatedGoal: SavingsGoal) => void;
}

export const LeftoverSweepModal: React.FC<LeftoverSweepModalProps> = ({
  visible,
  goal,
  userId,
  sweepAmount,
  language,
  onClose,
  onSwept,
}) => {
  const { isDark, theme } = useTheme();
  const t = TRANSLATIONS[language];
  const insets = useSafeAreaInsets();
  const safeBottom = Math.max(insets.bottom, 16);
  const [loading, setLoading] = useState(false);

  if (!goal) return null;

  const handleSweep = async () => {
    if (sweepAmount <= 0) return;
    try {
      setLoading(true);
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Heavy);
      const updated = await sweepLeftoverToGoal(goal.id, userId, sweepAmount);
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      onSwept(updated);
      onClose();
    } catch (e: any) {
      Alert.alert('Sweep Error', e.message || 'Failed to sweep leftover funds');
    } finally {
      setLoading(false);
    }
  };

  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
      <View style={styles.modalOverlay}>
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
            <View style={{ flexDirection: 'row', alignItems: 'center' }}>
              <View style={[styles.iconCircle, { backgroundColor: isDark ? 'rgba(16, 185, 129, 0.2)' : '#ECFDF5' }]}>
                <Ionicons name="wallet-outline" size={24} color="#10B981" />
              </View>
              <View style={{ marginLeft: 12 }}>
                <Text style={[styles.sheetTitle, { color: theme.textPrimary }]}>
                  {language === 'bn' ? 'মাসের উদ্বৃত্ত স্থানান্তর' : 'Month-End Leftover Sweep'}
                </Text>
                <Text style={[styles.sheetSub, { color: theme.textSecondary }]}>
                  {language === 'bn' ? 'অব্যবহৃত টাকা সঞ্চয় ভল্টে রাখুন' : 'Reward yourself by locking in savings'}
                </Text>
              </View>
            </View>
            <TouchableOpacity onPress={onClose} hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}>
              <Ionicons name="close-circle" size={26} color={theme.textSecondary} />
            </TouchableOpacity>
          </View>

          {/* Amount Showcase */}
          <View style={[styles.amountCard, { backgroundColor: isDark ? 'rgba(255, 255, 255, 0.05)' : '#F4F7FA' }]}>
            <Text style={[styles.amountLabel, { color: theme.textSecondary }]}>
              {language === 'bn' ? 'উদ্বৃত্ত পকেট মানি' : 'Unspent Pocket Money Available'}
            </Text>
            <Text style={[styles.bigAmount, { color: '#10B981' }]}>
              ৳{Math.round(sweepAmount).toLocaleString()}
            </Text>
            <Text style={[styles.targetInfo, { color: theme.textPrimary }]}>
              → {goal.title}
            </Text>
          </View>

          {/* Explanatory Message */}
          <View style={styles.descBox}>
            <Ionicons name="shield-checkmark-outline" size={18} color={theme.slateBlue} style={{ marginRight: 8, marginTop: 2 }} />
            <Text style={[styles.descText, { color: theme.textSecondary }]}>
              {language === 'bn'
                ? `আপনি সফলভাবে বাজেটের মধ্যে ছিলেন! এই ৳${Math.round(sweepAmount)} ভল্টে জমা করলে এটি অপচয় থেকে বাঁচবে এবং আপনার লক্ষ্য অর্জনের সময় আরও এগিয়ে আসবে।`
                : `Great financial discipline! Sweeping this ৳${Math.round(sweepAmount)} locks it into your vault, protecting it from impulse end-of-month splurges and pulling your goal date closer.`}
            </Text>
          </View>

          {/* Action Buttons */}
          <TouchableOpacity
            style={[styles.sweepBtn, { backgroundColor: '#10B981' }]}
            onPress={handleSweep}
            disabled={loading}
            activeOpacity={0.85}
          >
            {loading ? (
              <ActivityIndicator color="#FFFFFF" size="small" />
            ) : (
              <Text style={styles.sweepBtnText}>
                {language === 'bn' ? `৳${Math.round(sweepAmount)} ভল্টে স্থানান্তর করুন` : `Sweep ৳${Math.round(sweepAmount)} to Goal Vault`}
              </Text>
            )}
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.cancelBtn, { backgroundColor: 'transparent' }]}
            onPress={onClose}
          >
            <Text style={[styles.cancelBtnText, { color: theme.textSecondary }]}>
              {language === 'bn' ? 'এখন নয়, পরে' : 'Keep in Daily Balance'}
            </Text>
          </TouchableOpacity>
        </View>
      </View>
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
    marginBottom: 18,
  },
  iconCircle: {
    width: 44,
    height: 44,
    borderRadius: 22,
    alignItems: 'center',
    justifyContent: 'center',
  },
  sheetTitle: {
    fontSize: 17,
    fontWeight: '700',
  },
  sheetSub: {
    fontSize: 12,
    marginTop: 2,
  },
  amountCard: {
    borderRadius: 16,
    padding: 16,
    alignItems: 'center',
    marginBottom: 16,
  },
  amountLabel: {
    fontSize: 12,
    fontWeight: '600',
    marginBottom: 4,
  },
  bigAmount: {
    fontSize: 32,
    fontWeight: '800',
  },
  targetInfo: {
    fontSize: 13,
    fontWeight: '600',
    marginTop: 6,
  },
  descBox: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    marginBottom: 20,
    paddingHorizontal: 4,
  },
  descText: {
    fontSize: 13,
    lineHeight: 18,
    flex: 1,
  },
  sweepBtn: {
    paddingVertical: 14,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 8,
  },
  sweepBtnText: {
    color: '#FFFFFF',
    fontSize: 15,
    fontWeight: '700',
  },
  cancelBtn: {
    paddingVertical: 10,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 10,
  },
  cancelBtnText: {
    fontSize: 13,
    fontWeight: '600',
  },
});

