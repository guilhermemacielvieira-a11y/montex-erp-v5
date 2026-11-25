-- ============================================================================
-- GRUPO AÇO 2026: estoque unificado, NÃO é obra
-- ============================================================================
-- O registro `grupo-aco-2026` da tabela obras é só o dono do estoque comum das
-- obras em `estoque_grupos` (Loja Superluna Brumadinho, Vila Galé ×3, Galpão
-- Roberto, Galpão GB RUM e Casa do Jeferson). A baixa de corte já sai do
-- grupo (estoque_aplicar_movimento: grupo → obra → fábrica).
--
-- 1) fluxo_material_obra: o "estoque disponível" do Kanban de Corte segue a
--    MESMA ordem da baixa (grupo → obra → fábrica). Antes ignorava o grupo e
--    as obras membro apareciam "sem estoque".
-- 2) meta.obras_membro do registro alinhado com estoque_grupos (fonte de
--    verdade), para quem ainda lê o meta.
-- ============================================================================

create or replace function public.fluxo_material_obra(p_obra_id text)
returns json
language plpgsql
stable
set search_path to 'public'
as $$
declare
  v_grupo text := (select g.grupo_obra_id from public.estoque_grupos g where g.obra_id = p_obra_id limit 1);
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
           sum(e.peso_kg) filter (where v_grupo is not null and e.obra_id = v_grupo) grupo_kg,
           count(*) filter (where v_grupo is not null and e.obra_id = v_grupo) grupo_n,
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
    'grupo_estoque', v_grupo,
    'chaves', coalesce((
      select json_agg(json_build_object(
        'chave', ch.chave, 'perfil', ch.perfil, 'material', ch.material,
        'necessario_kg', round(ch.necessario_kg, 1),
        'cortado_kg', round(coalesce(ch.cortado_kg, 0), 1),
        'a_cortar_kg', round(coalesce(ch.a_cortar_kg, 0), 1),
        'baixado_kg', round(ch.baixado_kg, 1),
        'itens_a_cortar', ch.itens_a_cortar,
        'estoque_grupo_kg', round(coalesce(est.grupo_kg, 0), 1),
        'estoque_obra_kg', round(coalesce(est.obra_kg, 0), 1),
        'estoque_fabrica_kg', round(coalesce(est.fab_kg, 0), 1),
        'origem_estoque', case when coalesce(est.grupo_n, 0) > 0 then 'grupo'
                               when coalesce(est.obra_n, 0) > 0 then 'obra' else 'fabrica' end,
        'disponivel_kg', round(greatest(0, case when coalesce(est.grupo_n, 0) > 0 then coalesce(est.grupo_kg, 0)
                                                 when coalesce(est.obra_n, 0) > 0 then coalesce(est.obra_kg, 0)
                                                 else coalesce(est.fab_kg, 0) end), 1)
      ) order by ch.necessario_kg desc)
      from ch left join est on est.chave = ch.chave), '[]'::json),
    'itens', coalesce((select json_agg(json_build_object('id', id, 'chave', chave)) from mc), '[]'::json)
  ));
end;
$$;

grant execute on function public.fluxo_material_obra(text) to authenticated;

update public.obras o
   set endereco = jsonb_set(coalesce(o.endereco, '{}'::jsonb), '{meta,obras_membro}',
         coalesce((select jsonb_agg(g.obra_id order by g.obra_id) from public.estoque_grupos g where g.grupo_obra_id = o.id), '[]'::jsonb), true),
       updated_at = now()
 where o.id in (select distinct grupo_obra_id from public.estoque_grupos);
