CREATE TABLE IF NOT EXISTS public.information (
  id            BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  name          TEXT        NOT NULL,
  cle_crypte    TEXT        NOT NULL,
  company_id    UUID        NOT NULL REFERENCES public.company(id) ON DELETE CASCADE,
  fichier_crypt TEXT        NOT NULL,
  created_at    TIMESTAMPTZ DEFAULT NOW() NOT NULL,
  valide        BOOLEAN     DEFAULT FALSE
);

CREATE INDEX IF NOT EXISTS idx_information_company_id
  ON public.information (company_id);
