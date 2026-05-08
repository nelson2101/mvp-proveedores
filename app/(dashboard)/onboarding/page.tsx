import { ProductForm } from '@/components/onboarding/ProductForm'
import { getCurrentPrices } from '@/lib/repositories/prices.repo'

export const dynamic = 'force-dynamic'

export default async function OnboardingPage() {
  const { data: prices } = await getCurrentPrices()

  return (
    <main className="mx-auto max-w-6xl px-4 py-8">
      <div className="mb-6">
        <p className="text-sm uppercase tracking-wide text-slate-600">Configuración inicial</p>
        <h1 className="text-3xl font-bold">Seleccioná tus productos y cantidades</h1>
      </div>

      <div className="mt-5">
        <ProductForm prices={prices} />
      </div>
    </main>
  )
}
