import React from 'react';
import { View, Text, StyleSheet, Image, Platform } from 'react-native';
import { BRANDING } from '../constants/branding';
import { useTheme } from '../constants/ThemeContext';

interface BrandLogoProps {
  size?: 'sm' | 'md' | 'lg' | 'xl';
  showText?: boolean;
  useImage?: boolean;
}

export const BrandLogo: React.FC<BrandLogoProps> = ({
  size = 'md',
  showText = false,
  useImage = true,
}) => {
  const { isDark, theme } = useTheme();

  const getDimensions = () => {
    switch (size) {
      case 'sm':
        return { outer: 42, inner: 34, fontSize: 16, titleSize: 15, subSize: 10 };
      case 'lg':
        return { outer: 84, inner: 70, fontSize: 30, titleSize: 22, subSize: 12 };
      case 'xl':
        return { outer: 148, inner: 116, fontSize: 40, titleSize: 26, subSize: 13 };
      case 'md':
      default:
        return { outer: 56, inner: 46, fontSize: 22, titleSize: 18, subSize: 11 };
    }
  };

  const dim = getDimensions();

  return (
    <View style={styles.container}>
      {useImage ? (
        <View
          style={[
            styles.imageContainer,
            {
              width: dim.outer,
              height: dim.outer,
              borderRadius: dim.outer / 2,
              backgroundColor: isDark ? 'rgba(255, 255, 255, 0.08)' : '#FFFFFF',
              borderColor: isDark ? 'rgba(255, 255, 255, 0.14)' : 'rgba(90, 130, 150, 0.22)',
              borderWidth: 1,
            },
          ]}
        >
          <Image
            source={BRANDING.assets.logo}
            style={{
              width: dim.inner,
              height: dim.inner,
            }}
            resizeMode="contain"
          />
        </View>
      ) : (
        /* Scandinavian Terracotta Emblem */
        <View
          style={[
            styles.outerGlowRing,
            {
              width: dim.outer,
              height: dim.outer,
              borderRadius: dim.outer / 2,
              backgroundColor: theme.terracottaSoft,
              borderColor: theme.primary,
            },
          ]}
        >
          <View
            style={[
              styles.innerTile,
              {
                width: dim.inner,
                height: dim.inner,
                borderRadius: dim.inner * 0.35,
                backgroundColor: theme.headerBlock,
                borderColor: theme.headerBlockAccent,
              },
            ]}
          >
            <Text
              style={[
                styles.symbolText,
                { fontSize: dim.fontSize, lineHeight: dim.fontSize * 1.2 },
              ]}
            >
              ৳
            </Text>
            {/* Tech Trajectory Indicator Dot */}
            <View style={[styles.trajectoryDot, { backgroundColor: theme.primary }]} />
          </View>
        </View>
      )}

      {showText && (
        <View style={styles.textBox}>
          <Text style={[styles.brandTitle, { fontSize: dim.titleSize, color: theme.textPrimary }]}>
            {BRANDING.appName}
          </Text>
          <Text style={[styles.brandSubtitle, { fontSize: dim.subSize, color: theme.textSecondary }]}>
            {BRANDING.appSubtitleEn}
          </Text>
        </View>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  imageContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.08,
    shadowRadius: 3,
    elevation: 2,
    overflow: 'hidden',
  },
  outerGlowRing: {
    borderWidth: 1.5,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#F27A49',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 6,
    elevation: 3,
  },
  innerTile: {
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
    position: 'relative',
  },
  symbolText: {
    color: '#FFFFFF',
    fontWeight: '800',
    textAlign: 'center',
    marginTop: Platform.OS === 'android' ? -2 : 0,
  },
  trajectoryDot: {
    position: 'absolute',
    top: 3,
    right: 3,
    width: 5,
    height: 5,
    borderRadius: 2.5,
  },
  textBox: {
    justifyContent: 'center',
  },
  brandTitle: {
    fontWeight: '800',
    letterSpacing: 0.3,
  },
  brandSubtitle: {
    fontWeight: '500',
    marginTop: 2,
  },
});
