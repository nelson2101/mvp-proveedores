import { TrendingDown } from 'lucide-react'
import { Panel } from '@/components/ui/panel'
import { formatCurrency, formatPercent } from '@/lib/utils/format'
import type { TotalSavings } from '@/lib/types'

export function SavingsPanel({ total }: { total: TotalSavings }) {
  return (
    <Panel>
      <div className="mb-4 flex items-center gap-2 text-sm font-semibold uppercase text-primary">
        <TrendingDown size={18} aria-hidden="true" />
        Ahorro potencial
      </div>
      <dl className="space-y-4">
        <div>
          <dt className="text-sm text-slate-600">Gasto mensual actual</dt>
          <dd className="text-2xl font-bold">{formatCurrency(total.current_total)}</dd>
        </div>
        <div>
          <dt className="text-sm text-slate-600">Podrías gastar</dt>
          <dd className="text-3xl font-bold text-primary">
            {formatCurrency(total.optimized_total)}
          </dd>
        </div>
        <div className="rounded-md bg-emerald-50 p-3">
          <dt className="text-sm text-emerald-800">Ahorro estimado</dt>
          <dd className="font-bold text-emerald-900">
            {formatCurrency(total.total_saving_abs)} por mes ({formatPercent(total.total_saving_pct)})
          </dd>
        </div>
      </dl>
    </Panel>
  )
}
