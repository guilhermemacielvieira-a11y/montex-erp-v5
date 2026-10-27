-- ============================================================================
-- G5 NOVAAGRO 040 — reajuste da divisão Etapa 1 (obra-009) × Etapa 2 (obra-009b)
-- Decisão do usuário em 27/10/2026:
--   1. As 9 vigas-mestras já produzidas (VM8A, VM10A, VM11A×3, VM13A, VM15A,
--      VM16A, VM17A — 7.864,26 kg) FICAM na Etapa 1.
--   2. TS22A e TS25A (455,8 kg) estão em fabricação → passam para a Etapa 1.
--   3. Corrigir as duas etapas em todos os processos.
--
-- Processos ajustados (mesmos que a divisão de 25/08 alterou):
--   a) pecas_producao   — TS22A/TS25A → obra-009
--   b) materiais_corte  — TS22/TS25: 2×POS 58 + 2×POS 59 (UE250X85X25X2.25);
--                         vigas-mestras: 9/16 de cada linha VM da Etapa 2
--                         (a divisão de 25/08 pôs 16 VMs na Etapa 2; 9 ficaram
--                         na Etapa 1 — sem lista de composição, a fração é
--                         proporcional por linha)
--   c) estoque          — demanda (pedido/falta) por perfil: +kg na Etapa 1,
--                         −kg na Etapa 2
--   d) obras            — peso de contrato por etapa (+/− 8.320,06 kg); valor
--                         da Etapa 1 mantém R$ 2,80/kg
-- Idempotente: só roda se TS22A ainda estiver na obra-009b.
-- ============================================================================
do $$
declare
  v_kg_pecas numeric;
begin
  if not exists (select 1 from pecas_producao where id = 'PEC-NOVAAGRO-TS22A' and obra_id = 'obra-009b') then
    raise notice 'Reajuste G5 já aplicado — nada a fazer';
    return;
  end if;

  -- Backups
  create table if not exists g5_reaj_20261027_bkp_pecas as
    select * from pecas_producao where obra_id in ('obra-009', 'obra-009b');
  create table if not exists g5_reaj_20261027_bkp_corte as
    select * from materiais_corte where obra_id in ('obra-009', 'obra-009b');
  create table if not exists g5_reaj_20261027_bkp_estoque as
    select * from estoque where obra_id in ('obra-009', 'obra-009b');
  create table if not exists g5_reaj_20261027_bkp_obras as
    select * from obras where id in ('obra-009', 'obra-009b');

  -- Plano de movimentação da lista de corte (Etapa 2 → Etapa 1)
  create temporary table g5_mov on commit drop as
  select e2.id id_e2, e2.marca pos, e2.peca, e2.perfil, e2.comprimento_mm, e2.material,
         e2.quantidade q, e2.peso_teorico kg,
         case when e2.peca in ('DIAGONAL-VM', 'MONTANTE-VM', 'VIGA-MESTRA') then round(e2.quantidade * 9.0 / 16)::int
              when e2.perfil = 'UE250X85X25X2.25' and e2.marca in ('58', '59') then 2
              else 0 end mover,
         (select e1.id from materiais_corte e1
           where e1.obra_id = 'obra-009' and e1.marca = e2.marca
             and e1.perfil = e2.perfil and e1.comprimento_mm = e2.comprimento_mm
           limit 1) id_e1
    from materiais_corte e2
   where e2.obra_id = 'obra-009b' and lower(coalesce(e2.status_corte, '')) not in ('cortado', 'concluido', 'finalizado');
  delete from g5_mov where mover <= 0 or mover >= q;
  alter table g5_mov add column kg_mover numeric;
  update g5_mov set kg_mover = round(kg * mover / q, 2);

  -- b1) Etapa 1: soma nas linhas existentes (todas "aguardando" → trigger não movimenta estoque)
  update materiais_corte e1
     set quantidade = e1.quantidade + m.mover,
         peso_teorico = round(e1.peso_teorico + m.kg_mover, 2),
         observacoes = coalesce(e1.observacoes || ' | ', '') || '+' || m.mover || ' un vindas da Etapa 2 (reajuste 27/10/2026)',
         updated_at = now()
    from g5_mov m
   where e1.id = m.id_e1;

  -- b2) Etapa 1: posições que só existiam na Etapa 2
  insert into materiais_corte (id, obra_id, marca, peca, quantidade, perfil, comprimento_mm, material,
                               peso_teorico, status_corte, baixa_estoque_kg, observacoes, created_at, updated_at)
  select 'MC-2025-28-' || lpad(m.pos, 4, '0'), 'obra-009', m.pos, m.peca, m.mover, m.perfil, m.comprimento_mm, m.material,
         m.kg_mover, 'aguardando', 0, 'Vinda da Etapa 2 (reajuste 27/10/2026)', now(), now()
    from g5_mov m
   where m.id_e1 is null;

  -- b3) Etapa 2: retira o que foi para a Etapa 1
  update materiais_corte e2
     set quantidade = e2.quantidade - m.mover,
         peso_teorico = round(e2.peso_teorico - m.kg_mover, 2),
         observacoes = coalesce(e2.observacoes || ' | ', '') || '-' || m.mover || ' un para a Etapa 1 (reajuste 27/10/2026)',
         updated_at = now()
    from g5_mov m
   where e2.id = m.id_e2;

  -- c) Estoque: demanda por perfil
  update estoque e
     set pedido = round(coalesce(e.pedido, 0) + d.kg, 1),
         falta = greatest(round(coalesce(e.pedido, 0) + d.kg - coalesce(e.comprado, 0), 1), 0),
         updated_at = now()
    from (select perfil, sum(kg_mover) kg from g5_mov group by perfil) d
   where e.obra_id = 'obra-009' and e.perfil = d.perfil;

  update estoque e
     set pedido = greatest(round(coalesce(e.pedido, 0) - d.kg, 1), 0),
         falta = greatest(round(coalesce(e.pedido, 0) - d.kg - coalesce(e.comprado, 0), 1), 0),
         updated_at = now()
    from (select perfil, sum(kg_mover) kg from g5_mov group by perfil) d
   where e.obra_id = 'obra-009b' and e.perfil = d.perfil;

  -- a) Peças TS22A / TS25A → Etapa 1
  update pecas_producao
     set obra_id = 'obra-009',
         obra_nome = 'SPASSO - GALPÃO G5 - NOVAAGRO 040',
         codigo = '2025-28',
         observacoes = coalesce(observacoes || ' | ', '') || 'Movida para a Etapa 1 em 27/10/2026 (em fabricação)',
         updated_at = now()
   where id in ('PEC-NOVAAGRO-TS22A', 'PEC-NOVAAGRO-TS25A') and obra_id = 'obra-009b';

  -- d) Contrato por etapa: + 9 VMs (7.864,26 kg) + TS22A/TS25A (455,8 kg)
  v_kg_pecas := 7864.26 + (select sum(peso_total) from pecas_producao where id in ('PEC-NOVAAGRO-TS22A', 'PEC-NOVAAGRO-TS25A'));
  update obras
     set contrato_peso_total = round(contrato_peso_total + v_kg_pecas, 2),
         contrato_valor_total = case when contrato_valor_total is not null
                                     then round((contrato_peso_total + v_kg_pecas) * coalesce(valor_kg_fabricacao, contrato_valor_total / nullif(contrato_peso_total, 0)), 2)
                                end,
         updated_at = now()
   where id = 'obra-009';
  update obras
     set contrato_peso_total = round(contrato_peso_total - v_kg_pecas, 2),
         updated_at = now()
   where id = 'obra-009b';

  raise notice 'Reajuste G5 aplicado: % kg de peças e % kg de lista de corte para a Etapa 1',
    v_kg_pecas, (select sum(kg_mover) from g5_mov);
end $$;
