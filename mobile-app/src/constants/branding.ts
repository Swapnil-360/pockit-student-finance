/**
 * Pockit — Centralized Brand Identity Configuration
 * 
 * To replace with your own custom logo and assets:
 * 1. Drop your PNG/SVG files into `mobile-app/assets/brand/`:
 *    - `logo.png` (app logo, 1024x1024 recommended)
 *    - `splash-icon.png` (splash screen icon)
 *    - `adaptive-icon.png` (Android adaptive icon)
 * 2. Update or customize the text/taglines below if desired.
 * 3. Components across the app automatically consume these constants.
 */

export const BRANDING = {
  // Official App Identity
  appName: 'Pockit',
  appNameBn: 'পকেট (Pockit)',
  
  appSubtitleEn: 'Student Money & Financial Risk Coach',
  appSubtitleBn: 'শিক্ষার্থীর অর্থ ও ঝুঁকি কোচ',
  
  taglineEn: 'Keep your student pocket safe & on track!',
  taglineBn: 'মাসের শেষে পকেট খালি হওয়ার আগেই সতর্ক হোন!',
  fullTagline: 'মাসের শেষে পকেট খালি হওয়ার আগেই সতর্ক হোন! | Keep your student pocket safe & on track!',

  version: '2.0.0',
  buildNumber: '2026.11.22',

  // Asset File References (Drop your custom images in assets/brand/)
  assets: {
    logo: require('../../assets/brand/logo.png'),
    wallet: require('../../assets/brand/pockit_wallet.png'),
    splashIcon: require('../../assets/brand/splash-icon.png'),
    adaptiveIcon: require('../../assets/brand/adaptive-icon.png'),
  },

  // Brand Palette Accents
  colors: {
    electricCyan: '#0EA5E9',
    electricCyanLight: '#38BDF8',
    emeraldTaka: '#10B981',
    emeraldTakaLight: '#34D399',
    amberWarning: '#F59E0B',
    roseAlert: '#EF4444',
    obsidianBase: '#090D16',
    charcoalSurface: '#111827',
  },

  // Support & Metadata
  meta: {
    universityTarget: 'University Students of Bangladesh',
    currencySymbol: '৳',
    currencyCode: 'BDT',
    supportEmail: 'support@pockit.app',
    customLogoInstructions:
      'Drop your PNG/SVG into mobile-app/assets/brand/ (logo.png, splash-icon.png, adaptive-icon.png). Components consume this config automatically.',
  },
};

