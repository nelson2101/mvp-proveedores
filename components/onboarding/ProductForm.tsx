'use client'

import { useEffect, useMemo } from 'react'
import { Input } from '@/components/ui/input'
import { useOnboardingStore, type SelectedProduct } from '@/store/onboarding.store'
import type { CurrentPrice } from '@/lib/types'

const STORAGE_KEY = 'selected_products'

function loadStoredProducts(): SelectedProduct[] {
  if (typeof window === 'undefined') {
    return []
  }

  try {
    const raw = window.localStorage.getItem(STORAGE_KEY)
    if (!raw) {
      return []
    }

    return JSON.parse(raw) as SelectedProduct[]
  } catch {
    return []
  }
}

export function ProductForm({ prices }: { prices: CurrentPrice[] }) {
  const selectedProducts = useOnboardingStore((state) => state.selectedProducts)
  const setQuantity = useOnboardingStore((state) => state.setQuantity)
  const loadProducts = useOnboardingStore((state) => state.loadProducts)

  useEffect(() => {
    if (selectedProducts.length === 0) {
      const stored = loadStoredProducts()
      if (stored.length > 0) {
        loadProducts(stored)
      }
    }
  }, [selectedProducts.length, loadProducts])

  const products = useMemo(() => {
    const map = new Map<string, CurrentPrice>()

    prices.forEach((price) => {
      if (!map.has(price.product_id)) {
        map.set(price.product_id, price)
      }
    })

    return Array.from(map.values()).sort((a, b) =>
      a.product_name.localeCompare(b.product_name)
    )
  }, [prices])

  return (
    <form className="rounded-lg border border-border bg-white shadow-panel">
      <div className="border-b border-border px-5 py-4">
        <h2 className="font-bold">Seleccioná los productos y cantidades</h2>
        <p className="mt-1 text-sm text-slate-600">
          No es necesario ingresar precios. El sistema comparará las mejores opciones disponibles por producto.
        </p>
      </div>

      <div className="overflow-x-auto">
        <table className="w-full min-w-[720px] border-collapse text-left text-sm">
          <thead className="bg-muted text-slate-700">
            <tr>
              <th className="px-5 py-3 font-semibold">Producto</th>
              <th className="px-5 py-3 font-semibold">Categoría</th>
              <th className="px-5 py-3 font-semibold">Cantidad</th>
              <th className="px-5 py-3 font-semibold">Precio referencia</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-border">
            {products.map((product) => {
              const selected = selectedProducts.find(
                (item) => item.productId === product.product_id
              )
              const quantity = selected?.quantity ?? 0

              return (
                <tr key={product.product_id}>
                  <td className="px-5 py-4 font-semibold">{product.product_name}</td>
                  <td className="px-5 py-4 text-slate-600 capitalize">{product.category}</td>
                  <td className="px-5 py-4">
                    <Input
                      className="max-w-[100px]"
                      inputMode="numeric"
                      min="0"
                      step="1"
                      type="number"
                      value={quantity}
                      onChange={(event) =>
                        setQuantity(
                          product.product_id,
                          product.product_name,
                          Number(event.target.value) || 0
                        )
                      }
                    />
                  </td>
                  <td className="px-5 py-4 text-slate-600">{`$${product.price.toFixed(2)}`}</td>
                </tr>
              )
            })}
          </tbody>
        </table>
      </div>

      <div className="flex justify-end border-t border-border px-5 py-4 text-sm text-slate-600">
        Seleccioná una cantidad mayor que cero para cada producto que comprás.
      </div>
    </form>
  )
}
