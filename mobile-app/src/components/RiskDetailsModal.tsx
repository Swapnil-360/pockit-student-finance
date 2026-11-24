import React from 'react';
import {
  View,
  Text,
  Modal,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  Platform,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useTheme } from '../constants/ThemeContext';
import { Language } from '../constants/translations';
import { RiskScoreSummary } from '../services/api';

interface RiskDetailsModalProps {
  visible: boolean;
  onClose: () => void;
  currentRisk: RiskScoreSummary;
  dailyLimit: number;
  daysRemaining: number;
  language: Language;
}

export const RiskDetailsModal: React.FC<RiskDetailsModalProps> = ({
  visible,
  onClose,
  currentRisk,
  dailyLimit,
  daysRemaining,
  language,
}) => {
  const { isDark, theme } = useTheme();
  const insets = useSafeAreaInsets();
  const safeBottom = Math.max(insets.bottom, 16);

  const isHighRisk = currentRisk.risk_score_pct >= 70;
  const isModRisk = currentRisk.risk_score_pct >= 40 && currentRisk.risk_score_pct < 70;

  const tierColor = isHighRisk
    ? theme.primary
    : isModRisk
    ? theme.riskModerate
    : theme.riskLow;

  const tierBg = isHighRisk
    ? (isDark ? 'rgba(244, 123, 78, 0.16)' : '#FEE2E2')
    : isModRisk
    ? (isDark ? 'rgba(245, 158, 11, 0.16)' : '#FEF3C7')
    : (isDark ? 'rgba(16, 185, 129, 0.16)' : '#E6F9F0');

  const tierLabel = language === 'bn'
    ? currentRisk.risk_tier_bn || (isHighRisk ? 'উচ্চ ঝুঁকি' : isModRisk ? 'মাঝারি ঝুঁকি' : 'কম ঝুঁকি')
    : currentRisk.risk_tier;

  return (
    <Modal
      visible={visible}
      transparent
      animationType="slide"
      onRequestClose={onClose}
    >
      <View style={styles.overlay}>
        <TouchableOpacity
          style={styles.backdrop}
          activeOpacity={1}
          onPress={onClose}
        />

        <View
          style={[
            styles.sheetContainer,
            {
              backgroundColor: theme.surface,
              borderColor: theme.border,
              paddingBottom: safeBottom + 12,
            },
          ]}
        >
          {/* Drag Handle */}
          <View style={[styles.dragHandle, { backgroundColor: theme.borderMedium }]} />

          {/* Header Row */}
          <View style={styles.headerRow}>
            <View style={styles.headerTitleWrap}>
              <Text style={[styles.title, { color: theme.textPrimary }]}>
                {language === 'bn' ? 'আর্থিক ঝুঁকি বিশ্লেষণ' : 'Financial Risk Analysis'}
              </Text>
              <Text style={[styles.subtitle, { color: theme.textSecondary }]}>
                {language === 'bn'
                  ? 'ML মডেলের পূর্বাভাস ও ব্যয়ের বিশ্লেষণ'
                  : 'ML risk model breakdown & pacing drivers'}
              </Text>
            </View>
            <TouchableOpacity
              onPress={() => {
                try { Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light); } catch {}
                onClose();
              }}
              style={styles.closeBtn}
              activeOpacity={0.7}
            >
              <Ionicons name="close" size={22} color={theme.textSecondary} />
            </TouchableOpacity>
          </View>

          <ScrollView
            showsVerticalScrollIndicator={false}
            contentContainerStyle={styles.scrollContent}
          >
            {/* Top Score Banner */}
            <View
              style={[
                styles.scoreBanner,
                {
                  backgroundColor: isDark ? 'rgba(255, 255, 255, 0.04)' : '#F8FAFC',
                  borderColor: theme.border,
                },
              ]}
            >
              <View style={styles.scoreLeft}>
                <Text style={[styles.scoreNumber, { color: theme.textPrimary }]}>
                  {currentRisk.risk_score_pct.toFixed(1)}%
                </Text>
                <Text style={[styles.scoreLabel, { color: theme.textMuted }]}>
                  {language === 'bn' ? 'ঝুঁকির সম্ভাবনা' : 'Risk Probability'}
                </Text>
              </View>

              <View style={[styles.tierBadge, { backgroundColor: tierBg, borderColor: tierColor }]}>
                <Text style={[styles.tierBadgeText, { color: tierColor }]}>
                  {tierLabel}
                </Text>
              </View>
            </View>

            {/* Model Assessment Warning */}
            <View
              style={[
                styles.warningBox,
                {
                  backgroundColor: isDark ? 'rgba(244, 123, 78, 0.12)' : '#FFF5F0',
                  borderColor: isDark ? 'rgba(244, 123, 78, 0.3)' : 'rgba(242, 122, 73, 0.3)',
                },
              ]}
            >
              <Ionicons
                name={isHighRisk ? 'warning-outline' : 'information-circle-outline'}
                size={20}
                color={tierColor}
                style={{ marginTop: 1 }}
              />
              <Text style={[styles.warningText, { color: theme.textPrimary }]}>
                {language === 'bn'
                  ? currentRisk.summary_warning_bn || 'মাসের শেষে আপনার তহবিল শেষ হওয়ার ঝুঁকি রয়েছে।'
                  : currentRisk.summary_warning_en || 'Caution: Projected to run out of money before month-end.'}
              </Text>
            </View>

            {/* Vulnerability Drivers List */}
            {currentRisk.top_drivers && currentRisk.top_drivers.length > 0 && (
              <View style={styles.driversSection}>
                <Text style={[styles.sectionHeading, { color: theme.textSecondary }]}>
                  {language === 'bn' ? 'প্রধান ঝুঁকির কারণসমূহ' : 'Primary Vulnerability Drivers'}
                </Text>

                {currentRisk.top_drivers.map((d, idx) => {
                  const isCrit = d.severity === 'critical';
                  const isWarn = d.severity === 'warning';
                  const iconColor = isCrit
                    ? theme.primary
                    : isWarn
                    ? theme.riskModerate
                    : theme.riskLow;

                  return (
                    <View
                      key={idx}
                      style={[
                        styles.driverCard,
                        {
                          backgroundColor: isDark ? 'rgba(255, 255, 255, 0.03)' : '#FFFFFF',
                          borderColor: theme.border,
                        },
                      ]}
                    >
                      <View style={[styles.driverIconCircle, { backgroundColor: `${iconColor}18` }]}>
                        <Ionicons
                          name={isCrit ? 'alert-circle' : isWarn ? 'warning' : 'checkmark-circle'}
                          size={18}
                          color={iconColor}
                        />
                      </View>
                      <View style={styles.driverInfo}>
                        <View style={styles.driverTitleRow}>
                          <Text style={[styles.driverName, { color: theme.textPrimary }]}>
                            {language === 'bn' ? d.feature_bn : d.feature}
                          </Text>
                          <Text style={[styles.severityPill, { color: iconColor }]}>
                            {isCrit ? 'CRITICAL' : isWarn ? 'WARNING' : 'HEALTHY'}
                          </Text>
                        </View>
                        <Text style={[styles.driverDesc, { color: theme.textSecondary }]}>
                          {language === 'bn' ? d.description_bn : d.description_en}
                        </Text>
                      </View>
                    </View>
                  );
                })}
              </View>
            )}

            {/* Daily Pacing Guidance */}
            <View
              style={[
                styles.coachingCard,
                {
                  backgroundColor: isDark ? 'rgba(90, 130, 150, 0.12)' : '#F0F6FA',
                  borderColor: theme.border,
                },
              ]}
            >
              <Ionicons name="compass-outline" size={20} color={theme.slateBlue} />
              <View style={styles.coachingTextCol}>
                <Text style={[styles.coachingTitle, { color: theme.textPrimary }]}>
                  {language === 'bn' ? 'দৈনিক খরচের পরামর্শ' : 'Daily Spending Pacing'}
                </Text>
                <Text style={[styles.coachingDesc, { color: theme.textSecondary }]}>
                  {language === 'bn'
                    ? `বাকি ${daysRemaining} দিনের জন্য প্রতিদিন সর্বোচ্চ ৳${dailyLimit} খরচ করতে পারেন। এর বেশি খরচ করলে মাসের শেষে ধার করতে হতে পারে।`
                    : `Keep daily spend at or below ৳${dailyLimit}/day across your remaining ${daysRemaining} days to prevent month-end liquidity deficit.`}
                </Text>
              </View>
            </View>

            {/* Close / Action Button */}
            <TouchableOpacity
              style={[styles.confirmBtn, { backgroundColor: theme.primary }]}
              onPress={() => {
                try { Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light); } catch {}
                onClose();
              }}
              activeOpacity={0.85}
            >
              <Text style={styles.confirmBtnText}>
                {language === 'bn' ? 'বুঝেছি' : 'Got It'}
              </Text>
            </TouchableOpacity>
          </ScrollView>
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
    backgroundColor: 'rgba(0, 0, 0, 0.60)',
  },
  sheetContainer: {
    borderTopLeftRadius: 26,
    borderTopRightRadius: 26,
    borderWidth: 1,
    maxHeight: '88%',
    paddingTop: 8,
    paddingHorizontal: 20,
    shadowOffset: { width: 0, height: -4 },
    shadowOpacity: 0.15,
    shadowRadius: 16,
    elevation: 10,
  },
  dragHandle: {
    width: 44,
    height: 5,
    borderRadius: 3,
    alignSelf: 'center',
    marginBottom: 14,
  },
  headerRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 16,
  },
  headerTitleWrap: {
    flex: 1,
    marginRight: 10,
  },
  title: {
    fontSize: 18,
    fontWeight: '800',
    letterSpacing: -0.3,
  },
  subtitle: {
    fontSize: 12,
    marginTop: 2,
  },
  closeBtn: {
    width: 32,
    height: 32,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
  },
  scrollContent: {
    paddingBottom: 20,
  },
  scoreBanner: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 16,
    borderRadius: 18,
    borderWidth: 1,
    marginBottom: 12,
  },
  scoreLeft: {
    flexDirection: 'column',
  },
  scoreNumber: {
    fontSize: 28,
    fontWeight: '800',
    letterSpacing: -0.5,
    fontVariant: ['tabular-nums'],
  },
  scoreLabel: {
    fontSize: 11,
    fontWeight: '600',
    marginTop: 2,
  },
  tierBadge: {
    paddingHorizontal: 12,
    paddingVertical: 5,
    borderRadius: 12,
    borderWidth: 1,
  },
  tierBadgeText: {
    fontSize: 12,
    fontWeight: '800',
    letterSpacing: 0.4,
    textTransform: 'uppercase',
  },
  warningBox: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    padding: 14,
    borderRadius: 16,
    borderWidth: 1,
    gap: 10,
    marginBottom: 18,
  },
  warningText: {
    flex: 1,
    fontSize: 13,
    lineHeight: 18,
    fontWeight: '500',
  },
  driversSection: {
    marginBottom: 16,
  },
  sectionHeading: {
    fontSize: 11,
    fontWeight: '800',
    textTransform: 'uppercase',
    letterSpacing: 0.6,
    marginBottom: 10,
  },
  driverCard: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    padding: 12,
    borderRadius: 14,
    borderWidth: 1,
    gap: 12,
    marginBottom: 8,
  },
  driverIconCircle: {
    width: 32,
    height: 32,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 2,
  },
  driverInfo: {
    flex: 1,
  },
  driverTitleRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 2,
  },
  driverName: {
    fontSize: 13,
    fontWeight: '700',
  },
  severityPill: {
    fontSize: 9,
    fontWeight: '800',
    letterSpacing: 0.3,
  },
  driverDesc: {
    fontSize: 11,
    lineHeight: 16,
  },
  coachingCard: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    padding: 14,
    borderRadius: 16,
    borderWidth: 1,
    gap: 12,
    marginBottom: 20,
  },
  coachingTextCol: {
    flex: 1,
  },
  coachingTitle: {
    fontSize: 13,
    fontWeight: '700',
    marginBottom: 3,
  },
  coachingDesc: {
    fontSize: 12,
    lineHeight: 17,
  },
  confirmBtn: {
    height: 48,
    borderRadius: 24,
    alignItems: 'center',
    justifyContent: 'center',
  },
  confirmBtnText: {
    color: '#FFFFFF',
    fontSize: 15,
    fontWeight: '700',
  },
});
