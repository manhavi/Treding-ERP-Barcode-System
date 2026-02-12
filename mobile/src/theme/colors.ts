// Aaradhya Fashion App — Colourful, professional UI
// Primary blue + warm accent (amber/gold) for fashion feel

export const colors = {
  // Primary Brand — Blue
  primary: '#1565c0',
  primaryDark: '#0d47a1',
  primaryLight: '#42a5f5',
  primaryLighter: '#bbdefb',
  primaryLightest: '#e3f2fd',
  
  // Accent — Warm (fashion / lehenga feel)
  accent: '#c9a227',
  accentDark: '#a08020',
  accentLight: '#e6c654',
  accentLighter: '#fff8e1',
  accentLightest: '#fffde7',
  
  // Background — Slightly warm grey
  background: '#f5f5f0',
  backgroundLight: '#ffffff',
  backgroundDark: '#e8e8e0',
  backgroundElevated: '#ffffff',
  
  // Text Colors - High Contrast
  textPrimary: '#212529',
  textSecondary: '#495057',
  textTertiary: '#6c757d',
  textDisabled: '#adb5bd',
  textWhite: '#ffffff',
  textOnPrimary: '#ffffff',
  textInverse: '#ffffff',
  
  // Status Colors
  success: '#28a745',
  successLight: '#34ce57',
  successBackground: '#d4edda',
  successText: '#155724',
  
  error: '#dc3545',
  errorLight: '#e4606d',
  errorBackground: '#f8d7da',
  errorText: '#721c24',
  
  warning: '#ffc107',
  warningLight: '#ffcd39',
  warningBackground: '#fff3cd',
  warningText: '#856404',
  
  info: '#17a2b8',
  infoLight: '#3fc1d8',
  infoBackground: '#d1ecf1',
  infoText: '#0c5460',
  
  // Border Colors
  border: '#dee2e6',
  borderLight: '#e9ecef',
  borderDark: '#ced4da',
  borderFocus: '#1565c0',
  
  // Shadow Colors
  shadow: 'rgba(0, 0, 0, 0.08)',
  shadowLight: 'rgba(0, 0, 0, 0.04)',
  shadowMedium: 'rgba(0, 0, 0, 0.12)',
  shadowDark: 'rgba(0, 0, 0, 0.16)',
  shadowPrimary: 'rgba(25, 118, 210, 0.25)',
  
  // Card Colors
  cardBackground: '#ffffff',
  cardBorder: '#e9ecef',
  cardElevated: '#ffffff',
  
  // Input Colors
  inputBackground: '#ffffff',
  inputBorder: '#ced4da',
  inputBorderFocus: '#1565c0',
  inputBorderError: '#dc3545',
  inputPlaceholder: '#adb5bd',
  inputText: '#212529',
  
  // Button Colors
  buttonPrimary: '#1565c0',
  buttonPrimaryHover: '#0d47a1',
  buttonPrimaryPressed: '#0d47a1',
  buttonSecondary: '#6c757d',
  buttonSecondaryHover: '#5a6268',
  buttonDanger: '#dc3545',
  buttonDangerHover: '#c82333',
  buttonSuccess: '#28a745',
  buttonSuccessHover: '#218838',
  buttonDisabled: '#e9ecef',
  buttonDisabledText: '#adb5bd',
  
  // Surface Colors
  surface: '#ffffff',
  surfaceElevated: '#ffffff',
  surfaceHover: '#f8f9fa',
  
  // Divider
  divider: '#e9ecef',
  dividerDark: '#dee2e6',
};

export const spacing = {
  xs: 4,
  sm: 8,
  md: 16,
  lg: 24,
  xl: 32,
  xxl: 48,
  xxxl: 64,
};

export const borderRadius = {
  xs: 4,
  sm: 8,
  md: 12,
  lg: 16,
  xl: 20,
  xxl: 24,
  round: 999,
  full: 9999,
};

export const typography = {
  // Headings
  h1: {
    fontSize: 32,
    fontWeight: '700' as const,
    lineHeight: 40,
    color: colors.textPrimary,
    letterSpacing: -0.5,
  },
  h2: {
    fontSize: 28,
    fontWeight: '700' as const,
    lineHeight: 36,
    color: colors.textPrimary,
    letterSpacing: -0.3,
  },
  h3: {
    fontSize: 24,
    fontWeight: '600' as const,
    lineHeight: 32,
    color: colors.textPrimary,
    letterSpacing: -0.2,
  },
  h4: {
    fontSize: 20,
    fontWeight: '600' as const,
    lineHeight: 28,
    color: colors.textPrimary,
    letterSpacing: 0,
  },
  h5: {
    fontSize: 18,
    fontWeight: '600' as const,
    lineHeight: 24,
    color: colors.textPrimary,
    letterSpacing: 0,
  },
  h6: {
    fontSize: 16,
    fontWeight: '600' as const,
    lineHeight: 22,
    color: colors.textPrimary,
    letterSpacing: 0.15,
  },
  
  // Body Text
  body1: {
    fontSize: 16,
    fontWeight: '400' as const,
    lineHeight: 24,
    color: colors.textSecondary,
    letterSpacing: 0.15,
  },
  body2: {
    fontSize: 14,
    fontWeight: '400' as const,
    lineHeight: 20,
    color: colors.textSecondary,
    letterSpacing: 0.25,
  },
  body3: {
    fontSize: 13,
    fontWeight: '400' as const,
    lineHeight: 18,
    color: colors.textTertiary,
    letterSpacing: 0.25,
  },
  
  // Caption
  caption: {
    fontSize: 12,
    fontWeight: '400' as const,
    lineHeight: 16,
    color: colors.textTertiary,
    letterSpacing: 0.4,
  },
  captionSmall: {
    fontSize: 11,
    fontWeight: '400' as const,
    lineHeight: 14,
    color: colors.textDisabled,
    letterSpacing: 0.4,
  },
  
  // Button
  button: {
    fontSize: 16,
    fontWeight: '600' as const,
    letterSpacing: 0.5,
    lineHeight: 24,
  },
  buttonSmall: {
    fontSize: 14,
    fontWeight: '600' as const,
    letterSpacing: 0.5,
    lineHeight: 20,
  },
  
  // Overline
  overline: {
    fontSize: 10,
    fontWeight: '500' as const,
    lineHeight: 16,
    color: colors.textTertiary,
    letterSpacing: 1.5,
    textTransform: 'uppercase' as const,
  },
};

export const shadows = {
  sm: {
    shadowColor: colors.shadow,
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 1,
    shadowRadius: 2,
    elevation: 1,
  },
  md: {
    shadowColor: colors.shadow,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 1,
    shadowRadius: 4,
    elevation: 2,
  },
  lg: {
    shadowColor: colors.shadow,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 1,
    shadowRadius: 8,
    elevation: 4,
  },
  xl: {
    shadowColor: colors.shadowMedium,
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 1,
    shadowRadius: 16,
    elevation: 8,
  },
  primary: {
    shadowColor: colors.shadowPrimary,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 1,
    shadowRadius: 12,
    elevation: 6,
  },
};
