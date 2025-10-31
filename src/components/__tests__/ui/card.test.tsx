import { render, screen } from '@testing-library/react'
import { Card, CardHeader, CardTitle, CardDescription, CardContent, CardFooter } from '@/components/ui/card'

describe('Card Components', () => {
  it('should render Card with children', () => {
    render(
      <Card>
        <CardContent>Card content</CardContent>
      </Card>
    )
    expect(screen.getByText('Card content')).toBeInTheDocument()
  })

  it('should render CardHeader with title and description', () => {
    render(
      <Card>
        <CardHeader>
          <CardTitle>Test Title</CardTitle>
          <CardDescription>Test Description</CardDescription>
        </CardHeader>
      </Card>
    )
    expect(screen.getByText('Test Title')).toBeInTheDocument()
    expect(screen.getByText('Test Description')).toBeInTheDocument()
  })

  it('should render CardFooter', () => {
    render(
      <Card>
        <CardFooter>Footer content</CardFooter>
      </Card>
    )
    expect(screen.getByText('Footer content')).toBeInTheDocument()
  })

  it('should apply custom className', () => {
    const { container } = render(
      <Card className="custom-class" data-testid="card">
        <CardContent>Content</CardContent>
      </Card>
    )
    const card = container.querySelector('.custom-class')
    expect(card).toBeTruthy()
  })
})

