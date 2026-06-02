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
  onAnimationComplete?: () => void
  onScrollRequest?: () => void
  onOpenProducer: (producerId: string) => void
}

export function AssistantReplyBubble({
  text,
  animate,
  producerLinks = [],
  onAnimationComplete,
  onScrollRequest,
  onOpenProducer,
}: AssistantReplyBubbleProps) {
  const cursorOpacity = useRef(new Animated.Value(1)).current
  const linksOpacity = useRef(new Animated.Value(0)).current
  const linksTranslateY = useRef(new Animated.Value(8)).current

  const { visibleText, isComplete, isTyping, skip } = useTypewriter(text, {
    enabled: animate,
    onComplete: onAnimationComplete,
    onTick: onScrollRequest,
  })

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
    if (!isComplete || producerLinks.length === 0) return

    Animated.parallel([
      Animated.timing(linksOpacity, {
        toValue: 1,
        duration: 380,
        useNativeDriver: true,
      }),
      Animated.spring(linksTranslateY, {
        toValue: 0,
        friction: 8,
        tension: 80,
        useNativeDriver: true,
      }),
    ]).start()
  }, [isComplete, producerLinks.length, linksOpacity, linksTranslateY])

  const showLinks = isComplete && producerLinks.length > 0

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

        {showLinks ? (
          <Animated.View
            style={[
              styles.linksContainer,
              {
                opacity: linksOpacity,
                transform: [{ translateY: linksTranslateY }],
              },
            ]}
          >
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
