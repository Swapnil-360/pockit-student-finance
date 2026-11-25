import React, { useState } from 'react';
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
  Switch,
} from 'react-native';
import { BlurView } from 'expo-blur';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { THEME } from '../constants/theme';
import { useTheme } from '../constants/ThemeContext';
import { TRANSLATIONS, Language } from '../constants/translations';
import { BRANDING } from '../constants/branding';
import { BrandLogo } from '../components/BrandLogo';
import { GlassCard } from '../components/GlassCard';
import {
  SegmentedControl,
  NumberStepper,
  ChoiceChip,
  LikertRating,
  CurrencyCustomInput,
} from '../components/FormControls';
import { ProgressBar } from '../components/ProgressBar';
import { saveBaselineProfile, skipOnboarding, BaselineProfileData } from '../services/api';

interface OnboardingWizardProps {
  userId: string;
  language: Language;
  onToggleLanguage: () => void;
  onOnboardingComplete: () => void;
}

export const OnboardingWizard: React.FC<OnboardingWizardProps> = ({
  userId,
  language,
  onToggleLanguage,
  onOnboardingComplete,
}) => {
  const [step, setStep] = useState(1);
  const [submitting, setSubmitting] = useState(false);
  const insets = useSafeAreaInsets();
  const { isDark, theme } = useTheme();

  // Step 1: Student Context
  const [gender, setGender] = useState('Male');
  const [age, setAge] = useState(21);
  const [yearOfStudy, setYearOfStudy] = useState('2nd year');
  const [universityType, setUniversityType] = useState('Public');
  const [whereYouLive, setWhereYouLive] = useState('With family');

  // Step 2: Total Money Available & Sources
  const [monthlyAllowanceFixed, setMonthlyAllowanceFixed] = useState(10000);
  const [mainSourceOfMoney, setMainSourceOfMoney] = useState('Family');
  const [doYouEarnIncome, setDoYouEarnIncome] = useState('No');

  // Step 3: Fixed Living, Academic & Savings Obligations
  const [monthlyRentFixed, setMonthlyRentFixed] = useState(0);
  const [messMealFixed, setMessMealFixed] = useState(0);
  const [enableMessMeals, setEnableMessMeals] = useState(false);
  const [academicFeeFixed, setAcademicFeeFixed] = useState(0);
  const [savingsGoalFixed, setSavingsGoalFixed] = useState(1000);

  // Step 4: Habits & Behavioral Calibration
  const [trackSpending, setTrackSpending] = useState(3);
  const [mobileBankingUse, setMobileBankingUse] = useState('Weekly');
  const [borrowedFromFriends, setBorrowedFromFriends] = useState('Never');

  const [awareBalance, setAwareBalance] = useState(3);
  const [awareCheckBeforeBuy, setAwareCheckBeforeBuy] = useState(3);
  const [impulseSpontaneous, setImpulseSpontaneous] = useState(3);
  const [impulseRegret, setImpulseRegret] = useState(3);
  const [awareWeeklyTrack, setAwareWeeklyTrack] = useState(3);
  const [impulseDiscounts, setImpulseDiscounts] = useState(3);

  const t = TRANSLATIONS[language];

  // Guaranteed safe status bar padding for Android hole punch & notches
  const safeTop = Math.max(insets.top, Platform.OS === 'android' ? (StatusBar.currentHeight || 36) : 44) + 8;
  const safeBottom = Math.max(insets.bottom, 16);

  // Auto-calibrate Living defaults based on accommodation selection
  const handleLivingChange = (living: string) => {
    setWhereYouLive(living);
    try {
      Haptics.selectionAsync();
    } catch {}
    if (living === 'With family') {
      setMonthlyRentFixed(0);
      setMessMealFixed(0);
      setEnableMessMeals(false);
    } else if (living === 'Mess-hostel') {
      setMonthlyRentFixed(3500);
      setMessMealFixed(4500);
      setEnableMessMeals(true);
    } else if (living === 'Hall') {
      setMonthlyRentFixed(1200);
      setMessMealFixed(3000);
      setEnableMessMeals(false);
    } else if (living === 'Rented flat') {
      setMonthlyRentFixed(6500);
      setMessMealFixed(0);
      setEnableMessMeals(false);
    }
  };

  // Derive categorical ordinal bracket for the ML Model behind the scenes
  const deriveTotalMoneyBracket = (amt: number): string => {
    if (amt < 5000) return '<5k';
    if (amt <= 10000) return '5–10k';
    if (amt <= 15000) return '10–15k';
    if (amt <= 20000) return '15–20k';
    return '>20k';
  };

  const handleNext = () => {
    try {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    } catch {}
    if (step < 4) {
      setStep((s) => s + 1);
    } else {
      handleFinish();
    }
  };

  const handleBack = () => {
    try {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    } catch {}
    if (step > 1) {
      setStep((s) => s - 1);
    }
  };

  // Skip for now workflow
  const handleSkip = async () => {
    try {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    } catch {}
    setSubmitting(true);
    try {
      await skipOnboarding(userId);
      onOnboardingComplete();
    } catch (e: any) {
      onOnboardingComplete();
    } finally {
      setSubmitting(false);
    }
  };

  const handleFinish = async () => {
    setSubmitting(true);
    try {
      const derivedBracket = deriveTotalMoneyBracket(monthlyAllowanceFixed);
      const payload: BaselineProfileData = {
        user_id: userId,
        gender,
        age,
        year_of_study: yearOfStudy,
        university_type: universityType,
        where_you_live: whereYouLive,
        total_monthly_money: derivedBracket,
        monthly_allowance_fixed: monthlyAllowanceFixed,
        monthly_rent_fixed: monthlyRentFixed,
        mess_meal_fixed: enableMessMeals ? messMealFixed : 0,
        enable_mess_meals: enableMessMeals,
        academic_fee_fixed: academicFeeFixed,
        savings_goal_fixed: savingsGoalFixed,
        target_savings: savingsGoalFixed,
        main_source_of_money: mainSourceOfMoney,
        do_you_earn_income: doYouEarnIncome,
        track_spending: trackSpending,
        mobile_banking_use: mobileBankingUse,
        borrowed_from_friends_baseline: borrowedFromFriends,
        aware_balance: awareBalance,
        aware_weekly_track: awareWeeklyTrack,
        aware_check_before_buy: awareCheckBeforeBuy,
        impulse_spontaneous: impulseSpontaneous,
        impulse_discounts: impulseDiscounts,
        impulse_regret: impulseRegret,
      };

      await saveBaselineProfile(payload);
      try {
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      } catch {}
      onOnboardingComplete();
    } catch (e: any) {
      Alert.alert(
        language === 'bn' ? 'সংরক্ষণ ত্রুটি' : 'Save Error',
        e.message || 'Failed to save baseline profile.'
      );
    } finally {
      setSubmitting(false);
    }
  };

  // Real-Time Pocket Math Preview calculations
  const totalFunds = monthlyAllowanceFixed;
  const fixedLivingAndAcademic = monthlyRentFixed + (enableMessMeals ? messMealFixed : 0) + academicFeeFixed;
  const availableDailyLife = Math.max(0, totalFunds - fixedLivingAndAcademic - savingsGoalFixed);
  const dailySafeSpend = Math.round((availableDailyLife / 30) * 10) / 10;

  return (
    <View style={[styles.container, { backgroundColor: theme.canvas }]}>
      {/* Top Glass Header with Safe Inset Protection */}
      <View style={[styles.topHeader, { paddingTop: safeTop }]}>
        <View style={styles.topHeaderRow}>
          <View style={styles.headerLeft}>
            {step > 1 ? (
              <TouchableOpacity
                style={styles.backCircleBtn}
                onPress={handleBack}
                activeOpacity={0.7}
              >
                <Ionicons name="arrow-back" size={20} color="#F8FAFC" />
              </TouchableOpacity>
            ) : (
              <BrandLogo size="sm" />
            )}
            <View style={styles.titleColumn}>
              <Text style={styles.headerTitle} numberOfLines={1}>
                {BRANDING.appName}
              </Text>
              <Text style={styles.headerSubtitle} numberOfLines={1}>
                {language === 'bn' ? 'শিক্ষার্থীর আর্থিক প্রোফাইল' : 'Student Financial Baseline'}
              </Text>
            </View>
          </View>

          <View style={styles.headerRightActions}>
            {/* Skip for now button */}
            <TouchableOpacity
              style={styles.skipBtn}
              onPress={handleSkip}
              disabled={submitting}
              activeOpacity={0.7}
            >
              <Text style={styles.skipBtnText}>
                {language === 'bn' ? 'স্কিপ করুন' : 'Skip'}
              </Text>
            </TouchableOpacity>

            {/* Language Toggle */}
            <TouchableOpacity
              style={styles.langPill}
              onPress={onToggleLanguage}
              activeOpacity={0.7}
            >
              <Ionicons name="globe-outline" size={13} color="#38BDF8" style={{ marginRight: 3 }} />
              <Text style={styles.langPillText}>
                {language === 'bn' ? 'English' : 'বাংলা'}
              </Text>
            </TouchableOpacity>
          </View>
        </View>

        {/* Unified Step Progress Bar */}
        <ProgressBar currentStep={step} totalSteps={4} language={language} />
      </View>

      {/* Wizard Step Body */}
      <ScrollView
        contentContainerStyle={[
          styles.scrollContent,
          { paddingBottom: 110 + safeBottom },
        ]}
        showsVerticalScrollIndicator={false}
      >
        {/* STEP 1: STUDENT CONTEXT */}
        {step === 1 && (
          <View style={styles.stepContainer}>
            <View style={styles.stepHeaderCard}>
              <Text style={[styles.stepMainTitle, { color: theme.textPrimary }]}>
                {language === 'bn' ? '১. আপনার পরিচয় ও বাসস্থান' : '1. Student Context & Living'}
              </Text>
              <Text style={[styles.stepMainSub, { color: theme.textSecondary }]}>
                {language === 'bn'
                  ? 'আপনার পড়াশোনা ও জীবনযাত্রার সাথে মিল রেখে বাজেট তৈরি করতে এটি সাহায্য করে।'
                  : 'Calibrates standard Dhaka student benchmarks based on your university & living situation.'}
              </Text>
            </View>

            <GlassCard style={styles.fieldCard}>
              <View style={styles.cardHeader}>
                <Ionicons name="people-outline" size={18} color="#5A8296" />
                <Text style={[styles.fieldLabel, { color: theme.textPrimary }]}>{t.gender}</Text>
              </View>
              <SegmentedControl
                options={[
                  { value: 'Male', label: language === 'bn' ? 'পুরুষ' : 'Male' },
                  { value: 'Female', label: language === 'bn' ? 'নারী' : 'Female' },
                ]}
                value={gender}
                onChange={setGender}
              />
            </GlassCard>

            <GlassCard style={styles.fieldCard}>
              <View style={styles.cardHeader}>
                <Ionicons name="calendar-outline" size={18} color="#5A8296" />
                <Text style={[styles.fieldLabel, { color: theme.textPrimary }]}>{t.age}</Text>
              </View>
              <NumberStepper
                value={age}
                onChange={setAge}
                min={16}
                max={35}
                unit={language === 'bn' ? 'বছর' : 'years'}
              />
            </GlassCard>

            <GlassCard style={styles.fieldCard}>
              <View style={styles.cardHeader}>
                <Ionicons name="school-outline" size={18} color="#5A8296" />
                <Text style={[styles.fieldLabel, { color: theme.textPrimary }]}>{t.yearOfStudy}</Text>
              </View>
              <View style={styles.chipGrid}>
                {[
                  { key: '1st year', en: '1st Year', bn: '১ম বর্ষ' },
                  { key: '2nd year', en: '2nd Year', bn: '২য় বর্ষ' },
                  { key: '3rd year', en: '3rd Year', bn: '৩য় বর্ষ' },
                  { key: '4th year', en: '4th Year', bn: '৪র্থ বর্ষ' },
                  { key: 'Masters', en: 'Masters', bn: 'মাস্টার্স' },
                ].map((item) => (
                  <ChoiceChip
                    key={item.key}
                    label={language === 'bn' ? item.bn : item.en}
                    selected={yearOfStudy === item.key}
                    onPress={() => setYearOfStudy(item.key)}
                  />
                ))}
              </View>
            </GlassCard>

            <GlassCard style={styles.fieldCard}>
              <View style={styles.cardHeader}>
                <Ionicons name="business-outline" size={18} color="#5A8296" />
                <Text style={[styles.fieldLabel, { color: theme.textPrimary }]}>{t.universityType}</Text>
              </View>
              <View style={styles.chipGrid}>
                {[
                  { key: 'Public', en: 'Public University', bn: 'পাবলিক বিশ্ববিদ্যালয়' },
                  { key: 'Private', en: 'Private (BUBT, UIU, etc.)', bn: 'বেসরকারি (বিইউবিটি, ইত্যাদি)' },
                  { key: 'National University college', en: 'National Univ / College', bn: 'জাতীয় বিশ্ববিদ্যালয় / কলেজ' },
                ].map((item) => (
                  <ChoiceChip
                    key={item.key}
                    label={language === 'bn' ? item.bn : item.en}
                    selected={universityType === item.key}
                    onPress={() => setUniversityType(item.key)}
                  />
                ))}
              </View>
            </GlassCard>

            <GlassCard style={styles.fieldCard}>
              <View style={styles.cardHeader}>
                <Ionicons name="home-outline" size={18} color="#5A8296" />
                <Text style={[styles.fieldLabel, { color: theme.textPrimary }]}>{t.whereYouLive}</Text>
              </View>
              <View style={styles.chipGrid}>
                {[
                  { key: 'With family', en: 'With Family', bn: 'পরিবারের সাথে' },
                  { key: 'Mess-hostel', en: 'Mess / Hostel', bn: 'মেস / হোস্টেল' },
                  { key: 'Hall', en: 'University Hall', bn: 'হল' },
                  { key: 'Rented flat', en: 'Rented Flat', bn: 'ভাড়া বাসা' },
                ].map((item) => (
                  <ChoiceChip
                    key={item.key}
                    label={language === 'bn' ? item.bn : item.en}
                    selected={whereYouLive === item.key}
                    onPress={() => handleLivingChange(item.key)}
                  />
                ))}
              </View>
              <Text style={[styles.helperNotice, { color: theme.textSecondary }]}>
                {whereYouLive === 'With family'
                  ? (language === 'bn' ? 'পরিবারের সাথে থাকলে বাড়ি ভাড়া ০ টাকা ধরা হবে।' : 'Living with family auto-sets fixed rent to ৳0.')
                  : (language === 'bn' ? 'পরবর্তী ধাপে আপনি নিজের সঠিক ভাড়া ও খাবার খরচ দিতে পারবেন।' : 'You can enter your exact rent & food advance in Step 3.')}
              </Text>
            </GlassCard>
          </View>
        )}

        {/* STEP 2: TOTAL MONEY AVAILABLE & INFLOW */}
        {step === 2 && (
          <View style={styles.stepContainer}>
            <View style={styles.stepHeaderCard}>
              <Text style={[styles.stepMainTitle, { color: theme.textPrimary }]}>
                {language === 'bn' ? '২. আপনার মোট কত টাকা আছে?' : '2. How Much Total Money Do You Have?'}
              </Text>
              <Text style={[styles.stepMainSub, { color: theme.textSecondary }]}>
                {language === 'bn'
                  ? 'পরিবার থেকে প্রাপ্ত হাতখরচ, টিউশনি বা চাকরির আয় ও জমানো টাকা মিলিয়ে মোট মাসিক বাজেট।'
                  : 'Enter your total monthly funds available from family support, tuitions, freelance, or savings.'}
              </Text>
            </View>

            {/* Direct Custom Amount Input with Quick Pills */}
            <GlassCard style={styles.fieldCard}>
              <CurrencyCustomInput
                label={language === 'bn' ? 'মোট প্রাপ্ত অর্থ (মাসিক)' : 'Total Monthly Funds Available'}
                subtitle={language === 'bn' ? 'সরাসরি সংখ্যা টাইপ করুন বা নিচের বাটন চাপুন' : 'Type exact custom amount or tap quick preset pills'}
                value={monthlyAllowanceFixed}
                onChange={setMonthlyAllowanceFixed}
                presets={[
                  { label: '৳ 5,000', value: 5000 },
                  { label: '৳ 8,000', value: 8000 },
                  { label: '৳ 10,000', value: 10000 },
                  { label: '৳ 15,000', value: 15000 },
                  { label: '৳ 20,000', value: 20000 },
                ]}
                quickAdjustments={[-500, 500, 1000]}
                placeholder="10000"
              />
            </GlassCard>

            <GlassCard style={styles.fieldCard}>
              <View style={styles.cardHeader}>
                <Ionicons name="pie-chart-outline" size={18} color="#10B981" />
                <Text style={[styles.fieldLabel, { color: theme.textPrimary }]}>{t.mainSourceOfMoney}</Text>
              </View>
              <View style={styles.chipGrid}>
                {[
                  { key: 'Family', en: 'Family Support', bn: 'পরিবার' },
                  { key: 'Tuition-job', en: 'Tuition / Job', bn: 'টিউশনি / চাকরি' },
                  { key: 'Loan', en: 'Loan / Debt', bn: 'ধার / ঋণ' },
                  { key: 'Mixed', en: 'Mixed Sources', bn: 'একাধিক উৎস' },
                ].map((item) => (
                  <ChoiceChip
                    key={item.key}
                    label={language === 'bn' ? item.bn : item.en}
                    selected={mainSourceOfMoney === item.key}
                    onPress={() => setMainSourceOfMoney(item.key)}
                  />
                ))}
              </View>
            </GlassCard>

            <GlassCard style={styles.fieldCard}>
              <View style={styles.cardHeader}>
                <Ionicons name="briefcase-outline" size={18} color="#10B981" />
                <Text style={[styles.fieldLabel, { color: theme.textPrimary }]}>{t.doYouEarnIncome}</Text>
              </View>
              <SegmentedControl
                options={[
                  { value: 'No', label: language === 'bn' ? 'না (শুধু হাতখরচ)' : 'No (Allowance only)' },
                  { value: 'Yes', label: language === 'bn' ? 'হ্যাঁ (নিজে আয় করি)' : 'Yes (I earn money)' },
                ]}
                value={doYouEarnIncome}
                onChange={setDoYouEarnIncome}
              />
            </GlassCard>
          </View>
        )}

        {/* STEP 3: FIXED OBLIGATIONS, SEMESTER FEE & LIVE POCKET FORMULA */}
        {step === 3 && (
          <View style={styles.stepContainer}>
            <View style={styles.stepHeaderCard}>
              <Text style={[styles.stepMainTitle, { color: theme.textPrimary }]}>
                {language === 'bn' ? '৩. বাধ্যতামূলক খরচ ও সঞ্চয়' : '3. Fixed Obligations & Savings'}
              </Text>
              <Text style={[styles.stepMainSub, { color: theme.textSecondary }]}>
                {language === 'bn'
                  ? 'মেস ভাড়া, খাবার ও সেমিস্টার ফি আলাদা করে আপনার আসল দৈনিক খরচের সীমা বের করা হবে।'
                  : 'Ring-fences essential accommodation, mess meals, and semester tuition installments.'}
              </Text>
            </View>

            {/* Fixed Rent Input */}
            <GlassCard style={styles.fieldCard}>
              <CurrencyCustomInput
                label={language === 'bn' ? 'সিট ভাড়া / মেস বাসা ভাড়া' : 'Fixed Accommodation / Mess Rent'}
                subtitle={whereYouLive === 'With family' ? (language === 'bn' ? 'পরিবারের সাথে থাকলে ০ টাকা' : 'Auto ৳0 living with family') : undefined}
                value={monthlyRentFixed}
                onChange={setMonthlyRentFixed}
                presets={[
                  { label: '৳ 0', value: 0 },
                  { label: '৳ 2,500', value: 2500 },
                  { label: '৳ 3,500', value: 3500 },
                  { label: '৳ 5,000', value: 5000 },
                  { label: '৳ 7,000', value: 7000 },
                ]}
                quickAdjustments={[-500, 500]}
                placeholder="3500"
              />
            </GlassCard>

            {/* Mess Meal System Toggle */}
            <GlassCard style={styles.fieldCard}>
              <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
                <View style={{ flex: 1, paddingRight: 10 }}>
                  <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                    <Ionicons name="restaurant-outline" size={18} color="#5A8296" />
                    <Text style={[styles.fieldLabel, { color: theme.textPrimary, marginBottom: 0 }]}>
                      {language === 'bn' ? 'মেস মিল সিস্টেম' : 'Mess Meal System'}
                    </Text>
                  </View>
                  <Text style={[styles.helperNotice, { color: theme.textSecondary, marginTop: 3 }]}>
                    {enableMessMeals
                      ? (language === 'bn' ? 'চালু: অগ্রিম মিল জমা আলাদা রাখা হবে' : 'Active: Upfront mess meal deposit is ring-fenced')
                      : (language === 'bn' ? 'বন্ধ: খাবার খরচ সরাসরি দৈনিক হাতখরচ থেকে হবে' : 'Inactive: Food is tracked via regular daily expenses')}
                  </Text>
                </View>
                <Switch
                  value={enableMessMeals}
                  onValueChange={(val) => {
                    try { Haptics.selectionAsync(); } catch {}
                    setEnableMessMeals(val);
                    if (!val) setMessMealFixed(0);
                    else if (messMealFixed === 0) setMessMealFixed(4500);
                  }}
                  trackColor={{ false: isDark ? '#334155' : '#CBD5E1', true: '#10B981' }}
                  thumbColor={Platform.OS === 'android' ? '#FFFFFF' : undefined}
                />
              </View>
            </GlassCard>

            {/* Mess Meal Advance (Only shown when enableMessMeals is true) */}
            {enableMessMeals && (
              <GlassCard style={styles.fieldCard}>
                <CurrencyCustomInput
                  label={language === 'bn' ? 'মেস মিল / বাজার খরচ' : 'Mess Meal Advance / Cooking Pool'}
                  subtitle={language === 'bn' ? 'মাসে বুয়া ও বাজার মিলে খাবার বাবদ খরচ' : 'Monthly mess meal advance and raw grocery pool'}
                  value={messMealFixed}
                  onChange={setMessMealFixed}
                  presets={[
                    { label: '৳ 0', value: 0 },
                    { label: '৳ 3,000', value: 3000 },
                    { label: '৳ 4,500', value: 4500 },
                    { label: '৳ 6,000', value: 6000 },
                  ]}
                  quickAdjustments={[-500, 500]}
                  placeholder="4500"
                />
              </GlassCard>
            )}

            {/* Academic Semester Tuition Allocation */}
            <GlassCard style={styles.fieldCard}>
              <CurrencyCustomInput
                label={language === 'bn' ? 'সেমিস্টার ফি কিস্তি সঞ্চয়' : 'Semester Tuition Fee Monthly Allocation'}
                subtitle={language === 'bn' ? 'বিইউবিটি বা প্রাইভেট ভার্সিটির সেমিস্টার ফি এর মাসিক কিস্তি' : 'Monthly reserve towards upcoming university semester installments'}
                value={academicFeeFixed}
                onChange={setAcademicFeeFixed}
                presets={[
                  { label: '৳ 0', value: 0 },
                  { label: '৳ 2,000', value: 2000 },
                  { label: '৳ 4,000', value: 4000 },
                  { label: '৳ 6,000', value: 6000 },
                ]}
                quickAdjustments={[-500, 500, 1000]}
                placeholder="0"
              />
            </GlassCard>

            {/* Protected Target Savings */}
            <GlassCard style={styles.fieldCard}>
              <CurrencyCustomInput
                label={language === 'bn' ? 'সুরক্ষিত মাসিক সঞ্চয়ের লক্ষ্য' : 'Protected Target Savings Goal'}
                subtitle={language === 'bn' ? 'জরুরি ফান্ড বা কাঙ্ক্ষিত গ্যাজেট কেনার জন্য আলাদা রাখা অর্থ' : 'Untouchable reserve for emergencies or dream goals'}
                value={savingsGoalFixed}
                onChange={setSavingsGoalFixed}
                presets={[
                  { label: '৳ 0', value: 0 },
                  { label: '৳ 500', value: 500 },
                  { label: '৳ 1,000', value: 1000 },
                  { label: '৳ 2,000', value: 2000 },
                ]}
                quickAdjustments={[-250, 250, 500]}
                placeholder="1000"
              />
            </GlassCard>

            {/* 🌟 Dynamic Real-Time Pocket Math Preview Glass Card */}
            <LinearGradient
              colors={isDark ? ['rgba(244, 123, 78, 0.15)', 'rgba(15, 23, 42, 0.65)'] : ['rgba(244, 123, 78, 0.1)', 'rgba(255, 255, 255, 0.9)']}
              style={styles.mathPreviewCard}
            >
              <View style={styles.mathHeaderRow}>
                <Ionicons name="calculator-outline" size={20} color="#F47B4E" />
                <Text style={[styles.mathHeaderTitle, { color: theme.textPrimary }]}>
                  {language === 'bn' ? 'লাইভ পকেট ফর্মুলা হিসাব' : 'Live Safe Spend Calculation'}
                </Text>
              </View>

              <View style={styles.mathRow}>
                <Text style={[styles.mathLabel, { color: theme.textSecondary }]}>
                  {language === 'bn' ? 'মোট প্রাপ্ত অর্থ' : 'Total Monthly Funds'}
                </Text>
                <Text style={[styles.mathValPositive, { color: '#10B981' }]}>
                  + ৳ {totalFunds.toLocaleString()}
                </Text>
              </View>

              {monthlyRentFixed > 0 && (
                <View style={styles.mathRow}>
                  <Text style={[styles.mathLabel, { color: theme.textSecondary }]}>
                    {language === 'bn' ? '− মেস/সিট ভাড়া (সুরক্ষিত)' : '− Fixed Rent (Locked)'}
                  </Text>
                  <Text style={[styles.mathValNegative, { color: '#F43F5E' }]}>
                    − ৳ {monthlyRentFixed.toLocaleString()}
                  </Text>
                </View>
              )}

              {messMealFixed > 0 && (
                <View style={styles.mathRow}>
                  <Text style={[styles.mathLabel, { color: theme.textSecondary }]}>
                    {language === 'bn' ? '− মেস মিল খাবার (সুরক্ষিত)' : '− Mess Meals (Locked)'}
                  </Text>
                  <Text style={[styles.mathValNegative, { color: '#F43F5E' }]}>
                    − ৳ {messMealFixed.toLocaleString()}
                  </Text>
                </View>
              )}

              {academicFeeFixed > 0 && (
                <View style={styles.mathRow}>
                  <Text style={[styles.mathLabel, { color: theme.textSecondary }]}>
                    {language === 'bn' ? '− সেমিস্টার ফি কিস্তি (সংরক্ষিত)' : '− Semester Fee (Reserved)'}
                  </Text>
                  <Text style={[styles.mathValNegative, { color: '#F43F5E' }]}>
                    − ৳ {academicFeeFixed.toLocaleString()}
                  </Text>
                </View>
              )}

              {savingsGoalFixed > 0 && (
                <View style={styles.mathRow}>
                  <Text style={[styles.mathLabel, { color: theme.textSecondary }]}>
                    {language === 'bn' ? '− মাসিক সঞ্চয় (সুরক্ষিত)' : '− Target Savings (Protected)'}
                  </Text>
                  <Text style={[styles.mathValNegative, { color: '#F59E0B' }]}>
                    − ৳ {savingsGoalFixed.toLocaleString()}
                  </Text>
                </View>
              )}

              <View style={styles.mathDivider} />

              <View style={styles.mathRow}>
                <Text style={[styles.mathResultLabel, { color: theme.textPrimary }]}>
                  {language === 'bn' ? 'দৈনন্দিন খরচের বাজেট' : 'Available for Daily Life'}
                </Text>
                <Text style={[styles.mathResultVal, { color: '#38BDF8' }]}>
                  ৳ {availableDailyLife.toLocaleString()} / mo
                </Text>
              </View>

              <View style={styles.safeDailyBanner}>
                <Ionicons name="flash" size={16} color="#F47B4E" />
                <Text style={styles.safeDailyBannerText}>
                  {language === 'bn'
                    ? `দৈনিক নিরাপদ সীমা: ৳ ${dailySafeSpend} / দিন (৩০ দিন)`
                    : `Safe Daily Spending Limit: ৳ ${dailySafeSpend} / day`}
                </Text>
              </View>
            </LinearGradient>
          </View>
        )}

        {/* STEP 4: BEHAVIORAL HABITS & RISK CALIBRATION */}
        {step === 4 && (
          <View style={styles.stepContainer}>
            <View style={styles.stepHeaderCard}>
              <Text style={[styles.stepMainTitle, { color: theme.textPrimary }]}>
                {language === 'bn' ? '৪. খরচের স্বভাব ও আচরণ' : '4. Financial Habits & Awareness'}
              </Text>
              <Text style={[styles.stepMainSub, { color: theme.textSecondary }]}>
                {language === 'bn'
                  ? 'আপনার দৈনন্দিন স্বভাবের সাথে মিল রেখে ঝুঁকি পূর্বাভাস ও এআই কোচ সক্রিয় হবে।'
                  : 'Calibrates the Machine Learning Risk Warning engine and Gemini AI Coach.'}
              </Text>
            </View>

            <GlassCard style={styles.fieldCard}>
              <View style={styles.cardHeader}>
                <Ionicons name="analytics-outline" size={18} color="#38BDF8" />
                <Text style={[styles.fieldLabel, { color: theme.textPrimary }]}>{t.trackSpending}</Text>
              </View>
              <SegmentedControl
                options={[
                  { value: '1', label: language === 'bn' ? 'কখনও না' : 'Never' },
                  { value: '3', label: language === 'bn' ? 'সাপ্তাহিক' : 'Weekly' },
                  { value: '5', label: language === 'bn' ? 'প্রতিদিন' : 'Daily' },
                ]}
                value={String(trackSpending)}
                onChange={(v) => setTrackSpending(parseInt(v, 10))}
              />
            </GlassCard>

            <GlassCard style={styles.fieldCard}>
              <View style={styles.cardHeader}>
                <Ionicons name="phone-portrait-outline" size={18} color="#38BDF8" />
                <Text style={[styles.fieldLabel, { color: theme.textPrimary }]}>{t.mobileBankingUse}</Text>
              </View>
              <SegmentedControl
                options={[
                  { value: 'Rarely', label: language === 'bn' ? 'খুব কম' : 'Rarely' },
                  { value: 'Weekly', label: language === 'bn' ? 'সাপ্তাহিক' : 'Weekly' },
                  { value: 'Daily', label: language === 'bn' ? 'দৈনিক' : 'Daily' },
                ]}
                value={mobileBankingUse}
                onChange={setMobileBankingUse}
              />
            </GlassCard>

            <GlassCard style={styles.fieldCard}>
              <View style={styles.cardHeader}>
                <Ionicons name="alert-circle-outline" size={18} color="#F59E0B" />
                <Text style={[styles.fieldLabel, { color: theme.textPrimary }]}>{t.borrowedFromFriends}</Text>
              </View>
              <SegmentedControl
                options={[
                  { value: 'Never', label: language === 'bn' ? 'কখনও না' : 'Never' },
                  { value: '1–2', label: language === 'bn' ? '১–২ বার' : '1–2 times' },
                  { value: '3+', label: language === 'bn' ? '৩+ বার' : '3+ times' },
                ]}
                value={borrowedFromFriends}
                onChange={setBorrowedFromFriends}
              />
            </GlassCard>

            <View style={styles.sectionHeaderWrap}>
              <Ionicons name="pulse-outline" size={16} color="#5A8296" />
              <Text style={styles.groupHeading}>
                {language === 'bn' ? 'আর্থিক সচেতনতা ও ঝোঁক মূল্যায়ন' : 'Financial Awareness & Impulsiveness'}
              </Text>
            </View>

            <GlassCard style={styles.fieldCard}>
              <Text style={[styles.likertPrompt, { color: theme.textPrimary }]}>
                {language === 'bn'
                  ? '১. আমার কাছে কত টাকা অবশিষ্ট আছে তা আমি সব সময় মোটামুটি জানি।'
                  : '1. I always know roughly how much money I have left.'}
              </Text>
              <LikertRating
                value={awareBalance}
                onChange={setAwareBalance}
                labelMin={language === 'bn' ? 'একমত নই' : 'Disagree'}
                labelMax={language === 'bn' ? 'সম্পূর্ণ একমত' : 'Agree'}
              />
            </GlassCard>

            <GlassCard style={styles.fieldCard}>
              <Text style={[styles.likertPrompt, { color: theme.textPrimary }]}>
                {language === 'bn'
                  ? '২. অপ্রয়োজনীয় কেনাকাটার আগে আমি আমার অবশিষ্ট বাজেট চেক করি।'
                  : '2. I check my remaining budget before buying non-essentials.'}
              </Text>
              <LikertRating
                value={awareCheckBeforeBuy}
                onChange={setAwareCheckBeforeBuy}
                labelMin={language === 'bn' ? 'একমত নই' : 'Disagree'}
                labelMax={language === 'bn' ? 'সম্পূর্ণ একমত' : 'Agree'}
              />
            </GlassCard>

            <GlassCard style={styles.fieldCard}>
              <Text style={[styles.likertPrompt, { color: theme.textPrimary }]}>
                {language === 'bn'
                  ? '৩. আমি প্রায়ই পরিকল্পনা ছাড়া হুটহাট খাবার বা জিনিস কিনে ফেলি।'
                  : '3. I frequently buy food or items on impulse without planning.'}
              </Text>
              <LikertRating
                value={impulseSpontaneous}
                onChange={setImpulseSpontaneous}
                labelMin={language === 'bn' ? 'একমত নই' : 'Disagree'}
                labelMax={language === 'bn' ? 'সম্পূর্ণ একমত' : 'Agree'}
              />
            </GlassCard>

            <GlassCard style={styles.fieldCard}>
              <Text style={[styles.likertPrompt, { color: theme.textPrimary }]}>
                {language === 'bn'
                  ? '৪. অপরিকল্পিত কেনাকাটার পর আমি প্রায়ই অনুশোচনা করি।'
                  : '4. I frequently feel regret after unplanned spending.'}
              </Text>
              <LikertRating
                value={impulseRegret}
                onChange={setImpulseRegret}
                labelMin={language === 'bn' ? 'একমত নই' : 'Disagree'}
                labelMax={language === 'bn' ? 'সম্পূর্ণ একমত' : 'Agree'}
              />
            </GlassCard>
          </View>
        )}
      </ScrollView>

      {/* Floating Glass Sticky Footer with Safe Gesture Bar Padding */}
      <View style={[styles.bottomFooter, { paddingBottom: safeBottom + 10 }]}>
        {Platform.OS !== 'web' ? (
          <BlurView intensity={65} tint="dark" style={StyleSheet.absoluteFill} />
        ) : (
          <View style={[StyleSheet.absoluteFill, styles.webFooterBackdrop]} />
        )}

        <View style={styles.footerInner}>
          {step > 1 && (
            <TouchableOpacity
              style={styles.backBtn}
              onPress={handleBack}
              activeOpacity={0.75}
            >
              <Ionicons name="arrow-back" size={18} color="rgba(248, 250, 252, 0.7)" />
              <Text style={styles.backBtnText}>{t.back}</Text>
            </TouchableOpacity>
          )}

          <TouchableOpacity
            style={[styles.nextBtnWrap, submitting && styles.btnDisabled]}
            onPress={handleNext}
            disabled={submitting}
            activeOpacity={0.85}
          >
            <LinearGradient
              colors={
                step === 4
                  ? ['#10B981', '#059669']
                  : ['#F47B4E', '#E06A3B']
              }
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 0 }}
              style={styles.nextGradientBtn}
            >
              {submitting ? (
                <ActivityIndicator color="#FFFFFF" size="small" />
              ) : (
                <View style={styles.btnContentRow}>
                  <Text style={styles.nextBtnText}>
                    {step === 4 ? t.finishOnboarding : t.next}
                  </Text>
                  <Ionicons
                    name={step === 4 ? 'checkmark-circle' : 'arrow-forward'}
                    size={18}
                    color="#FFFFFF"
                    style={{ marginLeft: 6 }}
                  />
                </View>
              )}
            </LinearGradient>
          </TouchableOpacity>
        </View>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: THEME.colors.canvas,
  },
  topHeader: {
    paddingHorizontal: 16,
    paddingBottom: 8,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255, 255, 255, 0.08)',
    backgroundColor: 'rgba(6, 11, 25, 0.85)',
  },
  topHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 8,
  },
  headerLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    flex: 1,
  },
  backCircleBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: 'rgba(255, 255, 255, 0.08)',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.14)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  titleColumn: {
    flex: 1,
  },
  headerTitle: {
    fontSize: 16,
    fontWeight: '800',
    color: '#F8FAFC',
    letterSpacing: -0.3,
  },
  headerSubtitle: {
    fontSize: 11,
    color: THEME.colors.textMuted,
    marginTop: 1,
  },
  headerRightActions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  skipBtn: {
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 16,
    backgroundColor: 'rgba(255, 255, 255, 0.08)',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.14)',
  },
  skipBtnText: {
    fontSize: 12,
    color: 'rgba(248, 250, 252, 0.8)',
    fontWeight: '600',
  },
  langPill: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 20,
    backgroundColor: 'rgba(255, 255, 255, 0.06)',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.12)',
  },
  langPillText: {
    fontSize: 12,
    color: '#38BDF8',
    fontWeight: '700',
  },
  scrollContent: {
    paddingHorizontal: 16,
    paddingTop: 16,
  },
  stepContainer: {
    gap: 12,
  },
  stepHeaderCard: {
    paddingHorizontal: 4,
    marginBottom: 4,
  },
  stepMainTitle: {
    fontSize: 18,
    fontWeight: '900',
    letterSpacing: -0.4,
  },
  stepMainSub: {
    fontSize: 13,
    marginTop: 4,
    lineHeight: 18,
  },
  fieldCard: {
    padding: 16,
    overflow: 'hidden',
  },
  cardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 12,
  },
  fieldLabel: {
    fontSize: 14,
    fontWeight: '700',
    color: THEME.colors.textPrimary,
    letterSpacing: -0.2,
  },
  chipGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
  },
  helperNotice: {
    fontSize: 12,
    marginTop: 10,
    fontStyle: 'italic',
  },
  mathPreviewCard: {
    borderRadius: 18,
    borderWidth: 1.5,
    borderColor: 'rgba(244, 123, 78, 0.35)',
    padding: 16,
    marginTop: 6,
  },
  mathHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 12,
  },
  mathHeaderTitle: {
    fontSize: 15,
    fontWeight: '800',
    letterSpacing: -0.2,
  },
  mathRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 4,
  },
  mathLabel: {
    fontSize: 13,
  },
  mathValPositive: {
    fontSize: 14,
    fontWeight: '800',
    fontVariant: ['tabular-nums'],
  },
  mathValNegative: {
    fontSize: 14,
    fontWeight: '700',
    fontVariant: ['tabular-nums'],
  },
  mathDivider: {
    height: 1,
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
    marginVertical: 10,
  },
  mathResultLabel: {
    fontSize: 14,
    fontWeight: '800',
  },
  mathResultVal: {
    fontSize: 15,
    fontWeight: '900',
    fontVariant: ['tabular-nums'],
  },
  safeDailyBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(244, 123, 78, 0.15)',
    paddingHorizontal: 12,
    paddingVertical: 10,
    borderRadius: 12,
    marginTop: 12,
    gap: 8,
  },
  safeDailyBannerText: {
    fontSize: 14,
    fontWeight: '900',
    color: '#F47B4E',
  },
  sectionHeaderWrap: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 4,
    marginTop: 6,
  },
  groupHeading: {
    fontSize: 12,
    fontWeight: '800',
    color: '#5A8296',
    textTransform: 'uppercase',
    letterSpacing: 0.8,
  },
  likertPrompt: {
    fontSize: 14,
    fontWeight: '600',
    color: THEME.colors.textPrimary,
    lineHeight: 20,
    marginBottom: 10,
  },
  bottomFooter: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    borderTopWidth: 1,
    borderTopColor: 'rgba(255, 255, 255, 0.12)',
    paddingTop: 12,
    paddingHorizontal: 16,
    backgroundColor: 'rgba(6, 11, 25, 0.88)',
  },
  webFooterBackdrop: {
    backgroundColor: 'rgba(6, 11, 25, 0.94)',
  },
  footerInner: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  backBtn: {
    flex: 1,
    height: 50,
    borderRadius: 25,
    backgroundColor: 'rgba(255, 255, 255, 0.08)',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.14)',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
  },
  backBtnText: {
    fontSize: 14,
    fontWeight: '700',
    color: 'rgba(248, 250, 252, 0.85)',
  },
  nextBtnWrap: {
    flex: 2,
    borderRadius: 25,
    overflow: 'hidden',
    shadowColor: '#F47B4E',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.35,
    shadowRadius: 8,
    elevation: 4,
  },
  btnDisabled: {
    opacity: 0.5,
  },
  nextGradientBtn: {
    height: 50,
    alignItems: 'center',
    justifyContent: 'center',
  },
  btnContentRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
  },
  nextBtnText: {
    fontSize: 15,
    fontWeight: '800',
    color: '#FFFFFF',
    letterSpacing: -0.2,
  },
});