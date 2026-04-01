// @vitest-environment node
import { describe, it, expect, beforeEach } from 'vitest'
import {
  getCurrentSessionId,
  setCurrentSessionId,
  resetSessionId,
  getLastNoteOpened,
  setLastNoteOpened,
  isFirstInvocationToday,
} from '../../electron/ai-handler'

describe('session state', () => {
  describe('sessionId', () => {
    it('returns a session id with timestamp prefix', () => {
      expect(getCurrentSessionId()).toMatch(/^session-\d+$/)
    })

    it('sets and gets a custom session id', () => {
      setCurrentSessionId('custom-123')
      expect(getCurrentSessionId()).toBe('custom-123')
    })

    it('resets to a new timestamp-based id', () => {
      setCurrentSessionId('old')
      const newId = resetSessionId()

      expect(newId).toMatch(/^session-\d+$/)
      expect(newId).not.toBe('old')
      expect(getCurrentSessionId()).toBe(newId)
    })
  })

  describe('lastNoteOpened', () => {
    beforeEach(() => {
      setLastNoteOpened(undefined as any)
    })

    it('tracks the last opened note path', () => {
      setLastNoteOpened('Projects/foo.md')
      expect(getLastNoteOpened()).toBe('Projects/foo.md')
    })
  })

  describe('isFirstInvocationToday', () => {
    it('returns true on the first call of the day', () => {
      expect(isFirstInvocationToday()).toBe(true)
    })

    it('returns false on subsequent calls the same day', () => {
      isFirstInvocationToday()
      expect(isFirstInvocationToday()).toBe(false)
    })
  })
})
