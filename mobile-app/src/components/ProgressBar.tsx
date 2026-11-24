import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { THEME } from '../constants/theme';
import { TRANSLATIONS, Language } from '../constants/translations';

interface ProgressBarProps {
  currentStep: number;
  totalSteps: number;
  language: Language;
}

export const ProgressBar: React.FC<ProgressBarProps> = ({
  currentStep,
  totalSteps,
  language,
}) => {
  const t = TRANSLATIONS[language];
  const stepTitles = [
    t.step1Title,
    t.step2Title,
    t.step3Title,
    t.step4Title,
  ];

  return (
    <View style={styles.container}>
      <View style={styles.topRow}>
        <View style={styles.badge}>
          <Text style={styles.badgeText}>
            {t.step.toUpperCase()} {currentStep} {t.of.toUpperCase()} {totalSteps}
          </Text>
        </View>
        <Text style={styles.stepTitle} numberOfLines={1}>
          {stepTitles[currentStep - 1] || ''}
        </Text>
      </View>

      <View style={styles.segmentsRow}>
        {Array.from({ length: totalSteps }).map((_, idx) => {
          const stepNum = idx + 1;
          const isCompleted = stepNum < currentStep;
          const isCurrent = stepNum === currentStep;

          return (
            <View
              key={idx}
              style={[
                styles.segmentTrack,
                isCompleted && styles.segmentCompleted,
                isCurrent && styles.segmentCurrent,
              ]}
            />
          );
        })}
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    paddingVertical: 10,
    backgroundColor: 'transparent',
  },
  topRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 10,
  },
  badge: {
    backgroundColor: 'rgba(244, 123, 78, 0.16)',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: 'rgba(244, 123, 78, 0.35)',
  },
  badgeText: {
    fontSize: 11,
    fontWeight: '800',
    color: '#F47B4E',
    letterSpacing: 0.8,
  },
  stepTitle: {
    ...THEME.typography.h3,
    color: '#F8FAFC',
    fontWeight: '700',
  },
  segmentsRow: {
    flexDirection: 'row',
    gap: 8,
  },
  segmentTrack: {
    flex: 1,
    height: 5,
    borderRadius: 3,
    backgroundColor: 'rgba(255, 255, 255, 0.08)',
  },
  segmentCompleted: {
    backgroundColor: '#10B981',
    shadowColor: '#10B981',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.5,
    shadowRadius: 3,
  },
  segmentCurrent: {
    backgroundColor: '#F47B4E',
    shadowColor: '#F47B4E',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.8,
    shadowRadius: 4,
  },
});
