import { useEffect, useRef } from 'react'
import {
  Animated,
  Pressable,
  StyleSheet,
  Text,
  View,
} from 'react-native'
import { MaterialCommunityIcons } from '@expo/vector-icons'
import { ChatMessageText } from './ChatMessageText'
import { ProductPickList, type ProductPick } from './ProductPickList'
import { useTypewriter } from '../hooks/useTypewriter'
import { Colors, Radius, Spacing } from '../theme'

interface ProducerLink {
  producer_id: string
  company_name: string
  reason: string
  city?: string
}

interface AssistantReplyBubbleProps {
  text: string
  animate: boolean
  producerLinks?: ProducerLink[]
  productPicks?: ProductPick[]
  quickReplies?: string[]
  cartFeedback?: string[]
  isInteractionDisabled?: boolean
  onAnimationComplete?: () => void
  onScrollRequest?: () => void
  onOpenProducer: (producerId: string) => void
  onQuickReply?: (text: string) => void
  onProductPickAdd?: (pick: ProductPick, quantity: number) => void
}

export function AssistantReplyBubble({
  text,
  animate,
  producerLinks = [],
  productPicks = [],
  quickReplies = [],
  cartFeedback = [],
  isInteractionDisabled = false,
  onAnimationComplete,
  onScrollRequest,
  onOpenProducer,
  onQuickReply,
  onProductPickAdd,
}: AssistantReplyBubbleProps) {
  const cursorOpacity = useRef(new Animated.Value(1)).current
  const extrasOpacity = useRef(new Animated.Value(animate ? 0 : 1)).current
  const extrasTranslateY = useRef(new Animated.Value(animate ? 8 : 0)).current

  const { visibleText, isComplete, isTyping, skip } = useTypewriter(text, {
    enabled: animate,
    onComplete: onAnimationComplete,
    onTick: onScrollRequest,
  })

  const showExtras = isComplete
  const hasExtras = producerLinks.length > 0
    || productPicks.length > 0
    || quickReplies.length > 0
    || cartFeedback.length > 0

  useEffect(() => {
    if (!isTyping) {
      cursorOpacity.setValue(0)
      return
    }

    const blink = Animated.loop(
      Animated.sequence([
        Animated.timing(cursorOpacity, {
          toValue: 0.15,
          duration: 420,
          useNativeDriver: true,
        }),
        Animated.timing(cursorOpacity, {
          toValue: 1,
          duration: 420,
          useNativeDriver: true,
        }),
      ]),
    )
    blink.start()
    return () => blink.stop()
  }, [isTyping, cursorOpacity])

  useEffect(() => {
    if (!showExtras || !hasExtras) return

    Animated.parallel([
      Animated.timing(extrasOpacity, {
        toValue: 1,
        duration: 380,
        useNativeDriver: true,
      }),
      Animated.spring(extrasTranslateY, {
        toValue: 0,
        friction: 8,
        tension: 80,
        useNativeDriver: true,
      }),
    ]).start()
  }, [showExtras, hasExtras, extrasOpacity, extrasTranslateY])

  return (
    <View style={styles.messageBlock}>
      <View style={styles.assistantAvatar}>
        <MaterialCommunityIcons name="robot-outline" size={16} color={Colors.primary} />
      </View>
      <View style={styles.assistantContent}>
        <Pressable
          onPress={isTyping ? skip : undefined}
          style={({ pressed }) => [
            styles.bubble,
            styles.assistantBubble,
            isTyping && pressed && styles.bubblePressed,
          ]}
          accessibilityHint={isTyping ? 'Appuyez pour afficher toute la réponse' : undefined}
        >
          <View style={styles.textRow}>
            <ChatMessageText
              text={visibleText}
              style={styles.bubbleText}
              boldStyle={styles.assistantBubbleBold}
            />
            {isTyping ? (
              <Animated.Text style={[styles.cursor, { opacity: cursorOpacity }]}>
                |
              </Animated.Text>
            ) : null}
          </View>
          {isTyping ? (
            <Text style={styles.skipHint}>Appuyez pour tout afficher</Text>
          ) : null}
        </Pressable>

        {showExtras && hasExtras ? (
          <Animated.View
            style={{
              opacity: extrasOpacity,
              transform: [{ translateY: extrasTranslateY }],
            }}
          >
            {cartFeedback.length > 0 ? (
              <View style={styles.cartFeedbackContainer}>
                {cartFeedback.map((line) => (
                  <View key={line} style={styles.cartFeedbackRow}>
                    <MaterialCommunityIcons
                      name="cart-check"
                      size={16}
                      color={Colors.green700}
                    />
                    <Text style={styles.cartFeedbackText}>{line}</Text>
                  </View>
                ))}
              </View>
            ) : null}

            {productPicks.length > 0 ? (
              <ProductPickList
                picks={productPicks}
                disabled={isInteractionDisabled}
                onAdd={(pick, quantity) => onProductPickAdd?.(pick, quantity)}
              />
            ) : null}

            {quickReplies.length > 0 ? (
              <View style={styles.quickRepliesWrap}>
                {quickReplies.map((reply) => (
                  <Pressable
                    key={reply}
                    disabled={isInteractionDisabled}
                    onPress={() => onQuickReply?.(reply)}
                    style={({ pressed }) => [
                      styles.quickReplyPill,
                      isInteractionDisabled && styles.quickReplyPillDisabled,
                      pressed && !isInteractionDisabled && styles.quickReplyPillPressed,
                    ]}
                  >
                    <Text style={styles.quickReplyText}>{reply}</Text>
                  </Pressable>
                ))}
              </View>
            ) : null}

            {producerLinks.length > 0 ? (
              <View style={styles.linksContainer}>
                {producerLinks.map((link) => (
                  <Pressable
                    key={link.producer_id}
                    style={({ pressed }) => [
                      styles.producerCard,
                      pressed && styles.producerCardPressed,
                    ]}
                    onPress={() => onOpenProducer(link.producer_id)}
                  >
                    <View style={styles.producerCardIcon}>
                      <MaterialCommunityIcons
                        name="storefront"
                        size={18}
                        color={Colors.primary}
                      />
                    </View>
                    <View style={styles.producerCardContent}>
                      <Text style={styles.producerCardName}>{link.company_name}</Text>
                      {link.city ? (
                        <Text style={styles.producerCardCity}>{link.city}</Text>
                      ) : null}
                      <Text style={styles.producerCardReason} numberOfLines={2}>
                        {link.reason}
                      </Text>
                    </View>
                    <MaterialCommunityIcons
                      name="chevron-right"
                      size={20}
                      color={Colors.gray400}
                    />
                  </Pressable>
                ))}
              </View>
            ) : null}
          </Animated.View>
        ) : null}
      </View>
    </View>
  )
}

const styles = StyleSheet.create({
  messageBlock: {
    flexDirection: 'row',
    marginBottom: Spacing.md,
    gap: Spacing.sm,
    alignItems: 'flex-start',
  },
  assistantAvatar: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: Colors.primaryLight,
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: 4,
  },
  assistantContent: {
    flex: 1,
    maxWidth: '88%',
  },
  bubble: {
    paddingHorizontal: Spacing.lg,
    paddingVertical: Spacing.md,
    borderRadius: Radius.lg,
  },
  assistantBubble: {
    backgroundColor: Colors.white,
    borderWidth: 1,
    borderColor: Colors.gray200,
    borderBottomLeftRadius: 4,
  },
  bubblePressed: {
    backgroundColor: Colors.green50,
  },
  textRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    alignItems: 'flex-end',
  },
  bubbleText: {
    fontSize: 15,
    lineHeight: 21,
    color: Colors.gray800,
  },
  assistantBubbleBold: {
    color: Colors.gray900,
    fontWeight: '700',
  },
  cursor: {
    fontSize: 15,
    lineHeight: 21,
    fontWeight: '300',
    color: Colors.primary,
    marginLeft: 1,
    marginBottom: 1,
  },
  skipHint: {
    marginTop: Spacing.sm,
    fontSize: 11,
    color: Colors.gray400,
    fontStyle: 'italic',
  },
  cartFeedbackContainer: {
    marginTop: Spacing.sm,
    gap: Spacing.xs,
  },
  cartFeedbackRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
    backgroundColor: Colors.green50,
    borderRadius: Radius.sm,
    borderWidth: 1,
    borderColor: Colors.border,
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.sm,
  },
  cartFeedbackText: {
    flex: 1,
    fontSize: 13,
    fontWeight: '600',
    color: Colors.green700,
  },
  quickRepliesWrap: {
    marginTop: Spacing.sm,
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: Spacing.sm,
  },
  quickReplyPill: {
    backgroundColor: Colors.white,
    borderRadius: Radius.full,
    paddingHorizontal: Spacing.lg,
    paddingVertical: 10,
    borderWidth: 1.5,
    borderColor: Colors.primary,
    minWidth: 44,
    alignItems: 'center',
  },
  quickReplyPillPressed: {
    backgroundColor: Colors.primaryLight,
  },
  quickReplyPillDisabled: {
    opacity: 0.45,
  },
  quickReplyText: {
    fontSize: 15,
    fontWeight: '700',
    color: Colors.primaryDark,
  },
  linksContainer: {
    marginTop: Spacing.sm,
    gap: Spacing.sm,
  },
  producerCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.white,
    borderRadius: Radius.md,
    borderWidth: 1,
    borderColor: Colors.border,
    padding: Spacing.md,
    gap: Spacing.sm,
  },
  producerCardPressed: {
    backgroundColor: Colors.primaryLight,
  },
  producerCardIcon: {
    width: 36,
    height: 36,
    borderRadius: Radius.sm,
    backgroundColor: Colors.primaryLight,
    justifyContent: 'center',
    alignItems: 'center',
  },
  producerCardContent: {
    flex: 1,
    gap: 2,
  },
  producerCardName: {
    fontSize: 14,
    fontWeight: '700',
    color: Colors.dark,
  },
  producerCardCity: {
    fontSize: 12,
    color: Colors.gray500,
  },
  producerCardReason: {
    fontSize: 12,
    color: Colors.gray600,
    marginTop: 2,
  },
})
