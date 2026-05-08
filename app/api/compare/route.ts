import { NextResponse } from 'next/server'
import { getCurrentPrices } from '@/lib/repositories/prices.repo'
import { getUserPurchases } from '@/lib/repositories/purchases.repo'
import { getSavingsReport, getTotalSavings } from '@/lib/utils/calculations'

export const dynamic = 'force-dynamic'

export async function GET(request: Request) {
  try {
    const url = new URL(request.url)
    const monthlySpend = Number(url.searchParams.get('monthlySpend') ?? 450000)
    const [{ data: prices }, purchases] = await Promise.all([
      getCurrentPrices(),
      getUserPurchases()
    ])
    const report = getSavingsReport(purchases, prices)
    const total = getTotalSavings(purchases, report, monthlySpend)

    return NextResponse.json({ total, rows: report })
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'No se pudo calcular el ahorro.' },
      { status: 500 }
    )
  }
}
