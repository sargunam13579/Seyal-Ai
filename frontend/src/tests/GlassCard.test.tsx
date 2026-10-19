import { render, screen, fireEvent } from '@testing-library/react'
import { describe, it, expect, vi } from 'vitest'
import '@testing-library/jest-dom/vitest'
import { GlassCard } from '../components/common/GlassCard'

describe('GlassCard Component', () => {
  it('renders children elements properly', () => {
    render(
      <GlassCard>
        <p>Telemetry Card Content</p>
      </GlassCard>
    )
    expect(screen.getByText('Telemetry Card Content')).toBeInTheDocument()
  })

  it('triggers onClick handler when clicked', () => {
    const handleClick = vi.fn()
    render(
      <GlassCard onClick={handleClick}>
        <button>Clickable Action</button>
      </GlassCard>
    )
    fireEvent.click(screen.getByText('Clickable Action'))
    expect(handleClick).toHaveBeenCalledTimes(1)
  })

  it('applies glow and corner classes when props are enabled', () => {
    const { container } = render(
      <GlassCard glow corners>
        <span>Tech Panel</span>
      </GlassCard>
    )
    const card = container.firstChild as HTMLElement
    expect(card.className).toContain('glass-panel-glow')
    expect(card.className).toContain('tech-corners')
  })
})
