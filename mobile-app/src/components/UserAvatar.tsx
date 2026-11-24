import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  Image,
  StyleSheet,
  TouchableOpacity,
  Animated,
} from 'react-native';
import * as Haptics from 'expo-haptics';
import { useTheme } from '../constants/ThemeContext';
import { UserData } from '../services/api';

interface UserAvatarProps {
  user: UserData | null;
  size?: number;
  onPress?: () => void;
  showBadge?: boolean;
}

export const UserAvatar: React.FC<UserAvatarProps> = ({
  user,
  size = 42,
  onPress,
  showBadge = true,
}) => {
  const { theme } = useTheme();
  const [imageError, setImageError] = useState(false);
  const scaleAnim = new Animated.Value(1);

  const isPro = Boolean(user?.is_pro);
  const avatarUrl = user?.avatar_url;

  useEffect(() => {
    setImageError(false);
  }, [avatarUrl]);

  const getInitials = (name?: string): string => {
    if (!name || !name.trim()) return 'S';
    const parts = name.trim().split(' ').filter(Boolean);
    if (parts.length === 1) return parts[0].substring(0, 2).toUpperCase();
    return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
  };

  const handlePressIn = () => {
    Animated.spring(scaleAnim, {
      toValue: 0.92,
      useNativeDriver: true,
      friction: 8,
    }).start();
  };

  const handlePressOut = () => {
    Animated.spring(scaleAnim, {
      toValue: 1,
      useNativeDriver: true,
      friction: 8,
    }).start();
  };

  const handlePress = () => {
    if (!onPress) return;
    try {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    } catch {}
    onPress();
  };

  const ringColor = isPro ? theme.primary : theme.slateBlue;
  const borderRadius = size / 2;

  const content = (
    <Animated.View
      style={[
        styles.outerRing,
        {
          width: size,
          height: size,
          borderRadius,
          borderColor: ringColor,
          transform: [{ scale: scaleAnim }],
        },
      ]}
    >
      <View
        style={[
          styles.innerContainer,
          {
            width: size - 4,
            height: size - 4,
            borderRadius: (size - 4) / 2,
            backgroundColor: theme.slateBlue,
          },
        ]}
      >
        {avatarUrl && !imageError ? (
          <Image
            source={{ uri: avatarUrl }}
            style={{
              width: size - 4,
              height: size - 4,
              borderRadius: (size - 4) / 2,
            }}
            onError={() => setImageError(true)}
          />
        ) : (
          <Text
            style={[
              styles.initialsText,
              {
                fontSize: Math.round(size * 0.38),
                color: '#FFFFFF',
              },
            ]}
          >
            {getInitials(user?.full_name)}
          </Text>
        )}
      </View>

      {/* Subtle Pro status dot */}
      {showBadge && isPro && (
        <View
          style={[
            styles.proDot,
            {
              backgroundColor: theme.primary,
              borderColor: theme.canvas,
            },
          ]}
        />
      )}
    </Animated.View>
  );

  if (onPress) {
    return (
      <TouchableOpacity
        onPress={handlePress}
        onPressIn={handlePressIn}
        onPressOut={handlePressOut}
        activeOpacity={0.9}
        accessibilityRole="button"
        accessibilityLabel="Open Profile and Settings"
      >
        {content}
      </TouchableOpacity>
    );
  }

  return content;
};

const styles = StyleSheet.create({
  outerRing: {
    borderWidth: 2,
    alignItems: 'center',
    justifyContent: 'center',
  },
  innerContainer: {
    overflow: 'hidden',
    alignItems: 'center',
    justifyContent: 'center',
  },
  initialsText: {
    fontWeight: '700',
    letterSpacing: 0.5,
  },
  proDot: {
    position: 'absolute',
    bottom: -1,
    right: -1,
    width: 10,
    height: 10,
    borderRadius: 5,
    borderWidth: 1.5,
  },
});

