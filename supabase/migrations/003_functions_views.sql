CREATE OR REPLACE VIEW public.v_current_prices
WITH (security_invoker = true) AS
SELECT
  p.id AS price_id,
  s.id AS supplier_id,
  s.name AS supplier_name,
  s.is_global,
  s.owner_id,
  s.delivery_days,
  pr.id AS product_id,
  pr.name AS product_name,
  pr.category,
  pr.unit AS product_unit,
  p.price,
  p.brand,
  p.unit AS price_unit,
  pl.valid_from,
  pl.parsed_at
FROM public.prices p
JOIN public.price_lists pl ON pl.id = p.price_list_id AND pl.is_current = TRUE
JOIN public.suppliers s ON s.id = p.supplier_id AND s.is_active = TRUE
JOIN public.products pr ON pr.id = p.product_id AND pr.is_active = TRUE;

CREATE OR REPLACE FUNCTION public.fn_best_prices_for_user(p_user_id UUID)
RETURNS TABLE (
  product_id UUID,
  product_name TEXT,
  category TEXT,
  supplier_id UUID,
  supplier_name TEXT,
  delivery_days TEXT[],
  price NUMERIC,
  brand TEXT
) AS $$
BEGIN
  IF auth.uid() IS DISTINCT FROM p_user_id THEN
    RAISE EXCEPTION 'not allowed';
  END IF;

  RETURN QUERY
  SELECT DISTINCT ON (v.product_id)
    v.product_id,
    v.product_name,
    v.category,
    v.supplier_id,
    v.supplier_name,
    v.delivery_days,
    v.price,
    v.brand
  FROM public.v_current_prices v
  WHERE v.is_global = TRUE OR v.owner_id = p_user_id
  ORDER BY v.product_id, v.price ASC;
END;
$$ LANGUAGE plpgsql SECURITY INVOKER;

CREATE OR REPLACE FUNCTION public.fn_savings_report(p_user_id UUID)
RETURNS TABLE (
  product_name TEXT,
  current_supplier TEXT,
  current_price NUMERIC,
  best_supplier TEXT,
  best_price NUMERIC,
  saving_pct NUMERIC,
  saving_abs NUMERIC,
  delivery_days TEXT[]
) AS $$
BEGIN
  IF auth.uid() IS DISTINCT FROM p_user_id THEN
    RAISE EXCEPTION 'not allowed';
  END IF;

  RETURN QUERY
  SELECT
    pr.name AS product_name,
    s_current.name AS current_supplier,
    up.current_price AS current_price,
    best.supplier_name AS best_supplier,
    best.price AS best_price,
    ROUND(((up.current_price - best.price) / up.current_price * 100)::NUMERIC, 2) AS saving_pct,
    ROUND((up.current_price - best.price)::NUMERIC, 2) AS saving_abs,
    best.delivery_days
  FROM public.user_purchases up
  JOIN public.products pr ON pr.id = up.product_id
  JOIN public.suppliers s_current ON s_current.id = up.supplier_id
  JOIN public.fn_best_prices_for_user(p_user_id) best ON best.product_id = up.product_id
  WHERE up.user_id = p_user_id
    AND best.price < up.current_price
  ORDER BY saving_pct DESC;
END;
$$ LANGUAGE plpgsql SECURITY INVOKER;

CREATE OR REPLACE FUNCTION public.fn_total_savings(
  p_user_id UUID,
  p_monthly_spend NUMERIC
)
RETURNS TABLE (
  current_total NUMERIC,
  optimized_total NUMERIC,
  total_saving_pct NUMERIC,
  total_saving_abs NUMERIC,
  top_product_name TEXT,
  top_product_saving NUMERIC
) AS $$
DECLARE
  v_weight_sum NUMERIC;
  v_optimized NUMERIC;
  v_top_name TEXT;
  v_top_saving NUMERIC;
BEGIN
  IF auth.uid() IS DISTINCT FROM p_user_id THEN
    RAISE EXCEPTION 'not allowed';
  END IF;

  SELECT SUM(current_price) INTO v_weight_sum
  FROM public.user_purchases
  WHERE user_id = p_user_id;

  IF v_weight_sum IS NULL OR v_weight_sum = 0 OR p_monthly_spend <= 0 THEN
    RETURN;
  END IF;

  SELECT SUM(
    (up.current_price / v_weight_sum) * p_monthly_spend
    * (COALESCE(best.price, up.current_price) / up.current_price)
  )
  INTO v_optimized
  FROM public.user_purchases up
  LEFT JOIN public.fn_best_prices_for_user(p_user_id) best ON best.product_id = up.product_id
  WHERE up.user_id = p_user_id;

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
$$ LANGUAGE plpgsql SECURITY INVOKER;

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
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();
