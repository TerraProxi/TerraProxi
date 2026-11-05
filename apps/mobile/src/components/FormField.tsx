import { View, Text, TextInput, StyleSheet, type TextInputProps } from 'react-native'
import { Colors, Fonts, MIN_TOUCH_TARGET, Radius } from '../theme'

interface FormFieldProps extends Omit<TextInputProps, 'style'> {
  label: string
}

/** Champ de formulaire libellé (le libellé sert aussi de nom accessible). */
export function FormField({ label, ...inputProps }: FormFieldProps) {
  return (
    <View style={styles.field}>
      <Text style={styles.label}>{label}</Text>
      <TextInput
        style={styles.input}
        accessibilityLabel={label}
        placeholderTextColor={Colors.gray600}
        {...inputProps}
      />
    </View>
  )
}

const styles = StyleSheet.create({
  field: { marginBottom: 16 },
  label: { fontFamily: Fonts.semibold, marginBottom: 6, color: Colors.dark, fontSize: 14 },
  input: {
    minHeight: MIN_TOUCH_TARGET,
    backgroundColor: Colors.white,
    borderWidth: 1.5,
    borderColor: Colors.border,
    borderRadius: Radius.sm,
    paddingHorizontal: 14,
    paddingVertical: 10,
    fontSize: 16,
    fontFamily: Fonts.regular,
    color: Colors.dark,
  },
})
