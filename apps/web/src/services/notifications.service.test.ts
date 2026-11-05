import { describe, expect, it } from 'vitest'
import { notificationTargetPath } from './notifications.service'

const ID = '7d1c2b4e-0000-4000-8000-000000000001'

describe('notificationTargetPath', () => {
  it.each([
    ['ORDER', 'CONSUMER', `/orders/${ID}`],
    ['ORDER', 'PRODUCER', `/producer/orders/${ID}`],
    ['CONVERSATION', 'PRODUCER', `/messages/${ID}`],
    ['PRODUCER', 'CONSUMER', `/producers/${ID}`],
  ] as const)('%s pour un %s ouvre %s', (targetType, role, expected) => {
    expect(notificationTargetPath({ target_type: targetType, target_id: ID }, role)).toBe(expected)
  })

  it('n\'ouvre rien sans cible', () => {
    expect(notificationTargetPath({ target_type: null, target_id: null }, 'CONSUMER')).toBeNull()
    expect(notificationTargetPath({ target_type: 'ORDER', target_id: null }, 'CONSUMER')).toBeNull()
  })
})
