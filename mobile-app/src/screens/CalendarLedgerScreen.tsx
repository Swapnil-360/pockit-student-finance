import React, { useState, useEffect, useRef } from 'react';
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
  Dimensions,
  Modal,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useTheme } from '../constants/ThemeContext';
import { TRANSLATIONS, Language } from '../constants/translations';
import { GlassCard } from '../components/GlassCard';
import {
  fetchCalendarLedger,
  getCachedCalendarLedger,
  deleteExpense,
  deleteIncome,
  fetchPeerDebts,
  settlePeerDebt,
  deletePeerDebt,
  CalendarLedgerResponse,
  LedgerTransactionItem,
  PeerDebtItem,
  PeerDebtSummary,
} from '../services/api';
import { PeerDebtModal } from '../components/PeerDebtModal';

interface CalendarLedgerScreenProps {
  userId: string;
  language: Language;
  onOpenExpenseModal: () => void;
  onOpenIncomeModal: () => void;
  onDataChanged: () => void;
  refreshTrigger?: number;
}

export const CalendarLedgerScreen: React.FC<CalendarLedgerScreenProps> = ({
  userId,
  language,
  onOpenExpenseModal,
  onOpenIncomeModal,
  onDataChanged,
  refreshTrigger,
}) => {
  const { isDark, theme } = useTheme();
  const insets = useSafeAreaInsets();
  const [currentYear, setCurrentYear] = useState(new Date().getFullYear());
  const [currentMonthIdx, setCurrentMonthIdx] = useState(new Date().getMonth());
  const [ledgerData, setLedgerData] = useState<CalendarLedgerResponse | null>(null);
  const [loading, setLoading] = useState(false);
  const todayDateStr = `${new Date().getFullYear()}-${String(new Date().getMonth() + 1).padStart(2, '0')}-${String(new Date().getDate()).padStart(2, '0')}`;
  const [selectedDate, setSelectedDate] = useState<string | null>(todayDateStr);
  const [typeFilter, setTypeFilter] = useState<'all' | 'income' | 'expense' | 'debts'>('all');
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [deleteConfirmTx, setDeleteConfirmTx] = useState<LedgerTransactionItem | null>(null);
  const [deleteConfirmDebt, setDeleteConfirmDebt] = useState<PeerDebtItem | null>(null);
  const [debtModalVisible, setDebtModalVisible] = useState(false);
  const [debtsSummary, setDebtsSummary] = useState<PeerDebtSummary | null>(null);
  const [debtsLoading, setDebtsLoading] = useState(false);
  const [settlingDebtId, setSettlingDebtId] = useState<string | null>(null);

  const dateStripScrollRef = useRef<any>(null);
  const [viewportWidth, setViewportWidth] = useState<number>(Dimensions.get('window').width);
  const t = TRANSLATIONS[language];
  const statusBarPad = Math.max(insets.top, Platform.OS === 'android' ? (StatusBar.currentHeight || 36) : 44) + 8;

  const monthString = `${currentYear}-${String(currentMonthIdx + 1).padStart(2, '0')}`;

  const scrollToDate = (dayNum: number, animated = true) => {
    if (dayNum < 1 || !dateStripScrollRef.current) return;
    const itemWidth = 52;
    const itemGap = 8;
    const paddingLeft = 16;
    const itemCenter = paddingLeft + (dayNum - 1) * (itemWidth + itemGap) + itemWidth / 2;
    const targetScrollX = Math.max(0, itemCenter - viewportWidth / 2);

    requestAnimationFrame(() => {
      try {
        if (Platform.OS === 'web') {
          const node = dateStripScrollRef.current?.getScrollableNode?.() || dateStripScrollRef.current;
          if (node) {
            if (typeof node.scrollTo === 'function') {
              node.scrollTo({ left: targetScrollX, behavior: animated ? 'smooth' : 'auto' });
            } else if ('scrollLeft' in node) {
              node.scrollLeft = targetScrollX;
            }
          }
        }
        dateStripScrollRef.current?.scrollTo({ x: targetScrollX, animated });
      } catch (e) {
        try {
          dateStripScrollRef.current?.scrollTo({ x: targetScrollX, animated });
        } catch {}
      }
    });
  };

  // Auto-scroll calendar strip to the active selected date (centered in the viewport)
  useEffect(() => {
    const today = new Date();
    const isCurrentMonth = today.getFullYear() === currentYear && today.getMonth() === currentMonthIdx;

    let targetDay = 1;
    if (selectedDate && selectedDate.startsWith(monthString)) {
      const parsedDay = parseInt(selectedDate.split('-')[2], 10);
      if (!isNaN(parsedDay)) {
        targetDay = parsedDay;
      }
    } else if (isCurrentMonth) {
      targetDay = today.getDate();
    }

    const t1 = setTimeout(() => scrollToDate(targetDay, false), 80);
    const t2 = setTimeout(() => scrollToDate(targetDay, true), 220);
    const t3 = setTimeout(() => scrollToDate(targetDay, true), 450);

    return () => {
      clearTimeout(t1);
      clearTimeout(t2);
      clearTimeout(t3);
    };
  }, [currentYear, currentMonthIdx, selectedDate, viewportWidth]);

  const monthNamesEn = [
    'January', 'February', 'March', 'April', 'May', 'June',
    'July', 'August', 'September', 'October', 'November', 'December'
  ];
  const monthNamesBn = [
    'জানুয়ারি', 'ফেব্রুয়ারি', 'মার্চ', 'এপ্রিল', 'মে', 'জুন',
    'জুলাই', 'আগস্ট', 'সেপ্টেম্বর', 'অক্টোবর', 'নভেম্বর', 'ডিসেম্বর'
  ];

  const currentMonthLabel = language === 'bn'
    ? `${monthNamesBn[currentMonthIdx]} ${currentYear}`
    : `${monthNamesEn[currentMonthIdx]} ${currentYear}`;

  const loadLedger = async () => {
    const cached = await getCachedCalendarLedger(userId, monthString);
    if (cached) {
      setLedgerData(cached);
      setLoading(false);
    } else {
      setLoading(true);
    }
    try {
      const data = await fetchCalendarLedger(userId, monthString);
      setLedgerData(data);
    } catch (e) {
      // Offline fallback already loaded from cache
    } finally {
      setLoading(false);
    }
  };

  const loadDebts = async () => {
    setDebtsLoading(true);
    try {
      const data = await fetchPeerDebts(userId);
      setDebtsSummary(data);
    } catch (e) {
      // Offline fallback
    } finally {
      setDebtsLoading(false);
    }
  };

  useEffect(() => {
    loadLedger();
    loadDebts();
  }, [userId, monthString, refreshTrigger]);

  const handleSettleDebt = async (debt: PeerDebtItem) => {
    try {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    } catch {}

    const confirmTitle = language === 'bn' ? 'ধার পরিশোধ নিশ্চিতকরণ' : 'Confirm Settlement';
    const confirmMsg =
      debt.type === 'owed_to_me'
        ? language === 'bn'
          ? `${debt.person_name} থেকে ৳${debt.amount} কি বুঝে পেয়েছেন? এটি আপনার চলতি ব্যালেন্সে আয় হিসেবে যোগ হবে।`
          : `Did you receive ৳${debt.amount} from ${debt.person_name}? This will be recorded as income.`
        : language === 'bn'
        ? `${debt.person_name}-কে ৳${debt.amount} কি পরিশোধ করেছেন?`
        : `Did you pay ৳${debt.amount} to ${debt.person_name}?`;

    const doSettle = async () => {
      setSettlingDebtId(debt.id);
      try {
        await settlePeerDebt(debt.id, userId);
        await Promise.all([loadDebts(), loadLedger()]);
        onDataChanged();
      } catch (e: any) {
        if (Platform.OS === 'web' && typeof window !== 'undefined') {
          window.alert(e.message || 'Failed to settle debt');
        } else {
          Alert.alert('Error', e.message || 'Failed to settle debt');
        }
      } finally {
        setSettlingDebtId(null);
      }
    };

    if (Platform.OS === 'web') {
      const confirmed = typeof window !== 'undefined'
        ? window.confirm(`${confirmTitle}\n\n${confirmMsg}`)
        : true;
      if (confirmed) {
        doSettle();
      }
      return;
    }

    Alert.alert(
      confirmTitle,
      confirmMsg,
      [
        { text: t.cancel, style: 'cancel' },
        {
          text: language === 'bn' ? 'হ্যাঁ, পরিশোধিত' : 'Yes, Settled',
          onPress: doSettle,
        },
      ]
    );
  };

  const handleDeleteDebt = (debt: PeerDebtItem) => {
    try {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning);
    } catch {}
    setDeleteConfirmDebt(debt);
  };

  const executeDeleteDebt = async (debt: PeerDebtItem) => {
    setDeleteConfirmDebt(null);
    try {
      await deletePeerDebt(debt.id, userId);
      await loadDebts();
    } catch (e: any) {
      if (Platform.OS === 'web' && typeof window !== 'undefined') {
        window.alert(e.message || 'Failed to delete record');
      } else {
        Alert.alert('Error', e.message || 'Failed to delete record');
      }
    }
  };

  const handlePrevMonth = () => {
    try {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    } catch {}
    if (currentMonthIdx === 0) {
      setCurrentMonthIdx(11);
      setCurrentYear((y) => y - 1);
    } else {
      setCurrentMonthIdx((m) => m - 1);
    }
    setSelectedDate(null);
  };

  const handleNextMonth = () => {
    try {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    } catch {}
    if (currentMonthIdx === 11) {
      setCurrentMonthIdx(0);
      setCurrentYear((y) => y + 1);
    } else {
      setCurrentMonthIdx((m) => m + 1);
    }
    setSelectedDate(null);
  };

  const handleDelete = (tx: LedgerTransactionItem) => {
    try {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning);
    } catch {}
    setDeleteConfirmTx(tx);
  };

  const executeDeleteTx = async (tx: LedgerTransactionItem) => {
    setDeleteConfirmTx(null);
    setDeletingId(tx.id);

    // 1. Optimistic removal for instantaneous UI response across Web & Mobile
    const prevLedger = ledgerData;
    if (ledgerData) {
      const remainingTx = ledgerData.transactions.filter((t) => t.id !== tx.id);
      const inc = remainingTx.filter((t) => t.type === 'income').reduce((s, t) => s + t.amount, 0);
      const exp = remainingTx.filter((t) => t.type === 'expense').reduce((s, t) => s + t.amount, 0);
      setLedgerData({
        ...ledgerData,
        transactions: remainingTx,
        total_income: inc,
        total_expense: exp,
        net_balance: inc - exp,
      });
    }

    try {
      if (tx.type === 'income') {
        await deleteIncome(tx.id, userId);
      } else {
        await deleteExpense(tx.id, userId);
      }
      await loadLedger();
      onDataChanged();
    } catch (e: any) {
      // Revert optimistic removal if network fails
      if (prevLedger) setLedgerData(prevLedger);
      if (Platform.OS === 'web' && typeof window !== 'undefined') {
        window.alert(e.message || 'Failed to delete transaction');
      } else {
        Alert.alert('Error', e.message || 'Failed to delete transaction');
      }
    } finally {
      setDeletingId(null);
    }
  };

  const getCategoryIcon = (category: string): keyof typeof Ionicons.glyphMap => {
    switch (category.toLowerCase()) {
      case 'food':
        return 'fast-food-outline';
      case 'transport':
        return 'bus-outline';
      case 'rent':
      case 'rent/bills':
        return 'home-outline';
      case 'academic':
        return 'school-outline';
      case 'shopping':
      case 'entertainment':
        return 'cart-outline';
      case 'bills':
      case 'utilities':
        return 'receipt-outline';
      case 'borrowing':
        return 'cash-outline';
      case 'family':
        return 'people-outline';
      case 'tuition-job':
        return 'briefcase-outline';
      case 'freelancing':
        return 'laptop-outline';
      case 'scholarship':
        return 'ribbon-outline';
      default:
        return 'wallet-outline';
    }
  };

  // Generate days in month for 7-day horizontal strip
  const daysInMonth = new Date(currentYear, currentMonthIdx + 1, 0).getDate();
  const dayNamesShortEn = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
  const dayNamesShortBn = ['রবি', 'সোম', 'মঙ্গল', 'বুধ', 'বৃহঃ', 'শুক্র', 'শনি'];

  const daysList = Array.from({ length: daysInMonth }).map((_, idx) => {
    const dayNum = idx + 1;
    const dateObj = new Date(currentYear, currentMonthIdx, dayNum);
    const dateStr = `${monthString}-${String(dayNum).padStart(2, '0')}`;
    const dayOfWeek = dateObj.getDay();
    const dayName = language === 'bn' ? dayNamesShortBn[dayOfWeek] : dayNamesShortEn[dayOfWeek];

    // Check if day has transactions
    const dayStats = ledgerData?.calendar_days?.find((d) => d.date === dateStr);
    return {
      dayNum,
      dateStr,
      dayName,
      hasIncome: Boolean(dayStats?.income && dayStats.income > 0),
      hasExpense: Boolean(dayStats?.expense && dayStats.expense > 0),
    };
  });

  // Filter transactions
  let filteredTx = ledgerData?.transactions || [];
  if (selectedDate) {
    filteredTx = filteredTx.filter((tx) => tx.date === selectedDate);
  }
  if (typeFilter !== 'all') {
    filteredTx = filteredTx.filter((tx) => tx.type === typeFilter);
  }

  return (
    <View style={[styles.container, { backgroundColor: theme.canvas }]}>
      {/* 1. Curved Dusty Slate-Blue Header Block */}
      <View
        style={[
          styles.curvedHeaderBlock,
          {
            backgroundColor: theme.headerBlock,
            paddingTop: 12,
          },
        ]}
      >
        {/* Month Switcher Row */}
        <View style={styles.monthSwitcherRow}>
          <TouchableOpacity
            style={styles.chevronBtn}
            onPress={handlePrevMonth}
            activeOpacity={0.7}
          >
            <Ionicons name="chevron-back" size={20} color="#FFFFFF" />
          </TouchableOpacity>

          <View style={styles.monthTitleCol}>
            <Text style={styles.monthTitleText}>{currentMonthLabel}</Text>
            <Text style={styles.monthSubText}>
              {language === 'bn' ? 'দৈনিক নগদ প্রবাহ পর্যবেক্ষণ' : 'Daily Cashflow Tracker'}
            </Text>
          </View>

          <TouchableOpacity
            style={styles.chevronBtn}
            onPress={handleNextMonth}
            activeOpacity={0.7}
          >
            <Ionicons name="chevron-forward" size={20} color="#FFFFFF" />
          </TouchableOpacity>
        </View>

        {/* 7-Day Horizontal Date Strip (Horizontally Scrollable across month) */}
        <View
          style={{ width: '100%' }}
          onLayout={(e) => {
            const w = e.nativeEvent.layout.width;
            if (w > 0 && Math.abs(w - viewportWidth) > 5) {
              setViewportWidth(w);
            }
          }}
        >
          <ScrollView
            ref={dateStripScrollRef}
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={styles.dateStripContent}
            onContentSizeChange={() => {
              const today = new Date();
              const isCurrentMonth = today.getFullYear() === currentYear && today.getMonth() === currentMonthIdx;
              const target = selectedDate && selectedDate.startsWith(monthString)
                ? parseInt(selectedDate.split('-')[2], 10)
                : (isCurrentMonth ? today.getDate() : 1);
              if (target && !isNaN(target)) {
                scrollToDate(target, false);
              }
            }}
          >
            {daysList.map((item) => {
              const isSelected = selectedDate === item.dateStr;

              return (
                <TouchableOpacity
                  key={item.dateStr}
                  style={[
                    styles.datePill,
                    isSelected && [
                      styles.datePillSelected,
                      { backgroundColor: theme.surface },
                    ],
                  ]}
                  onPress={() => {
                    try {
                      Haptics.selectionAsync();
                    } catch {}
                    if (isSelected) {
                      setSelectedDate(null);
                    } else {
                      setSelectedDate(item.dateStr);
                      scrollToDate(item.dayNum, true);
                    }
                  }}
                  activeOpacity={0.75}
                >
                  <Text
                    style={[
                      styles.dateDayName,
                      {
                        color: isSelected
                          ? theme.textSecondary
                          : 'rgba(255, 255, 255, 0.75)',
                      },
                    ]}
                  >
                    {item.dayName}
                  </Text>

                  <Text
                    style={[
                      styles.dateDayNumber,
                      {
                        color: isSelected ? theme.textPrimary : '#FFFFFF',
                      },
                    ]}
                  >
                    {item.dayNum}
                  </Text>

                  {/* Selected Terracotta Dot Indicator or Transaction Dot */}
                  <View style={styles.dotContainer}>
                    {isSelected ? (
                      <View style={[styles.terracottaDot, { backgroundColor: theme.primary }]} />
                    ) : item.hasIncome || item.hasExpense ? (
                      <View
                        style={[
                          styles.indicatorDot,
                          {
                            backgroundColor: item.hasIncome ? '#10B981' : theme.primary,
                          },
                        ]}
                      />
                    ) : null}
                  </View>
                </TouchableOpacity>
              );
            })}
          </ScrollView>
        </View>

        {/* Monthly Inflow / Outflow Summary Bar */}
        <View style={styles.summaryBarRow}>
          <View style={styles.summaryTile}>
            <Text style={styles.summaryTileLabel}>
              {language === 'bn' ? 'মোট আয়' : 'Total Inflow'}
            </Text>
            <Text style={[styles.summaryTileAmount, { color: '#6EE7B7' }]}>
              +৳{ledgerData?.total_income || 0}
            </Text>
          </View>

          <View style={styles.summaryDivider} />

          <View style={styles.summaryTile}>
            <Text style={styles.summaryTileLabel}>
              {language === 'bn' ? 'মোট ব্যয়' : 'Total Outflow'}
            </Text>
            <Text style={[styles.summaryTileAmount, { color: '#FCA5A5' }]}>
              -৳{ledgerData?.total_expense || 0}
            </Text>
          </View>

          <View style={styles.summaryDivider} />

          <View style={styles.summaryTile}>
            <Text style={styles.summaryTileLabel}>
              {language === 'bn' ? 'ব্যালেন্স' : 'Net Cashflow'}
            </Text>
            <Text
              style={[
                styles.summaryTileAmount,
                {
                  color: (ledgerData?.net_balance || 0) < 0 ? '#FCA5A5' : '#93C5FD',
                },
              ]}
            >
              ৳{ledgerData?.net_balance || 0}
            </Text>
          </View>
        </View>
      </View>

      {/* 2. Bottom Sliding Sheet & Transaction Cards */}
      <ScrollView
        contentContainerStyle={[
          styles.sheetScrollContent,
          { paddingBottom: 140 + insets.bottom },
        ]}
        showsVerticalScrollIndicator={false}
      >
        {/* Centered Active Tracking Date Header / Filter Bar */}
        <View style={styles.trackingDateCenterRow}>
          <View
            style={[
              styles.trackingDateBadge,
              {
                backgroundColor: selectedDate
                  ? isDark ? 'rgba(235, 94, 40, 0.14)' : '#FDF0EC'
                  : isDark ? 'rgba(255, 255, 255, 0.05)' : '#EDF2F7',
                borderColor: selectedDate
                  ? isDark ? 'rgba(235, 94, 40, 0.35)' : '#FCDCD3'
                  : isDark ? 'rgba(255, 255, 255, 0.08)' : '#E2E8F0',
              },
            ]}
          >
            <Ionicons
              name={selectedDate ? "calendar" : "calendar-outline"}
              size={13}
              color={selectedDate ? theme.primary : theme.textSecondary}
              style={{ marginRight: 6 }}
            />
            <Text
              style={[
                styles.trackingDateText,
                { color: selectedDate ? theme.primary : theme.textSecondary },
              ]}
            >
              {selectedDate
                ? `${language === 'bn' ? 'তারিখের হিসাব: ' : 'Tracking Date: '}${selectedDate}`
                : language === 'bn'
                ? 'সম্পূর্ণ মাসের হিসাব'
                : 'Viewing Entire Month'}
            </Text>
            {selectedDate ? (
              <TouchableOpacity
                onPress={() => {
                  try {
                    Haptics.selectionAsync();
                  } catch {}
                  setSelectedDate(null);
                }}
                hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                style={styles.clearDateIconHit}
                activeOpacity={0.7}
              >
                <Ionicons name="close-circle" size={15} color={theme.primary} />
              </TouchableOpacity>
            ) : null}
          </View>
        </View>

        {/* Centered Filter Pills Bar ('All', 'Income', 'Expense', 'Debts') */}
        <View style={styles.filterRowCentered}>
          <View style={[styles.filterBar, { backgroundColor: theme.surface, borderColor: theme.border }]}>
            {(['all', 'income', 'expense', 'debts'] as const).map((filterKey) => {
              const isActive = typeFilter === filterKey;
              const label =
                filterKey === 'all'
                  ? t.filterAll
                  : filterKey === 'income'
                  ? language === 'bn'
                    ? 'আয়'
                    : 'Income'
                  : filterKey === 'expense'
                  ? language === 'bn'
                    ? 'ব্যয়'
                    : 'Expense'
                  : language === 'bn'
                  ? 'দেনা-পাওনা'
                  : 'Debts';

              return (
                <TouchableOpacity
                  key={filterKey}
                  style={[
                    styles.filterPillBtn,
                    isActive && [styles.filterPillBtnActive, { backgroundColor: theme.primary }],
                  ]}
                  onPress={() => {
                    try {
                      Haptics.selectionAsync();
                    } catch {}
                    setTypeFilter(filterKey);
                  }}
                  activeOpacity={0.7}
                >
                  <Text
                    style={[
                      styles.filterPillText,
                      { color: isActive ? '#FFFFFF' : theme.textSecondary },
                      isActive && styles.filterPillTextActive,
                    ]}
                  >
                    {label}
                  </Text>
                </TouchableOpacity>
              );
            })}
          </View>
        </View>

        {/* Content View: Either Peer Debts Ledger OR Standard Income/Expense Transactions */}
        {typeFilter === 'debts' ? (
          <View style={styles.debtViewContainer}>
            {/* 1. Owed Summary Row */}
            <View style={styles.debtSummaryRow}>
              {/* Owed To Me */}
              <View
                style={[
                  styles.debtSummaryCard,
                  {
                    backgroundColor: isDark ? 'rgba(16, 185, 129, 0.12)' : '#E6F9F0',
                    borderColor: isDark ? 'rgba(16, 185, 129, 0.25)' : '#A7F3D0',
                  },
                ]}
              >
                <View style={styles.debtSummaryCardTop}>
                  <Ionicons name="arrow-down-circle" size={16} color="#059669" />
                  <Text style={[styles.debtSummaryCardLabel, { color: '#047857' }]}>
                    {language === 'bn' ? 'আমি পাবো (পাওনা)' : 'Owed to Me'}
                  </Text>
                </View>
                <Text style={[styles.debtSummaryCardAmount, { color: '#047857' }]}>
                  +৳{debtsSummary?.total_owed_to_me || 0}
                </Text>
                <Text style={[styles.debtSummaryCardSub, { color: isDark ? '#A7F3D0' : '#065F46' }]}>
                  {language === 'bn' ? 'বন্ধুরা আপনাকে দেবে' : 'Campus receivables'}
                </Text>
              </View>

              {/* I Owe */}
              <View
                style={[
                  styles.debtSummaryCard,
                  {
                    backgroundColor: isDark ? 'rgba(235, 94, 40, 0.12)' : '#FDF0EC',
                    borderColor: isDark ? 'rgba(235, 94, 40, 0.25)' : '#FCDCD3',
                  },
                ]}
              >
                <View style={styles.debtSummaryCardTop}>
                  <Ionicons name="arrow-up-circle" size={16} color={theme.primary} />
                  <Text style={[styles.debtSummaryCardLabel, { color: theme.primary }]}>
                    {language === 'bn' ? 'আমি দেবো (দেনা)' : 'I Owe'}
                  </Text>
                </View>
                <Text style={[styles.debtSummaryCardAmount, { color: theme.primary }]}>
                  -৳{debtsSummary?.total_i_owe || 0}
                </Text>
                <Text style={[styles.debtSummaryCardSub, { color: isDark ? '#FCA5A5' : '#991B1B' }]}>
                  {language === 'bn' ? 'আপনাকে পরিশোধ করতে হবে' : 'Pending payables'}
                </Text>
              </View>
            </View>

            {/* 2. + Add Debt CTA Button */}
            <TouchableOpacity
              style={[
                styles.addDebtCtaBtn,
                {
                  backgroundColor: isDark ? 'rgba(235, 94, 40, 0.16)' : '#FFF7F4',
                  borderColor: theme.primary,
                },
              ]}
              onPress={() => {
                try {
                  Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
                } catch {}
                setDebtModalVisible(true);
              }}
              activeOpacity={0.8}
            >
              <Ionicons name="person-add-outline" size={18} color={theme.primary} />
              <Text style={[styles.addDebtCtaText, { color: theme.primary }]}>
                {language === 'bn' ? '+ নতুন ধার / দেনা যোগ করুন' : '+ Add Peer Debt / Loan'}
              </Text>
            </TouchableOpacity>

            {/* 3. Debts List */}
            {debtsLoading ? (
              <View style={styles.loadingBox}>
                <ActivityIndicator color={theme.primary} size="large" />
                <Text style={[styles.loadingText, { color: theme.textSecondary }]}>
                  {language === 'bn' ? 'দেনা-পাওনার হিসাব লোড হচ্ছে...' : 'Loading peer debts...'}
                </Text>
              </View>
            ) : !debtsSummary?.debts || debtsSummary.debts.length === 0 ? (
              <GlassCard style={styles.emptyCard}>
                <View style={styles.emptyCardInner}>
                  <View style={[styles.emptyIconBadge, { backgroundColor: isDark ? 'rgba(255, 255, 255, 0.06)' : '#EAF2F8' }]}>
                    <Ionicons name="people-outline" size={26} color={theme.textMuted} />
                  </View>
                  <Text style={[styles.emptyTitle, { color: theme.textPrimary }]}>
                    {language === 'bn' ? 'কোন দেনা-পাওনা নেই' : 'No Peer Debts'}
                  </Text>
                  <Text style={[styles.emptySubtitle, { color: theme.textSecondary }]}>
                    {language === 'bn'
                      ? 'ক্যাম্পাস বন্ধুদের সাথে ধার নেওয়া বা দেওয়ার হিসাব রাখুন নিমিষেই।'
                      : 'Track lending and borrowing with campus peers with zero awkwardness.'}
                  </Text>
                </View>
              </GlassCard>
            ) : (
              <View style={styles.txCardsContainer}>
                {/* Active Unsettled Debts */}
                {debtsSummary.debts.filter((d: PeerDebtItem) => !d.is_settled).length > 0 && (
                  <View style={{ marginBottom: 4 }}>
                    <Text style={[styles.debtSectionHeader, { color: theme.textSecondary }]}>
                      {language === 'bn' ? 'চলতি বকেয়া' : 'Active Debts'} (
                      {debtsSummary.debts.filter((d: PeerDebtItem) => !d.is_settled).length})
                    </Text>
                  </View>
                )}

                {debtsSummary.debts
                  .filter((d: PeerDebtItem) => !d.is_settled)
                  .map((debt: PeerDebtItem) => {
                    const isOwedToMe = debt.type === 'owed_to_me';
                    const isSettling = settlingDebtId === debt.id;

                    return (
                      <GlassCard key={debt.id} style={styles.txCard}>
                        <View style={styles.txCardRow}>
                          {/* Direction Icon */}
                          <View
                            style={[
                              styles.iconCircle,
                              {
                                backgroundColor: isOwedToMe
                                  ? isDark
                                    ? 'rgba(16, 185, 129, 0.16)'
                                    : '#E6F9F0'
                                  : isDark
                                  ? 'rgba(235, 94, 40, 0.16)'
                                  : '#FDF0EC',
                              },
                            ]}
                          >
                            <Ionicons
                              name={isOwedToMe ? 'arrow-down-circle' : 'arrow-up-circle'}
                              size={22}
                              color={isOwedToMe ? '#059669' : theme.primary}
                            />
                          </View>

                          {/* Meta Column */}
                          <View style={styles.metaCol}>
                            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                              <Text style={[styles.txTitle, { color: theme.textPrimary }]}>
                                {debt.person_name}
                              </Text>
                              <View
                                style={[
                                  styles.pmBadge,
                                  {
                                    backgroundColor: isOwedToMe
                                      ? isDark
                                        ? 'rgba(16, 185, 129, 0.2)'
                                        : '#D1FAE5'
                                      : isDark
                                      ? 'rgba(235, 94, 40, 0.2)'
                                      : '#FEE2E2',
                                  },
                                ]}
                              >
                                <Text
                                  style={[
                                    styles.pmBadgeText,
                                    { color: isOwedToMe ? '#047857' : theme.primary },
                                  ]}
                                >
                                  {language === 'bn'
                                    ? isOwedToMe
                                      ? 'আমি পাবো'
                                      : 'আমি দেবো'
                                    : isOwedToMe
                                    ? 'Owed to Me'
                                    : 'I Owe'}
                                </Text>
                              </View>
                            </View>

                            {debt.note ? (
                              <Text style={[styles.txNote, { color: theme.textSecondary }]} numberOfLines={1}>
                                {debt.note}
                              </Text>
                            ) : null}

                            <Text style={[styles.txDate, { color: theme.textMuted, marginTop: 4 }]}>
                              {debt.due_date
                                ? `${language === 'bn' ? 'পরিশোধের তারিখ: ' : 'Due: '}${debt.due_date}`
                                : debt.created_at?.split('T')[0] || ''}
                            </Text>
                          </View>

                          {/* Right Column: Amount + 1-Tap Settle */}
                          <View style={styles.rightCol}>
                            <Text
                              style={[
                                styles.amountText,
                                { color: isOwedToMe ? '#059669' : theme.primary },
                              ]}
                            >
                              {isOwedToMe ? `+৳${debt.amount}` : `-৳${debt.amount}`}
                            </Text>

                            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                              <TouchableOpacity
                                style={[
                                  styles.settleBtn,
                                  {
                                    backgroundColor: isOwedToMe
                                      ? isDark
                                        ? 'rgba(16, 185, 129, 0.25)'
                                        : '#E6F9F0'
                                      : isDark
                                      ? 'rgba(235, 94, 40, 0.25)'
                                      : '#FDF0EC',
                                  },
                                ]}
                                onPress={() => handleSettleDebt(debt)}
                                disabled={isSettling}
                                activeOpacity={0.7}
                              >
                                {isSettling ? (
                                  <ActivityIndicator size="small" color={isOwedToMe ? '#059669' : theme.primary} />
                                ) : (
                                  <>
                                    <Ionicons
                                      name="checkmark-circle-outline"
                                      size={14}
                                      color={isOwedToMe ? '#059669' : theme.primary}
                                    />
                                    <Text
                                      style={[
                                        styles.settleBtnText,
                                        { color: isOwedToMe ? '#059669' : theme.primary },
                                      ]}
                                    >
                                      {language === 'bn' ? 'পরিশোধ' : 'Settle'}
                                    </Text>
                                  </>
                                )}
                              </TouchableOpacity>

                              <TouchableOpacity
                                style={styles.deleteBtn}
                                onPress={() => handleDeleteDebt(debt)}
                                activeOpacity={0.7}
                                hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
                              >
                                <Ionicons name="trash-outline" size={16} color={theme.textMuted} />
                              </TouchableOpacity>
                            </View>
                          </View>
                        </View>
                      </GlassCard>
                    );
                  })}

                {/* Settled History */}
                {debtsSummary.debts.filter((d: PeerDebtItem) => d.is_settled).length > 0 && (
                  <View style={{ marginTop: 12 }}>
                    <Text style={[styles.debtSectionHeader, { color: theme.textMuted }]}>
                      {language === 'bn' ? 'পরিশোধিত হিসাব' : 'Settled History'}
                    </Text>
                    {debtsSummary.debts
                      .filter((d: PeerDebtItem) => d.is_settled)
                      .map((debt: PeerDebtItem) => (
                        <View
                          key={debt.id}
                          style={[
                            styles.settledItemCard,
                            {
                              backgroundColor: isDark ? 'rgba(255, 255, 255, 0.03)' : '#F8FAFC',
                              borderColor: isDark ? 'rgba(255, 255, 255, 0.06)' : '#E2E8F0',
                            },
                          ]}
                        >
                          <Ionicons name="checkmark-done-circle" size={18} color="#10B981" />
                          <View style={{ flex: 1 }}>
                            <Text style={[styles.settledItemName, { color: theme.textSecondary }]}>
                              {debt.person_name}
                            </Text>
                            <Text style={[styles.settledItemSub, { color: theme.textMuted }]}>
                              {debt.type === 'owed_to_me'
                                ? language === 'bn'
                                  ? 'পাওনা আদায় হয়েছে'
                                  : 'Received'
                                : language === 'bn'
                                ? 'দেনা পরিশোধ হয়েছে'
                                : 'Paid back'}
                              {debt.settled_at ? ` • ${debt.settled_at.split('T')[0]}` : ''}
                            </Text>
                          </View>
                          <Text style={[styles.settledItemAmount, { color: theme.textMuted }]}>
                            ৳{debt.amount}
                          </Text>
                        </View>
                      ))}
                  </View>
                )}
              </View>
            )}
          </View>
        ) : (
          /* Transactions List */
          loading ? (
            <View style={styles.loadingBox}>
              <ActivityIndicator color={theme.primary} size="large" />
              <Text style={[styles.loadingText, { color: theme.textSecondary }]}>
                {language === 'bn' ? 'হিসাব লোড হচ্ছে...' : 'Loading transactions...'}
              </Text>
            </View>
          ) : filteredTx.length === 0 ? (
            <GlassCard style={styles.emptyCard}>
              <View style={styles.emptyCardInner}>
                <View style={[styles.emptyIconBadge, { backgroundColor: isDark ? 'rgba(255, 255, 255, 0.06)' : '#EAF2F8' }]}>
                  <Ionicons
                    name="calendar-outline"
                    size={26}
                    color={theme.textMuted}
                  />
                </View>
                <Text style={[styles.emptyTitle, { color: theme.textPrimary }]}>
                  {language === 'bn' ? 'কোন লেনদেন পাওয়া যায়নি' : 'No Transactions Found'}
                </Text>
                <Text style={[styles.emptySubtitle, { color: theme.textSecondary }]}>
                  {selectedDate
                    ? language === 'bn'
                      ? `${selectedDate} তারিখে কোন লেনদেন নেই।`
                      : `No records for ${selectedDate}.`
                    : language === 'bn'
                    ? 'এই মাসে কোন রেকর্ড নেই। নতুন যোগ করতে + চাপুন।'
                    : 'No records for this filter. Tap + to add.'}
                </Text>
              </View>
            </GlassCard>
          ) : (
            <View style={styles.txCardsContainer}>
              {filteredTx.map((tx) => {
                const isIncome = tx.type === 'income';
                const isDeleting = deletingId === tx.id;

                return (
                  <GlassCard key={tx.id} style={styles.txCard}>
                    <View style={styles.txCardRow}>
                      {/* Category Icon */}
                      <View
                        style={[
                          styles.iconCircle,
                          {
                            backgroundColor: isIncome
                              ? isDark
                                ? 'rgba(16, 185, 129, 0.16)'
                                : '#E6F9F0'
                              : theme.terracottaSoft,
                          },
                        ]}
                      >
                        <Ionicons
                          name={getCategoryIcon(tx.category_or_source)}
                          size={20}
                          color={isIncome ? '#047857' : theme.primary}
                        />
                      </View>

                      {/* Meta Text */}
                      <View style={styles.metaCol}>
                        <Text style={[styles.txTitle, { color: theme.textPrimary }]}>
                          {tx.category_or_source}
                        </Text>
                        {tx.note ? (
                          <Text style={[styles.txNote, { color: theme.textSecondary }]} numberOfLines={1}>
                            {tx.note}
                          </Text>
                        ) : null}
                        <View style={styles.tagRow}>
                          <View style={[styles.pmBadge, { backgroundColor: isDark ? '#16191D' : '#E2EBF2' }]}>
                            <Text style={[styles.pmBadgeText, { color: theme.textSecondary }]}>
                              {tx.payment_method}
                            </Text>
                          </View>
                          <Text style={[styles.txDate, { color: theme.textMuted }]}>{tx.date}</Text>
                        </View>
                      </View>

                      {/* Amount & Delete Action */}
                      <View style={styles.rightCol}>
                        <Text
                          style={[
                            styles.amountText,
                            { color: isIncome ? '#047857' : theme.primary },
                          ]}
                        >
                          {isIncome ? `+৳${tx.amount}` : `-৳${tx.amount}`}
                        </Text>

                        <TouchableOpacity
                          style={styles.deleteBtn}
                          onPress={() => handleDelete(tx)}
                          disabled={isDeleting}
                          activeOpacity={0.7}
                          hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
                        >
                          {isDeleting ? (
                            <ActivityIndicator size="small" color={theme.textMuted} />
                          ) : (
                            <Ionicons name="trash-outline" size={16} color={theme.textMuted} />
                          )}
                        </TouchableOpacity>
                      </View>
                    </View>
                  </GlassCard>
                );
              })}
            </View>
          )
        )}
      </ScrollView>

      {/* Peer Debt Creation Modal */}
      <PeerDebtModal
        visible={debtModalVisible}
        onClose={() => setDebtModalVisible(false)}
        userId={userId}
        language={language}
        onSuccess={() => {
          loadDebts();
          loadLedger();
          onDataChanged();
        }}
      />

      {/* In-App Delete Confirmation Modal (Cross-Platform Web & Mobile) */}
      <Modal
        visible={Boolean(deleteConfirmTx || deleteConfirmDebt)}
        transparent
        animationType="fade"
        onRequestClose={() => {
          setDeleteConfirmTx(null);
          setDeleteConfirmDebt(null);
        }}
      >
        <View style={styles.modalBackdrop}>
          <GlassCard style={[styles.confirmCard, { backgroundColor: isDark ? '#1A1D21' : '#FFFFFF', borderColor: isDark ? 'rgba(255,255,255,0.1)' : '#E2EBF2' }]}>
            <View style={[styles.confirmIconCircle, { backgroundColor: isDark ? 'rgba(239, 68, 68, 0.15)' : '#FEE2E2' }]}>
              <Ionicons name="trash-outline" size={24} color="#EF4444" />
            </View>
            <Text style={[styles.confirmTitle, { color: theme.textPrimary }]}>
              {language === 'bn' ? 'রেকর্ডটি মুছে ফেলতে চান?' : 'Delete Record?'}
            </Text>
            <Text style={[styles.confirmSubtitle, { color: theme.textSecondary }]}>
              {deleteConfirmTx
                ? language === 'bn'
                  ? `${deleteConfirmTx.category_or_source} (${deleteConfirmTx.type === 'income' ? '+৳' : '-৳'}${Math.round(deleteConfirmTx.amount)}) এর রেকর্ডটি মুছে ফেলা হবে। আপনার ঝুঁকি স্কোর পুনরায় গণনা করা হবে।`
                  : `Are you sure you want to delete ${deleteConfirmTx.category_or_source} (${deleteConfirmTx.type === 'income' ? '+৳' : '-৳'}${Math.round(deleteConfirmTx.amount)})? Your risk score and safe limit will be recalculated.`
                : language === 'bn'
                ? 'আপনি কি নিশ্চিত এই দেনার হিসাবটি মুছে ফেলতে চান?'
                : 'Are you sure you want to delete this debt record?'}
            </Text>
            <View style={styles.confirmBtnRow}>
              <TouchableOpacity
                style={[styles.confirmCancelBtn, { borderColor: isDark ? 'rgba(255,255,255,0.15)' : '#CBD5E1' }]}
                onPress={() => {
                  setDeleteConfirmTx(null);
                  setDeleteConfirmDebt(null);
                }}
                activeOpacity={0.7}
              >
                <Text style={[styles.confirmCancelText, { color: theme.textPrimary }]}>
                  {language === 'bn' ? 'বাতিল' : 'Cancel'}
                </Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={styles.confirmDeleteBtn}
                onPress={() => {
                  if (deleteConfirmTx) executeDeleteTx(deleteConfirmTx);
                  else if (deleteConfirmDebt) executeDeleteDebt(deleteConfirmDebt);
                }}
                activeOpacity={0.8}
              >
                <Text style={styles.confirmDeleteText}>
                  {language === 'bn' ? 'মুছে ফেলুন' : 'Delete'}
                </Text>
              </TouchableOpacity>
            </View>
          </GlassCard>
        </View>
      </Modal>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  curvedHeaderBlock: {
    borderBottomLeftRadius: 28,
    borderBottomRightRadius: 28,
    paddingHorizontal: 16,
    paddingBottom: 16,
    shadowColor: '#466B85',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.15,
    shadowRadius: 16,
    elevation: 4,
  },
  monthSwitcherRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 16,
  },
  chevronBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: 'rgba(255, 255, 255, 0.15)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  monthTitleCol: {
    alignItems: 'center',
  },
  monthTitleText: {
    fontSize: 18,
    fontWeight: '800',
    color: '#FFFFFF',
    letterSpacing: -0.3,
  },
  monthSubText: {
    fontSize: 11,
    color: 'rgba(255, 255, 255, 0.75)',
    marginTop: 2,
  },
  dateStripContent: {
    paddingVertical: 8,
    paddingHorizontal: 16,
    gap: 8,
  },
  datePill: {
    width: 52,
    height: 72,
    borderRadius: 20,
    backgroundColor: 'rgba(255, 255, 255, 0.12)',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 6,
  },
  datePillSelected: {
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.15,
    shadowRadius: 8,
    elevation: 3,
  },
  dateDayName: {
    fontSize: 11,
    fontWeight: '600',
    marginBottom: 2,
  },
  dateDayNumber: {
    fontSize: 18,
    fontWeight: '800',
    fontVariant: ['tabular-nums'],
  },
  dotContainer: {
    height: 8,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 4,
  },
  terracottaDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
  },
  indicatorDot: {
    width: 5,
    height: 5,
    borderRadius: 2.5,
  },
  summaryBarRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: 'rgba(255, 255, 255, 0.14)',
    borderRadius: 18,
    paddingVertical: 12,
    paddingHorizontal: 16,
    marginTop: 12,
  },
  summaryTile: {
    flex: 1,
    alignItems: 'center',
  },
  summaryTileLabel: {
    fontSize: 10,
    fontWeight: '600',
    color: 'rgba(255, 255, 255, 0.8)',
    marginBottom: 2,
  },
  summaryTileAmount: {
    fontSize: 14,
    fontWeight: '800',
    fontVariant: ['tabular-nums'],
  },
  summaryDivider: {
    width: 1,
    height: 24,
    backgroundColor: 'rgba(255, 255, 255, 0.20)',
  },

  // Bottom Sheet
  sheetScrollContent: {
    paddingHorizontal: 16,
    paddingTop: 16,
  },
  trackingDateCenterRow: {
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 10,
  },
  trackingDateBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 14,
    paddingVertical: 7,
    borderRadius: 20,
    borderWidth: 1,
  },
  trackingDateText: {
    fontSize: 12,
    fontWeight: '600',
    letterSpacing: 0.2,
  },
  clearDateIconHit: {
    marginLeft: 8,
    alignItems: 'center',
    justifyContent: 'center',
  },
  filterRowCentered: {
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 14,
  },
  filterBar: {
    flexDirection: 'row',
    borderRadius: 18,
    padding: 3,
    borderWidth: 1,
    gap: 4,
  },
  filterPillBtn: {
    paddingHorizontal: 16,
    paddingVertical: 7,
    borderRadius: 15,
  },
  filterPillBtnActive: {},
  filterPillText: {
    fontSize: 12,
    fontWeight: '600',
  },
  filterPillTextActive: {
    fontWeight: '700',
  },
  loadingBox: {
    alignItems: 'center',
    paddingVertical: 40,
    gap: 10,
  },
  loadingText: {
    fontSize: 12,
  },
  emptyCard: {
    paddingVertical: 32,
    paddingHorizontal: 20,
    alignItems: 'center',
    justifyContent: 'center',
  },
  emptyCardInner: {
    width: '100%',
    alignItems: 'center',
    justifyContent: 'center',
  },
  emptyIconBadge: {
    width: 56,
    height: 56,
    borderRadius: 28,
    alignItems: 'center',
    justifyContent: 'center',
    alignSelf: 'center',
    marginBottom: 12,
  },
  emptyTitle: {
    fontSize: 15,
    fontWeight: '700',
    textAlign: 'center',
    letterSpacing: -0.2,
    marginBottom: 4,
  },
  emptySubtitle: {
    fontSize: 12,
    lineHeight: 18,
    textAlign: 'center',
    maxWidth: 290,
  },
  txCardsContainer: {
    gap: 10,
  },
  txCard: {
    padding: 14,
  },
  txCardRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  iconCircle: {
    width: 44,
    height: 44,
    borderRadius: 22,
    alignItems: 'center',
    justifyContent: 'center',
  },
  metaCol: {
    flex: 1,
  },
  txTitle: {
    fontSize: 15,
    fontWeight: '700',
  },
  txNote: {
    fontSize: 12,
    marginTop: 1,
  },
  tagRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginTop: 4,
  },
  pmBadge: {
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 6,
  },
  pmBadgeText: {
    fontSize: 10,
    fontWeight: '600',
  },
  txDate: {
    fontSize: 11,
  },
  rightCol: {
    alignItems: 'flex-end',
    gap: 8,
  },
  amountText: {
    fontSize: 16,
    fontWeight: '800',
    fontVariant: ['tabular-nums'],
  },
  deleteBtn: {
    padding: 8,
    minWidth: 34,
    minHeight: 34,
    justifyContent: 'center',
    alignItems: 'center',
    borderRadius: 8,
    cursor: 'pointer' as any,
  },
  modalBackdrop: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.55)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  confirmCard: {
    width: '100%',
    maxWidth: 380,
    borderRadius: 24,
    padding: 24,
    alignItems: 'center',
    borderWidth: 1,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.2,
    shadowRadius: 20,
    elevation: 8,
  },
  confirmIconCircle: {
    width: 52,
    height: 52,
    borderRadius: 26,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 16,
  },
  confirmTitle: {
    fontSize: 18,
    fontWeight: '800',
    marginBottom: 8,
    textAlign: 'center',
  },
  confirmSubtitle: {
    fontSize: 13,
    lineHeight: 19,
    textAlign: 'center',
    marginBottom: 20,
  },
  confirmBtnRow: {
    flexDirection: 'row',
    gap: 12,
    width: '100%',
  },
  confirmCancelBtn: {
    flex: 1,
    paddingVertical: 12,
    borderRadius: 14,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  confirmCancelText: {
    fontSize: 14,
    fontWeight: '700',
  },
  confirmDeleteBtn: {
    flex: 1,
    paddingVertical: 12,
    borderRadius: 14,
    backgroundColor: '#EF4444',
    alignItems: 'center',
    justifyContent: 'center',
  },
  confirmDeleteText: {
    fontSize: 14,
    fontWeight: '800',
    color: '#FFFFFF',
  },
  // Peer Debt Ledger styles
  debtViewContainer: {
    gap: 12,
  },
  debtSummaryRow: {
    flexDirection: 'row',
    gap: 10,
  },
  debtSummaryCard: {
    flex: 1,
    padding: 12,
    borderRadius: 18,
    borderWidth: 1,
  },
  debtSummaryCardTop: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginBottom: 4,
  },
  debtSummaryCardLabel: {
    fontSize: 11,
    fontWeight: '700',
  },
  debtSummaryCardAmount: {
    fontSize: 18,
    fontWeight: '800',
    fontVariant: ['tabular-nums'],
    letterSpacing: -0.3,
  },
  debtSummaryCardSub: {
    fontSize: 10,
    fontWeight: '500',
    marginTop: 2,
    opacity: 0.85,
  },
  addDebtCtaBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 12,
    borderRadius: 16,
    borderWidth: 1.2,
    borderStyle: 'dashed',
    gap: 8,
    marginVertical: 4,
  },
  addDebtCtaText: {
    fontSize: 13,
    fontWeight: '700',
  },
  debtSectionHeader: {
    fontSize: 12,
    fontWeight: '700',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    marginBottom: 8,
    marginLeft: 4,
  },
  settleBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 8,
    gap: 4,
  },
  settleBtnText: {
    fontSize: 10,
    fontWeight: '700',
  },
  settledItemCard: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 12,
    borderRadius: 14,
    borderWidth: 1,
    gap: 10,
    marginBottom: 8,
  },
  settledItemName: {
    fontSize: 13,
    fontWeight: '600',
  },
  settledItemSub: {
    fontSize: 10,
    marginTop: 2,
  },
  settledItemAmount: {
    fontSize: 13,
    fontWeight: '700',
    fontVariant: ['tabular-nums'],
  },
});
