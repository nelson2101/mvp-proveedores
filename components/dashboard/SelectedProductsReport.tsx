'use client'

import { useMemo } from 'react'
import { Panel } from '@/components/ui/panel'
import { useOnboardingStore } from '@/store/onboarding.store'
import { formatCurrency } from '@/lib/utils/format'
import type { CurrentPrice } from '@/lib/types'

export function SelectedProductsReport({ prices }: { prices: CurrentPrice[] }) {
  const selectedProducts = useOnboardingStore((state) => state.selectedProducts)

  type ReportRow = {
    productName: string
    quantity: number
    bestSupplier: string
    bestPrice: number
    deliveryDays: string[]
    totalCost: number
  }

  const rows = useMemo<ReportRow[]>(() => {
    const bestByProduct = prices.reduce<Record<string, CurrentPrice>>((acc, price) => {
      const current = acc[price.product_id]
      if (!current || price.price < current.price) {
        acc[price.product_id] = price
      }
      return acc
    }, {})

    return selectedProducts
      .map((product) => {
        const best = bestByProduct[product.productId]
        if (!best) {
          return null
        }

        return {
          productName: product.productName,
          quantity: product.quantity,
          bestSupplier: best.supplier_name,
          bestPrice: best.price,
          deliveryDays: best.delivery_days,
          totalCost: product.quantity * best.price
        }
      })
      .filter((row): row is ReportRow => Boolean(row))
  }, [prices, selectedProducts])

  const totalCost = useMemo(
    () => rows.reduce((sum, item) => sum + item.totalCost, 0),
    [rows]
  )

  if (selectedProducts.length === 0) {
    return (
      <Panel>
        <div className="space-y-4">
          <h2 className="text-xl font-bold">No hay productos seleccionados</h2>
          <p className="text-slate-600">
            Elegí los productos y las cantidades que comprás en la página de configuración.
          </p>
        </div>
      </Panel>
    )
  }

  return (
    <div className="grid gap-4 lg:grid-cols-[1.2fr_0.8fr]">
      <Panel>
        <div className="space-y-4">
          <div className="text-sm uppercase tracking-wide text-primary">
            Para los productos y cantidades que seleccionaste,
          </div>
          <h2 className="text-3xl font-bold">las mejores opciones de compra son estas</h2>
          <p className="text-slate-600">
            El sistema eligió el mejor proveedor disponible para cada producto en base al precio unitario.
          </p>
          <div className="rounded-2xl bg-slate-50 p-4">
            <div className="text-sm text-slate-600">Costo total estimado</div>
            <div className="mt-1 text-3xl font-bold">{formatCurrency(totalCost)}</div>
          </div>
        </div>
      </Panel>

      <div className="overflow-hidden rounded-lg border border-border bg-white shadow-panel">
        <div className="border-b border-border px-5 py-4">
          <h2 className="font-bold">Resumen por producto</h2>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full min-w-[680px] border-collapse text-left text-sm">
            <thead className="bg-muted text-slate-700">
              <tr>
                <th className="px-5 py-3 font-semibold">Producto</th>
                <th className="px-5 py-3 font-semibold">Cantidad</th>
                <th className="px-5 py-3 font-semibold">Proveedor</th>
                <th className="px-5 py-3 font-semibold">Precio unitario</th>
                <th className="px-5 py-3 font-semibold">Entrega</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((row) => (
                <tr key={row.productName} className="border-t border-border">
                  <td className="px-5 py-4 font-semibold">{row.productName}</td>
                  <td className="px-5 py-4">{row.quantity}</td>
                  <td className="px-5 py-4">{row.bestSupplier}</td>
                  <td className="px-5 py-4">{formatCurrency(row.bestPrice)}</td>
                  <td className="px-5 py-4 capitalize text-slate-600">
                    {row.deliveryDays.slice(0, 3).join(', ')}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  )
}
