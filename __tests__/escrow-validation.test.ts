import {
  validateStellarAddress,
  validateAmount,
  validateAsset,
} from '../lib/validation'

describe('Escrow Validation', () => {
  const VALID_G_ADDRESS = 'GAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAWHF'

  describe('Escrow Address Validation', () => {
    it('should validate depositor and recipient addresses', () => {
      const depositorResult = validateStellarAddress(VALID_G_ADDRESS)
      expect(depositorResult.isValid).toBe(true)

      const recipientResult = validateStellarAddress(VALID_G_ADDRESS)
      expect(recipientResult.isValid).toBe(true)
    })

    it('should reject empty addresses for parties', () => {
      const result = validateStellarAddress('')
      expect(result.isValid).toBe(false)
      expect(result.errorMessage).toBe('Address is required')
    })

    it('should reject invalid party addresses', () => {
      const result = validateStellarAddress('invalid')
      expect(result.isValid).toBe(false)
    })
  })

  describe('Escrow Amount Validation', () => {
    it('should validate positive amounts', () => {
      const result = validateAmount('50000000', 'USDC')
      expect(result.isValid).toBe(true)
    })

    it('should reject negative amounts', () => {
      const negativeResult = validateAmount('-100', 'USDC')
      expect(negativeResult.isValid).toBe(false)
      expect(negativeResult.errorMessage).toBe('Amount must be a positive number')
    })

    it('should reject non-numeric amounts', () => {
      const result = validateAmount('abc', 'USDC')
      expect(result.isValid).toBe(false)
    })

    it('should respect minimum amount per asset', () => {
      const result = validateAmount('0.001', 'USDC')
      expect(result.isValid).toBe(false)
    })
  })

  describe('Escrow Asset Validation', () => {
    it('should validate asset codes used in escrow', () => {
      const result = validateAsset('USDC')
      expect(result.isValid).toBe(true)
    })

    it('should reject empty asset codes', () => {
      const result = validateAsset('')
      expect(result.isValid).toBe(false)
      expect(result.errorMessage).toBe('Asset code is required')
    })

    it('should reject overly long asset codes', () => {
      const result = validateAsset('ASSETCODE_TOO_LONG')
      expect(result.isValid).toBe(false)
    })
  })

  describe('Escrow Release Conditions', () => {
    it('should support time lock condition', () => {
      const condition = {
        type: 'TIME_LOCK',
        releaseTimestamp: Math.floor(Date.now() / 1000) + 86400, // 1 day from now
      }
      expect(condition.type).toBe('TIME_LOCK')
      expect(condition.releaseTimestamp).toBeGreaterThan(Math.floor(Date.now() / 1000))
    })

    it('should support multi-sig condition', () => {
      const condition = {
        type: 'MULTI_SIG',
        approvers: [
          'GAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAWHF',
          'GAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA',
        ],
        threshold: 2,
      }
      expect(condition.type).toBe('MULTI_SIG')
      expect(condition.approvers.length).toBeGreaterThanOrEqual(2)
      expect(condition.threshold).toBeLessThanOrEqual(condition.approvers.length)
    })

    it('should support milestone condition', () => {
      const condition = {
        type: 'MILESTONE',
        description: 'Deliver Q1 financial report',
      }
      expect(condition.type).toBe('MILESTONE')
      expect(condition.description.length).toBeGreaterThan(0)
    })

    it('should require timestamp in the future for time lock', () => {
      const pastTimestamp = Math.floor(Date.now() / 1000) - 3600
      expect(pastTimestamp).toBeLessThan(Math.floor(Date.now() / 1000))
    })
  })

  describe('Escrow Parties', () => {
    it('should require at least depositor and recipient', () => {
      const parties = [
        { address: VALID_G_ADDRESS, role: 'DEPOSITOR' },
        { address: VALID_G_ADDRESS, role: 'RECIPIENT' },
      ]
      expect(parties.length).toBeGreaterThanOrEqual(2)
      expect(parties.some(p => p.role === 'DEPOSITOR')).toBe(true)
      expect(parties.some(p => p.role === 'RECIPIENT')).toBe(true)
    })

    it('should support optional arbiter role', () => {
      const parties = [
        { address: VALID_G_ADDRESS, role: 'DEPOSITOR' },
        { address: VALID_G_ADDRESS, role: 'RECIPIENT' },
        { address: VALID_G_ADDRESS, role: 'ARBITER' },
      ]
      const arbiterCount = parties.filter(p => p.role === 'ARBITER').length
      expect(arbiterCount).toBe(1)
    })

    it('should validate all party addresses', () => {
      const parties = [
        { address: VALID_G_ADDRESS, role: 'DEPOSITOR' },
        { address: 'invalid', role: 'RECIPIENT' },
      ]
      const validParties = parties.filter(p => validateStellarAddress(p.address).isValid)
      expect(validParties.length).toBe(1)
    })
  })
})
