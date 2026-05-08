import type { CurrentPrice, SavingsRow, TotalSavings, UserPurchase } from '@/lib/types'

export function getBestPrices(prices: CurrentPrice[]) {
  return prices.reduce<Record<string, CurrentPrice>>((acc, price) => {
    const current = acc[price.product_id]
    if (!current || price.price < current.price) {
      acc[price.product_id] = price
    }

    return acc
  }, {})
}

export function getSavingsReport(
  purchases: UserPurchase[],
  prices: CurrentPrice[]
): SavingsRow[] {
  const bestByProduct = getBestPrices(prices)

  return purchases
    .map((purchase) => {
      const best = bestByProduct[purchase.product_id]
      if (!best || best.price >= purchase.current_price) {
        return null
      }

      const savingAbs = purchase.current_price - best.price
      const savingPct = (savingAbs / purchase.current_price) * 100

      return {
        product_name: purchase.product_name,
        current_supplier: purchase.current_supplier,
        current_price: purchase.current_price,
        best_supplier: best.supplier_name,
        best_price: best.price,
        saving_pct: round(savingPct),
        saving_abs: round(savingAbs),
        delivery_days: best.delivery_days
      }
    })
    .filter((row): row is SavingsRow => Boolean(row))
    .sort((a, b) => b.saving_pct - a.saving_pct)
}

export function getTotalSavings(
  purchases: UserPurchase[],
  report: SavingsRow[],
  monthlySpend: number
): TotalSavings {
  const currentPriceSum = purchases.reduce((sum, item) => sum + item.current_price, 0)

  if (!currentPriceSum || monthlySpend <= 0) {
    return {
      current_total: monthlySpend,
      optimized_total: monthlySpend,
      total_saving_pct: 0,
      total_saving_abs: 0,
      top_product_name: null,
      top_product_saving: null
    }
  }

  const reportByProduct = new Map(report.map((item) => [item.product_name, item]))

  const optimizedTotal = purchases.reduce((sum, purchase) => {
    const row = reportByProduct.get(purchase.product_name)
    const bestPrice = row?.best_price ?? purchase.current_price
    const productSpend = monthlySpend * (purchase.current_price / currentPriceSum)

    return sum + productSpend * (bestPrice / purchase.current_price)
  }, 0)

  const savingAbs = monthlySpend - optimizedTotal
  const top = report[0]

  return {
    current_total: round(monthlySpend),
    optimized_total: round(optimizedTotal),
    total_saving_pct: round((savingAbs / monthlySpend) * 100),
    total_saving_abs: round(savingAbs),
    top_product_name: top?.product_name ?? null,
    top_product_saving: top?.saving_pct ?? null
  }
}

function round(value: number) {
  return Math.round(value * 100) / 100
}
