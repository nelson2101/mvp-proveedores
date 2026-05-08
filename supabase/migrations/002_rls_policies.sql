ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.products ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.suppliers ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.price_lists ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.prices ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_suppliers ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_purchases ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.daily_cache_snapshots ENABLE ROW LEVEL SECURITY;

CREATE POLICY "profiles own row"
  ON public.profiles FOR ALL
  USING (auth.uid() = id)
  WITH CHECK (auth.uid() = id);

CREATE POLICY "products readable"
  ON public.products FOR SELECT
  USING (is_active = TRUE);

CREATE POLICY "suppliers global or own select"
  ON public.suppliers FOR SELECT
  USING (is_global = TRUE OR owner_id = auth.uid());

CREATE POLICY "suppliers own private insert"
  ON public.suppliers FOR INSERT
  WITH CHECK (is_global = FALSE AND owner_id = auth.uid());

CREATE POLICY "suppliers own private update"
  ON public.suppliers FOR UPDATE
  USING (is_global = FALSE AND owner_id = auth.uid())
  WITH CHECK (is_global = FALSE AND owner_id = auth.uid());

CREATE POLICY "price_lists visible by supplier"
  ON public.price_lists FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.suppliers s
      WHERE s.id = supplier_id
        AND (s.is_global = TRUE OR s.owner_id = auth.uid())
    )
  );

CREATE POLICY "prices visible by supplier"
  ON public.prices FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.suppliers s
      WHERE s.id = supplier_id
        AND (s.is_global = TRUE OR s.owner_id = auth.uid())
    )
  );

CREATE POLICY "user_suppliers own rows"
  ON public.user_suppliers FOR ALL
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "user_purchases own rows"
  ON public.user_purchases FOR ALL
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "snapshots service only"
  ON public.daily_cache_snapshots FOR ALL
  USING (false)
  WITH CHECK (false);
