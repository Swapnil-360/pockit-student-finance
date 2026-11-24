import React from 'react';
import { View, StyleSheet, ViewStyle, StyleProp } from 'react-native';
import { useTheme } from '../constants/ThemeContext';
import { THEME } from '../constants/theme';

interface GlassCardProps {
  children: React.ReactNode;
  style?: StyleProp<ViewStyle>;
  glowColor?: 'terracotta' | 'slate' | 'none';
  borderRadius?: number;
}

export const GlassCard: React.FC<GlassCardProps> = ({
  children,
  style,
  glowColor = 'none',
  borderRadius = 24,
}) => {
  const { isDark, theme } = useTheme();

  const getBorderColor = () => {
    if (glowColor === 'terracotta') return theme.primary;
    if (glowColor === 'slate') return isDark ? 'rgba(186, 211, 230, 0.3)' : 'rgba(83, 122, 150, 0.3)';
    return theme.cardBorder;
  };

  const flattened = StyleSheet.flatten(style);
  const innerAlign = flattened?.alignItems ? { alignItems: flattened.alignItems } : null;
  const innerJustify = flattened?.justifyContent ? { justifyContent: flattened.justifyContent } : null;

  return (
    <View
      style={[
        styles.cardBase,
        {
          borderRadius,
          backgroundColor: theme.surface,
          borderColor: getBorderColor(),
          shadowColor: isDark ? '#000000' : '#466B85',
          shadowOpacity: isDark ? 0.30 : 0.10,
        },
        style,
      ]}
    >
      <View style={[styles.innerContent, { borderRadius }, innerAlign, innerJustify]}>
        {children}
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  cardBase: {
    borderWidth: 1,
    shadowOffset: { width: 0, height: 6 },
    shadowRadius: 14,
    elevation: 3,
  },
  innerContent: {
    padding: THEME.spacing.lg,
  },
});
