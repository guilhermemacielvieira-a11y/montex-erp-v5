// ============================================================
// Financeiro > A receber
// ============================================================
// Lista unificada:
//  • medições RECONHECIDAS (aprovada/faturada) ainda não pagas — valor bruto,
//    com o override de Receitas (montex_receitas_overrides) aplicado, igual
//    ao Painel Global;
//  • receitas manuais em aberto ou faturadas (tabela receitas_manuais).
// Baixa no celular só para receita manual. Medição tem fluxo próprio
// (regra 1d: grava em medicoes + override + sync) — fica no computador.
// ============================================================
import React, { useCallback, useMemo, useState } from 'react';
import { toast } from 'react-hot-toast';
import { CheckCircle2, FileText, Wallet, Monitor } from 'lucide-react';
import { useMedicoes, useObras } from '@/contexts/ERPContext';
import { useReceitasManuais, atualizarReceitaManual } from '@/utils/receitasSync';
import { medicaoReconhecida, medicaoRecebida, normalizeStatusReceita, STATUS_RECEITA_LABELS } from '@/utils/financeiroStatus';
import Folha from '../../kit/Folha';
import { Secao, Grupo, Linha, Metrica, Grade, Status, Abas, BotaoConfirmar, Vazio, Erro, Esqueleto } from '../../kit';
import { brl, brl2, brlc, data as fmtData, quando } from '../../kit/fmt';
import { ensureOnline } from '../../ui/online';
import { confirmarBiometria } from '../../ui/biometric';
import { success, tap } from '../../ui/haptics';
import { hojeLocalISO } from '../../ui/format';
import { useEstadoERP, usePodeEditar, diaISO, isoDe } from './comum';

const OVERRIDES_KEY = 'montex_receitas_overrides';
const lerOverrides = () => { try { return JSON.parse(localStorage.getItem(OVERRIDES_KEY) || '{}') || {}; } catch { return {}; } };

const FILTROS = [
  { id: 'vencidas', rotulo: 'Vencidas' },
  { id: 'prox30', rotulo: 'Próx. 30 dias' },
  { id: 'todas', rotulo: 'Todas' },
];

export default function AbaReceber() {
  const { carregando, erro } = useEstadoERP();
  const { medicoes = [] } = useMedicoes();
  const { obras = [] } = useObras();
  const { receitas: receitasManuais = [], carregando: carregandoRec, erro: erroRec, recarregar } = useReceitasManuais();
  const podeEditar = usePodeEditar();

  const [filtro, setFiltro] = useState('todas');
  const [sel, setSel] = useState(null);
  const [salvando, setSalvando] = useState(false);

  const hoje = hojeLocalISO();
  const em30 = diaISO(30);

  const nomeObra = useMemo(() => {
    const m = new Map(obras.map((o) => [o.id, o.nome || o.id]));
    return (id) => (id ? m.get(id) || id : null);
  }, [obras]);

  const itens = useMemo(() => {
    const ov = lerOverrides();
    const meds = (medicoes || []).map((m) => {
      const o = ov[m.id] || {};
      const statusBase = o.status ? normalizeStatusReceita(o.status) : null;
      // Recebida/cancelada pelo override (tela Receitas) também sai da lista
      if (statusBase === 'recebido' || statusBase === 'cancelado') return null;
      if (!medicaoReconhecida(m.status) || medicaoRecebida(m.status)) return null;
      const obraId = m.obraId || m.obra_id || null;
      const valor = o.valor !== undefined ? Number(o.valor) || 0 : Number(m.valorBruto ?? m.valor_bruto) || 0;
      if (valor <= 0) return null;
      return {
        id: m.id,
        tipo: 'medicao',
        descricao: o.descricao || m.descricao || `Medição nº ${m.numero || '?'}`,
        contraparte: o.cliente || nomeObra(obraId) || '—',
        obraId,
        valor,
        vencimento: isoDe(o.vencimento || m.dataMedicao || m.data_medicao || m.dataReferencia || m.data_referencia),
        statusLabel: String(m.status || '').toLowerCase().startsWith('fatur') ? 'Faturada' : 'Aprovada',
        original: m,
      };
    }).filter(Boolean);

    const mans = (receitasManuais || []).map((r) => {
      const st = normalizeStatusReceita(r.status);
      if (st !== 'aberto' && st !== 'faturado') return null;
      return {
        id: r.id,
        tipo: 'manual',
        descricao: r.descricao || 'Receita',
        contraparte: r.cliente && r.cliente !== '-' ? r.cliente : (nomeObra(r.obraId) || '—'),
        obraId: r.obraId || null,
        valor: Number(r.valor) || 0,
        vencimento: isoDe(r.vencimento || r.data),
        statusLabel: STATUS_RECEITA_LABELS[st],
        original: r,
      };
    }).filter(Boolean);

    return [...meds, ...mans].sort((a, b) => (a.vencimento || '9999').localeCompare(b.vencimento || '9999'));
  }, [medicoes, receitasManuais, nomeObra]);

  const vencida = useCallback((i) => !!i.vencimento && i.vencimento < hoje, [hoje]);
  const filtrados = useMemo(() => itens.filter((i) => {
    if (filtro === 'vencidas') return vencida(i);
    if (filtro === 'prox30') return !!i.vencimento && i.vencimento >= hoje && i.vencimento <= em30;
    return true;
  }), [itens, filtro, vencida, hoje, em30]);

  const total = filtrados.reduce((s, i) => s + i.valor, 0);
  const totalVencido = itens.filter(vencida).reduce((s, i) => s + i.valor, 0);
  const qtdVencidas = itens.filter(vencida).length;

  const marcarRecebida = async () => {
    if (!sel || sel.tipo !== 'manual') return;
    if (!podeEditar) { toast.error('Sem permissão para editar o financeiro'); return; }
    if (salvando || !ensureOnline()) return;
    tap();
    setSalvando(true);
    if (!(await confirmarBiometria('Confirmar recebimento'))) {
      setSalvando(false);
      toast.error('Autenticação não confirmada');
      return;
    }
    try {
      await atualizarReceitaManual(sel.id, { ...sel.original, status: 'recebido' });
      success();
      toast.success('Receita marcada como recebida');
      setSel(null);
    } catch (e) {
      toast.error(`Não foi possível salvar: ${e?.message || 'erro'}`);
    } finally {
      setSalvando(false);
    }
  };

  if (erro) return <Erro texto={erro} />;
  if (carregando || (carregandoRec && !receitasManuais.length && !medicoes.length)) return <Esqueleto metricas={2} linhas={5} />;

  return (
    <>
      {erroRec && <Erro texto="Receitas manuais vindas do cache deste aparelho; a tabela não respondeu." onTentar={recarregar} />}

      <Grade className="mt-4">
        <Metrica rotulo={filtro === 'vencidas' ? 'Total vencido' : filtro === 'prox30' ? 'Total em 30 dias' : 'Total a receber'} valor={brlc(total)} sub={`${filtrados.length} título(s)`} />
        <Metrica rotulo="Vencido" valor={brlc(totalVencido)} tom={totalVencido > 0 ? 'bad' : 'ok'} sub={`${qtdVencidas} título(s)`} />
      </Grade>

      <Abas className="mt-4 px-0" itens={FILTROS.map((f) => ({ ...f, badge: f.id === 'vencidas' ? qtdVencidas : 0 }))} valor={filtro} onChange={setFiltro} />

      <Secao className="mt-2">
        {filtrados.length === 0 ? (
          <Vazio icone={Wallet} titulo="Nada a receber aqui" texto={filtro === 'todas' ? 'Não há medições aprovadas nem receitas em aberto.' : 'Nenhum título neste filtro.'} />
        ) : (
          <Grupo>
            {filtrados.map((i) => (
              <Linha
                key={`${i.tipo}:${i.id}`}
                icone={i.tipo === 'medicao' ? FileText : Wallet}
                iconeTom={vencida(i) ? 'bad' : 'teal'}
                titulo={i.descricao}
                sub={`${i.contraparte} · ${i.tipo === 'medicao' ? 'Medição' : 'Receita manual'}`}
                valor={brlc(i.valor)}
                valorTom={vencida(i) ? 'bad' : undefined}
                valorSub={i.vencimento ? `${fmtData(i.vencimento)} · ${quando(i.vencimento)}` : 'sem vencimento'}
                onClick={() => setSel(i)}
              />
            ))}
          </Grupo>
        )}
      </Secao>

      <Folha
        open={!!sel}
        onClose={() => setSel(null)}
        title={sel?.tipo === 'medicao' ? 'Medição a receber' : 'Receita a receber'}
        footer={sel && (
          sel.tipo === 'manual' ? (
            podeEditar ? (
              <BotaoConfirmar key={sel.id} className="mb-1" icone={CheckCircle2} carregando={salvando} rotulo="Marcar como recebida" confirmacao={`Confirmar recebimento de ${brl(sel.valor, 2)}`} onConfirmar={marcarRecebida} />
            ) : (
              <p className="pb-2 text-center text-[13px] text-mx-text3">Sem permissão para editar o financeiro.</p>
            )
          ) : (
            <div className="flex items-center gap-2 pb-2 text-[13px] text-mx-text2">
              <Monitor className="h-4 w-4 shrink-0" aria-hidden />
              Para baixar a medição, use Receitas no computador.
            </div>
          )
        )}
      >
        {sel && (
          <>
            <div className="mx-num text-[30px] leading-tight text-mx-text">{brl2(sel.valor)}</div>
            <p className="mt-1 text-[15px] text-mx-text">{sel.descricao}</p>
            <div className="mt-2">
              <Status tom={vencida(sel) ? 'bad' : 'warn'}>{vencida(sel) ? `Vencida ${quando(sel.vencimento)}` : sel.statusLabel}</Status>
            </div>
            <Grupo className="mt-4">
              <Linha titulo={sel.tipo === 'medicao' ? 'Obra' : 'Cliente'} valor={sel.contraparte} />
              {sel.tipo === 'manual' && sel.obraId && <Linha titulo="Obra" valor={nomeObra(sel.obraId)} />}
              <Linha titulo="Vencimento" valor={sel.vencimento ? fmtData(sel.vencimento, { ano: true }) : '—'} valorSub={sel.vencimento ? quando(sel.vencimento) : undefined} />
              <Linha titulo="Situação" valor={sel.statusLabel} />
              {sel.tipo === 'medicao' && Number(sel.original?.valorLiquido ?? sel.original?.valor_liquido) > 0 && (
                <Linha titulo="Valor líquido" valor={brl2(Number(sel.original.valorLiquido ?? sel.original.valor_liquido))} />
              )}
              {sel.tipo === 'manual' && sel.original?.categoria && <Linha titulo="Categoria" valor={sel.original.categoria} />}
            </Grupo>
          </>
        )}
      </Folha>
    </>
  );
}
