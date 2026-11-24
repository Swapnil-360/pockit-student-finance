import React from 'react';
import { View, Text, StyleSheet, ScrollView } from 'react-native';
import { THEME } from '../constants/theme';
import { TRANSLATIONS, Language } from '../constants/translations';
import { SegmentedControl, ChoiceCard, ChoiceChip, NumberStepper } from './FormControls';

interface Step1Props {
  formData: any;
  updateForm: (key: string, value: any) => void;
  language: Language;
}

export const Step1Demographics: React.FC<Step1Props> = ({
  formData,
  updateForm,
  language,
}) => {
  const t = TRANSLATIONS[language];

  const genderOptions = [
    { value: 'Male', label: language === 'bn' ? 'পুরুষ' : 'Male' },
    { value: 'Female', label: language === 'bn' ? 'নারী' : 'Female' },
  ];

  const yearOptions = [
    { value: '1st year', label: language === 'bn' ? '১ম বর্ষ' : '1st Year' },
    { value: '2nd year', label: language === 'bn' ? '২য় বর্ষ' : '2nd Year' },
    { value: '3rd year', label: language === 'bn' ? '৩য় বর্ষ' : '3rd Year' },
    { value: '4th year', label: language === 'bn' ? '৪র্থ বর্ষ' : '4th Year' },
    { value: 'Masters', label: language === 'bn' ? 'মাস্টার্স' : 'Masters' },
  ];

  const uniOptions = [
    { value: 'Public', label: language === 'bn' ? 'পাবলিক বিশ্ববিদ্যালয়' : 'Public University', sub: language === 'bn' ? 'যেমন: ঢাবি, বুয়েট, জাবি' : 'e.g. DU, BUET, JU' },
    { value: 'Private', label: language === 'bn' ? 'বেসরকারি বিশ্ববিদ্যালয়' : 'Private University', sub: language === 'bn' ? 'যেমন: এনএসইউ, ব্র্যাক, এআইইউবি' : 'e.g. NSU, BRAC, AIUB' },
    { value: 'National University college', label: language === 'bn' ? 'জাতীয় বিশ্ববিদ্যালয় / কলেজ' : 'National University / College', sub: language === 'bn' ? 'অধিভুক্ত ডিগ্রি কলেজসমূহ' : 'Affiliated degree colleges' },
  ];

  const livingOptions = [
    { value: 'With family', label: language === 'bn' ? 'পরিবারের সাথে' : 'With Family', sub: language === 'bn' ? 'নিজস্ব বা অভিভাবকের বাসা' : 'Own / parental home' },
    { value: 'Mess-hostel', label: language === 'bn' ? 'মেস / হোস্টেল' : 'Mess or Hostel', sub: language === 'bn' ? 'সহপাঠী বা বন্ধুদের সাথে' : 'Shared with peers' },
    { value: 'Hall', label: language === 'bn' ? 'বিশ্ববিদ্যালয় হল' : 'University Hall', sub: language === 'bn' ? 'ক্যাম্পাসের আবাসিক হল' : 'Campus residential hall' },
    { value: 'Rented flat', label: language === 'bn' ? 'ভাড়া বাসা' : 'Rented Flat', sub: language === 'bn' ? 'স্বাধীন বা সাবলেট ফ্ল্যাট' : 'Independent flat' },
  ];

  return (
    <ScrollView
      style={styles.container}
      contentContainerStyle={styles.scrollContent}
      showsVerticalScrollIndicator={false}
    >
      {/* Section 1: Basic Information */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>
          {language === 'bn' ? 'মৌলিক পরিচিতি' : 'Basic Information'}
        </Text>

        <View style={styles.fieldGroup}>
          <Text style={styles.fieldLabel}>{t.gender}</Text>
          <SegmentedControl
            options={genderOptions}
            selectedValue={formData.gender || 'Male'}
            onSelect={(val) => updateForm('gender', val)}
          />
        </View>

        <View style={styles.fieldGroup}>
          <Text style={styles.fieldLabel}>{t.age}</Text>
          <NumberStepper
            value={formData.age || 21}
            onChange={(val) => updateForm('age', val)}
            unit={language === 'bn' ? 'বছর' : 'years'}
          />
        </View>
      </View>

      {/* Section 2: Academic Program */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>
          {language === 'bn' ? 'শিক্ষাগত তথ্য' : 'Academic Program'}
        </Text>

        <View style={styles.fieldGroup}>
          <Text style={styles.fieldLabel}>{t.yearOfStudy}</Text>
          <View style={styles.chipsRow}>
            {yearOptions.map((opt) => (
              <ChoiceChip
                key={opt.value}
                label={opt.label}
                selected={formData.year_of_study === opt.value}
                onSelect={() => updateForm('year_of_study', opt.value)}
              />
            ))}
          </View>
        </View>

        <View style={styles.fieldGroup}>
          <Text style={styles.fieldLabel}>{t.universityType}</Text>
          {uniOptions.map((opt) => (
            <ChoiceCard
              key={opt.value}
              label={opt.label}
              subtitle={opt.sub}
              selected={formData.university_type === opt.value}
              onSelect={() => updateForm('university_type', opt.value)}
            />
          ))}
        </View>
      </View>

      {/* Section 3: Living Arrangement */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>
          {language === 'bn' ? 'বসবাসের ব্যবস্থা' : 'Living Arrangement'}
        </Text>
        {livingOptions.map((opt) => (
          <ChoiceCard
            key={opt.value}
            label={opt.label}
            subtitle={opt.sub}
            selected={formData.where_you_live === opt.value}
            onSelect={() => updateForm('where_you_live', opt.value)}
          />
        ))}
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
    paddingBottom: 120, // Prevents content occlusion by bottom action bar
  },
  section: {
    marginBottom: THEME.spacing.xxl,
  },
  sectionTitle: {
    ...THEME.typography.h2,
    color: THEME.colors.textPrimary,
    marginBottom: THEME.spacing.md,
    letterSpacing: 0.2,
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
