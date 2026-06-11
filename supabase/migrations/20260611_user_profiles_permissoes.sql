-- Permissoes customizadas por usuario (override do papel/role).
-- NULL ou [] => o app usa as permissoes do papel (PERMISSIONS). Array nao-vazio => manda.
ALTER TABLE user_profiles ADD COLUMN IF NOT EXISTS permissoes JSONB DEFAULT NULL;
