import { createAdminClient } from '@/lib/supabase/admin'
import { hasRedisEnv } from '@/lib/env'
import { Redis } from '@upstash/redis'
import { NextResponse } from 'next/server'

export async function GET(req: Request) {
  // Verificar que la llamada viene de Vercel Cron
  const authHeader = req.headers.get('authorization')
  const cronSecret = process.env.CRON_SECRET

  if (!cronSecret || authHeader !== `Bearer ${cronSecret}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const supabase = createAdminClient()
  if (!supabase) {
    return NextResponse.json({ error: 'Supabase not configured' }, { status: 500 })
  }

  // Leer vista completa de precios
  const { data, error } = await supabase
    .from('v_current_prices')
    .select('*')

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  const today = new Date().toISOString().split('T')[0]
  const cacheKey = `prices:snapshot:${today}`

  // Guardar en Redis si está configurado
  if (hasRedisEnv()) {
    const redis = Redis.fromEnv()
    await redis.set(cacheKey, JSON.stringify(data), { ex: 90000 }) // 25 horas
  }

  return NextResponse.json({
    ok: true,
    count: data.length,
    date: today,
    cached: hasRedisEnv()
  })
}