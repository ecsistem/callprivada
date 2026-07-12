export const CURRENCIES = [
  { code: 'BRL', label: 'Real Brasileiro (R$)', locale: 'pt-BR' },
  { code: 'EUR', label: 'Euro (€)',             locale: 'pt-PT' },
  { code: 'USD', label: 'Dólar Americano ($)',  locale: 'en-US' },
  { code: 'GBP', label: 'Libra Esterlina (£)', locale: 'en-GB' },
] as const;

export type CurrencyCode = typeof CURRENCIES[number]['code'];

export function formatPrice(cents: number, currency: string = 'BRL'): string {
  const entry = CURRENCIES.find(c => c.code === currency) ?? CURRENCIES[0];
  return (cents / 100).toLocaleString(entry.locale, { style: 'currency', currency: entry.code });
}
