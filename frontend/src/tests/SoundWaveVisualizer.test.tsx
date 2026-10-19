import { render } from '@testing-library/react'
import { describe, it, expect } from 'vitest'
import { SoundWaveVisualizer } from '../components/common/SoundWaveVisualizer'

describe('SoundWaveVisualizer Component', () => {
  it('renders correct number of audio bars', () => {
    const { container } = render(<SoundWaveVisualizer state="idle" barCount={8} />)
    const bars = container.querySelectorAll('span')
    expect(bars.length).toBe(8)
  })

  it('animates bars when state is speaking or listening', () => {
    const { container } = render(<SoundWaveVisualizer state="speaking" barCount={6} />)
    const bars = container.querySelectorAll('span')
    bars.forEach((bar) => {
      expect(bar.className).toMatch(/wave-bar-\d/)
    })
  })
})
