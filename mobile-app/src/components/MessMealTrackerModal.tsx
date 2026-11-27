import React, { useState, useEffect } from 'react';
import {
  Modal,
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  Platform,
  Alert,
  ActivityIndicator,
  TextInput,
  Switch,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import AsyncStorage from '@react-native-async-storage/async-storage';
import * as Haptics from 'expo-haptics';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useTheme } from '../constants/ThemeContext';
import {
  fetchMessSummary,
  logMessMeal,
  updateEstimatedMealRate,
  updateMessTotalMeals,
  updateMessAdvance,
  toggleMessMealSystem,
  MessSummary,
} from '../services/api';

interface MessMealTrackerModalProps {
  visible: boolean;
  onClose: () => void;
  userId: string;
  language: 'en' | 'bn';
  onSuccess?: () => void;
}

export const MessMealTrackerModal: React.FC<MessMealTrackerModalProps> = ({
  visible,
  onClose,
  userId,
  language,
  onSuccess,
}) => {
  const { isDark, theme } = useTheme();
  const insets = useSafeAreaInsets();
  const safeBottom = Math.max(insets.bottom, 16);

  const [loading, setLoading] = useState(false);
  const [summary, setSummary] = useState<MessSummary | null>(null);
  const [selectedCount, setSelectedCount] = useState<number>(1.0);
  const [editRateMode, setEditRateMode] = useState(false);
  const [newRate, setNewRate] = useState('');
  const [editMealsMode, setEditMealsMode] = useState(false);
  const [newMeals, setNewMeals] = useState('');
  const [editAdvanceMode, setEditAdvanceMode] = useState(false);
  const [newAdvance, setNewAdvance] = useState('');
  const [togglingSystem, setTogglingSystem] = useState(false);

  const todayStr = new Date().toISOString().substring(0, 10);

  const fontBnFamily = Platform.select({ web: '"Hind Siliguri", -apple-system, sans-serif', default: undefined });
  const fontEnDisplay = Platform.select({ web: '"Plus Jakarta Sans", -apple-system, sans-serif', default: undefined });
  const fontEnLabel = Platform.select({ web: '"Inter", -apple-system, sans-serif', default: undefined });

  const loadSummary = async () => {
    const cacheKey = `@pockit_mess_${userId}`;
    let hasCached = false;
    try {
      const cachedRaw = await AsyncStorage.getItem(cacheKey);
      if (cachedRaw) {
        const cached: MessSummary = JSON.parse(cachedRaw);
        hasCached = true;
        setSummary(cached);
        if (cached.meals_by_date && cached.meals_by_date[todayStr] !== undefined) {
          setSelectedCount(cached.meals_by_date[todayStr]);
        } else if (cached.daily_meal_count !== undefined) {
          setSelectedCount(cached.daily_meal_count);
        }
        setNewRate(String(cached.estimated_meal_rate));
      }
    } catch {}

    if (!hasCached) setLoading(true);
    try {
      const data = await fetchMessSummary(userId);
      setSummary(data);
      if (data.meals_by_date && data.meals_by_date[todayStr] !== undefined) {
        setSelectedCount(data.meals_by_date[todayStr]);
      } else if (data.daily_meal_count !== undefined) {
        setSelectedCount(data.daily_meal_count);
      }
      setNewRate(String(data.estimated_meal_rate));
    } catch (e) {
      // offline fallback already loaded from cache
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (visible) {
      loadSummary();
    }
  }, [visible]);

  const applyOptimisticSummary = (patch: Partial<MessSummary>) => {
    setSummary((prev) => {
      if (!prev) return prev;
      const next = { ...prev, ...patch };
      const totalMeals = Number(next.total_meals || 0);
      const rate = Number(next.estimated_meal_rate || 50);
      const advance = Number(next.meal_advance_paid || 0);
      const consumed = Number((totalMeals * rate).toFixed(2));
      const diff = Number((advance - consumed).toFixed(2));
      const updated = {
        ...next,
        consumed_food_cost: consumed,
        balance_status: diff >= 0 ? 'surplus' : 'deficit',
        balance_amount: Math.abs(diff),
      } as MessSummary;
      AsyncStorage.setItem(`@pockit_mess_${userId}`, JSON.stringify(updated)).catch(() => {});
      return updated;
    });
  };

  const handleLogMeal = async (count: number) => {
    try {
      Haptics.selectionAsync();
    } catch {}
    setSelectedCount(count);
    if (summary) {
      const prevCount = summary.meals_by_date?.[todayStr] ?? 0;
      const nextMeals = Math.max(0, Number((summary.total_meals - prevCount + count).toFixed(2)));
      applyOptimisticSummary({
        total_meals: nextMeals,
        daily_meal_count: count,
        meals_by_date: { ...(summary.meals_by_date || {}), [todayStr]: count },
      });
    }
    try {
      await logMessMeal({
        user_id: userId,
        date: todayStr,
        meal_count: count,
      });
      try {
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      } catch {}
      await loadSummary();
      if (onSuccess) onSuccess();
    } catch (e: any) {
      await loadSummary();
      Alert.alert('Error', e.message);
    }
  };

  const handleSaveRate = async () => {
    const rateNum = parseFloat(newRate);
    if (isNaN(rateNum) || rateNum <= 0) return;
    setEditRateMode(false);
    applyOptimisticSummary({ estimated_meal_rate: rateNum });
    try {
      await updateEstimatedMealRate({ user_id: userId, estimated_meal_rate: rateNum });
      await loadSummary();
      if (onSuccess) onSuccess();
    } catch (e: any) {
      await loadSummary();
      if (Platform.OS === 'web' && typeof window !== 'undefined') {
        window.alert(e.message || 'Failed to update meal rate');
      } else {
        Alert.alert('Error', e.message);
      }
    }
  };

  const handleSaveTotalMeals = async () => {
    const mealsNum = parseFloat(newMeals);
    if (isNaN(mealsNum) || mealsNum < 0) return;
    setEditMealsMode(false);
    applyOptimisticSummary({ total_meals: mealsNum });
    try {
      try { Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success); } catch {}
      const updated = await updateMessTotalMeals({ user_id: userId, total_meals: mealsNum });
      if (updated && typeof updated.total_meals === 'number') {
        setSummary(updated);
      } else {
        await loadSummary();
      }
      if (onSuccess) onSuccess();
    } catch (e: any) {
      await loadSummary();
      if (Platform.OS === 'web' && typeof window !== 'undefined') {
        window.alert(e.message || 'Failed to update total meals');
      } else {
        Alert.alert('Error', e.message);
      }
    }
  };

  const handleSaveAdvance = async () => {
    const advNum = parseFloat(newAdvance);
    if (isNaN(advNum) || advNum < 0) return;
    setEditAdvanceMode(false);
    applyOptimisticSummary({ meal_advance_paid: advNum });
    try {
      try { Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success); } catch {}
      await updateMessAdvance({ user_id: userId, meal_advance_paid: advNum });
      await loadSummary();
      if (onSuccess) onSuccess();
    } catch (e: any) {
      await loadSummary();
      if (Platform.OS === 'web' && typeof window !== 'undefined') {
        window.alert(e.message || 'Failed to update mess advance');
      } else {
        Alert.alert('Error', e.message);
      }
    }
  };

  const handleToggleSystem = async (val: boolean) => {
    try { Haptics.selectionAsync(); } catch {}
    setTogglingSystem(true);
    applyOptimisticSummary({ enable_mess_meals: val });
    try {
      await toggleMessMealSystem(userId, val);
      await loadSummary();
      if (onSuccess) onSuccess();
    } catch (e: any) {
      await loadSummary();
      if (Platform.OS === 'web' && typeof window !== 'undefined') {
        window.alert(e.message || 'Failed to toggle mess meal system');
      } else {
        Alert.alert('Error', e.message);
      }
    } finally {
      setTogglingSystem(false);
    }
  };

  const isSurplus = summary?.balance_status === 'surplus';
  const surplusColor = isSurplus ? '#10B981' : '#F47B4E';

  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
      <View style={styles.overlay}>
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
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, flex: 1 }}>
              <Ionicons name="restaurant-outline" size={20} color="#F47B4E" />
              <Text style={[styles.title, { color: theme.textPrimary, fontFamily: language === 'bn' ? fontBnFamily : fontEnDisplay }]} numberOfLines={1}>
                {language === 'bn' ? 'মেস মিল ও খরচের হিসাব' : 'Mess Meals & Refund Assistant'}
              </Text>
            </View>
            <TouchableOpacity onPress={onClose} style={[styles.closeBtn, { backgroundColor: isDark ? 'rgba(255, 255, 255, 0.06)' : '#F1F5F9' }]}>
              <Ionicons name="close" size={18} color={theme.textSecondary} />
            </TouchableOpacity>
          </View>

          {/* Mess System ON/OFF Toggle Strip */}
          <View
            style={[
              styles.toggleStrip,
              {
                backgroundColor: isDark ? 'rgba(255, 255, 255, 0.04)' : '#F1F5F9',
                borderColor: isDark ? 'rgba(255, 255, 255, 0.08)' : '#E2E8F0',
              },
            ]}
          >
            <View style={{ flex: 1, paddingRight: 10 }}>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                <Ionicons
                  name={summary?.enable_mess_meals ? 'shield-checkmark' : 'shield-outline'}
                  size={15}
                  color={summary?.enable_mess_meals ? '#10B981' : theme.textMuted}
                />
                <Text
                  style={[
                    styles.toggleTitle,
                    { color: theme.textPrimary, fontFamily: language === 'bn' ? fontBnFamily : fontEnLabel },
                  ]}
                >
                  {language === 'bn' ? 'মেস মিল সিস্টেম' : 'Mess Meal System'}
                </Text>
              </View>
              <Text style={[styles.toggleSubtitle, { color: theme.textMuted }]}>
                {summary?.enable_mess_meals
                  ? (language === 'bn' ? 'চালু আছে (অগ্রিম জমা ও দৈনিক মিল হিসাব)' : 'Active (Ring-fenced deposit & meal counts)')
                  : (language === 'bn' ? 'বন্ধ আছে (খাবারের খরচ সরাসরি দৈনিক হাতখরচে)' : 'Inactive (Food tracked via daily expenses)')}
              </Text>
            </View>
            <Switch
              value={summary?.enable_mess_meals ?? true}
              onValueChange={handleToggleSystem}
              disabled={togglingSystem}
              trackColor={{ false: isDark ? '#334155' : '#CBD5E1', true: '#10B981' }}
              thumbColor={Platform.OS === 'android' ? '#FFFFFF' : undefined}
            />
          </View>

          <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
            {summary?.enable_mess_meals === false ? (
              /* Inactive State Banner */
              <View
                style={[
                  styles.inactiveCard,
                  {
                    backgroundColor: isDark ? 'rgba(255, 255, 255, 0.03)' : '#F8FAFC',
                    borderColor: isDark ? 'rgba(255, 255, 255, 0.08)' : '#E2E8F0',
                  },
                ]}
              >
                <View style={styles.inactiveIconCircle}>
                  <Ionicons name="fast-food-outline" size={34} color="#F47B4E" />
                </View>
                <Text
                  style={[
                    styles.inactiveTitle,
                    { color: theme.textPrimary, fontFamily: language === 'bn' ? fontBnFamily : fontEnDisplay },
                  ]}
                >
                  {language === 'bn' ? 'মেস মিল ট্র্যাকিং বর্তমানে বন্ধ' : 'Mess Meal Tracking is OFF'}
                </Text>
                <Text style={[styles.inactiveDesc, { color: theme.textSecondary }]}>
                  {language === 'bn'
                    ? 'আপনার খাবারের খরচ সাধারণ দৈনিক খরচ (Food Expense) হিসেবে হাতখরচের দৈনিক সীমা থেকে সরাসরি কাটা হচ্ছে। আপনি যদি ফ্ল্যাটে বা মেসে অগ্রিম মিল দিয়ে থাকেন এবং রোজ মিল গুনতে চান, তবে নিচের বাটন চেপে মেস মিল সিস্টেম চালু করুন।'
                    : 'Your food expenses are tracked directly as regular daily expenses deducted from your daily pocket money. If you live in a mess or shared flat with meal counts and an upfront deposit, enable it below.'}
                </Text>
                <TouchableOpacity
                  style={[styles.turnOnBtn, { backgroundColor: theme.primary }]}
                  onPress={() => handleToggleSystem(true)}
                  activeOpacity={0.85}
                  disabled={togglingSystem}
                >
                  <Ionicons name="restaurant" size={16} color="#FFFFFF" style={{ marginRight: 6 }} />
                  <Text style={styles.turnOnBtnText}>
                    {language === 'bn' ? 'মেস মিল সিস্টেম চালু করুন' : 'Enable Mess Meal System'}
                  </Text>
                </TouchableOpacity>
              </View>
            ) : (
              <>
                {/* 1. Month Summary Card */}
                <View
                  style={[
                    styles.summaryCard,
                    {
                      backgroundColor: isDark ? 'rgba(255, 255, 255, 0.04)' : '#F8FAFC',
                      borderColor: isDark ? 'rgba(255, 255, 255, 0.08)' : '#E2E8F0',
                    },
                  ]}
                >
                  <View style={styles.summaryTopRow}>
                    <View>
                      <Text style={[styles.summaryCardLabel, { color: theme.textSecondary, fontFamily: language === 'bn' ? fontBnFamily : fontEnLabel }]}>
                        {language === 'bn' ? 'মেস অগ্রিম জমা' : 'Mess Meal Advance'}
                      </Text>
                      {editAdvanceMode ? (
                        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4, marginTop: 2 }}>
                          <TextInput
                            style={[styles.rateInput, { color: theme.textPrimary, borderColor: theme.primary, minWidth: 68 }]}
                            value={newAdvance}
                            onChangeText={setNewAdvance}
                            keyboardType="numeric"
                            autoFocus
                          />
                          <TouchableOpacity onPress={handleSaveAdvance} style={styles.rateCheckBtn}>
                            <Ionicons name="checkmark" size={14} color="#FFFFFF" />
                          </TouchableOpacity>
                        </View>
                      ) : (
                        <TouchableOpacity
                          onPress={() => {
                            setNewAdvance(String(summary?.meal_advance_paid || '0'));
                            setEditAdvanceMode(true);
                          }}
                          style={{ flexDirection: 'row', alignItems: 'center', gap: 5 }}
                          activeOpacity={0.7}
                        >
                          <Text style={[styles.summaryBigNumber, { color: theme.textPrimary, fontFamily: fontEnDisplay }]}>
                            ৳{summary?.meal_advance_paid || 0}
                          </Text>
                          <Ionicons name="pencil-outline" size={13} color={theme.textMuted} />
                        </TouchableOpacity>
                      )}
                    </View>

                    <View style={{ alignItems: 'flex-end' }}>
                      <Text style={[styles.summaryCardLabel, { color: theme.textSecondary, fontFamily: language === 'bn' ? fontBnFamily : fontEnLabel }]}>
                        {language === 'bn' ? (isSurplus ? 'জমার উদ্বৃত্ত (Refund)' : 'ঘাটতি বকেয়া') : (isSurplus ? 'Advance Surplus' : 'Due Deficit')}
                      </Text>
                      <Text style={[styles.summaryBigNumber, { color: surplusColor, fontFamily: fontEnDisplay }]}>
                        {isSurplus ? '+' : '-'}৳{summary?.balance_amount || 0}
                      </Text>
                    </View>
                  </View>

                  <View style={[styles.cardDivider, { backgroundColor: isDark ? 'rgba(255, 255, 255, 0.06)' : '#E2E8F0' }]} />

                  <View style={styles.summarySubStatsRow}>
                    {/* Total Meals (Directly Editable / Inputable for Mid-Month Joiners) */}
                    <View style={styles.subStatCol}>
                      <Text style={[styles.subStatLabel, { color: theme.textMuted }]}>
                        {language === 'bn' ? 'মোট মিল' : 'Total Meals'}
                      </Text>
                      {editMealsMode ? (
                        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4 }}>
                          <TextInput
                            style={[styles.rateInput, { color: theme.textPrimary, borderColor: theme.primary, minWidth: 54 }]}
                            value={newMeals}
                            onChangeText={setNewMeals}
                            keyboardType="numeric"
                            autoFocus
                          />
                          <TouchableOpacity onPress={handleSaveTotalMeals} style={styles.rateCheckBtn}>
                            <Ionicons name="checkmark" size={14} color="#FFFFFF" />
                          </TouchableOpacity>
                        </View>
                      ) : (
                        <TouchableOpacity
                          onPress={() => {
                            setNewMeals(String(summary?.total_meals ?? '0'));
                            setEditMealsMode(true);
                          }}
                          style={[styles.statEditBadge, { backgroundColor: isDark ? 'rgba(224, 122, 95, 0.14)' : '#FFF0EB' }]}
                          activeOpacity={0.7}
                        >
                          <Text style={[styles.subStatVal, { color: theme.primary }]}>
                            {summary?.total_meals || 0}
                          </Text>
                          <Ionicons name="pencil-outline" size={12} color={theme.primary} />
                        </TouchableOpacity>
                      )}
                    </View>

                    {/* Meal Rate (Editable) */}
                    <View style={styles.subStatCol}>
                      <Text style={[styles.subStatLabel, { color: theme.textMuted }]}>
                        {language === 'bn' ? 'মিল রেট' : 'Meal Rate'}
                      </Text>
                      {editRateMode ? (
                        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4 }}>
                          <TextInput
                            style={[styles.rateInput, { color: theme.textPrimary, borderColor: theme.primary }]}
                            value={newRate}
                            onChangeText={setNewRate}
                            keyboardType="numeric"
                            autoFocus
                          />
                          <TouchableOpacity onPress={handleSaveRate} style={styles.rateCheckBtn}>
                            <Ionicons name="checkmark" size={14} color="#FFFFFF" />
                          </TouchableOpacity>
                        </View>
                      ) : (
                        <TouchableOpacity onPress={() => setEditRateMode(true)} style={[styles.statEditBadge, { backgroundColor: isDark ? 'rgba(224, 122, 95, 0.14)' : '#FFF0EB' }]}>
                          <Text style={[styles.subStatVal, { color: theme.primary }]}>
                            ৳{summary?.estimated_meal_rate || 50}
                          </Text>
                          <Ionicons name="pencil-outline" size={11} color={theme.primary} />
                        </TouchableOpacity>
                      )}
                    </View>

                    {/* Food Cost */}
                    <View style={styles.subStatCol}>
                      <Text style={[styles.subStatLabel, { color: theme.textMuted }]}>
                        {language === 'bn' ? 'খাবার খরচ' : 'Food Cost'}
                      </Text>
                      <Text style={[styles.subStatVal, { color: theme.textPrimary }]}>
                        ৳{summary?.consumed_food_cost || 0}
                      </Text>
                    </View>
                  </View>
                </View>

                {/* Mid-Month Joiner Interactive Quick Adjustment */}
                {editMealsMode ? (
                  <View
                    style={[
                      styles.midMonthEditBox,
                      {
                        backgroundColor: isDark ? '#141E2B' : '#FFFFFF',
                        borderColor: theme.primary,
                      },
                    ]}
                  >
                    <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 8 }}>
                      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                        <Ionicons name="calculator-outline" size={16} color={theme.primary} />
                        <Text style={[styles.midMonthEditTitle, { color: theme.textPrimary }]}>
                          {language === 'bn' ? 'মাসের মাঝামাঝি মিল সমন্বয়' : 'Mid-Month Meal Adjustment'}
                        </Text>
                      </View>
                      <TouchableOpacity onPress={() => setEditMealsMode(false)} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
                        <Ionicons name="close-circle-outline" size={18} color={theme.textMuted} />
                      </TouchableOpacity>
                    </View>
                    <Text style={[styles.midMonthEditDesc, { color: theme.textSecondary }]}>
                      {language === 'bn'
                        ? 'আপনি কি মাসের মাঝামাঝি অ্যাপ ব্যবহার শুরু করেছেন? এ পর্যন্ত মোট যত মিল হয়েছে লিখুন:'
                        : 'Started mid-month? Enter your cumulative meals consumed this month so far:'}
                    </Text>

                    <View style={styles.mealsInputRow}>
                      <TextInput
                        style={[styles.midMonthLargeInput, { color: theme.textPrimary, borderColor: theme.primary, backgroundColor: isDark ? '#1B2738' : '#F8FAFC' }]}
                        value={newMeals}
                        onChangeText={setNewMeals}
                        keyboardType="numeric"
                        placeholder="0"
                        placeholderTextColor={theme.textMuted}
                        autoFocus
                      />
                      <Text style={[styles.mealsUnitText, { color: theme.textPrimary }]}>
                        {language === 'bn' ? 'মিল' : 'meals'}
                      </Text>
                    </View>

                    {/* Quick Increment Pills */}
                    <View style={styles.quickIncrementRow}>
                      {[1, 5, 10, 15, 20].map((inc) => (
                        <TouchableOpacity
                          key={inc}
                          style={[styles.quickIncPill, { backgroundColor: isDark ? 'rgba(255,255,255,0.06)' : '#EEF3F6', borderColor: isDark ? 'rgba(255,255,255,0.1)' : '#E2E8F0' }]}
                          onPress={() => {
                            const cur = parseFloat(newMeals) || 0;
                            setNewMeals(String(Math.max(0, cur + inc)));
                          }}
                        >
                          <Text style={[styles.quickIncText, { color: theme.textPrimary }]}>+{inc}</Text>
                        </TouchableOpacity>
                      ))}
                      <TouchableOpacity
                        style={[styles.quickIncPill, { backgroundColor: isDark ? 'rgba(239, 68, 68, 0.1)' : '#FEE2E2', borderColor: 'transparent' }]}
                        onPress={() => setNewMeals('0')}
                      >
                        <Text style={[styles.quickIncText, { color: '#EF4444' }]}>Reset</Text>
                      </TouchableOpacity>
                    </View>

                    {/* Live Calculation Preview */}
                    {(() => {
                      const mNum = parseFloat(newMeals) || 0;
                      const rate = summary?.estimated_meal_rate || 50;
                      const adv = summary?.meal_advance_paid || 0;
                      const calcCost = Math.round(mNum * rate);
                      const calcSurplus = Math.round(adv - calcCost);
                      return (
                        <View style={[styles.livePreviewBox, { backgroundColor: isDark ? 'rgba(16, 185, 129, 0.1)' : '#ECFDF5' }]}>
                          <Text style={[styles.livePreviewText, { color: isDark ? '#6EE7B7' : '#065F46' }]}>
                            {language === 'bn'
                              ? `${mNum} মিল × ৳${rate} = ৳${calcCost} খাবার খরচ (উদ্বৃত্ত: ${calcSurplus >= 0 ? '+' : ''}৳${calcSurplus})`
                              : `${mNum} meals × ৳${rate} = ৳${calcCost} food cost (Surplus: ${calcSurplus >= 0 ? '+' : ''}৳${calcSurplus})`}
                          </Text>
                        </View>
                      );
                    })()}

                    {/* Action buttons */}
                    <View style={{ flexDirection: 'row', gap: 10, marginTop: 12 }}>
                      <TouchableOpacity
                        style={[styles.adjustSaveBtn, { backgroundColor: theme.primary }]}
                        onPress={handleSaveTotalMeals}
                        activeOpacity={0.8}
                      >
                        <Ionicons name="checkmark-done" size={16} color="#FFFFFF" style={{ marginRight: 6 }} />
                        <Text style={styles.adjustSaveBtnText}>
                          {language === 'bn' ? 'মোট মিল সংরক্ষণ করুন' : 'Save Total Meals'}
                        </Text>
                      </TouchableOpacity>
                      <TouchableOpacity
                        style={[styles.adjustCancelBtn, { borderColor: isDark ? 'rgba(255,255,255,0.15)' : '#CBD5E1' }]}
                        onPress={() => setEditMealsMode(false)}
                      >
                        <Text style={[styles.adjustCancelBtnText, { color: theme.textSecondary }]}>
                          {language === 'bn' ? 'বাতিল' : 'Cancel'}
                        </Text>
                      </TouchableOpacity>
                    </View>
                  </View>
                ) : (
                  <TouchableOpacity
                    style={[
                      styles.midMonthTipRow,
                      {
                        backgroundColor: isDark ? 'rgba(244, 123, 78, 0.10)' : '#FFF7F4',
                        borderColor: isDark ? 'rgba(244, 123, 78, 0.22)' : '#FCDCD3',
                        cursor: 'pointer' as any,
                      },
                    ]}
                    onPress={() => {
                      setNewMeals(String(summary?.total_meals ?? '0'));
                      setEditMealsMode(true);
                    }}
                    activeOpacity={0.7}
                  >
                    <Ionicons name="calculator-outline" size={16} color={theme.primary} />
                    <View style={{ flex: 1 }}>
                      <Text style={[styles.midMonthTipTitle, { color: theme.primary }]}>
                        {language === 'bn' ? 'মাসের মাঝামাঝি শুরু করেছেন? মিল সমন্বয় করুন' : 'Started mid-month? Tap to adjust total meals'}
                      </Text>
                      <Text style={[styles.midMonthTipText, { color: theme.textSecondary }]}>
                        {language === 'bn'
                          ? 'আগের দিনের মিলগুলো সহ মোট মিল হিসাব করে নিন।'
                          : 'Enter your past meals to calculate food cost and meal advance refund accurately.'}
                      </Text>
                    </View>
                  </TouchableOpacity>
                )}

                {/* 2. Today's Meal Quick Logger */}
                <View style={styles.loggerSection}>
                  <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 10 }}>
                    <Text style={[styles.sectionHeading, { color: theme.textPrimary, fontFamily: language === 'bn' ? fontBnFamily : fontEnLabel }]}>
                      {language === 'bn' ? `আজকের মিল লগ (${todayStr})` : `Log Today's Meals (${todayStr})`}
                    </Text>
                    <Text style={{ fontSize: 12, color: theme.primary, fontWeight: '700' }}>
                      {selectedCount} {language === 'bn' ? 'টি মিল' : 'meals'}
                    </Text>
                  </View>

                  <View style={styles.pillRow}>
                    {[0, 0.5, 1.0, 1.5, 2.0].map((count) => {
                      const isSelected = selectedCount === count;
                      return (
                        <TouchableOpacity
                          key={count}
                          style={[
                            styles.mealPill,
                            {
                              backgroundColor: isSelected
                                ? (isDark ? 'rgba(244, 123, 78, 0.20)' : '#FDECE4')
                                : (isDark ? 'rgba(255, 255, 255, 0.04)' : '#F8FAFC'),
                              borderColor: isSelected
                                ? '#F47B4E'
                                : (isDark ? 'rgba(255, 255, 255, 0.08)' : '#E2E8F0'),
                            },
                          ]}
                          onPress={() => handleLogMeal(count)}
                          activeOpacity={0.75}
                        >
                          <Text
                            style={[
                              styles.mealPillText,
                              {
                                color: isSelected ? '#F47B4E' : theme.textSecondary,
                                fontWeight: isSelected ? '700' : '500',
                              },
                            ]}
                          >
                            {count === 0
                              ? (language === 'bn' ? '০ বন্ধ' : '0 Off')
                              : count === 0.5
                              ? (language === 'bn' ? '০.৫ হাফ' : '0.5 Half')
                              : `${count} ${language === 'bn' ? 'মিল' : 'Meal'}`}
                          </Text>
                        </TouchableOpacity>
                      );
                    })}
                  </View>
                </View>

                {/* 3. Helpful Campus Note */}
                <View
                  style={[
                    styles.infoNote,
                    {
                      backgroundColor: isDark ? 'rgba(56, 189, 248, 0.08)' : '#F0F9FF',
                      borderColor: isDark ? 'rgba(56, 189, 248, 0.20)' : '#BAE6FD',
                    },
                  ]}
                >
                  <Ionicons name="information-circle-outline" size={16} color="#0284C7" />
                  <Text style={[styles.infoNoteText, { color: isDark ? '#BAE6FD' : '#0369A1', fontFamily: language === 'bn' ? fontBnFamily : fontEnLabel }]}>
                    {language === 'bn'
                      ? 'মেসের খাবারের খরচ আপনার দৈনিক হাতখরচের সীমা থেকে কাটা যায় না, কারণ এটি মাসের শুরুতে অগ্রিম জমা হিসেবে সুরক্ষিত থাকে।'
                      : 'Mess meals do not deduct from your daily safe spending limit because your meal advance is ring-fenced at the beginning of the month.'}
                  </Text>
                </View>
              </>
            )}
          </ScrollView>
        </View>
      </View>
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
  scrollContent: { paddingHorizontal: 20, paddingTop: 16, paddingBottom: 20 },
  summaryCard: {
    borderRadius: 18,
    borderWidth: 1,
    padding: 16,
    marginBottom: 16,
  },
  summaryTopRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  summaryCardLabel: { fontSize: 12, fontWeight: '600', marginBottom: 2 },
  summaryBigNumber: { fontSize: 24, fontWeight: '800' },
  cardDivider: { height: 1, marginVertical: 12 },
  summarySubStatsRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  subStatCol: { alignItems: 'center' },
  subStatLabel: { fontSize: 11, marginBottom: 2 },
  subStatVal: { fontSize: 15, fontWeight: '700' },
  rateInput: {
    borderWidth: 1,
    borderRadius: 8,
    paddingHorizontal: 6,
    paddingVertical: 2,
    fontSize: 13,
    fontWeight: '700',
    width: 50,
    textAlign: 'center',
  },
  rateCheckBtn: {
    backgroundColor: '#F47B4E',
    borderRadius: 6,
    padding: 4,
  },
  loggerSection: { marginBottom: 16 },
  sectionHeading: { fontSize: 14, fontWeight: '700' },
  pillRow: { flexDirection: 'row', gap: 6, marginTop: 4 },
  mealPill: {
    flex: 1,
    borderWidth: 1,
    borderRadius: 12,
    paddingVertical: 10,
    alignItems: 'center',
    justifyContent: 'center',
  },
  mealPillText: { fontSize: 12 },
  infoNote: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 8,
    borderWidth: 1,
    borderRadius: 14,
    padding: 12,
  },
  infoNoteText: { flex: 1, fontSize: 12, lineHeight: 17 },
  midMonthTipRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    borderWidth: 1,
    borderRadius: 12,
    paddingHorizontal: 12,
    paddingVertical: 10,
    marginBottom: 16,
  },
  midMonthTipTitle: {
    fontSize: 12,
    fontWeight: '700',
    marginBottom: 2,
  },
  midMonthTipText: {
    fontSize: 11.5,
    lineHeight: 16,
    fontWeight: '500',
  },
  statEditBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 8,
    cursor: 'pointer' as any,
  },
  midMonthEditBox: {
    borderWidth: 1.5,
    borderRadius: 16,
    padding: 14,
    marginBottom: 16,
  },
  midMonthEditTitle: {
    fontSize: 13,
    fontWeight: '800',
  },
  midMonthEditDesc: {
    fontSize: 12,
    marginBottom: 10,
    lineHeight: 16,
  },
  mealsInputRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 10,
  },
  midMonthLargeInput: {
    borderWidth: 1.5,
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 6,
    fontSize: 18,
    fontWeight: '800',
    minWidth: 80,
    textAlign: 'center',
  },
  mealsUnitText: {
    fontSize: 14,
    fontWeight: '700',
  },
  quickIncrementRow: {
    flexDirection: 'row',
    gap: 6,
    flexWrap: 'wrap',
    marginBottom: 10,
  },
  quickIncPill: {
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 8,
    borderWidth: 1,
    cursor: 'pointer' as any,
  },
  quickIncText: {
    fontSize: 12,
    fontWeight: '700',
  },
  livePreviewBox: {
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 8,
    marginBottom: 4,
  },
  livePreviewText: {
    fontSize: 11.5,
    fontWeight: '700',
  },
  adjustSaveBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 10,
    borderRadius: 10,
    cursor: 'pointer' as any,
  },
  adjustSaveBtnText: {
    color: '#FFFFFF',
    fontSize: 13,
    fontWeight: '700',
  },
  adjustCancelBtn: {
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderRadius: 10,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
    cursor: 'pointer' as any,
  },
  adjustCancelBtnText: {
    fontSize: 13,
    fontWeight: '600',
  },
  toggleStrip: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginHorizontal: 20,
    marginTop: 12,
    marginBottom: 4,
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderRadius: 14,
    borderWidth: 1,
  },
  toggleTitle: {
    fontSize: 13,
    fontWeight: '700',
  },
  toggleSubtitle: {
    fontSize: 11,
    marginTop: 2,
    lineHeight: 15,
  },
  inactiveCard: {
    borderRadius: 18,
    borderWidth: 1,
    padding: 22,
    alignItems: 'center',
    marginTop: 10,
    marginBottom: 20,
  },
  inactiveIconCircle: {
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: 'rgba(244, 123, 78, 0.12)',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 14,
  },
  inactiveTitle: {
    fontSize: 17,
    fontWeight: '800',
    marginBottom: 8,
    textAlign: 'center',
  },
  inactiveDesc: {
    fontSize: 12.5,
    lineHeight: 18,
    textAlign: 'center',
    marginBottom: 20,
  },
  turnOnBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 12,
    paddingHorizontal: 22,
    borderRadius: 14,
  },
  turnOnBtnText: {
    color: '#FFFFFF',
    fontSize: 13.5,
    fontWeight: '700',
  },
});
