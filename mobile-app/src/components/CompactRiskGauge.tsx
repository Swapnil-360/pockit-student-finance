import React, { useEffect, useRef, useState } from 'react';
import { View, Text, StyleSheet, Animated, Easing, Platform, TouchableOpacity } from 'react-native';
import Svg, { Circle } from 'react-native-svg';
import * as Haptics from 'expo-haptics';
import { useTheme } from '../constants/ThemeContext';
import { Language } from '../constants/translations';

interface CompactRiskGaugeProps {
  score: number;
  tier: 'LOW RISK' | 'MODERATE RISK' | 'HIGH RISK';
  tierBn?: string;
  language: Language;
  size?: number;
  strokeWidth?: number;
  onPress?: () => void;
}

const AnimatedCircle = Animated.createAnimatedComponent(Circle);

export const CompactRiskGauge: React.FC<CompactRiskGaugeProps> = ({
  score,
  tier,
  tierBn,
  language,
  size = 108,
  strokeWidth = 9,
  onPress,
}) => {
  const { isDark, theme } = useTheme();
  const radius = (size - strokeWidth) / 2;
  const circumference = 2 * Math.PI * radius;

  const normalizedScore = Math.min(100, Math.max(0, score));
  const animValue = useRef(new Animated.Value(0)).current;
  const [displayScore, setDisplayScore] = useState(0);

  useEffect(() => {
    animValue.setValue(0);
    const animation = Animated.timing(animValue, {
      toValue: 1,
      duration: 1000,
      easing: Easing.out(Easing.cubic),
      useNativeDriver: false,
    });

    const listenerId = animValue.addListener(({ value }) => {
      setDisplayScore(Math.round(value * normalizedScore * 10) / 10);
    });

    animation.start();

    return () => {
      animValue.removeListener(listenerId);
    };
  }, [normalizedScore]);

  const animatedStrokeDashoffset = animValue.interpolate({
    inputRange: [0, 1],
    outputRange: [circumference, circumference - (normalizedScore / 100) * circumference],
  });

  const getTierDetails = () => {
    if (score < 40) {
      return {
        text: theme.riskLow,
        bg: isDark ? 'rgba(16, 185, 129, 0.16)' : '#E6F9F0',
        border: isDark ? 'rgba(16, 185, 129, 0.3)' : '#A7F3D0',
        label: language === 'bn' ? tierBn || 'কম ঝুঁকি' : 'Low Risk',
      };
    }
    if (score < 70) {
      return {
        text: theme.riskModerate,
        bg: isDark ? 'rgba(245, 158, 11, 0.16)' : '#FEF3C7',
        border: isDark ? 'rgba(245, 158, 11, 0.3)' : '#FDE68A',
        label: language === 'bn' ? tierBn || 'মাঝারি ঝুঁকি' : 'Moderate Risk',
      };
    }
    return {
      text: theme.primary,
      bg: theme.terracottaSoft,
      border: isDark ? 'rgba(239, 68, 68, 0.3)' : '#FECACA',
      label: language === 'bn' ? tierBn || 'উচ্চ ঝুঁকি' : 'High Risk',
    };
  };

  const details = getTierDetails();
  const trackColor = isDark ? '#1E2E40' : '#D4E4F0';
  const progressColor = details.text;

  const content = (
    <View style={styles.container}>
      <View style={[styles.gaugeWrapper, { width: size, height: size }]}>
        <Svg width={size} height={size} style={styles.svg}>
          {/* Background Track */}
          <Circle
            cx={size / 2}
            cy={size / 2}
            r={radius}
            stroke={trackColor}
            strokeWidth={strokeWidth}
            fill="none"
          />

          {/* Progress Arc */}
          {Platform.OS === 'web' ? (
            <Circle
              cx={size / 2}
              cy={size / 2}
              r={radius}
              stroke={progressColor}
              strokeWidth={strokeWidth}
              strokeDasharray={`${circumference} ${circumference}`}
              strokeDashoffset={circumference - (displayScore / 100) * circumference}
              strokeLinecap="round"
              fill="none"
            />
          ) : (
            <AnimatedCircle
              cx={size / 2}
              cy={size / 2}
              r={radius}
              stroke={progressColor}
              strokeWidth={strokeWidth}
              strokeDasharray={`${circumference} ${circumference}`}
              strokeDashoffset={animatedStrokeDashoffset}
              strokeLinecap="round"
              fill="none"
            />
          )}
        </Svg>

        {/* Center Readout Plate: Single clean percentage matching Image 1 */}
        <View style={styles.centerPlate}>
          <Text style={[styles.percentageText, { color: theme.textPrimary }]}>
            {Math.round(displayScore)}%
          </Text>
        </View>
      </View>

      {/* Underneath Risk Tier Badge (Clean Title Case pill, exactly 1 badge) */}
      <View
        style={[
          styles.tierPill,
          {
            backgroundColor: details.bg,
            borderColor: details.border,
          },
        ]}
      >
        <Text style={[styles.tierText, { color: details.text }]}>
          {details.label}
        </Text>
      </View>
    </View>
  );

  if (onPress) {
    return (
      <TouchableOpacity
        onPress={() => {
          try {
            Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
          } catch {}
          onPress();
        }}
        activeOpacity={0.8}
        accessibilityRole="button"
        accessibilityLabel={`Risk score ${score.toFixed(1)} percent, ${details.label}. Tap to view details.`}
      >
        {content}
      </TouchableOpacity>
    );
  }

  return content;
};

const styles = StyleSheet.create({
  container: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  gaugeWrapper: {
    position: 'relative',
    alignItems: 'center',
    justifyContent: 'center',
  },
  svg: {
    transform: [{ rotate: '-90deg' }],
  },
  centerPlate: {
    position: 'absolute',
    alignItems: 'center',
    justifyContent: 'center',
  },
  percentageText: {
    fontSize: 22,
    fontWeight: '700',
    fontVariant: ['tabular-nums'],
    letterSpacing: -0.5,
  },
  tierPill: {
    paddingHorizontal: 10,
    paddingVertical: 3,
    borderRadius: 12,
    borderWidth: 1,
    marginTop: 6,
    alignItems: 'center',
  },
  tierText: {
    fontSize: 10.5,
    fontWeight: '600',
    letterSpacing: 0.1,
  },
});

