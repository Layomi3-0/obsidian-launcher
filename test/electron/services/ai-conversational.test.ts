// @vitest-environment node
import { describe, it, expect, vi } from 'vitest'

vi.mock('youtube-transcript', () => ({
  YoutubeTranscript: { fetchTranscript: vi.fn() },
}))

vi.mock('child_process', () => ({
  execSync: vi.fn(),
}))

import { isConversational } from '../../../electron/services/ai-helpers'

describe('isConversational', () => {
  describe('returns true for conversational queries', () => {
    it.each([
      ['how are you'],
      ['hi'],
      ['hello'],
      ['good morning'],
      ['good afternoon'],
      ['good evening'],
      ['explain quantum computing'],
      ['hey there'],
      ['thanks'],
      ['thank you'],
      ['what is the speed of light'],
      ['tell me about black holes'],
      ['why is the sky blue'],
      ['yes'],
      ['ok'],
    ])('"%s" is conversational', (query) => {
      expect(isConversational(query)).toBe(true)
    })
  })

  describe('returns false for vault-related queries', () => {
    it('excludes queries containing "project"', () => {
      expect(isConversational('what is my project status')).toBe(false)
    })

    it('excludes queries containing "vault"', () => {
      expect(isConversational('search my vault for X')).toBe(false)
    })

    it('excludes queries containing wikilinks', () => {
      expect(isConversational('show me [[MyNote]]')).toBe(false)
    })

    it('excludes queries containing "todo"', () => {
      expect(isConversational('what are my todos')).toBe(false)
    })

    it('excludes queries containing "task"', () => {
      expect(isConversational('what tasks do I have')).toBe(false)
    })

    it('excludes queries containing "note"', () => {
      expect(isConversational('summarize my notes')).toBe(false)
    })
  })

  describe('returns false for non-matching queries', () => {
    it('rejects queries that match no pattern', () => {
      expect(isConversational('asdfghjkl')).toBe(false)
    })

    it('rejects empty string', () => {
      expect(isConversational('')).toBe(false)
    })
  })
})
