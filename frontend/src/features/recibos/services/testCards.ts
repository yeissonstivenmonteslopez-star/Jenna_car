export type Brand = 'visa' | 'mastercard' | 'amex' | ''
export const TEST_CARDS = { visa: '4242424242424242', mastercard: '5555555555554444', amex: '378282246310005' }
export function detectBrand(number: string): Brand {
  const digits = number.replace(/\D/g, '')
  if (/^4/.test(digits)) return 'visa'
  if (/^3[47]/.test(digits)) return 'amex'
  if (/^(5[1-5]|222[1-9]|22[3-9]\d|2[3-6]\d{2}|27[01]\d|2720)/.test(digits)) return 'mastercard'
  return ''
}
export function luhn(number: string) {
  const digits = number.replace(/\s/g, '')
  if (!/^\d{13,19}$/.test(digits)) return false
  let sum = 0
  let double = false
  for (const char of [...digits].reverse()) {
    let value = Number(char)
    if (double) { value *= 2; if (value > 9) value -= 9 }
    sum += value; double = !double
  }
  return sum % 10 === 0
}
export function validTestCard(number: string) {
  const digits = number.replace(/\s/g, '')
  return Object.values(TEST_CARDS).includes(digits) && luhn(digits)
}
export function formatCard(number: string) {
  const digits = number.replace(/\D/g, '').slice(0, detectBrand(number) === 'amex' ? 15 : 16)
  return detectBrand(digits) === 'amex' ? [digits.slice(0, 4), digits.slice(4, 10), digits.slice(10)].filter(Boolean).join(' ') : digits.replace(/(.{4})/g, '$1 ').trim()
}
