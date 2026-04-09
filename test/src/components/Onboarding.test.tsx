import { render, screen, fireEvent, waitFor, act } from '@testing-library/react'
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { Onboarding } from '@/components/Onboarding/index'

beforeEach(() => {
  vi.clearAllMocks()
  vi.useFakeTimers({ shouldAdvanceTime: true })
  window.launcher = { openUrl: vi.fn() } as any
})

afterEach(() => {
  vi.useRealTimers()
})

function renderOnboarding(overrides: Partial<Parameters<typeof Onboarding>[0]> = {}) {
  const props = {
    onPickFolder: vi.fn().mockResolvedValue(null),
    onValidateKey: vi.fn().mockResolvedValue({ valid: false, error: 'Invalid API key' }),
    onComplete: vi.fn(),
    ...overrides,
  }
  const result = render(<Onboarding {...props} />)
  return { ...result, props }
}

describe('Onboarding', () => {
  it('renders welcome step initially with "Brain Dump" title', () => {
    renderOnboarding()
    expect(screen.getByText('Brain Dump')).toBeInTheDocument()
  })

  it('shows "Get Started" button', () => {
    renderOnboarding()
    expect(screen.getByText('Get Started')).toBeInTheDocument()
  })

  it('clicking "Get Started" transitions to vault step', async () => {
    renderOnboarding()

    await act(async () => {
      fireEvent.click(screen.getByText('Get Started'))
    })

    await waitFor(() => {
      expect(screen.getByText('Connect Your Vault')).toBeInTheDocument()
    })
  })

  it('vault step shows "Connect Your Vault" heading', async () => {
    renderOnboarding()

    await act(async () => {
      fireEvent.click(screen.getByText('Get Started'))
    })

    await waitFor(() => {
      expect(screen.getByText('Connect Your Vault')).toBeInTheDocument()
    })
  })

  it('clicking Browse calls onPickFolder', async () => {
    const onPickFolder = vi.fn().mockResolvedValue(null)
    renderOnboarding({ onPickFolder })

    await act(async () => {
      fireEvent.click(screen.getByText('Get Started'))
    })

    await waitFor(() => {
      expect(screen.getByText('Browse')).toBeInTheDocument()
    })

    await act(async () => {
      fireEvent.click(screen.getByText('Browse'))
    })

    expect(onPickFolder).toHaveBeenCalled()
  })

  it('shows selected path after folder pick', async () => {
    const onPickFolder = vi.fn().mockResolvedValue('/Users/me/vault')
    renderOnboarding({ onPickFolder })

    await act(async () => {
      fireEvent.click(screen.getByText('Get Started'))
    })

    await waitFor(() => {
      expect(screen.getByText('Browse')).toBeInTheDocument()
    })

    await act(async () => {
      fireEvent.click(screen.getByText('Browse'))
    })

    await waitFor(() => {
      expect(screen.getByText('/Users/me/vault')).toBeInTheDocument()
    })
  })

  it('"Continue" moves to API key step', async () => {
    renderOnboarding()

    await act(async () => {
      fireEvent.click(screen.getByText('Get Started'))
    })

    await waitFor(() => {
      expect(screen.getByText('Continue')).toBeInTheDocument()
    })

    await act(async () => {
      fireEvent.click(screen.getByText('Continue'))
    })

    await waitFor(() => {
      expect(screen.getByText('API Key')).toBeInTheDocument()
    })
  })

  it('"Skip — no vault" moves to API key step', async () => {
    renderOnboarding()

    await act(async () => {
      fireEvent.click(screen.getByText('Get Started'))
    })

    await waitFor(() => {
      expect(screen.getByText(/Skip/)).toBeInTheDocument()
    })

    await act(async () => {
      fireEvent.click(screen.getByText(/Skip/))
    })

    await waitFor(() => {
      expect(screen.getByText('API Key')).toBeInTheDocument()
    })
  })

  it('API key step shows provider toggle (Claude selected by default)', async () => {
    renderOnboarding()

    await act(async () => {
      fireEvent.click(screen.getByText('Get Started'))
    })
    await waitFor(() => {
      expect(screen.getByText('Continue')).toBeInTheDocument()
    })
    await act(async () => {
      fireEvent.click(screen.getByText('Continue'))
    })

    await waitFor(() => {
      expect(screen.getByText('Claude (Anthropic)')).toBeInTheDocument()
      expect(screen.getByText('Gemini (Google)')).toBeInTheDocument()
    })

    // Claude is selected by default — check placeholder for Claude key format
    expect(screen.getByPlaceholderText('sk-ant-...')).toBeInTheDocument()
  })

  it('switching provider clears the key input', async () => {
    renderOnboarding()

    // Navigate to API key step
    await act(async () => {
      fireEvent.click(screen.getByText('Get Started'))
    })
    await waitFor(() => {
      expect(screen.getByText('Continue')).toBeInTheDocument()
    })
    await act(async () => {
      fireEvent.click(screen.getByText('Continue'))
    })
    await waitFor(() => {
      expect(screen.getByText('API Key')).toBeInTheDocument()
    })

    // Type a key
    const input = screen.getByPlaceholderText('sk-ant-...')
    await act(async () => {
      fireEvent.change(input, { target: { value: 'sk-ant-test123' } })
    })
    expect(input).toHaveValue('sk-ant-test123')

    // Switch to Gemini
    await act(async () => {
      fireEvent.click(screen.getByText('Gemini (Google)'))
    })

    // Input should be cleared and placeholder should change
    await waitFor(() => {
      const geminiInput = screen.getByPlaceholderText('AIzaSy...')
      expect(geminiInput).toHaveValue('')
    })
  })

  it('entering key and clicking "Validate & Finish" calls onValidateKey', async () => {
    const onValidateKey = vi.fn().mockResolvedValue({ valid: false, error: 'Bad key' })
    renderOnboarding({ onValidateKey })

    // Navigate to API key step
    await act(async () => {
      fireEvent.click(screen.getByText('Get Started'))
    })
    await waitFor(() => {
      expect(screen.getByText('Continue')).toBeInTheDocument()
    })
    await act(async () => {
      fireEvent.click(screen.getByText('Continue'))
    })
    await waitFor(() => {
      expect(screen.getByText('API Key')).toBeInTheDocument()
    })

    // Enter a key and validate
    const input = screen.getByPlaceholderText('sk-ant-...')
    await act(async () => {
      fireEvent.change(input, { target: { value: 'sk-ant-mykey' } })
    })
    await act(async () => {
      fireEvent.click(screen.getByText('Validate & Finish'))
    })

    expect(onValidateKey).toHaveBeenCalledWith('sk-ant-mykey', 'claude')
  })

  it('shows error message on validation failure', async () => {
    const onValidateKey = vi.fn().mockResolvedValue({ valid: false, error: 'Key expired' })
    renderOnboarding({ onValidateKey })

    // Navigate to API key step
    await act(async () => {
      fireEvent.click(screen.getByText('Get Started'))
    })
    await waitFor(() => {
      expect(screen.getByText('Continue')).toBeInTheDocument()
    })
    await act(async () => {
      fireEvent.click(screen.getByText('Continue'))
    })
    await waitFor(() => {
      expect(screen.getByText('API Key')).toBeInTheDocument()
    })

    // Enter a key and validate
    const input = screen.getByPlaceholderText('sk-ant-...')
    await act(async () => {
      fireEvent.change(input, { target: { value: 'sk-ant-expired' } })
    })
    await act(async () => {
      fireEvent.click(screen.getByText('Validate & Finish'))
    })

    await waitFor(() => {
      expect(screen.getByText('Key expired')).toBeInTheDocument()
    })
  })

  it('calls onComplete on successful validation', async () => {
    const onValidateKey = vi.fn().mockResolvedValue({ valid: true })
    const onComplete = vi.fn()
    const onPickFolder = vi.fn().mockResolvedValue('/my/vault')
    renderOnboarding({ onValidateKey, onComplete, onPickFolder })

    // Navigate to vault step and pick a folder
    await act(async () => {
      fireEvent.click(screen.getByText('Get Started'))
    })
    await waitFor(() => {
      expect(screen.getByText('Browse')).toBeInTheDocument()
    })
    await act(async () => {
      fireEvent.click(screen.getByText('Browse'))
    })
    await waitFor(() => {
      expect(screen.getByText('/my/vault')).toBeInTheDocument()
    })

    // Navigate to API key step
    await act(async () => {
      fireEvent.click(screen.getByText('Continue'))
    })
    await waitFor(() => {
      expect(screen.getByText('API Key')).toBeInTheDocument()
    })

    // Enter key and validate
    const input = screen.getByPlaceholderText('sk-ant-...')
    await act(async () => {
      fireEvent.change(input, { target: { value: 'sk-ant-valid' } })
    })
    await act(async () => {
      fireEvent.click(screen.getByText('Validate & Finish'))
    })

    // onComplete is called after a 600ms setTimeout
    await act(async () => {
      vi.advanceTimersByTime(700)
    })

    expect(onComplete).toHaveBeenCalledWith({
      vaultPath: '/my/vault',
      apiKey: 'sk-ant-valid',
      provider: 'claude',
    })
  })

  it('progress dots show correct step', async () => {
    const { container } = renderOnboarding()

    // Welcome step (index 0): first dot should be wide (20px), others narrow (6px)
    const getDots = () => {
      const dotsContainer = container.querySelector('[style*="gap: 8px"]')
      return dotsContainer ? Array.from(dotsContainer.children) as HTMLElement[] : []
    }

    const welcomeDots = getDots()
    expect(welcomeDots).toHaveLength(3)
    expect(welcomeDots[0].style.width).toBe('20px')
    expect(welcomeDots[1].style.width).toBe('6px')
    expect(welcomeDots[2].style.width).toBe('6px')

    // Move to vault step (index 1)
    await act(async () => {
      fireEvent.click(screen.getByText('Get Started'))
    })

    await waitFor(() => {
      const vaultDots = getDots()
      expect(vaultDots[0].style.width).toBe('6px')
      expect(vaultDots[1].style.width).toBe('20px')
      expect(vaultDots[2].style.width).toBe('6px')
    })

    // Move to API key step (index 2)
    await act(async () => {
      fireEvent.click(screen.getByText('Continue'))
    })

    await waitFor(() => {
      const apiDots = getDots()
      expect(apiDots[0].style.width).toBe('6px')
      expect(apiDots[1].style.width).toBe('6px')
      expect(apiDots[2].style.width).toBe('20px')
    })
  })
})
