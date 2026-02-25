import { NextRequest, NextResponse } from 'next/server'

export interface CountryPricing {
  currency: string
  symbol: string
  label: string
  detective: number
  obsesivo: number
  isZeroDecimal: boolean
}

const PRICING: Record<string, CountryPricing> = {
  // Europa
  ES: { currency: 'eur', symbol: '€', label: 'EUR', detective: 399, obsesivo: 999, isZeroDecimal: false },
  PT: { currency: 'eur', symbol: '€', label: 'EUR', detective: 399, obsesivo: 999, isZeroDecimal: false },
  IT: { currency: 'eur', symbol: '€', label: 'EUR', detective: 399, obsesivo: 999, isZeroDecimal: false },
  FR: { currency: 'eur', symbol: '€', label: 'EUR', detective: 399, obsesivo: 999, isZeroDecimal: false },
  DE: { currency: 'eur', symbol: '€', label: 'EUR', detective: 399, obsesivo: 999, isZeroDecimal: false },
  NL: { currency: 'eur', symbol: '€', label: 'EUR', detective: 399, obsesivo: 999, isZeroDecimal: false },
  BE: { currency: 'eur', symbol: '€', label: 'EUR', detective: 399, obsesivo: 999, isZeroDecimal: false },
  AT: { currency: 'eur', symbol: '€', label: 'EUR', detective: 399, obsesivo: 999, isZeroDecimal: false },
  IE: { currency: 'eur', symbol: '€', label: 'EUR', detective: 399, obsesivo: 999, isZeroDecimal: false },
  FI: { currency: 'eur', symbol: '€', label: 'EUR', detective: 399, obsesivo: 999, isZeroDecimal: false },
  GR: { currency: 'eur', symbol: '€', label: 'EUR', detective: 399, obsesivo: 999, isZeroDecimal: false },
  PL: { currency: 'eur', symbol: '€', label: 'EUR', detective: 399, obsesivo: 999, isZeroDecimal: false },
  SE: { currency: 'eur', symbol: '€', label: 'EUR', detective: 399, obsesivo: 999, isZeroDecimal: false },
  NO: { currency: 'eur', symbol: '€', label: 'EUR', detective: 399, obsesivo: 999, isZeroDecimal: false },
  DK: { currency: 'eur', symbol: '€', label: 'EUR', detective: 399, obsesivo: 999, isZeroDecimal: false },
  CH: { currency: 'eur', symbol: '€', label: 'EUR', detective: 399, obsesivo: 999, isZeroDecimal: false },

  // UK
  GB: { currency: 'gbp', symbol: '£', label: 'GBP', detective: 399, obsesivo: 999, isZeroDecimal: false },

  // USA + dolarizados
  US: { currency: 'usd', symbol: '$', label: 'USD', detective: 449, obsesivo: 1099, isZeroDecimal: false },
  CA: { currency: 'usd', symbol: '$', label: 'USD', detective: 449, obsesivo: 1099, isZeroDecimal: false },
  AU: { currency: 'usd', symbol: '$', label: 'USD', detective: 449, obsesivo: 1099, isZeroDecimal: false },
  EC: { currency: 'usd', symbol: '$', label: 'USD', detective: 449, obsesivo: 1099, isZeroDecimal: false },
  PA: { currency: 'usd', symbol: '$', label: 'USD', detective: 449, obsesivo: 1099, isZeroDecimal: false },
  SV: { currency: 'usd', symbol: '$', label: 'USD', detective: 449, obsesivo: 1099, isZeroDecimal: false },
  VE: { currency: 'usd', symbol: '$', label: 'USD', detective: 449, obsesivo: 1099, isZeroDecimal: false },

  // México
  MX: { currency: 'mxn', symbol: '$', label: 'MXN', detective: 6999, obsesivo: 19999, isZeroDecimal: false },

  // Colombia (zero-decimal en Stripe)
  CO: { currency: 'cop', symbol: '$', label: 'COP', detective: 1590000, obsesivo: 3990000, isZeroDecimal: true },

  // Argentina (zero-decimal en Stripe)
  AR: { currency: 'ars', symbol: '$', label: 'ARS', detective: 390000, obsesivo: 990000, isZeroDecimal: true },

  // Chile (zero-decimal en Stripe)
  CL: { currency: 'clp', symbol: '$', label: 'CLP', detective: 3990, obsesivo: 9990, isZeroDecimal: true },

  // Perú
  PE: { currency: 'pen', symbol: 'S/', label: 'PEN', detective: 1590, obsesivo: 3990, isZeroDecimal: false },

  // Bolivia
  BO: { currency: 'bob', symbol: 'Bs', label: 'BOB', detective: 3090, obsesivo: 7490, isZeroDecimal: false },

  // Paraguay (zero-decimal en Stripe)
  PY: { currency: 'pyg', symbol: '₲', label: 'PYG', detective: 3290000, obsesivo: 7990000, isZeroDecimal: true },

  // Uruguay
  UY: { currency: 'uyu', symbol: '$', label: 'UYU', detective: 17900, obsesivo: 44900, isZeroDecimal: false },

  // República Dominicana
  DO: { currency: 'dop', symbol: 'RD$', label: 'DOP', detective: 2690, obsesivo: 6590, isZeroDecimal: false },

  // Costa Rica
  CR: { currency: 'crc', symbol: '₡', label: 'CRC', detective: 23900, obsesivo: 57900, isZeroDecimal: false },

  // Guatemala
  GT: { currency: 'gtq', symbol: 'Q', label: 'GTQ', detective: 349, obsesivo: 849, isZeroDecimal: false },

  // Honduras
  HN: { currency: 'hnl', symbol: 'L', label: 'HNL', detective: 1099, obsesivo: 2690, isZeroDecimal: false },

  // Nicaragua
  NI: { currency: 'nio', symbol: 'C$', label: 'NIO', detective: 1640, obsesivo: 3990, isZeroDecimal: false },
}

const DEFAULT_PRICING: CountryPricing = {
  currency: 'usd', symbol: '$', label: 'USD', detective: 449, obsesivo: 1099, isZeroDecimal: false
}

function formatPrice(amount: number, currency: string, isZeroDecimal: boolean): string {
  const value = isZeroDecimal ? amount : amount / 100

  // Formato limpio para mostrar en UI (sin código de moneda feo)
  const symbolMap: Record<string, string> = {
    eur: '€', usd: '$', gbp: '£', mxn: '$',
    cop: '$', ars: '$', clp: '$', pen: 'S/',
    bob: 'Bs', pyg: '₲', uyu: '$', dop: 'RD$',
    crc: '₡', gtq: 'Q', hnl: 'L', nio: 'C$',
  }
  const symbol = symbolMap[currency.toLowerCase()] || currency.toUpperCase()

  // Para monedas zero-decimal o sin centavos relevantes, mostrar sin decimales
  const showDecimals = !isZeroDecimal && (value % 1 !== 0)

  const formattedNumber = showDecimals
    ? value.toFixed(2).replace('.', ',')
    : Math.round(value).toLocaleString('es-ES')

  // Símbolo delante para la mayoría, detrás para EUR
  if (currency === 'eur') {
    return `${formattedNumber} €`
  }
  if (['pen', 'bob', 'crc', 'gtq', 'hnl', 'nio', 'dop', 'uyu'].includes(currency)) {
    return `${symbol} ${formattedNumber}`
  }
  return `${symbol}${formattedNumber}`
}

export function getPricingForCountry(country: string): CountryPricing {
  return PRICING[country.toUpperCase()] ?? DEFAULT_PRICING
}

export async function GET(req: NextRequest) {
  const country = req.headers.get('x-vercel-ip-country') ||
                  req.nextUrl.searchParams.get('country') ||
                  'US'

  const pricing = getPricingForCountry(country)

  return NextResponse.json({
    country: country.toUpperCase(),
    currency: pricing.currency,
    symbol: pricing.symbol,
    label: pricing.label,
    detective: pricing.detective,
    obsesivo: pricing.obsesivo,
    isZeroDecimal: pricing.isZeroDecimal,
    detectiveFormatted: formatPrice(pricing.detective, pricing.currency, pricing.isZeroDecimal),
    obsesivoFormatted: formatPrice(pricing.obsesivo, pricing.currency, pricing.isZeroDecimal),
  })
}
