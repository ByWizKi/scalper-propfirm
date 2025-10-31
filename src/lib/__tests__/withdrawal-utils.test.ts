import { calculateWithdrawalTax, getNetWithdrawalAmount, calculateTotalNetWithdrawals, formatTaxRate } from '../withdrawal-utils'

describe('Withdrawal Utils', () => {
  describe('calculateWithdrawalTax', () => {
    it('should return correct tax info for TAKEPROFITTRADER', () => {
      const result = calculateWithdrawalTax(100, 'TAKEPROFITTRADER')
      expect(result.taxRate).toBe(0.2)
      expect(result.taxAmount).toBe(20)
      expect(result.netAmount).toBe(80)
      expect(result.hasTax).toBe(true)
    })

    it('should return correct tax info for TOPSTEP', () => {
      const result = calculateWithdrawalTax(100, 'TOPSTEP')
      expect(result.taxRate).toBe(0)
      expect(result.taxAmount).toBe(0)
      expect(result.netAmount).toBe(100)
      expect(result.hasTax).toBe(false)
    })

    it('should return correct tax info for other propfirms', () => {
      const resultApex = calculateWithdrawalTax(100, 'APEX')
      expect(resultApex.taxRate).toBe(0)
      expect(resultApex.hasTax).toBe(false)

      const resultFtmo = calculateWithdrawalTax(100, 'FTMO')
      expect(resultFtmo.taxRate).toBe(0)
      expect(resultFtmo.hasTax).toBe(false)
    })
  })

  describe('getNetWithdrawalAmount', () => {
    it('should apply 20% tax for TAKEPROFITTRADER', () => {
      expect(getNetWithdrawalAmount(100, 'TAKEPROFITTRADER')).toBe(80)
      expect(getNetWithdrawalAmount(1000, 'TAKEPROFITTRADER')).toBe(800)
    })

    it('should not apply tax for TOPSTEP', () => {
      expect(getNetWithdrawalAmount(100, 'TOPSTEP')).toBe(100)
      expect(getNetWithdrawalAmount(1000, 'TOPSTEP')).toBe(1000)
    })

    it('should not apply tax for other propfirms', () => {
      expect(getNetWithdrawalAmount(100, 'APEX')).toBe(100)
      expect(getNetWithdrawalAmount(100, 'FTMO')).toBe(100)
    })
  })

  describe('calculateTotalNetWithdrawals', () => {
    it('should calculate total with mixed propfirms', () => {
      const withdrawals = [
        { amount: 100, account: { propfirm: 'TAKEPROFITTRADER' } },
        { amount: 200, account: { propfirm: 'TOPSTEP' } },
        { amount: 100, account: { propfirm: 'TAKEPROFITTRADER' } },
      ]

      // 100 * 0.8 + 200 + 100 * 0.8 = 80 + 200 + 80 = 360
      expect(calculateTotalNetWithdrawals(withdrawals)).toBe(360)
    })

    it('should handle empty array', () => {
      expect(calculateTotalNetWithdrawals([])).toBe(0)
    })

    it('should handle single withdrawal', () => {
      const withdrawals = [
        { amount: 500, account: { propfirm: 'TOPSTEP' } },
      ]
      expect(calculateTotalNetWithdrawals(withdrawals)).toBe(500)
    })
  })

  describe('formatTaxRate', () => {
    it('should format tax rate as percentage', () => {
      expect(formatTaxRate(0.2)).toBe('20%')
      expect(formatTaxRate(0.15)).toBe('15%')
      expect(formatTaxRate(0)).toBe('0%')
    })
  })
})

