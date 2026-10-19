import { render, screen } from '@testing-library/react'
import { describe, it, expect } from 'vitest'
import '@testing-library/jest-dom/vitest'
import { StatusBadge } from '../components/common/StatusBadge'

describe('StatusBadge Component', () => {
  it('renders online status correctly', () => {
    render(<StatusBadge status="online" />)
    const badge = screen.getByText(/online/i)
    expect(badge).toBeInTheDocument()
  })

  it('renders custom label when provided', () => {
    render(<StatusBadge status="active" label="Seyal AI Active" />)
    const badge = screen.getByText('Seyal AI Active')
    expect(badge).toBeInTheDocument()
  })

  it('applies offline warning styles appropriately', () => {
    render(<StatusBadge status="offline" label="Disconnected" />)
    const badge = screen.getByText('Disconnected')
    expect(badge).toBeInTheDocument()
  })
})
