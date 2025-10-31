import { formatCurrency, formatCurrencyEUR, convertUSDToEUR, USD_TO_EUR } from '../currency'

describe('Currency Utils', () => {
  describe('formatCurrency', () => {
    it('should format USD correctly', () => {
      expect(formatCurrency(1000)).toContain('1')
      expect(formatCurrency(1000)).toContain('000')
    })

    it('should handle zero', () => {
      expect(formatCurrency(0)).toContain('0')
    })

    it('should handle negative numbers', () => {
      expect(formatCurrency(-100)).toContain('-')
      expect(formatCurrency(-100)).toContain('100')
    })
  })

  describe('formatCurrencyEUR', () => {
    it('should format EUR correctly', () => {
      expect(formatCurrencyEUR(1000)).toContain('1')
      expect(formatCurrencyEUR(1000)).toContain('000')
    })

    it('should handle decimals', () => {
      const result = formatCurrencyEUR(1234.56)
      expect(result).toContain('1')
      expect(result).toContain('234')
    })
  })

  describe('convertUSDToEUR', () => {
    it('should convert USD to EUR correctly', () => {
      expect(convertUSDToEUR(100)).toBe(100 * USD_TO_EUR)
      expect(convertUSDToEUR(1000)).toBe(1000 * USD_TO_EUR)
    })

    it('should handle zero', () => {
      expect(convertUSDToEUR(0)).toBe(0)
    })

    it('should handle decimals', () => {
      expect(convertUSDToEUR(123.45)).toBeCloseTo(123.45 * USD_TO_EUR, 2)
    })
  })
})

