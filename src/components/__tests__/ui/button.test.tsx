import { render, screen } from '@testing-library/react'
import { Button } from '@/components/ui/button'
import userEvent from '@testing-library/user-event'

describe('Button Component', () => {
  it('should render button with text', () => {
    render(<Button>Click me</Button>)
    expect(screen.getByText('Click me')).toBeInTheDocument()
  })

  it('should handle click events', async () => {
    const handleClick = jest.fn()
    const user = userEvent.setup()

    render(<Button onClick={handleClick}>Click me</Button>)
    await user.click(screen.getByText('Click me'))

    expect(handleClick).toHaveBeenCalledTimes(1)
  })

  it('should be disabled when disabled prop is true', () => {
    render(<Button disabled>Disabled</Button>)
    expect(screen.getByText('Disabled')).toBeDisabled()
  })

  it('should apply variant classes correctly', () => {
    const { rerender } = render(<Button variant="destructive">Delete</Button>)
    expect(screen.getByText('Delete')).toHaveClass('bg-red-500')

    rerender(<Button variant="outline">Outline</Button>)
    expect(screen.getByText('Outline')).toHaveClass('border')
  })

  it('should apply size classes correctly', () => {
    render(<Button size="sm">Small</Button>)
    expect(screen.getByText('Small')).toHaveClass('h-9')
  })
})

