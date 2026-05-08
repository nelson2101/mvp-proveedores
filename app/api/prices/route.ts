import { NextResponse } from 'next/server'
import { getCurrentPrices } from '@/lib/repositories/prices.repo'

export const dynamic = 'force-dynamic'

export async function GET() {
  try {
    const result = await getCurrentPrices()
    return NextResponse.json(result)
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'No se pudieron leer precios.' },
      { status: 500 }
    )
  }
}
