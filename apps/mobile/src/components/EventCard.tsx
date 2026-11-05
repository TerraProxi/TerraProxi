import { View, Text, TouchableOpacity, StyleSheet, type StyleProp, type ViewStyle } from 'react-native'
import { MaterialCommunityIcons } from '@expo/vector-icons'
import type { ProducerEvent } from '../types/catalog'
import { Colors, Fonts, Radius, Spacing } from '../theme'

const time = (date: Date) => date.toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' })
const day = (date: Date) => date.toLocaleDateString('fr-FR', { weekday: 'long', day: 'numeric', month: 'long' })

/** « samedi 12 avril · 09:00 – 13:00 », ou « … jusqu'au dimanche 13 avril 18:00 » sur plusieurs jours. */
export function formatEventSchedule(event: Pick<ProducerEvent, 'starts_at' | 'ends_at'>): string {
  const start = new Date(event.starts_at)
  const label = `${day(start)} · ${time(start)}`
  if (!event.ends_at) return label
  const end = new Date(event.ends_at)
  if (end.toDateString() === start.toDateString()) return `${label} – ${time(end)}`
  return `${label}, jusqu'au ${day(end)} ${time(end)}`
}

interface EventCardProps {
  event: ProducerEvent
  /** Affiche le nom du producteur (agenda de proximité) ; inutile sur sa propre fiche. */
  showProducer?: boolean
  onPress?: () => void
  style?: StyleProp<ViewStyle>
}

export function EventCard({ event, showProducer = false, onPress, style }: EventCardProps) {
  const schedule = formatEventSchedule(event)
  const place = event.location ?? event.producer_city
  const content = (
    <>
      <View style={styles.dateRow}>
        <MaterialCommunityIcons name="calendar-clock" size={18} color={Colors.primaryDark} />
        <Text style={styles.schedule}>{schedule}</Text>
      </View>
      <Text style={styles.title}>{event.title}</Text>
      {showProducer && <Text style={styles.producer}>{event.producer_name}</Text>}
      {place ? (
        <View style={styles.placeRow}>
          <MaterialCommunityIcons name="map-marker-outline" size={16} color={Colors.gray700} />
          <Text style={styles.place}>{place}</Text>
        </View>
      ) : null}
      {event.description ? <Text style={styles.description} numberOfLines={3}>{event.description}</Text> : null}
    </>
  )
  const accessibilityLabel = [event.title, showProducer ? event.producer_name : null, schedule, place].filter(Boolean).join(', ')

  if (!onPress) {
    return <View style={[styles.card, style]} accessible accessibilityLabel={accessibilityLabel}>{content}</View>
  }
  return (
    <TouchableOpacity
      style={[styles.card, style]}
      onPress={onPress}
      accessibilityRole="button"
      accessibilityLabel={accessibilityLabel}
      accessibilityHint="Ouvre la fiche du producteur"
    >
      {content}
    </TouchableOpacity>
  )
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: Colors.white,
    borderRadius: Radius.lg,
    borderWidth: 1,
    borderColor: Colors.gray200,
    padding: Spacing.md,
    gap: 4,
  },
  dateRow: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  schedule: { flex: 1, fontFamily: Fonts.semibold, fontSize: 13, color: Colors.primaryDark },
  title: { fontFamily: Fonts.bold, fontSize: 15, color: Colors.dark },
  producer: { fontFamily: Fonts.medium, fontSize: 13, color: Colors.gray700 },
  placeRow: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  place: { flex: 1, fontFamily: Fonts.regular, fontSize: 13, color: Colors.gray700 },
  description: { fontFamily: Fonts.regular, fontSize: 13, color: Colors.gray700, marginTop: 2 },
})
