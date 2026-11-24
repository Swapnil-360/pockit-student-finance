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
  Image,
} from 'react-native';
import { Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';
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
import { getCallingName } from '../utils/nameHelper';
import { getGoalIconName } from '../constants/goalIcons';

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
  onNavigateToGoals?: () => void;
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
  onNavigateToGoals,
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
        {/* 1. Header: Pockit Logo + Title on Left; Notification Bell + Avatar on Right (Image 1 Style) */}
        <View style={styles.headerBar}>
          <View style={styles.headerLeftBrand}>
            <Image
              source={BRANDING.assets.wallet}
              style={styles.pockitLogoImg}
              resizeMode="contain"
            />
            <Text style={[styles.pockitTitleText, { color: isDark ? '#FFFFFF' : '#0F172A' }]}>
              Pockit
            </Text>
          </View>

          <View style={styles.headerRightActions}>
            {/* Proper App Guide & Feature Info (ℹ️) Button (Clear guide for new & returning users) */}
            <TouchableOpacity
              style={[
                styles.infoGuideBtn,
                {
                  backgroundColor: isDark ? 'rgba(234, 88, 12, 0.15)' : '#FFF7ED',
                  borderColor: isDark ? 'rgba(234, 88, 12, 0.35)' : '#FFEDD5',
                  shadowColor: isDark ? '#000000' : '#EA580C',
                },
              ]}
              onPress={() => {
                try { Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light); } catch {}
                setWalkthroughVisible(true);
              }}
              activeOpacity={0.75}
              accessibilityRole="button"
              accessibilityLabel="App Features and User Guide"
            >
              <Ionicons name="information" size={20} color="#EA580C" />
            </TouchableOpacity>

            <UserAvatar
              user={user}
              size={42}
              onPress={onNavigateToProfile}
              showBadge={true}
            />
          </View>
        </View>

        {/* 2. Greeting Section (Image 1 Style) */}
        <View style={styles.greetingSection}>
          <Text style={[styles.greetingMainText, { color: isDark ? '#FFFFFF' : '#0F172A' }]}>
            {language === 'bn'
              ? `হ্যালো, ${getCallingName(user.full_name, user.calling_name)} 👋`
              : `Hello, ${getCallingName(user.full_name, user.calling_name)} 👋`}
          </Text>
          <Text style={[styles.greetingSubText, { color: theme.textSecondary }]}>
            {language === 'bn' ? 'চলতি মাসে আর্থিক ট্র্যাকে থাকুন!' : 'Stay on track this month!'}
          </Text>
        </View>

        {/* 3. Hero Card: Safe Daily Spending Limit on Left + Financial Risk Gauge on Right (Image 1 Style) */}
        <View
          style={[
            styles.heroCard,
            {
              backgroundColor: isDark ? 'rgba(23, 37, 56, 0.85)' : '#FFFFFF',
              borderColor: isDark ? 'rgba(255, 255, 255, 0.08)' : 'rgba(83, 122, 150, 0.12)',
              shadowColor: isDark ? '#000000' : '#466B85',
            },
          ]}
        >
          <View style={styles.heroSplit}>
            {/* Left Column: Safe Daily Spending Limit */}
            <View style={styles.heroLeftCol}>
              <View style={styles.heroLabelRow}>
                <View style={[styles.shieldIconWrap, { backgroundColor: isDark ? 'rgba(16, 185, 129, 0.18)' : '#ECFDF5' }]}>
                  <Ionicons name="shield-checkmark" size={13} color="#10B981" />
                </View>
                <Text
                  style={[styles.heroColumnLabel, { color: isDark ? '#94A3B8' : '#64748B' }]}
                  numberOfLines={1}
                  adjustsFontSizeToFit
                  minimumFontScale={0.8}
                >
                  {language === 'bn' ? 'নিরাপদ দৈনিক খরচ' : 'Safe Daily Spending Limit'}
                </Text>
              </View>

              <View style={styles.heroAmountRow}>
                <Text style={[styles.heroCurrencySymbol, { color: isDark ? '#FFFFFF' : '#0F172A' }]}>৳</Text>
                <Text style={[styles.heroAmountNum, { color: isDark ? '#FFFFFF' : '#0F172A' }]}>
                  {Math.round(dashboard.daily_safe_to_spend || 0)}
                </Text>
                <Text style={[styles.heroPerDay, { color: theme.textSecondary }]}>
                  / {language === 'bn' ? 'দিন' : 'day'}
                </Text>
              </View>

              {/* On-Track Pill Badge */}
              {(() => {
                const isOver = (dashboard.spendable_variable_pool !== undefined ? dashboard.spendable_variable_pool : dashboard.remaining_balance) <= 0;
                return (
                  <View
                    style={[
                      styles.onTrackPill,
                      {
                        backgroundColor: isOver
                          ? (isDark ? 'rgba(239, 68, 68, 0.2)' : '#FEF2F2')
                          : (isDark ? 'rgba(16, 185, 129, 0.18)' : '#ECFDF5'),
                        borderColor: isOver ? '#FECACA' : '#A7F3D0',
                      },
                    ]}
                  >
                    <Ionicons
                      name={isOver ? 'alert-circle' : 'checkmark'}
                      size={12}
                      color={isOver ? '#EF4444' : '#10B981'}
                      style={{ marginRight: 4 }}
                    />
                    <Text
                      style={[
                        styles.onTrackPillText,
                        { color: isOver ? '#EF4444' : '#059669' },
                      ]}
                    >
                      {isOver
                        ? (language === 'bn' ? 'সীমার বেশি খরচ হচ্ছে' : 'Over daily pace')
                        : (language === 'bn' ? "আপনি ট্র্যাকে আছেন!" : "You're on track!")}
                    </Text>
                  </View>
                );
              })()}
            </View>

            {/* Vertical Line Divider */}
            <View style={[styles.heroVerticalLine, { backgroundColor: isDark ? 'rgba(255, 255, 255, 0.08)' : '#F1F5F9' }]} />

            {/* Right Column: Financial Risk */}
            <TouchableOpacity
              style={styles.heroRightCol}
              onPress={() => {
                try { Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light); } catch {}
                setRiskDetailsVisible(true);
              }}
              activeOpacity={0.8}
            >
              <View style={styles.heroLabelRow}>
                <Ionicons name="stats-chart" size={13} color="#10B981" />
                <Text style={[styles.heroColumnLabel, { color: isDark ? '#94A3B8' : '#64748B' }]} numberOfLines={1}>
                  {language === 'bn' ? 'আর্থিক ঝুঁকি' : 'Financial Risk'}
                </Text>
              </View>

              <View style={styles.riskGaugeWrap}>
                <CompactRiskGauge
                  score={current_risk.risk_score_pct}
                  tier={current_risk.risk_tier}
                  tierBn={current_risk.risk_tier_bn}
                  language={language}
                  size={80}
                  strokeWidth={8}
                  onPress={() => setRiskDetailsVisible(true)}
                />
              </View>
            </TouchableOpacity>
          </View>
        </View>

        {/* 4. 3-Stat Cards Row (Rent & Mess, Savings, Left for Month - Matching Image 1) */}
        <View style={styles.threeStatRow}>
          {/* Card 1: Rent & Mess */}
          <TouchableOpacity
            style={[
              styles.statCardItem,
              {
                backgroundColor: isDark ? 'rgba(23, 37, 56, 0.85)' : '#FFFFFF',
                borderColor: isDark ? 'rgba(255, 255, 255, 0.08)' : 'rgba(83, 122, 150, 0.12)',
                shadowColor: isDark ? '#000000' : '#466B85',
              },
            ]}
            onPress={() => {
              try { Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light); } catch {}
              setMessMealModalVisible(true);
            }}
            activeOpacity={0.8}
          >
            <View style={[styles.statIconCircle, { backgroundColor: isDark ? 'rgba(2, 132, 199, 0.18)' : '#E0F2FE' }]}>
              <Ionicons name="home" size={18} color="#0284C7" />
            </View>
            <Text style={[styles.statCardLabel, { color: theme.textSecondary }]} numberOfLines={1}>
              {dashboard.enable_mess_meals !== false ? 'Rent & Mess' : 'Housing'}
            </Text>
            <Text style={[styles.statCardVal, { color: isDark ? '#F8FAFC' : '#0F172A' }]} numberOfLines={1}>
              ৳{Math.round(dashboard.fixed_obligations_spent !== undefined ? dashboard.fixed_obligations_spent : (dashboard.category_breakdown?.['Rent'] || 7000)).toLocaleString()}
            </Text>
          </TouchableOpacity>

          {/* Card 2: Savings (Piggy bank icon in soft green circle) */}
          <TouchableOpacity
            style={[
              styles.statCardItem,
              {
                backgroundColor: isDark ? 'rgba(23, 37, 56, 0.85)' : '#FFFFFF',
                borderColor: isDark ? 'rgba(255, 255, 255, 0.08)' : 'rgba(83, 122, 150, 0.12)',
                shadowColor: isDark ? '#000000' : '#466B85',
              },
            ]}
            onPress={() => {
              try { Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light); } catch {}
              setSavingsModalVisible(true);
            }}
            activeOpacity={0.8}
          >
            <View style={[styles.statIconCircle, { backgroundColor: isDark ? 'rgba(16, 185, 129, 0.18)' : '#DCFCE7' }]}>
              <MaterialCommunityIcons name="piggy-bank" size={20} color="#16A34A" />
            </View>
            <Text style={[styles.statCardLabel, { color: theme.textSecondary }]} numberOfLines={1}>
              {language === 'bn' ? 'সঞ্চয়' : 'Savings'}
            </Text>
            <Text style={[styles.statCardVal, { color: isDark ? '#F8FAFC' : '#0F172A' }]} numberOfLines={1}>
              ৳{Math.round(dashboard.target_savings || 500).toLocaleString()}
            </Text>
          </TouchableOpacity>

          {/* Card 3: Left for Month (Wallet icon in soft orange circle, no truncation) */}
          <View
            style={[
              styles.statCardItem,
              {
                backgroundColor: isDark ? 'rgba(23, 37, 56, 0.85)' : '#FFFFFF',
                borderColor: isDark ? 'rgba(255, 255, 255, 0.08)' : 'rgba(83, 122, 150, 0.12)',
                shadowColor: isDark ? '#000000' : '#466B85',
              },
            ]}
          >
            <View style={[styles.statIconCircle, { backgroundColor: isDark ? 'rgba(234, 88, 12, 0.18)' : '#FFEDD5' }]}>
              <Ionicons name="wallet" size={18} color="#EA580C" />
            </View>
            <Text
              style={[styles.statCardLabel, { color: theme.textSecondary }]}
              numberOfLines={1}
              adjustsFontSizeToFit
              minimumFontScale={0.85}
            >
              {language === 'bn' ? 'মাসের বাকি' : 'Left for Month'}
            </Text>
            <Text
              style={[
                styles.statCardVal,
                {
                  color: (dashboard.spendable_variable_pool !== undefined ? dashboard.spendable_variable_pool : dashboard.remaining_balance) <= 0
                    ? '#EF4444'
                    : (isDark ? '#F8FAFC' : '#0F172A'),
                },
              ]}
              numberOfLines={1}
            >
              ৳{Math.round(dashboard.spendable_variable_pool !== undefined ? dashboard.spendable_variable_pool : dashboard.remaining_balance).toLocaleString()}
            </Text>
          </View>
        </View>

        {/* 5. Dream Goal Card (Image 1 Style) */}
        <View
          style={[
            styles.dreamGoalCard,
            {
              backgroundColor: isDark ? 'rgba(23, 37, 56, 0.85)' : '#FFFFFF',
              borderColor: isDark ? 'rgba(255, 255, 255, 0.08)' : 'rgba(83, 122, 150, 0.12)',
              shadowColor: isDark ? '#000000' : '#466B85',
            },
          ]}
        >
          <View style={styles.dreamGoalHeader}>
            <View style={styles.dreamGoalHeaderLeft}>
              <View style={[styles.targetIconBox, { backgroundColor: isDark ? 'rgba(234, 88, 12, 0.18)' : '#FFEDD5' }]}>
                <Ionicons name="disc-outline" size={18} color="#EA580C" />
              </View>
              <Text style={[styles.dreamGoalHeaderTitle, { color: isDark ? '#F8FAFC' : '#0F172A' }]}>
                {language === 'bn' ? 'স্বপ্নের লক্ষ্য' : 'Dream Goal'}
              </Text>
            </View>

            <TouchableOpacity
              onPress={() => {
                try { Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light); } catch {}
                if (onNavigateToGoals) onNavigateToGoals();
              }}
              style={styles.viewAllBtn}
              activeOpacity={0.7}
            >
              <Text style={[styles.viewAllText, { color: theme.textSecondary }]}>
                {language === 'bn' ? 'সবগুলো দেখুন' : 'View All'}
              </Text>
              <Ionicons name="arrow-forward" size={13} color={theme.textSecondary} style={{ marginLeft: 3 }} />
            </TouchableOpacity>
          </View>

          {activeGoal ? (
            <View style={styles.dreamGoalBody}>
              <View style={[styles.goalThumbBox, { backgroundColor: isDark ? 'rgba(234, 88, 12, 0.15)' : '#FFEDD5' }]}>
                <Ionicons
                  name={getGoalIconName(activeGoal.title, activeGoal.category)}
                  size={26}
                  color="#EA580C"
                />
              </View>

              <View style={styles.goalInfoCol}>
                <Text style={[styles.goalItemTitle, { color: isDark ? '#F8FAFC' : '#0F172A' }]} numberOfLines={1}>
                  {activeGoal.title}
                </Text>
                <Text style={[styles.goalItemAmount, { color: theme.textSecondary }]}>
                  ৳{Math.round(activeGoal.current_saved).toLocaleString()} / ৳{Math.round(activeGoal.target_amount).toLocaleString()}
                </Text>

                <View style={styles.goalProgressRow}>
                  <View style={[styles.goalProgressTrack, { backgroundColor: isDark ? 'rgba(255, 255, 255, 0.1)' : '#E2E8F0' }]}>
                    <View
                      style={[
                        styles.goalProgressFill,
                        {
                          width: `${Math.min(100, Math.max(0, activeGoal.progress_pct || 0))}%`,
                          backgroundColor: '#EA580C',
                        },
                      ]}
                    />
                  </View>
                  <Text style={[styles.goalItemPct, { color: isDark ? '#94A3B8' : '#64748B' }]}>
                    {Math.round(activeGoal.progress_pct || 0)}%
                  </Text>
                </View>
              </View>

              <TouchableOpacity
                style={[styles.homeBoostBtn, { backgroundColor: isDark ? 'rgba(234, 88, 12, 0.2)' : '#FFEDD5' }]}
                onPress={() => handleOpenBoost(activeGoal)}
                activeOpacity={0.8}
              >
                <Text style={[styles.homeBoostBtnText, { color: '#EA580C' }]}>
                  {language === 'bn' ? 'বুস্ট' : 'Boost'}
                </Text>
              </TouchableOpacity>
            </View>
          ) : (
            <View style={styles.noGoalBody}>
              <TouchableOpacity
                style={[styles.setGoalOutlineBtn, { borderColor: theme.primary }]}
                onPress={() => setCreateGoalVisible(true)}
              >
                <Ionicons name="add" size={16} color={theme.primary} style={{ marginRight: 4 }} />
                <Text style={[styles.setGoalOutlineBtnText, { color: theme.primary }]}>
                  {language === 'bn' ? 'নতুন লক্ষ্য নির্ধারণ করুন' : 'Set a Dream Goal'}
                </Text>
              </TouchableOpacity>
            </View>
          )}
        </View>

        {/* 6. Weekly Streak Card (Image 1 Style - Celebratory Sparkle & Perfectly Spaced Day Nodes) */}
        <View
          style={[
            styles.weeklyStreakCard,
            {
              backgroundColor: isDark ? 'rgba(16, 185, 129, 0.1)' : '#F0FDF4',
              borderColor: isDark ? 'rgba(16, 185, 129, 0.25)' : '#DCFCE7',
            },
          ]}
        >
          {/* Top-Right Celebration Sparkles Accent from Image 1 */}
          <View style={styles.streakSparkleBurst}>
            <Ionicons name="sparkles" size={13} color="#EA580C" />
          </View>

          <View style={styles.streakLeftWrap}>
            <View style={styles.flameIconWrap}>
              <Ionicons name="flame" size={20} color="#EA580C" />
            </View>
            <View style={styles.streakTextCol}>
              <Text style={[styles.streakTitle, { color: isDark ? '#F8FAFC' : '#0F172A' }]} numberOfLines={1}>
                {language === 'bn' ? 'সাপ্তাহিক স্ট্রিক' : 'Weekly Streak'}
              </Text>
              <Text style={[styles.streakCount, { color: isDark ? '#CBD5E1' : '#334155' }]} numberOfLines={1}>
                {dashboard.on_track_streak || 1} {language === 'bn' ? 'দিন একটানা' : 'days in a row'}
              </Text>
              <Text style={[styles.streakSub, { color: isDark ? '#94A3B8' : '#64748B' }]} numberOfLines={1}>
                {language === 'bn' ? 'চালিয়ে যান!' : 'Keep going!'}
              </Text>
            </View>
          </View>

          <View style={styles.streakDaysRow}>
            {(() => {
              const today = new Date();
              const currentDayOfWeek = today.getDay(); // 0 = Sun, 1 = Mon, 2 = Tue, 3 = Wed, 4 = Thu, 5 = Fri, 6 = Sat
              const activeStreak = Math.max(1, dashboard.on_track_streak || 1);
              const days = [
                { label: 'S', dayIndex: 0 },
                { label: 'M', dayIndex: 1 },
                { label: 'T', dayIndex: 2 },
                { label: 'W', dayIndex: 3 },
                { label: 'T', dayIndex: 4 },
                { label: 'F', dayIndex: 5 },
                { label: 'S', dayIndex: 6 },
              ];

              return days.map((d, idx) => {
                const isPastOrToday = idx <= currentDayOfWeek;
                const isToday = idx === currentDayOfWeek;
                // A day is checked if it falls within the active streak leading up to today
                const isChecked = isPastOrToday && (currentDayOfWeek - idx < activeStreak);

                return (
                  <View key={idx} style={styles.streakDayNode}>
                    <View
                      style={[
                        styles.streakDayDot,
                        {
                          backgroundColor: isChecked
                            ? '#10B981'
                            : (isDark ? 'rgba(255, 255, 255, 0.12)' : '#E2E8F0'),
                          borderColor: isToday
                            ? (isChecked ? '#059669' : '#10B981')
                            : 'transparent',
                          borderWidth: isToday ? 1.5 : 0,
                        },
                      ]}
                    >
                      {isChecked && <Ionicons name="checkmark" size={10} color="#FFFFFF" />}
                    </View>
                    <Text
                      style={[
                        styles.streakDayLabel,
                        {
                          color: isToday
                            ? '#059669'
                            : (isDark ? '#94A3B8' : '#64748B'),
                          fontWeight: isToday ? '700' : '500',
                        },
                      ]}
                    >
                      {d.label}
                    </Text>
                  </View>
                );
              });
            })()}
          </View>
        </View>

        {/* 7. Smart Tip Banner Card (Image 1 Style) */}
        <View
          style={[
            styles.smartTipCard,
            {
              backgroundColor: isDark ? 'rgba(23, 37, 56, 0.85)' : '#F0F9FF',
              borderColor: isDark ? 'rgba(56, 189, 248, 0.25)' : '#E0F2FE',
            },
          ]}
        >
          <View style={styles.robotAvatarWrap}>
            <View style={[styles.robotCircle, { backgroundColor: isDark ? 'rgba(234, 88, 12, 0.2)' : '#FFEDD5' }]}>
              <Ionicons name="headset" size={24} color="#EA580C" />
            </View>
          </View>

          <View style={styles.smartTipTextCol}>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 5 }}>
              <Text style={styles.smartTipHeading}>Smart Tip</Text>
              <Ionicons name="sparkles" size={12} color="#EA580C" />
            </View>
            <Text style={[styles.smartTipBody, { color: isDark ? '#CBD5E1' : '#334155' }]}>
              {language === 'bn'
                ? `চলতি মাসে আর্থিক সুরক্ষায় আপনার দৈনিক খরচ ৳${dashboard.daily_safe_to_spend}-এর মধ্যে রাখার চেষ্টা করুন।`
                : `Try to keep your daily spending under ৳${dashboard.daily_safe_to_spend} to stay safe this month.`}
            </Text>
          </View>
        </View>
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
    marginBottom: 14,
  },
  headerLeftBrand: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  pockitLogoImg: {
    width: 36,
    height: 36,
  },
  pockitTitleText: {
    fontSize: 22,
    fontWeight: '800',
    letterSpacing: -0.4,
  },
  headerRightActions: {
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
    borderWidth: 1.5,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 5,
    elevation: 2,
  },
  greetingSection: {
    marginBottom: 16,
  },
  greetingMainText: {
    fontSize: 22,
    fontWeight: '700',
    letterSpacing: -0.3,
    marginBottom: 2,
  },
  greetingSubText: {
    fontSize: 13,
    fontWeight: '400',
  },
  heroCard: {
    borderRadius: 22,
    borderWidth: 1,
    padding: 16,
    marginBottom: 14,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.06,
    shadowRadius: 14,
    elevation: 3,
  },
  heroSplit: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  heroLeftCol: {
    flex: 1.25,
    paddingRight: 8,
  },
  heroLabelRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginBottom: 6,
  },
  shieldIconWrap: {
    width: 20,
    height: 20,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
  },
  heroColumnLabel: {
    fontSize: 11.5,
    fontWeight: '500',
  },
  heroAmountRow: {
    flexDirection: 'row',
    alignItems: 'baseline',
    marginBottom: 8,
  },
  heroCurrencySymbol: {
    fontSize: 18,
    fontWeight: '700',
    marginRight: 2,
  },
  heroAmountNum: {
    fontSize: 28,
    fontWeight: '700',
    letterSpacing: -0.5,
  },
  heroPerDay: {
    fontSize: 12.5,
    fontWeight: '400',
    marginLeft: 4,
  },
  onTrackPill: {
    flexDirection: 'row',
    alignItems: 'center',
    alignSelf: 'flex-start',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
    borderWidth: 1,
  },
  onTrackPillText: {
    fontSize: 11,
    fontWeight: '600',
  },
  heroVerticalLine: {
    width: 1,
    height: 86,
    marginHorizontal: 8,
  },
  heroRightCol: {
    flex: 0.95,
    alignItems: 'center',
    justifyContent: 'center',
  },
  riskGaugeWrap: {
    marginVertical: 4,
  },
  threeStatRow: {
    flexDirection: 'row',
    gap: 8,
    marginBottom: 14,
  },
  statCardItem: {
    flex: 1,
    borderRadius: 16,
    borderWidth: 1,
    paddingVertical: 12,
    paddingHorizontal: 4,
    alignItems: 'center',
    justifyContent: 'center',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 8,
    elevation: 2,
  },
  statIconCircle: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 6,
  },
  statCardLabel: {
    fontSize: 11,
    fontWeight: '500',
    marginBottom: 2,
    textAlign: 'center',
  },
  statCardVal: {
    fontSize: 15,
    fontWeight: '700',
    textAlign: 'center',
  },
  dreamGoalCard: {
    borderRadius: 22,
    borderWidth: 1,
    padding: 16,
    marginBottom: 14,
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.05,
    shadowRadius: 10,
    elevation: 2,
  },
  dreamGoalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  dreamGoalHeaderLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  targetIconBox: {
    width: 28,
    height: 28,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
  },
  dreamGoalHeaderTitle: {
    fontSize: 15,
    fontWeight: '700',
  },
  viewAllBtn: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  viewAllText: {
    fontSize: 12,
    fontWeight: '500',
  },
  dreamGoalBody: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  goalThumbBox: {
    width: 52,
    height: 52,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
  },
  goalInfoCol: {
    flex: 1,
  },
  goalItemTitle: {
    fontSize: 14.5,
    fontWeight: '600',
    marginBottom: 2,
  },
  goalItemAmount: {
    fontSize: 12,
    fontWeight: '400',
    marginBottom: 6,
  },
  goalProgressRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  goalProgressTrack: {
    flex: 1,
    height: 6,
    borderRadius: 3,
    overflow: 'hidden',
  },
  goalProgressFill: {
    height: '100%',
    borderRadius: 3,
  },
  goalItemPct: {
    fontSize: 11,
    fontWeight: '600',
  },
  homeBoostBtn: {
    paddingHorizontal: 14,
    paddingVertical: 7,
    borderRadius: 12,
  },
  homeBoostBtnText: {
    fontSize: 12,
    fontWeight: '600',
  },
  noGoalBody: {
    paddingVertical: 10,
    alignItems: 'center',
  },
  setGoalOutlineBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 14,
    borderWidth: 1,
  },
  setGoalOutlineBtnText: {
    fontSize: 13,
    fontWeight: '600',
  },
  weeklyStreakCard: {
    borderRadius: 22,
    borderWidth: 1,
    paddingVertical: 14,
    paddingHorizontal: 14,
    marginBottom: 14,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    position: 'relative',
  },
  streakSparkleBurst: {
    position: 'absolute',
    top: 8,
    right: 10,
  },
  streakLeftWrap: {
    flexDirection: 'row',
    alignItems: 'center',
    flexShrink: 1,
    marginRight: 4,
  },
  flameIconWrap: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: '#FFEDD5',
    alignItems: 'center',
    justifyContent: 'center',
    flexShrink: 0,
  },
  streakTextCol: {
    marginLeft: 8,
  },
  streakTitle: {
    fontSize: 13,
    fontWeight: '700',
  },
  streakCount: {
    fontSize: 11.5,
    fontWeight: '500',
    marginTop: 1,
  },
  streakSub: {
    fontSize: 10.5,
    fontWeight: '400',
  },
  streakDaysRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    flexShrink: 0,
  },
  streakDayNode: {
    alignItems: 'center',
    width: 18,
  },
  streakDayDot: {
    width: 18,
    height: 18,
    borderRadius: 9,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 2,
  },
  streakDayLabel: {
    fontSize: 9.5,
    fontWeight: '500',
  },
  smartTipCard: {
    borderRadius: 22,
    borderWidth: 1,
    padding: 14,
    marginBottom: 16,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  robotAvatarWrap: {
    width: 44,
    height: 44,
    borderRadius: 22,
    alignItems: 'center',
    justifyContent: 'center',
  },
  robotCircle: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
  },
  smartTipTextCol: {
    flex: 1,
  },
  smartTipHeading: {
    fontSize: 12,
    fontWeight: '800',
    color: '#EA580C',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  smartTipBody: {
    fontSize: 12,
    lineHeight: 17,
    fontWeight: '500',
    marginTop: 2,
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
  compoundHeroLeftCol: {
    flex: 1.15,
    paddingRight: 8,
    justifyContent: 'center',
  },
  compoundHeroRightCol: {
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
  recentViewAllBtn: {
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
