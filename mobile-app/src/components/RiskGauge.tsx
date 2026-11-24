import React, { useEffect, useRef, useState } from 'react';
import { View, Text, StyleSheet, Animated, Easing, Platform } from 'react-native';
import Svg, { Circle } from 'react-native-svg';
import { useTheme } from '../constants/ThemeContext';
import { Language } from '../constants/translations';

interface RiskGaugeProps {
  score: number;
  tier: 'LOW RISK' | 'MODERATE RISK' | 'HIGH RISK';
  tierBn: string;
  language: Language;
}

const AnimatedCircle = Animated.createAnimatedComponent(Circle);

export const RiskGauge: React.FC<RiskGaugeProps> = ({
  score,
  tier,
  tierBn,
  language,
}) => {
  const { isDark, theme } = useTheme();
  const size = 180;
  const strokeWidth = 12;
  const radius = (size - strokeWidth) / 2;
  const circumference = 2 * Math.PI * radius;

  const normalizedScore = Math.min(100, Math.max(0, score));

  // Animation value from 0 to 1
  const animValue = useRef(new Animated.Value(0)).current;
  const [displayScore, setDisplayScore] = useState(0);

  useEffect(() => {
    animValue.setValue(0);
    const animation = Animated.timing(animValue, {
      toValue: 1,
      duration: 1200,
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
        border: theme.riskLow,
        label: language === 'bn' ? tierBn || 'কম ঝুঁকি' : tier,
      };
    }
    if (score < 70) {
      return {
        text: theme.riskModerate,
        bg: isDark ? 'rgba(245, 158, 11, 0.16)' : '#FEF3C7',
        border: theme.riskModerate,
        label: language === 'bn' ? tierBn || 'মাঝারি ঝুঁকি' : tier,
      };
    }
    return {
      text: theme.primary,
      bg: theme.terracottaSoft,
      border: theme.primary,
      label: language === 'bn' ? tierBn || 'উচ্চ ঝুঁকি' : tier,
    };
  };

  const details = getTierDetails();
  const trackColor = isDark ? '#1E2E40' : '#D4E4F0';
  const progressColor = theme.primary; // Warm Terracotta

  return (
    <View style={styles.container}>
      <View style={[styles.gaugeWrapper, { width: size, height: size }]}>
        <Svg width={size} height={size} style={styles.svg}>
          {/* Dual-tone Background Track */}
          <Circle
            cx={size / 2}
            cy={size / 2}
            r={radius}
            stroke={trackColor}
            strokeWidth={strokeWidth}
            fill="none"
          />

          {/* Progress Arc: Numeric on Web to avoid WebShape crash, Animated on Native */}
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

        {/* Center Readout Plate */}
        <View style={styles.centerPlate}>
          <Text style={[styles.percentageText, { color: theme.textPrimary }]}>
            {displayScore.toFixed(1)}%
          </Text>
          <Text style={[styles.subLabel, { color: theme.textSecondary }]}>
            {language === 'bn' ? 'ঝুঁকির সম্ভাবনা' : 'Risk Probability'}
          </Text>
        </View>
      </View>

      {/* Risk Tier Badge */}
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
};

const styles = StyleSheet.create({
  container: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 12,
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
    ...StyleSheet.absoluteFill,
    alignItems: 'center',
    justifyContent: 'center',
  },
  percentageText: {
    fontSize: 32,
    fontWeight: '800',
    fontVariant: ['tabular-nums'],
    letterSpacing: -0.5,
  },
  subLabel: {
    fontSize: 11,
    fontWeight: '600',
    marginTop: 2,
  },
  tierPill: {
    marginTop: 14,
    paddingHorizontal: 14,
    paddingVertical: 5,
    borderRadius: 20,
    borderWidth: 1,
  },
  tierText: {
    fontSize: 12,
    fontWeight: '800',
    letterSpacing: 0.6,
  },
});
