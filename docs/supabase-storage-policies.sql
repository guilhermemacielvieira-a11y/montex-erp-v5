-- ============================================
-- MONTEX ERP — Policies RLS para Supabase Storage
-- ============================================
-- Aplicar no Supabase Studio > SQL Editor caso o IFC não esteja sincronizando.
-- Já validado que upload com anon key funciona (bucket público + INSERT free).
-- Este SQL é para garantir que TUDO continue funcionando após mudanças futuras
-- ou caso o bucket seja recriado.

-- 1. Garantir que o bucket existe (idempotente)
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'ifc-models',
  'ifc-models',
  true,                                    -- público (qualquer um pode baixar)
  104857600,                               -- 100 MB (suficiente para IFCs grandes)
  ARRAY['application/octet-stream','model/ifc','text/plain','application/x-step']
)
ON CONFLICT (id) DO UPDATE SET
  public = true,
  file_size_limit = 104857600;

-- 2. Habilitar RLS em storage.objects (Supabase já habilita por padrão)
ALTER TABLE storage.objects ENABLE ROW LEVEL SECURITY;

-- 3. Política: qualquer um pode LER (SELECT) — bucket público
DROP POLICY IF EXISTS "ifc-models read public" ON storage.objects;
CREATE POLICY "ifc-models read public"
  ON storage.objects FOR SELECT
  USING (bucket_id = 'ifc-models');

-- 4. Política: anon pode UPLOAD (INSERT) — para o app web fazer upload do IFC
DROP POLICY IF EXISTS "ifc-models insert anon" ON storage.objects;
CREATE POLICY "ifc-models insert anon"
  ON storage.objects FOR INSERT
  WITH CHECK (bucket_id = 'ifc-models');

-- 5. Política: anon pode UPDATE (sobrescrever current-model.ifc com upsert)
DROP POLICY IF EXISTS "ifc-models update anon" ON storage.objects;
CREATE POLICY "ifc-models update anon"
  ON storage.objects FOR UPDATE
  USING (bucket_id = 'ifc-models')
  WITH CHECK (bucket_id = 'ifc-models');

-- 6. Política: anon pode DELETE (limpeza/cleanup)
DROP POLICY IF EXISTS "ifc-models delete anon" ON storage.objects;
CREATE POLICY "ifc-models delete anon"
  ON storage.objects FOR DELETE
  USING (bucket_id = 'ifc-models');

-- ============================================
-- VERIFICAÇÃO
-- ============================================
-- Após aplicar, executar:
--   SELECT id, name, public, file_size_limit FROM storage.buckets WHERE id = 'ifc-models';
--   SELECT policyname, cmd FROM pg_policies WHERE tablename='objects' AND schemaname='storage' AND policyname LIKE 'ifc-%';
--
-- Esperado:
--   bucket ifc-models | public=true | limit=100MB
--   4 policies: read public, insert anon, update anon, delete anon
