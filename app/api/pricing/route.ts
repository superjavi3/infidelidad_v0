import { NextRequest, NextResponse } from 'next/server'

export interface CountryPricing {
  currency: string
  symbol: string
  label: string
  premium: number
  isZeroDecimal: boolean
}

const PRICING: Record<string, CountryPricing> = {
  // Europa
  ES: { currency: 'eur', symbol: '€', label: 'EUR', premium: 499, isZeroDecimal: false },
  PT: { currency: 'eur', symbol: '€', label: 'EUR', premium: 499, isZeroDecimal: false },
  IT: { currency: 'eur', symbol: '€', label: 'EUR', premium: 499, isZeroDecimal: false },
  FR: { currency: 'eur', symbol: '€', label: 'EUR', premium: 499, isZeroDecimal: false },
  DE: { currency: 'eur', symbol: '€', label: 'EUR', premium: 499, isZeroDecimal: false },
  NL: { currency: 'eur', symbol: '€', label: 'EUR', premium: 499, isZeroDecimal: false },
  BE: { currency: 'eur', symbol: '€', label: 'EUR', premium: 499, isZeroDecimal: false },
  AT: { currency: 'eur', symbol: '€', label: 'EUR', premium: 499, isZeroDecimal: false },
  IE: { currency: 'eur', symbol: '€', label: 'EUR', premium: 499, isZeroDecimal: false },
  FI: { currency: 'eur', symbol: '€', label: 'EUR', premium: 499, isZeroDecimal: false },
  GR: { currency: 'eur', symbol: '€', label: 'EUR', premium: 499, isZeroDecimal: false },
  PL: { currency: 'eur', symbol: '€', label: 'EUR', premium: 499, isZeroDecimal: false },
  SE: { currency: 'eur', symbol: '€', label: 'EUR', premium: 499, isZeroDecimal: false },
  NO: { currency: 'eur', symbol: '€', label: 'EUR', premium: 499, isZeroDecimal: false },
  DK: { currency: 'eur', symbol: '€', label: 'EUR', premium: 499, isZeroDecimal: false },
  CH: { currency: 'eur', symbol: '€', label: 'EUR', premium: 499, isZeroDecimal: false },

  // UK
  GB: { currency: 'gbp', symbol: '£', label: 'GBP', premium: 499, isZeroDecimal: false },

  // USA + dolarizados
  US: { currency: 'usd', symbol: '$', label: 'USD', premium: 599, isZeroDecimal: false },
  CA: { currency: 'usd', symbol: '$', label: 'USD', premium: 599, isZeroDecimal: false },
  AU: { currency: 'usd', symbol: '$', label: 'USD', premium: 599, isZeroDecimal: false },
  EC: { currency: 'usd', symbol: '$', label: 'USD', premium: 599, isZeroDecimal: false },
  PA: { currency: 'usd', symbol: '$', label: 'USD', premium: 599, isZeroDecimal: false },
  SV: { currency: 'usd', symbol: '$', label: 'USD', premium: 599, isZeroDecimal: false },
  VE: { currency: 'usd', symbol: '$', label: 'USD', premium: 599, isZeroDecimal: false },

  // México
  MX: { currency: 'mxn', symbol: '$', label: 'MXN', premium: 9900, isZeroDecimal: false },

  // Colombia (zero-decimal en Stripe)
  CO: { currency: 'cop', symbol: '$', label: 'COP', premium: 1990000, isZeroDecimal: true },

  // Argentina (zero-decimal en Stripe)
  AR: { currency: 'ars', symbol: '$', label: 'ARS', premium: 590000, isZeroDecimal: true },

  // Chile (zero-decimal en Stripe)
  CL: { currency: 'clp', symbol: '$', label: 'CLP', premium: 5990, isZeroDecimal: true },

  // Perú
  PE: { currency: 'pen', symbol: 'S/', label: 'PEN', premium: 2390, isZeroDecimal: false },

  // Bolivia
  BO: { currency: 'bob', symbol: 'Bs', label: 'BOB', premium: 4990, isZeroDecimal: false },

  // Paraguay (zero-decimal en Stripe)
  PY: { currency: 'pyg', symbol: '₲', label: 'PYG', premium: 4990000, isZeroDecimal: true },

  // Uruguay
  UY: { currency: 'uyu', symbol: '$', label: 'UYU', premium: 27900, isZeroDecimal: false },

  // República Dominicana
  DO: { currency: 'dop', symbol: 'RD$', label: 'DOP', premium: 3990, isZeroDecimal: false },

  // Costa Rica
  CR: { currency: 'crc', symbol: '₡', label: 'CRC', premium: 34900, isZeroDecimal: false },

  // Guatemala
  GT: { currency: 'gtq', symbol: 'Q', label: 'GTQ', premium: 499, isZeroDecimal: false },

  // Honduras
  HN: { currency: 'hnl', symbol: 'L', label: 'HNL', premium: 1690, isZeroDecimal: false },

  // Nicaragua
  NI: { currency: 'nio', symbol: 'C$', label: 'NIO', premium: 2490, isZeroDecimal: false },
}

const DEFAULT_PRICING: CountryPricing = {
  currency: 'usd', symbol: '$', label: 'USD', premium: 599, isZeroDecimal: false
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
  const premiumFormatted = formatPrice(pricing.premium, pricing.currency, pricing.isZeroDecimal)

  return NextResponse.json({
    country: country.toUpperCase(),
    currency: pricing.currency,
    symbol: pricing.symbol,
    label: pricing.label,
    premium: pricing.premium,
    premiumFormatted,
    isZeroDecimal: pricing.isZeroDecimal,
    // Legacy aliases para deploy seguro
    detective: pricing.premium,
    obsesivo: pricing.premium,
    groupCompleto: pricing.premium,
    detectiveFormatted: premiumFormatted,
    obsesivoFormatted: premiumFormatted,
    groupCompletoFormatted: premiumFormatted,
  })
}
