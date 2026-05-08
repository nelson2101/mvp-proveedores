'use client'

import { create } from 'zustand'

const STORAGE_KEY = 'selected_products'

type SelectedProduct = {
  productId: string
  productName: string
  quantity: number
}

type OnboardingState = {
  selectedProducts: SelectedProduct[]
  setQuantity: (productId: string, productName: string, quantity: number) => void
  loadProducts: (products: SelectedProduct[]) => void
  clearProducts: () => void
}

function persistProducts(products: SelectedProduct[]) {
  if (typeof window === 'undefined') {
    return
  }

  window.localStorage.setItem(STORAGE_KEY, JSON.stringify(products))
}

export const useOnboardingStore = create<OnboardingState>((set) => ({
  selectedProducts: [],
  setQuantity: (productId, productName, quantity) =>
    set((state) => {
      const remaining = state.selectedProducts.filter((item) => item.productId !== productId)
      const next =
        quantity > 0
          ? [...remaining, { productId, productName, quantity }]
          : remaining

      persistProducts(next)
      return { selectedProducts: next }
    }),
  loadProducts: (products) => {
    persistProducts(products)
    return { selectedProducts: products }
  },
  clearProducts: () => {
    persistProducts([])
    return { selectedProducts: [] }
  }
}))
