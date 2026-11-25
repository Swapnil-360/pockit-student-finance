import React, { useState } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity } from 'react-native';
import { THEME } from '../constants/theme';
import { TRANSLATIONS, Language } from '../constants/translations';
import { PredictionResult } from '../services/api';
import { RiskGauge } from './RiskGauge';
import { FeedbackModal } from './FeedbackModal';

interface ResultsDashboardProps {
  result: PredictionResult;
  studentInputs: any;
  language: Language;
  onReset: () => void;
}

export const ResultsDashboard: React.FC<ResultsDashboardProps> = ({
  result,
  studentInputs,
  language,
  onReset,
}) => {
  const t = TRANSLATIONS[language];
  const [feedbackVisible, setFeedbackVisible] = useState(false);
  const [adviceLang, setAdviceLang] = useState<'en' | 'bn'>(language);

  const activeAdviceList =
    adviceLang === 'bn' ? result.advice.bengali : result.advice.english;

  return (
    <ScrollView
      style={styles.container}
      contentContainerStyle={styles.scrollContent}
      showsVerticalScrollIndicator={false}
    >
      {/* 1. Primary Risk Hero Card */}
      <View style={styles.card}>
        <Text style={styles.sectionHeading}>
          {language === 'bn' ? 'আর্থিক ঝুঁকি মূল্যায়ন' : 'Financial Risk Diagnosis'}
        </Text>
        <RiskGauge
          score={result.risk_score_pct}
          tier={result.risk_tier}
          tierBn={result.risk_tier_bn}
          language={language}
        />
        <View style={styles.summaryBox}>
          <Text style={styles.summaryText}>
            {language === 'bn' ? result.summary_warning_bn : result.summary_warning_en}
          </Text>
        </View>
      </View>

      {/* 2. Composite Behavioral Scores */}
      <View style={styles.card}>
        <Text style={styles.cardHeading}>{t.compositeTitle}</Text>

        {/* Awareness */}
        <View style={styles.indexBlock}>
          <View style={styles.indexHeader}>
            <Text style={styles.indexLabel}>{t.awarenessScoreLabel}</Text>
            <Text style={[styles.indexValue, { color: THEME.colors.riskLow }]}>
              {result.composite_scores.awareness_score} <Text style={styles.indexOutOf}>/ 5.0</Text>
            </Text>
          </View>
          <View style={styles.track}>
            <View
              style={[
                styles.fill,
                {
                  width: `${(result.composite_scores.awareness_score / 5.0) * 100}%`,
                  backgroundColor: THEME.colors.riskLow,
                },
              ]}
            />
          </View>
        </View>

        {/* Impulse */}
        <View style={[styles.indexBlock, { marginTop: THEME.spacing.md }]}>
          <View style={styles.indexHeader}>
            <Text style={styles.indexLabel}>{t.impulseScoreLabel}</Text>
            <Text
              style={[
                styles.indexValue,
                {
                  color:
                    result.composite_scores.impulse_score > 3.5
                      ? THEME.colors.riskHigh
                      : THEME.colors.riskModerate,
                },
              ]}
            >
              {result.composite_scores.impulse_score} <Text style={styles.indexOutOf}>/ 5.0</Text>
            </Text>
          </View>
          <View style={styles.track}>
            <View
              style={[
                styles.fill,
                {
                  width: `${(result.composite_scores.impulse_score / 5.0) * 100}%`,
                  backgroundColor:
                    result.composite_scores.impulse_score > 3.5
                      ? THEME.colors.riskHigh
                      : THEME.colors.riskModerate,
                },
              ]}
            />
          </View>
        </View>
      </View>

      {/* 3. Key Risk Factors */}
      {result.top_drivers && result.top_drivers.length > 0 && (
        <View style={styles.card}>
          <Text style={styles.cardHeading}>{t.topDriversTitle}</Text>
          {result.top_drivers.map((driver, idx) => {
            const isCrit = driver.severity === 'critical';
            const isWarn = driver.severity === 'warning';
            const badgeColor = isCrit
              ? THEME.colors.riskHigh
              : isWarn
              ? THEME.colors.riskModerate
              : THEME.colors.riskLow;

            return (
              <View key={idx} style={styles.driverRow}>
                <View style={[styles.driverDot, { backgroundColor: badgeColor }]} />
                <View style={styles.driverInfo}>
                  <Text style={styles.driverTitle}>
                    {language === 'bn' ? driver.feature_bn : driver.feature}
                  </Text>
                  <Text style={styles.driverDesc}>
                    {language === 'bn' ? driver.description_bn : driver.description_en}
                  </Text>
                </View>
              </View>
            );
          })}
        </View>
      )}

      {/* 4. AI Advisor Card (TakaTrack Smart Coach) */}
      <View style={[styles.card, styles.aiCard]}>
        <View style={styles.aiHeader}>
          <View style={{ flex: 1 }}>
            <Text style={styles.aiTitle}>{t.aiAdviceTitle}</Text>
            <Text style={styles.aiSub}>{t.aiAdviceSub}</Text>
          </View>
          <TouchableOpacity
            style={styles.langToggleBtn}
            onPress={() => setAdviceLang(adviceLang === 'en' ? 'bn' : 'en')}
            activeOpacity={0.7}
          >
            <Text style={styles.langToggleText}>
              {adviceLang === 'en' ? 'বাংলা' : 'English'}
            </Text>
          </TouchableOpacity>
        </View>

        <View style={styles.tipsList}>
          {activeAdviceList.map((tip, idx) => (
            <View key={idx} style={styles.tipRow}>
              <View style={styles.tipNumberBadge}>
                <Text style={styles.tipNumber}>{idx + 1}</Text>
              </View>
              <Text style={styles.tipText}>{tip}</Text>
            </View>
          ))}
        </View>
      </View>

      {/* 5. Retraining Feedback Banner */}
      <TouchableOpacity
        style={styles.feedbackBanner}
        onPress={() => setFeedbackVisible(true)}
        activeOpacity={0.8}
      >
        <Text style={styles.feedbackTitle}>
          {language === 'bn' ? 'মাস শেষে ফলাফল রেকর্ড করুন' : 'Log Your Actual Outcome'}
        </Text>
        <Text style={styles.feedbackSub}>
          {language === 'bn'
            ? 'টাকা শেষ হয়েছিল কিনা তা জানিয়ে এআই মডেলকে আরও নির্ভুল হতে সাহায্য করুন'
            : 'Help us calibrate future models by logging whether you actually ran dry'}
        </Text>
      </TouchableOpacity>

      {/* 6. Recalculate Button */}
      <TouchableOpacity
        style={styles.resetBtn}
        onPress={onReset}
        activeOpacity={0.8}
      >
        <Text style={styles.resetBtnText}>{t.reset}</Text>
      </TouchableOpacity>

      {/* Modal */}
      <FeedbackModal
        visible={feedbackVisible}
        onClose={() => setFeedbackVisible(false)}
        predictionId={result.prediction_id}
        studentInputs={studentInputs}
        language={language}
      />
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: THEME.colors.background,
  },
  scrollContent: {
    paddingHorizontal: THEME.spacing.lg,
    paddingTop: THEME.spacing.lg,
    paddingBottom: THEME.spacing.xxxl,
  },
  card: {
    backgroundColor: THEME.colors.surface,
    borderRadius: THEME.radius.lg,
    padding: THEME.spacing.lg,
    marginBottom: THEME.spacing.lg,
    borderWidth: 1,
    borderColor: THEME.colors.border,
  },
  sectionHeading: {
    ...THEME.typography.h2,
    color: THEME.colors.textPrimary,
    textAlign: 'center',
    marginBottom: THEME.spacing.xs,
  },
  summaryBox: {
    backgroundColor: THEME.colors.surfaceSubtle,
    borderRadius: THEME.radius.md,
    padding: THEME.spacing.md,
    marginTop: THEME.spacing.xs,
    borderWidth: 1,
    borderColor: THEME.colors.border,
  },
  summaryText: {
    ...THEME.typography.body,
    color: THEME.colors.textSecondary,
    textAlign: 'center',
  },
  cardHeading: {
    ...THEME.typography.h2,
    color: THEME.colors.textPrimary,
    marginBottom: THEME.spacing.md,
  },
  indexBlock: {},
  indexHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'baseline',
    marginBottom: THEME.spacing.xs,
  },
  indexLabel: {
    ...THEME.typography.bodySmall,
    color: THEME.colors.textSecondary,
    fontWeight: '600',
  },
  indexValue: {
    fontSize: 15,
    fontWeight: '800',
  },
  indexOutOf: {
    fontSize: 11,
    color: THEME.colors.textMuted,
    fontWeight: 'normal',
  },
  track: {
    height: 6,
    backgroundColor: THEME.colors.surfaceSubtle,
    borderRadius: 3,
    overflow: 'hidden',
  },
  fill: {
    height: '100%',
    borderRadius: 3,
  },
  driverRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    marginBottom: THEME.spacing.md,
  },
  driverDot: {
    width: 10,
    height: 10,
    borderRadius: 5,
    marginTop: 6,
    marginRight: THEME.spacing.md,
  },
  driverInfo: {
    flex: 1,
  },
  driverTitle: {
    ...THEME.typography.bodyMedium,
    color: THEME.colors.textPrimary,
  },
  driverDesc: {
    ...THEME.typography.bodySmall,
    color: THEME.colors.textMuted,
    marginTop: 2,
  },
  aiCard: {
    borderColor: THEME.colors.borderFocus,
    backgroundColor: '#0F1A2E',
  },
  aiHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: THEME.spacing.lg,
  },
  aiTitle: {
    ...THEME.typography.h2,
    color: THEME.colors.primaryLight,
  },
  aiSub: {
    ...THEME.typography.caption,
    color: THEME.colors.textMuted,
    marginTop: 2,
  },
  langToggleBtn: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: THEME.radius.full,
    backgroundColor: THEME.colors.surfaceElevated,
    borderWidth: 1,
    borderColor: THEME.colors.primaryBorder,
  },
  langToggleText: {
    ...THEME.typography.caption,
    color: THEME.colors.primaryLight,
    fontWeight: '800',
  },
  tipsList: {
    gap: THEME.spacing.md,
  },
  tipRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
  },
  tipNumberBadge: {
    width: 22,
    height: 22,
    borderRadius: 11,
    backgroundColor: THEME.colors.primarySubtle,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: THEME.spacing.md,
    marginTop: 2,
  },
  tipNumber: {
    ...THEME.typography.caption,
    color: THEME.colors.primaryLight,
    fontWeight: '900',
  },
  tipText: {
    flex: 1,
    ...THEME.typography.body,
    color: THEME.colors.textPrimary,
  },
  feedbackBanner: {
    backgroundColor: THEME.colors.surface,
    borderRadius: THEME.radius.lg,
    padding: THEME.spacing.lg,
    marginBottom: THEME.spacing.lg,
    borderWidth: 1,
    borderColor: THEME.colors.borderMedium,
    alignItems: 'center',
  },
  feedbackTitle: {
    ...THEME.typography.bodyMedium,
    color: THEME.colors.primaryLight,
    fontWeight: '700',
  },
  feedbackSub: {
    ...THEME.typography.caption,
    color: THEME.colors.textMuted,
    marginTop: 4,
    textAlign: 'center',
  },
  resetBtn: {
    height: THEME.layout.minTouchTarget,
    borderRadius: THEME.radius.md,
    backgroundColor: THEME.colors.surface,
    borderWidth: 1,
    borderColor: THEME.colors.borderMedium,
    alignItems: 'center',
    justifyContent: 'center',
  },
  resetBtnText: {
    ...THEME.typography.button,
    color: THEME.colors.textSecondary,
  },
});
