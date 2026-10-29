// ============================================================
// Financeiro > A pagar — despesas da FÁBRICA (sem obra) em aberto
// ============================================================
// Regra 1: despesas com obra pertencem à GFO e não aparecem aqui.
// Categoria com override manual (despesasOverrides) igual à DespesasPage.
// ============================================================
import React, { useMemo, useState } from 'react';
import { toast } from 'react-hot-toast';
import { CheckCircle2, Receipt } from 'lucide-react';
import { useLancamentos } from '@/contexts/ERPContext';
import { aplicarOverridesNaLista } from '@/utils/despesasOverrides';
import { normalizeStatusDespesa, STATUS_DESPESA_LABELS } from '@/utils/financeiroStatus';
import Folha from '../../kit/Folha';
import { Secao, Grupo, Linha, Metrica, Grade, Status, Botao, Vazio, Erro, Esqueleto } from '../../kit';
import { brl2, brlc, data as fmtData, quando } from '../../kit/fmt';
import { ensureOnline } from '../../ui/online';
import { success, tap } from '../../ui/haptics';
import { hojeLocalISO } from '../../ui/format';
import { useEstadoERP, usePodeEditar, diaISO, isoDe } from './comum';

const temObra = (l) => !!(l?.obraId || l?.obra_id);

export default function AbaPagar() {
  const { carregando, erro } = useEstadoERP();
  const { lancamentosDespesas = [], updateLancamento } = useLancamentos();
  const podeEditar = usePodeEditar();
  const [sel, setSel] = useState(null);
  const [salvando, setSalvando] = useState(false);

  const hoje = hojeLocalISO();
  const fimSemana = diaISO(7);

  const grupos = useMemo(() => {
    const abertas = aplicarOverridesNaLista((lancamentosDespesas || []).filter((l) => !temObra(l) && l?.tipo !== 'receita'))
      .map((l) => ({ ...l, _st: normalizeStatusDespesa(l.status), _venc: isoDe(l.dataVencimento || l.data_vencimento || l.vencimento) }))
      .filter((l) => l._st === 'pendente' || l._st === 'aprovado')
      .sort((a, b) => (a._venc || '9999').localeCompare(b._venc || '9999'));
    const vencidas = abertas.filter((l) => l._venc && l._venc < hoje);
    const semana = abertas.filter((l) => l._venc && l._venc >= hoje && l._venc < fimSemana);
    const proximas = abertas.filter((l) => !l._venc || l._venc >= fimSemana);
    const soma = (lista) => lista.reduce((s, l) => s + (Number(l.valor) || 0), 0);
    return [
      { id: 'vencidas', titulo: 'Vencidas', itens: vencidas, total: soma(vencidas), tom: 'bad' },
      { id: 'semana', titulo: 'Esta semana', itens: semana, total: soma(semana), tom: 'warn' },
      { id: 'proximas', titulo: 'Próximas', itens: proximas, total: soma(proximas), tom: 'neutro' },
    ];
  }, [lancamentosDespesas, hoje, fimSemana]);

  const totalAberto = grupos.reduce((s, g) => s + g.total, 0);
  const qtdAberto = grupos.reduce((s, g) => s + g.itens.length, 0);

  const marcarPaga = async () => {
    if (!sel) return;
    if (!podeEditar) { toast.error('Sem permissão para editar o financeiro'); return; }
    if (!ensureOnline()) return;
    tap();
    setSalvando(true);
    try {
      await updateLancamento(sel.id, { status: 'pago', dataPagamento: hojeLocalISO() });
      success();
      toast.success('Despesa marcada como paga');
      setSel(null);
    } catch (e) {
      toast.error(`Não foi possível salvar: ${e?.message || 'erro'}`);
    } finally {
      setSalvando(false);
    }
  };

  if (erro) return <Erro texto={erro} />;
  if (carregando) return <Esqueleto metricas={2} linhas={5} />;

  return (
    <>
      <Grade className="mt-4">
        <Metrica rotulo="Total em aberto" valor={brlc(totalAberto)} sub={`${qtdAberto} despesa(s) da fábrica`} />
        <Metrica rotulo="Vencido" valor={brlc(grupos[0].total)} tom={grupos[0].total > 0 ? 'bad' : 'ok'} sub={`${grupos[0].itens.length} despesa(s)`} />
      </Grade>

      {qtdAberto === 0 ? (
        <Vazio icone={Receipt} titulo="Nenhuma conta em aberto" texto="Todas as despesas da fábrica estão pagas." />
      ) : grupos.map((g) => (
        <Secao key={g.id} titulo={g.titulo} descricao={`${g.itens.length} · ${brlc(g.total)}`}>
          {g.itens.length === 0 ? (
            <Grupo><Linha titulo="Nada neste período" /></Grupo>
          ) : (
            <Grupo>
              {g.itens.map((l) => (
                <Linha
                  key={l.id}
                  icone={Receipt}
                  iconeTom={g.tom === 'neutro' ? 'neutro' : g.tom}
                  titulo={l.descricao || l.categoria || 'Despesa'}
                  sub={[l.fornecedor && l.fornecedor !== '-' ? l.fornecedor : null, l.categoria].filter(Boolean).join(' · ') || undefined}
                  valor={brlc(l.valor)}
                  valorTom={g.id === 'vencidas' ? 'bad' : undefined}
                  valorSub={l._venc ? `${fmtData(l._venc)} · ${quando(l._venc)}` : 'sem vencimento'}
                  onClick={() => setSel(l)}
                />
              ))}
            </Grupo>
          )}
        </Secao>
      ))}

      <Folha
        open={!!sel}
        onClose={() => setSel(null)}
        title="Despesa a pagar"
        footer={sel && (podeEditar ? (
          <Botao className="mb-1 w-full" icone={CheckCircle2} carregando={salvando} onClick={marcarPaga}>Marcar como paga</Botao>
        ) : (
          <p className="pb-2 text-center text-[13px] text-mx-text3">Sem permissão para editar o financeiro.</p>
        ))}
      >
        {sel && (
          <>
            <div className="mx-num text-[30px] leading-tight text-mx-text">{brl2(Number(sel.valor) || 0)}</div>
            <p className="mt-1 text-[15px] text-mx-text">{sel.descricao || 'Despesa'}</p>
            <div className="mt-2">
              <Status tom={sel._venc && sel._venc < hoje ? 'bad' : 'warn'}>
                {sel._venc && sel._venc < hoje ? `Vencida ${quando(sel._venc)}` : STATUS_DESPESA_LABELS[sel._st]}
              </Status>
            </div>
            <Grupo className="mt-4">
              <Linha titulo="Fornecedor" valor={sel.fornecedor && sel.fornecedor !== '-' ? sel.fornecedor : '—'} />
              <Linha titulo="Categoria" valor={sel.categoria || '—'} valorSub={sel._categoriaOverride ? 'ajustada manualmente' : undefined} />
              <Linha titulo="Vencimento" valor={sel._venc ? fmtData(sel._venc, { ano: true }) : '—'} valorSub={sel._venc ? quando(sel._venc) : undefined} />
              <Linha titulo="Emissão" valor={fmtData(isoDe(sel.dataEmissao || sel.data_emissao || sel.data), { ano: true })} />
              {sel.numeroNF || sel.numero_nf ? <Linha titulo="Nota fiscal" valor={sel.numeroNF || sel.numero_nf} /> : null}
            </Grupo>
          </>
        )}
      </Folha>
    </>
  );
}
