INSERT INTO public.products (name, slug, category, unit) VALUES
  ('Aceite', 'aceite', 'Despensa', 'litro'),
  ('Harina', 'harina', 'Despensa', 'kg'),
  ('Azúcar', 'azucar', 'Despensa', 'kg'),
  ('Arroz', 'arroz', 'Despensa', 'kg'),
  ('Fideos', 'fideos', 'Despensa', 'kg'),
  ('Yerba mate', 'yerba-mate', 'Infusiones', 'kg'),
  ('Leche', 'leche', 'Lácteos', 'litro'),
  ('Gaseosas', 'gaseosas', 'Bebidas', 'unidad'),
  ('Cerveza', 'cerveza', 'Bebidas', 'unidad'),
  ('Agua mineral', 'agua-mineral', 'Bebidas', 'litro'),
  ('Detergente', 'detergente', 'Limpieza', 'litro'),
  ('Papel higiénico', 'papel-higienico', 'Higiene', 'pack')
ON CONFLICT (slug) DO NOTHING;

INSERT INTO public.suppliers (name, slug, is_global, delivery_days, source_type) VALUES
  ('Nini Mayorista', 'nini', TRUE, ARRAY['lunes','martes','miércoles','jueves','viernes'], 'pdf'),
  ('Vital', 'vital', TRUE, ARRAY['lunes','miércoles','viernes'], 'excel'),
  ('Makro', 'makro', TRUE, ARRAY['lunes','martes','miércoles','jueves','viernes','sábado'], 'scraping'),
  ('Yaguar', 'yaguar', TRUE, ARRAY['martes','jueves'], 'excel')
ON CONFLICT DO NOTHING;
