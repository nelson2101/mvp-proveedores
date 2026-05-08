'use client'

import { FormEvent, useState } from 'react'
import { useRouter } from 'next/navigation'
import { Store } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { createClient } from '@/lib/supabase/client'
import { hasSupabaseBrowserEnv } from '@/lib/env'

type AuthFormProps = {
  mode: 'login' | 'register'
}

export function AuthForm({ mode }: AuthFormProps) {
  const router = useRouter()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [businessName, setBusinessName] = useState('')
  const [message, setMessage] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)
  const isRegister = mode === 'register'
  const hasEnv = hasSupabaseBrowserEnv()

  async function onSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()

    if (!hasEnv) {
      setMessage('Faltan las claves públicas de Supabase. Mientras tanto podés ver el dashboard demo.')
      router.push('/dashboard')
      return
    }

    setLoading(true)
    setMessage(null)

    const supabase = createClient()
    const result = isRegister
      ? await supabase.auth.signUp({
          email,
          password,
          options: {
            data: { business_name: businessName || 'Mi comercio' }
          }
        })
      : await supabase.auth.signInWithPassword({ email, password })

    setLoading(false)

    if (result.error) {
      setMessage(result.error.message)
      return
    }

    router.push('/dashboard')
    router.refresh()
  }

  return (
    <main className="flex min-h-screen items-center justify-center px-4 py-8">
      <form
        onSubmit={onSubmit}
        className="w-full max-w-sm rounded-lg border border-border bg-white p-6 shadow-panel"
      >
        <div className="mb-6 flex items-center gap-3">
          <span className="grid h-10 w-10 place-items-center rounded-md bg-primary text-white">
            <Store size={22} aria-hidden="true" />
          </span>
          <div>
            <h1 className="text-xl font-bold">
              {isRegister ? 'Crear comercio' : 'Ingresar'}
            </h1>
            <p className="text-sm text-slate-600">Precio Mayor</p>
          </div>
        </div>

        <div className="space-y-4">
          {isRegister ? (
            <label className="block text-sm font-medium">
              Nombre del comercio
              <Input
                className="mt-1"
                value={businessName}
                onChange={(event) => setBusinessName(event.target.value)}
                placeholder="Almacén Don Pedro"
              />
            </label>
          ) : null}

          <label className="block text-sm font-medium">
            Email
            <Input
              className="mt-1"
              type="email"
              required
              value={email}
              onChange={(event) => setEmail(event.target.value)}
              placeholder="tu@email.com"
            />
          </label>

          <label className="block text-sm font-medium">
            Contraseña
            <Input
              className="mt-1"
              type="password"
              required
              minLength={6}
              value={password}
              onChange={(event) => setPassword(event.target.value)}
            />
          </label>
        </div>

        {message ? <p className="mt-4 text-sm text-danger">{message}</p> : null}

        <Button className="mt-6 w-full" type="submit" disabled={loading}>
          {loading ? 'Procesando...' : isRegister ? 'Registrarme' : 'Entrar'}
        </Button>

        <a
          className="mt-4 block text-center text-sm text-primary"
          href={isRegister ? '/login' : '/register'}
        >
          {isRegister ? 'Ya tengo cuenta' : 'Crear una cuenta'}
        </a>
      </form>
    </main>
  )
}
