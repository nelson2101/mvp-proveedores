import Link from 'next/link'
import { BarChart3, PackageSearch, Store } from 'lucide-react'

export default function DashboardLayout({
  children
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <div className="min-h-screen">
      <header className="border-b border-border bg-white">
        <div className="mx-auto flex max-w-6xl items-center justify-between px-4 py-4">
          <Link href="/dashboard" className="flex items-center gap-3 font-bold">
            <span className="grid h-9 w-9 place-items-center rounded-md bg-primary text-white">
              <Store size={20} aria-hidden="true" />
            </span>
            Precio Mayor
          </Link>

          <nav className="flex items-center gap-2 text-sm">
            <Link
              className="inline-flex items-center gap-2 rounded-md px-3 py-2 hover:bg-muted"
              href="/dashboard"
            >
              <BarChart3 size={17} aria-hidden="true" />
              Panel
            </Link>
            <Link
              className="inline-flex items-center gap-2 rounded-md px-3 py-2 hover:bg-muted"
              href="/onboarding"
            >
              <PackageSearch size={17} aria-hidden="true" />
              Compras
            </Link>
          </nav>
        </div>
      </header>
      {children}
    </div>
  )
}
