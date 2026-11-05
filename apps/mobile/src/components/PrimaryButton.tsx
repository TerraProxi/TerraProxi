import { TouchableOpacity, Text, ActivityIndicator, StyleSheet, type StyleProp, type ViewStyle } from 'react-native'
import { Colors, Fonts, MIN_TOUCH_TARGET, Radius } from '../theme'

interface PrimaryButtonProps {
  label: string
  onPress: () => void
  isLoading?: boolean
  disabled?: boolean
  variant?: 'filled' | 'outline' | 'danger'
  style?: StyleProp<ViewStyle>
}

/** Bouton d'action principal : états désactivé et chargement, contraste AA. */
export function PrimaryButton({
  label, onPress, isLoading = false, disabled = false, variant = 'filled', style,
}: PrimaryButtonProps) {
  const isDisabled = disabled || isLoading
  const isFilled = variant === 'filled'
  return (
    <TouchableOpacity
      onPress={onPress}
      disabled={isDisabled}
      style={[styles.base, styles[variant], isDisabled && styles.disabled, style]}
      accessibilityRole="button"
      accessibilityLabel={label}
      accessibilityState={{ disabled: isDisabled, busy: isLoading }}
      activeOpacity={0.8}
    >
      {isLoading ? (
        <ActivityIndicator color={isFilled ? Colors.white : Colors.primaryDark} />
      ) : (
        <Text style={[styles.text, !isFilled && styles.textOutline, variant === 'danger' && styles.textDanger]}>
          {label}
        </Text>
      )}
    </TouchableOpacity>
  )
}

const styles = StyleSheet.create({
  base: {
    minHeight: MIN_TOUCH_TARGET + 4,
    borderRadius: Radius.md,
    paddingHorizontal: 20,
    paddingVertical: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  filled: { backgroundColor: Colors.primaryDark },
  outline: { borderWidth: 2, borderColor: Colors.primaryDark, backgroundColor: Colors.white },
  danger: { backgroundColor: Colors.red50 },
  disabled: { opacity: 0.55 },
  text: { color: Colors.white, fontFamily: Fonts.bold, fontSize: 16 },
  textOutline: { color: Colors.primaryDark },
  textDanger: { color: Colors.danger },
})
