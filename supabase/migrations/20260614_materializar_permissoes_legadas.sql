-- ============================================================
-- Materializa as PERMISSÕES dos usuários legados (acesso por módulos)
-- ============================================================
-- Contexto: o modelo passou a ser "acesso = módulos selecionados; a função
-- (role) é só um preset". O hasPermission (app) usa SOMENTE `permissoes` quando
-- ela é não-vazia; vazio/NULL = herda o preset do papel.
--
-- Esta migration GRAVA explicitamente, para cada usuário legado (sem permissões
-- próprias), o preset EXATO da sua função. É BEHAVIOR-PRESERVING: o usuário não
-- ganha nem perde acesso — só deixa de depender da função em runtime, fechando
-- o requisito "sem incluir por função" também para quem já existia.
--
-- Seguro/idempotente:
--   • Só toca quem está com permissoes NULL/[] (não sobrescreve personalizações).
--   • NÃO toca em admin (fica NULL → herda '*' do papel = acesso total).
--   • Funções desconhecidas (ex.: 'producao' legado) ficam intactas — revise à mão.
--   • Pode rodar quantas vezes quiser.
--
-- Os arrays abaixo são cópia fiel de src/lib/permissions.js → ROLE_PERMISSIONS_MAP
-- (que casa com PERMISSIONS de src/lib/AuthContext.jsx). Ao mudar um preset lá,
-- atualize aqui se for re-materializar.
-- ============================================================

BEGIN;

-- Predicado de "sem permissões próprias": NULL, não-array, ou array vazio.
-- (jsonb_array_length só vale para array; guardamos com jsonb_typeof.)

-- GERENTE -----------------------------------------------------
UPDATE user_profiles SET permissoes = '[
  "dashboard.view","dashboard.export","command.view","colaboracao.view",
  "comercial.view","orcamentos.view","orcamentos.edit","orcamentos.aprovar",
  "clientes.view","clientes.edit","projetos.view","projetos.edit","projetos.create",
  "suprimentos.view","estoque.view","estoque.edit","estoque.movimentar",
  "compras.view","compras.edit","compras.aprovar","materiais.view","materiais.edit",
  "producao.view","producao.edit","producao.lancar_avanco","producao.aprovar",
  "kanban.view","kanban.edit","equipes.view","equipes.edit","equipes.escalar",
  "expedicao.view","expedicao.edit","expedicao.aprovar","obras.view","obras.edit",
  "medicao.view","medicao.edit","medicao.aprovar","financeiro.view","financeiro.edit",
  "bi.view","nfs.view","nfs.edit","relatorios.view","relatorios.export","usuarios.view"
]'::jsonb
WHERE role = 'gerente'
  AND (permissoes IS NULL OR jsonb_typeof(permissoes) <> 'array' OR jsonb_array_length(permissoes) = 0);

-- SUPERVISOR --------------------------------------------------
UPDATE user_profiles SET permissoes = '[
  "dashboard.view","command.view","colaboracao.view",
  "producao.view","producao.edit","producao.lancar_avanco",
  "kanban.view","kanban.edit","equipes.view","equipes.edit","equipes.escalar",
  "materiais.view","materiais.edit","suprimentos.view","estoque.view","estoque.edit",
  "estoque.movimentar","compras.view","expedicao.view","expedicao.edit",
  "obras.view","obras.edit","medicao.view","medicao.edit",
  "projetos.view","nfs.view","relatorios.view"
]'::jsonb
WHERE role = 'supervisor'
  AND (permissoes IS NULL OR jsonb_typeof(permissoes) <> 'array' OR jsonb_array_length(permissoes) = 0);

-- OPERADOR ----------------------------------------------------
UPDATE user_profiles SET permissoes = '[
  "dashboard.view","command.view","colaboracao.view",
  "producao.view","producao.lancar_avanco","kanban.view","kanban.edit",
  "equipes.view","materiais.view","suprimentos.view","estoque.view","obras.view"
]'::jsonb
WHERE role = 'operador'
  AND (permissoes IS NULL OR jsonb_typeof(permissoes) <> 'array' OR jsonb_array_length(permissoes) = 0);

-- FINANCEIRO --------------------------------------------------
UPDATE user_profiles SET permissoes = '[
  "dashboard.view","dashboard.export","command.view","colaboracao.view",
  "comercial.view","orcamentos.view","orcamentos.edit","clientes.view","clientes.edit",
  "projetos.view","suprimentos.view","compras.view","compras.edit",
  "financeiro.view","financeiro.edit","financeiro.aprovar","nfs.view","nfs.edit",
  "medicao.view","medicao.edit","bi.view","relatorios.view","relatorios.export"
]'::jsonb
WHERE role = 'financeiro'
  AND (permissoes IS NULL OR jsonb_typeof(permissoes) <> 'array' OR jsonb_array_length(permissoes) = 0);

-- VIEWER ------------------------------------------------------
UPDATE user_profiles SET permissoes = '[
  "dashboard.view","command.view","colaboracao.view",
  "producao.view","obras.view","suprimentos.view","estoque.view","compras.view",
  "expedicao.view","medicao.view","projetos.view","nfs.view","materiais.view",
  "kanban.view","bi.view","relatorios.view"
]'::jsonb
WHERE role = 'viewer'
  AND (permissoes IS NULL OR jsonb_typeof(permissoes) <> 'array' OR jsonb_array_length(permissoes) = 0);

COMMIT;

-- ============================================================
-- VERIFICAÇÃO (rode após o COMMIT): quem ainda está sem permissões próprias.
-- Admin aparece de propósito (fica NULL = acesso total). Funções desconhecidas
-- (role fora de admin/gerente/supervisor/operador/financeiro/viewer) também
-- aparecem aqui e devem ser revisadas manualmente.
-- ============================================================
-- SELECT email, role,
--        CASE WHEN permissoes IS NULL THEN 'herda papel'
--             WHEN jsonb_typeof(permissoes) <> 'array' THEN 'invalido'
--             WHEN jsonb_array_length(permissoes) = 0 THEN 'vazio'
--             ELSE jsonb_array_length(permissoes) || ' modulos' END AS situacao
-- FROM user_profiles
-- ORDER BY role, email;
