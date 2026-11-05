/**
 * Charte TerraProxi : vert #5BAE6A, bleu #76CCD6, gris #333333 et blanc.
 * Les teintes « Dark » servent au texte et aux fonds portant du texte blanc :
 * elles respectent le contraste WCAG AA (≥ 4,5:1 sur blanc), contrairement aux
 * couleurs de la charte (blanc sur #5BAE6A ≈ 2,7:1, sur #76CCD6 ≈ 1,8:1),
 * réservées aux icônes, bordures et aplats décoratifs.
 */
export const Colors = {
  primary: '#5BAE6A',
  primaryDark: '#3A7D45',
  primaryLight: '#EBF8F0',
  accent: '#76CCD6',
  accentDark: '#1F7A85',
  dark: '#333333',
  gray900: '#1F2937',
  gray800: '#374151',
  gray700: '#4B5563',
  gray600: '#6B7280',
  gray500: '#9CA3AF',
  gray400: '#B0B0B0',
  gray300: '#D1D5DB',
  gray200: '#E5E7EB',
  gray100: '#F3F4F6',
  gray50: '#F9FAFB',
  white: '#FFFFFF',
  danger: '#DC2626',
  warning: '#F59E0B',
  success: '#10B981',
  border: '#E2EEE2',
  blue50: '#EFF6FF',
  blue500: '#3B82F6',
  blue600: '#2563EB',
  yellow50: '#FEFCE8',
  yellow500: '#EAB308',
  green50: '#F0FDF4',
  green100: '#DCFCE7',
  green500: '#22C55E',
  green700: '#15803D',
  red50: '#FEF2F2',
  red500: '#EF4444',
  orange50: '#FFF7ED',
  orange500: '#F97316',
}

export const Spacing = {
  xs: 4,
  sm: 8,
  md: 12,
  lg: 16,
  xl: 20,
  xxl: 24,
  xxxl: 32,
}

export const Radius = {
  sm: 8,
  md: 12,
  lg: 16,
  xl: 20,
  xxl: 24,
  full: 9999,
}

/** Taille minimale d'une cible tactile (WCAG 2.5.5 / recommandations iOS et Android). */
export const MIN_TOUCH_TARGET = 44

/**
 * Polices de la charte, chargées au démarrage (App.tsx) : Montserrat pour les titres,
 * Open Sans pour le texte. Une police personnalisée ne se met pas en gras via fontWeight
 * sur Android : chaque graisse est une famille distincte.
 */
export const Fonts = {
  title: 'Montserrat_700Bold',
  titleHeavy: 'Montserrat_800ExtraBold',
  regular: 'OpenSans_400Regular',
  medium: 'OpenSans_500Medium',
  semibold: 'OpenSans_600SemiBold',
  bold: 'OpenSans_700Bold',
  heavy: 'OpenSans_800ExtraBold',
}
