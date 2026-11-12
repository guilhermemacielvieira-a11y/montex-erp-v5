-- ============================================================================
-- G5 NOVAAGRO 040 — Etapa 1 (obra-009) recebe da Etapa 2 (obra-009b), em todos
-- os processos (peças, lista de corte, estoque, contrato):
--   Bloco 1 (pedido de 04/11/2026): TS20A, TS49A e as 3 TS34A
--   Bloco 2 (pedido de 12/11/2026): TRE64A, TR69F e TRE65B (1 un cada)
-- Cada bloco é idempotente e roda só se ainda não foi aplicado.
-- Rodar este arquivo inteiro uma vez no SQL Editor.
-- ============================================================================

-- ---------------------------------------------------------------- Bloco 1
do $$
declare
  v_kg numeric;
  v_kg_tesouras_e2 numeric;
begin
  if not exists (select 1 from pecas_producao where id = 'PEC-NOVAAGRO-TS20A' and obra_id = 'obra-009b') then
    raise notice 'Já aplicado — nada a fazer';
    return;
  end if;

  create table if not exists g5_reaj_20261104_bkp_pecas as
    select * from pecas_producao where obra_id in ('obra-009', 'obra-009b');
  create table if not exists g5_reaj_20261104_bkp_corte as
    select * from materiais_corte where obra_id in ('obra-009', 'obra-009b');
  create table if not exists g5_reaj_20261104_bkp_estoque as
    select * from estoque where obra_id in ('obra-009', 'obra-009b');
  create table if not exists g5_reaj_20261104_bkp_obras as
    select * from obras where id in ('obra-009', 'obra-009b');

  v_kg := (select sum(peso_total) from pecas_producao
            where obra_id = 'obra-009b' and id in ('PEC-NOVAAGRO-TS20A', 'PEC-NOVAAGRO-TS49A', 'PEC-NOVAAGRO-E2-TS34A'));
  v_kg_tesouras_e2 := (select sum(peso_total) from pecas_producao where obra_id = 'obra-009b' and tipo = 'TESOURA');

  -- Fração a mover por grupo de corte (peca|perfil)
  create temporary table g5_frac on commit drop as
  select * from (values
    ('TESOURA', 'UE200X75X25X3.75', 2.0 / 8),
    ('TESOURA', 'UE200X75X25X4.25', 3.0 / 42)
  ) v(peca, perfil, f)
  union all
  select 'DIAGONAL-TS', 'UE150X60X20X2.25', v_kg / v_kg_tesouras_e2
  union all
  select 'MONTANTE-TS', 'UE150X60X20X2.25', v_kg / v_kg_tesouras_e2;

  -- Maior resto: total movido por grupo = round(qtd do grupo × fração)
  create temporary table g5_mov on commit drop as
  with base as (
    select e2.id id_e2, e2.marca pos, e2.peca, e2.perfil, e2.comprimento_mm, e2.material,
           e2.quantidade q, e2.peso_teorico kg, fr.f, e2.quantidade * fr.f exato
      from materiais_corte e2
      join g5_frac fr on fr.peca = e2.peca and fr.perfil = e2.perfil
     where e2.obra_id = 'obra-009b'
       and lower(coalesce(e2.status_corte, '')) not in ('cortado', 'concluido', 'finalizado')),
  alvo as (select peca, perfil, round(sum(exato))::int alvo, sum(floor(exato))::int piso from base group by peca, perfil),
  rk as (select b.*, row_number() over (partition by b.peca, b.perfil order by (b.exato - floor(b.exato)) desc, b.q desc, b.pos) r
           from base b)
  select rk.id_e2, rk.pos, rk.peca, rk.perfil, rk.comprimento_mm, rk.material, rk.q, rk.kg,
         least(rk.q, floor(rk.exato)::int + case when rk.r <= a.alvo - a.piso then 1 else 0 end) mover,
         (select e1.id from materiais_corte e1
           where e1.obra_id = 'obra-009' and e1.marca = rk.pos
             and e1.perfil = rk.perfil and e1.comprimento_mm = rk.comprimento_mm
             and lower(coalesce(e1.status_corte, '')) not in ('cortado', 'concluido', 'finalizado')
           limit 1) id_e1
    from rk join alvo a on a.peca = rk.peca and a.perfil = rk.perfil;
  delete from g5_mov where mover <= 0;
  alter table g5_mov add column kg_mover numeric;
  update g5_mov set kg_mover = round(kg * mover / q, 2);

  -- b) Lista de corte
  update materiais_corte e1
     set quantidade = e1.quantidade + m.mover,
         peso_teorico = round(e1.peso_teorico + m.kg_mover, 2),
         observacoes = coalesce(e1.observacoes || ' | ', '') || '+' || m.mover || ' un vindas da Etapa 2 (TS20A/TS49A/TS34A, 04/11/2026)',
         updated_at = now()
    from g5_mov m
   where e1.id = m.id_e1;

  insert into materiais_corte (id, obra_id, marca, peca, quantidade, perfil, comprimento_mm, material,
                               peso_teorico, status_corte, baixa_estoque_kg, observacoes, created_at, updated_at)
  select 'MC-2025-28-' || lpad(m.pos, 4, '0') || case when exists (select 1 from materiais_corte x where x.id = 'MC-2025-28-' || lpad(m.pos, 4, '0')) then '-B' else '' end,
         'obra-009', m.pos, m.peca, m.mover, m.perfil, m.comprimento_mm, m.material,
         m.kg_mover, 'aguardando', 0, 'Vinda da Etapa 2 (TS20A/TS49A/TS34A, 04/11/2026)', now(), now()
    from g5_mov m
   where m.id_e1 is null;

  update materiais_corte e2
     set quantidade = e2.quantidade - m.mover,
         peso_teorico = round(e2.peso_teorico - m.kg_mover, 2),
         observacoes = coalesce(e2.observacoes || ' | ', '') || '-' || m.mover || ' un para a Etapa 1 (TS20A/TS49A/TS34A, 04/11/2026)',
         updated_at = now()
    from g5_mov m
   where e2.id = m.id_e2 and m.mover < m.q;
  delete from materiais_corte e2 using g5_mov m where e2.id = m.id_e2 and m.mover >= m.q;

  -- c) Estoque (demanda por perfil)
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

  -- a) Peças
  update pecas_producao
     set obra_id = 'obra-009',
         obra_nome = 'SPASSO - GALPÃO G5 - NOVAAGRO 040',
         codigo = '2025-28',
         observacoes = coalesce(observacoes || ' | ', '') || 'Movida para a Etapa 1 em 04/11/2026',
         updated_at = now()
   where obra_id = 'obra-009b' and id in ('PEC-NOVAAGRO-TS20A', 'PEC-NOVAAGRO-TS49A', 'PEC-NOVAAGRO-E2-TS34A');

  -- d) Contrato por etapa
  update obras
     set contrato_peso_total = round(contrato_peso_total + v_kg, 2),
         contrato_valor_total = case when contrato_valor_total is not null
                                     then round((contrato_peso_total + v_kg) * coalesce(valor_kg_fabricacao, contrato_valor_total / nullif(contrato_peso_total, 0)), 2)
                                end,
         updated_at = now()
   where id = 'obra-009';
  update obras
     set contrato_peso_total = round(contrato_peso_total - v_kg, 2),
         updated_at = now()
   where id = 'obra-009b';
end $$;

-- ---------------------------------------------------------------- Bloco 2
-- TRE64A (79,2 kg) e TRE65B (126,8 kg): treliças US75X40X2 — lista de corte
--   da família treliça (barras US75 + diagonais/montantes US68) movida pela
--   fração do peso (sem lista de composição; maior resto, total exato).
-- TR69F (3,7 kg): tirante FERRO Ø1/2 — sem linha de corte na G5; só peça e
--   demanda de estoque do perfil.
do $$
declare
  v_kg numeric;
  v_kg_trel_mov numeric;
  v_kg_trel_e2 numeric;
begin
  if not exists (select 1 from pecas_producao where id = 'PEC-NOVAAGRO-TRE64A' and obra_id = 'obra-009b') then
    raise notice 'Bloco 2 já aplicado — nada a fazer';
    return;
  end if;

  create table if not exists g5_reaj_20261112_bkp_pecas as
    select * from pecas_producao where obra_id in ('obra-009', 'obra-009b');
  create table if not exists g5_reaj_20261112_bkp_corte as
    select * from materiais_corte where obra_id in ('obra-009', 'obra-009b');
  create table if not exists g5_reaj_20261112_bkp_estoque as
    select * from estoque where obra_id in ('obra-009', 'obra-009b');
  create table if not exists g5_reaj_20261112_bkp_obras as
    select * from obras where id in ('obra-009', 'obra-009b');

  v_kg := (select sum(peso_total) from pecas_producao
            where obra_id = 'obra-009b' and id in ('PEC-NOVAAGRO-TRE64A', 'PEC-NOVAAGRO-TRE65B', 'PEC-NOVAAGRO-TR69F'));
  v_kg_trel_mov := (select sum(peso_total) from pecas_producao
            where obra_id = 'obra-009b' and id in ('PEC-NOVAAGRO-TRE64A', 'PEC-NOVAAGRO-TRE65B'));
  v_kg_trel_e2 := (select sum(peso_total) from pecas_producao where obra_id = 'obra-009b' and tipo ilike 'TRELI%');

  create temporary table g5_mov2 on commit drop as
  with base as (
    select e2.id id_e2, e2.marca pos, e2.peca, e2.perfil, e2.comprimento_mm, e2.material,
           e2.quantidade q, e2.peso_teorico kg, e2.quantidade * (v_kg_trel_mov / v_kg_trel_e2) exato
      from materiais_corte e2
     where e2.obra_id = 'obra-009b' and e2.peca ilike '%TRELI%'
       and lower(coalesce(e2.status_corte, '')) not in ('cortado', 'concluido', 'finalizado')),
  alvo as (select peca, perfil, round(sum(exato))::int alvo, sum(floor(exato))::int piso from base group by peca, perfil),
  rk as (select b.*, row_number() over (partition by b.peca, b.perfil order by (b.exato - floor(b.exato)) desc, b.q desc, b.pos) r
           from base b)
  select rk.id_e2, rk.pos, rk.peca, rk.perfil, rk.comprimento_mm, rk.material, rk.q, rk.kg,
         least(rk.q, floor(rk.exato)::int + case when rk.r <= a.alvo - a.piso then 1 else 0 end) mover,
         (select e1.id from materiais_corte e1
           where e1.obra_id = 'obra-009' and e1.marca = rk.pos
             and e1.perfil = rk.perfil and e1.comprimento_mm = rk.comprimento_mm
             and lower(coalesce(e1.status_corte, '')) not in ('cortado', 'concluido', 'finalizado')
           limit 1) id_e1
    from rk join alvo a on a.peca = rk.peca and a.perfil = rk.perfil;
  delete from g5_mov2 where mover <= 0;
  alter table g5_mov2 add column kg_mover numeric;
  update g5_mov2 set kg_mover = round(kg * mover / q, 2);

  update materiais_corte e1
     set quantidade = e1.quantidade + m.mover,
         peso_teorico = round(e1.peso_teorico + m.kg_mover, 2),
         observacoes = coalesce(e1.observacoes || ' | ', '') || '+' || m.mover || ' un vindas da Etapa 2 (TRE64A/TRE65B, 12/11/2026)',
         updated_at = now()
    from g5_mov2 m
   where e1.id = m.id_e1;

  insert into materiais_corte (id, obra_id, marca, peca, quantidade, perfil, comprimento_mm, material,
                               peso_teorico, status_corte, baixa_estoque_kg, observacoes, created_at, updated_at)
  select 'MC-2025-28-' || lpad(m.pos, 4, '0') || case when exists (select 1 from materiais_corte x where x.id = 'MC-2025-28-' || lpad(m.pos, 4, '0')) then '-B' else '' end,
         'obra-009', m.pos, m.peca, m.mover, m.perfil, m.comprimento_mm, m.material,
         m.kg_mover, 'aguardando', 0, 'Vinda da Etapa 2 (TRE64A/TRE65B, 12/11/2026)', now(), now()
    from g5_mov2 m
   where m.id_e1 is null;

  update materiais_corte e2
     set quantidade = e2.quantidade - m.mover,
         peso_teorico = round(e2.peso_teorico - m.kg_mover, 2),
         observacoes = coalesce(e2.observacoes || ' | ', '') || '-' || m.mover || ' un para a Etapa 1 (TRE64A/TRE65B, 12/11/2026)',
         updated_at = now()
    from g5_mov2 m
   where e2.id = m.id_e2 and m.mover < m.q;
  delete from materiais_corte e2 using g5_mov2 m where e2.id = m.id_e2 and m.mover >= m.q;

  -- Estoque: perfis da lista de corte movida + FERRO Ø1/2 do tirante TR69F
  create temporary table g5_dem2 on commit drop as
    select perfil, sum(kg_mover) kg from g5_mov2 group by perfil
    union all
    select perfil, peso_total from pecas_producao where id = 'PEC-NOVAAGRO-TR69F' and obra_id = 'obra-009b';

  update estoque e
     set pedido = round(coalesce(e.pedido, 0) + d.kg, 1),
         falta = greatest(round(coalesce(e.pedido, 0) + d.kg - coalesce(e.comprado, 0), 1), 0),
         updated_at = now()
    from (select perfil, sum(kg) kg from g5_dem2 group by perfil) d
   where e.obra_id = 'obra-009' and e.perfil = d.perfil;
  update estoque e
     set pedido = greatest(round(coalesce(e.pedido, 0) - d.kg, 1), 0),
         falta = greatest(round(coalesce(e.pedido, 0) - d.kg - coalesce(e.comprado, 0), 1), 0),
         updated_at = now()
    from (select perfil, sum(kg) kg from g5_dem2 group by perfil) d
   where e.obra_id = 'obra-009b' and e.perfil = d.perfil;

  update pecas_producao
     set obra_id = 'obra-009',
         obra_nome = 'SPASSO - GALPÃO G5 - NOVAAGRO 040',
         codigo = '2025-28',
         observacoes = coalesce(observacoes || ' | ', '') || 'Movida para a Etapa 1 em 12/11/2026',
         updated_at = now()
   where obra_id = 'obra-009b' and id in ('PEC-NOVAAGRO-TRE64A', 'PEC-NOVAAGRO-TRE65B', 'PEC-NOVAAGRO-TR69F');

  update obras
     set contrato_peso_total = round(contrato_peso_total + v_kg, 2),
         contrato_valor_total = case when contrato_valor_total is not null
                                     then round((contrato_peso_total + v_kg) * coalesce(valor_kg_fabricacao, contrato_valor_total / nullif(contrato_peso_total, 0)), 2)
                                end,
         updated_at = now()
   where id = 'obra-009';
  update obras
     set contrato_peso_total = round(contrato_peso_total - v_kg, 2),
         updated_at = now()
   where id = 'obra-009b';
end $$;
