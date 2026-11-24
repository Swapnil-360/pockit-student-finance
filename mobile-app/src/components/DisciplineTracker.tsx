import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../constants/ThemeContext';
import { Language } from '../constants/translations';
import { GlassCard } from './GlassCard';

interface DisciplineTrackerProps {
  streakDays?: number;
  language: Language;
}

export const DisciplineTracker: React.FC<DisciplineTrackerProps> = ({
  streakDays = 5,
  language,
}) => {
  const { isDark, theme } = useTheme();

  // 7-day strip (Sunday to Saturday)
  const daysEn = ['S', 'M', 'T', 'W', 'T', 'F', 'S'];
  const daysBn = ['র', 'সো', 'ম', 'বু', 'বৃ', 'শু', 'শ'];
  const dayLabels = language === 'bn' ? daysBn : daysEn;

  // Calculate days completed (capped between 0 and 7 for weekly view)
  const currentDayIndex = new Date().getDay(); // 0 is Sunday, 6 is Saturday
  const effectiveStreak = Math.max(0, streakDays);
  const remainingForWeek = Math.max(0, 7 - (effectiveStreak % 7 || 7));

  const motivationText =
    language === 'bn'
      ? remainingForWeek === 0
        ? 'চমৎকার! আপনি পুরো সপ্তাহ বাজেটের মধ্যে থেকেছেন!'
        : `${effectiveStreak} দিনের ধারাবাহিকতা — পুরো সপ্তাহের জন্য আর মাত্র ${remainingForWeek} দিন বাকি!`
      : remainingForWeek === 0
      ? 'Incredible discipline! You completed a full 7-day on-track week!'
      : `${effectiveStreak}-day streak — ${remainingForWeek} more ${remainingForWeek === 1 ? 'day' : 'days'} for a full week on track!`;

  return (
    <GlassCard style={styles.card}>
      <View style={styles.headerRow}>
        <View style={styles.titleWrap}>
          <Text style={[styles.sectionTitle, { color: theme.textPrimary }]}>
            {language === 'bn' ? 'সাপ্তাহিক শৃঙ্খলা' : 'Weekly Discipline'}
          </Text>
          <Text style={[styles.subTitle, { color: theme.textSecondary }]}>
            {motivationText}
          </Text>
        </View>

        <View
          style={[
            styles.streakBadge,
            {
              backgroundColor: isDark ? 'rgba(242, 122, 73, 0.15)' : '#FDECE4',
              borderColor: theme.primary,
            },
          ]}
        >
          <Text style={[styles.streakNumber, { color: theme.primary }]}>
            {effectiveStreak}
          </Text>
          <Text style={[styles.streakUnit, { color: theme.primary }]}>
            {language === 'bn' ? 'দিন' : 'days'}
          </Text>
        </View>
      </View>

      {/* 7-Day Circular Nodes Strip */}
      <View style={styles.daysRow}>
        {dayLabels.map((dayLabel, index) => {
          // Days that are part of streak
          const isCompleted = index < (effectiveStreak % 7 || (effectiveStreak >= 7 ? 7 : 0));
          const isToday = index === currentDayIndex;

          return (
            <View key={index} style={styles.dayCol}>
              <View
                style={[
                  styles.dayCircle,
                  {
                    backgroundColor: isCompleted
                      ? isDark
                        ? 'rgba(16, 185, 129, 0.2)'
                        : '#E6F9F0'
                      : isToday
                      ? isDark
                        ? 'rgba(242, 122, 73, 0.15)'
                        : '#FDECE4'
                      : isDark
                      ? '#141E2B'
                      : '#F1F5F9',
                    borderColor: isCompleted
                      ? theme.riskLow
                      : isToday
                      ? theme.primary
                      : theme.border,
                    borderWidth: isToday ? 2 : 1,
                  },
                ]}
              >
                {isCompleted ? (
                  <Ionicons name="checkmark" size={14} color={theme.riskLow} />
                ) : (
                  <Text
                    style={[
                      styles.dayLetter,
                      {
                        color: isToday
                          ? theme.primary
                          : theme.textMuted,
                        fontWeight: isToday ? '700' : '500',
                      },
                    ]}
                  >
                    {dayLabel}
                  </Text>
                )}
              </View>
              <Text
                style={[
                  styles.bottomDayLabel,
                  {
                    color: isToday ? theme.textPrimary : theme.textMuted,
                    fontWeight: isToday ? '700' : '500',
                  },
                ]}
              >
                {dayLabel}
              </Text>
            </View>
          );
        })}
      </View>
    </GlassCard>
  );
};

const styles = StyleSheet.create({
  card: {
    marginBottom: 16,
    padding: 16,
    borderRadius: 22,
  },
  headerRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  titleWrap: {
    flex: 1,
    marginRight: 12,
  },
  sectionTitle: {
    fontSize: 15,
    fontWeight: '700',
    letterSpacing: -0.2,
    marginBottom: 2,
  },
  subTitle: {
    fontSize: 12,
    lineHeight: 16,
  },
  streakBadge: {
    flexDirection: 'row',
    alignItems: 'baseline',
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 14,
    borderWidth: 1,
  },
  streakNumber: {
    fontSize: 15,
    fontWeight: '800',
    marginRight: 3,
  },
  streakUnit: {
    fontSize: 11,
    fontWeight: '600',
  },
  daysRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 4,
  },
  dayCol: {
    alignItems: 'center',
  },
  dayCircle: {
    width: 34,
    height: 34,
    borderRadius: 17,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 6,
  },
  dayLetter: {
    fontSize: 11,
  },
  bottomDayLabel: {
    fontSize: 10,
    letterSpacing: 0.3,
  },
});

