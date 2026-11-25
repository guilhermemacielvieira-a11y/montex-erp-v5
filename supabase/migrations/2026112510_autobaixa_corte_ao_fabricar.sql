-- ============================================================================
-- BAIXA AUTOMÁTICA DO CORTE quando a marca sai do Corte para a produção
-- ============================================================================
-- Pedido da diretoria (25/11/2026): o saldo de estoque (inclusive o do GRUPO
-- AÇO) deve acompanhar o avanço das peças mesmo que o corte não seja apontado
-- no Kanban de Corte.
--
-- Regra: quando unidades de uma MARCA (pecas_producao) saem de 'aguardando'
-- (coluna ✂️ Corte do Kanban) para qualquer etapa de produção, as POSIÇÕES
-- pendentes que ela consome são marcadas como cortadas → o trigger
-- tg_corte_baixa_estoque dá a baixa no estoque (grupo → obra → fábrica).
--
-- Mesma lógica do motor services/fluxoIntegrado.js (corteEfetivo):
--   • POS ligada à marca (peça única: POS = código da marca, ou
--     materiais_corte.peca_id = peça): qtd = unidades novas × qtd/un;
--   • marca sem composição: estimado por FAMÍLIA (tesoura, coluna, viga…)
--     em kg, mais os itens gerais (chapas, porcas…) pela fração geral.
--   Só o INCREMENTO do movimento é baixado (alvo depois − alvo antes) e nunca
--   além do que já está cortado → obras antigas não baixam o histórico.
--   Linha de POS maior que o necessário é DIVIDIDA (parte cortada + resto).
--
-- Marca d'água por marca (fluxo_autobaixa_marcas.un_contabilizadas): só
-- unidades acima dela geram baixa (voltar para Corte e avançar de novo não
-- baixa duas vezes). Trigger DEFERRED (roda no commit, com o estado final do
-- split_peca/distribuir_peca). Erro na baixa NUNCA bloqueia a produção (vira
-- WARNING). Corte automático: status finalizado, SEM data_fim (não vira
-- produção de corte do dia no BI) e observação [AUTO-FAB].
-- ============================================================================

create table if not exists public.fluxo_autobaixa_marcas (
  obra_id text not null,
  marca text not null,
  un_contabilizadas numeric not null default 0,
  updated_at timestamptz not null default now(),
  primary key (obra_id, marca)
);
alter table public.fluxo_autobaixa_marcas enable row level security;
drop policy if exists fluxo_autobaixa_marcas_leitura on public.fluxo_autobaixa_marcas;
create policy fluxo_autobaixa_marcas_leitura on public.fluxo_autobaixa_marcas
  for select to authenticated using (true);

-- Família de peça para o corte estimado (= familiaCorte do fluxoIntegrado.js)
create or replace function public.montex_familia_corte(p text)
returns text language sql immutable set search_path to 'public' as $$
  select case
    when t = '' then 'GERAL'
    when t ~ '(TESOURA|[-_ ]TS$)' then 'TESOURA'
    when t ~ '(VIGA[-_ ]?MESTRA|[-_ ]VM$)' then 'VIGA-MESTRA'
    when t ~ 'TRELICA' then 'TRELICA'
    when t ~ '^TERCA' then 'TERCA'
    when t ~ 'COLUN' then 'COLUNA'
    when t ~ '^VIGA' then 'VIGA'
    when t ~ 'CALHA' then 'CALHA'
    when t ~ 'TIRANTE' then 'TIRANTE'
    when t ~ '(CONTRAVENT|DIAGONAL$)' then 'CONTRAVENTAMENTO'
    when t ~ 'MAO[-_ ]?FRANCESA' then 'MAO-FRANCESA'
    when t in ('CHAPA','SUPORTE','INSERTO','CHUMBADOR','PORCA','ARRUELA','MISULA','BOCAL',
               'PARAFUSO','CANTONEIRA','NERVURA','ENRIJECEDOR') then 'GERAL'
    else t end
  from (select upper(trim(translate(coalesce(p, ''),
          'áàâãäéèêëíìîïóòôõöúùûüçÁÀÂÃÄÉÈÊËÍÌÎÏÓÒÔÕÖÚÙÛÜÇ',
          'aaaaaeeeeiiiiooooouuuucAAAAAEEEEIIIIOOOOOUUUUC'))) t) s
$$;

-- Corta N unidades de uma linha de POS (divide a linha se N < quantidade).
-- Retorna o kg cortado (baixado pelo trigger tg_corte_baixa_estoque).
create or replace function public.fluxo_cortar_qtd(p_id text, p_qtd numeric, p_ref text default null)
returns numeric language plpgsql security definer set search_path to 'public' as $$
declare
  r public.materiais_corte%rowtype;
  q numeric; n numeric; kg_new numeric; v_id text; v_obs text;
begin
  select * into r from public.materiais_corte where id = p_id for update;
  if not found or lower(coalesce(r.status_corte, '')) in ('cortado','concluido','finalizado') then return 0; end if;
  q := greatest(coalesce(r.quantidade, 1), 1);
  n := least(q, greatest(1, round(coalesce(p_qtd, 0))));
  v_obs := trim(coalesce(r.observacoes, '') || ' [AUTO-FAB' || coalesce(' ' || p_ref, '') || ']');
  v_id := p_id;
  if n < q then
    kg_new := round(coalesce(r.peso_teorico, 0) * n / q, 2);
    v_id := p_id || '__fab' || to_char(clock_timestamp(), 'YYMMDDHH24MISSUS');
    insert into public.materiais_corte
    select (jsonb_populate_record(null::public.materiais_corte, to_jsonb(r) || jsonb_build_object(
      'id', v_id, 'quantidade', n, 'peso_teorico', kg_new, 'status_corte', 'aguardando',
      'baixa_estoque_kg', 0, 'data_inicio', null, 'data_fim', null,
      'created_at', now(), 'updated_at', now()))).*;
    update public.materiais_corte
       set quantidade = (q - n)::int, peso_teorico = coalesce(peso_teorico, 0) - kg_new, updated_at = now()
     where id = p_id;
  end if;
  -- status finalizado SEM data_fim → trigger baixa o estoque; não conta como corte do dia
  update public.materiais_corte
     set status_corte = 'finalizado', data_inicio = coalesce(data_inicio, now()),
         observacoes = v_obs, updated_at = now()
   where id = v_id
  returning * into r;
  return coalesce(r.peso_teorico, 0);
end;
$$;

-- Núcleo: baixa as posições consumidas pelas unidades NOVAS da marca em produção
create or replace function public.fluxo_autobaixa_marca(p_obra text, p_marca text)
returns json language plpgsql security definer set search_path to 'public' as $$
declare
  m text := upper(trim(coalesce(p_marca, '')));
  v_tot numeric; v_prod numeric; v_kg numeric; v_tipo text;
  v_wm numeric; v_delta numeric; v_delta_kg numeric; v_rows int;
  v_pos text; v_pq numeric; v_reg numeric; v_qpu numeric; v_after numeric; v_before numeric; v_inc numeric;
  v_cortado_kg numeric := 0; v_linhas int := 0; v_ref text;
  l record; pl record; n numeric;
  v_modo text := 'nenhum'; v_pools jsonb := '[]'::jsonb;
begin
  if p_obra is null or m = '' then return json_build_object('ok', false, 'motivo', 'sem obra/marca'); end if;

  select coalesce(sum(greatest(coalesce(quantidade, 1), 0)), 0),
         coalesce(sum(greatest(coalesce(quantidade, 1), 0)) filter (where lower(coalesce(etapa, 'aguardando')) <> 'aguardando'), 0),
         coalesce(sum(coalesce(peso_total, 0)), 0), min(tipo)
    into v_tot, v_prod, v_kg, v_tipo
    from public.pecas_producao where obra_id = p_obra and upper(trim(marca)) = m;

  -- 1ª vez que a marca aparece: registra a marca d'água, sem baixa (histórico/importação)
  insert into public.fluxo_autobaixa_marcas (obra_id, marca, un_contabilizadas)
  values (p_obra, m, v_prod) on conflict do nothing;
  get diagnostics v_rows = row_count;
  if v_rows = 1 then return json_build_object('ok', true, 'inicializado', true, 'em_producao', v_prod); end if;

  select un_contabilizadas into v_wm from public.fluxo_autobaixa_marcas
   where obra_id = p_obra and marca = m for update;
  v_delta := v_prod - v_wm;
  if v_delta <= 0 then return json_build_object('ok', true, 'delta', 0); end if;
  update public.fluxo_autobaixa_marcas set un_contabilizadas = v_prod, updated_at = now()
   where obra_id = p_obra and marca = m;
  v_delta_kg := case when v_tot > 0 then v_kg * v_delta / v_tot else 0 end;
  v_ref := 'marca ' || m;

  -- (1) POS ligada à marca (peça única)
  select upper(trim(marca)) into v_pos from public.materiais_corte
   where obra_id = p_obra and upper(trim(marca)) = m limit 1;
  if v_pos is null then
    select upper(trim(mc.marca)) into v_pos from public.materiais_corte mc
     where mc.obra_id = p_obra and mc.peca_id is not null
       and split_part(mc.peca_id, '__split_', 1) in (
         select split_part(id, '__split_', 1) from public.pecas_producao
          where obra_id = p_obra and upper(trim(marca)) = m)
     limit 1;
  end if;

  if v_pos is not null then
    v_modo := 'posicao';
    select coalesce(sum(greatest(coalesce(quantidade, 1), 0)), 0),
           coalesce(sum(greatest(coalesce(quantidade, 1), 0)) filter (where lower(coalesce(status_corte, '')) in ('cortado','concluido','finalizado')), 0)
      into v_pq, v_reg
      from public.materiais_corte where obra_id = p_obra and upper(trim(marca)) = v_pos;
    v_qpu := case when v_tot > 0 and v_pq > v_tot then greatest(1, round(v_pq / v_tot)) else 1 end;
    v_after := least(v_pq, v_prod * v_qpu);
    v_before := least(v_pq, (v_prod - v_delta) * v_qpu);
    v_inc := least(v_after - v_before, v_after - v_reg);
    for l in select id, greatest(coalesce(quantidade, 1), 1) q from public.materiais_corte
              where obra_id = p_obra and upper(trim(marca)) = v_pos
                and lower(coalesce(status_corte, '')) not in ('cortado','concluido','finalizado')
              order by length(id), id loop
      exit when v_inc <= 0;
      n := least(l.q, v_inc);
      v_cortado_kg := v_cortado_kg + public.fluxo_cortar_qtd(l.id, n, v_ref);
      v_linhas := v_linhas + 1;
      v_inc := v_inc - n;
    end loop;
  else
    -- (2) marca sem composição: estimado por família (kg) + itens gerais
    v_modo := 'familia';
    for pl in
      with mk as (
        select upper(trim(marca)) code, min(tipo) tipo,
               sum(coalesce(peso_total, 0)) tot,
               coalesce(sum(coalesce(peso_total, 0)) filter (where lower(coalesce(etapa, 'aguardando')) <> 'aguardando'), 0) prod,
               array_agg(distinct split_part(id, '__split_', 1)) bases
          from public.pecas_producao where obra_id = p_obra and coalesce(trim(marca), '') <> '' group by 1),
      posc as (select distinct upper(trim(marca)) pos from public.materiais_corte where obra_id = p_obra),
      pid as (select distinct split_part(peca_id, '__split_', 1) b, upper(trim(marca)) pos
                from public.materiais_corte where obra_id = p_obra and peca_id is not null),
      mk2 as (
        select mk.*, public.montex_familia_corte(mk.tipo) fam,
               (mk.code in (select pos from posc) or exists (select 1 from pid where pid.b = any (mk.bases))) linked,
               mk.prod - case when mk.code = m then v_delta_kg else 0 end prod_b
          from mk),
      fam as (
        select fam, sum(tot) kt, sum(prod) kp, sum(prod_b) kpb,
               coalesce(sum(tot) filter (where not linked), 0) kts,
               coalesce(sum(prod) filter (where not linked), 0) kps,
               coalesce(sum(prod_b) filter (where not linked), 0) kpsb
          from mk2 group by fam),
      g as (select sum(kts) t, sum(kps) p, sum(kpsb) pb, sum(kt) tt, sum(kp) pp, sum(kpb) ppb from fam),
      gf as (select case when t > 0 then p / t when tt > 0 then pp / tt else 0 end fa,
                    case when t > 0 then pb / t when tt > 0 then ppb / tt else 0 end fb from g),
      ligadas as (select pos from posc where pos in (select code from mk)
                  union select pid.pos from pid join mk on pid.b = any (mk.bases)),
      pool as (
        select public.montex_familia_corte(peca) fam, sum(coalesce(peso_teorico, 0)) tot,
               coalesce(sum(coalesce(peso_teorico, 0)) filter (where lower(coalesce(status_corte, '')) in ('cortado','concluido','finalizado')), 0) reg
          from public.materiais_corte
         where obra_id = p_obra and upper(trim(marca)) not in (select pos from ligadas)
         group by 1)
      select pool.fam, pool.tot, pool.reg,
             case when pool.fam = 'GERAL' or f.fam is null then gf.fa
                  when f.kts > 0 then f.kps / f.kts when f.kt > 0 then f.kp / f.kt else gf.fa end fa,
             case when pool.fam = 'GERAL' or f.fam is null then gf.fb
                  when f.kts > 0 then f.kpsb / f.kts when f.kt > 0 then f.kpb / f.kt else gf.fb end fb
        from pool left join fam f on f.fam = pool.fam cross join gf
    loop
      v_after := least(1, greatest(0, pl.fa)) * pl.tot;
      v_before := least(1, greatest(0, pl.fb)) * pl.tot;
      v_inc := least(v_after - v_before, v_after - pl.reg);
      continue when v_inc <= 0.05;
      v_pools := v_pools || jsonb_build_object('familia', pl.fam, 'kg', round(v_inc, 1));
      for l in select mc.id, greatest(coalesce(mc.quantidade, 1), 1) q, coalesce(mc.peso_teorico, 0) kg
                 from public.materiais_corte mc
                where mc.obra_id = p_obra and public.montex_familia_corte(mc.peca) = pl.fam
                  and lower(coalesce(mc.status_corte, '')) not in ('cortado','concluido','finalizado')
                  and upper(trim(mc.marca)) not in (
                    select upper(trim(marca)) from public.pecas_producao where obra_id = p_obra
                    union select upper(trim(x.marca)) from public.materiais_corte x
                     where x.obra_id = p_obra and x.peca_id is not null
                       and split_part(x.peca_id, '__split_', 1) in (select split_part(id, '__split_', 1) from public.pecas_producao where obra_id = p_obra))
                order by length(mc.marca), mc.marca, mc.id loop
        exit when v_inc <= 0.05;
        if l.kg <= 0 then continue; end if;
        if v_inc >= l.kg - 0.05 then n := l.q;
        else n := floor(l.q * v_inc / l.kg + 0.5);
        end if;
        if n < 1 then exit; end if;
        v_cortado_kg := v_cortado_kg + public.fluxo_cortar_qtd(l.id, n, v_ref);
        v_linhas := v_linhas + 1;
        v_inc := v_inc - l.kg * least(n, l.q) / l.q;
      end loop;
    end loop;
  end if;

  return json_build_object('ok', true, 'modo', v_modo, 'marca', m, 'unidades', v_delta,
                           'posicao', v_pos, 'linhas', v_linhas, 'kg', round(v_cortado_kg, 1), 'pools', v_pools);
end;
$$;

grant execute on function public.fluxo_autobaixa_marca(text, text) to authenticated;

-- Trigger (no commit) — erro vira WARNING, nunca bloqueia a produção
create or replace function public.trg_pecas_autobaixa_corte()
returns trigger language plpgsql security definer set search_path to 'public' as $$
begin
  if new.obra_id is null or coalesce(trim(new.marca), '') = '' then return null; end if;
  begin
    perform public.fluxo_autobaixa_marca(new.obra_id, new.marca);
  exception when others then
    raise warning 'autobaixa corte (obra %, marca %): %', new.obra_id, new.marca, sqlerrm;
  end;
  return null;
end;
$$;

-- Marca d'água inicial = situação atual (nada do histórico é baixado)
insert into public.fluxo_autobaixa_marcas (obra_id, marca, un_contabilizadas)
select obra_id, upper(trim(marca)),
       coalesce(sum(greatest(coalesce(quantidade, 1), 0)) filter (where lower(coalesce(etapa, 'aguardando')) <> 'aguardando'), 0)
  from public.pecas_producao
 where obra_id is not null and coalesce(trim(marca), '') <> ''
 group by 1, 2
on conflict (obra_id, marca) do nothing;

drop trigger if exists tg_pecas_autobaixa_corte on public.pecas_producao;
create constraint trigger tg_pecas_autobaixa_corte
  after insert or update of etapa, quantidade on public.pecas_producao
  deferrable initially deferred
  for each row execute function public.trg_pecas_autobaixa_corte();
