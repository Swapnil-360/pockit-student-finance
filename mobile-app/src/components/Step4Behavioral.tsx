import React from 'react';
import { View, Text, StyleSheet, ScrollView } from 'react-native';
import { THEME } from '../constants/theme';
import { TRANSLATIONS, Language } from '../constants/translations';
import { LikertRating } from './FormControls';

interface Step4Props {
  formData: any;
  updateForm: (key: string, value: any) => void;
  language: Language;
}

export const Step4Behavioral: React.FC<Step4Props> = ({
  formData,
  updateForm,
  language,
}) => {
  const t = TRANSLATIONS[language];

  // Mathematical composite score calculations
  const awarenessScore = (
    ((formData.aware_balance || 3) +
      (formData.aware_weekly_track || 3) +
      (formData.aware_check_before_buy || 3)) /
    3.0
  ).toFixed(2);

  const impulseScore = (
    ((formData.impulse_spontaneous || 3) +
      (formData.impulse_discounts || 3) +
      (formData.impulse_regret || 3)) /
    3.0
  ).toFixed(2);

  const awarenessNum = Number(awarenessScore);
  const impulseNum = Number(impulseScore);

  return (
    <ScrollView
      style={styles.container}
      contentContainerStyle={styles.scrollContent}
      showsVerticalScrollIndicator={false}
    >
      {/* Live Behavioral Indices HUD Card */}
      <View style={styles.hudCard}>
        <View style={styles.hudHeader}>
          <Text style={styles.hudTitle}>
            {language === 'bn' ? 'আচরণগত সূচক (সরাসরি বিশ্লেষণ)' : 'Real-Time Behavioral Indices'}
          </Text>
          <Text style={styles.hudSub}>
            {language === 'bn' ? 'সার্ভে অনুযায়ী লাইভ স্কোর' : 'Calculated live from your responses'}
          </Text>
        </View>

        <View style={styles.hudRow}>
          {/* Awareness Meter */}
          <View style={styles.meterCol}>
            <View style={styles.meterHeader}>
              <Text style={styles.meterLabel}>
                {language === 'bn' ? 'সচেতনতা' : 'Awareness'}
              </Text>
              <Text
                style={[
                  styles.meterValue,
                  { color: awarenessNum >= 3.5 ? THEME.colors.riskLow : THEME.colors.riskModerate },
                ]}
              >
                {awarenessScore} <Text style={styles.outOf}>/ 5.0</Text>
              </Text>
            </View>
            <View style={styles.meterTrack}>
              <View
                style={[
                  styles.meterFill,
                  {
                    width: `${(awarenessNum / 5.0) * 100}%`,
                    backgroundColor:
                      awarenessNum >= 3.5 ? THEME.colors.riskLow : THEME.colors.riskModerate,
                  },
                ]}
              />
            </View>
          </View>

          {/* Impulse Meter */}
          <View style={styles.meterCol}>
            <View style={styles.meterHeader}>
              <Text style={styles.meterLabel}>
                {language === 'bn' ? 'আকস্মিক কেনাকাটা' : 'Impulse Buying'}
              </Text>
              <Text
                style={[
                  styles.meterValue,
                  { color: impulseNum > 3.5 ? THEME.colors.riskHigh : THEME.colors.riskLow },
                ]}
              >
                {impulseScore} <Text style={styles.outOf}>/ 5.0</Text>
              </Text>
            </View>
            <View style={styles.meterTrack}>
              <View
                style={[
                  styles.meterFill,
                  {
                    width: `${(impulseNum / 5.0) * 100}%`,
                    backgroundColor:
                      impulseNum > 3.5 ? THEME.colors.riskHigh : THEME.colors.riskLow,
                  },
                ]}
              />
            </View>
          </View>
        </View>
      </View>

      {/* Group A: Spending Awareness */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>{t.awarenessSection}</Text>
        <Text style={styles.sectionHelper}>
          {language === 'bn'
            ? 'প্রতিটি বিবৃতির সাথে আপনার একমত হওয়ার মাত্রা ১ (একদম অসম্মত) থেকে ৫ (সম্পূর্ণ একমত) নির্বাচন করুন।'
            : 'Rate each statement from 1 (Strongly Disagree) to 5 (Strongly Agree).'}
        </Text>

        <View style={styles.questionBlock}>
          <Text style={styles.questionText}>1. {t.awareBalance}</Text>
          <LikertRating
            value={formData.aware_balance || 3}
            onChange={(val) => updateForm('aware_balance', val)}
            minLabel={language === 'bn' ? "১ (একদম না)" : "1 (Strongly Disagree)"}
            maxLabel={language === 'bn' ? "৫ (সম্পূর্ণ জানি)" : "5 (Strongly Agree)"}
          />
        </View>

        <View style={styles.questionBlock}>
          <Text style={styles.questionText}>2. {t.awareWeeklyTrack}</Text>
          <LikertRating
            value={formData.aware_weekly_track || 3}
            onChange={(val) => updateForm('aware_weekly_track', val)}
            minLabel={language === 'bn' ? "১ (কখনও না)" : "1 (Strongly Disagree)"}
            maxLabel={language === 'bn' ? "৫ (সব সময়)" : "5 (Strongly Agree)"}
          />
        </View>

        <View style={styles.questionBlock}>
          <Text style={styles.questionText}>3. {t.awareCheckBeforeBuy}</Text>
          <LikertRating
            value={formData.aware_check_before_buy || 3}
            onChange={(val) => updateForm('aware_check_before_buy', val)}
            minLabel={language === 'bn' ? "১ (কখনও না)" : "1 (Strongly Disagree)"}
            maxLabel={language === 'bn' ? "৫ (সব সময়)" : "5 (Strongly Agree)"}
          />
        </View>
      </View>

      {/* Group B: Impulse Purchasing Tendencies */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>{t.impulseSection}</Text>
        <Text style={styles.sectionHelper}>
          {language === 'bn'
            ? 'আকস্মিক কেনাকাটা বা লোভ সংবরণ করার ক্ষেত্রে আপনার স্বাভাবিক প্রবণতা মূল্যায়ন করুন।'
            : 'Evaluate your spontaneous spending behavior and resistance to flash sales.'}
        </Text>

        <View style={styles.questionBlock}>
          <Text style={styles.questionText}>4. {t.impulseSpontaneous}</Text>
          <LikertRating
            value={formData.impulse_spontaneous || 3}
            onChange={(val) => updateForm('impulse_spontaneous', val)}
            minLabel={language === 'bn' ? "১ (পরিকল্পিত)" : "1 (Strongly Disagree)"}
            maxLabel={language === 'bn' ? "৫ (ঝোঁকের মাথায়)" : "5 (Strongly Agree)"}
          />
        </View>

        <View style={styles.questionBlock}>
          <Text style={styles.questionText}>5. {t.impulseDiscounts}</Text>
          <LikertRating
            value={formData.impulse_discounts || 3}
            onChange={(val) => updateForm('impulse_discounts', val)}
            minLabel={language === 'bn' ? "১ (সহজেই পারি)" : "1 (Strongly Disagree)"}
            maxLabel={language === 'bn' ? "৫ (সামলানো কঠিন)" : "5 (Strongly Agree)"}
          />
        </View>

        <View style={styles.questionBlock}>
          <Text style={styles.questionText}>6. {t.impulseRegret}</Text>
          <LikertRating
            value={formData.impulse_regret || 3}
            onChange={(val) => updateForm('impulse_regret', val)}
            minLabel={language === 'bn' ? "১ (কখনও না)" : "1 (Strongly Disagree)"}
            maxLabel={language === 'bn' ? "৫ (প্রায়ই অনুতপ্ত)" : "5 (Strongly Agree)"}
          />
        </View>
      </View>
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
    paddingBottom: 120,
  },
  hudCard: {
    backgroundColor: THEME.colors.surface,
    borderRadius: THEME.radius.lg,
    padding: THEME.spacing.lg,
    borderWidth: 1,
    borderColor: THEME.colors.border,
    marginBottom: THEME.spacing.xxl,
  },
  hudHeader: {
    marginBottom: THEME.spacing.md,
  },
  hudTitle: {
    ...THEME.typography.h3,
    color: THEME.colors.textPrimary,
  },
  hudSub: {
    ...THEME.typography.caption,
    color: THEME.colors.textMuted,
    marginTop: 2,
  },
  hudRow: {
    flexDirection: 'row',
    gap: THEME.spacing.lg,
  },
  meterCol: {
    flex: 1,
  },
  meterHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'baseline',
    marginBottom: 6,
  },
  meterLabel: {
    ...THEME.typography.caption,
    color: THEME.colors.textSecondary,
    fontWeight: '600',
  },
  meterValue: {
    fontSize: 15,
    fontWeight: '800',
  },
  outOf: {
    fontSize: 11,
    color: THEME.colors.textMuted,
    fontWeight: '400',
  },
  meterTrack: {
    height: 6,
    backgroundColor: THEME.colors.surfaceSubtle,
    borderRadius: 3,
    overflow: 'hidden',
  },
  meterFill: {
    height: '100%',
    borderRadius: 3,
  },
  section: {
    marginBottom: THEME.spacing.xxl,
  },
  sectionTitle: {
    ...THEME.typography.h2,
    color: THEME.colors.textPrimary,
    marginBottom: THEME.spacing.xs,
  },
  sectionHelper: {
    ...THEME.typography.bodySmall,
    color: THEME.colors.textMuted,
    marginBottom: THEME.spacing.md,
  },
  questionBlock: {
    marginBottom: THEME.spacing.xl,
    paddingBottom: THEME.spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(30, 41, 59, 0.6)',
  },
  questionText: {
    ...THEME.typography.bodyMedium,
    color: THEME.colors.textPrimary,
    marginBottom: THEME.spacing.sm,
    lineHeight: 22,
  },
});
