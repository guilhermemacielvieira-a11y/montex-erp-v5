// ============================================================
// Central de Relatórios — detalhe de um item do histórico
// ============================================================
// Agendados (formato 'resumo'): o JSON gerado pelo motor é mostrado em
// cards por seção (produção / financeiro / estoque). Manuais: parâmetros e
// principais números registrados no momento da geração.
// ============================================================

import React from 'react';
import { FileText, CalendarClock, User, Building2, ArrowRight, AlertTriangle } from 'lucide-react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { fmtBRL, fmtKg, fmtNum } from '@/components/bi/biUi';
import { cn } from '@/lib/utils';
import {
  secoesResumoAgendado, rotuloTipo, fmtDataHoraBRT, TIPO_AGENDADO_PARA_CATALOGO, catalogoPorId,
} from '@/services/relatoriosCatalogo';
import { SeloFormato, Carregando, FaixaErro, CLS_BTN_PRIMARIO } from './relatoriosUi';

const fmtValor = (v, tipo) => (tipo === 'brl' ? fmtBRL(v) : tipo === 'kg' ? fmtKg(v) : fmtNum(v));

// Chave do JSON → texto legível (manuais).
const ROTULOS = {
  pecas: 'Peças', kg: 'Peso (kg)', progresso_pct: 'Progresso (%)', paginas: 'Páginas', itens: 'Itens', itens_estoque: 'Itens de estoque',
  fabricaveis: 'Marcas fabricáveis', nao_fabricaveis: 'Marcas não fabricáveis', em_alerta: 'Itens em alerta', valor_total: 'Valor total',
  receitas: 'Receitas (movimentos)', despesas: 'Despesas (movimentos)', receber_vencido: 'A receber vencido', pagar_vencido: 'A pagar vencido',
  saldo_8_semanas: 'Saldo projetado (8 semanas)', regra: 'Regra', leitura_ia: 'Com leitura da IA', total: 'Total', critico: 'Críticos',
  alto: 'Altos', medio: 'Médios', baixo: 'Baixos', executivo: 'Executivo', producao: 'Produção', financeiro: 'Financeiro', estoque: 'Estoque',
  alertas: 'Alertas', obras_ativas: 'Obras ativas', carteira_valor: 'Carteira (a medir)', carteira_kg: 'Carteira (kg)', meses_carteira: 'Meses de carteira',
  contratado: 'Contratado', medido: 'Medido', a_receber: 'A receber', obras_em_atraso: 'Obras com previsão de atraso',
  kg_semana_atual: 'Ritmo atual (kg/semana)', kg_semana_anterior: 'Ritmo anterior (kg/semana)', variacao_pct: 'Variação do ritmo (%)', gargalo: 'Gargalo',
};
const MONETARIOS = /valor|receber|pagar|saldo|contratado|medido|carteira_valor/;
const PESOS = /^kg$|_kg$|^kg_/;

function valorLegivel(k, v) {
  if (v === null || v === undefined) return '—';
  if (typeof v === 'boolean') return v ? 'Sim' : 'Não';
  if (typeof v === 'number') {
    if (MONETARIOS.test(k) && !/^(receitas|despesas)$/.test(k)) return fmtBRL(v);
    if (PESOS.test(k)) return fmtKg(v);
    return fmtNum(v, 1);
  }
  return String(v);
}

function ListaChaves({ obj }) {
  const entradas = Object.entries(obj || {});
  if (!entradas.length) return <p className="text-xs text-slate-500">Nada registrado.</p>;
  return (
    <div className="space-y-3">
      {entradas.map(([k, v]) => (v && typeof v === 'object' && !Array.isArray(v) ? (
        <div key={k} className="rounded-lg border border-slate-700/60 bg-slate-950/40 p-3">
          <h4 className="mb-2 text-xs font-semibold text-slate-200">{ROTULOS[k] || k}</h4>
          <dl className="grid grid-cols-1 sm:grid-cols-2 gap-x-4 gap-y-1">
            {Object.entries(v).map(([k2, v2]) => (
              <div key={k2} className="flex justify-between gap-3 text-xs">
                <dt className="text-slate-400">{ROTULOS[k2] || k2}</dt>
                <dd className="text-right font-medium text-slate-100 tabular-nums">{typeof v2 === 'object' && v2 !== null ? JSON.stringify(v2) : valorLegivel(k2, v2)}</dd>
              </div>
            ))}
          </dl>
        </div>
      ) : (
        <div key={k} className="flex justify-between gap-3 text-xs">
          <span className="text-slate-400">{ROTULOS[k] || k}</span>
          <span className="text-right font-medium text-slate-100 tabular-nums">{Array.isArray(v) ? v.join(', ') : valorLegivel(k, v)}</span>
        </div>
      )))}
    </div>
  );
}

function ResumoAgendado({ resumo }) {
  const secoes = secoesResumoAgendado(resumo);
  if (!secoes.length) return <p className="text-sm text-slate-400">Este resumo não trouxe dados.</p>;
  return (
    <div className="space-y-3">
      {secoes.map((s) => (
        <section key={s.id} className="rounded-lg border border-slate-700/60 bg-slate-950/40 p-3" aria-label={s.titulo}>
          <h4 className="text-sm font-semibold text-white">{s.titulo}</h4>
          {s.nota && <p className="text-[11px] text-slate-400">{s.nota}</p>}
          <div className="mt-2 grid grid-cols-2 sm:grid-cols-3 gap-2">
            {s.itens.map((i) => (
              <div key={i.rotulo} className={cn('rounded-md border p-2', i.alerta ? 'border-red-500/40 bg-red-500/10' : 'border-slate-700/60 bg-slate-900/60')}>
                <p className="text-[11px] text-slate-400 flex items-center gap-1">
                  {i.alerta && <AlertTriangle className="h-3 w-3 text-red-400" aria-label="atenção" />} {i.rotulo}
                </p>
                <p className="text-sm font-semibold text-slate-100 tabular-nums">{fmtValor(i.valor, i.tipo)}</p>
              </div>
            ))}
          </div>
          {s.porEtapa?.length > 0 && (
            <table className="mt-3 w-full text-xs">
              <caption className="sr-only">Peças por etapa</caption>
              <thead>
                <tr className="text-slate-400">
                  <th scope="col" className="py-1 text-left font-medium">Etapa</th>
                  <th scope="col" className="py-1 text-right font-medium">Peças</th>
                  <th scope="col" className="py-1 text-right font-medium">Peso</th>
                </tr>
              </thead>
              <tbody>
                {s.porEtapa.map((e) => (
                  <tr key={e.etapa} className="border-t border-slate-800">
                    <td className="py-1 text-slate-200">{e.rotulo}</td>
                    <td className="py-1 text-right tabular-nums text-slate-100">{fmtNum(e.pecas)}</td>
                    <td className="py-1 text-right tabular-nums text-slate-100">{fmtKg(e.kg)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </section>
      ))}
    </div>
  );
}

export default function DetalheHistorico({ aberto, item, carregando, erro, onFechar, onGerarAtual, nomeObra }) {
  const agendado = item?.formato === 'resumo' || item?.origem === 'agendado';
  const tipoCatalogo = item ? (TIPO_AGENDADO_PARA_CATALOGO[item.tipo] || (catalogoPorId(item.tipo) ? item.tipo : null)) : null;
  return (
    <Dialog open={aberto} onOpenChange={(v) => { if (!v) onFechar(); }}>
      <DialogContent className="max-w-2xl max-h-[92vh] overflow-y-auto border-slate-700 bg-slate-900 text-slate-100">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-white pr-6">
            <FileText className="h-5 w-5 text-slate-300" aria-hidden /> {item?.titulo || 'Relatório'}
          </DialogTitle>
          <DialogDescription className="text-slate-400">
            {item ? `${rotuloTipo(item.tipo)} · ${agendado ? 'gerado pelo agendamento' : 'gerado manualmente'}` : 'Carregando detalhe do relatório.'}
          </DialogDescription>
        </DialogHeader>

        {carregando && <Carregando texto="Carregando relatório…" />}
        <FaixaErro mensagem={erro} />

        {item && (
          <div className="space-y-4">
            <dl className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs">
              <div className="flex items-center gap-2"><CalendarClock className="h-3.5 w-3.5 text-slate-400" aria-hidden /><dt className="text-slate-400">Data:</dt><dd className="text-slate-100">{fmtDataHoraBRT(item.created_at)}</dd></div>
              <div className="flex items-center gap-2"><Building2 className="h-3.5 w-3.5 text-slate-400" aria-hidden /><dt className="text-slate-400">Escopo:</dt><dd className="text-slate-100 truncate">{item.escopo_rotulo || (item.obra_id ? nomeObra(item.obra_id) : 'Geral')}</dd></div>
              <div className="flex items-center gap-2"><User className="h-3.5 w-3.5 text-slate-400" aria-hidden /><dt className="text-slate-400">Gerado por:</dt><dd className="text-slate-100">{item.gerado_por_nome || '—'}</dd></div>
              <div className="flex items-center gap-2"><dt className="text-slate-400">Formato:</dt><dd><SeloFormato formato={item.formato} /></dd></div>
            </dl>

            {agendado ? (
              <>
                <p className="text-xs text-slate-400">
                  Resumo com os números do momento em que o agendamento rodou{item.resumo?.data ? ` (${String(item.resumo.data).split('-').reverse().join('/')})` : ''}. O PDF completo é gerado sob demanda.
                </p>
                <ResumoAgendado resumo={item.resumo} />
              </>
            ) : (
              <>
                {item.parametros && Object.keys(item.parametros).length > 0 && (
                  <section aria-label="Parâmetros">
                    <h4 className="mb-2 text-sm font-semibold text-white">Parâmetros</h4>
                    <ListaChaves obj={item.parametros} />
                  </section>
                )}
                <section aria-label="Principais números">
                  <h4 className="mb-2 text-sm font-semibold text-white">Principais números (no momento da geração)</h4>
                  <ListaChaves obj={item.resumo} />
                </section>
                <p className="text-[11px] text-slate-500">O arquivo foi baixado no computador de quem gerou; para uma versão atualizada, gere de novo.</p>
              </>
            )}

            {tipoCatalogo && (
              <div className="flex justify-end">
                <button type="button" className={CLS_BTN_PRIMARIO} onClick={() => onGerarAtual(tipoCatalogo, item.obra_id)}>
                  Gerar {catalogoPorId(tipoCatalogo)?.formatos?.[0]?.toUpperCase() || 'arquivo'} atual <ArrowRight className="h-3.5 w-3.5" aria-hidden />
                </button>
              </div>
            )}
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
