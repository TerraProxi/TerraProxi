import { useState } from 'react'
import { Pressable, StyleSheet, Text, View } from 'react-native'
import { MaterialCommunityIcons } from '@expo/vector-icons'
import { Colors, Radius, Spacing } from '../theme'

export interface ProductPick {
  product_id: string
  name: string
  short_label: string
  price: number
  unit: string
  producer_id: string
  producer_name: string
  quantity_options: number[]
}

interface ProductPickListProps {
  picks: ProductPick[]
  disabled?: boolean
  onAdd: (pick: ProductPick, quantity: number) => void
}

export function ProductPickList({ picks, disabled = false, onAdd }: ProductPickListProps) {
  const [addedKeys, setAddedKeys] = useState<Set<string>>(new Set())

  if (picks.length === 0) return null

  const handleAdd = (pick: ProductPick, quantity: number) => {
    if (disabled) return
    onAdd(pick, quantity)
    setAddedKeys((prev) => new Set(prev).add(`${pick.product_id}-${quantity}`))
  }

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Ajouter au panier</Text>
      {picks.map((pick) => (
        <View key={pick.product_id} style={styles.card}>
          <View style={styles.cardHeader}>
            <View style={styles.cardInfo}>
              <Text style={styles.label} numberOfLines={1}>{pick.short_label}</Text>
              <Text style={styles.meta} numberOfLines={1}>
                {pick.price.toFixed(2)} €/{pick.unit} · {pick.producer_name}
              </Text>
            </View>
          </View>
          <View style={styles.qtyRow}>
            {pick.quantity_options.map((qty) => {
              const key = `${pick.product_id}-${qty}`
              const isAdded = addedKeys.has(key)
              return (
                <Pressable
                  key={key}
                  disabled={disabled || isAdded}
                  onPress={() => handleAdd(pick, qty)}
                  style={({ pressed }) => [
                    styles.qtyBtn,
                    isAdded && styles.qtyBtnAdded,
                    pressed && !disabled && !isAdded && styles.qtyBtnPressed,
                  ]}
                >
                  {isAdded ? (
                    <MaterialCommunityIcons name="check" size={16} color={Colors.green700} />
                  ) : (
                    <Text style={styles.qtyBtnText}>× {qty}</Text>
                  )}
                </Pressable>
              )
            })}
          </View>
        </View>
      ))}
    </View>
  )
}

const styles = StyleSheet.create({
  container: {
    marginTop: Spacing.sm,
    gap: Spacing.sm,
  },
  title: {
    fontSize: 12,
    fontWeight: '700',
    color: Colors.gray600,
    textTransform: 'uppercase',
    letterSpacing: 0.4,
  },
  card: {
    backgroundColor: Colors.white,
    borderRadius: Radius.md,
    borderWidth: 1,
    borderColor: Colors.border,
    padding: Spacing.md,
    gap: Spacing.sm,
  },
  cardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  cardInfo: {
    flex: 1,
    gap: 2,
  },
  label: {
    fontSize: 15,
    fontWeight: '700',
    color: Colors.dark,
  },
  meta: {
    fontSize: 12,
    color: Colors.gray500,
  },
  qtyRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: Spacing.sm,
  },
  qtyBtn: {
    minWidth: 56,
    paddingHorizontal: Spacing.md,
    paddingVertical: 10,
    borderRadius: Radius.sm,
    backgroundColor: Colors.primaryLight,
    borderWidth: 1.5,
    borderColor: Colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
  },
  qtyBtnPressed: {
    backgroundColor: Colors.primary,
  },
  qtyBtnAdded: {
    backgroundColor: Colors.green50,
    borderColor: Colors.green700,
  },
  qtyBtnText: {
    fontSize: 14,
    fontWeight: '700',
    color: Colors.primaryDark,
  },
})
