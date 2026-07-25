CREATE TABLE public.mechanic_scrape_log (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  cell_key TEXT NOT NULL,
  lat NUMERIC(9,6) NOT NULL,
  lng NUMERIC(9,6) NOT NULL,
  radius_km INTEGER NOT NULL,
  specialties TEXT[] NOT NULL DEFAULT '{}',
  result_count INTEGER NOT NULL DEFAULT 0,
  scraped_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

GRANT ALL ON public.mechanic_scrape_log TO service_role;

ALTER TABLE public.mechanic_scrape_log ENABLE ROW LEVEL SECURITY;

CREATE POLICY "scrape_log_service_only_select" ON public.mechanic_scrape_log
  FOR SELECT TO service_role USING (true);

CREATE INDEX idx_mechanic_scrape_log_cell ON public.mechanic_scrape_log (cell_key, scraped_at DESC);
CREATE INDEX idx_mechanic_scrape_log_scraped_at ON public.mechanic_scrape_log (scraped_at DESC);