-- R$/kg padrão por obra para medição por peso (fabricação e montagem).
-- O lançamento de medição usa esse valor como sugestão editável.
ALTER TABLE obras ADD COLUMN IF NOT EXISTS valor_kg_fabricacao numeric(10,4);
ALTER TABLE obras ADD COLUMN IF NOT EXISTS valor_kg_montagem numeric(10,4);
COMMENT ON COLUMN obras.valor_kg_fabricacao IS 'R$/kg padrão da medição de fabricação desta obra (editável no lançamento)';
COMMENT ON COLUMN obras.valor_kg_montagem IS 'R$/kg padrão da medição de montagem desta obra (editável no lançamento)';
