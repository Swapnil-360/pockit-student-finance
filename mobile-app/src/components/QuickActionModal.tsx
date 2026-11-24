import React from 'react';
import {
  View,
  Text,
  Modal,
  StyleSheet,
  TouchableOpacity,
  Platform,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useTheme } from '../constants/ThemeContext';
import { Language } from '../constants/translations';

interface QuickActionModalProps {
  visible: boolean;
  onClose: () => void;
  onOpenIncome: () => void;
  onOpenExpense: () => void;
  language: Language;
}

export const QuickActionModal: React.FC<QuickActionModalProps> = ({
  visible,
  onClose,
  onOpenIncome,
  onOpenExpense,
  language,
}) => {
  const { isDark, theme } = useTheme();
  const insets = useSafeAreaInsets();
  const safeBottom = Math.max(insets.bottom, 16);

  const handleIncome = () => {
    try {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    } catch {}
    onClose();
    setTimeout(onOpenIncome, 150);
  };

  const handleExpense = () => {
    try {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    } catch {}
    onClose();
    setTimeout(onOpenExpense, 150);
  };

  return (
    <Modal
      visible={visible}
      transparent
      animationType="fade"
      onRequestClose={onClose}
    >
      <View style={styles.overlay}>
        <TouchableOpacity style={styles.backdrop} activeOpacity={1} onPress={onClose} />

        <View
          style={[
            styles.sheetContainer,
            {
              backgroundColor: theme.surface,
              borderColor: theme.border,
              paddingBottom: safeBottom + 16,
            },
          ]}
        >
          {/* Sheet Handle */}
          <View style={[styles.dragHandle, { backgroundColor: theme.borderMedium }]} />

          <View style={styles.headerRow}>
            <Text style={[styles.title, { color: theme.textPrimary }]}>
              {language === 'bn' ? 'দ্রুত লেনদেন যোগ করুন' : 'Quick Transaction'}
            </Text>
            <TouchableOpacity onPress={onClose} style={styles.closeBtn}>
              <Ionicons name="close" size={20} color={theme.textMuted} />
            </TouchableOpacity>
          </View>

          <Text style={[styles.subtitle, { color: theme.textSecondary }]}>
            {language === 'bn'
              ? '৫ সেকেন্ডের মধ্যে আপনার আয় বা খরচের হিসাব অন্তর্ভুক্ত করুন'
              : 'Log daily inflow or outflow in under 5 seconds'}
          </Text>

          {/* Action Cards */}
          <View style={styles.actionsGrid}>
            {/* Add Income */}
            <TouchableOpacity
              style={[
                styles.actionCard,
                {
                  backgroundColor: isDark ? 'rgba(16, 185, 129, 0.12)' : '#E6F9F0',
                  borderColor: isDark ? 'rgba(16, 185, 129, 0.25)' : 'rgba(16, 185, 129, 0.35)',
                },
              ]}
              onPress={handleIncome}
              activeOpacity={0.8}
            >
              <View style={[styles.iconCircle, { backgroundColor: '#10B981' }]}>
                <Ionicons name="arrow-down" size={22} color="#FFFFFF" />
              </View>
              <View style={styles.actionTextWrap}>
                <Text style={[styles.actionTitle, { color: '#047857' }]}>
                  {language === 'bn' ? 'আয় যোগ' : 'Income'}
                </Text>
                <Text style={[styles.actionDesc, { color: isDark ? '#A7F3D0' : '#065F46' }]}>
                  {language === 'bn' ? 'টিউশন, ভাতা বা উপার্জিত অর্থ' : 'Allowance, tuition, freelancing'}
                </Text>
              </View>
              <Ionicons name="chevron-forward" size={18} color="#047857" />
            </TouchableOpacity>

            {/* Add Expense */}
            <TouchableOpacity
              style={[
                styles.actionCard,
                {
                  backgroundColor: theme.terracottaSoft,
                  borderColor: isDark ? 'rgba(244, 130, 84, 0.25)' : 'rgba(242, 122, 73, 0.35)',
                },
              ]}
              onPress={handleExpense}
              activeOpacity={0.8}
            >
              <View style={[styles.iconCircle, { backgroundColor: theme.primary }]}>
                <Ionicons name="arrow-up" size={22} color="#FFFFFF" />
              </View>
              <View style={styles.actionTextWrap}>
                <Text style={[styles.actionTitle, { color: theme.primary }]}>
                  {language === 'bn' ? 'খরচ যোগ' : 'Expense'}
                </Text>
                <Text style={[styles.actionDesc, { color: isDark ? '#FDBA74' : '#C2410C' }]}>
                  {language === 'bn' ? 'খাবার, মেস ভাড়া, যাতায়াত ইত্যাদি' : 'Food, rent, transport, study'}
                </Text>
              </View>
              <Ionicons name="chevron-forward" size={18} color={theme.primary} />
            </TouchableOpacity>
          </View>
        </View>
      </View>
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
    backgroundColor: 'rgba(15, 23, 42, 0.60)',
  },
  sheetContainer: {
    borderTopLeftRadius: 28,
    borderTopRightRadius: 28,
    borderWidth: 1,
    paddingHorizontal: 20,
    paddingTop: 12,
  },
  dragHandle: {
    width: 36,
    height: 4,
    borderRadius: 2,
    alignSelf: 'center',
    marginBottom: 16,
  },
  headerRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  title: {
    fontSize: 18,
    fontWeight: '800',
    letterSpacing: -0.3,
  },
  closeBtn: {
    padding: 6,
  },
  subtitle: {
    fontSize: 12,
    marginTop: 2,
    marginBottom: 16,
  },
  actionsGrid: {
    gap: 12,
  },
  actionCard: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
    borderRadius: 20,
    borderWidth: 1.5,
    gap: 14,
  },
  iconCircle: {
    width: 44,
    height: 44,
    borderRadius: 22,
    alignItems: 'center',
    justifyContent: 'center',
  },
  actionTextWrap: {
    flex: 1,
  },
  actionTitle: {
    fontSize: 16,
    fontWeight: '800',
  },
  actionDesc: {
    fontSize: 12,
    marginTop: 2,
    fontWeight: '500',
  },
});
