// Stripe cobra en la unidad mínima de cada moneda. Solo las «zero-decimal» no tienen centavos
// (de las que usamos: CLP y PYG). COP y ARS SÍ llevan 2 decimales en Stripe.
// https://docs.stripe.com/currencies#zero-decimal
const ZERO_DECIMAL = new Set(['bif', 'clp', 'djf', 'gnf', 'jpy', 'kmf', 'krw', 'mga', 'pyg', 'rwf', 'ugx', 'vnd', 'vuv', 'xaf', 'xof', 'xpf']);

export const isZeroDecimal = (currency: string) => ZERO_DECIMAL.has(currency.toLowerCase());

// Importe de Stripe (unidad mínima) → importe normal: 19900 MXN → 199
export const toMajorUnits = (amount: number, currency: string) => (isZeroDecimal(currency) ? amount : amount / 100);
