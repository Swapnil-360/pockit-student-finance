import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, TextInput, Platform } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import { THEME } from '../constants/theme';
import { useTheme } from '../constants/ThemeContext';

interface SegmentedControlProps {
  options: Array<{ value: string; label: string }>;
  selectedValue?: string;
  value?: string;
  onSelect?: (val: string) => void;
  onChange?: (val: string) => void;
}

export const SegmentedControl: React.FC<SegmentedControlProps> = ({
  options,
  selectedValue,
  value,
  onSelect,
  onChange,
}) => {
  const { isDark, theme } = useTheme();
  const currentVal = value !== undefined ? value : selectedValue;
  const handleChange = (val: string) => {
    try {
      Haptics.selectionAsync();
    } catch {}
    if (onChange) onChange(val);
    if (onSelect) onSelect(val);
  };

  return (
    <View
      style={[
        styles.segmentContainer,
        {
          backgroundColor: isDark ? 'rgba(15, 23, 42, 0.65)' : 'rgba(90, 130, 150, 0.12)',
          borderColor: isDark ? 'rgba(255, 255, 255, 0.08)' : 'rgba(90, 130, 150, 0.22)',
        },
      ]}
    >
      {options.map((opt) => {
        const isSelected = currentVal === opt.value;
        return (
          <TouchableOpacity
            key={opt.value}
            style={[
              styles.segmentBtn,
              isSelected && styles.segmentBtnActive,
              isSelected && {
                backgroundColor: isDark ? 'rgba(244, 123, 78, 0.22)' : 'rgba(244, 123, 78, 0.14)',
              },
            ]}
            onPress={() => handleChange(opt.value)}
            activeOpacity={0.75}
          >
            <Text
              style={[
                styles.segmentText,
                { color: isSelected ? '#F47B4E' : (isDark ? 'rgba(248, 250, 252, 0.65)' : '#475569') },
                isSelected && styles.segmentTextActive,
              ]}
            >
              {opt.label}
            </Text>
          </TouchableOpacity>
        );
      })}
    </View>
  );
};

interface ChoiceCardProps {
  label: string;
  subtitle?: string;
  selected: boolean;
  onSelect: () => void;
  accentBadge?: string;
}

export const ChoiceCard: React.FC<ChoiceCardProps> = ({
  label,
  subtitle,
  selected,
  onSelect,
  accentBadge,
}) => {
  const { isDark, theme } = useTheme();
  const handlePress = () => {
    try {
      Haptics.selectionAsync();
    } catch {}
    onSelect();
  };

  return (
    <TouchableOpacity
      style={[
        styles.card,
        {
          backgroundColor: isDark ? 'rgba(15, 23, 42, 0.60)' : '#F8FAFC',
          borderColor: selected ? '#F47B4E' : (isDark ? 'rgba(255, 255, 255, 0.08)' : 'rgba(90, 130, 150, 0.20)'),
        },
        selected && styles.cardActive,
      ]}
      onPress={handlePress}
      activeOpacity={0.75}
    >
      <View style={styles.cardLeft}>
        <View
          style={[
            styles.radioCircle,
            { borderColor: isDark ? 'rgba(255, 255, 255, 0.25)' : 'rgba(90, 130, 150, 0.40)' },
            selected && styles.radioCircleActive,
          ]}
        >
          {selected && <View style={styles.radioDot} />}
        </View>
        <View style={styles.cardTextWrap}>
          <Text
            style={[
              styles.cardLabel,
              { color: selected ? (isDark ? '#F8FAFC' : '#0F172A') : theme.textPrimary },
              selected && styles.cardLabelActive,
            ]}
          >
            {label}
          </Text>
          {subtitle && (
            <Text style={[styles.cardSub, { color: theme.textSecondary }]}>
              {subtitle}
            </Text>
          )}
        </View>
      </View>

      {accentBadge && (
        <View style={styles.badge}>
          <Text style={styles.badgeText}>{accentBadge}</Text>
        </View>
      )}
    </TouchableOpacity>
  );
};

interface ChoiceChipProps {
  label: string;
  selected: boolean;
  onSelect?: () => void;
  onPress?: () => void;
}

export const ChoiceChip: React.FC<ChoiceChipProps> = ({
  label,
  selected,
  onSelect,
  onPress,
}) => {
  const { isDark, theme } = useTheme();
  const handlePress = () => {
    try {
      Haptics.selectionAsync();
    } catch {}
    if (onPress) onPress();
    if (onSelect) onSelect();
  };

  return (
    <TouchableOpacity
      style={[
        styles.chip,
        {
          backgroundColor: selected
            ? (isDark ? 'rgba(244, 123, 78, 0.22)' : 'rgba(244, 123, 78, 0.14)')
            : (isDark ? 'rgba(15, 23, 42, 0.60)' : '#F1F5F9'),
          borderColor: selected
            ? '#F47B4E'
            : (isDark ? 'rgba(255, 255, 255, 0.08)' : 'rgba(90, 130, 150, 0.22)'),
        },
        selected && styles.chipActive,
      ]}
      onPress={handlePress}
      activeOpacity={0.75}
    >
      <Text
        style={[
          styles.chipText,
          {
            color: selected
              ? '#F47B4E'
              : (isDark ? 'rgba(248, 250, 252, 0.75)' : '#334155'),
          },
          selected && styles.chipTextActive,
        ]}
      >
        {label}
      </Text>
    </TouchableOpacity>
  );
};

interface NumberStepperProps {
  value: number;
  onChange: (val: number) => void;
  min?: number;
  max?: number;
  step?: number;
  unit?: string;
}

export const NumberStepper: React.FC<NumberStepperProps> = ({
  value,
  onChange,
  min = 16,
  max = 40,
  step = 1,
  unit = 'years',
}) => {
  const { isDark, theme } = useTheme();
  const handleDecrement = () => {
    try {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    } catch {}
    onChange(Math.max(min, value - step));
  };

  const handleIncrement = () => {
    try {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    } catch {}
    onChange(Math.min(max, value + step));
  };

  return (
    <View style={styles.stepperContainer}>
      <TouchableOpacity
        style={[
          styles.stepperBtn,
          {
            backgroundColor: isDark ? 'rgba(255, 255, 255, 0.08)' : '#F1F5F9',
            borderColor: isDark ? 'rgba(255, 255, 255, 0.16)' : 'rgba(90, 130, 150, 0.25)',
          },
          value <= min && styles.stepperBtnDisabled,
        ]}
        onPress={handleDecrement}
        disabled={value <= min}
        activeOpacity={0.65}
      >
        <Text style={styles.stepperBtnText}>−</Text>
      </TouchableOpacity>

      <View style={styles.stepperValueBox}>
        <Text style={[styles.stepperNumber, { color: theme.textPrimary }]}>{value}</Text>
        <Text style={[styles.stepperUnit, { color: theme.textSecondary }]}>{unit}</Text>
      </View>

      <TouchableOpacity
        style={[
          styles.stepperBtn,
          {
            backgroundColor: isDark ? 'rgba(255, 255, 255, 0.08)' : '#F1F5F9',
            borderColor: isDark ? 'rgba(255, 255, 255, 0.16)' : 'rgba(90, 130, 150, 0.25)',
          },
          value >= max && styles.stepperBtnDisabled,
        ]}
        onPress={handleIncrement}
        disabled={value >= max}
        activeOpacity={0.65}
      >
        <Text style={styles.stepperBtnText}>+</Text>
      </TouchableOpacity>
    </View>
  );
};

export interface CurrencyPreset {
  label: string;
  value: number;
}

export interface CurrencyCustomInputProps {
  value: number;
  onChange: (val: number) => void;
  presets?: CurrencyPreset[];
  quickAdjustments?: number[];
  currencySymbol?: string;
  label?: string;
  subtitle?: string;
  min?: number;
  max?: number;
  placeholder?: string;
}

export const CurrencyCustomInput: React.FC<CurrencyCustomInputProps> = ({
  value,
  onChange,
  presets = [],
  quickAdjustments = [-500, 500, 1000],
  currencySymbol = '৳',
  label,
  subtitle,
  min = 0,
  max = 200000,
  placeholder = '0',
}) => {
  const { isDark, theme } = useTheme();
  const [textVal, setTextVal] = useState(value > 0 ? String(value) : '');
  const [isFocused, setIsFocused] = useState(false);

  useEffect(() => {
    setTextVal(value > 0 ? String(value) : '');
  }, [value]);

  const handleTextChange = (raw: string) => {
    const cleaned = raw.replace(/[^0-9]/g, '');
    setTextVal(cleaned);
    const parsed = parseInt(cleaned, 10) || 0;
    onChange(Math.min(max, Math.max(min, parsed)));
  };

  const handleSelectPreset = (presetVal: number) => {
    try {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    } catch {}
    setTextVal(presetVal > 0 ? String(presetVal) : '');
    onChange(presetVal);
  };

  const handleQuickAdjust = (delta: number) => {
    try {
      Haptics.selectionAsync();
    } catch {}
    const next = Math.min(max, Math.max(min, value + delta));
    setTextVal(next > 0 ? String(next) : '');
    onChange(next);
  };

  return (
    <View style={styles.currencyInputContainer}>
      {label && (
        <View style={styles.currencyLabelRow}>
          <Text style={[styles.currencyLabel, { color: theme.textPrimary }]}>{label}</Text>
          {subtitle && (
            <Text style={[styles.currencySubtitle, { color: theme.textSecondary }]}>
              {subtitle}
            </Text>
          )}
        </View>
      )}

      {/* Main Currency Input Box (Clean, Unified Focus Ring, Zero Overflow) */}
      <View
        style={[
          styles.currencyInputBox,
          {
            backgroundColor: isFocused
              ? (isDark ? 'rgba(244, 123, 78, 0.08)' : 'rgba(244, 123, 78, 0.04)')
              : (isDark ? 'rgba(15, 23, 42, 0.65)' : '#F8FAFC'),
            borderColor: isFocused
              ? theme.primary
              : (isDark ? 'rgba(255, 255, 255, 0.12)' : 'rgba(90, 130, 150, 0.28)'),
          },
        ]}
      >
        <Text
          style={[
            styles.currencyPrefix,
            { color: isFocused ? theme.primary : '#F47B4E' },
          ]}
        >
          {currencySymbol}
        </Text>

        <TextInput
          style={[
            styles.currencyTextInput,
            {
              color: theme.textPrimary,
              ...(Platform.OS === 'web'
                ? ({
                    outlineStyle: 'none',
                    outlineWidth: 0,
                  } as any)
                : {}),
            },
          ]}
          value={textVal}
          onChangeText={handleTextChange}
          onFocus={() => setIsFocused(true)}
          onBlur={() => setIsFocused(false)}
          placeholder={placeholder}
          placeholderTextColor={isDark ? 'rgba(248, 250, 252, 0.3)' : 'rgba(100, 116, 139, 0.45)'}
          keyboardType="numeric"
          returnKeyType="done"
        />

        {/* 1-Tap Clear Button */}
        {textVal.length > 0 && (
          <TouchableOpacity
            onPress={() => {
              setTextVal('');
              onChange(0);
            }}
            style={styles.clearBtn}
            activeOpacity={0.7}
            accessibilityLabel="Clear amount"
          >
            <Ionicons name="close-circle" size={18} color={theme.textMuted} />
          </TouchableOpacity>
        )}
      </View>

      {/* Preset Pills & Quick Delta Steppers Below (Flex-wrap prevents any right-edge overflow) */}
      {(presets.length > 0 || quickAdjustments.length > 0) && (
        <View style={styles.presetPillsRow}>
          {presets.map((preset) => {
            const isSelected = value === preset.value;
            return (
              <TouchableOpacity
                key={`preset-${preset.value}`}
                style={[
                  styles.presetPill,
                  {
                    backgroundColor: isSelected
                      ? (isDark ? 'rgba(244, 123, 78, 0.22)' : 'rgba(244, 123, 78, 0.14)')
                      : (isDark ? 'rgba(255, 255, 255, 0.06)' : '#F1F5F9'),
                    borderColor: isSelected
                      ? theme.primary
                      : (isDark ? 'rgba(255, 255, 255, 0.10)' : 'rgba(90, 130, 150, 0.20)'),
                  },
                ]}
                onPress={() => handleSelectPreset(preset.value)}
                activeOpacity={0.7}
              >
                <Text
                  style={[
                    styles.presetPillText,
                    {
                      color: isSelected
                        ? theme.primary
                        : (isDark ? '#CBD5E1' : '#334155'),
                      fontWeight: isSelected ? '700' : '600',
                    },
                  ]}
                >
                  {preset.label}
                </Text>
              </TouchableOpacity>
            );
          })}

          {/* Micro-adjustments rendered safely as secondary chips */}
          {quickAdjustments.map((adj) => (
            <TouchableOpacity
              key={`adj-${adj}`}
              style={[
                styles.microPill,
                {
                  backgroundColor: isDark ? 'rgba(255, 255, 255, 0.04)' : '#F8FAFC',
                  borderColor: isDark ? 'rgba(255, 255, 255, 0.08)' : 'rgba(90, 130, 150, 0.20)',
                },
              ]}
              onPress={() => handleQuickAdjust(adj)}
              activeOpacity={0.7}
            >
              <Text
                style={[
                  styles.microPillText,
                  { color: adj > 0 ? '#10B981' : '#F43F5E' },
                ]}
              >
                {adj > 0 ? `+${adj}` : `${adj}`}
              </Text>
            </TouchableOpacity>
          ))}
        </View>
      )}
    </View>
  );
};

interface LikertRatingProps {
  value: number;
  onChange: (val: number) => void;
  minLabel?: string;
  maxLabel?: string;
  labelMin?: string;
  labelMax?: string;
}

export const LikertRating: React.FC<LikertRatingProps> = ({
  value,
  onChange,
  minLabel,
  maxLabel,
  labelMin,
  labelMax,
}) => {
  const { isDark, theme } = useTheme();
  const steps = [1, 2, 3, 4, 5];
  const effectiveMin = minLabel || labelMin || '';
  const effectiveMax = maxLabel || labelMax || '';

  const handleSelect = (num: number) => {
    try {
      Haptics.selectionAsync();
    } catch {}
    onChange(num);
  };

  return (
    <View style={styles.likertWrap}>
      <View
        style={[
          styles.likertBar,
          {
            backgroundColor: isDark ? 'rgba(15, 23, 42, 0.65)' : 'rgba(90, 130, 150, 0.10)',
            borderColor: isDark ? 'rgba(255, 255, 255, 0.08)' : 'rgba(90, 130, 150, 0.20)',
          },
        ]}
      >
        {steps.map((num) => {
          const isSelected = value === num;
          return (
            <TouchableOpacity
              key={num}
              style={[
                styles.likertStep,
                {
                  backgroundColor: isSelected
                    ? (isDark ? 'rgba(244, 123, 78, 0.22)' : 'rgba(244, 123, 78, 0.15)')
                    : (isDark ? 'rgba(255, 255, 255, 0.03)' : 'rgba(255, 255, 255, 0.6)'),
                },
                isSelected && styles.likertStepActive,
              ]}
              onPress={() => handleSelect(num)}
              activeOpacity={0.75}
            >
              <Text
                style={[
                  styles.likertNum,
                  {
                    color: isSelected
                      ? '#F47B4E'
                      : (isDark ? 'rgba(248, 250, 252, 0.55)' : '#475569'),
                  },
                  isSelected && styles.likertNumActive,
                ]}
              >
                {num}
              </Text>
            </TouchableOpacity>
          );
        })}
      </View>
      {(effectiveMin || effectiveMax) && (
        <View style={styles.likertLabelsRow}>
          <Text style={[styles.likertLabel, { color: theme.textSecondary }]}>{effectiveMin}</Text>
          <Text style={[styles.likertLabel, { color: theme.textSecondary }]}>{effectiveMax}</Text>
        </View>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  // Segmented Control
  segmentContainer: {
    flexDirection: 'row',
    backgroundColor: 'rgba(15, 23, 42, 0.65)',
    borderRadius: 14,
    padding: 4,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.08)',
    gap: 4,
  },
  segmentBtn: {
    flex: 1,
    height: 44,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 10,
    backgroundColor: 'transparent',
  },
  segmentBtnActive: {
    backgroundColor: 'rgba(244, 123, 78, 0.18)',
    borderWidth: 1,
    borderColor: '#F47B4E',
    shadowColor: '#F47B4E',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 6,
    elevation: 3,
  },
  segmentText: {
    ...THEME.typography.bodyMedium,
    color: 'rgba(248, 250, 252, 0.6)',
    fontWeight: '500',
  },
  segmentTextActive: {
    color: '#F47B4E',
    fontWeight: '700',
  },

  // Choice Card
  card: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    minHeight: 52,
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderRadius: 16,
    backgroundColor: 'rgba(15, 23, 42, 0.60)',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.08)',
    marginBottom: 8,
  },
  cardActive: {
    backgroundColor: 'rgba(244, 123, 78, 0.14)',
    borderColor: '#F47B4E',
    borderWidth: 1.5,
  },
  cardLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  radioCircle: {
    width: 20,
    height: 20,
    borderRadius: 10,
    borderWidth: 2,
    borderColor: 'rgba(255, 255, 255, 0.25)',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  radioCircleActive: {
    borderColor: '#F47B4E',
  },
  radioDot: {
    width: 10,
    height: 10,
    borderRadius: 5,
    backgroundColor: '#F47B4E',
  },
  cardTextWrap: {
    flex: 1,
  },
  cardLabel: {
    ...THEME.typography.bodyMedium,
    color: THEME.colors.textSecondary,
  },
  cardLabelActive: {
    color: '#F8FAFC',
    fontWeight: '700',
  },
  cardSub: {
    ...THEME.typography.caption,
    color: THEME.colors.textMuted,
    marginTop: 2,
  },
  badge: {
    backgroundColor: 'rgba(244, 123, 78, 0.16)',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 12,
    marginLeft: 8,
  },
  badgeText: {
    ...THEME.typography.caption,
    color: '#F47B4E',
    fontWeight: '700',
  },

  // Choice Chip
  chip: {
    minHeight: 42,
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 14,
    backgroundColor: 'rgba(15, 23, 42, 0.60)',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.08)',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 8,
    marginBottom: 8,
  },
  chipActive: {
    backgroundColor: 'rgba(244, 123, 78, 0.18)',
    borderColor: '#F47B4E',
    borderWidth: 1.5,
    shadowColor: '#F47B4E',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 6,
    elevation: 3,
  },
  chipText: {
    ...THEME.typography.bodySmall,
    color: 'rgba(248, 250, 252, 0.7)',
    fontWeight: '500',
  },
  chipTextActive: {
    color: '#F47B4E',
    fontWeight: '700',
  },

  // Number Stepper
  stepperContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 28,
    paddingVertical: 6,
  },
  stepperBtn: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: 'rgba(255, 255, 255, 0.08)',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.16)',
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 4,
    elevation: 2,
  },
  stepperBtnDisabled: {
    opacity: 0.25,
  },
  stepperBtnText: {
    fontSize: 24,
    fontWeight: '600',
    color: '#F47B4E',
  },
  stepperValueBox: {
    alignItems: 'center',
    minWidth: 90,
  },
  stepperNumber: {
    fontSize: 32,
    fontWeight: '800',
    color: '#F8FAFC',
    letterSpacing: -0.5,
    fontVariant: ['tabular-nums'],
  },
  stepperUnit: {
    ...THEME.typography.caption,
    color: THEME.colors.textMuted,
    marginTop: -1,
    fontWeight: '600',
  },

  // Likert Rating
  likertWrap: {
    marginVertical: 4,
  },
  likertBar: {
    flexDirection: 'row',
    backgroundColor: 'rgba(15, 23, 42, 0.65)',
    borderRadius: 14,
    padding: 4,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.08)',
    gap: 6,
  },
  likertStep: {
    flex: 1,
    height: 44,
    borderRadius: 10,
    backgroundColor: 'rgba(255, 255, 255, 0.03)',
    borderWidth: 1,
    borderColor: 'transparent',
    alignItems: 'center',
    justifyContent: 'center',
  },
  likertStepActive: {
    backgroundColor: 'rgba(244, 123, 78, 0.22)',
    borderColor: '#F47B4E',
    shadowColor: '#F47B4E',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.3,
    shadowRadius: 6,
    elevation: 3,
  },
  likertNum: {
    fontSize: 16,
    color: 'rgba(248, 250, 252, 0.45)',
    fontWeight: '700',
    fontVariant: ['tabular-nums'],
  },
  likertNumActive: {
    color: '#F47B4E',
    fontWeight: '900',
  },
  likertLabelsRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 8,
    paddingHorizontal: 4,
  },
  likertLabel: {
    ...THEME.typography.caption,
    color: THEME.colors.textMuted,
    fontSize: 12,
  },

  // Currency Custom Input Styles
  currencyInputContainer: {
    marginVertical: 4,
  },
  currencyLabelRow: {
    marginBottom: 8,
  },
  currencyLabel: {
    fontSize: 14,
    fontWeight: '700',
    letterSpacing: -0.2,
  },
  currencySubtitle: {
    fontSize: 12,
    marginTop: 2,
    lineHeight: 16,
  },
  currencyInputBox: {
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: 16,
    borderWidth: 1.5,
    paddingHorizontal: 16,
    paddingVertical: 10,
    minHeight: 52,
  },
  currencyPrefix: {
    fontSize: 22,
    fontWeight: '700',
    marginRight: 10,
  },
  currencyTextInput: {
    flex: 1,
    fontSize: 22,
    fontWeight: '700',
    letterSpacing: -0.4,
    paddingVertical: 0,
    fontVariant: ['tabular-nums'],
  },
  clearBtn: {
    padding: 4,
    marginLeft: 8,
  },
  presetPillsRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    marginTop: 10,
  },
  presetPill: {
    paddingHorizontal: 12,
    paddingVertical: 7,
    borderRadius: 16,
    borderWidth: 1,
  },
  presetPillText: {
    fontSize: 12,
    fontVariant: ['tabular-nums'],
  },
  microPill: {
    paddingHorizontal: 10,
    paddingVertical: 7,
    borderRadius: 16,
    borderWidth: 1,
  },
  microPillText: {
    fontSize: 12,
    fontWeight: '700',
    fontVariant: ['tabular-nums'],
  },
});
