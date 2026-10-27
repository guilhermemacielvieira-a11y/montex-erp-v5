// ============================================================
// Dados do rastreio de uma marca (busca sob demanda)
// ============================================================
// Carrega só o que a marca pesquisada usa: as peças da marca (com as
// divididas), seus apontamentos, posições de corte (próprias, por peca_id e
// pela composição), romaneios das obras e o status de montagem.
// Motor: services/rastreioPeca.js.
// ============================================================
import { useEffect, useMemo, useState } from 'react';
import { supabase } from '@/api/supabaseClient';
import { rastrearMarca } from '@/services/rastreioPeca';
import { loadConcluidasLocal, loadConcluidasRemote, mergeConcluidas } from '@/utils/montagemSync';

const norm = (s) => String(s ?? '').trim().toUpperCase();
const vazio = { pecas: [], historico: [], cortes: [], composicao: [], expedicoes: [], montagem: {} };
const ok = ({ data, error }) => { if (error) throw error; return data || []; };

async function emLotes(ids, fn, tamanho = 100) {
  const out = [];
  for (let i = 0; i < ids.length; i += tamanho) out.push(...ok(await fn(ids.slice(i, i + tamanho))));
  return out;
}

/**
 * @param {string} marca          marca pesquisada (vazio = nada)
 * @param {object} p
 * @param {Array|null} p.obraIds  escopo do seletor do topo (null = Geral)
 */
export function useRastreioPeca(marca, { obraIds = null, funcionarios = [], obras = [] } = {}) {
  const [dados, setDados] = useState(vazio);
  const [carregando, setCarregando] = useState(false);
  const [erro, setErro] = useState(null);
  const escopo = obraIds ? obraIds.join(',') : '*';

  useEffect(() => {
    const alvo = norm(marca);
    if (!alvo) { setDados(vazio); return undefined; }
    let vivo = true;
    (async () => {
      setCarregando(true);
      setErro(null);
      try {
        let q = supabase.from('pecas_producao').select('*').ilike('marca', alvo).limit(500);
        if (escopo !== '*') q = q.in('obra_id', escopo.split(','));
        const pecas = ok(await q);
        if (!pecas.length) { if (vivo) setDados(vazio); return; }
        const ids = pecas.map((p) => p.id);
        const obrasIds = [...new Set(pecas.map((p) => p.obra_id))];
        const [historico, composicao, expedicoes, montRemoto] = await Promise.all([
          emLotes(ids, (lote) => supabase.from('producao_historico')
            .select('id,peca_id,etapa_de,etapa_para,funcionario_id,funcionario_nome,data_inicio,observacoes,created_at')
            .in('peca_id', lote).limit(5000)),
          // tabela pode não existir em ambientes sem a migração
          supabase.from('composicao_marcas').select('obra_id,marca,pos,qtd_por_unidade').in('obra_id', obrasIds).ilike('marca', alvo)
            .then(({ data, error }) => (error ? [] : data || [])),
          supabase.from('expedicoes')
            .select('id,obra_id,numero_romaneio,status,data_expedicao,data_saida,data_entrega,motorista,transportadora,placa,pecas,deleted_at')
            .in('obra_id', obrasIds).is('deleted_at', null).limit(2000).then(ok),
          loadConcluidasRemote(),
        ]);
        const posicoes = [...new Set([alvo, ...composicao.map((c) => norm(c.pos))])];
        const cols = 'id,obra_id,marca,peca,perfil,quantidade,peso_teorico,status_corte,data_inicio,data_fim,funcionario_corte,peca_id,baixa_estoque_kg';
        const [cortesPos, cortesPeca] = await Promise.all([
          supabase.from('materiais_corte').select(cols).in('obra_id', obrasIds).in('marca', posicoes).then(ok),
          emLotes(ids, (lote) => supabase.from('materiais_corte').select(cols).in('peca_id', lote)),
        ]);
        const cortes = [...new Map([...cortesPos, ...cortesPeca].map((c) => [c.id, c])).values()];
        if (vivo) setDados({ pecas, historico, composicao, expedicoes, cortes, montagem: mergeConcluidas(loadConcluidasLocal(), montRemoto || {}) });
      } catch (e) {
        console.error('[useRastreioPeca]', e);
        if (vivo) { setErro(e?.message || 'Erro ao carregar o rastreio'); setDados(vazio); }
      } finally {
        if (vivo) setCarregando(false);
      }
    })();
    return () => { vivo = false; };
  }, [marca, escopo]);

  const blocos = useMemo(
    () => (marca ? rastrearMarca({ marca, ...dados, funcionarios, obras }) : []),
    [marca, dados, funcionarios, obras],
  );

  return { blocos, carregando, erro };
}
