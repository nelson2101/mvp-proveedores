CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS pg_trgm;

CREATE OR REPLACE FUNCTION public.update_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TABLE public.profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  business_name TEXT NOT NULL,
  owner_name TEXT,
  email TEXT NOT NULL,
  plan TEXT NOT NULL DEFAULT 'free' CHECK (plan IN ('free', 'pro')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TRIGGER trg_profiles_updated_at
  BEFORE UPDATE ON public.profiles
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at();

CREATE TABLE public.products (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name TEXT NOT NULL,
  slug TEXT NOT NULL UNIQUE,
  category TEXT NOT NULL,
  unit TEXT NOT NULL DEFAULT 'unidad',
  is_active BOOLEAN NOT NULL DEFAULT TRUE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_products_name_trgm ON public.products USING gin(name gin_trgm_ops);

CREATE TABLE public.suppliers (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name TEXT NOT NULL,
  slug TEXT NOT NULL,
  is_global BOOLEAN NOT NULL DEFAULT TRUE,
  owner_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE,
  delivery_days TEXT[] NOT NULL DEFAULT '{}',
  source_type TEXT CHECK (source_type IN ('pdf', 'excel', 'manual', 'scraping')),
  source_url TEXT,
  is_active BOOLEAN NOT NULL DEFAULT TRUE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT suppliers_owner_rule CHECK (
    (is_global = TRUE AND owner_id IS NULL) OR
    (is_global = FALSE AND owner_id IS NOT NULL)
  )
);

CREATE UNIQUE INDEX idx_suppliers_slug_owner_unique
  ON public.suppliers(slug, owner_id) NULLS NOT DISTINCT;
CREATE INDEX idx_suppliers_owner ON public.suppliers(owner_id);

CREATE TABLE public.price_lists (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  supplier_id UUID NOT NULL REFERENCES public.suppliers(id) ON DELETE CASCADE,
  valid_from DATE NOT NULL,
  valid_until DATE,
  source_file TEXT,
  parsed_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  is_current BOOLEAN NOT NULL DEFAULT TRUE
);

CREATE UNIQUE INDEX idx_price_lists_current
  ON public.price_lists(supplier_id)
  WHERE is_current = TRUE;

CREATE TABLE public.prices (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  price_list_id UUID NOT NULL REFERENCES public.price_lists(id) ON DELETE CASCADE,
  supplier_id UUID NOT NULL REFERENCES public.suppliers(id),
  product_id UUID NOT NULL REFERENCES public.products(id),
  price NUMERIC(12, 2) NOT NULL CHECK (price > 0),
  unit TEXT NOT NULL,
  brand TEXT,
  notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE UNIQUE INDEX idx_prices_unique_item
  ON public.prices(price_list_id, product_id, brand) NULLS NOT DISTINCT;
CREATE INDEX idx_prices_supplier ON public.prices(supplier_id);
CREATE INDEX idx_prices_product ON public.prices(product_id);
CREATE INDEX idx_prices_pricelist ON public.prices(price_list_id);

CREATE TABLE public.user_suppliers (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  supplier_id UUID NOT NULL REFERENCES public.suppliers(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(user_id, supplier_id)
);

CREATE INDEX idx_user_suppliers_user ON public.user_suppliers(user_id);

CREATE TABLE public.user_purchases (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  product_id UUID NOT NULL REFERENCES public.products(id),
  supplier_id UUID NOT NULL REFERENCES public.suppliers(id),
  current_price NUMERIC(12, 2) NOT NULL CHECK (current_price > 0),
  quantity NUMERIC(10, 2) NOT NULL DEFAULT 1,
  unit TEXT NOT NULL,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(user_id, product_id)
);

CREATE TRIGGER trg_user_purchases_updated_at
  BEFORE UPDATE ON public.user_purchases
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at();

CREATE INDEX idx_user_purchases_user ON public.user_purchases(user_id);
CREATE INDEX idx_user_purchases_product ON public.user_purchases(product_id);

CREATE TABLE public.daily_cache_snapshots (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  snapshot_date DATE NOT NULL UNIQUE,
  data JSONB NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_snapshots_date ON public.daily_cache_snapshots(snapshot_date DESC);
