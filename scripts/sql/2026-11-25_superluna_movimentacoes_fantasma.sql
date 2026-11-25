-- ============================================================================
-- Superluna Brumadinho (obra-008): remove saídas FANTASMA do histórico de estoque
-- ============================================================================
-- Em 23/09/2026 (12:23–12:28) o código antigo do app ("Consumo produção — corte",
-- removido no commit ed6ae5d) gravou 738 saídas com obra_id = obra-008 debitando
-- itens de CHAPARIA de OUTRAS obras (obra-003, obra-009, obra-009b), mais 110
-- pares baixa/estorno de corte (saldo líquido zero). Nenhum material foi
-- consumido pela Superluna. O saldo desses itens já tinha sido restaurado
-- (saldo atual = comprado), então só o histórico ficou errado.
--
-- Também: 2 POS de ferro (1036, 1018) marcadas cortadas em 29/07 com
-- baixa_estoque_kg preenchido mas SEM movimento de estoque. Viram histórico
-- (baixa_estoque_kg NULL), para um eventual estorno não lançar entrada fantasma.
-- Backup em superluna_fantasma_20261125_bkp_{mov,corte}. Idempotente.
-- ============================================================================
begin;

create table if not exists public.superluna_fantasma_20261125_bkp_mov as
  select * from public.movimentacoes_estoque where false;
insert into public.superluna_fantasma_20261125_bkp_mov
  select mv.* from public.movimentacoes_estoque mv
   where mv.obra_id = 'obra-008'
     and (mv.motivo like 'Consumo produção — corte%'
          or mv.motivo like 'Baixa por corte%' or mv.motivo like 'Estorno de corte%')
     and mv.created_at < '2026-11-17'
     and not exists (select 1 from public.superluna_fantasma_20261125_bkp_mov b where b.id = mv.id);

delete from public.movimentacoes_estoque mv
 using public.superluna_fantasma_20261125_bkp_mov b
 where mv.id = b.id;

create table if not exists public.superluna_fantasma_20261125_bkp_corte as
  select * from public.materiais_corte where false;
insert into public.superluna_fantasma_20261125_bkp_corte
  select m.* from public.materiais_corte m
   where m.id in ('MC-2026-23-1036', 'MC-2026-23-1018') and m.baixa_estoque_kg is not null
     and not exists (select 1 from public.superluna_fantasma_20261125_bkp_corte b where b.id = m.id);

update public.materiais_corte set baixa_estoque_kg = null, updated_at = now()
 where id in ('MC-2026-23-1036', 'MC-2026-23-1018') and baixa_estoque_kg is not null;

commit;
