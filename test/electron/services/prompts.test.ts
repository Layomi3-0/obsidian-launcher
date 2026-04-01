// @vitest-environment node
import { describe, it, expect, vi, beforeEach } from 'vitest'

vi.mock(import('fs'), async (importOriginal) => {
  const actual = await importOriginal()
  return {
    ...actual,
    readFileSync: vi.fn(),
    existsSync: vi.fn(),
    mkdirSync: vi.fn(),
    cpSync: vi.fn(),
    readdirSync: vi.fn().mockReturnValue([]),
    statSync: vi.fn().mockReturnValue({ mtimeMs: 0 }),
  }
})

vi.mock('electron', () => ({
  app: { getAppPath: () => '/mock/app' },
}))

import { readFileSync, existsSync } from 'fs'
import { PromptService } from '../../../electron/services/prompts'

const mockExistsSync = vi.mocked(existsSync)
const mockReadFileSync = vi.mocked(readFileSync)

function createService(): PromptService {
  mockExistsSync.mockReturnValue(true)
  mockReadFileSync.mockReturnValue('' as any)
  const svc = new PromptService()
  vi.clearAllMocks()
  return svc
}

describe('PromptService', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  describe('loadPrompt', () => {
    it('returns content from user path when file exists there', () => {
      const svc = createService()
      mockExistsSync.mockReturnValueOnce(true)
      mockReadFileSync.mockReturnValueOnce('user core content' as any)

      expect(svc.loadPrompt('CORE.md')).toBe('user core content')
    })

    it('falls back to repo path when user path missing', () => {
      const svc = createService()
      mockExistsSync
        .mockReturnValueOnce(false)
        .mockReturnValueOnce(true)
      mockReadFileSync.mockReturnValueOnce('repo core content' as any)

      expect(svc.loadPrompt('CORE.md')).toBe('repo core content')
    })

    it('returns empty string when file missing from both locations', () => {
      const svc = createService()
      mockExistsSync.mockReturnValue(false)

      expect(svc.loadPrompt('NONEXISTENT.md')).toBe('')
    })
  })

  describe('loadOptionalFile (via assembleSystemPrompt)', () => {
    it('loads preferences when file exists and has content', () => {
      const svc = createService()
      mockExistsSync.mockImplementation(((p: any) => {
        if (String(p).includes('PREFERENCES.md')) return true
        return false
      }) as any)
      mockReadFileSync.mockImplementation(((p: any) => {
        if (String(p).includes('PREFERENCES.md')) return 'my prefs'
        return ''
      }) as any)

      const result = svc.assembleSystemPrompt()
      expect(result).toContain('my prefs')
    })

    it('skips preferences when file is empty', () => {
      const svc = createService()
      mockExistsSync.mockImplementation(((p: any) => {
        if (String(p).includes('PREFERENCES.md')) return true
        return false
      }) as any)
      mockReadFileSync.mockImplementation(((p: any) => {
        if (String(p).includes('PREFERENCES.md')) return '   '
        return ''
      }) as any)

      const result = svc.assembleSystemPrompt()
      expect(result).not.toContain('User Preferences')
    })

    it('skips preferences when file is missing', () => {
      const svc = createService()
      mockExistsSync.mockReturnValue(false)

      const result = svc.assembleSystemPrompt()
      expect(result).not.toContain('User Preferences')
    })

    it('returns empty string on read error', () => {
      const svc = createService()
      mockExistsSync.mockImplementation(((p: any) => {
        if (String(p).includes('PREFERENCES.md')) return true
        return false
      }) as any)
      mockReadFileSync.mockImplementation(((p: any) => {
        if (String(p).includes('PREFERENCES.md')) throw new Error('read fail')
        return ''
      }) as any)

      const result = svc.assembleSystemPrompt()
      expect(result).not.toContain('User Preferences')
    })
  })

  describe('assembleSystemPrompt', () => {
    it('assembles sections in correct order separated by ---', () => {
      const svc = createService()
      mockExistsSync.mockImplementation(((p: any) => {
        const s = String(p)
        if (s.includes('CORE.md') && !s.includes('skills')) return true
        if (s.includes('SOUL.md')) return true
        return false
      }) as any)
      mockReadFileSync.mockImplementation(((p: any) => {
        const s = String(p)
        if (s.includes('CORE.md')) return 'CORE_CONTENT'
        if (s.includes('SOUL.md')) return 'SOUL_CONTENT'
        return ''
      }) as any)

      const result = svc.assembleSystemPrompt()
      const parts = result.split('\n\n---\n\n')
      expect(parts[0]).toBe('CORE_CONTENT')
      expect(parts[1]).toBe('SOUL_CONTENT')
    })

    it('skips missing sections', () => {
      const svc = createService()
      mockExistsSync.mockReturnValue(false)

      const result = svc.assembleSystemPrompt()
      expect(result).toBe('')
    })

    it('includes skill section when skillName provided', () => {
      const svc = createService()
      mockExistsSync.mockImplementation(((p: any) => {
        return String(p).includes('daily-briefing.md')
      }) as any)
      mockReadFileSync.mockImplementation(((p: any) => {
        if (String(p).includes('daily-briefing.md')) return 'BRIEFING_SKILL'
        return ''
      }) as any)

      const result = svc.assembleSystemPrompt('daily-briefing')
      expect(result).toContain('BRIEFING_SKILL')
    })

    it('does not include skill section when no skillName', () => {
      const svc = createService()
      mockExistsSync.mockReturnValue(false)

      const result = svc.assembleSystemPrompt()
      expect(result).not.toContain('SKILL')
    })
  })

  describe('detectSkill', () => {
    it('detects "briefing" query', () => {
      const svc = createService()
      expect(svc.detectSkill('briefing today')).toBe('daily-briefing')
    })

    it('detects "morning" query', () => {
      const svc = createService()
      expect(svc.detectSkill('morning')).toBe('daily-briefing')
    })

    it('detects "project" query', () => {
      const svc = createService()
      expect(svc.detectSkill('project new thing')).toBe('project-template')
    })

    it('detects "capture" query', () => {
      const svc = createService()
      expect(svc.detectSkill('capture this idea')).toBe('capture')
    })

    it('detects "prep" query', () => {
      const svc = createService()
      expect(svc.detectSkill('prep for meeting')).toBe('meeting-prep')
    })

    it('detects "summarize [[note]]" query', () => {
      const svc = createService()
      expect(svc.detectSkill('summarize [[My Note]]')).toBe('summarize')
    })

    it('does not detect "summarize" without wikilink', () => {
      const svc = createService()
      expect(svc.detectSkill('summarize this text')).toBeNull()
    })

    it('detects "connect" query', () => {
      const svc = createService()
      expect(svc.detectSkill('connect ideas')).toBe('connection-discovery')
    })

    it('detects "discover" query', () => {
      const svc = createService()
      expect(svc.detectSkill('discover links')).toBe('connection-discovery')
    })

    it('detects youtube.com URL', () => {
      const svc = createService()
      expect(svc.detectSkill('https://youtube.com/watch?v=abc')).toBe('youtube-transcript')
    })

    it('detects youtu.be URL', () => {
      const svc = createService()
      expect(svc.detectSkill('https://youtu.be/abc123')).toBe('youtube-transcript')
    })

    it('returns null for unrecognized query', () => {
      const svc = createService()
      expect(svc.detectSkill('what is the weather')).toBeNull()
    })

    it('strips > prefix before matching', () => {
      const svc = createService()
      expect(svc.detectSkill('> briefing today')).toBe('daily-briefing')
    })

    it('strips / prefix before matching', () => {
      const svc = createService()
      expect(svc.detectSkill('/ capture quick note')).toBe('capture')
    })
  })
})
