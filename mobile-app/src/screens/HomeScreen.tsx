import React, { useState, useEffect, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  RefreshControl,
  Platform,
  StatusBar,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useTheme } from '../constants/ThemeContext';
import { TRANSLATIONS, Language } from '../constants/translations';
import { BRANDING } from '../constants/branding';
import { BrandLogo } from '../components/BrandLogo';
import { GlassCard } from '../components/GlassCard';
import { DashboardData, UserData, SavingsGoal, toggleGoalPause } from '../services/api';
import { RiskDetailsModal } from '../components/RiskDetailsModal';
import { FeatureWalkthroughModal } from '../components/FeatureWalkthroughModal';
import { TargetSavingsModal } from '../components/TargetSavingsModal';
import { SavingsGoalCard } from '../components/SavingsGoalCard';
import { CreateGoalModal } from '../components/CreateGoalModal';
import { BoostGoalModal } from '../components/BoostGoalModal';
import { LeftoverSweepModal } from '../components/LeftoverSweepModal';
import { UserAvatar } from '../components/UserAvatar';
import { DisciplineTracker } from '../components/DisciplineTracker';
import { CompactRiskGauge } from '../components/CompactRiskGauge';
import { MessMealTrackerModal } from '../components/MessMealTrackerModal';
import { sendHighRiskAlertNotification } from '../services/notifications';
import { getRandomQuote, getNextQuote, MotivationalQuote } from '../constants/quotes';

interface HomeScreenProps {
  user: UserData;
  dashboard: DashboardData;
  language: Language;
  onRefresh: () => void;
  refreshing: boolean;
  onOpenLogModal: () => void;
  onOpenIncomeModal: () => void;
  onOpenProModal: () => void;
  onNavigateToTransactions: () => void;
  onNavigateToCoach?: () => void;
  onNavigateToProfile?: () => void;
  onToggleLanguage: () => void;
}

export const HomeScreen: React.FC<HomeScreenProps> = ({
  user,
  dashboard,
  language,
  onRefresh,
  refreshing,
  onOpenLogModal,
  onOpenIncomeModal,
  onOpenProModal,
  onNavigateToTransactions,
  onNavigateToCoach,
  onNavigateToProfile,
  onToggleLanguage,
}) => {
  const { isDark, theme, toggleTheme } = useTheme();
  const [currentQuote, setCurrentQuote] = useState<MotivationalQuote>(getRandomQuote());
  const [savingsModalVisible, setSavingsModalVisible] = useState(false);
  const [activeGoal, setActiveGoal] = useState<SavingsGoal | null>(dashboard.active_goal || null);
  const [createGoalVisible, setCreateGoalVisible] = useState(false);
  const [boostGoalVisible, setBoostGoalVisible] = useState(false);
  const [sweepModalVisible, setSweepModalVisible] = useState(false);
  const [selectedGoal, setSelectedGoal] = useState<SavingsGoal | null>(null);
  const [messMealModalVisible, setMessMealModalVisible] = useState(false);

  const t = TRANSLATIONS[language];
  const { current_risk } = dashboard;
  const insets = useSafeAreaInsets();
  const scrollRef = useRef<any>(null);
  const [riskDetailsVisible, setRiskDetailsVisible] = useState(false);
  const [walkthroughVisible, setWalkthroughVisible] = useState(false);

  const formatGreetingName = (fullName?: string): string => {
    if (!fullName) return 'Student';
    const parts = fullName.trim().split(/\s+/);
    if (parts.length > 1 && /^(md\.?|mohammad|mohammed|mst\.?)$/i.test(parts[0])) {
      return `${parts[0]} ${parts[1]}`;
    }
    return parts[0];
  };

  const getRiskInsightSummary = () => {
    const isCrit = current_risk.risk_score_pct >= 70;
    const isMod = current_risk.risk_score_pct >= 40 && current_risk.risk_score_pct < 70;
    const topFeature = current_risk.top_drivers && current_risk.top_drivers.length > 0
      ? (language === 'bn' ? current_risk.top_drivers[0].feature_bn : current_risk.top_drivers[0].feature)
      : '';

    if (isCrit) {
      const reason = topFeature || (language === 'bn' ? 'সংকুচিত দৈনিক বাজেট' : 'Tight daily cap');
      return language === 'bn'
        ? `উচ্চ ঝুঁকি: ${reason} — সতর্ক থাকুন`
        : `High Risk: ${reason} — Tap for details`;
    }
    if (isMod) {
      return language === 'bn'
        ? `মাঝারি ঝুঁকি: প্রতিদিনের খরচ নিয়ন্ত্রণে রাখুন`
        : `Moderate Risk: Keep spending paced within daily limit`;
    }
    return language === 'bn'
      ? `কম ঝুঁকি: বাজেট সঠিক ট্র্যাকে রয়েছে`
      : `Low Risk: Spending healthy & on track`;
  };

  useEffect(() => {
    if (dashboard.active_goal) {
      setActiveGoal(dashboard.active_goal);
    }
  }, [dashboard.active_goal]);

  const statusBarPad = Math.max(insets.top, Platform.OS === 'android' ? (StatusBar.currentHeight || 36) : 44) + 8;

  // Check and fire high-risk push alert if risk is >= 70%
  useEffect(() => {
    if (current_risk?.risk_score_pct && current_risk.risk_score_pct >= 70) {
      sendHighRiskAlertNotification(current_risk.risk_score_pct, language);
    }
  }, [current_risk?.risk_score_pct, language]);

  const handleToggleGoalPause = async (goal: SavingsGoal) => {
    try {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
      const updated = await toggleGoalPause(goal.id, user.id);
      setActiveGoal(updated);
      onRefresh();
    } catch (e: any) {
      console.warn('Pause toggle error:', e);
    }
  };

  const handleOpenBoost = (goal: SavingsGoal) => {
    setSelectedGoal(goal);
    setBoostGoalVisible(true);
  };

  const handleOpenSweep = (goal: SavingsGoal) => {
    setSelectedGoal(goal);
    setSweepModalVisible(true);
  };

  const handleGoalUpdated = (updated: SavingsGoal) => {
    setActiveGoal(updated);
    onRefresh();
  };

  const handleNextQuote = () => {
    try {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    } catch {}
    setCurrentQuote(getNextQuote(currentQuote.id));
  };

  const handlePullToRefresh = () => {
    try {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    } catch {}
    setCurrentQuote(getRandomQuote());
    onRefresh();
  };

  const handleThemePress = () => {
    try {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    } catch {}
    toggleTheme();
  };

  const getBurnStatusDetails = () => {
    const isCrit = current_risk.risk_score_pct >= 70;
    const isMod = current_risk.risk_score_pct >= 40 && current_risk.risk_score_pct < 70;

    if (dashboard.burn_rate_status === 'critical' || isCrit) {
      return {
        text: theme.riskHigh,
        bg: isDark ? 'rgba(239, 68, 68, 0.16)' : '#FEE2E2',
        border: theme.riskHigh,
        label: language === 'bn' ? 'সতর্কতা প্রয়োজন' : 'Caution Needed',
      };
    }
    if (dashboard.burn_rate_status === 'caution' || isMod) {
      return {
        text: theme.riskModerate,
        bg: isDark ? 'rgba(245, 158, 11, 0.16)' : '#FEF3C7',
        border: theme.riskModerate,
        label: language === 'bn' ? 'নিয়ন্ত্রিত গতি' : 'Paced Track',
      };
    }
    return {
      text: theme.riskLow,
      bg: isDark ? 'rgba(16, 185, 129, 0.16)' : '#E6F9F0',
      border: theme.riskLow,
      label: language === 'bn' ? 'সঠিক গতি' : 'On Track',
    };
  };

  const burnDetails = getBurnStatusDetails();
  const isPro = Boolean(dashboard.is_pro || user.is_pro);

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
      default:
        return 'wallet-outline';
    }
  };

  return (
    <View style={[styles.container, { backgroundColor: theme.canvas }]}>
      <ScrollView
        ref={scrollRef}
        contentContainerStyle={[
          styles.scrollContent,
          { paddingTop: statusBarPad, paddingBottom: 140 + insets.bottom },
        ]}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={handlePullToRefresh}
            colors={[theme.primary]}
            tintColor={theme.primary}
            progressBackgroundColor={isDark ? '#1E293B' : '#FFFFFF'}
          />
        }
      >
        {/* 1. Header with App Title, Greeting, and User Profile Avatar */}
        <View style={styles.headerBar}>
          <View style={styles.headerLeft}>
            <BrandLogo size="sm" />
            <View>
              <Text style={[styles.dashboardTitle, { color: theme.textSecondary }]}>
                {language === 'bn' ? 'ড্যাশবোর্ড' : 'Dashboard'}
              </Text>
              <Text style={[styles.greetingName, { color: theme.textPrimary }]}>
                {t.greeting}, {formatGreetingName(user.full_name)}
              </Text>
            </View>
          </View>

          <View style={styles.headerRight}>
            <TouchableOpacity
              style={[
                styles.infoGuideBtn,
                {
                  backgroundColor: isDark ? 'rgba(255, 255, 255, 0.08)' : '#E2EBF2',
                  borderColor: theme.border,
                },
              ]}
              onPress={() => {
                try {
                  Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                } catch {}
                setWalkthroughVisible(true);
              }}
              activeOpacity={0.75}
              accessibilityRole="button"
              accessibilityLabel="Open Feature Guide"
            >
              <Ionicons name="information" size={20} color={theme.slateBlue} />
            </TouchableOpacity>

            <UserAvatar
              user={user}
              size={42}
              onPress={onNavigateToProfile}
              showBadge={true}
            />
          </View>
        </View>

        {/* 2. 'Daily Tips' Banner Card (Soft powder slate-blue banner + Safe Daily Spend) */}
        <View style={styles.dailyTipsCompoundWrapper}>
          {/* Top Banner (Dusty Slate-Blue / Powder Accent) */}
          <View
            style={[
              styles.topBannerStrip,
              {
                backgroundColor: isDark ? 'rgba(30, 46, 66, 0.95)' : theme.slateBlueTint,
                borderColor: isDark ? 'rgba(255, 255, 255, 0.12)' : theme.border,
              },
            ]}
          >
            <View style={styles.bannerLeft}>
              <Ionicons
                name="shield-checkmark"
                size={18}
                color={isDark ? '#38BDF8' : theme.slateBlue}
              />
              <Text style={[styles.bannerHeading, { color: isDark ? '#F8FAFC' : theme.slateBlue }]} numberOfLines={1}>
                {t.dailySafeSpend}
              </Text>
            </View>

            <View style={[styles.burnPill, { backgroundColor: burnDetails.bg, borderColor: burnDetails.border }]}>
              <Text style={[styles.burnPillText, { color: burnDetails.text }]}>
                {burnDetails.label}
              </Text>
            </View>
          </View>

          {/* Overlapping Main Card */}
          <GlassCard style={styles.dailyTipsMainCard}>
            {/* Side-by-Side Hero Split (Safe Daily Limit Left + Compact Risk Gauge Right) */}
            <View style={styles.heroSplitRow}>
              {/* Left Column: Big Amount, Days Left, Target Savings Pill */}
              <View style={styles.heroLeftCol}>
                <View style={styles.amountDisplayRow}>
                  <Text style={[styles.currencySymbol, { color: theme.primary }]}>৳</Text>
                  <Text style={[styles.amountBig, { color: theme.textPrimary }]}>
                    {dashboard.daily_safe_to_spend}
                  </Text>
                  <Text style={[styles.perDayText, { color: theme.textSecondary }]}>
                    / {language === 'bn' ? 'দিন' : 'day'}
                  </Text>
                </View>

                <Text style={[styles.daysRemainText, { color: theme.textSecondary }]}>
                  {language === 'bn'
                    ? `বাকি ${dashboard.days_remaining} দিনের মেস/ভাড়ামুক্ত দৈনিক বরাদ্দ`
                    : `${dashboard.days_remaining} days remaining in month`}
                </Text>

                {/* Clean Interactive Target Savings Pill */}
                <TouchableOpacity
                  style={[
                    styles.targetSavingsPill,
                    {
                      backgroundColor: isDark ? 'rgba(244, 123, 78, 0.14)' : '#FDECE4',
                      borderColor: isDark ? 'rgba(244, 123, 78, 0.35)' : 'rgba(242, 122, 73, 0.45)',
                    },
                  ]}
                  onPress={() => {
                    try {
                      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                    } catch {}
                    setSavingsModalVisible(true);
                  }}
                  activeOpacity={0.8}
                >
                  <Text style={[styles.targetSavingsPillText, { color: theme.primary }]}>
                    {dashboard.target_savings > 0
                      ? `${language === 'bn' ? 'সঞ্চয়' : 'Target'}: ৳${Math.round(dashboard.target_savings).toLocaleString()}`
                      : `${language === 'bn' ? 'সঞ্চয় লক্ষ্য নির্ধারণ' : 'Set Savings Goal'}`}
                  </Text>
                  <Ionicons name="pencil-outline" size={11} color={theme.primary} style={{ marginLeft: 5 }} />
                </TouchableOpacity>
              </View>

              {/* Right Column (flex: 0.85): Compact Live Risk Gauge */}
              <View style={styles.heroRightCol}>
                <CompactRiskGauge
                  score={current_risk.risk_score_pct}
                  tier={current_risk.risk_tier}
                  tierBn={current_risk.risk_tier_bn}
                  language={language}
                  size={108}
                  strokeWidth={9}
                  onPress={() => {
                    try { Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light); } catch {}
                    setRiskDetailsVisible(true);
                  }}
                />
              </View>
            </View>

            {/* Dipping into Savings Warning Banner */}
            {dashboard.dipping_into_savings && (
              <View
                style={[
                  styles.savingsAlertBanner,
                  {
                    backgroundColor: isDark ? 'rgba(244, 123, 78, 0.22)' : '#FDECE4',
                    borderColor: theme.primary,
                  },
                ]}
              >
                <Ionicons name="warning" size={18} color={theme.primary} />
                <Text style={[styles.savingsAlertText, { color: theme.primary }]}>
                  {language === 'bn'
                    ? (dashboard.savings_warning_bn || t.dippingSavingsAlert)
                    : (dashboard.savings_warning_en || t.dippingSavingsAlert)}
                </Text>
              </View>
            )}

            {/* Clean Inspiring Financial Mindset Card (Tap to change quote) */}
            <TouchableOpacity
              style={[
                styles.quoteInnerBlock,
                {
                  backgroundColor: isDark ? 'rgba(255, 255, 255, 0.04)' : 'rgba(90, 130, 150, 0.06)',
                  borderColor: isDark ? 'rgba(255, 255, 255, 0.08)' : 'rgba(90, 130, 150, 0.15)',
                },
              ]}
              onPress={handleNextQuote}
              activeOpacity={0.8}
              accessibilityRole="button"
              accessibilityLabel="Tap to cycle daily mindset quote"
            >
              <Text style={[styles.quoteMainText, { color: theme.textPrimary }]}>
                “{language === 'bn' ? currentQuote.bn : currentQuote.en}”
              </Text>
            </TouchableOpacity>

            {/* Compact Risk Insight Strip Inside Hero Card (Tap for details) */}
            <TouchableOpacity
              style={[
                styles.riskInsightPill,
                {
                  backgroundColor: isDark
                    ? 'rgba(255, 255, 255, 0.04)'
                    : (current_risk.risk_score_pct >= 70 ? '#FEF2F2' : current_risk.risk_score_pct >= 40 ? '#FFFBEB' : '#ECFDF5'),
                  borderColor: isDark
                    ? 'rgba(255, 255, 255, 0.08)'
                    : (current_risk.risk_score_pct >= 70 ? 'rgba(244, 123, 78, 0.35)' : current_risk.risk_score_pct >= 40 ? 'rgba(245, 158, 11, 0.35)' : 'rgba(16, 185, 129, 0.35)'),
                },
              ]}
              onPress={() => {
                try { Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light); } catch {}
                setRiskDetailsVisible(true);
              }}
              activeOpacity={0.8}
            >
              <View style={styles.riskInsightLeft}>
                <Ionicons
                  name={current_risk.risk_score_pct >= 70 ? 'warning' : current_risk.risk_score_pct >= 40 ? 'alert-circle' : 'shield-checkmark'}
                  size={15}
                  color={current_risk.risk_score_pct >= 70 ? theme.primary : current_risk.risk_score_pct >= 40 ? theme.riskModerate : theme.riskLow}
                />
                <Text style={[styles.riskInsightText, { color: theme.textPrimary }]} numberOfLines={2}>
                  {getRiskInsightSummary()}
                </Text>
              </View>
              <View style={styles.riskInsightRight}>
                <Text style={[styles.riskInsightTapText, { color: theme.textSecondary }]}>
                  {language === 'bn' ? 'বিস্তারিত' : 'Details'}
                </Text>
                <Ionicons name="chevron-forward" size={13} color={theme.textSecondary} />
              </View>
            </TouchableOpacity>

            {/* 3-Column Mini Breakdown Strip (Three-Bucket Architecture) */}
            <View style={[styles.metricStrip, { borderTopColor: isDark ? 'rgba(255, 255, 255, 0.08)' : theme.border, marginBottom: 0 }]}>
              {/* Bucket 1: Rent & Mess Paid */}
              <TouchableOpacity
                style={styles.metricItem}
                onPress={() => {
                  try { Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light); } catch {}
                  setMessMealModalVisible(true);
                }}
                activeOpacity={0.75}
              >
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 3 }}>
                  <Text style={[styles.metricItemLabel, { color: theme.textSecondary }]} numberOfLines={1}>
                    {dashboard.enable_mess_meals !== false
                      ? t.rentAndMessPaid
                      : (language === 'bn' ? 'বাসাভাড়া ও নির্দিষ্ট' : 'Housing & Fixed')}
                  </Text>
                  <Ionicons
                    name={dashboard.enable_mess_meals !== false ? 'restaurant-outline' : 'home-outline'}
                    size={10}
                    color={theme.primary}
                  />
                </View>
                <Text style={[styles.metricItemVal, { color: isDark ? '#E2E8F0' : '#475569' }]}>
                  ৳{dashboard.fixed_obligations_spent !== undefined
                    ? dashboard.fixed_obligations_spent
                    : (dashboard.category_breakdown?.['Rent'] || 0)}
                </Text>
                {dashboard.enable_mess_meals !== false ? (
                  dashboard.fixed_rent !== undefined && dashboard.mess_meal_fixed !== undefined && (dashboard.fixed_rent > 0 || dashboard.mess_meal_fixed > 0) ? (
                    <Text style={{ fontSize: 9, color: theme.textMuted, marginTop: 1 }} numberOfLines={1}>
                      {dashboard.fixed_rent > 0 && dashboard.mess_meal_fixed > 0
                        ? language === 'bn'
                          ? `ভাড়া ${dashboard.fixed_rent >= 1000 ? (dashboard.fixed_rent / 1000).toFixed(dashboard.fixed_rent % 1000 === 0 ? 0 : 1) + 'k' : '৳' + dashboard.fixed_rent} + মেস ${dashboard.mess_meal_fixed >= 1000 ? (dashboard.mess_meal_fixed / 1000).toFixed(dashboard.mess_meal_fixed % 1000 === 0 ? 0 : 1) + 'k' : '৳' + dashboard.mess_meal_fixed}`
                          : `Rent ${dashboard.fixed_rent >= 1000 ? (dashboard.fixed_rent / 1000).toFixed(dashboard.fixed_rent % 1000 === 0 ? 0 : 1) + 'k' : '৳' + dashboard.fixed_rent} + Meal ${dashboard.mess_meal_fixed >= 1000 ? (dashboard.mess_meal_fixed / 1000).toFixed(dashboard.mess_meal_fixed % 1000 === 0 ? 0 : 1) + 'k' : '৳' + dashboard.mess_meal_fixed}`
                        : dashboard.fixed_rent > 0
                        ? language === 'bn'
                          ? `ভাড়া ৳${dashboard.fixed_rent}`
                          : `Rent ৳${dashboard.fixed_rent}`
                        : language === 'bn'
                        ? `মেস খাবার ৳${dashboard.mess_meal_fixed}`
                        : `Meals ৳${dashboard.mess_meal_fixed}`}
                    </Text>
                  ) : null
                ) : (
                  <Text style={{ fontSize: 9, color: theme.textMuted, marginTop: 1 }} numberOfLines={1}>
                    {dashboard.fixed_rent && dashboard.fixed_rent > 0
                      ? language === 'bn'
                        ? `ভাড়া ৳${dashboard.fixed_rent}`
                        : `Rent ৳${dashboard.fixed_rent}`
                      : language === 'bn'
                      ? 'খাবার দৈনিক খরচে'
                      : 'Food via daily'}
                  </Text>
                )}
              </TouchableOpacity>

              <View style={[styles.metricDivider, { backgroundColor: isDark ? 'rgba(255, 255, 255, 0.08)' : theme.border }]} />

              {/* Bucket 2: Protected Savings */}
              <View style={styles.metricItem}>
                <Text style={[styles.metricItemLabel, { color: theme.textSecondary }]}>
                  {t.protectedSavings}
                </Text>
                <Text style={[styles.metricItemVal, { color: isDark ? '#34D399' : '#059669' }]}>
                  ৳{dashboard.target_savings || 0}
                </Text>
              </View>

              <View style={[styles.metricDivider, { backgroundColor: isDark ? 'rgba(255, 255, 255, 0.08)' : theme.border }]} />

              {/* Bucket 3: Variable Pocket Left */}
              <View style={styles.metricItem}>
                <Text style={[styles.metricItemLabel, { color: theme.textSecondary }]}>
                  {t.variablePocketLeft}
                </Text>
                <Text
                  style={[
                    styles.metricItemVal,
                    {
                      color: (dashboard.spendable_variable_pool !== undefined
                        ? dashboard.spendable_variable_pool
                        : dashboard.remaining_balance) <= 0
                        ? theme.primary
                        : (isDark ? '#38BDF8' : theme.slateBlue),
                    },
                  ]}
                >
                  ৳{dashboard.spendable_variable_pool !== undefined
                    ? dashboard.spendable_variable_pool
                    : dashboard.remaining_balance}
                </Text>
              </View>
            </View>
          </GlassCard>
        </View>

        {/* 2.3 7-Day Discipline Tracker Strip */}
        <DisciplineTracker
          streakDays={dashboard.on_track_streak || 5}
          language={language}
        />

        {/* 2.5 Dream Goal Vault Card (Target Savings Protection) */}
        <SavingsGoalCard
          goal={activeGoal}
          language={language}
          onOpenBoost={handleOpenBoost}
          onTogglePause={handleToggleGoalPause}
          onCreateGoal={() => setCreateGoalVisible(true)}
          onOpenSweep={handleOpenSweep}
          leftoverSweepAmount={Math.max(0, dashboard.spendable_variable_pool > 0 ? 350 : 0)}
        />
      </ScrollView>

      {/* Target Savings Modal */}
      <TargetSavingsModal
        visible={savingsModalVisible}
        currentSavings={dashboard.target_savings || 0}
        userId={user.id}
        language={language}
        onClose={() => setSavingsModalVisible(false)}
        onSaved={() => onRefresh()}
      />

      {/* Goal Modals */}
      <CreateGoalModal
        visible={createGoalVisible}
        userId={user.id}
        language={language}
        onClose={() => setCreateGoalVisible(false)}
        onGoalCreated={handleGoalUpdated}
      />

      <BoostGoalModal
        visible={boostGoalVisible}
        goal={selectedGoal || activeGoal}
        userId={user.id}
        language={language}
        onClose={() => setBoostGoalVisible(false)}
        onGoalBoosted={handleGoalUpdated}
      />

      <LeftoverSweepModal
        visible={sweepModalVisible}
        goal={selectedGoal || activeGoal}
        userId={user.id}
        sweepAmount={Math.max(0, dashboard.spendable_variable_pool > 0 ? 350 : 0)}
        language={language}
        onClose={() => setSweepModalVisible(false)}
        onSwept={handleGoalUpdated}
      />

      {/* Financial Risk Details Bottom-Sheet Modal */}
      <RiskDetailsModal
        visible={riskDetailsVisible}
        onClose={() => setRiskDetailsVisible(false)}
        currentRisk={current_risk}
        dailyLimit={dashboard.daily_safe_to_spend}
        daysRemaining={dashboard.days_remaining}
        language={language}
      />

      {/* Interactive Feature Walkthrough Guide Modal */}
      <FeatureWalkthroughModal
        visible={walkthroughVisible}
        onClose={() => setWalkthroughVisible(false)}
        language={language}
      />

      {/* Personal Mess Meal & Advance Deposit Assistant Modal */}
      <MessMealTrackerModal
        visible={messMealModalVisible}
        onClose={() => setMessMealModalVisible(false)}
        userId={user.id}
        language={language}
        onSuccess={onRefresh}
      />
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
  headerBar: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  headerLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  dashboardTitle: {
    fontSize: 11,
    fontWeight: '700',
    textTransform: 'uppercase',
    letterSpacing: 0.6,
  },
  greetingName: {
    fontSize: 18,
    fontWeight: '800',
    letterSpacing: -0.3,
  },
  headerRight: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  infoGuideBtn: {
    width: 38,
    height: 38,
    borderRadius: 19,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
  },
  streakPill: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 9,
    paddingVertical: 6,
    borderRadius: 16,
    borderWidth: 1,
    gap: 4,
  },
  streakEmoji: {
    fontSize: 12,
  },
  streakText: {
    fontSize: 11,
    fontWeight: '800',
  },
  avatarBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarInitials: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '800',
  },
  headerIconBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  langPill: {
    paddingHorizontal: 10,
    paddingVertical: 7,
    borderRadius: 18,
    borderWidth: 1,
  },
  langPillText: {
    fontSize: 12,
    fontWeight: '800',
  },

  // Daily Tips Compound Card
  dailyTipsCompoundWrapper: {
    marginBottom: 16,
  },
  topBannerStrip: {
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    borderWidth: 1,
    borderBottomWidth: 0,
    paddingHorizontal: 16,
    paddingTop: 12,
    paddingBottom: 24,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  bannerLeft: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginRight: 6,
  },
  bannerHeading: {
    fontSize: 13,
    fontWeight: '800',
    letterSpacing: -0.2,
    flexShrink: 1,
  },
  burnPill: {
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 12,
    borderWidth: 1,
    flexShrink: 0,
  },
  burnPillText: {
    fontSize: 11,
    fontWeight: '800',
  },
  dailyTipsMainCard: {
    marginTop: -14,
    borderRadius: 24,
  },
  heroSplitRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  heroLeftCol: {
    flex: 1.15,
    paddingRight: 8,
    justifyContent: 'center',
  },
  heroRightCol: {
    flex: 0.85,
    alignItems: 'center',
    justifyContent: 'center',
  },
  amountDisplayRow: {
    flexDirection: 'row',
    alignItems: 'baseline',
    gap: 4,
    marginBottom: 2,
  },
  currencySymbol: {
    fontSize: 20,
    fontWeight: '800',
  },
  amountBig: {
    fontSize: 30,
    fontWeight: '800',
    letterSpacing: -0.6,
    fontVariant: ['tabular-nums'],
  },
  perDayText: {
    fontSize: 13,
    fontWeight: '600',
  },
  daysRemainText: {
    fontSize: 12,
    lineHeight: 16,
    fontWeight: '500',
    marginBottom: 10,
  },
  riskInsightPill: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 10,
    paddingHorizontal: 12,
    borderRadius: 14,
    borderWidth: 1,
    marginBottom: 12,
  },
  riskInsightLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    flex: 1,
    marginRight: 8,
  },
  riskInsightText: {
    fontSize: 12,
    fontWeight: '600',
    lineHeight: 17,
    flex: 1,
  },
  riskInsightRight: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 2,
  },
  riskInsightTapText: {
    fontSize: 11,
    fontWeight: '600',
  },
  quoteInnerBlock: {
    borderRadius: 16,
    paddingVertical: 14,
    paddingHorizontal: 16,
    borderWidth: 1,
    marginBottom: 14,
    alignItems: 'center',
    justifyContent: 'center',
  },
  quoteHeaderRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 6,
  },
  quoteTagPill: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 8,
    gap: 4,
  },
  quoteTagText: {
    fontSize: 10,
    fontWeight: '800',
    letterSpacing: 0.5,
  },
  quoteTapHint: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 3,
  },
  quoteTapText: {
    fontSize: 10,
    fontWeight: '600',
  },
  dailyTipsBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 10,
    paddingVertical: 3,
    borderRadius: 10,
    gap: 4,
  },
  dailyTipsBadgeText: {
    color: '#FFFFFF',
    fontSize: 11,
    fontWeight: '800',
    letterSpacing: 0.2,
  },
  quoteCycleBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  quoteCycleText: {
    fontSize: 11,
    fontWeight: '700',
  },
  quoteMainText: {
    fontSize: 13,
    fontWeight: '500',
    lineHeight: 19,
    letterSpacing: -0.1,
  },
  metricStrip: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    borderTopWidth: 1,
    paddingTop: 12,
    marginBottom: 14,
  },
  metricItem: {
    flex: 1,
    alignItems: 'center',
    paddingHorizontal: 2,
  },
  metricItemLabel: {
    fontSize: 10,
    fontWeight: '600',
    marginBottom: 2,
    textAlign: 'center',
  },
  metricItemVal: {
    fontSize: 13,
    fontWeight: '800',
    fontVariant: ['tabular-nums'],
  },
  metricDivider: {
    width: 1,
    height: 24,
  },
  actionRow: {
    flexDirection: 'row',
    gap: 10,
  },
  quickActionBtn: {
    flex: 1,
    height: 44,
    borderRadius: 22,
    borderWidth: 1.5,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
  },
  quickActionBtnText: {
    fontSize: 13,
    fontWeight: '800',
  },

  // General Section Cards
  sectionCard: {
    marginBottom: 16,
  },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 10,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '800',
    letterSpacing: -0.3,
  },
  sectionSubtitle: {
    fontSize: 11,
    marginTop: 2,
  },
  infoBadge: {
    width: 32,
    height: 32,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
  },
  summaryWarningBox: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    padding: 12,
    borderRadius: 14,
    borderWidth: 1,
    gap: 10,
    marginTop: 12,
  },
  summaryWarningText: {
    flex: 1,
    fontSize: 12,
    lineHeight: 18,
    fontWeight: '500',
  },
  driversContainer: {
    marginTop: 14,
  },
  driversHeading: {
    fontSize: 11,
    fontWeight: '800',
    textTransform: 'uppercase',
    letterSpacing: 0.6,
    marginBottom: 8,
  },
  driverItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 8,
    borderBottomWidth: 1,
    gap: 10,
  },
  driverIconBox: {
    width: 28,
    height: 28,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
  },
  driverTextCol: {
    flex: 1,
  },
  driverName: {
    fontSize: 13,
    fontWeight: '700',
  },
  driverDesc: {
    fontSize: 11,
    marginTop: 1,
  },

  // Recent Transactions
  recentHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  viewAllBtn: {
    fontSize: 12,
    fontWeight: '800',
  },
  emptyRecentBox: {
    alignItems: 'center',
    paddingVertical: 24,
    gap: 6,
  },
  emptyRecentText: {
    fontSize: 12,
  },
  txListWrap: {
    gap: 2,
  },
  txRowItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 10,
    borderBottomWidth: 1,
  },
  txLeftCol: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    flex: 1,
  },
  txCategoryIcon: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
  },
  txMetaText: {
    flex: 1,
  },
  txCategoryText: {
    fontSize: 14,
    fontWeight: '700',
  },
  txPillRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginTop: 2,
  },
  txPmBadge: {
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 6,
  },
  txPmText: {
    fontSize: 10,
    fontWeight: '600',
  },
  txDateText: {
    fontSize: 11,
  },
  txAmountText: {
    fontSize: 15,
    fontWeight: '800',
    fontVariant: ['tabular-nums'],
  },

  // Three-Bucket & Target Savings Styles
  targetSavingsPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 14,
    borderWidth: 1,
    alignSelf: 'flex-start',
    marginBottom: 12,
  },
  targetSavingsPillText: {
    fontSize: 12,
    fontWeight: '800',
  },
  savingsAlertBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    padding: 12,
    borderRadius: 14,
    borderWidth: 1.5,
    marginBottom: 12,
  },
  savingsAlertText: {
    flex: 1,
    fontSize: 12,
    fontWeight: '700',
    lineHeight: 18,
  },
  recalibrationBox: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    padding: 10,
    borderRadius: 12,
    borderWidth: 1,
    marginBottom: 12,
  },
  recalibrationText: {
    flex: 1,
    fontSize: 11,
    lineHeight: 16,
    fontWeight: '500',
  },

  // TakaTrack Smart Coach Card
  coachPromoCard: {
    marginBottom: 16,
    padding: 16,
  },
  coachPromoHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 8,
  },
  coachPromoTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  coachPromoTitle: {
    fontSize: 15,
    fontWeight: '800',
  },
  coachQueriesBadge: {
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 10,
    borderWidth: 1,
  },
  coachQueriesText: {
    fontSize: 11,
    fontWeight: '700',
  },
  coachPromoDesc: {
    fontSize: 12,
    lineHeight: 18,
    marginBottom: 12,
  },
  coachActionBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    height: 40,
    borderRadius: 12,
    gap: 6,
  },
  coachActionBtnText: {
    color: '#FFFFFF',
    fontSize: 13,
    fontWeight: '800',
  },
});
