import { View, Text, ActivityIndicator, StyleSheet } from 'react-native'
import { MaterialCommunityIcons } from '@expo/vector-icons'
import { Colors, Fonts, Spacing } from '../theme'
import { PrimaryButton } from './PrimaryButton'
import type { IconName } from './IconButton'

export function LoadingState() {
  return (
    <View style={styles.center} accessibilityRole="progressbar" accessibilityLabel="Chargement">
      <ActivityIndicator size="large" color={Colors.primaryDark} />
    </View>
  )
}

interface MessageStateProps {
  icon: IconName
  title: string
  message?: string
  actionLabel?: string
  onAction?: () => void
}

/** État vide ou d'erreur, avec une action pour en sortir. */
export function MessageState({ icon, title, message, actionLabel, onAction }: MessageStateProps) {
  return (
    <View style={styles.center}>
      <MaterialCommunityIcons name={icon} size={56} color={Colors.gray400} />
      <Text style={styles.title} accessibilityRole="header">{title}</Text>
      {message ? <Text style={styles.message}>{message}</Text> : null}
      {actionLabel && onAction ? (
        <PrimaryButton label={actionLabel} onPress={onAction} style={styles.action} />
      ) : null}
    </View>
  )
}

const styles = StyleSheet.create({
  center: { flexGrow: 1, alignItems: 'center', justifyContent: 'center', padding: Spacing.xxxl },
  title: { fontFamily: Fonts.title, fontSize: 18, color: Colors.dark, marginTop: Spacing.lg, textAlign: 'center' },
  message: { fontFamily: Fonts.regular, fontSize: 14, color: Colors.gray700, marginTop: Spacing.sm, textAlign: 'center' },
  action: { marginTop: Spacing.xl, alignSelf: 'stretch' },
})
