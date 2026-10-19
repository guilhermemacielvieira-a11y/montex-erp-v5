-- ============================================================================
-- Fluxo integrado: Obra → lista de material → estoque → CORTE (POS) → MARCA
-- ============================================================================
-- 1. composicao_marcas: quais POSIÇÕES (materiais_corte.marca) formam cada
--    MARCA (pecas_producao.marca) e quantas por unidade. Marca de peça única
--    (terça, tirante, calha: POS = MARCA) não precisa de linha — o motor do
--    app liga automaticamente.
-- 2. fluxo_material_obra(obra): necessário × estoque × cortado por chave de
--    estoque, usando AS MESMAS funções do trigger de baixa
--    (montex_resolver_perfil + montex_chave_estoque), para o "abastecido" da
--    tela bater com o que o banco baixa de verdade.
-- 3. Registro no repositório dos triggers de corte que só existiam no banco.
-- ============================================================================

create table if not exists public.composicao_marcas (
  id text primary key default ('CMP-' || replace(gen_random_uuid()::text, '-', '')),
  obra_id text not null,
  marca text not null,
  pos text not null,
  qtd_por_unidade numeric not null default 1 check (qtd_por_unidade > 0),
  origem text default 'importacao',
  created_at timestamptz default now(),
  updated_at timestamptz default now(),
  unique (obra_id, marca, pos)
);
create index if not exists composicao_marcas_obra_idx on public.composicao_marcas (obra_id);

alter table public.composicao_marcas enable row level security;
drop policy if exists auth_all_composicao_marcas on public.composicao_marcas;
create policy auth_all_composicao_marcas on public.composicao_marcas
  for all to authenticated using (true) with check (true);

-- ----------------------------------------------------------------------------
-- Necessário × estoque × cortado por chave de estoque (obra)
-- Estoque disponível segue a regra de estoque_aplicar_movimento: item da obra
-- (mesmo regime); se a obra não tem item da chave, o da fábrica (obra_id null).
-- ----------------------------------------------------------------------------
create or replace function public.fluxo_material_obra(p_obra_id text)
returns json
language plpgsql
stable
set search_path to 'public'
as $$
begin
  -- plpgsql: corpo validado só na execução (helpers montex_* existem no banco)
  return (
  with mc as (
    select id, perfil, material, coalesce(peso_teorico, 0) kg,
           lower(coalesce(status_corte, '')) in ('cortado', 'concluido', 'finalizado') cortado,
           baixa_estoque_kg,
           public.montex_chave_estoque(public.montex_resolver_perfil(perfil), material) chave
      from materiais_corte
     where obra_id = p_obra_id
  ),
  reg as (select public.obra_regime_material(p_obra_id) regime),
  est as (
    select e.chave,
           sum(e.peso_kg) filter (where e.obra_id = p_obra_id and e.regime_material = reg.regime) obra_kg,
           count(*) filter (where e.obra_id = p_obra_id and e.regime_material = reg.regime) obra_n,
           sum(e.peso_kg) filter (where e.obra_id is null and e.regime_material = 'proprio') fab_kg
      from estoque e, reg
     where e.chave in (select distinct chave from mc)
     group by e.chave
  ),
  ch as (
    select mc.chave, min(mc.perfil) perfil, min(mc.material) material,
           sum(kg) necessario_kg,
           sum(kg) filter (where cortado) cortado_kg,
           sum(kg) filter (where not cortado) a_cortar_kg,
           sum(coalesce(baixa_estoque_kg, 0)) baixado_kg,
           count(*) filter (where not cortado) itens_a_cortar
      from mc group by mc.chave
  )
  select json_build_object(
    'chaves', coalesce((
      select json_agg(json_build_object(
        'chave', ch.chave, 'perfil', ch.perfil, 'material', ch.material,
        'necessario_kg', round(ch.necessario_kg, 1),
        'cortado_kg', round(coalesce(ch.cortado_kg, 0), 1),
        'a_cortar_kg', round(coalesce(ch.a_cortar_kg, 0), 1),
        'baixado_kg', round(ch.baixado_kg, 1),
        'itens_a_cortar', ch.itens_a_cortar,
        'estoque_obra_kg', round(coalesce(est.obra_kg, 0), 1),
        'estoque_fabrica_kg', round(coalesce(est.fab_kg, 0), 1),
        'origem_estoque', case when coalesce(est.obra_n, 0) > 0 then 'obra' else 'fabrica' end,
        'disponivel_kg', round(greatest(0, case when coalesce(est.obra_n, 0) > 0
                                                 then coalesce(est.obra_kg, 0)
                                                 else coalesce(est.fab_kg, 0) end), 1)
      ) order by ch.necessario_kg desc)
      from ch left join est on est.chave = ch.chave), '[]'::json),
    'itens', coalesce((select json_agg(json_build_object('id', id, 'chave', chave)) from mc), '[]'::json)
  ));
end;
$$;

grant execute on function public.fluxo_material_obra(text) to authenticated;

-- ----------------------------------------------------------------------------
-- Triggers de corte (já em produção; registrados aqui para o repositório
-- reproduzir o banco). Baixa/estorno de estoque na mesma transação do status.
-- ----------------------------------------------------------------------------
create or replace function public.trg_corte_insert_historico()
returns trigger language plpgsql as $$
begin
  -- Linha importada já cortada = histórico: não baixa estoque retroativamente
  if lower(coalesce(new.status_corte,'')) in ('cortado','concluido','finalizado') then
    new.baixa_estoque_kg := null;
  end if;
  return new;
end;
$$;

create or replace function public.trg_corte_baixa_estoque()
returns trigger language plpgsql security definer set search_path to 'public' as $$
declare
  v_cortado_novo boolean := lower(coalesce(new.status_corte,'')) in ('cortado','concluido','finalizado');
  v_cortado_ant  boolean := lower(coalesce(old.status_corte,'')) in ('cortado','concluido','finalizado');
  v_peso  numeric := coalesce(new.peso_teorico, 0);
  v_delta numeric;
  v_quem  text := coalesce(new.funcionario_corte, new.maquina);
begin
  if new.baixa_estoque_kg is null then return new; end if;

  if v_cortado_novo and not v_cortado_ant then
    v_delta := v_peso - new.baixa_estoque_kg;
    if v_delta <> 0 then
      perform public.estoque_aplicar_movimento(
        new.obra_id, new.perfil, new.material, -v_delta, 'saida', 'producao',
        'Baixa por corte · marca ' || coalesce(new.marca,'?'), new.id, v_quem);
    end if;
    new.baixa_estoque_kg := v_peso;

  elsif v_cortado_ant and not v_cortado_novo then
    if new.baixa_estoque_kg <> 0 then
      perform public.estoque_aplicar_movimento(
        new.obra_id, new.perfil, new.material, new.baixa_estoque_kg, 'entrada', 'producao',
        'Estorno de corte · marca ' || coalesce(new.marca,'?'), new.id, v_quem);
    end if;
    new.baixa_estoque_kg := 0;

  elsif v_cortado_novo and v_cortado_ant and v_peso <> new.baixa_estoque_kg then
    v_delta := v_peso - new.baixa_estoque_kg;
    perform public.estoque_aplicar_movimento(
      new.obra_id, new.perfil, new.material, -v_delta,
      case when v_delta > 0 then 'saida' else 'entrada' end, 'producao',
      'Correção de corte · marca ' || coalesce(new.marca,'?'), new.id, v_quem);
    new.baixa_estoque_kg := v_peso;
  end if;

  return new;
end;
$$;

drop trigger if exists tg_corte_insert_historico on public.materiais_corte;
create trigger tg_corte_insert_historico before insert on public.materiais_corte
  for each row execute function public.trg_corte_insert_historico();

drop trigger if exists tg_corte_baixa_estoque on public.materiais_corte;
create trigger tg_corte_baixa_estoque before update of status_corte, peso_teorico, quantidade on public.materiais_corte
  for each row execute function public.trg_corte_baixa_estoque();
