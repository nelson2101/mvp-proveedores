# 📦 MVP — Comparador de Precios para Comercios

> **Versión:** 1.0 — MVP  
> **Stack:** Next.js 16 · Supabase · Python (parser) · Vercel  
> **Objetivo:** Permitir a comerciantes minoristas detectar diferencias de precio entre proveedores mayoristas y tomar decisiones de compra más rentables.

---

## Estado de implementación — 08/05/2026

### Listo en esta carpeta

- [x] Proyecto Next.js 16 creado con TypeScript, Tailwind, rutas App Router y configuración de Vercel Cron.
- [x] Pantallas base creadas: login, registro, dashboard, onboarding de compras y carga de proveedor privado.
- [x] Modo demo agregado para poder abrir la app sin depender todavía de Supabase, Upstash ni Vercel.
- [x] Clientes de Supabase preparados para browser, server y service role.
- [x] Redis/Upstash preparado para cache diaria con fallback a datos demo.
- [x] Endpoints creados: `/api/prices`, `/api/compare`, `/api/refresh`, `/api/upload` y `/api/cron/daily-snapshot`.
- [x] Componentes del dashboard creados: ahorro potencial, mayor diferencia y tabla de precios.
- [x] Store de onboarding creado con Zustand.
- [x] Migraciones SQL creadas en `supabase/migrations`.
- [x] Seed SQL creado en `supabase/seed.sql`.
- [x] Parser Python creado en `parser/price_parser.py`, con soporte PDF, XLS y XLSX.
- [x] Variables de entorno documentadas en `.env.example`.
- [x] Validación ejecutada: `npm run lint`, `npm run typecheck`, `npm run build`, `npm audit --omit=dev` y `python -m py_compile parser\price_parser.py`.
- [x] Verificación visual local hecha en `http://127.0.0.1:3000/dashboard` y `/onboarding`.

### Pendiente manual

- [x] Crear proyecto en Supabase.
- [x] Ejecutar migraciones SQL y `seed.sql` en Supabase.
- [ ] Crear cuenta/proyecto en Upstash Redis y cargar sus variables.
- [ ] Crear `CRON_SECRET` y configurarlo en Vercel.
- [ ] Cargar `.env.local` real a partir de `.env.example`.
- [ ] Configurar GitHub Actions secrets `SUPABASE_URL` y `SUPABASE_SERVICE_ROLE_KEY`.
- [ ] Desplegar en Vercel y habilitar el workflow diario.
- [x] Eliminar el formulario `/suppliers/upload`; ya no forma parte del flujo del producto.
- [x] **Pipeline automático SEPA implementado**: Script `scripts/update_sepa.py` y workflow GitHub Actions `.github/workflows/update_sepa.yml` para ETL diario automático.

- [x] **Acceso abierto**: la app ahora está pensada para que cualquier persona pueda seleccionar productos y cantidades sin iniciar sesión.

### Fallas o contradicciones detectadas y corregidas

- [x] El documento mezclaba `SUPABASE_URL` con `NEXT_PUBLIC_SUPABASE_URL`; el proyecto usa `NEXT_PUBLIC_SUPABASE_URL` para cliente/servidor y `SUPABASE_SERVICE_ROLE_KEY` solo en servidor.
- [x] La vista global `v_best_price_per_product` podía mezclar proveedores privados entre usuarios si se usaba dentro de funciones con privilegios elevados. Se reemplazó por `fn_best_prices_for_user(p_user_id)`, que filtra por usuario.
- [x] Las funciones `fn_savings_report` y `fn_total_savings` aceptaban cualquier `p_user_id`. Ahora verifican `auth.uid()` antes de devolver datos.
- [x] `UNIQUE(price_list_id, product_id, brand)` permitía duplicados cuando `brand` era `NULL`. Se corrigió con índice único `NULLS NOT DISTINCT`.
- [x] El parser del documento no importaba `date`, no leía variables de entorno y parseaba mal precios argentinos como `1.200,50`. El archivo real corrige eso.
- [x] Se quitó la necesidad de `/api/auth`: Supabase Auth se maneja desde el cliente y `proxy.ts` con `@supabase/ssr`.
- [x] Se actualizó Next.js de 14 a 16 porque el auditor de dependencias reportaba vulnerabilidades en la rama 14. Se agregó override de `postcss` y el auditor quedó sin vulnerabilidades.
- [x] Se corrigió el manejo de fechas `YYYY-MM-DD` para que se muestren como fecha local argentina y no como UTC del día anterior.

---

## Pipeline Automático SEPA

Se implementó un ETL pipeline completamente automático para ingestar datasets SEPA Mayoristas diariamente.

### Arquitectura

- **Script principal**: `scripts/update_sepa.py` (Python standalone)
- **Scheduling**: GitHub Actions workflow (`.github/workflows/update_sepa.yml`)
- **Frecuencia**: Diaria (6 AM UTC)
- **Librerías**: requests, beautifulsoup4, pandas, rapidfuzz, supabase-py

### Flujo del Pipeline

1. **Descubrimiento**: Parsear HTML de https://datos.produccion.gob.ar/dataset/precios-claros-sepa-mayoristas para encontrar el ZIP más reciente (basado en nombre de día de la semana).
2. **Descarga**: Descargar ZIP a directorio temporal.
3. **Extracción**: Descomprimir y localizar CSV interno.
4. **Filtrado**: Aplicar reglas de productos relevantes (aceite, harina, arroz, etc.) usando regex.
5. **Normalización**: Fuzzy matching con catálogo de productos usando rapidfuzz (threshold 85%).
6. **Inserción**: Crear/actualizar supplier "SEPA Mayoristas", price_list y prices en Supabase.
7. **Logging**: Guardar logs en `logs/sepa_YYYY-MM-DD.log`.

- **Fuente de datos oficial**: El pipeline usa directamente el dataset SEPA oficial y no requiere otras fuentes externas manuales.

### Configuración

1. **Variables de entorno** (en GitHub Secrets):
   - `SUPABASE_URL`
   - `SUPABASE_SERVICE_ROLE_KEY`

2. **Ejecución manual**:
   ```bash
   npm run update:sepa
   ```

3. **GitHub Actions**:
   - Se ejecuta automáticamente diario.
   - Sube logs como artifacts en caso de fallo.

### Características

- **Idempotente**: Puede ejecutarse múltiples veces sin duplicados.
- **Tolerante a errores**: Continúa procesando filas válidas aunque algunas fallen.
- **Sin dependencias externas**: No usa Selenium ni scraping manual.
- **Escalable**: Inserta en batches de 500 para performance.

### Logs y Monitoreo

- Logs diarios en `logs/`.
- Métricas: filas totales, filas filtradas, productos insertados, tiempo de ejecución.
- Errores detallados para debugging.

### Simplificaciones aplicadas sin perder eficiencia real

- [x] La app puede funcionar en modo demo hasta que existan las credenciales externas. Esto evita bloquear desarrollo visual y de lógica por tareas manuales.
- [x] Para el MVP, el cache diario queda centralizado en `/api/prices` y `/api/cron/daily-snapshot`; no se agrega Supabase Realtime todavía porque no aporta valor crítico al primer flujo.
- [x] El dashboard calcula ahorros en TypeScript para modo demo y APIs, mientras las funciones SQL quedan disponibles para uso directo con Supabase.
- [x] Se mantiene Upstash Redis como cache externa simple; no se agrega una segunda capa de cache para evitar complejidad operativa.

---

## Tabla de contenidos

1. [Productos de mayor rotación](#1-productos-de-mayor-rotación)
2. [Proveedores del sistema](#2-proveedores-del-sistema)
3. [Arquitectura general](#3-arquitectura-general)
4. [Stack tecnológico y justificación](#4-stack-tecnológico-y-justificación)
5. [Esquema de base de datos (SQL)](#5-esquema-de-base-de-datos-sql)
6. [Flujo completo del sistema](#6-flujo-completo-del-sistema)
7. [Flujo de pantallas (UX)](#7-flujo-de-pantallas-ux)
8. [Lógica de negocio y cálculos](#8-lógica-de-negocio-y-cálculos)
9. [Parser de listas de precios](#9-parser-de-listas-de-precios)
10. [Sistema de caché y actualización diaria](#10-sistema-de-caché-y-actualización-diaria)
11. [Autenticación y multi-tenancy](#11-autenticación-y-multi-tenancy)
12. [Patrones de diseño aplicados](#12-patrones-de-diseño-aplicados)
13. [Estructura de carpetas del proyecto](#13-estructura-de-carpetas-del-proyecto)
14. [Variables de entorno](#14-variables-de-entorno)
15. [Roadmap post-MVP](#15-roadmap-post-mvp)

---

## 1. Productos de mayor rotación

Estos son los productos base del catálogo del MVP. Forman el **catálogo maestro** del sistema, desde el cual cada proveedor ofrece su subconjunto.

| # | Producto | Categoría |
|---|----------|-----------|
| 1 | Aceite | Despensa |
| 2 | Harina | Despensa |
| 3 | Azúcar | Despensa |
| 4 | Arroz | Despensa |
| 5 | Fideos | Despensa |
| 6 | Yerba mate | Infusiones |
| 7 | Leche | Lácteos |
| 8 | Gaseosas | Bebidas |
| 9 | Cerveza | Bebidas |
| 10 | Agua mineral | Bebidas |
| 11 | Detergente | Limpieza |
| 12 | Papel higiénico | Higiene |

> 💡 **Criterio de expansión:** se agregan categorías en función de la demanda de los comerciantes registrados.

---

## 2. Proveedores del sistema

### Mayoristas base (precargados en el sistema)

Estos proveedores se incorporan al sistema desde el día 0, con carga y parseo automatizado de sus listas:

| Proveedor | Tipo | Formato típico de lista |
|-----------|------|------------------------|
| Nini Mayorista | Mayorista regional | PDF / Excel |
| Vital | Mayorista regional | Excel / WhatsApp PDF |
| Makro | Cadena mayorista | Web scraping / PDF |
| Yaguar | Mayorista regional | Excel |

### Proveedor habitual del comerciante

Cada comerciante puede cargar **manualmente** sus propios proveedores. Estos son privados: solo ese usuario los ve. El sistema los procesa igual que los proveedores globales.

### Regla de visibilidad

```
Proveedores globales  →  visibles para TODOS los comerciantes
Proveedores privados  →  visibles SOLO para el comerciante que los cargó
```

---

## 3. Arquitectura general

```
┌─────────────────────────────────────────────────────────────────┐
│                        CLIENTE (Browser)                        │
│                    Next.js 16 — App Router                      │
│         Login · Onboarding · Dashboard · Comparador             │
└────────────────────┬────────────────────────────────────────────┘
                     │ HTTPS / REST / Supabase Auth
┌────────────────────▼────────────────────────────────────────────┐
│                     BACKEND / API LAYER                         │
│                  Next.js API Routes + Edge Functions            │
│                                                                 │
│  /api/auth        → login, register, session                    │
│  /api/prices      → leer precios desde caché                    │
│  /api/refresh     → forzar recarga de datos (botón manual)      │
│  /api/compare     → cálculo de ahorro potencial                 │
└────────┬──────────────────────────┬────────────────────────────┘
         │                          │
┌────────▼────────┐      ┌──────────▼──────────────┐
│   SUPABASE DB   │      │  PARSER SERVICE (Python) │
│                 │      │  (Vercel Serverless Fn   │
│  PostgreSQL     │      │   o servicio separado)   │
│  Auth           │      │                          │
│  Storage        │      │  - Parsea PDF/Excel       │
│  Row Level Sec. │      │  - Normaliza productos   │
└────────┬────────┘      │  - Inserta en Supabase   │
         │               └──────────────────────────┘
┌────────▼────────┐
│  CRON JOB       │
│  (Vercel Cron   │
│   o pg_cron)    │
│  Diario 8:00 AM │
│  → snapshot de  │
│    precios      │
└─────────────────┘
```

### Principio de diseño clave: **Read-Through Cache**

El sistema **no consulta Supabase en cada request del usuario**. En cambio:

1. A las 8:00 AM se ejecuta un job que lee toda la tabla de precios y la persiste en un **snapshot en memoria/cache** (Redis o Supabase Edge Cache).
2. Todas las consultas del día leen ese snapshot.
3. El botón "Actualizar" del usuario fuerza una nueva lectura directa a la DB y refresca el cache para ese usuario.

---

## 4. Stack tecnológico y justificación

| Capa | Tecnología | Por qué |
|------|-----------|---------|
| Frontend | Next.js 16 (App Router) | SSR nativo, rutas protegidas simples, deploy en Vercel |
| Estilos | Tailwind CSS + shadcn/ui | Velocidad de desarrollo, componentes accesibles |
| Base de datos | Supabase (PostgreSQL) | Auth integrada, Row Level Security, Storage para archivos |
| Auth | Supabase Auth | JWT, OAuth, magic link — sin código extra |
| Parser | Python (pandas + pdfplumber) | Mejor ecosistema para parseo de tablas PDF/Excel |
| Cron | Vercel Cron Jobs | Serverless, sin infraestructura adicional |
| Deploy | Vercel | CI/CD automático con GitHub |
| Cache | Upstash Redis (free tier) | TTL automático, 0 config, compatible con Edge |

---

## 5. Esquema de base de datos (SQL)

> **Estado actual:** los archivos fuente de verdad son `supabase/migrations/001_initial_schema.sql`, `002_rls_policies.sql`, `003_functions_views.sql` y `supabase/seed.sql`. El SQL de esta sección queda como referencia funcional, pero la implementación real corrige los riesgos multi-tenant marcados arriba.

### 5.1 Extensiones necesarias

```sql
-- Habilitar UUID como tipo por defecto
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Para búsqueda de texto sobre nombres de productos
CREATE EXTENSION IF NOT EXISTS pg_trgm;
```

### 5.2 Tabla: `profiles`
Extiende la tabla `auth.users` de Supabase. Un registro por comerciante.

```sql
CREATE TABLE public.profiles (
  id            UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  business_name TEXT NOT NULL,
  owner_name    TEXT,
  email         TEXT NOT NULL,
  plan          TEXT NOT NULL DEFAULT 'free' CHECK (plan IN ('free', 'pro')),
  created_at    TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at    TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Trigger: actualiza updated_at automáticamente
CREATE OR REPLACE FUNCTION update_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_profiles_updated_at
  BEFORE UPDATE ON public.profiles
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();
```

### 5.3 Tabla: `products` (catálogo maestro)

```sql
CREATE TABLE public.products (
  id           UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name         TEXT NOT NULL,
  slug         TEXT NOT NULL UNIQUE,   -- 'aceite', 'harina', etc.
  category     TEXT NOT NULL,
  unit         TEXT NOT NULL DEFAULT 'unidad',  -- kg, litro, unidad, pack
  is_active    BOOLEAN NOT NULL DEFAULT TRUE,
  created_at   TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Índice para búsqueda difusa por nombre
CREATE INDEX idx_products_name_trgm ON public.products USING gin(name gin_trgm_ops);

-- Datos semilla
INSERT INTO public.products (name, slug, category, unit) VALUES
  ('Aceite',          'aceite',          'Despensa',   'litro'),
  ('Harina',          'harina',          'Despensa',   'kg'),
  ('Azúcar',          'azucar',          'Despensa',   'kg'),
  ('Arroz',           'arroz',           'Despensa',   'kg'),
  ('Fideos',          'fideos',          'Despensa',   'kg'),
  ('Yerba mate',      'yerba-mate',      'Infusiones', 'kg'),
  ('Leche',           'leche',           'Lácteos',    'litro'),
  ('Gaseosas',        'gaseosas',        'Bebidas',    'unidad'),
  ('Cerveza',         'cerveza',         'Bebidas',    'unidad'),
  ('Agua mineral',    'agua-mineral',    'Bebidas',    'litro'),
  ('Detergente',      'detergente',      'Limpieza',   'litro'),
  ('Papel higiénico', 'papel-higienico', 'Higiene',    'pack');
```

### 5.4 Tabla: `suppliers` (proveedores)

```sql
CREATE TABLE public.suppliers (
  id            UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name          TEXT NOT NULL,
  slug          TEXT NOT NULL,
  is_global     BOOLEAN NOT NULL DEFAULT TRUE,  -- FALSE = proveedor privado del comerciante
  owner_id      UUID REFERENCES public.profiles(id) ON DELETE CASCADE,  -- NULL si global
  delivery_days TEXT[],   -- ['lunes','miércoles','viernes']
  source_type   TEXT CHECK (source_type IN ('pdf', 'excel', 'manual', 'scraping')),
  source_url    TEXT,     -- URL del archivo o sitio de origen
  is_active     BOOLEAN NOT NULL DEFAULT TRUE,
  created_at    TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  
  -- Un proveedor global tiene slug único; uno privado es único por owner
  UNIQUE NULLS NOT DISTINCT (slug, owner_id)
);

-- Índice para filtrar por comerciante
CREATE INDEX idx_suppliers_owner ON public.suppliers(owner_id);

-- Datos semilla — proveedores globales
INSERT INTO public.suppliers (name, slug, is_global, delivery_days, source_type) VALUES
  ('Nini Mayorista', 'nini',   TRUE, ARRAY['lunes','martes','miércoles','jueves','viernes'], 'pdf'),
  ('Vital',          'vital',  TRUE, ARRAY['lunes','miércoles','viernes'],                  'excel'),
  ('Makro',          'makro',  TRUE, ARRAY['lunes','martes','miércoles','jueves','viernes','sábado'], 'scraping'),
  ('Yaguar',         'yaguar', TRUE, ARRAY['martes','jueves'],                              'excel');
```

### 5.5 Tabla: `price_lists` (listas de precios — historial)

```sql
CREATE TABLE public.price_lists (
  id            UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  supplier_id   UUID NOT NULL REFERENCES public.suppliers(id) ON DELETE CASCADE,
  valid_from    DATE NOT NULL,
  valid_until   DATE,
  source_file   TEXT,    -- path en Supabase Storage
  parsed_at     TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  is_current    BOOLEAN NOT NULL DEFAULT TRUE
);

-- Solo una lista activa por proveedor a la vez
CREATE UNIQUE INDEX idx_price_lists_current
  ON public.price_lists(supplier_id)
  WHERE is_current = TRUE;
```

### 5.6 Tabla: `prices` (el corazón del sistema)

```sql
CREATE TABLE public.prices (
  id            UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  price_list_id UUID NOT NULL REFERENCES public.price_lists(id) ON DELETE CASCADE,
  supplier_id   UUID NOT NULL REFERENCES public.suppliers(id),
  product_id    UUID NOT NULL REFERENCES public.products(id),
  price         NUMERIC(12, 2) NOT NULL CHECK (price > 0),
  unit          TEXT NOT NULL,
  brand         TEXT,          -- marca específica (Arcor, Marolio, etc.)
  notes         TEXT,
  created_at    TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  
  UNIQUE(price_list_id, product_id, brand)
);

CREATE INDEX idx_prices_supplier   ON public.prices(supplier_id);
CREATE INDEX idx_prices_product    ON public.prices(product_id);
CREATE INDEX idx_prices_pricelist  ON public.prices(price_list_id);
```

### 5.7 Tabla: `user_suppliers` (proveedores activos del comerciante)

Registra con qué proveedores trabaja actualmente cada comerciante y qué productos le compra.

```sql
CREATE TABLE public.user_suppliers (
  id          UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id     UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  supplier_id UUID NOT NULL REFERENCES public.suppliers(id) ON DELETE CASCADE,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  
  UNIQUE(user_id, supplier_id)
);

CREATE INDEX idx_user_suppliers_user ON public.user_suppliers(user_id);
```

### 5.8 Tabla: `user_purchases` (lo que el comerciante compra actualmente)

Registra el producto, el proveedor al que se lo compra y el precio que paga.

```sql
CREATE TABLE public.user_purchases (
  id          UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id     UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  product_id  UUID NOT NULL REFERENCES public.products(id),
  supplier_id UUID NOT NULL REFERENCES public.suppliers(id),
  current_price NUMERIC(12, 2) NOT NULL CHECK (current_price > 0),
  quantity    NUMERIC(10, 2) NOT NULL DEFAULT 1,
  unit        TEXT NOT NULL,
  updated_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  
  UNIQUE(user_id, product_id)  -- un producto → un proveedor actual
);

CREATE INDEX idx_user_purchases_user    ON public.user_purchases(user_id);
CREATE INDEX idx_user_purchases_product ON public.user_purchases(product_id);
```

### 5.9 Tabla: `daily_cache_snapshots`

```sql
CREATE TABLE public.daily_cache_snapshots (
  id           UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  snapshot_date DATE NOT NULL UNIQUE,
  data         JSONB NOT NULL,   -- snapshot completo del catálogo de precios
  created_at   TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Solo mantener los últimos 30 días
CREATE INDEX idx_snapshots_date ON public.daily_cache_snapshots(snapshot_date DESC);
```

### 5.10 Row Level Security (RLS)

```sql
-- Habilitar RLS en todas las tablas de usuario
ALTER TABLE public.profiles          ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_suppliers    ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_purchases    ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.suppliers         ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.prices            ENABLE ROW LEVEL SECURITY;

-- profiles: solo el propio usuario puede ver/editar su perfil
CREATE POLICY "profiles: own row"
  ON public.profiles FOR ALL
  USING (auth.uid() = id);

-- user_suppliers: cada usuario solo ve los suyos
CREATE POLICY "user_suppliers: own rows"
  ON public.user_suppliers FOR ALL
  USING (auth.uid() = user_id);

-- user_purchases: cada usuario solo ve los suyos
CREATE POLICY "user_purchases: own rows"
  ON public.user_purchases FOR ALL
  USING (auth.uid() = user_id);

-- suppliers: ver globales + los propios privados
CREATE POLICY "suppliers: global or own"
  ON public.suppliers FOR SELECT
  USING (is_global = TRUE OR owner_id = auth.uid());

-- Solo el dueño puede insertar/editar sus proveedores privados
CREATE POLICY "suppliers: own private insert"
  ON public.suppliers FOR INSERT
  WITH CHECK (is_global = FALSE AND owner_id = auth.uid());

-- prices: visibles si el proveedor es global o del usuario
CREATE POLICY "prices: visible"
  ON public.prices FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.suppliers s
      WHERE s.id = supplier_id
        AND (s.is_global = TRUE OR s.owner_id = auth.uid())
    )
  );
```

### 5.11 Vista: `v_current_prices` (precios actuales por producto y proveedor)

```sql
CREATE OR REPLACE VIEW public.v_current_prices AS
SELECT
  p.id                AS price_id,
  s.id                AS supplier_id,
  s.name              AS supplier_name,
  s.is_global,
  s.owner_id,
  s.delivery_days,
  pr.id               AS product_id,
  pr.name             AS product_name,
  pr.category,
  pr.unit             AS product_unit,
  p.price,
  p.brand,
  p.unit              AS price_unit,
  pl.valid_from,
  pl.parsed_at
FROM public.prices p
JOIN public.price_lists pl  ON pl.id = p.price_list_id  AND pl.is_current = TRUE
JOIN public.suppliers s     ON s.id = p.supplier_id     AND s.is_active   = TRUE
JOIN public.products  pr    ON pr.id = p.product_id     AND pr.is_active  = TRUE;
```

### 5.12 Vista original: `v_best_price_per_product` (reemplazada en implementación)

> **Reemplazo aplicado:** no usar una vista global de mejores precios para reportes por usuario. En la migración real se usa `fn_best_prices_for_user(p_user_id)` para evitar que proveedores privados de otros comercios entren en el cálculo.

```sql
CREATE OR REPLACE VIEW public.v_best_price_per_product AS
SELECT DISTINCT ON (product_id)
  product_id,
  product_name,
  category,
  supplier_id,
  supplier_name,
  delivery_days,
  price,
  brand
FROM public.v_current_prices
ORDER BY product_id, price ASC;
```

### 5.13 Función: `fn_savings_report` (cálculo de ahorro potencial)

```sql
CREATE OR REPLACE FUNCTION public.fn_savings_report(p_user_id UUID)
RETURNS TABLE (
  product_name       TEXT,
  current_supplier   TEXT,
  current_price      NUMERIC,
  best_supplier      TEXT,
  best_price         NUMERIC,
  saving_pct         NUMERIC,
  saving_abs         NUMERIC,
  delivery_days      TEXT[]
) AS $$
BEGIN
  RETURN QUERY
  SELECT
    pr.name                                                   AS product_name,
    s_current.name                                            AS current_supplier,
    up.current_price                                          AS current_price,
    best.supplier_name                                        AS best_supplier,
    best.price                                                AS best_price,
    ROUND(((up.current_price - best.price) / up.current_price * 100)::NUMERIC, 2) AS saving_pct,
    ROUND((up.current_price - best.price)::NUMERIC, 2)        AS saving_abs,
    best.delivery_days
  FROM public.user_purchases up
  JOIN public.products              pr        ON pr.id = up.product_id
  JOIN public.suppliers             s_current ON s_current.id = up.supplier_id
  JOIN public.v_best_price_per_product best   ON best.product_id = up.product_id
  WHERE up.user_id = p_user_id
    AND best.price < up.current_price
  ORDER BY saving_pct DESC;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
```

### 5.14 Función: `fn_total_savings` (ahorro total mensual estimado)

```sql
CREATE OR REPLACE FUNCTION public.fn_total_savings(
  p_user_id           UUID,
  p_monthly_spend     NUMERIC
)
RETURNS TABLE (
  current_total       NUMERIC,
  optimized_total     NUMERIC,
  total_saving_pct    NUMERIC,
  total_saving_abs    NUMERIC,
  top_product_name    TEXT,
  top_product_saving  NUMERIC
) AS $$
DECLARE
  v_weight_sum   NUMERIC;
  v_optimized    NUMERIC;
  v_top_name     TEXT;
  v_top_saving   NUMERIC;
BEGIN
  -- Calcular suma de precios actuales para pesar proporcionalmente
  SELECT SUM(current_price) INTO v_weight_sum
  FROM public.user_purchases
  WHERE user_id = p_user_id;

  IF v_weight_sum IS NULL OR v_weight_sum = 0 THEN
    RETURN;
  END IF;

  -- Gasto optimizado: redistribuye el gasto mensual con los mejores precios
  SELECT SUM(
    (up.current_price / v_weight_sum) * p_monthly_spend
    * (best.price / up.current_price)
  )
  INTO v_optimized
  FROM public.user_purchases up
  JOIN public.v_best_price_per_product best ON best.product_id = up.product_id
  WHERE up.user_id = p_user_id;

  -- Producto con mayor diferencia porcentual
  SELECT r.product_name, r.saving_pct
  INTO v_top_name, v_top_saving
  FROM public.fn_savings_report(p_user_id) r
  LIMIT 1;

  RETURN QUERY SELECT
    p_monthly_spend,
    ROUND(v_optimized, 2),
    ROUND(((p_monthly_spend - v_optimized) / p_monthly_spend * 100)::NUMERIC, 2),
    ROUND((p_monthly_spend - v_optimized)::NUMERIC, 2),
    v_top_name,
    v_top_saving;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
```

---

## 6. Flujo completo del sistema

```
┌──────────────────────────────────────────────────────────────┐
│  FUENTES DE DATOS                                            │
│  • PDFs/Excel de mayoristas (auto-descarga mensual)          │
│  • Web scraping Makro                                        │
│  • Upload manual del comerciante                            │
└──────────────┬───────────────────────────────────────────────┘
               │
               ▼
┌──────────────────────────────────────────────────────────────┐
│  PARSER SERVICE (Python)                                     │
│  1. Detectar formato (PDF tabla, Excel, texto libre)         │
│  2. Extraer filas: producto | precio | unidad | marca        │
│  3. Normalizar nombres → match con catálogo maestro          │
│     (fuzzy matching con rapidfuzz ≥ 85% similitud)           │
│  4. Validar: precio > 0, producto conocido                   │
│  5. Insertar en price_lists + prices                         │
└──────────────┬───────────────────────────────────────────────┘
               │
               ▼
┌──────────────────────────────────────────────────────────────┐
│  SUPABASE PostgreSQL                                         │
│  • prices (historial completo)                               │
│  • v_current_prices (vista: solo listas vigentes)            │
│  • v_best_price_per_product (vista: mínimo por producto)     │
└──────────────┬───────────────────────────────────────────────┘
               │
       ┌───────▼────────┐
       │  CRON 8:00 AM  │  → Lee v_current_prices
       │  (Vercel Cron) │  → Serializa a JSON
       └───────┬────────┘  → Guarda en daily_cache_snapshots
               │           → Invalida Redis cache
               ▼
┌──────────────────────────────────────────────────────────────┐
│  REDIS CACHE (Upstash)                                       │
│  Key: "prices:snapshot:{YYYY-MM-DD}"                         │
│  TTL: 25 horas                                               │
│  → Todos los requests del día leen de aquí                   │
└──────────────┬───────────────────────────────────────────────┘
               │
               ▼
┌──────────────────────────────────────────────────────────────┐
│  NEXT.JS API ROUTES                                          │
│  GET /api/prices     → Lee de Redis (o DB si miss)           │
│  POST /api/refresh   → Fuerza read from DB, actualiza Redis  │
│  POST /api/upload    → Recibe archivo, llama parser          │
│  POST /api/compare   → Ejecuta fn_total_savings()            │
└──────────────┬───────────────────────────────────────────────┘
               │
               ▼
┌──────────────────────────────────────────────────────────────┐
│  FRONTEND Next.js                                            │
│  /login  /register  /onboarding  /dashboard  /compare        │
└──────────────────────────────────────────────────────────────┘
```

---

## 7. Flujo de pantallas (UX)

### Pantalla 1 — Login / Registro
```
┌────────────────────────────────────┐
│         🏪 PrecioMayor             │
│                                    │
│  [Email]                           │
│  [Contraseña]                      │
│                                    │
│  [  Ingresar  ]                    │
│  [  Registrarse  ]                 │
│                                    │
│  ──── o entrá con ────             │
│  [  Google  ]                      │
└────────────────────────────────────┘
```

### Pantalla 2 — Onboarding: Nombre del comercio
```
┌────────────────────────────────────┐
│  Paso 1/2 — Tu comercio            │
│                                    │
│  ¿Cómo se llama tu negocio?        │
│  [__________________________]      │
│                                    │
│  ¿Tu nombre?                       │
│  [__________________________]      │
│                                    │
│             [ Continuar → ]        │
└────────────────────────────────────┘
```

### Pantalla 3 — Onboarding: Configuración de compras actuales

El comerciante declara **con qué proveedor compra cada producto hoy** y a qué precio.

```
┌──────────────────────────────────────────────────────────┐
│  Paso 2/2 — ¿Cómo comprás hoy?                          │
│                                                          │
│  PROVEEDOR (seleccioná uno a la vez)                     │
│  ┌────────┐ ┌───────┐ ┌────────┐ ┌────────┐             │
│  │  Nini  │ │ Vital │ │ Makro  │ │ Yaguar │  + Otro     │
│  └────────┘ └───────┘ └────────┘ └────────┘             │
│                                                          │
│  ── Seleccionaste: Nini Mayorista ───────────────────    │
│                                                          │
│  Producto          ¿Lo comprás acá?   Precio actual      │
│  Aceite            [x]                [$ ______]         │
│  Harina            [x]                [$ ______]         │
│  Azúcar            [ ]                                   │
│  Arroz             [x]                [$ ______]         │
│  ...                                                     │
│                                                          │
│  [ ← Otro proveedor ]          [ Listo, ver resultados →]│
└──────────────────────────────────────────────────────────┘
```

**Comportamiento:**
- Al seleccionar un proveedor, los otros se deshabilitan visualmente.
- Solo se muestran los productos que ese proveedor tiene en su lista.
- Al completar, el usuario puede seleccionar otro proveedor y repetir.
- Si el proveedor no está en la lista: actualmente no existe un flujo de carga manual.

### Pantalla 4 — Dashboard principal

```
┌──────────────────────────────────────────────────────────┐
│  🏪 Almacén Don Pedro          [🔄 Actualizar datos]      │
│  Precios al: 08/05/2026                                  │
│                                                          │
│  ┌────────────────────────────┐  ┌──────────────────┐   │
│  │  💰 AHORRO POTENCIAL       │  │  ⚠️ MAYOR ABUSO  │   │
│  │                            │  │                  │   │
│  │  Gasto mensual actual:     │  │  Fideos          │   │
│  │  [$ ______________]        │  │  Pagás 42% más   │   │
│  │                            │  │  caro con        │   │
│  │  → Podrías gastar:         │  │  Proveedor X     │   │
│  │    $ 0.000  (-0%)          │  │  vs. Vital       │   │
│  │    Ahorro: $ 0.000/mes     │  │  ($1.200 vs $840)│   │
│  └────────────────────────────┘  └──────────────────┘   │
│                                                          │
│  ┌───────────────────────────────────────────────────┐   │
│  │  📊 DETALLE POR PRODUCTO                          │   │
│  │                                                   │   │
│  │  Producto    Actual (Prov.)  Mejor (Prov.)  Dif.  │   │
│  │  Fideos      $1.200 (Nini)  $840  (Vital)  -30%  │   │
│  │  Aceite      $1.500 (Nini)  $1.350 (Makro) -10%  │   │
│  │  Arroz       $980  (Yaguar) $980  (Yaguar)   =   │   │
│  │  ...                                              │   │
│  └───────────────────────────────────────────────────┘   │
│                                                          │
│  [✏️ Editar mis compras]                                │
└──────────────────────────────────────────────────────────┘
```

### Pantalla 5 — Subir lista de proveedor privado

Este flujo ya no está habilitado en la versión actual. La aplicación funciona con la ingestión automática de SEPA y no permite que el usuario cargue su propia lista de proveedores.

---

## 8. Lógica de negocio y cálculos

### Cálculo de ahorro potencial

```
Para cada producto que compra el comerciante:
  saving_pct(producto) = (precio_actual - precio_mínimo_mercado) / precio_actual × 100

Para el total mensual:
  peso(producto) = precio_actual / Σ(precios_actuales)
  gasto_optimizado = Σ(gasto_mensual × peso(producto) × precio_mínimo / precio_actual)
  ahorro_total = gasto_mensual - gasto_optimizado
  ahorro_pct   = ahorro_total / gasto_mensual × 100
```

### Reglas de negocio importantes

1. **Solo se muestran ahorros reales:** si el comerciante ya está comprando al más barato, ese producto no aparece en el panel de diferencias.
2. **El precio de referencia es siempre el más reciente** (lista activa con `is_current = TRUE`).
3. **Los proveedores privados compiten con los globales** en el ranking de precios.
4. **No se fuerza al comerciante a cambiar de proveedor:** el sistema informa, no decide.

---

## 9. Parser de listas de precios

### Estrategia de parseo (Python)

```python
# parser/price_parser.py

import pdfplumber
import pandas as pd
from rapidfuzz import process, fuzz
from supabase import create_client
import re

SIMILARITY_THRESHOLD = 85  # % de similitud mínima para match de producto

def parse_pdf(file_path: str) -> list[dict]:
    """Extrae filas de precio de un PDF con tablas."""
    rows = []
    with pdfplumber.open(file_path) as pdf:
        for page in pdf.pages:
            tables = page.extract_tables()
            for table in tables:
                for row in table:
                    parsed = parse_row(row)
                    if parsed:
                        rows.append(parsed)
    return rows

def parse_excel(file_path: str) -> list[dict]:
    """Extrae filas de precio de un Excel."""
    df = pd.read_excel(file_path, header=None)
    rows = []
    for _, row in df.iterrows():
        parsed = parse_row(row.tolist())
        if parsed:
            rows.append(parsed)
    return rows

def parse_row(row: list) -> dict | None:
    """Intenta extraer (producto, precio, unidad, marca) de una fila."""
    row = [str(c).strip() for c in row if c is not None]
    if len(row) < 2:
        return None
    
    # Buscar precio: primer campo que sea numérico
    price = None
    product_name = None
    for i, cell in enumerate(row):
        clean = re.sub(r'[^\d,.]', '', cell).replace(',', '.')
        try:
            price = float(clean)
            product_name = row[0] if i > 0 else row[1]
            break
        except ValueError:
            continue
    
    if not price or not product_name:
        return None
    
    return {"raw_name": product_name, "price": price}

def normalize_product(raw_name: str, catalog: list[dict]) -> dict | None:
    """Hace fuzzy match entre el nombre crudo y el catálogo maestro."""
    names = [p["name"] for p in catalog]
    match, score, idx = process.extractOne(
        raw_name, names, scorer=fuzz.token_sort_ratio
    )
    if score >= SIMILARITY_THRESHOLD:
        return catalog[idx]
    return None

def ingest_price_list(supplier_id: str, file_path: str, file_type: str):
    """Pipeline completo: parsear → normalizar → insertar en Supabase."""
    supabase = create_client(SUPABASE_URL, SUPABASE_SERVICE_KEY)
    
    # 1. Obtener catálogo
    catalog = supabase.table("products").select("*").execute().data
    
    # 2. Parsear archivo
    if file_type == "pdf":
        raw_rows = parse_pdf(file_path)
    else:
        raw_rows = parse_excel(file_path)
    
    # 3. Desactivar lista anterior
    supabase.table("price_lists")\
        .update({"is_current": False})\
        .eq("supplier_id", supplier_id)\
        .execute()
    
    # 4. Crear nueva price_list
    pl = supabase.table("price_lists").insert({
        "supplier_id": supplier_id,
        "valid_from": date.today().isoformat(),
        "is_current": True,
        "source_file": file_path
    }).execute().data[0]
    
    # 5. Insertar precios normalizados
    prices_to_insert = []
    for row in raw_rows:
        product = normalize_product(row["raw_name"], catalog)
        if product:
            prices_to_insert.append({
                "price_list_id": pl["id"],
                "supplier_id": supplier_id,
                "product_id": product["id"],
                "price": row["price"],
                "unit": product["unit"]
            })
    
    if prices_to_insert:
        supabase.table("prices").insert(prices_to_insert).execute()
    
    return len(prices_to_insert)
```

---

## 10. Sistema de caché y actualización diaria

### Cron Job (Vercel)

```json
// vercel.json
{
  "crons": [
    {
      "path": "/api/cron/daily-snapshot",
      "schedule": "0 11 * * *"
    }
  ]
}
```
> `0 11 * * *` = 11:00 UTC = 08:00 AM Argentina (UTC-3)

### API Route del cron

```typescript
// app/api/cron/daily-snapshot/route.ts
import { createClient } from '@supabase/supabase-js'
import { Redis } from '@upstash/redis'
import { NextResponse } from 'next/server'

const redis = Redis.fromEnv()
const supabase = createClient(
  process.env.SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

export async function GET(req: Request) {
  // Verificar que la llamada viene de Vercel Cron
  const authHeader = req.headers.get('authorization')
  if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  // 1. Leer vista completa de precios
  const { data, error } = await supabase
    .from('v_current_prices')
    .select('*')

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  const today = new Date().toISOString().split('T')[0]
  const cacheKey = `prices:snapshot:${today}`

  // 2. Guardar en Redis con TTL de 25 horas
  await redis.set(cacheKey, JSON.stringify(data), { ex: 90000 })

  // 3. Guardar también en DB (historial)
  await supabase.from('daily_cache_snapshots').upsert({
    snapshot_date: today,
    data: data
  })

  return NextResponse.json({ ok: true, count: data.length, date: today })
}
```

### API Route: leer precios (con fallback)

```typescript
// app/api/prices/route.ts
import { Redis } from '@upstash/redis'
import { createClient } from '@supabase/supabase-js'

const redis = Redis.fromEnv()

export async function GET() {
  const today = new Date().toISOString().split('T')[0]
  const cacheKey = `prices:snapshot:${today}`

  // 1. Intentar leer de Redis
  const cached = await redis.get(cacheKey)
  if (cached) {
    return Response.json({ source: 'cache', data: cached })
  }

  // 2. Cache miss: leer de Supabase directamente
  const supabase = createClient(
    process.env.SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  )
  const { data } = await supabase.from('v_current_prices').select('*')

  // 3. Popular cache para el resto del día
  await redis.set(cacheKey, JSON.stringify(data), { ex: 90000 })

  return Response.json({ source: 'db', data })
}
```

### API Route: botón "Actualizar" del usuario

```typescript
// app/api/refresh/route.ts
export async function POST(req: Request) {
  const { userId } = await req.json()
  
  // Fuerza lectura desde DB e invalida el cache del día
  const today = new Date().toISOString().split('T')[0]
  const cacheKey = `prices:snapshot:${today}`
  
  await redis.del(cacheKey)
  
  // Re-poblar (reutiliza lógica del GET /api/prices)
  return Response.redirect('/api/prices')
}
```

---

## 11. Autenticación y multi-tenancy

### Flujo de Auth

```
Usuario entra a /login
→ Supabase Auth emite JWT
→ JWT se almacena en cookie httpOnly
→ `proxy.ts` valida JWT en cada request protegida
→ Row Level Security en Supabase garantiza aislamiento de datos
```

### Proxy de protección de rutas

> **Estado actual:** en Next.js 16 el archivo implementado es `proxy.ts`. El ejemplo anterior con `middleware.ts` y `@supabase/auth-helpers-nextjs` queda reemplazado por `@supabase/ssr`.

```typescript
// proxy.ts
import { createServerClient } from '@supabase/ssr'
import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'

const PUBLIC_ROUTES = ['/login', '/register']

export async function proxy(request: NextRequest) {
  const response = NextResponse.next({ request })
  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll: () => request.cookies.getAll(),
        setAll: () => {}
      }
    }
  )

  const { data: { user } } = await supabase.auth.getUser()
  const path = request.nextUrl.pathname

  if (!user && !PUBLIC_ROUTES.includes(path)) {
    return NextResponse.redirect(new URL('/login', request.url))
  }

  if (user && PUBLIC_ROUTES.includes(path)) {
    return NextResponse.redirect(new URL('/dashboard', request.url))
  }

  return response
}

export const config = {
  matcher: ['/((?!api|_next/static|_next/image|favicon.ico).*)']
}
```

### Trigger: crear perfil al registrarse

```sql
-- Se ejecuta automáticamente al crear un usuario en auth.users
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.profiles (id, email, business_name)
  VALUES (
    NEW.id,
    NEW.email,
    COALESCE(NEW.raw_user_meta_data->>'business_name', 'Mi Comercio')
  );
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();
```

---

## 12. Patrones de diseño aplicados

### Backend

| Patrón | Dónde se aplica | Por qué |
|--------|----------------|---------|
| **Repository Pattern** | Acceso a Supabase desde API routes | Desacopla la lógica de negocio de la fuente de datos; facilita testing |
| **Strategy Pattern** | Parser (PDF vs Excel vs scraping) | Cada formato tiene su propia estrategia intercambiable |
| **Read-Through Cache** | Precios diarios con Redis | Evita sobrecarga en Supabase; garantiza respuestas rápidas |
| **CQRS (simplificado)** | Lectura (vistas/cache) vs escritura (parser) | Las operaciones de lectura y escritura tienen paths independientes |
| **Pendiente** | Supabase Realtime en botón "Actualizar" | No se implementa en el MVP inicial; el botón invalida cache y recarga datos |

### Frontend

| Patrón | Dónde se aplica | Por qué |
|--------|----------------|---------|
| **Container / Presentational** | Dashboard: lógica separada de UI | Componentes reutilizables y testeables |
| **Optimistic UI** | Guardar selección de proveedores | El usuario ve el resultado inmediatamente |
| **Progressive Disclosure** | Onboarding paso a paso | No abrumar con toda la configuración junta |
| **Single Source of Truth** | Zustand store para estado del usuario | Estado del onboarding y selecciones centralizado |

### Base de datos

| Patrón | Dónde se aplica |
|--------|----------------|
| **Soft Delete** | Proveedores y productos (`is_active`) |
| **Temporal Tables** | `price_lists` con `is_current` y `valid_from` |
| **Partial Index** | `UNIQUE INDEX` sobre `is_current = TRUE` |
| **SECURITY DEFINER** | Funciones que necesitan acceso cross-user |
| **View/Function Composition** | `v_current_prices` → `fn_best_prices_for_user` |

---

## 13. Estructura de carpetas del proyecto

```
precio-mayor/
├── app/                          # Next.js App Router
│   ├── (auth)/
│   │   ├── login/page.tsx
│   │   └── register/page.tsx
│   ├── (dashboard)/
│   │   ├── layout.tsx            # Layout protegido
│   │   ├── dashboard/page.tsx    # Panel principal
│   │   ├── onboarding/page.tsx   # Configuración inicial
│   │   └── suppliers/
│   │       └── upload/page.tsx   # Subir proveedor privado
│   └── api/
│       ├── auth/route.ts
│       ├── prices/route.ts
│       ├── refresh/route.ts
│       ├── upload/route.ts
│       ├── compare/route.ts
│       └── cron/
│           └── daily-snapshot/route.ts
│
├── components/
│   ├── ui/                       # shadcn/ui base components
│   ├── dashboard/
│   │   ├── SavingsPanel.tsx
│   │   ├── TopAbuse.tsx
│   │   └── PriceTable.tsx
│   └── onboarding/
│       ├── SupplierSelector.tsx
│       └── ProductForm.tsx
│
├── lib/
│   ├── supabase/
│   │   ├── client.ts             # Browser client
│   │   └── server.ts             # Server client
│   ├── redis.ts                  # Upstash Redis client
│   ├── repositories/
│   │   ├── prices.repo.ts
│   │   ├── suppliers.repo.ts
│   │   └── purchases.repo.ts
│   └── utils/
│       ├── calculations.ts       # fn ahorro potencial
│       └── format.ts             # Pesos argentinos, %
│
├── store/
│   └── onboarding.store.ts       # Zustand
│
├── parser/                       # Servicio Python independiente
│   ├── price_parser.py
│   ├── requirements.txt
│   └── Dockerfile
│
├── supabase/
│   ├── migrations/
│   │   ├── 001_initial_schema.sql
│   │   ├── 002_rls_policies.sql
│   │   └── 003_functions_views.sql
│   └── seed.sql
│
├── proxy.ts
├── vercel.json
└── .env.local
```

---

## 14. Variables de entorno

```bash
# .env.local

# Supabase
NEXT_PUBLIC_SUPABASE_URL=https://xxxx.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJ...
SUPABASE_SERVICE_ROLE_KEY=eyJ...   # Solo en servidor, nunca en cliente

# Redis (Upstash)
UPSTASH_REDIS_REST_URL=https://...
UPSTASH_REDIS_REST_TOKEN=...

# Cron
CRON_SECRET=un-secreto-largo-y-aleatorio

# Parser service (si corre separado)
PARSER_SERVICE_URL=https://...
PARSER_SERVICE_SECRET=...
```

---

## 15. Roadmap post-MVP

| Fase | Feature | Impacto |
|------|---------|---------|
| **v1.1** | Notificaciones por email cuando un precio baja significativamente | 🔥 Alto |
| **v1.1** | Historial de precios → gráfico de evolución por producto | 🔥 Alto |
| **v1.2** | Integración directa con WhatsApp para recibir listas (Twilio) | 🔥 Alto |
| **v1.2** | Exportar reporte de ahorro en PDF | 🟡 Medio |
| **v1.3** | Plan Pro: comparación ilimitada de proveedores privados | 💰 Monetización |
| **v1.3** | API pública para integración con sistemas de gestión | 💰 Monetización |
| **v2.0** | Pedido directo al proveedor desde la plataforma | 🚀 Diferenciador |

---

*Documento generado para uso interno de desarrollo. Última actualización: 08/05/2026.*
