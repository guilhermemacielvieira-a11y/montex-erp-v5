-- Anexo (foto/PDF) por item de estoque: certificado, ficha técnica, foto do material.
-- Guarda a URL pública do arquivo no Storage (bucket `uploads`).
-- Idempotente. Enquanto não aplicada, o app salva o item sem o anexo (degrada).
ALTER TABLE estoque ADD COLUMN IF NOT EXISTS anexo_url text;
