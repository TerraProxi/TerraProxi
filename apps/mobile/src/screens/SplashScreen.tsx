import { useEffect, useRef } from 'react'
import { View, Text, StyleSheet, Animated } from 'react-native'
import { MaterialCommunityIcons } from '@expo/vector-icons'
import { useNavigation } from '@react-navigation/native'
import type { StackNavigationProp } from '@react-navigation/stack'
import type { RootStackParamList } from '../navigation/RootNavigator'
import { Colors } from '../theme'

type Nav = StackNavigationProp<RootStackParamList>

export function SplashScreen() {
  const nav = useNavigation<Nav>()
  const dot1 = useRef(new Animated.Value(0)).current
  const dot2 = useRef(new Animated.Value(0)).current
  const dot3 = useRef(new Animated.Value(0)).current

  useEffect(() => {
    const bounce = (dot: Animated.Value, delay: number) =>
      Animated.loop(
        Animated.sequence([
          Animated.delay(delay),
          Animated.timing(dot, { toValue: -14, duration: 300, useNativeDriver: true }),
          Animated.timing(dot, { toValue: 0, duration: 300, useNativeDriver: true }),
          Animated.delay(350),
        ])
      )

    const anim = Animated.parallel([
      bounce(dot1, 0),
      bounce(dot2, 150),
      bounce(dot3, 300),
    ])
    anim.start()

    const timer = setTimeout(() => {
      nav.navigate('Onboarding')
    }, 3000)

    return () => {
      anim.stop()
      clearTimeout(timer)
    }
  }, [])

  return (
    <View style={styles.container}>
      <View style={styles.logoCircle}>
        <MaterialCommunityIcons name="leaf" size={64} color={Colors.white} />
      </View>
      <Text style={styles.titleLine1}>Du producteur à</Text>
      <Text style={styles.titleLine2}>votre porte</Text>
      <View style={styles.dotsRow}>
        <Animated.View style={[styles.dot, { transform: [{ translateY: dot1 }] }]} />
        <Animated.View style={[styles.dot, { transform: [{ translateY: dot2 }] }]} />
        <Animated.View style={[styles.dot, { transform: [{ translateY: dot3 }] }]} />
      </View>
      <View style={styles.bioRow}>
        <MaterialCommunityIcons name="leaf-circle" size={18} color={Colors.primary} />
        <Text style={styles.bioText}>100% Local & Bio</Text>
      </View>
    </View>
  )
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.white,
    alignItems: 'center',
    justifyContent: 'center',
    paddingBottom: 80,
  },
  logoCircle: {
    width: 128,
    height: 128,
    borderRadius: 64,
    backgroundColor: Colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 28,
    shadowColor: Colors.primary,
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.35,
    shadowRadius: 20,
    elevation: 10,
  },
  titleLine1: {
    fontSize: 26,
    fontWeight: '700',
    color: Colors.dark,
    marginBottom: 4,
  },
  titleLine2: {
    fontSize: 32,
    fontWeight: '800',
    color: Colors.primary,
    marginBottom: 40,
  },
  dotsRow: {
    flexDirection: 'row',
    marginBottom: 28,
  },
  dot: {
    width: 12,
    height: 12,
    borderRadius: 6,
    backgroundColor: Colors.primary,
    marginHorizontal: 8,
  },
  bioRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: Colors.primaryLight,
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
  },
  bioText: {
    fontSize: 15,
    fontWeight: '700',
    color: Colors.primary,
  },
})
