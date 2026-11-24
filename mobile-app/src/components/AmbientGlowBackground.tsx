import React from 'react';
import { View, StyleSheet } from 'react-native';
import { useTheme } from '../constants/ThemeContext';

export const AmbientGlowBackground: React.FC = () => {
  const { theme } = useTheme();

  return (
    <View
      pointerEvents="none"
      style={[
        StyleSheet.absoluteFill,
        { backgroundColor: theme.canvas },
      ]}
    />
  );
};
