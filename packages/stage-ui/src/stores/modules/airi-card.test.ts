import { createTestingPinia } from '@pinia/testing'
import { setActivePinia } from 'pinia'
import { beforeEach, describe, expect, it, vi } from 'vitest'

import { MITA_CARD_ID, MITA_CARD_PROMPT } from '../../constants/mita-card'
import { useAiriCardStore } from './airi-card'

vi.mock('vue-i18n', () => ({
  useI18n: () => ({
    t: (key: string) => key,
  }),
}))

describe('airi card defaults', () => {
  beforeEach(() => {
    setActivePinia(createTestingPinia({ createSpy: vi.fn, stubActions: false }))
  })

  it('installs Mita as the default card', () => {
    const store = useAiriCardStore()

    store.initialize()

    const mita = store.cards.get(MITA_CARD_ID)
    expect(store.activeCardId).toBe(MITA_CARD_ID)
    expect(mita).toMatchObject({
      name: '米塔',
      nickname: '米塔',
      description: MITA_CARD_PROMPT,
      personality: MITA_CARD_PROMPT,
      scenario: MITA_CARD_PROMPT,
    })
  })

  it('migrates the active built-in ReLU card to Mita once', () => {
    const store = useAiriCardStore()
    store.initialize()
    store.cards.delete(MITA_CARD_ID)
    store.activeCardId = 'default'

    store.initialize()

    expect(store.activeCardId).toBe(MITA_CARD_ID)
    expect(store.cards.get(MITA_CARD_ID)?.name).toBe('米塔')
  })

  it('preserves an existing custom active card while adding Mita', () => {
    const store = useAiriCardStore()
    store.initialize()
    const customCardId = store.addCard({
      name: 'Custom',
      version: '1.0.0',
    })
    store.cards.delete(MITA_CARD_ID)
    store.activeCardId = customCardId

    store.initialize()

    expect(store.activeCardId).toBe(customCardId)
    expect(store.cards.has(MITA_CARD_ID)).toBe(true)
  })
})
