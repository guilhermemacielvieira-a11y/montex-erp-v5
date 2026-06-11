/**
 * LancamentoProducaoModal.jsx
 * Modal de Lançamento de Produção por Funcionário
 *
 * Exibe TODAS as etapas simultaneamente para cada peça.
 * Cada etapa pode ter um funcionário diferente, editável de forma independente.
 *
 * Dados persistidos em:
 *   1. entity_store (entity_type='producao_lancamento') — forma editável
 *   2. producao_historico — para analytics de ProducaoFuncionarioPage
 *   3. pecas_producao.funcionario_X — campo direto na peça
 *
 * Props:
 *   pecas        : Array<peca>  — peças a editar (pode ser 1 ou N)
 *   defaultEtapa : string       — etapa que fica destacada ao abrir (opcional)
 *   isOpen       : boolean
 *   onClose      : () => void
 *   onSaved      : () => void   — callback após salvar
 */

import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import toast from 'react-hot-toast';
import {
  X, Save, CheckCircle2, User, Calendar, Flame, Droplets, Paintbrush, Truck,
  Loader2, RefreshCw, Search, AlertCircle, Check, ArrowRight, Layers
} from 'lucide-react';
import { supabase, supabaseAdmin } from '@/api/supabaseClient';
import { useEquipes } from '@/contexts/ERPContext';

// ─── Constantes ────────────────────────────────────────────────────────────────
// Fluxo do Kanban Produção: Fabricação → Solda → Pintura → Expedido → Enviado
// Corte é tratado no KanbanCortePage (peças entram aqui já como conjuntos).
// Montagem é uma etapa externa (em obra) e não faz parte deste lançamento.
const ETAPAS = [
  { key: 'fabricacao', label: 'Fabricação',  icon: Flame,        color: 'purple',  bg: 'from-purple-500/20 to-indigo-500/20',  border: 'border-purple-500/30', text: 'text-purple-400',  rowBg: 'hover:bg-purple-500/5'  },
  { key: 'solda',      label: 'Solda',       icon: Droplets,     color: 'red',     bg: 'from-red-500/20 to-rose-500/20',       border: 'border-red-500/30',    text: 'text-red-400',     rowBg: 'hover:bg-red-500/5'     },
  { key: 'pintura',    label: 'Pintura',     icon: Paintbrush,   color: 'cyan',    bg: 'from-cyan-500/20 to-blue-500/20',      border: 'border-cyan-500/30',   text: 'text-cyan-400',    rowBg: 'hover:bg-cyan-500/5'    },
  { key: 'expedido',   label: 'Expedido',    icon: Truck,        color: 'emerald', bg: 'from-emerald-500/20 to-green-500/20',  border: 'border-emerald-500/30',text: 'text-emerald-400', rowBg: 'hover:bg-emerald-500/5' },
  { key: 'enviado',    label: 'Enviado',     icon: CheckCircle2, color: 'green',   bg: 'from-green-500/20 to-lime-500/20',     border: 'border-green-500/30',  text: 'text-green-400',   rowBg: 'hover:bg-green-500/5'   },
];

// Mapeamento etapa → campo funcionario em pecas_producao
const ETAPA_CAMPO_FUNC = {
  fabricacao: 'funcionario_fabricacao',
  solda:      'funcionario_solda',
  pintura:    'funcionario_pintura',
  expedido:   'funcionario_expedido',
  // 'enviado' não tem coluna em pecas_producao — o histórico cobre essa etapa
};

// Mapeamento etapa → campo data em pecas_producao
const ETAPA_CAMPO_DATA = {
  fabricacao: 'data_inicio_fabricacao',
  solda:      'data_inicio_solda',
  pintura:    'data_inicio_pintura',
};

// ─── Helpers ───────────────────────────────────────────────────────────────────
function formatPeso(kg) {
  if (!kg) return '—';
  if (kg >= 1000) return `${(kg / 1000).toFixed(1)}t`;
  return `${Number(kg).toFixed(1)} kg`;
}

function hoje() {
  return new Date().toISOString().split('T')[0];
}

function gerarId() {
  return 'LANC-' + Date.now() + '-' + Math.random().toString(36).slice(2, 8);
}

/**
 * Expande peças com quantidade > 1 em entradas individuais por conjunto.
 * Cada conjunto recebe peso = pesoTotal / quantidade.
 * ID virtual: `${peca.id}__c${i}` para rastrear lançamentos independentes.
 */
function expandirPorQuantidade(lista) {
  const result = [];
  for (const peca of lista) {
    const qtd = Math.max(1, parseInt(peca.quantidade || peca.qtd || 1, 10) || 1);
    const pesoBase = parseFloat(peca.pesoTotal || peca.peso_total || peca.peso || 0);
    const pesoPorConj = qtd > 1 ? pesoBase / qtd : pesoBase;

    if (qtd <= 1) {
      result.push({ ...peca, _originalId: peca.id, _conjuntoIdx: 1, _conjuntoTotal: 1 });
    } else {
      for (let i = 1; i <= qtd; i++) {
        result.push({
          ...peca,
          id:            `${peca.id}__c${i}`,
          _originalId:   peca.id,
          _conjuntoIdx:  i,
          _conjuntoTotal: qtd,
          nome:          `${peca.nome || peca.marca || peca.id} — Conj. ${i}/${qtd}`,
          pesoTotal:     pesoPorConj,
          peso_total:    pesoPorConj,
          peso:          pesoPorConj,
          quantidade:    1,
        });
      }
    }
  }
  return result;
}

// ─── Componente principal ───────────────────────────────────────────────────────
export function LancamentoProducaoModal({ pecas = [], defaultEtapa = 'fabricacao', isOpen, onClose, onSaved }) {
  const { funcionarios: ctxFuncionarios } = useEquipes();

  const [lancamentos, setLancamentos] = useState({}); // { [peca_id__etapa]: { funcionario_id, funcionario_nome, data_producao, observacoes } }
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState({});            // { [peca_id__etapa]: boolean }
  const [busca, setBusca] = useState('');
  const [carregado, setCarregado] = useState(false);
  const [highlightEtapa, setHighlightEtapa] = useState(defaultEtapa);

  // Funcionários ativos
  const funcionariosAtivos = useMemo(() => {
    return (ctxFuncionarios || [])
      .filter(f => f.status !== 'inativo')
      .sort((a, b) => (a.nome || '').localeCompare(b.nome || ''));
  }, [ctxFuncionarios]);

  // MODO COMPACTO (default): cada peça vira UMA linha — qty é editável.
  // O split por quantidade ao salvar/avançar usa o campo Qtd da linha.
  // Para reativar a expansão antiga (1 linha por conjunto), passe expandir=true.
  const pecasExpandidas = useMemo(() => {
    return pecas.map(p => ({
      ...p,
      _originalId: p.id,
      _conjuntoIdx: 1,
      _conjuntoTotal: Math.max(1, parseInt(p.quantidade || p.qtd || 1, 10) || 1),
    }));
  }, [pecas]);

  // Chave composta peca_id + etapa
  const chave = (pecaId, etapa) => `${pecaId}__${etapa}`;

  // Peças filtradas por busca (sobre a lista já expandida)
  const pecasFiltradas = useMemo(() => {
    if (!busca) return pecasExpandidas;
    const q = busca.toLowerCase();
    return pecasExpandidas.filter(p =>
      (p.nome || '').toLowerCase().includes(q) ||
      (p.marca || '').toLowerCase().includes(q) ||
      (p.tipo || '').toLowerCase().includes(q) ||
      (p.id || '').toLowerCase().includes(q)
    );
  }, [pecasExpandidas, busca]);

  // ─── CARREGAR LANÇAMENTOS PRÉVIOS ────────────────────────────────────────────
  // Para cada peça do modal, busca:
  //   1. Em `entity_store` — TODOS os lançamentos cujo peca_id seja:
  //        a) o próprio id atual da peça
  //        b) o id-base derivado de splits (PEC-XXX__split_<etapa>_<ts> → PEC-XXX)
  //        c) o id-virtual antigo (PEC-XXX__c<n>)
  //      Assim, ao reabrir o modal de uma peça split, os lançamentos do
  //      original aparecem preenchidos.
  //   2. Em `pecas_producao` (campos funcionario_<etapa>, data_inicio_<etapa>) —
  //      fallback para casos onde entity_store não tem registro (ex.: peça
  //      criada via split tem os campos preenchidos mas sem registro no store).
  // ----------------------------------------------------------------------------
  const carregarLancamentos = useCallback(async () => {
    if (!pecasExpandidas.length) return;
    const client = supabaseAdmin || supabase;

    // Helper: extrai o id-base de uma peça split (ou retorna o próprio id)
    const baseIdDe = (id) => {
      if (!id) return id;
      const m = String(id).match(/^(.+?)__split_/);
      return m ? m[1] : id;
    };

    try {
      // Conjunto de IDs a buscar (próprio + base + variantes __cN)
      const idsSet = new Set();
      for (const p of pecasExpandidas) {
        if (!p.id) continue;
        idsSet.add(p.id);
        const base = baseIdDe(p.id);
        if (base !== p.id) idsSet.add(base);
      }
      const ids = Array.from(idsSet);

      // 1. entity_store — também busca registros com peca_id LIKE base__c% (legados)
      const [storeResp, basesPattern] = await Promise.all([
        client
          .from('entity_store')
          .select('id, data')
          .eq('entity_type', 'producao_lancamento')
          .in('data->>peca_id', ids),
        // Conjuntos legados (modo expandido antigo): peca_id LIKE base__cN
        (async () => {
          const baseIds = Array.from(new Set(pecasExpandidas.map(p => baseIdDe(p.id))));
          const out = [];
          for (const b of baseIds) {
            const r = await client
              .from('entity_store')
              .select('id, data')
              .eq('entity_type', 'producao_lancamento')
              .like('data->>peca_id', `${b}__c%`);
            if (r.data) out.push(...r.data);
          }
          return out;
        })(),
      ]);
      if (storeResp.error) throw storeResp.error;
      const storeRows = [...(storeResp.data || []), ...(basesPattern || [])];

      // 2. pecas_producao — campos funcionario_<etapa> e data_inicio_<etapa>
      const { data: pecasDb } = await client
        .from('pecas_producao')
        .select('id, quantidade, etapa, funcionario_fabricacao, funcionario_solda, funcionario_pintura, funcionario_expedido, data_inicio_fabricacao, data_inicio_solda, data_inicio_pintura')
        .in('id', ids);
      const dbById = {};
      (pecasDb || []).forEach(p => { dbById[p.id] = p; });

      // ─── Construir o mapa de lançamentos ──────────────────────────────────
      const mapa = {};

      // 2.1 — Preenche a partir de pecas_producao (fallback de base)
      for (const peca of pecasExpandidas) {
        const base = baseIdDe(peca.id);
        const dbPeca = dbById[peca.id] || dbById[base];
        if (!dbPeca) continue;
        const camposEtapa = [
          { etapa: 'fabricacao', func: dbPeca.funcionario_fabricacao, dt: dbPeca.data_inicio_fabricacao },
          { etapa: 'solda',      func: dbPeca.funcionario_solda,      dt: dbPeca.data_inicio_solda },
          { etapa: 'pintura',    func: dbPeca.funcionario_pintura,    dt: dbPeca.data_inicio_pintura },
          { etapa: 'expedido',   func: dbPeca.funcionario_expedido,   dt: null },
        ];
        for (const ce of camposEtapa) {
          if (!ce.func) continue;
          const k = chave(peca.id, ce.etapa);
          mapa[k] = {
            funcionario_id:   ce.func,
            funcionario_nome: '', // resolvido depois pela lista de funcionários
            data_producao:    ce.dt ? new Date(ce.dt).toISOString().split('T')[0] : hoje(),
            observacoes:      '',
            quantidade:       peca._conjuntoTotal || 1,
            _origem:          'pecas_producao',
          };
        }
      }

      // 2.2 — Sobrescreve/Completa com entity_store (mais detalhado, inclui qtd)
      storeRows.forEach(row => {
        const d = row.data || {};
        // Para cada peça aberta, identifica se este registro se aplica
        for (const peca of pecasExpandidas) {
          const base = baseIdDe(peca.id);
          const aplica = d.peca_id === peca.id
                       || d.peca_id === base
                       || (typeof d.peca_id === 'string' && d.peca_id.startsWith(base + '__c'));
          if (!aplica) continue;
          const k = chave(peca.id, d.etapa);
          const existente = mapa[k] || {};
          mapa[k] = {
            ...existente,
            _storeId:         row.id,
            funcionario_id:   d.funcionario_id   || existente.funcionario_id   || '',
            funcionario_nome: d.funcionario_nome || existente.funcionario_nome || '',
            data_producao:    d.data_producao    || existente.data_producao    || hoje(),
            observacoes:      d.observacoes      || existente.observacoes      || '',
            quantidade:       d.quantidade       ?? existente.quantidade       ?? (peca._conjuntoTotal || 1),
            _origem:          'entity_store',
          };
        }
      });

      setLancamentos(mapa);
    } catch (err) {
      console.error('[LancamentoModal] Erro ao carregar:', err);
    } finally {
      setCarregado(true);
    }
  }, [pecasExpandidas]);

  useEffect(() => {
    if (isOpen && !carregado) {
      carregarLancamentos();
    }
    if (!isOpen) {
      setCarregado(false);
      setLancamentos({});
    }
  }, [isOpen, carregado, carregarLancamentos]);

  // Resolve nomes dos funcionários quando a lista de funcionários chega
  // (entradas carregadas de pecas_producao só têm o ID).
  useEffect(() => {
    if (!carregado || !funcionariosAtivos.length) return;
    setLancamentos(prev => {
      let changed = false;
      const next = { ...prev };
      for (const [k, v] of Object.entries(prev)) {
        if (v?.funcionario_id && !v.funcionario_nome) {
          const f = funcionariosAtivos.find(x => x.id === v.funcionario_id);
          if (f?.nome) {
            next[k] = { ...v, funcionario_nome: f.nome };
            changed = true;
          }
        }
      }
      return changed ? next : prev;
    });
  }, [carregado, funcionariosAtivos]);

  useEffect(() => {
    if (isOpen) {
      setHighlightEtapa(defaultEtapa);
      setBusca('');
    }
  }, [isOpen, defaultEtapa]);

  // Atualizar campo de um lançamento
  const handleChange = (pecaId, etapa, campo, valor) => {
    const k = chave(pecaId, etapa);
    setLancamentos(prev => ({
      ...prev,
      [k]: {
        ...prev[k],
        funcionario_id:   campo === 'funcionario_id' ? valor : (prev[k]?.funcionario_id   || ''),
        funcionario_nome: campo === 'funcionario_id' ? (funcionariosAtivos.find(f => f.id === valor)?.nome || '') : (prev[k]?.funcionario_nome || ''),
        data_producao:    campo === 'data_producao'  ? valor : (prev[k]?.data_producao    || hoje()),
        observacoes:      campo === 'observacoes'    ? valor : (prev[k]?.observacoes       || ''),
        quantidade:       campo === 'quantidade'     ? valor : (prev[k]?.quantidade        ?? null),
        // ao editar manualmente, deixa de ser "lançamento anterior carregado"
        _origem:          null,
      },
    }));
  };

  // Salvar um lançamento individual
  const salvarUm = useCallback(async (peca, etapa) => {
    const k = chave(peca.id, etapa);
    const lan = lancamentos[k];
    if (!lan?.funcionario_id) {
      toast.error('Selecione um funcionário');
      return;
    }

    // ID real no banco (sem sufixo __c1, __c2...)
    const originalId = peca._originalId || peca.id;
    const qtdLan = parseInt(lan.quantidade ?? peca._conjuntoTotal ?? 1, 10) || 1;
    // Label da quantidade: "20 de 51" quando há split
    const conjLabel = (peca._conjuntoTotal || 1) > 1 ? ` (${qtdLan} de ${peca._conjuntoTotal})` : '';

    setSaving(prev => ({ ...prev, [k]: true }));
    const client = supabaseAdmin || supabase;

    try {
      const dataLan = {
        peca_id:          peca.id,
        peca_nome:        peca.nome || peca.marca || '',
        etapa,
        funcionario_id:   lan.funcionario_id,
        funcionario_nome: lan.funcionario_nome,
        data_producao:    lan.data_producao || hoje(),
        observacoes:      lan.observacoes || '',
        obra_id:          peca.obraId || peca.obra_id || '',
        obra_nome:        peca.obraNome || peca.obra_nome || '',
        quantidade:       qtdLan,
        quantidade_total: peca._conjuntoTotal || 1,
        updated_at:       new Date().toISOString(),
      };

      // 1. Upsert em entity_store (por ID virtual — independente por conjunto)
      if (lan._storeId) {
        await client
          .from('entity_store')
          .update({ data: dataLan })
          .eq('id', lan._storeId);
      } else {
        const novoId = gerarId();
        const { error: insErr } = await client
          .from('entity_store')
          .insert({ id: novoId, entity_type: 'producao_lancamento', data: dataLan, created_date: new Date().toISOString() });
        if (insErr) throw insErr;
        setLancamentos(prev => ({
          ...prev,
          [k]: { ...prev[k], _storeId: novoId },
        }));
      }

      // 2. Upsert em producao_historico — ID inclui conjunto para não sobrescrever
      const histId = `HIST-${originalId}-${etapa}-${Date.now()}`;
      const etapaParaMap = { fabricacao: 'solda', solda: 'pintura', pintura: 'expedido', expedido: 'enviado', enviado: 'concluido' };
      const obsHist = `[QTD:${qtdLan}/${peca._conjuntoTotal || 1}] ${lan.observacoes || ''}`.trim();
      await client
        .from('producao_historico')
        .upsert({
          id:               histId,
          peca_id:          originalId,
          etapa_de:         etapa,
          etapa_para:       etapaParaMap[etapa] || etapa,
          funcionario_id:   lan.funcionario_id,
          funcionario_nome: lan.funcionario_nome,
          data_inicio:      lan.data_producao ? new Date(lan.data_producao).toISOString() : new Date().toISOString(),
          observacoes:      obsHist,
        }, { onConflict: 'id' });

      // 3. Atualizar pecas_producao usando o ID ORIGINAL (não virtual)
      //    para peças com múltiplos conjuntos, grava o último conjunto salvo
      const campoFunc = ETAPA_CAMPO_FUNC[etapa];
      const campoData = ETAPA_CAMPO_DATA[etapa];
      if (campoFunc) {
        const update = { [campoFunc]: lan.funcionario_id };
        if (campoData && lan.data_producao) {
          update[campoData] = new Date(lan.data_producao).toISOString();
        }
        await client
          .from('pecas_producao')
          .update(update)
          .eq('id', originalId);
      }

      // 4. Para corte: atualizar materiais_corte usando ID original
      if (etapa === 'corte') {
        await client
          .from('materiais_corte')
          .update({ funcionario_corte: lan.funcionario_id })
          .eq('peca_id', originalId);
      }

      const etapaInfo = ETAPAS.find(e => e.key === etapa);
      toast.success(`${etapaInfo?.label || etapa}${conjLabel}: ${lan.funcionario_nome} ✓`);
    } catch (err) {
      console.error('[LancamentoModal] Erro ao salvar:', err);
      toast.error('Erro ao salvar lançamento');
    } finally {
      setSaving(prev => ({ ...prev, [k]: false }));
    }
  }, [lancamentos, funcionariosAtivos]);

  // ─── SALVAR + AVANÇAR (com split por quantidade) ─────────────────────────────
  // Comportamento:
  //   - Lê a Qtd editada na linha.
  //   - Se Qtd == total → move a peça inteira para a próxima etapa.
  //   - Se Qtd < total → SPLIT: cria nova `pecas_producao` com qty=Qtd na próxima
  //     etapa, reduz a quantidade da peça original (que fica na etapa atual).
  //   - Se Qtd == 0 → ignora.
  const salvarEAvancar = useCallback(async (peca, etapa) => {
    const k = chave(peca.id, etapa);
    const lan = lancamentos[k];
    if (!lan?.funcionario_id) {
      toast.error('Selecione um funcionário antes de avançar');
      return;
    }

    const total = peca._conjuntoTotal || 1;
    const qtdAvancar = Math.max(0, Math.min(parseInt(lan.quantidade ?? total, 10) || total, total));
    if (qtdAvancar === 0) {
      toast.error('Quantidade a avançar deve ser maior que 0');
      return;
    }

    // Avanço sequencial: só move +1 etapa SE a linha clicada for a ETAPA ATUAL
    // da peça (concluir a etapa). Linhas passadas (histórico) ou futuras
    // (pré-atribuição) apenas gravam o lançamento sem movimentar.
    const ordemKanban = ['fabricacao', 'solda', 'pintura', 'expedido', 'enviado'];
    const etapaRaw = peca.etapa || 'fabricacao';
    const etapaAtualPeca = ['aguardando', 'corte'].includes(etapaRaw) ? 'fabricacao' : etapaRaw;
    const idxAtualPeca = ordemKanban.indexOf(etapaAtualPeca);
    const idxEtapaClick = ordemKanban.indexOf(etapa);
    const label = ETAPAS.find(e => e.key === etapa)?.label || etapa;

    if (idxEtapaClick !== idxAtualPeca) {
      // Não é a etapa atual → grava sem mover
      await salvarUm(peca, etapa);
      if (idxEtapaClick < idxAtualPeca) {
        toast.success(`Lançamento histórico de ${label} gravado ✓`);
      } else {
        toast(`Pré-atribuição de ${label} gravada — peça avança quando concluir ${ETAPAS.find(e => e.key === etapaAtualPeca)?.label}`, { icon: '⏳' });
      }
      return;
    }

    // 1. Persiste o lançamento (com a quantidade) — etapa concluída
    await salvarUm(peca, etapa);

    // 2. Determina a próxima etapa do Kanban (+1 da atual)
    const idxAtual = ordemKanban.indexOf(etapa);
    const proxima = ordemKanban[idxAtual + 1];

    const originalId = peca._originalId || peca.id;
    const client = supabaseAdmin || supabase;

    if (!proxima) {
      // Etapa final — apenas grava status final, sem mover
      toast.success('Etapa final atingida — lançamento gravado ✓');
      onSaved?.();
      return;
    }

    try {
      if (qtdAvancar >= total) {
        // Move toda a peça
        await client
          .from('pecas_producao')
          .update({ etapa: proxima, updated_at: new Date().toISOString() })
          .eq('id', originalId);
        const proxLabel = ETAPAS.find(e => e.key === proxima)?.label || proxima;
        toast.success(`Peça ${peca.marca || peca.id} (${total}) → ${proxLabel}`);
      } else {
        // SPLIT — cria nova peça com qtdAvancar na próxima etapa
        const { data: orig } = await client
          .from('pecas_producao')
          .select('*')
          .eq('id', originalId)
          .single();
        if (!orig) throw new Error('Peça original não encontrada');

        const pesoUnit = (orig.peso_total || 0) / (orig.quantidade || 1);
        const pesoMovido = pesoUnit * qtdAvancar;
        const pesoRestante = pesoUnit * (orig.quantidade - qtdAvancar);

        const novaPeca = { ...orig };
        delete novaPeca.id;
        novaPeca.id = `${originalId}__split_${proxima}_${Date.now()}`;
        novaPeca.quantidade = qtdAvancar;
        novaPeca.peso_total = pesoMovido;
        novaPeca.etapa = proxima;
        novaPeca.created_at = new Date().toISOString();
        novaPeca.updated_at = new Date().toISOString();
        // Propaga funcionário/data desta etapa para a nova peça
        const campoFunc = ETAPA_CAMPO_FUNC[etapa];
        const campoData = ETAPA_CAMPO_DATA[etapa];
        if (campoFunc) novaPeca[campoFunc] = lan.funcionario_id;
        if (campoData && lan.data_producao) novaPeca[campoData] = new Date(lan.data_producao).toISOString();

        const { error: insErr } = await client.from('pecas_producao').insert(novaPeca);
        if (insErr) throw insErr;

        // Reduz a peça original
        await client
          .from('pecas_producao')
          .update({
            quantidade: orig.quantidade - qtdAvancar,
            peso_total: pesoRestante,
            updated_at: new Date().toISOString(),
          })
          .eq('id', originalId);

        const proxLabel = ETAPAS.find(e => e.key === proxima)?.label || proxima;
        toast.success(`Split: ${qtdAvancar} → ${proxLabel} · ${orig.quantidade - qtdAvancar} ficam em ${ETAPAS.find(e => e.key === etapa)?.label}`);
      }
    } catch (err) {
      console.error('[LancamentoModal] Erro ao avançar etapa:', err);
      toast.error('Erro ao avançar a peça de etapa');
      return;
    }

    onSaved?.();
  }, [lancamentos, salvarUm, onSaved]);

  // ─── SALVAR E AVANÇAR (com SPLIT por quantidade) ────────────────────────────
  //
  // Modelo "1 linha por peça": cada peça×etapa tem uma única atribuição com Qtd
  // editável. Cada atribuição com etapa != etapa-atual vira um SPLIT (nova
  // pecas_producao com aquela qtd). A peça original tem sua quantidade reduzida
  // pelo total movido. Se tudo for movido, a original é removida.
  // ----------------------------------------------------------------------------
  const ORDEM_KANBAN = ['fabricacao', 'solda', 'pintura', 'expedido', 'enviado'];

  const salvarTodosEAvancar = useCallback(async () => {
    setLoading(true);
    const client = supabaseAdmin || supabase;
    let lancOk = 0;
    let movsOk = 0;
    let splitsOk = 0;
    const erros = [];

    // ─── 1. SALVAR todos os lançamentos primeiro ──────────────────────────────
    for (const peca of pecasFiltradas) {
      for (const etapa of ETAPAS) {
        const k = chave(peca.id, etapa.key);
        if (lancamentos[k]?.funcionario_id) {
          try {
            await salvarUm(peca, etapa.key);
            lancOk++;
          } catch (e) {
            erros.push(`${peca.id}/${etapa.key}: ${e?.message || 'erro'}`);
          }
        }
      }
    }

    if (lancOk === 0) {
      toast.error('Nenhum funcionário selecionado em nenhuma etapa');
      setLoading(false);
      return;
    }

    // ─── 2. CASCADE — desmembramento em cascata etapa-por-etapa ────────────
    // Algoritmo: para cada peça, itera as etapas a partir da etapa-atual.
    // A cada iteração:
    //   - lê a Qtd da etapa atual nos lançamentos
    //   - se qtd >= restante → move a peça inteira para a próxima etapa
    //   - se qtd < restante → SPLIT: cria uma peça nova com qtd em next-etapa
    //                          e reduz a quantidade da peça atual
    //   - usa o SPLIT (ou a peça movida) como peça-corrente da próxima iteração
    // Resultado: 70 Fab → 70 Solda, 30 das 70 → Pintura, 30 das 30 → Expedido…
    // ----------------------------------------------------------------------
    for (const peca of pecasFiltradas) {
      const originalId = peca._originalId || peca.id;
      const total = peca._conjuntoTotal || 1;
      const etapaAtualRaw = peca.etapa || 'fabricacao';
      const etapaAtualPeca = ['aguardando', 'corte'].includes(etapaAtualRaw) ? 'fabricacao' : etapaAtualRaw;

      try {
        // Carrega dados completos da peça original (template para splits)
        const { data: orig } = await client
          .from('pecas_producao').select('*').eq('id', originalId).single();
        if (!orig) {
          erros.push(`${originalId}: peça não encontrada`);
          continue;
        }
        const pesoUnit = (orig.peso_total || 0) / (orig.quantidade || 1);

        // Estado da iteração — o "current" sempre representa a peça/sub-grupo
        // que está sendo cascateado adiante
        let currentId  = originalId;
        let currentQty = total;
        let currentEtapa = etapaAtualPeca;
        let primeiraIteracao = true;

        while (true) {
          const idxCur = ORDEM_KANBAN.indexOf(currentEtapa);
          const proxEtapa = ORDEM_KANBAN[idxCur + 1];
          if (!proxEtapa) break; // chegou ao fim do fluxo

          // Lê a atribuição da etapa atual nos lançamentos (sempre indexado
          // pelo peca.id original que o usuário vê no modal)
          const lan = lancamentos[chave(peca.id, currentEtapa)];
          if (!lan?.funcionario_id) break; // sem responsável aqui → para de cascatear

          const qtdLanRaw = parseInt(lan.quantidade ?? currentQty, 10) || currentQty;
          const qtdAvancar = Math.max(0, Math.min(qtdLanRaw, currentQty));
          if (qtdAvancar <= 0) break;

          const cf = ETAPA_CAMPO_FUNC[currentEtapa];
          const cd = ETAPA_CAMPO_DATA[currentEtapa];

          if (qtdAvancar >= currentQty) {
            // Move toda a peça-corrente para proxEtapa (sem split)
            const update = {
              etapa: proxEtapa,
              updated_at: new Date().toISOString(),
            };
            if (cf) update[cf] = lan.funcionario_id;
            if (cd && lan.data_producao) update[cd] = new Date(lan.data_producao).toISOString();
            await client.from('pecas_producao').update(update).eq('id', currentId);
            movsOk++;
            // currentId continua o mesmo, currentEtapa avança
            currentEtapa = proxEtapa;
          } else {
            // SPLIT: cria nova peça com qtdAvancar em proxEtapa
            const novaPeca = { ...orig };
            delete novaPeca.id;
            const newId = `${originalId}__split_${proxEtapa}_${Date.now()}_${Math.floor(Math.random()*9999)}`;
            novaPeca.id = newId;
            novaPeca.quantidade = qtdAvancar;
            novaPeca.peso_total = pesoUnit * qtdAvancar;
            novaPeca.etapa = proxEtapa;
            novaPeca.created_at = new Date().toISOString();
            novaPeca.updated_at = new Date().toISOString();
            if (cf) novaPeca[cf] = lan.funcionario_id;
            if (cd && lan.data_producao) novaPeca[cd] = new Date(lan.data_producao).toISOString();
            const { error: insErr } = await client.from('pecas_producao').insert(novaPeca);
            if (insErr) throw insErr;
            splitsOk++;

            // Reduz a peça-corrente (que fica em currentEtapa)
            const qtdRestanteCorrente = currentQty - qtdAvancar;
            if (qtdRestanteCorrente === 0) {
              await client.from('pecas_producao').delete().eq('id', currentId);
            } else {
              await client.from('pecas_producao').update({
                quantidade: qtdRestanteCorrente,
                peso_total: pesoUnit * qtdRestanteCorrente,
                updated_at: new Date().toISOString(),
              }).eq('id', currentId);
            }

            // O "current" agora é a peça split que acabou de ser criada
            currentId    = newId;
            currentQty   = qtdAvancar;
            currentEtapa = proxEtapa;
          }
          primeiraIteracao = false;
        }

        if (primeiraIteracao) continue;
      } catch (e) {
        erros.push(`cascade ${originalId}: ${e?.message || 'erro'}`);
      }
    }

    // ─── 4. Resumo ────────────────────────────────────────────────────────────
    const resumoPartes = [`${lancOk} lançamento(s)`];
    if (movsOk > 0) resumoPartes.push(`${movsOk} peça(s) movida(s)`);
    if (splitsOk > 0) resumoPartes.push(`${splitsOk} split(s)`);
    toast.success(`✓ ${resumoPartes.join(' · ')}`);
    if (erros.length > 0) {
      console.error('[LancamentoModal] Erros durante salvar+avançar:', erros);
      toast.error(`${erros.length} erro(s) — ver console`);
    }
    onSaved?.();
    setLoading(false);
  }, [pecasFiltradas, pecasExpandidas, lancamentos, salvarUm, onSaved]);

  // Alias legado p/ não quebrar outras referências
  const salvarTodos = salvarTodosEAvancar;

  // Contagem de lançamentos com funcionário por etapa (sobre lista expandida)
  const contagemPorEtapa = useMemo(() => {
    const map = {};
    ETAPAS.forEach(e => {
      map[e.key] = pecasExpandidas.filter(p => lancamentos[chave(p.id, e.key)]?.funcionario_id).length;
    });
    return map;
  }, [pecasExpandidas, lancamentos]);

  const totalAtribuidos = useMemo(() =>
    Object.values(contagemPorEtapa).reduce((a, b) => a + b, 0),
  [contagemPorEtapa]);

  if (!isOpen) return null;

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
        {/* Backdrop */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="absolute inset-0 bg-black/70 backdrop-blur-sm"
          onClick={onClose}
        />

        {/* Modal */}
        <motion.div
          initial={{ opacity: 0, scale: 0.95, y: 20 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.95, y: 20 }}
          transition={{ duration: 0.2 }}
          className="relative w-full max-w-5xl max-h-[90vh] flex flex-col bg-slate-900 border border-slate-700 rounded-2xl shadow-2xl overflow-hidden"
          onClick={e => e.stopPropagation()}
        >
          {/* Header */}
          <div className="flex items-center justify-between px-6 py-4 bg-gradient-to-r from-slate-800/80 to-slate-700/40 border-b border-slate-700/50">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl flex items-center justify-center bg-slate-800/80 border border-slate-600/50">
                <User className="h-5 w-5 text-purple-400" />
              </div>
              <div>
                <h2 className="text-lg font-bold text-white">Lançamento de Produção por Funcionário</h2>
                <p className="text-xs text-slate-400">
                  {pecas.length} peça(s) · Todas as etapas editáveis de forma independente
                </p>
              </div>
            </div>
            <button
              onClick={onClose}
              className="w-8 h-8 flex items-center justify-center rounded-lg hover:bg-slate-700/50 text-slate-400 hover:text-white transition-colors"
            >
              <X className="h-4 w-4" />
            </button>
          </div>

          {/* Resumo de etapas + busca */}
          <div className="flex items-center gap-3 px-4 py-2.5 bg-slate-800/40 border-b border-slate-700/50 overflow-x-auto">
            {/* Pills de resumo por etapa */}
            <div className="flex items-center gap-1.5 flex-shrink-0">
              {ETAPAS.map(e => {
                const EIcon = e.icon;
                const cnt = contagemPorEtapa[e.key] || 0;
                const isHL = highlightEtapa === e.key;
                return (
                  <button
                    key={e.key}
                    onClick={() => setHighlightEtapa(isHL ? null : e.key)}
                    title={`${e.label}: ${cnt} funcionário(s) atribuído(s)`}
                    className={`flex items-center gap-1 px-2 py-1 rounded-lg text-[10px] font-medium transition-all border ${
                      isHL
                        ? `bg-gradient-to-r ${e.bg} ${e.border} ${e.text}`
                        : cnt > 0
                          ? `bg-emerald-500/10 border-emerald-500/30 text-emerald-400`
                          : 'bg-slate-800/50 border-slate-700/50 text-slate-500 hover:text-slate-300'
                    }`}
                  >
                    <EIcon className="h-3 w-3" />
                    <span>{e.label}</span>
                    {cnt > 0 && (
                      <span className="px-1 rounded-full bg-slate-900/60 text-white">{cnt}</span>
                    )}
                  </button>
                );
              })}
            </div>

            <div className="ml-auto flex items-center gap-2 flex-shrink-0">
              {/* Busca */}
              <div className="relative">
                <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-slate-500" />
                <input
                  type="text"
                  placeholder="Buscar peça..."
                  value={busca}
                  onChange={e => setBusca(e.target.value)}
                  className="pl-8 pr-3 py-1.5 text-xs bg-slate-800 border border-slate-700 rounded-lg text-white placeholder-slate-500 focus:outline-none focus:border-slate-500 w-44"
                />
              </div>
              <span className="text-xs text-slate-500">{pecasFiltradas.length} peça(s)</span>
              <button
                onClick={() => { setCarregado(false); }}
                className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-xs text-slate-400 hover:text-white hover:bg-slate-700/50 transition-colors"
                title="Recarregar lançamentos do banco"
              >
                <RefreshCw className="h-3 w-3" />
                Atualizar
              </button>
            </div>
          </div>

          {/* Tabela — todas as etapas por peça */}
          <div className="flex-1 overflow-y-auto">
            {!carregado ? (
              <div className="flex items-center justify-center h-40 gap-2 text-slate-400">
                <Loader2 className="h-5 w-5 animate-spin" />
                Carregando lançamentos...
              </div>
            ) : pecasFiltradas.length === 0 ? (
              <div className="flex flex-col items-center justify-center h-40 gap-2 text-slate-500">
                <AlertCircle className="h-8 w-8" />
                <p>Nenhuma peça encontrada</p>
              </div>
            ) : (
              <table className="w-full text-xs border-collapse">
                <thead className="sticky top-0 bg-slate-900/95 border-b border-slate-700/50 z-10">
                  <tr>
                    <th className="text-left px-4 py-2.5 text-slate-500 font-medium min-w-[160px]">Peça / Conjunto</th>
                    <th className="text-left px-3 py-2.5 text-slate-500 font-medium w-32">Etapa</th>
                    <th className="text-left px-3 py-2.5 text-slate-500 font-medium w-52">Funcionário</th>
                    <th className="text-left px-3 py-2.5 text-slate-500 font-medium w-36">Data</th>
                    <th className="text-left px-3 py-2.5 text-slate-500 font-medium">Observações</th>
                    <th className="text-center px-3 py-2.5 text-slate-500 font-medium w-16">Salvar</th>
                    <th className="text-center px-3 py-2.5 text-slate-500 font-medium w-36" title="Replicar a configuração desta linha para N conjuntos da mesma peça">
                      <div className="inline-flex items-center gap-1">
                        <Layers className="h-3 w-3" /> Qtd
                      </div>
                    </th>
                    <th className="text-center px-3 py-2.5 text-slate-500 font-medium w-20">Avançar</th>
                  </tr>
                </thead>
                <tbody>
                  {pecasFiltradas.map((peca, pecaIdx) => {
                    const peso = peca.pesoTotal || peca.peso_total || peca.peso || 0;
                    // Quantas etapas desta peça têm funcionário
                    const atribuidos = ETAPAS.filter(e => lancamentos[chave(peca.id, e.key)]?.funcionario_id).length;

                    return ETAPAS.map((etapa, etapaIdx) => {
                      const k = chave(peca.id, etapa.key);
                      const lan = lancamentos[k] || {};
                      const temFunc = !!lan.funcionario_id;
                      const isSavingRow = saving[k];
                      const EtapaIcon = etapa.icon;
                      const isFirstEtapa = etapaIdx === 0;
                      const isLastEtapa = etapaIdx === ETAPAS.length - 1;
                      const isHL = highlightEtapa === etapa.key;

                      return (
                        <tr
                          key={`${peca.id}-${etapa.key}`}
                          className={[
                            'transition-colors',
                            etapa.rowBg,
                            isHL ? `bg-${etapa.color}-500/8` : '',
                            isFirstEtapa && pecaIdx > 0 ? 'border-t-2 border-slate-700' : '',
                            isLastEtapa ? 'border-b border-slate-800/60' : '',
                            temFunc ? 'bg-emerald-500/4' : '',
                          ].filter(Boolean).join(' ')}
                        >
                          {/* Peça info — só na primeira etapa, rowspan=6 */}
                          {isFirstEtapa && (
                            <td
                              rowSpan={ETAPAS.length}
                              className="px-4 py-3 align-top border-r border-slate-800/60"
                            >
                              <div className="flex flex-col gap-1 pt-0.5">
                                <div className="flex items-center gap-1.5 flex-wrap">
                                  <div className={`w-2.5 h-2.5 rounded-full flex-shrink-0 ${atribuidos === ETAPAS.length ? 'bg-emerald-400' : atribuidos > 0 ? 'bg-amber-400' : 'bg-slate-600'}`} />
                                  <span className="font-bold text-white text-sm leading-tight">
                                    {peca.marca || (peca._originalId ? peca.nome : peca.nome) || peca.id}
                                  </span>
                                </div>
                                {/* Badge de quantidade total quando peça tem qty > 1 */}
                                {peca._conjuntoTotal > 1 && (
                                  <span className="text-[10px] px-2 py-0.5 rounded-full bg-violet-500/20 border border-violet-500/40 text-violet-300 self-start font-semibold">
                                    {peca._conjuntoTotal} conjuntos
                                  </span>
                                )}
                                {peca.tipo && (
                                  <span className="text-[10px] px-1.5 py-0.5 rounded bg-slate-800 text-slate-400 self-start">{peca.tipo}</span>
                                )}
                                <span className="text-[11px] text-slate-400 font-mono">{formatPeso(peso)}</span>
                                {peca.obraNome && (
                                  <span className="text-[10px] text-slate-500 truncate max-w-[140px]">{peca.obraNome}</span>
                                )}
                                <span className="text-[10px] text-slate-600 mt-1">
                                  {atribuidos}/{ETAPAS.length} etapas
                                </span>
                              </div>
                            </td>
                          )}

                          {/* Etapa */}
                          {(() => {
                            const ordemK = ['fabricacao', 'solda', 'pintura', 'expedido', 'enviado'];
                            const idxL = ordemK.indexOf(etapa.key);
                            const _eRaw = peca.etapa || 'fabricacao';
                            const _eNorm = ['aguardando', 'corte'].includes(_eRaw) ? 'fabricacao' : _eRaw;
                            const idxA = ordemK.indexOf(_eNorm);
                            const isAtual = idxL === idxA;
                            const isPassada = idxL < idxA;
                            return (
                              <td className={`px-3 py-2 ${isHL ? 'font-semibold' : ''} ${isAtual ? 'bg-purple-500/5' : ''}`}>
                                <div className={`flex items-center gap-1.5 ${etapa.text}`}>
                                  <EtapaIcon className="h-3.5 w-3.5 flex-shrink-0" />
                                  <span className="text-xs">{etapa.label}</span>
                                  {temFunc && <Check className="h-3 w-3 text-emerald-400 ml-auto" />}
                                </div>
                                {/* Indicador: ATUAL / PASSADA / lançamento prévio */}
                                <div className="mt-1 flex flex-wrap gap-1">
                                  {isAtual && (
                                    <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[9px] bg-purple-500/20 border border-purple-500/40 text-purple-200 font-semibold">
                                      ● ATUAL
                                    </span>
                                  )}
                                  {isPassada && (
                                    <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[9px] bg-slate-700/40 border border-slate-600/40 text-slate-500">
                                      ✓ concluída
                                    </span>
                                  )}
                                  {temFunc && lan._origem && (
                                    <span
                                      className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[9px] bg-amber-500/15 border border-amber-500/30 text-amber-300"
                                      title={`Carregado de ${lan._origem}`}
                                    >
                                      <Save className="h-2.5 w-2.5" />
                                      anterior
                                    </span>
                                  )}
                                </div>
                              </td>
                            );
                          })()}

                          {/* Funcionário */}
                          <td className="px-3 py-2">
                            <div className="relative">
                              <User className="absolute left-2 top-1/2 -translate-y-1/2 h-3 w-3 text-slate-500 pointer-events-none" />
                              <select
                                value={lan.funcionario_id || ''}
                                onChange={e => handleChange(peca.id, etapa.key, 'funcionario_id', e.target.value)}
                                className={`w-full pl-6 pr-2 py-1.5 text-xs bg-slate-800 border rounded-lg text-white focus:outline-none appearance-none transition-colors ${
                                  temFunc
                                    ? 'border-emerald-600/50 focus:border-emerald-500'
                                    : 'border-slate-700 focus:border-slate-500'
                                }`}
                              >
                                <option value="">— Selecionar —</option>
                                {funcionariosAtivos.map(f => (
                                  <option key={f.id} value={f.id}>{f.nome}</option>
                                ))}
                              </select>
                            </div>
                          </td>

                          {/* Data */}
                          <td className="px-3 py-2">
                            <div className="relative">
                              <Calendar className="absolute left-2 top-1/2 -translate-y-1/2 h-3 w-3 text-slate-500 pointer-events-none" />
                              <input
                                type="date"
                                value={lan.data_producao || hoje()}
                                onChange={e => handleChange(peca.id, etapa.key, 'data_producao', e.target.value)}
                                className="w-full pl-6 pr-2 py-1.5 text-xs bg-slate-800 border border-slate-700 rounded-lg text-white focus:outline-none focus:border-slate-500"
                              />
                            </div>
                          </td>

                          {/* Observações */}
                          <td className="px-3 py-2">
                            <input
                              type="text"
                              placeholder={`Obs. ${etapa.label.toLowerCase()}...`}
                              value={lan.observacoes || ''}
                              onChange={e => handleChange(peca.id, etapa.key, 'observacoes', e.target.value)}
                              className="w-full px-2 py-1.5 text-xs bg-slate-800 border border-slate-700 rounded-lg text-white placeholder-slate-600 focus:outline-none focus:border-slate-500"
                            />
                          </td>

                          {/* Salvar */}
                          <td className="px-3 py-2 text-center">
                            {isSavingRow ? (
                              <Loader2 className="h-4 w-4 animate-spin text-slate-400 mx-auto" />
                            ) : (
                              <button
                                onClick={() => salvarUm(peca, etapa.key)}
                                disabled={!temFunc}
                                className={`w-8 h-8 rounded-lg flex items-center justify-center mx-auto transition-colors ${
                                  temFunc
                                    ? 'bg-emerald-500/20 border border-emerald-500/40 hover:bg-emerald-500/30 text-emerald-400 cursor-pointer'
                                    : 'bg-slate-700/20 border border-slate-600/20 text-slate-600 cursor-not-allowed'
                                }`}
                                title={temFunc ? `Salvar ${etapa.label}` : 'Selecione um funcionário primeiro'}
                              >
                                {temFunc ? <Check className="h-3.5 w-3.5" /> : <Save className="h-3.5 w-3.5" />}
                              </button>
                            )}
                          </td>

                          {/* Quantidade editável — controla quantos conjuntos
                              recebem este lançamento e avançam de etapa.
                              Default = total da peça. Se editado para < total,
                              o "Avançar" faz SPLIT (cria nova peça com a qtd). */}
                          <td className="px-2 py-2 text-center">
                            {(() => {
                              const total = peca._conjuntoTotal || 1;
                              const valor = lan.quantidade ?? total;
                              return (
                                <div className="flex items-center justify-center gap-1">
                                  <input
                                    type="number"
                                    min={1}
                                    max={total}
                                    value={valor}
                                    onChange={e => {
                                      const v = Math.max(1, Math.min(parseInt(e.target.value || '1', 10) || 1, total));
                                      handleChange(peca.id, etapa.key, 'quantidade', v);
                                    }}
                                    title={`Quantidade que recebe este lançamento (1..${total})`}
                                    className="w-14 px-1 py-1 text-center text-xs bg-slate-800 border border-slate-700 rounded-md text-white focus:outline-none focus:border-purple-500"
                                  />
                                  <span className="text-[10px] text-slate-500">/{total}</span>
                                </div>
                              );
                            })()}
                          </td>

                          {/* Avançar para próxima etapa do Kanban —
                              só ativo na linha da etapa atual da peça */}
                          {(() => {
                            const ordemKanban = ['fabricacao', 'solda', 'pintura', 'expedido', 'enviado'];
                            const _eRaw2 = peca.etapa || 'fabricacao';
                            const etapaAtualPeca = ['aguardando', 'corte'].includes(_eRaw2) ? 'fabricacao' : _eRaw2;
                            const idxLinha = ordemKanban.indexOf(etapa.key);
                            const idxAtualPeca = ordemKanban.indexOf(etapaAtualPeca);
                            const proxKey = ordemKanban[idxLinha + 1];
                            const proxLabel = ETAPAS.find(e => e.key === proxKey)?.label;
                            const isEtapaAtual = idxLinha === idxAtualPeca;
                            const isPassada = idxLinha < idxAtualPeca;
                            const isFutura = idxLinha > idxAtualPeca;
                            const podeAvancar = temFunc && isEtapaAtual && !isSavingRow && !!proxKey;

                            let titulo;
                            if (!temFunc) titulo = 'Selecione um funcionário primeiro';
                            else if (isPassada) titulo = 'Esta etapa já foi concluída (lançamento histórico)';
                            else if (isFutura) titulo = `Peça ainda está em ${ETAPAS.find(e => e.key === etapaAtualPeca)?.label} — finalize primeiro`;
                            else if (!proxKey) titulo = 'Última etapa — peça concluída';
                            else titulo = `Salvar e avançar para ${proxLabel}`;

                            return (
                              <td className="px-3 py-2 text-center">
                                <button
                                  onClick={() => salvarEAvancar(peca, etapa.key)}
                                  disabled={!podeAvancar}
                                  className={`inline-flex items-center gap-1 px-2 py-1.5 rounded-lg text-[10px] font-semibold transition-all ${
                                    podeAvancar
                                      ? 'bg-gradient-to-r from-purple-600/30 to-indigo-600/30 border border-purple-500/40 text-purple-200 hover:from-purple-600/50 hover:to-indigo-600/50 cursor-pointer'
                                      : isPassada && temFunc
                                        ? 'bg-slate-800/40 border border-slate-700/40 text-slate-500'
                                        : 'bg-slate-800/40 border border-slate-700/40 text-slate-600 cursor-not-allowed'
                                  }`}
                                  title={titulo}
                                >
                                  <ArrowRight className="h-3 w-3" />
                                  {!proxKey ? 'Final' : isEtapaAtual ? proxLabel : isPassada ? '—' : '⏳'}
                                </button>
                              </td>
                            );
                          })()}
                        </tr>
                      );
                    });
                  })}
                </tbody>
              </table>
            )}
          </div>

          {/* Footer */}
          <div className="flex items-center justify-between px-4 py-3 bg-slate-800/50 border-t border-slate-700/50">
            <div className="flex items-center gap-2 text-xs text-slate-500">
              <CheckCircle2 className="h-3.5 w-3.5 text-emerald-400" />
              <span>
                {totalAtribuidos} lançamento(s) com funcionário atribuído
                {totalAtribuidos > 0 && (
                  <span className="ml-1 text-slate-600">
                    ({ETAPAS.filter(e => contagemPorEtapa[e.key] > 0).map(e => e.label).join(', ')})
                  </span>
                )}
              </span>
            </div>

            <div className="flex items-center gap-2">
              <button
                onClick={onClose}
                className="px-4 py-2 text-xs text-slate-400 hover:text-white hover:bg-slate-700/50 rounded-lg transition-colors"
              >
                Fechar
              </button>
              <button
                onClick={salvarTodos}
                disabled={loading || totalAtribuidos === 0}
                className={`flex items-center gap-2 px-4 py-2 rounded-lg text-xs font-semibold transition-all ${
                  loading || totalAtribuidos === 0
                    ? 'bg-slate-700 text-slate-400 cursor-not-allowed'
                    : 'bg-gradient-to-r from-emerald-600/80 to-teal-600/80 border border-emerald-500/40 text-emerald-300 hover:opacity-90'
                }`}
              >
                {loading ? (
                  <><Loader2 className="h-3.5 w-3.5 animate-spin" /> Salvando + avançando...</>
                ) : (
                  <><ArrowRight className="h-3.5 w-3.5" /> Salvar e Avançar ({totalAtribuidos})</>
                )}
              </button>
            </div>
          </div>
        </motion.div>
      </div>
    </AnimatePresence>
  );
}

export default LancamentoProducaoModal;
