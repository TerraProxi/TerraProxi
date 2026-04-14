import { useState, useEffect, useRef } from 'react'
import {
  View, Text, TouchableOpacity, StyleSheet, Animated, ActivityIndicator,
} from 'react-native'
import { MaterialCommunityIcons } from '@expo/vector-icons'
import { useNavigation } from '@react-navigation/native'
import type { StackNavigationProp } from '@react-navigation/stack'
import type { RootStackParamList } from '../navigation/RootNavigator'
import { Colors } from '../theme'

type Nav = StackNavigationProp<RootStackParamList>

interface ScanResult {
  name: string
  brand: string
  image: string
  nutriScore: string
  ecoScore: string
  score: number
  scoreLabel: string
  origin: string
  distance: number
  isLocal: boolean
  impact: string
  alternatives: {
    name: string
    producer: string
    distance: number
    score: number
    image: string
  }[]
}

const MOCK_RESULT: ScanResult = {
  name: 'Tomates Grappe Bio',
  brand: 'Prince de Bretagne',
  image: 'https://images.unsplash.com/photo-1592394933325-10eb4440533b?q=80&w=600',
  nutriScore: 'A',
  ecoScore: 'B',
  score: 72,
  scoreLabel: 'Bon',
  origin: 'Bretagne, France',
  distance: 485,
  isLocal: false,
  impact: '2.3 kg CO₂',
  alternatives: [
    {
      name: 'Tomates Grappe Bio',
      producer: 'Ferme des Garrigues',
      distance: 2.5,
      score: 94,
      image: 'https://images.unsplash.com/photo-1592394933325-10eb4440533b?q=80&w=600',
    },
    {
      name: 'Tomates Anciennes',
      producer: 'Maraîcher du Lac',
      distance: 45,
      score: 82,
      image: 'https://images.unsplash.com/photo-1540420773420-3366772f4999?q=80&w=600',
    },
  ],
}

const NUTRI_COLORS: Record<string, string> = {
  A: '#22C55E', B: '#84CC16', C: '#EAB308', D: '#F97316', E: '#EF4444',
}

function CornerBracket({ position }: { position: 'topLeft' | 'topRight' | 'bottomLeft' | 'bottomRight' }) {
  const size = 32
  const thickness = 3
  const isTop = position.startsWith('top')
  const isLeft = position.endsWith('Left')
  return (
    <View style={{ width: size, height: size, position: 'absolute', ...(isTop ? { top: 0 } : { bottom: 0 }), ...(isLeft ? { left: 0 } : { right: 0 }) }}>
      <View style={{ position: 'absolute', ...(isTop ? { top: 0 } : { bottom: 0 }), left: isLeft ? 0 : undefined, right: isLeft ? undefined : 0, width: size, height: thickness, backgroundColor: Colors.primary, ...(isLeft ? { borderTopRightRadius: 0 } : { borderTopLeftRadius: 0 }), ...(isLeft ? { borderBottomRightRadius: 0 } : { borderBottomLeftRadius: 0 }) }} />
      <View style={{ position: 'absolute', ...(isLeft ? { left: 0 } : { right: 0 }), top: isTop ? 0 : undefined, bottom: isTop ? undefined : 0, height: size, width: thickness, backgroundColor: Colors.primary }} />
    </View>
  )
}

function IdleState({ onScan }: { onScan: () => void }) {
  const nav = useNavigation<Nav>()
  const scanLineY = useRef(new Animated.Value(0)).current
  const pulseScale = useRef(new Animated.Value(1)).current

  useEffect(() => {
    Animated.loop(
      Animated.sequence([
        Animated.timing(scanLineY, { toValue: 1, duration: 2000, useNativeDriver: true }),
        Animated.timing(scanLineY, { toValue: 0, duration: 2000, useNativeDriver: true }),
      ]),
    ).start()
  }, [scanLineY])

  useEffect(() => {
    Animated.loop(
      Animated.sequence([
        Animated.timing(pulseScale, { toValue: 1.15, duration: 800, useNativeDriver: true }),
        Animated.timing(pulseScale, { toValue: 1, duration: 800, useNativeDriver: true }),
      ]),
    ).start()
  }, [pulseScale])

  const scanLineTranslate = scanLineY.interpolate({
    inputRange: [0, 1],
    outputRange: [0, 224],
  })

  return (
    <View style={idleStyles.container}>
      <View style={idleStyles.header}>
        <TouchableOpacity onPress={nav.goBack} style={idleStyles.iconBtn}>
          <MaterialCommunityIcons name="arrow-left" size={24} color={Colors.white} />
        </TouchableOpacity>
        <Text style={idleStyles.title}>Scanner</Text>
        <TouchableOpacity style={idleStyles.iconBtn}>
          <MaterialCommunityIcons name="flash" size={24} color={Colors.white} />
        </TouchableOpacity>
      </View>

      <View style={idleStyles.center}>
        <View style={idleStyles.scanFrame}>
          <CornerBracket position="topLeft" />
          <CornerBracket position="topRight" />
          <CornerBracket position="bottomLeft" />
          <CornerBracket position="bottomRight" />
          <Animated.View style={[idleStyles.scanLine, { transform: [{ translateY: scanLineTranslate }] }]} />
        </View>
        <Text style={idleStyles.hint}>Placez le code-barres dans le cadre</Text>
      </View>

      <View style={idleStyles.bottom}>
        <View style={idleStyles.pillRow}>
          <TouchableOpacity style={idleStyles.pill}>
            <MaterialCommunityIcons name="history" size={18} color={Colors.white} />
            <Text style={idleStyles.pillText}>Historique</Text>
          </TouchableOpacity>
          <TouchableOpacity style={idleStyles.pill}>
            <MaterialCommunityIcons name="image-outline" size={18} color={Colors.white} />
            <Text style={idleStyles.pillText}>Galerie</Text>
          </TouchableOpacity>
        </View>

        <Animated.View style={{ transform: [{ scale: pulseScale }] }}>
          <TouchableOpacity onPress={onScan} style={idleStyles.scanBtn}>
            <MaterialCommunityIcons name="qrcode-scan" size={32} color={Colors.white} />
          </TouchableOpacity>
        </Animated.View>
      </View>
    </View>
  )
}

function ScanningOverlay() {
  return (
    <View style={scanningStyles.container}>
      <ActivityIndicator size="large" color={Colors.primary} />
      <Text style={scanningStyles.text}>Analyse en cours...</Text>
    </View>
  )
}

function ResultState({ result, onClose }: { result: ScanResult; onClose: () => void }) {
  const scoreColor = result.score >= 80 ? Colors.green500 : result.score >= 60 ? Colors.warning : Colors.orange500
  const scoreBgColor = result.score >= 80 ? Colors.green50 : result.score >= 60 ? Colors.yellow50 : Colors.orange50
  const distanceColor = result.isLocal ? Colors.green700 : Colors.orange500

  return (
    <View style={resultStyles.container}>
      <View style={resultStyles.closeRow}>
        <TouchableOpacity onPress={onClose} style={resultStyles.closeBtn}>
          <MaterialCommunityIcons name="close" size={24} color={Colors.dark} />
        </TouchableOpacity>
      </View>

      <View style={resultStyles.productCard}>
        <View style={resultStyles.productImageWrap}>
          <MaterialCommunityIcons name="image" size={40} color={Colors.gray300} />
        </View>
        <View style={resultStyles.productInfo}>
          <Text style={resultStyles.productName}>{result.name}</Text>
          <Text style={resultStyles.productBrand}>{result.brand}</Text>
          <View style={resultStyles.badgeRow}>
            <View style={[resultStyles.scoreBadge, { backgroundColor: NUTRI_COLORS[result.nutriScore] }]}>
              <Text style={resultStyles.scoreBadgeLetter}>{result.nutriScore}</Text>
            </View>
            <View style={[resultStyles.scoreBadge, { backgroundColor: Colors.accent }]}>
              <Text style={resultStyles.scoreBadgeLetter}>{result.ecoScore}</Text>
            </View>
          </View>
        </View>
      </View>

      <View style={[resultStyles.scoreCard, { backgroundColor: scoreBgColor }]}>
        <View style={resultStyles.circularScore}>
          <View style={[resultStyles.circularTrack, { borderColor: scoreColor }]}>
            <Text style={[resultStyles.circularNumber, { color: scoreColor }]}>{result.score}</Text>
          </View>
        </View>
        <View style={resultStyles.scoreTextWrap}>
          <Text style={resultStyles.scoreLabel}>{result.scoreLabel}</Text>
          <Text style={resultStyles.scoreSub}>Score de proximité</Text>
        </View>
      </View>

      <View style={resultStyles.detailsCard}>
        <View style={resultStyles.detailRow}>
          <View style={resultStyles.detailLeft}>
            <MaterialCommunityIcons name="map-marker" size={20} color={distanceColor} />
            <View style={resultStyles.detailTextWrap}>
              <Text style={resultStyles.detailLabel}>Origine</Text>
              <Text style={resultStyles.detailValue}>{result.origin}</Text>
            </View>
          </View>
          <View style={[resultStyles.distanceBadge, { backgroundColor: result.isLocal ? Colors.green50 : Colors.orange50 }]}>
            <Text style={{ color: distanceColor, fontWeight: '700', fontSize: 13 }}>{result.distance} km</Text>
          </View>
        </View>
        <View style={resultStyles.detailSeparator} />
        <View style={resultStyles.detailRow}>
          <View style={resultStyles.detailLeft}>
            <MaterialCommunityIcons name="leaf" size={20} color={Colors.green500} />
            <View style={resultStyles.detailTextWrap}>
              <Text style={resultStyles.detailLabel}>Impact carbone</Text>
              <Text style={resultStyles.detailValue}>{result.impact}</Text>
            </View>
          </View>
        </View>
      </View>

      <View style={resultStyles.alternativesSection}>
        <Text style={resultStyles.sectionTitle}>Alternatives Locales</Text>
        {result.alternatives.map((alt, i) => (
          <View key={i} style={resultStyles.altCard}>
            <View style={resultStyles.altImageWrap}>
              <MaterialCommunityIcons name="image" size={24} color={Colors.gray300} />
            </View>
            <View style={resultStyles.altInfo}>
              <Text style={resultStyles.altName}>{alt.name}</Text>
              <Text style={resultStyles.altProducer}>{alt.producer}</Text>
              <Text style={resultStyles.altDistance}>{alt.distance} km</Text>
            </View>
            <View style={resultStyles.altScoreWrap}>
              <View style={[resultStyles.altScoreCircle, { borderColor: alt.score >= 80 ? Colors.green500 : Colors.warning }]}>
                <Text style={{ fontSize: 14, fontWeight: '800', color: alt.score >= 80 ? Colors.green700 : Colors.warning }}>{alt.score}</Text>
              </View>
            </View>
          </View>
        ))}
      </View>

      <View style={resultStyles.bottomActions}>
        <TouchableOpacity style={resultStyles.findBtn}>
          <Text style={resultStyles.findBtnText}>Trouver ce produit</Text>
        </TouchableOpacity>
        <TouchableOpacity style={resultStyles.shareBtn}>
          <MaterialCommunityIcons name="share-variant" size={22} color={Colors.primary} />
        </TouchableOpacity>
      </View>
    </View>
  )
}

export function ScanScreen() {
  const [isScanning, setIsScanning] = useState(false)
  const [scanResult, setScanResult] = useState<ScanResult | null>(null)
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  const handleScan = () => {
    setIsScanning(true)
    setScanResult(null)
    timerRef.current = setTimeout(() => {
      setIsScanning(false)
      setScanResult(MOCK_RESULT)
    }, 2000)
  }

  const handleClose = () => {
    setScanResult(null)
    if (timerRef.current) clearTimeout(timerRef.current)
  }

  useEffect(() => {
    return () => { if (timerRef.current) clearTimeout(timerRef.current) }
  }, [])

  if (scanResult) {
    return <ResultState result={scanResult} onClose={handleClose} />
  }

  if (isScanning) {
    return <ScanningOverlay />
  }

  return <IdleState onScan={handleScan} />
}

const idleStyles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.gray900 },
  header: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    paddingHorizontal: 20, paddingTop: 56, paddingBottom: 16,
  },
  iconBtn: { width: 44, height: 44, borderRadius: 22, backgroundColor: 'rgba(255,255,255,0.1)', justifyContent: 'center', alignItems: 'center' },
  title: { fontSize: 20, fontWeight: '700', color: Colors.white },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  scanFrame: { width: 256, height: 256, position: 'relative' },
  scanLine: { position: 'absolute', left: 8, right: 8, height: 2, backgroundColor: Colors.primary, borderRadius: 1 },
  hint: { color: Colors.gray400, fontSize: 14, marginTop: 24 },
  bottom: { alignItems: 'center', paddingBottom: 48, gap: 20 },
  pillRow: { flexDirection: 'row', gap: 12 },
  pill: {
    flexDirection: 'row', alignItems: 'center', gap: 6,
    backgroundColor: 'rgba(255,255,255,0.1)', borderRadius: 20,
    paddingHorizontal: 16, paddingVertical: 10,
  },
  pillText: { color: Colors.white, fontSize: 14, fontWeight: '500' },
  scanBtn: {
    width: 80, height: 80, borderRadius: 40, backgroundColor: Colors.primary,
    justifyContent: 'center', alignItems: 'center',
    shadowColor: Colors.primary, shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.4, shadowRadius: 12, elevation: 8,
  },
})

const scanningStyles = StyleSheet.create({
  container: {
    flex: 1, backgroundColor: 'rgba(0,0,0,0.85)',
    justifyContent: 'center', alignItems: 'center', gap: 16,
  },
  text: { color: Colors.white, fontSize: 18, fontWeight: '600' },
})

const resultStyles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.white },
  closeRow: { paddingTop: 56, paddingHorizontal: 20, paddingBottom: 8 },
  closeBtn: { width: 40, height: 40, borderRadius: 20, backgroundColor: Colors.gray100, justifyContent: 'center', alignItems: 'center' },
  productCard: {
    flexDirection: 'row', marginHorizontal: 20, backgroundColor: Colors.gray50,
    borderRadius: 16, padding: 16, gap: 14, alignItems: 'center',
    shadowColor: '#000', shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.06, shadowRadius: 4, elevation: 2,
  },
  productImageWrap: {
    width: 96, height: 96, borderRadius: 16, backgroundColor: Colors.gray200,
    justifyContent: 'center', alignItems: 'center',
  },
  productInfo: { flex: 1, gap: 4 },
  productName: { fontSize: 18, fontWeight: '700', color: Colors.dark },
  productBrand: { fontSize: 14, color: Colors.gray600 },
  badgeRow: { flexDirection: 'row', gap: 8, marginTop: 4 },
  scoreBadge: { width: 28, height: 28, borderRadius: 8, justifyContent: 'center', alignItems: 'center' },
  scoreBadgeLetter: { color: Colors.white, fontSize: 14, fontWeight: '800' },
  scoreCard: {
    marginHorizontal: 20, marginTop: 16, borderRadius: 16, padding: 20,
    flexDirection: 'row', alignItems: 'center', gap: 16,
  },
  circularScore: { width: 80, height: 80, justifyContent: 'center', alignItems: 'center' },
  circularTrack: {
    width: 72, height: 72, borderRadius: 36,
    borderWidth: 6, justifyContent: 'center', alignItems: 'center',
  },
  circularNumber: { fontSize: 24, fontWeight: '800' },
  scoreTextWrap: { flex: 1, gap: 2 },
  scoreLabel: { fontSize: 20, fontWeight: '700', color: Colors.dark },
  scoreSub: { fontSize: 13, color: Colors.gray600 },
  detailsCard: {
    marginHorizontal: 20, marginTop: 16, backgroundColor: Colors.gray50,
    borderRadius: 16, padding: 16,
  },
  detailRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  detailLeft: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  detailTextWrap: { gap: 2 },
  detailLabel: { fontSize: 13, color: Colors.gray600 },
  detailValue: { fontSize: 15, fontWeight: '600', color: Colors.dark },
  distanceBadge: { borderRadius: 12, paddingHorizontal: 12, paddingVertical: 4 },
  detailSeparator: { height: 1, backgroundColor: Colors.gray200, marginVertical: 12 },
  alternativesSection: { marginHorizontal: 20, marginTop: 20, marginBottom: 100 },
  sectionTitle: { fontSize: 18, fontWeight: '700', color: Colors.dark, marginBottom: 12 },
  altCard: {
    flexDirection: 'row', alignItems: 'center', backgroundColor: Colors.gray50,
    borderRadius: 12, padding: 12, gap: 12, marginBottom: 10,
  },
  altImageWrap: { width: 48, height: 48, borderRadius: 12, backgroundColor: Colors.gray200, justifyContent: 'center', alignItems: 'center' },
  altInfo: { flex: 1, gap: 2 },
  altName: { fontSize: 14, fontWeight: '600', color: Colors.dark },
  altProducer: { fontSize: 12, color: Colors.gray600 },
  altDistance: { fontSize: 12, color: Colors.primary, fontWeight: '600' },
  altScoreWrap: { justifyContent: 'center', alignItems: 'center' },
  altScoreCircle: { width: 40, height: 40, borderRadius: 20, borderWidth: 3, justifyContent: 'center', alignItems: 'center' },
  bottomActions: {
    position: 'absolute', bottom: 0, left: 0, right: 0,
    flexDirection: 'row', alignItems: 'center', gap: 12,
    paddingHorizontal: 20, paddingVertical: 16, paddingBottom: 36,
    backgroundColor: Colors.white, borderTopWidth: 1, borderTopColor: Colors.gray200,
  },
  findBtn: {
    flex: 1, backgroundColor: Colors.primary, borderRadius: 14,
    paddingVertical: 16, alignItems: 'center',
    shadowColor: Colors.primary, shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.3, shadowRadius: 8, elevation: 4,
  },
  findBtnText: { color: Colors.white, fontSize: 16, fontWeight: '700' },
  shareBtn: {
    width: 52, height: 52, borderRadius: 14, backgroundColor: Colors.primaryLight,
    justifyContent: 'center', alignItems: 'center',
  },
})
