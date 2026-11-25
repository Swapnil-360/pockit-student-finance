import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  TextInput,
  ActivityIndicator,
  Alert,
  Platform,
  StatusBar,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useTheme } from '../constants/ThemeContext';
import { TRANSLATIONS, Language } from '../constants/translations';
import { GlassCard } from '../components/GlassCard';
import {
  fetchAiCoachAdvice,
  simulatePurchase,
  askSmartCoach,
  toggleDemoPro,
  AiCoachData,
  PurchaseSimulationResult,
} from '../services/api';

interface AiCoachScreenProps {
  userId: string;
  isPro?: boolean;
  language: Language;
  onOpenProModal: () => void;
  onProStatusChanged?: () => void;
}

const SIM_CATEGORIES = [
  { key: 'Food', en: 'Food', bn: 'খাবার', icon: 'fast-food-outline' },
  { key: 'Entertainment', en: 'Shopping & Dining', bn: 'শপিং ও আড্ডা', icon: 'cart-outline' },
  { key: 'Academic', en: 'Books & Course', bn: 'বই ও কোর্স', icon: 'school-outline' },
  { key: 'Transport', en: 'Transport', bn: 'যাতায়াত', icon: 'bus-outline' },
  { key: 'Other', en: 'Other', bn: 'অন্যান্য', icon: 'wallet-outline' },
];

const PRESET_QUESTIONS = [
  {
    en: 'Can I afford hanging out with friends this weekend?',
    bn: 'এই উইকেন্ডে বন্ধুদের সাথে রেস্টুরেন্টে খেতে যাওয়া কি বাজেটে কুলাবে?',
  },
  {
    en: 'How much can I safely spend on snacks today?',
    bn: 'আজ নাস্তা বা ক্যান্টিনে সর্বোচ্চ কত টাকা খরচ করা নিরাপদ?',
  },
  {
    en: 'How can I reduce mess meal advance waste?',
    bn: 'মেসের মিল খরচে অপচয় কমিয়ে কীভাবে বেশি সঞ্চয় করব?',
  },
];

export const AiCoachScreen: React.FC<AiCoachScreenProps> = ({
  userId,
  isPro = false,
  language,
  onOpenProModal,
  onProStatusChanged,
}) => {
  const { isDark, theme } = useTheme();
  const [activeTab, setActiveTab] = useState<'daily' | 'simulator' | 'ask'>('daily');
  const [coachData, setCoachData] = useState<AiCoachData | null>(null);
  const [loadingAdvice, setLoadingAdvice] = useState(false);
  const [demoLoading, setDemoLoading] = useState(false);

  // Simulator state
  const [simItem, setSimItem] = useState('');
  const [simAmount, setSimAmount] = useState('');
  const [simCategory, setSimCategory] = useState('Entertainment');
  const [simulating, setSimulating] = useState(false);
  const [simResult, setSimResult] = useState<PurchaseSimulationResult | null>(null);

  // Interactive Coach Q&A state
  const [questionInput, setQuestionInput] = useState('');
  const [askingCoach, setAskingCoach] = useState(false);
  const [coachQueriesRemaining, setCoachQueriesRemaining] = useState<number>(10);
  const [qaHistory, setQaHistory] = useState<Array<{ q: string; a: string; time: string }>>([]);

  const t = TRANSLATIONS[language];

  const loadAdvice = async () => {
    if (!isPro) return;
    setLoadingAdvice(true);
    try {
      const data = await fetchAiCoachAdvice(userId);
      setCoachData(data);
      if (data?.queries_remaining !== undefined) {
        setCoachQueriesRemaining(data.queries_remaining);
      }
    } catch (e) {
      // Offline fallback
    } finally {
      setLoadingAdvice(false);
    }
  };

  useEffect(() => {
    if (isPro) {
      loadAdvice();
    }
  }, [userId, isPro]);

  const handleSimulate = async () => {
    const amt = parseFloat(simAmount.trim());
    if (!simItem.trim() || isNaN(amt) || amt <= 0) {
      Alert.alert(
        language === 'bn' ? 'সতর্কতা' : 'Required',
        language === 'bn'
          ? 'দয়া করে পণ্যের নাম ও সঠিক টাকার পরিমাণ লিখুন।'
          : 'Please enter item title and valid amount.'
      );
      return;
    }

    try {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    } catch {}

    setSimulating(true);
    try {
      const res = await simulatePurchase(userId, simItem.trim(), amt, simCategory);
      setSimResult(res);
    } catch (e: any) {
      Alert.alert('Simulation Error', e.message || 'Could not simulate purchase.');
    } finally {
      setSimulating(false);
    }
  };

  const handleAskCoach = async (presetText?: string) => {
    const q = (presetText || questionInput).trim();
    if (!q) return;

    if (coachQueriesRemaining <= 0) {
      Alert.alert(
        language === 'bn' ? 'দৈনিক কোটা শেষ' : 'Daily Limit Reached',
        language === 'bn'
          ? 'আজকের জন্য আপনার ১০টি স্মার্ট পরামর্শের কোটা পূর্ণ হয়েছে। মধ্যরাতে তা স্বয়ংক্রিয়ভাবে রিসেট হবে।'
          : 'You have used your 10 Smart Coach queries for today. Quota resets at midnight.'
      );
      return;
    }

    try {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    } catch {}

    setAskingCoach(true);
    try {
      const res = await askSmartCoach(userId, q);
      setCoachQueriesRemaining(res.queries_remaining);
      setQaHistory((prev) => [
        {
          q,
          a: language === 'bn' ? res.answer_bn : res.answer_en,
          time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
        },
        ...prev,
      ]);
      setQuestionInput('');
    } catch (err: any) {
      Alert.alert('Coach Error', err.message || 'Could not consult coach.');
    } finally {
      setAskingCoach(false);
    }
  };

  const handleDemoUnlock = async () => {
    try {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    } catch {}
    setDemoLoading(true);
    try {
      await toggleDemoPro(userId, true);
      if (onProStatusChanged) {
        onProStatusChanged();
      }
      Alert.alert(
        language === 'bn' ? 'ডেমো প্রো সক্রিয়' : 'Demo Pro Activated',
        language === 'bn'
          ? 'টেস্টিংয়ের সুবিধার্থে পকেট স্মার্ট কোচ ফিচার সক্রিয় করা হয়েছে।'
          : 'Pockit Smart Coach unlocked for testing.'
      );
    } catch (e: any) {
      Alert.alert('Error', e.message || 'Could not toggle demo pro.');
    } finally {
      setDemoLoading(false);
    }
  };

  const insets = useSafeAreaInsets();
  const statusBarPad = Math.max(insets.top, Platform.OS === 'android' ? (StatusBar.currentHeight || 36) : 44) + 8;

  const getVerdictStyle = (verdict: string) => {
    switch (verdict) {
      case 'PROCEED':
        return {
          text: theme.riskLow,
          bg: isDark ? 'rgba(16, 185, 129, 0.16)' : '#E6F9F0',
          border: theme.riskLow,
          label: t.verdictProceed,
          icon: 'checkmark-circle-outline' as const,
        };
      case 'WARN':
        return {
          text: theme.riskModerate,
          bg: isDark ? 'rgba(245, 158, 11, 0.16)' : '#FEF3C7',
          border: theme.riskModerate,
          label: t.verdictWarn,
          icon: 'warning-outline' as const,
        };
      case 'AVOID':
      default:
        return {
          text: theme.riskHigh,
          bg: isDark ? 'rgba(244, 123, 78, 0.16)' : '#FEE2E2',
          border: theme.riskHigh,
          label: t.verdictAvoid,
          icon: 'alert-circle-outline' as const,
        };
    }
  };

  return (
    <View style={[styles.container, { backgroundColor: theme.canvas }]}>
      <ScrollView
        contentContainerStyle={[styles.scrollContent, { paddingTop: statusBarPad, paddingBottom: 140 + insets.bottom }]}
        showsVerticalScrollIndicator={false}
      >
        {/* Top Header */}
        <View style={styles.header}>
          <View style={styles.headerTitleRow}>
            <Text style={[styles.screenTitle, { color: theme.textPrimary }]}>{t.aiCoachTitle}</Text>
            {isPro ? (
              <View style={[styles.proActiveBadge, { backgroundColor: theme.powder, borderColor: theme.headerBlock }]}>
                <Ionicons name="shield-checkmark" size={12} color={theme.primary} />
                <Text style={[styles.proActiveBadgeText, { color: theme.primary }]}>PRO ACTIVE</Text>
              </View>
            ) : (
              <View style={[styles.proLockBadge, { backgroundColor: isDark ? '#263B4D' : '#D5E4EF', borderColor: theme.borderMedium }]}>
                <Ionicons name="lock-closed" size={12} color={theme.primary} />
                <Text style={[styles.proLockBadgeText, { color: theme.primary }]}>PREMIUM</Text>
              </View>
            )}
          </View>
          <Text style={[styles.screenSubtitle, { color: theme.textSecondary }]}>{t.aiCoachSubtitle}</Text>
        </View>

        {/* FREE TIER LOCKED VIEW */}
        {!isPro ? (
          <View style={styles.lockedContainer}>
            {/* Scandinavian Hero Card */}
            <View
              style={[
                styles.lockHeroCard,
                {
                  backgroundColor: theme.surface,
                  borderColor: theme.borderMedium,
                  shadowColor: theme.shadowColor,
                },
              ]}
            >
              <View style={[styles.sparkleIconCircle, { backgroundColor: theme.terracottaSoft }]}>
                <Ionicons name="chatbubbles-outline" size={30} color={theme.primary} />
              </View>

              <Text style={[styles.lockTitle, { color: theme.textPrimary }]}>{t.proModalTitle}</Text>
              <Text style={[styles.lockSub, { color: theme.textSecondary }]}>{t.proModalSub}</Text>

              {/* Feature Checklist */}
              <View style={[styles.lockFeaturesList, { backgroundColor: isDark ? '#16191D' : '#F6F9FC', borderColor: theme.border }]}>
                <View style={styles.lockFeatureItem}>
                  <View style={[styles.checkCircle, { backgroundColor: isDark ? 'rgba(16, 185, 129, 0.2)' : '#D1FAE5' }]}>
                    <Ionicons name="checkmark" size={14} color="#10B981" />
                  </View>
                  <Text style={[styles.lockFeatureText, { color: theme.textPrimary }]}>{t.proFeature1}</Text>
                </View>

                <View style={styles.lockFeatureItem}>
                  <View style={[styles.checkCircle, { backgroundColor: isDark ? 'rgba(16, 185, 129, 0.2)' : '#D1FAE5' }]}>
                    <Ionicons name="checkmark" size={14} color="#10B981" />
                  </View>
                  <Text style={[styles.lockFeatureText, { color: theme.textPrimary }]}>{t.proFeature2}</Text>
                </View>

                <View style={styles.lockFeatureItem}>
                  <View style={[styles.checkCircle, { backgroundColor: isDark ? 'rgba(16, 185, 129, 0.2)' : '#D1FAE5' }]}>
                    <Ionicons name="checkmark" size={14} color="#10B981" />
                  </View>
                  <Text style={[styles.lockFeatureText, { color: theme.textPrimary }]}>{t.proFeature3}</Text>
                </View>
              </View>

              {/* Terracotta Primary CTA */}
              <TouchableOpacity
                style={[styles.primaryTerracottaBtn, { backgroundColor: theme.primary }]}
                onPress={() => {
                  try {
                    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
                  } catch {}
                  onOpenProModal();
                }}
                activeOpacity={0.85}
              >
                <Ionicons name="sparkles" size={16} color="#FFFFFF" />
                <Text style={styles.primaryTerracottaText} numberOfLines={1}>
                  {t.proUpgradeBtn}
                </Text>
              </TouchableOpacity>
            </View>

            {/* Teaser Preview Card */}
            <View
              style={[
                styles.teaserCard,
                {
                  backgroundColor: theme.surface,
                  borderColor: theme.border,
                  shadowColor: theme.shadowColor,
                },
              ]}
            >
              <View style={styles.teaserTop}>
                <Ionicons name="eye-outline" size={16} color={theme.primary} />
                <Text style={[styles.teaserLabel, { color: theme.primary }]}>
                  {language === 'bn' ? 'স্মার্ট ফিচারের পূর্বরূপ' : 'SMART COACH PREVIEW'}
                </Text>
              </View>

              <View style={[styles.teaserItem, { backgroundColor: isDark ? '#16191D' : '#F6F9FC', borderColor: theme.border }]}>
                <View style={styles.teaserItemHeader}>
                  <Ionicons name="bulb-outline" size={16} color={theme.primary} />
                  <Text style={[styles.teaserTitle, { color: theme.textPrimary }]}>{t.dailyAdviceTitle}</Text>
                </View>
                <Text style={[styles.teaserBody, { color: theme.textSecondary }]}>
                  {language === 'bn'
                    ? 'আপনার মেস ভাড়ার টাকা আলাদা রাখুন। ক্যান্টিনে প্রতিবেলা ৪০ টাকার মধ্যে খাবার খেলে মাস শেষে প্রায় ৯০০ টাকা সঞ্চয় হবে।'
                    : 'Protect rent & mess first. Keep campus lunches under Tk 40 to ensure positive month-end savings.'}
                </Text>
              </View>

              <View style={[styles.teaserItem, { backgroundColor: isDark ? '#16191D' : '#F6F9FC', borderColor: theme.border }]}>
                <View style={styles.teaserItemHeader}>
                  <Ionicons name="calculator-outline" size={16} color={theme.headerBlock} />
                  <Text style={[styles.teaserTitle, { color: theme.textPrimary }]}>{t.simulatorTitle}</Text>
                </View>
                <Text style={[styles.teaserBody, { color: theme.textSecondary }]}>
                  {language === 'bn'
                    ? 'কেনাকাটা করার আগেই জেনে নিন তা আপনার ঝুঁকি স্কোর, সঞ্চয় লক্ষ্য এবং দৈনিক নিরাপদ বরাদ্দে কী প্রভাব ফেলবে।'
                    : 'Simulate purchase impact on risk scores, target savings, and safe daily allowances before spending.'}
                </Text>
              </View>
            </View>
          </View>
        ) : (
          /* PRO ACTIVE VIEW */
          <View>
            {/* 3-Segmented Mode Selector */}
            <View style={[styles.segmentContainer, { backgroundColor: isDark ? '#16191D' : '#E2EAF1', borderColor: theme.border }]}>
              <TouchableOpacity
                style={[
                  styles.segmentBtn,
                  activeTab === 'daily' && [styles.segmentBtnActive, { backgroundColor: theme.surface, borderColor: theme.borderMedium }],
                ]}
                onPress={() => {
                  try {
                    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                  } catch {}
                  setActiveTab('daily');
                }}
              >
                <Text
                  style={[
                    styles.segmentText,
                    { color: activeTab === 'daily' ? theme.textPrimary : theme.textMuted },
                    activeTab === 'daily' && styles.segmentTextActive,
                  ]}
                  numberOfLines={1}
                >
                  {t.coachTabDaily}
                </Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={[
                  styles.segmentBtn,
                  activeTab === 'simulator' && [styles.segmentBtnActive, { backgroundColor: theme.surface, borderColor: theme.borderMedium }],
                ]}
                onPress={() => {
                  try {
                    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                  } catch {}
                  setActiveTab('simulator');
                }}
              >
                <Text
                  style={[
                    styles.segmentText,
                    { color: activeTab === 'simulator' ? theme.textPrimary : theme.textMuted },
                    activeTab === 'simulator' && styles.segmentTextActive,
                  ]}
                  numberOfLines={1}
                >
                  {t.coachTabSimulator}
                </Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={[
                  styles.segmentBtn,
                  activeTab === 'ask' && [styles.segmentBtnActive, { backgroundColor: theme.surface, borderColor: theme.borderMedium }],
                ]}
                onPress={() => {
                  try {
                    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                  } catch {}
                  setActiveTab('ask');
                }}
              >
                <Text
                  style={[
                    styles.segmentText,
                    { color: activeTab === 'ask' ? theme.textPrimary : theme.textMuted },
                    activeTab === 'ask' && styles.segmentTextActive,
                  ]}
                  numberOfLines={1}
                >
                  {t.coachTabAsk}
                </Text>
              </TouchableOpacity>
            </View>

            {/* TAB 1: DAILY ADVICE */}
            {activeTab === 'daily' && (
              <View style={styles.tabContent}>
                {loadingAdvice ? (
                  <View style={[styles.loadingBox, { backgroundColor: theme.surface, borderColor: theme.border }]}>
                    <ActivityIndicator color={theme.primary} size="large" />
                    <Text style={[styles.loadingText, { color: theme.textSecondary }]}>
                      {t.smartCoachSyncing}
                    </Text>
                  </View>
                ) : coachData ? (
                  <View style={{ gap: 14 }}>
                    {/* Three-Bucket Synchronized Status Strip */}
                    <View style={[styles.threeBucketStrip, { backgroundColor: theme.surface, borderColor: theme.border }]}>
                      <View style={styles.bucketMetricCol}>
                        <Text style={[styles.bucketMetricLabel, { color: theme.textMuted }]}>
                          {t.rentAndMessPaid}
                        </Text>
                        <Text style={[styles.bucketMetricVal, { color: theme.textPrimary }]}>
                          ৳{coachData.fixed_obligations || 0}
                        </Text>
                      </View>
                      <View style={[styles.metricDivider, { backgroundColor: theme.border }]} />
                      <View style={styles.bucketMetricCol}>
                        <Text style={[styles.bucketMetricLabel, { color: theme.textMuted }]}>
                          {t.protectedSavings}
                        </Text>
                        <Text style={[styles.bucketMetricVal, { color: '#047857' }]}>
                          ৳{coachData.target_savings || 0}
                        </Text>
                      </View>
                      <View style={[styles.metricDivider, { backgroundColor: theme.border }]} />
                      <View style={styles.bucketMetricCol}>
                        <Text style={[styles.bucketMetricLabel, { color: theme.textMuted }]}>
                          {t.variablePocketLeft}
                        </Text>
                        <Text style={[styles.bucketMetricVal, { color: theme.primary }]}>
                          ৳{coachData.spendable_variable_pool || 0}
                        </Text>
                      </View>
                    </View>

                    {/* 1. Daily Budget Focus */}
                    <View style={[styles.adviceCard, { backgroundColor: theme.surface, borderColor: theme.border, shadowColor: theme.shadowColor }]}>
                      <View style={styles.cardHeader}>
                        <View style={[styles.iconCircle, { backgroundColor: theme.powder }]}>
                          <Ionicons name="compass-outline" size={18} color={theme.headerBlock} />
                        </View>
                        <Text style={[styles.cardTitle, { color: theme.textPrimary }]}>{t.dailyAdviceTitle}</Text>
                      </View>
                      <Text style={[styles.cardBody, { color: theme.textSecondary }]}>
                        {language === 'bn'
                          ? coachData.daily_budget_advice_bn
                          : coachData.daily_budget_advice_en}
                      </Text>
                    </View>

                    {/* 2. Category Cut Advice */}
                    <View style={[styles.adviceCard, { backgroundColor: theme.surface, borderColor: theme.border, shadowColor: theme.shadowColor }]}>
                      <View style={styles.cardHeader}>
                        <View style={[styles.iconCircle, { backgroundColor: theme.terracottaSoft }]}>
                          <Ionicons name="cut-outline" size={18} color={theme.primary} />
                        </View>
                        <Text style={[styles.cardTitle, { color: theme.textPrimary }]}>{t.categoryCutTitle}</Text>
                      </View>
                      <Text style={[styles.cardBody, { color: theme.textSecondary }]}>
                        {language === 'bn'
                          ? coachData.category_cut_advice_bn
                          : coachData.category_cut_advice_en}
                      </Text>
                    </View>

                    {/* 3. Bangladeshi Campus Hacks */}
                    <View style={[styles.adviceCard, { backgroundColor: theme.surface, borderColor: theme.border, shadowColor: theme.shadowColor }]}>
                      <View style={styles.cardHeader}>
                        <View style={[styles.iconCircle, { backgroundColor: isDark ? 'rgba(16, 185, 129, 0.2)' : '#D1FAE5' }]}>
                          <Ionicons name="bulb-outline" size={18} color="#10B981" />
                        </View>
                        <Text style={[styles.cardTitle, { color: theme.textPrimary }]}>{t.campusHacksTitle}</Text>
                      </View>
                      {(language === 'bn'
                        ? coachData.campus_tips_bn
                        : coachData.campus_tips_en
                      ).map((tip, i) => (
                        <View key={i} style={styles.tipRow}>
                          <View style={[styles.tipBullet, { backgroundColor: theme.primary }]} />
                          <Text style={[styles.tipText, { color: theme.textSecondary }]}>{tip}</Text>
                        </View>
                      ))}
                    </View>

                    {/* Refresh CTA */}
                    <TouchableOpacity
                      style={[styles.refreshBtn, { backgroundColor: theme.surface, borderColor: theme.borderMedium }]}
                      onPress={() => {
                        try {
                          Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                        } catch {}
                        loadAdvice();
                      }}
                      activeOpacity={0.7}
                    >
                      <Ionicons name="refresh" size={16} color={theme.primary} />
                      <Text style={[styles.refreshBtnText, { color: theme.textPrimary }]}>{t.refresh}</Text>
                    </TouchableOpacity>
                  </View>
                ) : null}
              </View>
            )}

            {/* TAB 2: ASK BEFORE I BUY SIMULATOR */}
            {activeTab === 'simulator' && (
              <View style={styles.tabContent}>
                <View style={[styles.simIntroCard, { backgroundColor: theme.surface, borderColor: theme.border }]}>
                  <View style={styles.simIntroHeader}>
                    <Ionicons name="calculator-outline" size={20} color={theme.primary} />
                    <Text style={[styles.simIntroTitle, { color: theme.textPrimary }]}>{t.simulatorTitle}</Text>
                  </View>
                  <Text style={[styles.simIntroDesc, { color: theme.textSecondary }]}>
                    {t.simulatorSubtitle}
                  </Text>
                </View>

                {/* Form Card */}
                <View style={[styles.formCard, { backgroundColor: theme.surface, borderColor: theme.border }]}>
                  <Text style={[styles.inputLabel, { color: theme.textSecondary }]}>
                    {language === 'bn' ? 'পণ্যের নাম' : 'Item / Expense Description'}
                  </Text>
                  <TextInput
                    style={[styles.input, { backgroundColor: isDark ? '#0F1722' : '#F8FAFC', borderColor: theme.border, color: theme.textPrimary }]}
                    placeholder={t.simItemPlaceholder}
                    placeholderTextColor={theme.textMuted}
                    value={simItem}
                    onChangeText={setSimItem}
                  />

                  <Text style={[styles.inputLabel, { color: theme.textSecondary }]}>
                    {language === 'bn' ? 'টাকার পরিমাণ' : 'Price / Amount (Tk)'}
                  </Text>
                  <TextInput
                    style={[styles.input, { backgroundColor: isDark ? '#0F1722' : '#F8FAFC', borderColor: theme.border, color: theme.textPrimary }]}
                    placeholder={t.simAmountPlaceholder}
                    placeholderTextColor={theme.textMuted}
                    keyboardType="numeric"
                    value={simAmount}
                    onChangeText={setSimAmount}
                  />

                  <Text style={[styles.inputLabel, { color: theme.textSecondary }]}>
                    {language === 'bn' ? 'ক্যাটাগরি' : 'Category'}
                  </Text>
                  <View style={styles.chipsRow}>
                    {SIM_CATEGORIES.map((c) => {
                      const isSelected = simCategory === c.key;
                      return (
                        <TouchableOpacity
                          key={c.key}
                          style={[
                            styles.categoryChip,
                            {
                              backgroundColor: isSelected
                                ? theme.terracottaSoft
                                : isDark
                                ? '#16191D'
                                : '#EDF4F9',
                              borderColor: isSelected ? theme.primary : theme.border,
                            },
                          ]}
                          onPress={() => {
                            try {
                              Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                            } catch {}
                            setSimCategory(c.key);
                          }}
                        >
                          <Ionicons
                            name={c.icon as any}
                            size={14}
                            color={isSelected ? theme.primary : theme.textSecondary}
                            style={{ marginRight: 4 }}
                          />
                          <Text
                            style={[
                              styles.chipText,
                              { color: isSelected ? theme.primary : theme.textSecondary },
                              isSelected && styles.chipTextActive,
                            ]}
                          >
                            {language === 'bn' ? c.bn : c.en}
                          </Text>
                        </TouchableOpacity>
                      );
                    })}
                  </View>

                  <TouchableOpacity
                    style={[styles.primaryTerracottaBtn, { backgroundColor: theme.primary }, simulating && styles.btnDisabled]}
                    onPress={handleSimulate}
                    disabled={simulating}
                    activeOpacity={0.85}
                  >
                    {simulating ? (
                      <ActivityIndicator color="#FFFFFF" />
                    ) : (
                      <>
                        <Ionicons name="calculator-outline" size={18} color="#FFFFFF" />
                        <Text style={styles.primaryTerracottaText}>{t.simBtn}</Text>
                      </>
                    )}
                  </TouchableOpacity>
                </View>

                {/* Simulation Results */}
                {simResult && (
                  <View style={[styles.resultCard, { backgroundColor: theme.surface, borderColor: theme.border, shadowColor: theme.shadowColor }]}>
                    <View
                      style={[
                        styles.verdictBanner,
                        {
                          backgroundColor: getVerdictStyle(simResult.verdict).bg,
                          borderColor: getVerdictStyle(simResult.verdict).border,
                        },
                      ]}
                    >
                      <Ionicons
                        name={getVerdictStyle(simResult.verdict).icon}
                        size={22}
                        color={getVerdictStyle(simResult.verdict).text}
                      />
                      <Text
                        style={[
                          styles.verdictText,
                          { color: getVerdictStyle(simResult.verdict).text },
                        ]}
                      >
                        {language === 'bn' ? simResult.verdict_bn : simResult.verdict}
                      </Text>
                    </View>

                    {/* Impact Matrix */}
                    <View style={styles.impactGrid}>
                      <View style={[styles.impactTile, { backgroundColor: isDark ? '#16191D' : '#F6F9FC', borderColor: theme.border }]}>
                        <Text style={[styles.impactLabel, { color: theme.textMuted }]}>{t.riskImpact}</Text>
                        <Text style={[styles.impactValue, { color: theme.textPrimary }]}>
                          {simResult.current_risk_pct}% → {simResult.simulated_risk_pct}%
                        </Text>
                        <Text
                          style={[
                            styles.impactDelta,
                            {
                              color:
                                simResult.risk_pct_change > 0
                                  ? theme.riskHigh
                                  : theme.riskLow,
                            },
                          ]}
                        >
                          {simResult.risk_pct_change > 0
                            ? `+${simResult.risk_pct_change}%`
                            : '0%'}
                        </Text>
                      </View>

                      <View style={[styles.impactTile, { backgroundColor: isDark ? '#16191D' : '#F6F9FC', borderColor: theme.border }]}>
                        <Text style={[styles.impactLabel, { color: theme.textMuted }]}>{t.dailySafeImpact}</Text>
                        <Text style={[styles.impactValue, { color: theme.textPrimary }]}>
                          ৳{simResult.current_daily_safe} → ৳{simResult.simulated_daily_safe}
                        </Text>
                        <Text
                          style={[
                            styles.impactDelta,
                            { color: theme.riskHigh },
                          ]}
                        >
                          {simResult.daily_safe_change} Tk/day
                        </Text>
                      </View>
                    </View>

                    {/* Target Savings Impact */}
                    {Boolean(simResult.savings_goal_impact) && (
                      <View style={[styles.aiBox, { backgroundColor: isDark ? '#16191D' : '#F6F9FC', borderLeftColor: '#10B981' }]}>
                        <Text style={[styles.aiBoxHeader, { color: '#10B981' }]}>
                          {language === 'bn' ? 'সঞ্চয় লক্ষ্য ও তহবিলের প্রভাব' : 'Savings Goal & Reserve Impact'}
                        </Text>
                        <Text style={[styles.aiBoxBody, { color: theme.textSecondary }]}>
                          {language === 'bn' ? simResult.savings_goal_impact_bn : simResult.savings_goal_impact}
                        </Text>
                      </View>
                    )}

                    {/* Coach Reasoning */}
                    <View style={[styles.aiBox, { backgroundColor: isDark ? '#16191D' : '#F6F9FC', borderLeftColor: theme.primary }]}>
                      <Text style={[styles.aiBoxHeader, { color: theme.primary }]}>{t.aiReasoning}</Text>
                      <Text style={[styles.aiBoxBody, { color: theme.textSecondary }]}>
                        {language === 'bn'
                          ? simResult.ai_reasoning_bn
                          : simResult.ai_reasoning_en}
                      </Text>
                    </View>

                    {/* Alternative */}
                    <View style={[styles.aiBox, { backgroundColor: isDark ? '#16191D' : '#F6F9FC', borderLeftColor: theme.headerBlock }]}>
                      <Text style={[styles.aiBoxHeader, { color: theme.headerBlock }]}>{t.alternativeSuggestions}</Text>
                      <Text style={[styles.aiBoxBody, { color: theme.textSecondary }]}>
                        {language === 'bn'
                          ? simResult.alternative_suggestion_bn
                          : simResult.alternative_suggestion_en}
                      </Text>
                    </View>
                  </View>
                )}
              </View>
            )}

            {/* TAB 3: INTERACTIVE SMART COACH Q&A */}
            {activeTab === 'ask' && (
              <View style={styles.tabContent}>
                {/* Fair-use Daily Query Limit Banner */}
                <View
                  style={[
                    styles.queryLimitBanner,
                    {
                      backgroundColor: theme.surface,
                      borderColor: theme.border,
                    },
                  ]}
                >
                  <View style={styles.queryLimitLeft}>
                    <Ionicons name="chatbubbles" size={18} color={theme.primary} />
                    <Text style={[styles.queryLimitTitle, { color: theme.textPrimary }]}>
                      {coachQueriesRemaining} / 10 {t.coachRemainingQueries}
                    </Text>
                  </View>
                  <Text style={[styles.queryResetText, { color: theme.textMuted }]}>
                    {language === 'bn' ? 'রিসেট: রাত ১২টা' : 'Resets at 00:00'}
                  </Text>
                </View>

                {/* Preset Suggested Questions */}
                <Text style={[styles.presetHeading, { color: theme.textSecondary }]}>
                  {language === 'bn' ? 'জনপ্রিয় প্রশ্নসমূহ:' : 'Suggested Student Questions:'}
                </Text>
                <View style={styles.presetWrap}>
                  {PRESET_QUESTIONS.map((pq, idx) => {
                    const text = language === 'bn' ? pq.bn : pq.en;
                    return (
                      <TouchableOpacity
                        key={idx}
                        style={[
                          styles.presetChipBtn,
                          {
                            backgroundColor: isDark ? '#16191D' : '#F6F9FC',
                            borderColor: theme.border,
                          },
                        ]}
                        onPress={() => handleAskCoach(text)}
                        activeOpacity={0.7}
                      >
                        <Ionicons name="help-circle-outline" size={14} color={theme.primary} />
                        <Text style={[styles.presetChipText, { color: theme.textPrimary }]}>{text}</Text>
                      </TouchableOpacity>
                    );
                  })}
                </View>

                {/* Question Input Box */}
                <View style={[styles.askInputCard, { backgroundColor: theme.surface, borderColor: theme.border }]}>
                  <TextInput
                    style={[
                      styles.askTextInput,
                      {
                        backgroundColor: isDark ? '#0F1722' : '#F8FAFC',
                        borderColor: theme.borderMedium,
                        color: theme.textPrimary,
                      },
                    ]}
                    placeholder={t.coachQueryPlaceholder}
                    placeholderTextColor={theme.textMuted}
                    value={questionInput}
                    onChangeText={setQuestionInput}
                    multiline
                    maxLength={200}
                  />

                  <TouchableOpacity
                    style={[
                      styles.askSubmitBtn,
                      { backgroundColor: theme.primary },
                      (!questionInput.trim() || askingCoach) && styles.btnDisabled,
                    ]}
                    onPress={() => handleAskCoach()}
                    disabled={!questionInput.trim() || askingCoach}
                    activeOpacity={0.85}
                  >
                    {askingCoach ? (
                      <ActivityIndicator color="#FFFFFF" size="small" />
                    ) : (
                      <>
                        <Ionicons name="paper-plane" size={16} color="#FFFFFF" />
                        <Text style={styles.askSubmitBtnText}>{t.askCoachBtn}</Text>
                      </>
                    )}
                  </TouchableOpacity>
                </View>

                {/* Q&A Thread History */}
                {qaHistory.length > 0 && (
                  <View style={styles.historyContainer}>
                    <Text style={[styles.historyHeading, { color: theme.textSecondary }]}>
                      {language === 'bn' ? 'পরামর্শ ইতিহাস' : 'Recent Insights'}
                    </Text>
                    {qaHistory.map((item, idx) => (
                      <View
                        key={idx}
                        style={[
                          styles.qaCard,
                          {
                            backgroundColor: theme.surface,
                            borderColor: theme.border,
                          },
                        ]}
                      >
                        {/* Student Question */}
                        <View style={styles.questionRow}>
                          <View style={[styles.chatAvatar, { backgroundColor: theme.powder }]}>
                            <Ionicons name="person" size={12} color={theme.headerBlock} />
                          </View>
                          <View style={styles.bubbleCol}>
                            <Text style={[styles.questionText, { color: theme.textPrimary }]}>{item.q}</Text>
                            <Text style={[styles.timestampText, { color: theme.textMuted }]}>{item.time}</Text>
                          </View>
                        </View>

                        {/* Coach Answer */}
                        <View style={[styles.answerRow, { backgroundColor: isDark ? '#16191D' : '#F8FAFC', borderColor: theme.borderSubtle }]}>
                          <View style={[styles.chatAvatar, { backgroundColor: theme.terracottaSoft }]}>
                            <Ionicons name="chatbubble-ellipses-outline" size={12} color={theme.primary} />
                          </View>
                          <View style={styles.bubbleCol}>
                            <Text style={[styles.coachNameText, { color: theme.primary }]}>
                              {t.smartCoachTitle}
                            </Text>
                            <Text style={[styles.answerText, { color: theme.textSecondary }]}>{item.a}</Text>
                          </View>
                        </View>
                      </View>
                    ))}
                  </View>
                )}
              </View>
            )}
          </View>
        )}
      </ScrollView>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  scrollContent: {
    paddingHorizontal: 16,
  },
  header: {
    marginBottom: 16,
  },
  headerTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  screenTitle: {
    fontSize: 20,
    fontWeight: '800',
    letterSpacing: -0.3,
  },
  screenSubtitle: {
    fontSize: 12,
    marginTop: 2,
  },
  proActiveBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 8,
    borderWidth: 1,
    gap: 4,
  },
  proActiveBadgeText: {
    fontSize: 10,
    fontWeight: '800',
  },
  proLockBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 8,
    borderWidth: 1,
    gap: 4,
  },
  proLockBadgeText: {
    fontSize: 10,
    fontWeight: '800',
  },

  // Locked View
  lockedContainer: {
    gap: 16,
  },
  lockHeroCard: {
    borderRadius: 24,
    borderWidth: 1,
    padding: 20,
    alignItems: 'center',
  },
  sparkleIconCircle: {
    width: 64,
    height: 64,
    borderRadius: 32,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 14,
  },
  lockTitle: {
    fontSize: 19,
    fontWeight: '700',
    letterSpacing: -0.3,
    textAlign: 'center',
    marginBottom: 6,
  },
  lockSub: {
    fontSize: 13,
    textAlign: 'center',
    lineHeight: 19,
    marginBottom: 18,
  },
  lockFeaturesList: {
    width: '100%',
    borderRadius: 18,
    borderWidth: 1,
    padding: 16,
    gap: 12,
    marginBottom: 20,
  },
  lockFeatureItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  checkCircle: {
    width: 20,
    height: 20,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
  },
  lockFeatureText: {
    fontSize: 13,
    fontWeight: '500',
    lineHeight: 18,
    flex: 1,
  },
  primaryTerracottaBtn: {
    width: '100%',
    height: 48,
    borderRadius: 24,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    marginBottom: 12,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 8,
    elevation: 3,
  },
  primaryTerracottaText: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '700',
    letterSpacing: 0.2,
  },
  demoUnlockBtn: {
    width: '100%',
    height: 44,
    borderRadius: 22,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  demoUnlockBtnText: {
    fontSize: 13,
    fontWeight: '600',
    letterSpacing: 0.1,
  },
  teaserCard: {
    borderRadius: 22,
    borderWidth: 1,
    padding: 18,
    gap: 12,
  },
  teaserTop: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  teaserLabel: {
    fontSize: 11,
    fontWeight: '700',
    letterSpacing: 0.8,
  },
  teaserItem: {
    borderRadius: 16,
    borderWidth: 1,
    padding: 14,
  },
  teaserItemHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginBottom: 4,
  },
  teaserTitle: {
    fontSize: 14,
    fontWeight: '700',
    letterSpacing: -0.2,
  },
  teaserBody: {
    fontSize: 12,
    lineHeight: 18,
  },

  // Segment Controller
  segmentContainer: {
    flexDirection: 'row',
    borderRadius: 14,
    borderWidth: 1,
    padding: 4,
    marginBottom: 16,
    gap: 4,
  },
  segmentBtn: {
    flex: 1,
    height: 38,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 2,
  },
  segmentBtnActive: {
    borderWidth: 1,
  },
  segmentText: {
    fontSize: 11,
    fontWeight: '600',
    textAlign: 'center',
  },
  segmentTextActive: {
    fontWeight: '800',
  },
  tabContent: {
    gap: 14,
  },
  loadingBox: {
    borderRadius: 20,
    borderWidth: 1,
    padding: 30,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 12,
  },
  loadingText: {
    fontSize: 12,
    textAlign: 'center',
  },

  // Three-Bucket Strip in Advice Tab
  threeBucketStrip: {
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: 16,
    borderWidth: 1,
    paddingVertical: 12,
    paddingHorizontal: 8,
  },
  bucketMetricCol: {
    flex: 1,
    alignItems: 'center',
  },
  bucketMetricLabel: {
    fontSize: 10,
    fontWeight: '600',
    marginBottom: 2,
    textAlign: 'center',
  },
  bucketMetricVal: {
    fontSize: 13,
    fontWeight: '800',
    fontVariant: ['tabular-nums'],
  },
  metricDivider: {
    width: 1,
    height: 24,
  },

  // Advice Cards
  adviceCard: {
    borderRadius: 20,
    borderWidth: 1,
    padding: 16,
  },
  cardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    marginBottom: 10,
  },
  iconCircle: {
    width: 32,
    height: 32,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
  },
  cardTitle: {
    fontSize: 14,
    fontWeight: '700',
    letterSpacing: -0.1,
  },
  cardBody: {
    fontSize: 13,
    lineHeight: 19,
  },
  tipRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 8,
    marginTop: 8,
  },
  tipBullet: {
    width: 6,
    height: 6,
    borderRadius: 3,
    marginTop: 6,
  },
  tipText: {
    fontSize: 12,
    lineHeight: 18,
    flex: 1,
  },
  refreshBtn: {
    height: 44,
    borderRadius: 14,
    borderWidth: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
  },
  refreshBtnText: {
    fontSize: 13,
    fontWeight: '600',
  },

  // Simulator Tab
  simIntroCard: {
    borderRadius: 18,
    borderWidth: 1,
    padding: 16,
  },
  simIntroHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 4,
  },
  simIntroTitle: {
    fontSize: 15,
    fontWeight: '700',
    letterSpacing: -0.2,
  },
  simIntroDesc: {
    fontSize: 12,
    lineHeight: 18,
  },
  formCard: {
    borderRadius: 20,
    borderWidth: 1,
    padding: 16,
  },
  inputLabel: {
    fontSize: 11,
    fontWeight: '700',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    marginBottom: 6,
    marginTop: 6,
  },
  input: {
    height: 44,
    borderRadius: 12,
    borderWidth: 1,
    paddingHorizontal: 12,
    fontSize: 13,
    marginBottom: 8,
  },
  chipsRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 6,
    marginBottom: 16,
    marginTop: 4,
  },
  categoryChip: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 10,
    borderWidth: 1,
  },
  chipText: {
    fontSize: 11,
    fontWeight: '600',
  },
  chipTextActive: {
    fontWeight: '700',
  },
  btnDisabled: {
    opacity: 0.6,
  },

  // Simulation Results
  resultCard: {
    borderRadius: 20,
    borderWidth: 1,
    padding: 16,
    gap: 12,
  },
  verdictBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    padding: 12,
    borderRadius: 14,
    borderWidth: 1.5,
  },
  verdictText: {
    fontSize: 14,
    fontWeight: '700',
    letterSpacing: 0.2,
  },
  impactGrid: {
    flexDirection: 'row',
    gap: 10,
  },
  impactTile: {
    flex: 1,
    borderRadius: 12,
    borderWidth: 1,
    padding: 10,
    alignItems: 'center',
  },
  impactLabel: {
    fontSize: 10,
    fontWeight: '600',
    marginBottom: 4,
    textAlign: 'center',
  },
  impactValue: {
    fontSize: 12,
    fontWeight: '700',
    fontVariant: ['tabular-nums'],
    marginBottom: 2,
  },
  impactDelta: {
    fontSize: 11,
    fontWeight: '600',
  },
  aiBox: {
    borderRadius: 12,
    borderLeftWidth: 3,
    padding: 12,
  },
  aiBoxHeader: {
    fontSize: 11,
    fontWeight: '700',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    marginBottom: 4,
  },
  aiBoxBody: {
    fontSize: 13,
    lineHeight: 19,
  },

  // Interactive Coach Q&A Tab
  queryLimitBanner: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 12,
    borderRadius: 14,
    borderWidth: 1,
  },
  queryLimitLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  queryLimitTitle: {
    fontSize: 12,
    fontWeight: '700',
  },
  queryResetText: {
    fontSize: 11,
  },
  presetHeading: {
    fontSize: 11,
    fontWeight: '700',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  presetWrap: {
    gap: 6,
  },
  presetChipBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    padding: 10,
    borderRadius: 12,
    borderWidth: 1,
  },
  presetChipText: {
    fontSize: 12,
    flex: 1,
  },
  askInputCard: {
    borderRadius: 18,
    borderWidth: 1,
    padding: 14,
    gap: 10,
  },
  askTextInput: {
    height: 72,
    borderRadius: 12,
    borderWidth: 1,
    padding: 12,
    fontSize: 13,
    textAlignVertical: 'top',
  },
  askSubmitBtn: {
    height: 46,
    borderRadius: 23,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
  },
  askSubmitBtnText: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '700',
    letterSpacing: 0.2,
  },
  historyContainer: {
    gap: 10,
    marginTop: 4,
  },
  historyHeading: {
    fontSize: 11,
    fontWeight: '700',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  qaCard: {
    borderRadius: 16,
    borderWidth: 1,
    padding: 12,
    gap: 10,
  },
  questionRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 8,
  },
  chatAvatar: {
    width: 24,
    height: 24,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 2,
  },
  bubbleCol: {
    flex: 1,
  },
  questionText: {
    fontSize: 13,
    fontWeight: '600',
    lineHeight: 18,
  },
  timestampText: {
    fontSize: 10,
    marginTop: 2,
  },
  answerRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 8,
    padding: 10,
    borderRadius: 12,
    borderWidth: 1,
  },
  coachNameText: {
    fontSize: 12,
    fontWeight: '700',
    marginBottom: 2,
  },
  answerText: {
    fontSize: 13,
    lineHeight: 19,
  },
});
