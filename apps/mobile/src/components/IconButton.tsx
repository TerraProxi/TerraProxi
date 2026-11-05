import type { ComponentProps } from 'react'
import { TouchableOpacity, StyleSheet, type StyleProp, type ViewStyle } from 'react-native'
import { MaterialCommunityIcons } from '@expo/vector-icons'
import { Colors, MIN_TOUCH_TARGET } from '../theme'

export type IconName = ComponentProps<typeof MaterialCommunityIcons>['name']

interface IconButtonProps {
  icon: IconName
  /** Lu par les lecteurs d'écran : le bouton n'a pas de texte visible. */
  label: string
  onPress: () => void
  color?: string
  size?: number
  style?: StyleProp<ViewStyle>
  disabled?: boolean
  /** Pour les boutons bascule (favori…). */
  selected?: boolean
}

/** Bouton icône accessible : libellé, rôle, état et cible tactile d'au moins 44 × 44. */
export function IconButton({
  icon, label, onPress, color = Colors.dark, size = 22, style, disabled = false, selected,
}: IconButtonProps) {
  return (
    <TouchableOpacity
      onPress={onPress}
      disabled={disabled}
      style={[styles.button, style]}
      accessibilityRole="button"
      accessibilityLabel={label}
      accessibilityState={{ disabled, selected }}
      activeOpacity={0.7}
    >
      <MaterialCommunityIcons name={icon} size={size} color={color} />
    </TouchableOpacity>
  )
}

const styles = StyleSheet.create({
  button: {
    minWidth: MIN_TOUCH_TARGET,
    minHeight: MIN_TOUCH_TARGET,
    alignItems: 'center',
    justifyContent: 'center',
  },
})
