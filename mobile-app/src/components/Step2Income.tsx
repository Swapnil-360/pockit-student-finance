import React from 'react';
import { View, Text, StyleSheet, ScrollView } from 'react-native';
import { THEME } from '../constants/theme';
import { TRANSLATIONS, Language } from '../constants/translations';
import { SegmentedControl, ChoiceCard } from './FormControls';

interface Step2Props {
  formData: any;
  updateForm: (key: string, value: any) => void;
  language: Language;
}

export const Step2Income: React.FC<Step2Props> = ({
  formData,
  updateForm,
  language,
}) => {
  const t = TRANSLATIONS[language];

  const totalMoneyOptions = [
    { value: '<5k', label: language === 'bn' ? '৫,০০০ টাকার কম' : 'Under 5,000 Tk', sub: language === 'bn' ? 'সীমিত মাসিক বরাদ্দ' : 'Tight student allowance' },
    { value: '5–10k', label: language === 'bn' ? '৫,০০০ – ১০,০০০ টাকা' : '5,000 – 10,000 Tk', sub: language === 'bn' ? 'গড় বিশ্ববিদ্যালয় বাজেট' : 'Average university budget' },
    { value: '10–15k', label: language === 'bn' ? '১০,০০০ – ১৫,০০০ টাকা' : '10,000 – 15,000 Tk', sub: language === 'bn' ? 'স্বস্তিদায়ক বাজেট' : 'Comfortable monthly allowance' },
    { value: '15–20k', label: language === 'bn' ? '১৫,০০০ – ২০,০০০ টাকা' : '15,000 – 20,000 Tk', sub: language === 'bn' ? 'উচ্চতর বাজেট' : 'Upper financial tier' },
    { value: '>20k', label: language === 'bn' ? '২০,০০০ টাকার বেশি' : 'Above 20,000 Tk', sub: language === 'bn' ? 'উচ্চ মাসিক তারল্য' : 'High monthly cash flow' },
  ];

  const sourceOptions = [
    { value: 'Family', label: language === 'bn' ? 'পরিবার' : 'Family', sub: language === 'bn' ? 'পিতামাতা বা অভিভাবকের ভাতা' : 'Parental or guardian allowance' },
    { value: 'Tuition-job', label: language === 'bn' ? 'টিউশন বা খণ্ডকালীন চাকরি' : 'Tuition or Part-Time Job', sub: language === 'bn' ? 'স্বোপার্জিত নিয়মিত অর্থ' : 'Self-earned earnings' },
    { value: 'Loan', label: language === 'bn' ? 'ঋণ বা ধার' : 'Loan or Borrowed Funds', sub: language === 'bn' ? 'বন্ধুবান্ধব বা পরিচিতদের থেকে' : 'From peers or lenders' },
    { value: 'Mixed', label: language === 'bn' ? 'মিশ্র উৎস' : 'Mixed Sources', sub: language === 'bn' ? 'পরিবার ও আয়ের সমন্বয়' : 'Combination of allowance & job' },
  ];

  const earnIncomeOptions = [
    { value: 'No', label: language === 'bn' ? 'না (উপার্জন নেই)' : 'No' },
    { value: 'Yes', label: language === 'bn' ? 'হ্যাঁ (উপার্জন করি)' : 'Yes' },
  ];

  return (
    <ScrollView
      style={styles.container}
      contentContainerStyle={styles.scrollContent}
      showsVerticalScrollIndicator={false}
    >
      {/* Inflow Allowance */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>{t.totalMonthlyMoney}</Text>
        <Text style={styles.sectionHelper}>
          {language === 'bn'
            ? 'প্রতি মাসের শুরুতে আপনার হাতে খরচ করার জন্য আনুমানিক কত টাকা থাকে?'
            : 'How much total cash do you receive/have available to spend each month?'}
        </Text>
        {totalMoneyOptions.map((opt) => (
          <ChoiceCard
            key={opt.value}
            label={opt.label}
            subtitle={opt.sub}
            selected={formData.total_monthly_money === opt.value}
            onSelect={() => updateForm('total_monthly_money', opt.value)}
          />
        ))}
      </View>

      {/* Financial Sources */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>{t.mainSourceOfMoney}</Text>
        {sourceOptions.map((opt) => (
          <ChoiceCard
            key={opt.value}
            label={opt.label}
            subtitle={opt.sub}
            selected={formData.main_source_of_money === opt.value}
            onSelect={() => updateForm('main_source_of_money', opt.value)}
          />
        ))}
      </View>

      {/* Self Earning Status */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>{t.doYouEarnIncome}</Text>
        <SegmentedControl
          options={earnIncomeOptions}
          selectedValue={formData.do_you_earn_income || 'No'}
          onSelect={(val) => updateForm('do_you_earn_income', val)}
        />
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
});
