import { cn } from '../utils'

describe('cn utility', () => {
  it('should merge class names correctly', () => {
    const result = cn('px-2 py-1', 'px-4')
    expect(result).toBe('py-1 px-4')
  })

  it('should handle conditional classes', () => {
    const result = cn('base-class', false && 'hidden', 'visible')
    expect(result).toBe('base-class visible')
  })

  it('should handle undefined and null', () => {
    const result = cn('base-class', undefined, null, 'extra-class')
    expect(result).toBe('base-class extra-class')
  })

  it('should handle empty input', () => {
    const result = cn()
    expect(result).toBe('')
  })
})

