import { View, Image, StyleSheet, type StyleProp, type ImageStyle } from 'react-native'
import { MaterialCommunityIcons } from '@expo/vector-icons'
import { Colors } from '../theme'

interface ProductImageProps {
  uri?: string | null
  style: StyleProp<ImageStyle>
  iconSize?: number
}

/** Photo du produit, ou pictogramme neutre quand le producteur n'en a pas fourni. */
export function ProductImage({ uri, style, iconSize = 28 }: ProductImageProps) {
  if (uri) return <Image source={{ uri }} style={style} accessibilityIgnoresInvertColors />
  return (
    <View style={[styles.placeholder, style]}>
      <MaterialCommunityIcons name="basket-outline" size={iconSize} color={Colors.gray400} />
    </View>
  )
}

const styles = StyleSheet.create({
  placeholder: { backgroundColor: Colors.gray100, alignItems: 'center', justifyContent: 'center' },
})
