import { render, act } from '@testing-library/react'
import { describe, it, expect, vi, beforeEach } from 'vitest'
import React from 'react'

// 1. Mock SeyalAiContext & VoiceContext state
interface MessageItem {
  id: string
  role: 'user' | 'assistant'
  content: string
  timestamp: string
}

let messagesState: MessageItem[] = []
let transcriptListeners: Array<(text: string) => void> = []

const mockSetComputerUseMessages = vi.fn((updater: any) => {
  if (typeof updater === 'function') {
    messagesState = updater(messagesState)
  } else {
    messagesState = updater
  }
})

vi.mock('../context/SeyalAiContext', () => ({
  useSeyalAi: () => ({
    computerUseMessages: messagesState,
    setComputerUseMessages: mockSetComputerUseMessages,
    computerUseConversationId: 'test-conv-1',
    setComputerUseConversationId: vi.fn(),
    addActivity: vi.fn(),
    identity: { user_name: 'Sargunam' },
    setActiveConversationId: vi.fn(),
    refreshConversations: vi.fn(),
    isHeroLogoOpen: false,
    isTextInputPopupOpen: false,
    setIsTextInputPopupOpen: vi.fn(),
    userProfileAvatar: null,
    isTaskExecuting: false,
    setIsTaskExecuting: vi.fn(),
    agentStatus: 'idle',
    setAgentStatus: vi.fn(),
    liveSteps: [],
    setLiveSteps: vi.fn(),
  }),
}))

vi.mock('../context/VoiceContext', () => ({
  useVoice: () => ({
    isSpeaking: false,
    isUserSpeaking: false,
    interimTranscript: '',
    startListening: vi.fn(),
    speakInstant: vi.fn(),
    speakAssistantResponse: vi.fn(),
    preloadAssistantAudio: vi.fn(),
    getNextTurnId: vi.fn(() => 1),
    stopSpeaking: vi.fn(),
    setProcessing: vi.fn(),
    registerBargeInHandler: vi.fn(() => () => {}),
    registerTranscriptHandler: (handler: (text: string) => void) => {
      transcriptListeners.push(handler)
      return () => {
        transcriptListeners = transcriptListeners.filter((h) => h !== handler)
      }
    },
    isMuted: false,
    toggleMute: vi.fn(),
    autoListen: true,
  }),
}))

vi.mock('../services/api', () => ({
  api: {
    sendComputerUsePromptStream: vi.fn(() => Promise.resolve()),
    runComputerUseStream: vi.fn(() => Promise.resolve()),
    getComputerUseStatus: vi.fn(() => Promise.resolve({ status: 'idle', is_busy: false })),
    stopComputerUse: vi.fn(() => Promise.resolve()),
    steerComputerUse: vi.fn(() => Promise.resolve()),
  },
}))

// Import the actual React Component under test
import { ConvoComputerUseAgentView } from '../components/convo_computer_use_agent/ConvoComputerUseAgentView'

describe('ConvoComputerUseAgentView — Real Component Integration Test (React Testing Library)', () => {
  beforeEach(() => {
    messagesState = []
    transcriptListeners = []
    mockSetComputerUseMessages.mockClear()
    vi.clearAllMocks()
  })

  it('verifies real component creates exactly 1 user bubble when speech is received (Fails if duplicate listener bug exists)', () => {
    // 1. Mount the REAL React Component
    render(<ConvoComputerUseAgentView />)

    // 2. Simulate User speaking ONCE into microphone
    act(() => {
      transcriptListeners.forEach((handler) => {
        handler('Chrome open pannu')
      })
    })

    // 3. Check Real Component state:
    // User spoke 1 time, so exactly 1 user message bubble must be created!
    const userBubbles = messagesState.filter((m) => m.role === 'user')
    expect(userBubbles).toHaveLength(1)
    expect(userBubbles[0].content).toBe('Chrome open pannu')
    expect(userBubbles[0].role).toBe('user')

    // Also verify assistant response placeholder is mounted cleanly (1 assistant bubble)
    const assistantBubbles = messagesState.filter((m) => m.role === 'assistant')
    expect(assistantBubbles).toHaveLength(1)
  })
})
