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
  canvas: '#121417',           // Midnight charcoal canvas (pure, deep neutral charcoal)
  background: '#121417',
  surface: '#1A1D21',          // Elevated midnight charcoal card surface
  surfaceElevated: '#22262B',  // Modals & elevated floating panels
  surfaceSubtle: '#16191D',    // Subtle charcoal inset / pill background
  headerBlock: '#1E2227',      // Midnight charcoal header block
  headerBlockAccent: 'rgba(244, 123, 78, 0.14)',
  headerBlockText: '#F8FAFC',
  primary: '#F47B4E',          // Luminous warm terracotta (striking contrast against charcoal)
  primaryLight: '#FFA07A',
  primarySubtle: 'rgba(244, 123, 78, 0.16)',
  primaryBorder: '#F47B4E',
  terracotta: '#F47B4E',
  terracottaSoft: 'rgba(244, 123, 78, 0.16)',
  slateBlue: '#A3B3C2',        // Muted charcoal-slate accent
  slateBlueTint: 'rgba(163, 179, 194, 0.14)',
  powderBlue: '#2A3038',
  powderBlueLight: '#1E232A',
  powder: '#242930',
  powderTint: '#171A1F',
  textPrimary: '#F8FAFC',      // Crisp, high-contrast text
  textSecondary: '#A0AEC0',    // Clean charcoal-gray secondary text
  textMuted: '#718096',        // Subtle muted charcoal helper text
  border: 'rgba(255, 255, 255, 0.08)', // Delicate micro-border
  borderMedium: 'rgba(255, 255, 255, 0.14)',
  borderSubtle: 'rgba(255, 255, 255, 0.04)',
  borderFocus: '#F47B4E',
  accent: '#F47B4E',
  accentEmerald: '#10B981',
  riskLow: '#10B981',          // Vibrant emerald
  riskLowBg: 'rgba(16, 185, 129, 0.14)',
  riskLowBorder: '#10B981',
  riskModerate: '#F59E0B',
  riskHigh: '#F47B4E',
  riskHighBg: 'rgba(244, 123, 78, 0.14)',
  riskHighBorder: '#F47B4E',
  cardBorder: 'rgba(255, 255, 255, 0.07)',
  navBg: '#14171A',            // Midnight charcoal navigation bar
  navBorder: 'rgba(255, 255, 255, 0.08)',
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
