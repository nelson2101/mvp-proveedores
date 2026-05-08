CREATE TABLE public.sepa_filtered_prices (
  snapshot_key TEXT PRIMARY KEY,
  fecha_lista DATE NOT NULL,
  producto_objetivo TEXT NOT NULL,
  id_comercio TEXT NOT NULL,
  id_bandera TEXT NOT NULL,
  id_sucursal TEXT NOT NULL,
  proveedor_razon_social TEXT,
  proveedor_nombre TEXT NOT NULL,
  sucursal_nombre TEXT,
  sucursal_tipo TEXT,
  sucursal_localidad TEXT NOT NULL,
  sucursal_provincia TEXT,
  sucursal_direccion TEXT,
  producto_id TEXT NOT NULL,
  producto_ean TEXT,
  producto_descripcion TEXT NOT NULL,
  producto_marca TEXT,
  producto_presentacion TEXT,
  precio_unitario_con_iva NUMERIC(12, 2) NOT NULL CHECK (precio_unitario_con_iva > 0),
  precio_unitario_sin_iva NUMERIC(12, 2),
  unidad_venta TEXT,
  precio_bulto_con_iva NUMERIC(12, 2),
  precio_bulto_sin_iva NUMERIC(12, 2),
  promo1_precio_con_iva NUMERIC(12, 2),
  promo1_leyenda TEXT,
  promo2_precio_con_iva NUMERIC(12, 2),
  promo2_leyenda TEXT,
  comercio_ultima_actualizacion TIMESTAMPTZ,
  archivo_origen TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_sepa_filtered_prices_fecha ON public.sepa_filtered_prices(fecha_lista DESC);
CREATE INDEX idx_sepa_filtered_prices_producto ON public.sepa_filtered_prices(producto_objetivo);
CREATE INDEX idx_sepa_filtered_prices_proveedor ON public.sepa_filtered_prices(proveedor_nombre);

ALTER TABLE public.sepa_filtered_prices ENABLE ROW LEVEL SECURITY;

CREATE POLICY "sepa_filtered_prices readable"
  ON public.sepa_filtered_prices FOR SELECT
  USING (true);
