import { render, screen } from '@testing-library/react'
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { StatusBar } from '@/components/StatusBar/index'

beforeEach(() => {
  window.launcher = {
    getAIProvider: vi.fn().mockResolvedValue({ current: 'gemini', available: ['gemini'] }),
    setAIProvider: vi.fn().mockResolvedValue({ success: true }),
  } as any

  // Mock localStorage using Object.defineProperty since jsdom may not support spying on Storage.prototype
  const store: Record<string, string> = {}
  Object.defineProperty(window, 'localStorage', {
    value: {
      getItem: vi.fn((key: string) => store[key] ?? null),
      setItem: vi.fn((key: string, value: string) => { store[key] = value }),
      removeItem: vi.fn((key: string) => { delete store[key] }),
      clear: vi.fn(() => { Object.keys(store).forEach(k => delete store[k]) }),
      length: 0,
      key: vi.fn(),
    },
    writable: true,
    configurable: true,
  })
})

describe('StatusBar', () => {
  it('renders AI mode label', () => {
    render(<StatusBar mode="ai" resultCount={0} />)

    expect(screen.getByText('AI')).toBeInTheDocument()
  })

  it('renders Search mode label', () => {
    render(<StatusBar mode="local" resultCount={0} />)

    expect(screen.getByText('Search')).toBeInTheDocument()
  })

  it('renders Ready mode label for idle', () => {
    render(<StatusBar mode="idle" resultCount={0} />)

    expect(screen.getByText('Ready')).toBeInTheDocument()
  })

  it('renders Ready mode label for history', () => {
    render(<StatusBar mode="history" resultCount={0} />)

    expect(screen.getByText('Ready')).toBeInTheDocument()
  })

  it('shows result count in local mode', () => {
    render(<StatusBar mode="local" resultCount={5} />)

    expect(screen.getByText('5 results')).toBeInTheDocument()
  })

  it('shows singular result for count of 1', () => {
    render(<StatusBar mode="local" resultCount={1} />)

    expect(screen.getByText('1 result')).toBeInTheDocument()
  })

  it('does not show result count when zero', () => {
    render(<StatusBar mode="local" resultCount={0} />)

    expect(screen.queryByText(/result/)).not.toBeInTheDocument()
  })

  it('does not show result count in AI mode', () => {
    render(<StatusBar mode="ai" resultCount={10} />)

    expect(screen.queryByText('10 results')).not.toBeInTheDocument()
  })

  it('renders keyboard hints', () => {
    render(<StatusBar mode="idle" resultCount={0} />)

    expect(screen.getByText('navigate')).toBeInTheDocument()
    expect(screen.getByText('open')).toBeInTheDocument()
    expect(screen.getByText('close')).toBeInTheDocument()
  })

  it('shows provider label', async () => {
    render(<StatusBar mode="idle" resultCount={0} />)

    expect(await screen.findByText('Gemini')).toBeInTheDocument()
  })
})
