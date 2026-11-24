import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
  Alert,
  Platform,
  StatusBar,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { THEME } from '../constants/theme';
import { TRANSLATIONS, Language } from '../constants/translations';
import { fetchExpenses, deleteExpense, ExpenseItem } from '../services/api';

interface TransactionsScreenProps {
  userId: string;
  language: Language;
  onOpenLogModal: () => void;
  onDataChanged: () => void;
}

const CATEGORIES = [
  { key: 'All', en: 'All', bn: 'সব' },
  { key: 'Food', en: 'Food', bn: 'খাবার' },
  { key: 'Transport', en: 'Transport', bn: 'যাতায়াত' },
  { key: 'Rent', en: 'Rent/Bills', bn: 'মেস/বিল' },
  { key: 'Entertainment', en: 'Shopping', bn: 'শপিং/আড্ডা' },
  { key: 'Academic', en: 'Academic', bn: 'বই/পড়া' },
  { key: 'Bills', en: 'Utilities', bn: 'রিচার্জ' },
  { key: 'Borrowing', en: 'Borrowing', bn: 'ধার' },
];

export const TransactionsScreen: React.FC<TransactionsScreenProps> = ({
  userId,
  language,
  onOpenLogModal,
  onDataChanged,
}) => {
  const [selectedCategory, setSelectedCategory] = useState('All');
  const [expenses, setExpenses] = useState<ExpenseItem[]>([]);
  const [loading, setLoading] = useState(false);
  const [deletingId, setDeletingId] = useState<string | null>(null);

  const t = TRANSLATIONS[language];

  const loadExpenses = async () => {
    setLoading(true);
    try {
      const data = await fetchExpenses(userId, selectedCategory);
      setExpenses(data);
    } catch (e) {
      // Handle error
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadExpenses();
  }, [userId, selectedCategory]);

  const handleDelete = (id: string) => {
    const doDelete = async () => {
      setDeletingId(id);
      try {
        await deleteExpense(id, userId);
        setExpenses((prev) => prev.filter((item) => item.id !== id));
        onDataChanged();
      } catch (e) {
        if (Platform.OS === 'web' && typeof window !== 'undefined') {
          window.alert('Failed to delete transaction.');
        } else {
          Alert.alert('Error', 'Failed to delete transaction.');
        }
      } finally {
        setDeletingId(null);
      }
    };

    if (Platform.OS === 'web') {
      const confirmed = typeof window !== 'undefined'
        ? window.confirm(`${t.deleteExpenseConfirm}\n\n${t.deleteExpenseMessage}`)
        : true;
      if (confirmed) {
        doDelete();
      }
      return;
    }

    Alert.alert(
      t.deleteExpenseConfirm,
      t.deleteExpenseMessage,
      [
        { text: t.cancel, style: 'cancel' },
        {
          text: t.delete,
          style: 'destructive',
          onPress: doDelete,
        },
      ]
    );
  };

  const totalFiltered = expenses.reduce((sum, item) => sum + item.amount, 0);
  const insets = useSafeAreaInsets();
  const statusBarPad = Math.max(insets.top, Platform.OS === 'android' ? (StatusBar.currentHeight || 36) : 44) + 8;

  return (
    <View style={styles.container}>
      {/* Top Fixed Header */}
      <View style={[styles.topHeader, { paddingTop: statusBarPad }]}>
        <View style={styles.titleRow}>
          <Text style={styles.screenTitle}>{t.tabExpenses}</Text>
          <TouchableOpacity style={styles.logBtn} onPress={onOpenLogModal}>
            <Text style={styles.logBtnText}>{t.logExpenseBtn}</Text>
          </TouchableOpacity>
        </View>

        {/* Spend Counter */}
        <View style={styles.totalBox}>
          <Text style={styles.totalLabel}>
            {selectedCategory === 'All'
              ? (language === 'bn' ? 'চলতি মাসের মোট খরচ' : 'Total Month Spend')
              : `${selectedCategory} ${language === 'bn' ? 'মোট খরচ' : 'Spend'}`}
          </Text>
          <Text style={styles.totalAmount}>৳{totalFiltered}</Text>
        </View>

        {/* Horizontal Category Filters */}
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.filterScroll}
        >
          {CATEGORIES.map((cat) => {
            const isSelected = selectedCategory === cat.key;
            return (
              <TouchableOpacity
                key={cat.key}
                style={[styles.filterChip, isSelected && styles.filterChipActive]}
                onPress={() => setSelectedCategory(cat.key)}
              >
                <Text
                  style={[styles.filterText, isSelected && styles.filterTextActive]}
                >
                  {language === 'bn' ? cat.bn : cat.en}
                </Text>
              </TouchableOpacity>
            );
          })}
        </ScrollView>
      </View>

      {/* Transaction List */}
      <ScrollView
        contentContainerStyle={styles.listContent}
        showsVerticalScrollIndicator={false}
      >
        {loading ? (
          <View style={styles.loadingBox}>
            <ActivityIndicator color={THEME.colors.primaryLight} />
          </View>
        ) : expenses.length === 0 ? (
          <View style={styles.emptyBox}>
            <Text style={styles.emptyTitle}>{t.noExpensesYet}</Text>
            <TouchableOpacity style={styles.emptyBtn} onPress={onOpenLogModal}>
              <Text style={styles.emptyBtnText}>{t.logExpenseBtn}</Text>
            </TouchableOpacity>
          </View>
        ) : (
          expenses.map((item) => (
            <View key={item.id} style={styles.card}>
              <View style={styles.cardLeft}>
                <View style={styles.catBadge}>
                  <Text style={styles.catBadgeText}>{item.category}</Text>
                </View>
                <Text style={styles.cardNote}>{item.note || item.category}</Text>
                <Text style={styles.cardDate}>{item.date}</Text>
              </View>

              <View style={styles.cardRight}>
                <Text style={styles.cardAmount}>-৳{item.amount}</Text>
                <View style={styles.badgeRow}>
                  <View style={styles.pmBadge}>
                    <Text style={styles.pmText}>{item.payment_method}</Text>
                  </View>
                  <TouchableOpacity
                    style={styles.deleteBtn}
                    onPress={() => handleDelete(item.id)}
                    disabled={deletingId === item.id}
                  >
                    {deletingId === item.id ? (
                      <ActivityIndicator size="small" color={THEME.colors.riskHigh} />
                    ) : (
                      <Text style={styles.deleteText}>✕</Text>
                    )}
                  </TouchableOpacity>
                </View>
              </View>
            </View>
          ))
        )}
      </ScrollView>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: THEME.colors.background,
  },
  topHeader: {
    backgroundColor: THEME.colors.surface,
    borderBottomWidth: 1,
    borderBottomColor: THEME.colors.border,
    paddingHorizontal: THEME.spacing.lg,
    paddingBottom: THEME.spacing.md,
  },
  titleRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: THEME.spacing.md,
  },
  screenTitle: {
    ...THEME.typography.h1,
    color: THEME.colors.textPrimary,
  },
  logBtn: {
    backgroundColor: THEME.colors.primary,
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: THEME.radius.sm,
  },
  logBtnText: {
    ...THEME.typography.caption,
    color: '#FFFFFF',
    fontWeight: '700',
  },
  totalBox: {
    backgroundColor: THEME.colors.surfaceSubtle,
    borderRadius: THEME.radius.md,
    padding: THEME.spacing.md,
    borderWidth: 1,
    borderColor: THEME.colors.border,
    marginBottom: THEME.spacing.md,
  },
  totalLabel: {
    ...THEME.typography.caption,
    color: THEME.colors.textMuted,
    marginBottom: 2,
  },
  totalAmount: {
    ...THEME.typography.h1,
    color: THEME.colors.primaryLight,
    fontWeight: '800',
  },
  filterScroll: {
    gap: 8,
  },
  filterChip: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: THEME.radius.full,
    backgroundColor: THEME.colors.surfaceSubtle,
    borderWidth: 1,
    borderColor: THEME.colors.border,
  },
  filterChipActive: {
    backgroundColor: THEME.colors.primarySubtle,
    borderColor: THEME.colors.primary,
  },
  filterText: {
    ...THEME.typography.caption,
    color: THEME.colors.textSecondary,
    fontWeight: '600',
  },
  filterTextActive: {
    color: THEME.colors.primaryLight,
    fontWeight: '700',
  },
  listContent: {
    padding: THEME.spacing.lg,
    paddingBottom: 80,
  },
  loadingBox: {
    paddingVertical: 40,
    alignItems: 'center',
  },
  emptyBox: {
    paddingVertical: 60,
    alignItems: 'center',
  },
  emptyTitle: {
    ...THEME.typography.body,
    color: THEME.colors.textMuted,
    marginBottom: THEME.spacing.md,
  },
  emptyBtn: {
    backgroundColor: THEME.colors.surfaceElevated,
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: THEME.radius.sm,
    borderWidth: 1,
    borderColor: THEME.colors.borderMedium,
  },
  emptyBtnText: {
    ...THEME.typography.button,
    color: THEME.colors.primaryLight,
  },
  card: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    backgroundColor: THEME.colors.surface,
    borderRadius: THEME.radius.md,
    padding: THEME.spacing.md,
    borderWidth: 1,
    borderColor: THEME.colors.border,
    marginBottom: THEME.spacing.sm,
  },
  cardLeft: {
    flex: 1,
    marginRight: 10,
  },
  catBadge: {
    alignSelf: 'flex-start',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
    backgroundColor: THEME.colors.surfaceSubtle,
    marginBottom: 4,
  },
  catBadgeText: {
    ...THEME.typography.caption,
    fontSize: 10,
    color: THEME.colors.textSecondary,
    fontWeight: '700',
  },
  cardNote: {
    ...THEME.typography.bodySmall,
    color: THEME.colors.textPrimary,
    fontWeight: '600',
  },
  cardDate: {
    ...THEME.typography.caption,
    color: THEME.colors.textMuted,
    marginTop: 2,
  },
  cardRight: {
    alignItems: 'flex-end',
    justifyContent: 'space-between',
  },
  cardAmount: {
    ...THEME.typography.h3,
    color: THEME.colors.textPrimary,
    fontWeight: '700',
  },
  badgeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginTop: 6,
  },
  pmBadge: {
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
    backgroundColor: THEME.colors.surfaceSubtle,
  },
  pmText: {
    ...THEME.typography.caption,
    fontSize: 10,
    color: THEME.colors.textMuted,
  },
  deleteBtn: {
    width: 24,
    height: 24,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(239, 68, 68, 0.1)',
  },
  deleteText: {
    color: THEME.colors.riskHigh,
    fontSize: 12,
    fontWeight: '700',
  },
});

