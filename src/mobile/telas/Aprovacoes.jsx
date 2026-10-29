// ============================================================
// APROVAÇÕES — caixa de entrada de decisões da diretoria (rota /m/aprovacoes)
// ============================================================
// Reescrita visual de pages/AprovacoesMobile.jsx com a MESMA lógica:
//   • Medições   (perm medicao.aprovar)    → updateMedicao status 'aprovada'
//   • Orçamentos (perm orcamentos.aprovar) → aprovarOrcamento / recusa
//     (updateOrcamento status 'recusado' + data_aprovacao)
//   • Compras    (perm compras.aprovar)    → aprovarCompra(id, bool)
// Toda escrita: ensureOnline → confirmarBiometria → haptic → toast.
// Mesmos predicados de pendência e mesmo filtro por obra (matchObra;
// orçamento/compra sem obra aparecem sempre).
// usePendenciasAprovacao() é exportado para o badge do Início.
// ============================================================
import React, { useEffect, useMemo, useState } from 'react';
import { toast } from 'react-hot-toast';
import { CheckCheck, Check, X, Ruler, Calculator, ShoppingCart } from 'lucide-react';
import { useERP, useMedicoes, useOrcamentos, useCompras } from '@/contexts/ERPContext';
import { useAuth } from '@/lib/AuthContext';
import { useObraFiltro } from '../ObraContext';
import { valorMedicao } from '../dados';
import { hojeLocalISO } from '../ui/format';
import { tap, success } from '../ui/haptics';
import { confirmarBiometria } from '../ui/biometric';
import { ensureOnline } from '../ui/online';
import { Tela, Abas, Grupo, Linha, Botao, Vazio, Esqueleto, Etiqueta } from '../kit';
import Folha from '../kit/Folha';
import { brl2, kg, data as fmtData } from '../kit/fmt';

// ---- predicados (idênticos a AprovacoesMobile / useAlertas) ----
export const medPendente = (m) => ['pendente', 'aguardando'].includes(String(m?.status || '').toLowerCase());
const ORC_ABERTOS = ['enviado', 'em_analise', 'negociacao', 'pendente'];
export const orcPendente = (o) => ORC_ABERTOS.includes(String(o?.status || '').toLowerCase());
export const cmpPendente = (c) => String(c?.status || '').toLowerCase() === 'pendente';

const porDataDesc = (campos) => (a, b) => {
  const v = (x) => String(campos.map((c) => x[c]).find(Boolean) || '');
  return v(b).localeCompare(v(a));
};
const ROTULO_ORC = { enviado: 'Enviado', em_analise: 'Em análise', negociacao: 'Negociação', pendente: 'Pendente' };
const valorOrc = (o) => o.valor_total ?? o.valorTotal ?? o.valor;
const valorCmp = (c) => c.valor ?? c.valor_total;

/** Pendências de aprovação visíveis para o usuário (respeita permissões e filtro de obra). */
export function usePendenciasAprovacao() {
  const { medicoes = [] } = useMedicoes?.() || {};
  const { orcamentos = [] } = useOrcamentos?.() || {};
  const { compras = [] } = useCompras?.() || {};
  const { matchObra } = useObraFiltro();
  const { hasPermission } = useAuth() || {};
  const podeMed = !!hasPermission && hasPermission('medicao.aprovar');
  const podeOrc = !!hasPermission && hasPermission('orcamentos.aprovar');
  const podeCmp = !!hasPermission && hasPermission('compras.aprovar');

  return useMemo(() => {
    const meds = (podeMed ? medicoes.filter(medPendente).filter(matchObra) : [])
      .slice().sort(porDataDesc(['dataMedicao', 'data']));
    const orcs = (podeOrc ? orcamentos.filter(orcPendente).filter((o) => !(o.obraId ?? o.obra_id) || matchObra(o)) : [])
      .slice().sort(porDataDesc(['created_at', 'data']));
    const cmps = (podeCmp ? compras.filter(cmpPendente).filter((c) => !(c.obraId ?? c.obra_id) || matchObra(c)) : [])
      .slice().sort(porDataDesc(['created_at', 'data']));
    return { meds, orcs, cmps, total: meds.length + orcs.length + cmps.length, podeMed, podeOrc, podeCmp };
  }, [medicoes, orcamentos, compras, matchObra, podeMed, podeOrc, podeCmp]);
}

export default function Aprovacoes() {
  const { updateMedicao } = useMedicoes?.() || {};
  const { aprovarOrcamento, updateOrcamento } = useOrcamentos?.() || {};
  const comprasCtx = useCompras?.() || {};
  const { meds, orcs, cmps, total, podeMed, podeOrc, podeCmp } = usePendenciasAprovacao();
  const { dataSource, obras = [] } = useERP?.() || {};
  const nomeObra = (id) => obras.find((o) => o.id === id)?.nome || null;

  const abas = useMemo(() => [
    podeMed && { id: 'med', rotulo: 'Medições', badge: meds.length },
    podeOrc && { id: 'orc', rotulo: 'Orçamentos', badge: orcs.length },
    podeCmp && { id: 'cmp', rotulo: 'Compras', badge: cmps.length },
  ].filter(Boolean), [podeMed, podeOrc, podeCmp, meds.length, orcs.length, cmps.length]);

  const [aba, setAba] = useState(null);
  // Aba inicial: a primeira com pendência (ou a primeira permitida)
  useEffect(() => {
    if (aba && abas.some((a) => a.id === aba)) return;
    const primeira = abas.find((a) => a.badge > 0) || abas[0];
    if (primeira) setAba(primeira.id);
  }, [abas, aba]);

  const [busy, setBusy] = useState(null);       // `${tipo}:${id}` em processamento
  const [detalhe, setDetalhe] = useState(null); // { tipo: 'med'|'orc'|'cmp', item }

  // ---- ações (todas: online + biometria + haptic + toast) ----
  const executar = async (key, reason, fn, okMsg, errMsg) => {
    if (!ensureOnline()) return;
    const ok = await confirmarBiometria(reason);
    if (!ok) { toast.error('Autenticação não confirmada'); return; }
    setBusy(key);
    try {
      await fn();
      await success();
      toast.success(okMsg);
      setDetalhe(null);
    } catch (err) {
      toast.error(errMsg);
      console.error(`[Aprovacoes] ${key} falhou:`, err);
    } finally {
      setBusy(null);
    }
  };

  // O original chamava useCompras().aprovarCompra, que o ERPContext não
  // expõe. Mantém a chamada se existir; senão grava o status via updateCompra
  // (status do desktop: 'aprovado' / 'cancelado').
  const decidirCompra = (id, aprovado) => {
    if (typeof comprasCtx.aprovarCompra === 'function') return comprasCtx.aprovarCompra(id, aprovado);
    return comprasCtx.updateCompra(id, { status: aprovado ? 'aprovado' : 'cancelado' });
  };

  const aprovarMed = (m) => executar(
    `med:${m.id}`, `Aprovar medição ${m.numero || ''}`.trim(),
    () => updateMedicao(m.id, { status: 'aprovada' }),
    `Medição ${m.numero || ''} aprovada`.replace('  ', ' '), 'Falha ao aprovar medição',
  );
  const aprovarOrc = (o) => executar(
    `orc:${o.id}`, `Aprovar orçamento ${o.numero || ''}`.trim(),
    () => aprovarOrcamento(o.id, o.obraId ?? o.obra_id),
    `Orçamento ${o.numero || ''} aprovado`.replace('  ', ' '), 'Falha ao aprovar orçamento',
  );
  const recusarOrc = (o) => executar(
    `orc-rec:${o.id}`, `Recusar orçamento ${o.numero || ''}`.trim(),
    () => updateOrcamento(o.id, { status: 'recusado', data_aprovacao: hojeLocalISO() }),
    `Orçamento ${o.numero || ''} recusado`.replace('  ', ' '), 'Falha ao recusar orçamento',
  );
  const aprovarCmp = (c) => executar(
    `cmp:${c.id}`, `Aprovar compra ${c.id || ''}`.trim(),
    () => decidirCompra(c.id, true),
    `Compra ${c.id || ''} aprovada`.replace('  ', ' '), 'Falha ao aprovar compra',
  );
  const recusarCmp = (c) => executar(
    `cmp-rec:${c.id}`, `Recusar compra ${c.id || ''}`.trim(),
    () => decidirCompra(c.id, false),
    `Compra ${c.id || ''} recusada`.replace('  ', ' '), 'Falha ao recusar compra',
  );

  const abrir = (tipo, item) => { tap('light'); setDetalhe({ tipo, item }); };
  const carregando = dataSource === 'loading';
  const semPermissao = abas.length === 0;

  const subtitulo = total === 0 ? 'Nada aguardando decisão' : total === 1 ? '1 pendência' : `${total} pendências`;

  let lista = null;
  if (aba === 'med') {
    lista = meds.length ? (
      <Grupo>
        {meds.map((m) => (
          <Linha
            key={m.id}
            icone={Ruler}
            iconeTom="teal"
            titulo={m.numero ? `Medição ${m.numero}${nomeObra(m.obraId ?? m.obra_id) ? ` · ${nomeObra(m.obraId ?? m.obra_id)}` : ''}` : (m.descricao || m.id)}
            sub={[m.descricao && m.numero ? m.descricao : null, m.pesoMedido ? kg(m.pesoMedido) : null, fmtData(m.dataMedicao || m.data)].filter(Boolean).join(' · ')}
            valor={brl2(valorMedicao(m))}
            onClick={() => abrir('med', m)}
          />
        ))}
      </Grupo>
    ) : <Vazio icone={CheckCheck} titulo="Nenhuma medição pendente" />;
  } else if (aba === 'orc') {
    lista = orcs.length ? (
      <Grupo>
        {orcs.map((o) => (
          <Linha
            key={o.id}
            icone={Calculator}
            iconeTom="warn"
            titulo={o.numero || o.projeto || o.id}
            sub={[o.cliente || o.projeto, ROTULO_ORC[String(o.status || '').toLowerCase()]].filter(Boolean).join(' · ')}
            valor={brl2(valorOrc(o))}
            onClick={() => abrir('orc', o)}
          />
        ))}
      </Grupo>
    ) : <Vazio icone={CheckCheck} titulo="Nenhum orçamento pendente" />;
  } else if (aba === 'cmp') {
    lista = cmps.length ? (
      <Grupo>
        {cmps.map((c) => (
          <Linha
            key={c.id}
            icone={ShoppingCart}
            iconeTom="neutro"
            titulo={c.fornecedor || c.id}
            sub={[c.id, c.prazo ? `prazo ${fmtData(c.prazo)}` : null].filter(Boolean).join(' · ')}
            valor={brl2(valorCmp(c))}
            onClick={() => abrir('cmp', c)}
          />
        ))}
      </Grupo>
    ) : <Vazio icone={CheckCheck} titulo="Nenhuma compra pendente" />;
  }

  const tituloFolha = detalhe?.tipo === 'med' ? 'Medição' : detalhe?.tipo === 'cmp' ? 'Compra' : 'Orçamento';
  const podeRecusar = detalhe && (detalhe.tipo === 'orc' || detalhe.tipo === 'cmp');
  const buscandoAprovar = detalhe && busy === `${detalhe.tipo}:${detalhe.item.id}`;
  const buscandoRecusar = detalhe && busy === `${detalhe.tipo}-rec:${detalhe.item.id}`;

  return (
    <Tela
      titulo="Aprovações"
      subtitulo={subtitulo}
      voltar
      cabecalhoExtra={abas.length > 1 ? <Abas itens={abas} valor={aba} onChange={(v) => { tap('light'); setAba(v); }} /> : null}
    >
      {carregando ? (
        <Esqueleto linhas={4} />
      ) : semPermissao ? (
        <Vazio icone={CheckCheck} titulo="Sem aprovações para o seu perfil" texto="Seu usuário não tem permissão para aprovar medições, orçamentos ou compras." />
      ) : total === 0 ? (
        <Vazio icone={CheckCheck} titulo="Tudo aprovado" texto="Nenhuma pendência para você agora." />
      ) : (
        <div className="pt-4">{lista}</div>
      )}

      <Folha
        open={!!detalhe}
        onClose={() => !busy && setDetalhe(null)}
        title={tituloFolha}
        footer={detalhe && (
          <div className="flex gap-2 pb-1">
            {podeRecusar && (
              <Botao
                variante="perigo"
                icone={X}
                className="flex-1"
                carregando={buscandoRecusar}
                disabled={!!busy}
                onClick={() => (detalhe.tipo === 'orc' ? recusarOrc(detalhe.item) : recusarCmp(detalhe.item))}
              >
                Recusar
              </Botao>
            )}
            <Botao
              variante="primario"
              icone={Check}
              className="flex-[2]"
              carregando={buscandoAprovar}
              disabled={!!busy}
              onClick={() => (detalhe.tipo === 'med' ? aprovarMed(detalhe.item) : detalhe.tipo === 'cmp' ? aprovarCmp(detalhe.item) : aprovarOrc(detalhe.item))}
            >
              Aprovar
            </Botao>
          </div>
        )}
      >
        {detalhe?.tipo === 'med' && <DetalheMedicao m={detalhe.item} />}
        {detalhe?.tipo === 'orc' && <DetalheOrcamento o={detalhe.item} />}
        {detalhe?.tipo === 'cmp' && <DetalheCompra c={detalhe.item} />}
      </Folha>
    </Tela>
  );
}

// ---------- detalhe ----------
function Campos({ itens }) {
  return (
    <Grupo>
      {itens.map(([k, v]) => (
        <div key={k} className="flex min-h-[48px] items-center justify-between gap-3 px-4 py-2.5">
          <span className="shrink-0 text-[14px] text-mx-text2">{k}</span>
          <span className="mx-tab min-w-0 truncate text-right text-[15px] text-mx-text">{v ?? '—'}</span>
        </div>
      ))}
    </Grupo>
  );
}

function Nota({ children }) {
  return <p className="mt-3 rounded-[14px] bg-mx-s2 p-3 text-[14px] text-mx-text">{children}</p>;
}

function Destaque({ valor, sub }) {
  return (
    <div className="mb-4">
      <div className="mx-num text-[28px] leading-tight text-mx-text">{valor}</div>
      {sub && <div className="mt-1 text-[13px] text-mx-text2">{sub}</div>}
    </div>
  );
}

function DetalheMedicao({ m }) {
  const { obras = [] } = useERP?.() || {};
  const obraId = m.obraId ?? m.obra_id;
  const nome = obras.find((o) => o.id === obraId)?.nome || m.obra || obraId;
  const fotoUrl = m.detalhamento?.fotoUrl;
  return (
    <div>
      <Destaque valor={brl2(valorMedicao(m))} sub={nome} />
      <Campos itens={[
        ['Número', m.numero || m.id],
        ['Peso medido', m.pesoMedido ? kg(m.pesoMedido) : '—'],
        ['Data', fmtData(m.dataMedicao || m.data, { ano: true })],
        ['Responsável', m.responsavel],
      ]} />
      {m.observacoes && <Nota>{m.observacoes}</Nota>}
      {fotoUrl && (
        <div className="mt-3 overflow-hidden rounded-[14px] border border-mx-line">
          <img src={fotoUrl} alt="Evidência da medição" className="h-44 w-full object-cover" loading="lazy" />
        </div>
      )}
    </div>
  );
}

function DetalheOrcamento({ o }) {
  const st = String(o.status || '').toLowerCase();
  return (
    <div>
      <Destaque valor={brl2(valorOrc(o))} sub={o.cliente || o.projeto} />
      <div className="mb-3"><Etiqueta tom="warn">{ROTULO_ORC[st] || st.replace('_', ' ') || '—'}</Etiqueta></div>
      <Campos itens={[
        ['Número', o.numero || o.id],
        ['Projeto', o.projeto],
        ['Cliente', o.cliente],
        ['Peso estimado', o.peso_estimado ? kg(o.peso_estimado) : '—'],
        ['Criado em', fmtData(o.created_at || o.data, { ano: true })],
      ]} />
      {o.observacoes && <Nota>{o.observacoes}</Nota>}
    </div>
  );
}

function DetalheCompra({ c }) {
  return (
    <div>
      <Destaque valor={brl2(valorCmp(c))} sub={c.fornecedor} />
      <Campos itens={[
        ['Pedido', c.id],
        ['Fornecedor', c.fornecedor],
        ['Itens', c.itens != null ? String(Array.isArray(c.itens) ? c.itens.length : c.itens) : '—'],
        ['Prazo', c.prazo ? fmtData(c.prazo, { ano: true }) : '—'],
        ['Criado em', fmtData(c.created_at || c.data, { ano: true })],
      ]} />
      {c.descricao && <Nota>{c.descricao}</Nota>}
    </div>
  );
}
