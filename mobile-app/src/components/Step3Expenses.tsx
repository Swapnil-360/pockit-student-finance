import React from 'react';
import { View, Text, StyleSheet, ScrollView } from 'react-native';
import { THEME } from '../constants/theme';
import { TRANSLATIONS, Language } from '../constants/translations';
import { ChoiceCard, ChoiceChip, LikertRating } from './FormControls';

interface Step3Props {
  formData: any;
  updateForm: (key: string, value: any) => void;
  language: Language;
}

export const Step3Expenses: React.FC<Step3Props> = ({
  formData,
  updateForm,
  language,
}) => {
  const t = TRANSLATIONS[language];

  // #1 Risk Factor: Monthly Savings
  const savingsOptions = [
    { value: '0', label: language === 'bn' ? '০ টাকা (কোনো সঞ্চয় নেই)' : '0 Tk (No Monthly Savings)', sub: language === 'bn' ? 'জরুরি প্রয়োজনে সর্বোচ্চ ঝুঁকি' : 'Critical financial vulnerability', badge: language === 'bn' ? 'উচ্চ ঝুঁকি' : 'High Risk' },
    { value: '<500', label: language === 'bn' ? '৫০০ টাকার কম' : 'Under 500 Tk', sub: language === 'bn' ? 'স্বল্প নিরাপত্তা মার্জিন' : 'Minimal safety buffer' },
    { value: '500–1k', label: language === 'bn' ? '৫০০ – ১,০০০ টাকা' : '500 – 1,000 Tk', sub: language === 'bn' ? 'সন্তোষজনক শিক্ষার্থী সঞ্চয়' : 'Healthy student target' },
    { value: '>1k', label: language === 'bn' ? '১,০০০ টাকার বেশি' : 'Above 1,000 Tk', sub: language === 'bn' ? 'শক্তিশালী ভবিষ্যৎ তহবিল' : 'Strong emergency cushion', badge: language === 'bn' ? 'নিরাপদ' : 'Safe' },
  ];

  const borrowOptions = [
    { value: 'Never', label: language === 'bn' ? 'কখনও না' : 'Never' },
    { value: '1–2', label: language === 'bn' ? '১ – ২ বার' : '1 to 2 times' },
    { value: '3+', label: language === 'bn' ? '৩ বার বা তার বেশি' : '3 or more times' },
  ];

  const rentOptions = [
    { value: '0', label: '0 Tk' },
    { value: '<3k', label: '< 3k' },
    { value: '3–6k', label: '3k – 6k' },
    { value: '6–9k', label: '6k – 9k' },
    { value: '>9k', label: '> 9k' },
  ];

  const foodOptions = [
    { value: '<3k', label: '< 3,000 Tk' },
    { value: '3–5k', label: '3k – 5k' },
    { value: '5–7k', label: '5k – 7k' },
    { value: '>7k', label: '> 7,000 Tk' },
  ];

  const transportOptions = [
    { value: '<1k', label: '< 1,000 Tk' },
    { value: '1–2k', label: '1k – 2k' },
    { value: '2–3k', label: '2k – 3k' },
    { value: '>3k', label: '> 3,000 Tk' },
  ];

  const entertainmentOptions = [
    { value: '<1k', label: '< 1,000 Tk' },
    { value: '1–2k', label: '1k – 2k' },
    { value: '>2k', label: '> 2,000 Tk' },
  ];

  const mobileBankingOptions = [
    { value: 'Rarely', label: language === 'bn' ? 'খুব কম' : 'Rarely' },
    { value: 'Weekly', label: language === 'bn' ? 'সাপ্তাহিক' : 'Weekly' },
    { value: 'Daily', label: language === 'bn' ? 'দৈনিক' : 'Daily' },
  ];

  return (
    <ScrollView
      style={styles.container}
      contentContainerStyle={styles.scrollContent}
      showsVerticalScrollIndicator={false}
    >
      {/* 1. Monthly Savings (#1 Factor) */}
      <View style={styles.section}>
        <View style={styles.featuredHeader}>
          <Text style={styles.sectionTitle}>{t.moneySavedPerMonth}</Text>
          <View style={styles.indicatorPill}>
            <Text style={styles.indicatorText}>
              {language === 'bn' ? 'প্রধান ঝুঁকি উপাদান' : '#1 Predictor'}
            </Text>
          </View>
        </View>
        <Text style={styles.sectionHelper}>
          {language === 'bn'
            ? 'মাসিক খরচ শেষে আপনার হাতে কত টাকা সঞ্চয় হিসেবে অবশিষ্ট থাকে?'
            : 'How much money are you able to set aside into savings each month?'}
        </Text>
        {savingsOptions.map((opt) => (
          <ChoiceCard
            key={opt.value}
            label={opt.label}
            subtitle={opt.sub}
            accentBadge={opt.badge}
            selected={formData.money_saved_per_month === opt.value}
            onSelect={() => updateForm('money_saved_per_month', opt.value)}
          />
        ))}
      </View>

      {/* 2. Debt & Friend Borrowing */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>{t.borrowedFromFriends}</Text>
        <Text style={styles.sectionHelper}>
          {language === 'bn'
            ? 'বিগত ৩ মাসে জরুরি প্রয়োজনে সহপাঠী বা বন্ধুদের থেকে ধার নিতে হয়েছে?'
            : 'How often did you borrow cash from peers to cover expenses in the past 3 months?'}
        </Text>
        <View style={styles.chipsRow}>
          {borrowOptions.map((opt) => (
            <ChoiceChip
              key={opt.value}
              label={opt.label}
              selected={formData.borrowed_from_friends === opt.value}
              onSelect={() => updateForm('borrowed_from_friends', opt.value)}
            />
          ))}
        </View>
      </View>

      {/* 3. Expense Tracking Habit */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>{t.trackSpending}</Text>
        <Text style={styles.sectionHelper}>
          {language === 'bn'
            ? 'আপনি কি নিয়মিত আপনার দৈনিক খরচের হিসাব নোট বা অ্যাপে লিখে রাখেন?'
            : 'Do you systematically record where your cash and digital wallet balance goes?'}
        </Text>
        <LikertRating
          value={formData.track_spending || 3}
          onChange={(val) => updateForm('track_spending', val)}
          minLabel={language === 'bn' ? "১ (কখনও না)" : "1 (Never)"}
          maxLabel={language === 'bn' ? "৫ (প্রতিদিন)" : "5 (Daily)"}
        />
      </View>

      {/* 4. Core Outflows */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>
          {language === 'bn' ? 'নিয়মিত জীবনযাত্রার খরচ' : 'Monthly Living Expenses'}
        </Text>

        <View style={styles.fieldGroup}>
          <Text style={styles.fieldLabel}>{t.monthlyRent}</Text>
          <View style={styles.chipsRow}>
            {rentOptions.map((opt) => (
              <ChoiceChip
                key={opt.value}
                label={opt.label}
                selected={formData.monthly_rent === opt.value}
                onSelect={() => updateForm('monthly_rent', opt.value)}
              />
            ))}
          </View>
        </View>

        <View style={styles.fieldGroup}>
          <Text style={styles.fieldLabel}>{t.monthlyFood}</Text>
          <View style={styles.chipsRow}>
            {foodOptions.map((opt) => (
              <ChoiceChip
                key={opt.value}
                label={opt.label}
                selected={formData.monthly_food === opt.value}
                onSelect={() => updateForm('monthly_food', opt.value)}
              />
            ))}
          </View>
        </View>

        <View style={styles.fieldGroup}>
          <Text style={styles.fieldLabel}>{t.monthlyTransport}</Text>
          <View style={styles.chipsRow}>
            {transportOptions.map((opt) => (
              <ChoiceChip
                key={opt.value}
                label={opt.label}
                selected={formData.monthly_transport === opt.value}
                onSelect={() => updateForm('monthly_transport', opt.value)}
              />
            ))}
          </View>
        </View>

        <View style={styles.fieldGroup}>
          <Text style={styles.fieldLabel}>{t.monthlyEntertainment}</Text>
          <View style={styles.chipsRow}>
            {entertainmentOptions.map((opt) => (
              <ChoiceChip
                key={opt.value}
                label={opt.label}
                selected={formData.monthly_entertainment === opt.value}
                onSelect={() => updateForm('monthly_entertainment', opt.value)}
              />
            ))}
          </View>
        </View>

        <View style={styles.fieldGroup}>
          <Text style={styles.fieldLabel}>{t.mobileBankingUse}</Text>
          <View style={styles.chipsRow}>
            {mobileBankingOptions.map((opt) => (
              <ChoiceChip
                key={opt.value}
                label={opt.label}
                selected={formData.mobile_banking_use === opt.value}
                onSelect={() => updateForm('mobile_banking_use', opt.value)}
              />
            ))}
          </View>
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
  section: {
    marginBottom: THEME.spacing.xxl,
  },
  featuredHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: THEME.spacing.xs,
  },
  indicatorPill: {
    backgroundColor: 'rgba(2, 132, 199, 0.16)',
    paddingHorizontal: 10,
    paddingVertical: 3,
    borderRadius: THEME.radius.full,
  },
  indicatorText: {
    ...THEME.typography.caption,
    color: THEME.colors.primaryLight,
    fontWeight: '700',
  },
  sectionTitle: {
    ...THEME.typography.h2,
    color: THEME.colors.textPrimary,
    flex: 1,
  },
  sectionHelper: {
    ...THEME.typography.bodySmall,
    color: THEME.colors.textMuted,
    marginBottom: THEME.spacing.md,
  },
  fieldGroup: {
    marginBottom: THEME.spacing.lg,
  },
  fieldLabel: {
    ...THEME.typography.bodySmall,
    color: THEME.colors.textSecondary,
    fontWeight: '600',
    marginBottom: THEME.spacing.sm,
  },
  chipsRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
  },
});
