import React, { useState } from 'react';
import {
  View,
  Text,
  Modal,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  Platform,
  Dimensions,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useTheme } from '../constants/ThemeContext';
import { Language } from '../constants/translations';
import { BrandLogo } from './BrandLogo';

interface FeatureWalkthroughModalProps {
  visible: boolean;
  onClose: () => void;
  language: Language;
}

const { width: SCREEN_WIDTH } = Dimensions.get('window');

export const FeatureWalkthroughModal: React.FC<FeatureWalkthroughModalProps> = ({
  visible,
  onClose,
  language,
}) => {
  const { isDark, theme } = useTheme();
  const insets = useSafeAreaInsets();
  const [currentSlide, setCurrentSlide] = useState(0);

  const SLIDES = [
    {
      id: 'about_pockit',
      badgeEn: 'ABOUT POCKIT',
      badgeBn: 'পকেট পরিচিতি',
      titleEn: 'Your Student Money Buddy',
      titleBn: 'শিক্ষার্থীর নির্ভার মানি গাইড',
      subtitleEn: 'No more month-end empty pockets',
      subtitleBn: 'মাস শেষে আর টাকার টানাটানি নয়',
      descEn:
        'Pockit is built specifically for university students in Bangladesh. It takes the anxiety out of your allowance, protects your mess rent upfront, and tells you exactly what you can safely spend each day so you never run dry or borrow from friends.',
      descBn:
        'পকেট বিশেষভাবে বাংলাদেশের বিশ্ববিদ্যালয় শিক্ষার্থীদের জন্য তৈরি। এটি আপনার মেস ভাড়া ও জরুরি খরচ শুরুতেই আলাদা রেখে প্রতিদিনের জন্য একটি নিরাপদ খরচের হিসাব তৈরি করে, যাতে মাস শেষে আর বন্ধুদের কাছে ধার চাইতে না হয়।',
      icon: 'sparkles-outline',
      accentColor: theme.primary,
      accentBg: theme.terracottaSoft,
      featuresEn: [
        'Designed for mess, hostel & day-scholar students',
        'Real-time pocket allowance tracking in Taka (৳)',
        'Bilingual interface (English & সহজ বাংলা)',
      ],
      featuresBn: [
        'মেস, হল ও বাসা থেকে পড়ুয়া সবার জন্য উপযোগী',
        'প্রতি মুহূর্তের ব্যালেন্স ও খরচের লাইভ হিসাব',
        'বাংলা ও ইংরেজি দুই ভাষাতেই সম্পূর্ণ সহজ সেবা',
      ],
    },
    {
      id: 'daily_limit',
      badgeEn: 'THREE-BUCKET ENGINE',
      badgeBn: 'তিন-স্তরের বাজেট ইঞ্জিন',
      titleEn: 'Smart Daily Safe Limit',
      titleBn: 'স্মার্ট দৈনিক নিরাপদ বাজেট',
      subtitleEn: 'Spend freely without month-end panic',
      subtitleBn: 'কোনো ভয় ছাড়াই নির্ভয়ে খরচ করুন',
      descEn:
        'Never stress about whether you can afford lunch or a rickshaw ride. Pockit automatically ring-fences your fixed rent, mess meal advance, and tuition reserve, dividing what is left by the days remaining so your wallet lasts.',
      descBn:
        '‘এই খরচটা করলে মাস চলবে তো?’—এই দুশ্চিন্তা চিরতরে দূর করুন। আপনার মেস ভাড়া, খাবারের অগ্রিম ও সেমিস্টার ফি আলাদা রেখে বাকি টাকাকে মাসের বাকি দিনগুলো দিয়ে ভাগ করে দৈনিক নিরাপদ সীমা তৈরি করা হয়।',
      icon: 'wallet-outline',
      accentColor: theme.primary,
      accentBg: theme.terracottaSoft,
      featuresEn: [
        'Fixed rent, food pool & tuition protected upfront',
        'Live daily allowance recalibrates as you spend',
        'Instant warning when spending dips into savings',
      ],
      featuresBn: [
        'মেস ভাড়া, খাবার বিল ও সেমিস্টার ফি আগে থেকেই আলাদা',
        'কোনো খরচ লিখলেই দৈনিক সীমা স্বয়ংক্রিয়ভাবে সমন্বয় হয়',
        'জমানো টাকায় টান পড়লে সাথে সাথে সতর্কবার্তা',
      ],
    },
    {
      id: 'risk_alert',
      badgeEn: 'AI RISK MONITOR',
      badgeBn: 'এআই ঝুঁকি পূর্বাভাস',
      titleEn: '0–100% Cash Risk Radar',
      titleBn: '০–১০০% লাইভ ঝুঁকি রাডার',
      subtitleEn: 'Predicts shortages before they happen',
      subtitleBn: 'টাকা ফুরিয়ে যাওয়ার আগেই সতর্কতা',
      descEn:
        'Trained on university student spending data, our intelligent ML classifier monitors your spending velocity and alerts you if your pace is likely to trigger a month-end cash crisis.',
      descBn:
        'শিক্ষার্থীদের বাস্তব খরচের তথ্যের ওপর ভিত্তি করে আমাদের ML মডেল আপনার খরচের গতি পর্যবেক্ষণ করে। মাসের শেষে টাকা সংকট হওয়ার সম্ভাবনা থাকলে আগেই আপনাকে সতর্ক করে দেয়।',
      icon: 'analytics-outline',
      accentColor: '#F59E0B',
      accentBg: isDark ? 'rgba(245, 158, 11, 0.16)' : '#FEF3C7',
      featuresEn: [
        'Green (Safe), Yellow (Caution) & Orange (Alert) tiers',
        'Surfaces peer borrowing and impulse spend drivers',
        'Tap the circular gauge anytime for personalized tips',
      ],
      featuresBn: [
        'সবুজ (নিরাপদ), হলুদ (সতর্ক) ও কমলা (উচ্চ ঝুঁকি) স্ট্যাটাস',
        'বন্ধুদের থেকে ধার বা অনিয়ন্ত্রিত খরচের কারণ প্রদর্শন',
        'গেজে এক ট্যাপেই বিস্তারিত কারণ ও পরামর্শ জানার সুবিধা',
      ],
    },
    {
      id: 'ledger',
      badgeEn: 'DAILY LOG & LEDGER',
      badgeBn: 'দৈনিক হিসাব ও লেজার',
      titleEn: 'Track Cash & bKash in 3 Seconds',
      titleBn: 'ক্যাশ ও বিকাশ হিসাব ৩ সেকেন্ডে',
      subtitleEn: 'No boring spreadsheets, just instant clarity',
      subtitleBn: 'ঝামেলাহীন আয় ও খরচের হিসাব',
      descEn:
        'No complicated accounting tables. Tap (+), enter the amount, select cash or bKash/Nagad, and you are done. Your daily net cashflow, monthly inflow, and categorized expenses stay neatly organized.',
      descBn:
        'কোনো জটিল খাতা বা এক্সেল শিট লাগবে না। শুধু (+) চাপুন, টাকার পরিমাণ লিখুন আর বিকাশ বা ক্যাশ সিলেক্ট করুন। ক্যালেন্ডার ও লেজারে আপনার প্রতিবেলার খরচ নিমিষেই সংরক্ষিত হয়ে যাবে।',
      icon: 'calendar-outline',
      accentColor: '#38BDF8',
      accentBg: isDark ? 'rgba(56, 189, 248, 0.16)' : '#E0F2FE',
      featuresEn: [
        'Multi-source income: allowance, tuition, freelance',
        'Payment tags: Cash, bKash, Nagad, Rocket, Bank',
        'Visual calendar strip with date-by-date cashflows',
      ],
      featuresBn: [
        'বিভিন্ন উৎস: বাসা থেকে পাঠানো টাকা, টিউশনি বা ফ্রিল্যান্সিং',
        'পেমেন্ট মাধ্যম নির্বাচন (ক্যাশ, বিকাশ, নগদ বা ব্যাংক)',
        'ক্যালেন্ডারে প্রতিদিনের হিসাব দেখার সহজ ও পরিষ্কার ব্যবস্থা',
      ],
    },
    {
      id: 'smart_coach',
      badgeEn: 'GOALS & SMART COACH',
      badgeBn: 'সঞ্চয় লক্ষ্য ও স্মার্ট কোচ',
      titleEn: 'Dream Goals & Campus Senior Coach',
      titleBn: 'স্বপ্নের সঞ্চয় ও ক্যাম্পাস কোচ',
      subtitleEn: 'Save for your dreams & get honest guidance',
      subtitleBn: 'গ্যাজেটের জন্য সঞ্চয় ও অভিজ্ঞ পরামর্শ',
      descEn:
        'Ring-fence monthly savings for your next laptop, gadgets, or semester fees. Before making major purchases, ask our AI Coach—acting like a friendly, experienced campus senior (Bhai/Apu) giving you honest advice and smart alternatives.',
      descBn:
        'ল্যাপটপ, বই বা কোনো সফরের জন্য প্রতি মাসে কিছু টাকা আলাদা ভল্টে জমান। আর কোনো বড় কেনাকাটার আগে আমাদের স্মার্ট কোচকে জিজ্ঞেস করুন—ঠিক যেন ক্যাম্পাসের একজন অভিজ্ঞ বড় ভাই/অপুর মতো আপনাকে সঠিক পরামর্শ দেবে।',
      icon: 'compass-outline',
      accentColor: theme.slateBlue,
      accentBg: theme.slateBlueTint,
      featuresEn: [
        'Dream Goal Vault with automatic monthly ring-fencing',
        'Ask Coach Before I Buy pre-purchase simulator',
        'Bangladeshi campus money hacks & friendly guidance',
      ],
      featuresBn: [
        'মূল বাজেট থেকে মাসিক সঞ্চয় আলাদা ও সুরক্ষিত রাখা',
        'কেনার আগেই ঝুঁকি যাচাই করার প্রি-পারচেজ সিমুলেটর',
        'ক্যাম্পাস জীবনের সাশ্রয়ী হ্যাকস ও বন্ধুত্বপূর্ণ পরামর্শ',
      ],
    },
  ];

  const handleNext = () => {
    try {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    } catch {}
    if (currentSlide < SLIDES.length - 1) {
      setCurrentSlide((s) => s + 1);
    } else {
      handleComplete();
    }
  };

  const handleBack = () => {
    try {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    } catch {}
    if (currentSlide > 0) {
      setCurrentSlide((s) => s - 1);
    }
  };

  const handleComplete = () => {
    try {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    } catch {}
    setCurrentSlide(0);
    onClose();
  };

  const slide = SLIDES[currentSlide];
  const isLast = currentSlide === SLIDES.length - 1;

  return (
    <Modal
      visible={visible}
      animationType="fade"
      transparent={false}
      onRequestClose={handleComplete}
    >
      <View style={[styles.container, { backgroundColor: theme.canvas }]}>
        {/* Top Header Bar */}
        <View
          style={[
            styles.topHeader,
            {
              paddingTop: Math.max(insets.top, Platform.OS === 'android' ? 36 : 48) + 8,
              borderBottomColor: theme.border,
            },
          ]}
        >
          <View style={styles.topHeaderLeft}>
            <BrandLogo size="sm" />
            <View>
              <Text style={[styles.brandTitleText, { color: theme.textPrimary }]}>
                {language === 'bn' ? 'পকেট (Pockit)' : 'Pockit'}
              </Text>
              <Text style={[styles.brandSubText, { color: theme.textSecondary }]}>
                {language === 'bn' ? 'ফিচার পরিচিতি ও গাইড' : 'App Guide & Tour'}
              </Text>
            </View>
          </View>

          <TouchableOpacity
            style={styles.skipBtn}
            onPress={handleComplete}
            activeOpacity={0.7}
          >
            <Text style={[styles.skipBtnText, { color: theme.textSecondary }]}>
              {language === 'bn' ? 'এড়িয়ে যান' : 'Skip'}
            </Text>
            <Ionicons name="close-circle-outline" size={18} color={theme.textSecondary} />
          </TouchableOpacity>
        </View>

        {/* Main Content Area */}
        <ScrollView
          style={styles.scrollArea}
          contentContainerStyle={[styles.scrollContent, { paddingBottom: insets.bottom + 110 }]}
          showsVerticalScrollIndicator={false}
        >
          {/* Slide Hero Card */}
          <View
            style={[
              styles.cardContainer,
              {
                backgroundColor: theme.surface,
                borderColor: theme.border,
                shadowColor: theme.shadowColor,
              },
            ]}
          >
            {/* Slide Badge & Step Counter */}
            <View style={styles.badgeRow}>
              <View style={[styles.badgePill, { backgroundColor: slide.accentBg }]}>
                <Text style={[styles.badgePillText, { color: slide.accentColor }]}>
                  {language === 'bn' ? slide.badgeBn : slide.badgeEn}
                </Text>
              </View>

              <Text style={[styles.stepCounterText, { color: theme.textMuted }]}>
                {currentSlide + 1} / {SLIDES.length}
              </Text>
            </View>

            {/* Central Icon Emblem */}
            <View style={styles.iconCenterWrap}>
              <View style={[styles.iconOuterCircle, { backgroundColor: slide.accentBg }]}>
                <Ionicons
                  name={slide.icon as keyof typeof Ionicons.glyphMap}
                  size={44}
                  color={slide.accentColor}
                />
              </View>
            </View>

            {/* Title & Subtitle */}
            <Text style={[styles.slideTitle, { color: theme.textPrimary }]}>
              {language === 'bn' ? slide.titleBn : slide.titleEn}
            </Text>
            <Text style={[styles.slideSubtitle, { color: slide.accentColor }]}>
              {language === 'bn' ? slide.subtitleBn : slide.subtitleEn}
            </Text>

            {/* Description Paragraph */}
            <Text style={[styles.slideDesc, { color: theme.textSecondary }]}>
              {language === 'bn' ? slide.descBn : slide.descEn}
            </Text>

            {/* Feature Bullets Card */}
            <View
              style={[
                styles.bulletsCard,
                {
                  backgroundColor: isDark ? 'rgba(255, 255, 255, 0.03)' : '#F8FAFC',
                  borderColor: theme.border,
                },
              ]}
            >
              {(language === 'bn' ? slide.featuresBn : slide.featuresEn).map((f, idx) => (
                <View key={idx} style={styles.bulletRow}>
                  <View style={[styles.bulletDot, { backgroundColor: slide.accentColor }]} />
                  <Text style={[styles.bulletText, { color: theme.textPrimary }]}>
                    {f}
                  </Text>
                </View>
              ))}
            </View>
          </View>
        </ScrollView>

        {/* Bottom Floating Navigation & Pagination Bar */}
        <View
          style={[
            styles.bottomBar,
            {
              backgroundColor: theme.surface,
              borderColor: theme.border,
              paddingBottom: Math.max(insets.bottom, 16) + 8,
            },
          ]}
        >
          {/* Dot Pagination Indicators */}
          <View style={styles.paginationRow}>
            {SLIDES.map((_, idx) => {
              const isActive = idx === currentSlide;
              return (
                <TouchableOpacity
                  key={idx}
                  onPress={() => {
                    try { Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light); } catch {}
                    setCurrentSlide(idx);
                  }}
                  activeOpacity={0.7}
                  style={[
                    styles.pageDot,
                    {
                      backgroundColor: isActive ? theme.primary : (isDark ? 'rgba(255, 255, 255, 0.2)' : '#CBD5E1'),
                      width: isActive ? 24 : 8,
                    },
                  ]}
                />
              );
            })}
          </View>

          {/* Action Buttons Row */}
          <View style={styles.actionRow}>
            {currentSlide > 0 ? (
              <TouchableOpacity
                style={[
                  styles.navBtn,
                  styles.backBtn,
                  {
                    backgroundColor: isDark ? 'rgba(255, 255, 255, 0.08)' : '#F1F5F9',
                    borderColor: theme.border,
                  },
                ]}
                onPress={handleBack}
                activeOpacity={0.75}
              >
                <Ionicons name="arrow-back" size={16} color={theme.textPrimary} style={{ marginRight: 6 }} />
                <Text style={[styles.backBtnText, { color: theme.textPrimary }]}>
                  {language === 'bn' ? 'পূর্ববর্তী' : 'Back'}
                </Text>
              </TouchableOpacity>
            ) : (
              <View style={{ flex: 1 }} />
            )}

            <TouchableOpacity
              style={[
                styles.navBtn,
                styles.nextBtn,
                { backgroundColor: theme.primary },
              ]}
              onPress={handleNext}
              activeOpacity={0.85}
            >
              <Text style={styles.nextBtnText}>
                {isLast
                  ? (language === 'bn' ? 'শুরু করুন' : 'Get Started')
                  : (language === 'bn' ? 'পরবর্তী' : 'Next')}
              </Text>
              <Ionicons
                name={isLast ? 'checkmark-circle' : 'arrow-forward'}
                size={16}
                color="#FFFFFF"
                style={{ marginLeft: 6 }}
              />
            </TouchableOpacity>
          </View>
        </View>
      </View>
    </Modal>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  topHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 18,
    paddingBottom: 14,
    borderBottomWidth: 1,
  },
  topHeaderLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  brandTitleText: {
    fontSize: 16,
    fontWeight: '800',
    letterSpacing: -0.3,
  },
  brandSubText: {
    fontSize: 11,
    marginTop: 1,
  },
  skipBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 6,
    paddingHorizontal: 10,
    borderRadius: 16,
    gap: 4,
  },
  skipBtnText: {
    fontSize: 13,
    fontWeight: '600',
  },
  scrollArea: {
    flex: 1,
  },
  scrollContent: {
    padding: 16,
  },
  cardContainer: {
    borderRadius: 24,
    borderWidth: 1,
    padding: 20,
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.10,
    shadowRadius: 16,
    elevation: 4,
  },
  badgeRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  badgePill: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 8,
  },
  badgePillText: {
    fontSize: 10,
    fontWeight: '800',
    letterSpacing: 0.8,
  },
  stepCounterText: {
    fontSize: 12,
    fontWeight: '700',
    fontVariant: ['tabular-nums'],
  },
  iconCenterWrap: {
    alignItems: 'center',
    justifyContent: 'center',
    marginVertical: 14,
  },
  iconOuterCircle: {
    width: 88,
    height: 88,
    borderRadius: 44,
    alignItems: 'center',
    justifyContent: 'center',
  },
  slideTitle: {
    fontSize: 22,
    fontWeight: '800',
    textAlign: 'center',
    letterSpacing: -0.5,
    marginBottom: 4,
  },
  slideSubtitle: {
    fontSize: 13,
    fontWeight: '700',
    textAlign: 'center',
    marginBottom: 14,
  },
  slideDesc: {
    fontSize: 13,
    lineHeight: 20,
    textAlign: 'center',
    marginBottom: 20,
    paddingHorizontal: 6,
  },
  bulletsCard: {
    borderRadius: 16,
    borderWidth: 1,
    padding: 14,
    gap: 10,
  },
  bulletRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  bulletDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
  },
  bulletText: {
    fontSize: 12,
    fontWeight: '600',
    flex: 1,
    lineHeight: 17,
  },
  bottomBar: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    borderTopWidth: 1,
    paddingTop: 12,
    paddingHorizontal: 18,
  },
  paginationRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    marginBottom: 12,
  },
  pageDot: {
    height: 8,
    borderRadius: 4,
  },
  actionRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 12,
  },
  navBtn: {
    height: 48,
    borderRadius: 24,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 20,
  },
  backBtn: {
    flex: 1,
    borderWidth: 1,
  },
  backBtnText: {
    fontSize: 14,
    fontWeight: '700',
  },
  nextBtn: {
    flex: 1.5,
  },
  nextBtnText: {
    color: '#FFFFFF',
    fontSize: 15,
    fontWeight: '700',
  },
});

