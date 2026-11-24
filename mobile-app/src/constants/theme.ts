/**
 * Scandinavian Slate-Blue & Warm Terracotta Design System
 * Calm, human-centered, modern aesthetic with full Light Mode (Default) and Dark Mode.
 */

export interface ThemeColors {
  canvas: string;
  background: string;
  surface: string;
  surfaceElevated: string;
  surfaceSubtle: string;
  headerBlock: string;
  headerBlockAccent: string;
  headerBlockText: string;
  primary: string;
  primaryLight: string;
  primarySubtle: string;
  primaryBorder: string;
  terracotta: string;
  terracottaSoft: string;
  slateBlue: string;
  slateBlueTint: string;
  powderBlue: string;
  powderBlueLight: string;
  powder: string;
  powderTint: string;
  textPrimary: string;
  textSecondary: string;
  textMuted: string;
  border: string;
  borderMedium: string;
  borderSubtle: string;
  borderFocus: string;
  accent: string;
  accentEmerald: string;
  riskLow: string;
  riskLowBg: string;
  riskLowBorder: string;
  riskModerate: string;
  riskHigh: string;
  riskHighBg: string;
  riskHighBorder: string;
  cardBorder: string;
  navBg: string;
  navBorder: string;
  shadowColor: string;
  primaryAccent: string;
  warningOrange: string;
}

export const LIGHT_COLORS: ThemeColors = {
  canvas: '#EEF3F6',           // soft powder slate-blue canvas
  background: '#EEF3F6',
  surface: '#FFFFFF',          // clean white elevated cards
  surfaceElevated: '#FFFFFF',
  surfaceSubtle: '#E2EBF2',
  headerBlock: '#5A8296',      // dusty slate-blue header / calendar block
  headerBlockAccent: '#D5E4EF',// powder tint accent
  headerBlockText: '#FFFFFF',
  primary: '#F47B4E',          // warm terracotta coral
  primaryLight: '#F89670',
  primarySubtle: '#FDECE4',    // soft terracotta tint
  primaryBorder: '#F47B4E',
  terracotta: '#F47B4E',
  terracottaSoft: '#FDECE4',
  slateBlue: '#5A8296',
  slateBlueTint: '#D5E4EF',
  powderBlue: '#C9DCE9',
  powderBlueLight: '#D4E4F0',
  powder: '#D5E4EF',
  powderTint: '#EEF3F7',
  textPrimary: '#1E293B',      // deep slate
  textSecondary: '#64748B',    // muted steel
  textMuted: '#94A3B8',
  border: 'rgba(90, 130, 150, 0.16)',
  borderMedium: 'rgba(90, 130, 150, 0.26)',
  borderSubtle: 'rgba(90, 130, 150, 0.08)',
  borderFocus: '#F47B4E',
  accent: '#F47B4E',
  accentEmerald: '#10B981',
  riskLow: '#10B981',
  riskLowBg: '#E6F9F0',
  riskLowBorder: '#10B981',
  riskModerate: '#F59E0B',
  riskHigh: '#F47B4E',
  riskHighBg: '#FEE2E2',
  riskHighBorder: '#F47B4E',
  cardBorder: 'rgba(90, 130, 150, 0.12)',
  navBg: '#FFFFFF',
  navBorder: 'rgba(90, 130, 150, 0.14)',
  shadowColor: '#466B85',
  primaryAccent: '#F47B4E',
  warningOrange: '#F59E0B',
};

export const DARK_COLORS: ThemeColors = {
  canvas: '#0B1120',           // deep obsidian slate canvas
  background: '#0B1120',
  surface: '#1E293B',          // elevated dark slate card
  surfaceElevated: '#283548',
  surfaceSubtle: 'rgba(255, 255, 255, 0.05)', // modern transparent glass tint
  headerBlock: '#1E2E42',      // dusty slate dark header block
  headerBlockAccent: 'rgba(186, 211, 230, 0.16)',
  headerBlockText: '#F8FAFC',
  primary: '#F47B4E',          // luminous warm terracotta
  primaryLight: '#FFA07A',
  primarySubtle: 'rgba(244, 123, 78, 0.16)',
  primaryBorder: '#F47B4E',
  terracotta: '#F47B4E',
  terracottaSoft: 'rgba(244, 123, 78, 0.16)',
  slateBlue: '#93B3C8',        // high-contrast softened slate-blue
  slateBlueTint: 'rgba(147, 179, 200, 0.18)',
  powderBlue: '#324B60',
  powderBlueLight: '#1E2E40',
  powder: '#263B4D',
  powderTint: '#182433',
  textPrimary: '#F8FAFC',      // bright pure text (contrast 14:1)
  textSecondary: '#CBD5E1',    // high-contrast soft silver-slate (contrast 8.5:1)
  textMuted: '#94A3B8',        // clearly legible secondary steel (contrast 4.8:1)
  border: 'rgba(255, 255, 255, 0.10)',
  borderMedium: 'rgba(255, 255, 255, 0.18)',
  borderSubtle: 'rgba(255, 255, 255, 0.05)',
  borderFocus: '#F47B4E',
  accent: '#F47B4E',
  accentEmerald: '#10B981',
  riskLow: '#10B981',          // vibrant emerald
  riskLowBg: 'rgba(16, 185, 129, 0.16)',
  riskLowBorder: '#10B981',
  riskModerate: '#F59E0B',
  riskHigh: '#F47B4E',
  riskHighBg: 'rgba(244, 123, 78, 0.16)',
  riskHighBorder: '#F47B4E',
  cardBorder: 'rgba(255, 255, 255, 0.08)',
  navBg: '#111827',
  navBorder: 'rgba(255, 255, 255, 0.09)',
  shadowColor: '#000000',
  primaryAccent: '#F47B4E',
  warningOrange: '#F59E0B',
};

export const THEME = {
  colors: LIGHT_COLORS, // Default to light mode

  shadows: {
    soft: {
      shadowColor: '#466B85',
      shadowOffset: { width: 0, height: 6 },
      shadowOpacity: 0.10,
      shadowRadius: 14,
      elevation: 3,
    },
    card: {
      shadowColor: '#466B85',
      shadowOffset: { width: 0, height: 4 },
      shadowOpacity: 0.08,
      shadowRadius: 12,
      elevation: 2,
    },
    floatingBtn: {
      shadowColor: '#F27A49',
      shadowOffset: { width: 0, height: 6 },
      shadowOpacity: 0.35,
      shadowRadius: 12,
      elevation: 6,
    },
  },

  radius: {
    xs: 6,
    sm: 10,
    md: 16,
    lg: 20,
    xl: 24,
    full: 9999,
  },

  spacing: {
    xs: 4,
    sm: 8,
    md: 12,
    lg: 16,
    xl: 20,
    xxl: 28,
    xxxl: 36,
  },

  layout: {
    minTouchTarget: 48,
    cardPadding: 16,
    headerBlockHeight: 180,
    bottomScrollPadding: 100,
  },

  typography: {
    display: {
      fontSize: 28,
      fontWeight: '800' as const,
      lineHeight: 34,
      letterSpacing: -0.5,
    },
    h1: {
      fontSize: 22,
      fontWeight: '800' as const,
      lineHeight: 28,
      letterSpacing: -0.3,
    },
    h2: {
      fontSize: 18,
      fontWeight: '700' as const,
      lineHeight: 24,
      letterSpacing: -0.2,
    },
    h3: {
      fontSize: 15,
      fontWeight: '700' as const,
      lineHeight: 20,
    },
    body: {
      fontSize: 14,
      fontWeight: '400' as const,
      lineHeight: 20,
    },
    bodyMedium: {
      fontSize: 13,
      fontWeight: '500' as const,
      lineHeight: 18,
    },
    bodySmall: {
      fontSize: 12,
      fontWeight: '500' as const,
      lineHeight: 16,
    },
    caption: {
      fontSize: 11,
      fontWeight: '500' as const,
      lineHeight: 14,
    },
    button: {
      fontSize: 14,
      fontWeight: '700' as const,
      letterSpacing: 0.2,
    },
    tabularAmount: {
      fontSize: 22,
      fontWeight: '800' as const,
      fontVariant: ['tabular-nums' as const],
    },
  },
};
