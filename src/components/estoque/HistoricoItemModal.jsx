// ============================================================
// HistoricoItemModal — rastreabilidade (extrato) de um item de estoque
// ============================================================
// Mostra o histórico completo de movimentações de UM item: entradas de compra,
// baixas de produção, estornos e lançamentos manuais/NF — com saldo corrido,
// custo e quebra por origem. Lê de movimentacoesEstoque (já carregado no
// contexto) via serviço puro rastreabilidadeEstoque.
// ============================================================
import React, { useMemo } from 'react';
import { X, ArrowDownLeft, ArrowUpRight, FileText, Package } from 'lucide-react';
import { historicoDoItem, resumoRastreabilidade, ORIGEM_INFO, rotuloOrigem } from '@/services/rastreabilidadeEstoque';

const fmtNum = (n, u) => (Number(n) || 0).toLocaleString('pt-BR', { maximumFractionDigits: 0 }) + (u ? ` ${u}` : '');
const fmtData = (d) => {
  if (!d) return '—';
  const dt = new Date(d);
  return Number.isNaN(dt.getTime()) ? String(d) : dt.toLocaleString('pt-BR', { day: '2-digit', month: '2-digit', year: '2-digit', hour: '2-digit', minute: '2-digit' });
};

export default function HistoricoItemModal({ open, item, movimentacoes = [], onClose }) {
  const historico = useMemo(() => (item ? historicoDoItem(movimentacoes, item) : []), [movimentacoes, item]);
  const resumo = useMemo(() => resumoRastreabilidade(historico), [historico]);

  if (!open || !item) return null;
  const un = item.unidade || 'kg';

  return (
    <div className="fixed inset-0 z-[80] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm" onClick={onClose}>
      <div className="bg-slate-900 border border-slate-700 rounded-2xl shadow-2xl w-full max-w-3xl max-h-[92vh] overflow-y-auto" onClick={(e) => e.stopPropagation()}>
        <div className="flex items-center justify-between p-5 border-b border-slate-700 sticky top-0 bg-slate-900 z-10">
          <h2 className="text-white font-semibold text-lg flex items-center gap-2">
            <Package className="w-5 h-5 text-orange-400" />
            Rastreabilidade — {item.codigo || item.descricao}
          </h2>
          <button onClick={onClose} className="text-slate-400 hover:text-white p-1 rounded-lg hover:bg-slate-800"><X className="w-5 h-5" /></button>
        </div>

        <div className="p-5 space-y-4">
          {/* Resumo */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            <ResumoBox label="Saldo atual" valor={fmtNum(item.quantidade, un)} cor="text-white" />
            <ResumoBox label="Entradas" valor={fmtNum(resumo.entradas, un)} cor="text-emerald-400" />
            <ResumoBox label="Saídas" valor={fmtNum(resumo.saidas, un)} cor="text-red-400" />
            <ResumoBox label="Movimentações" valor={resumo.total} cor="text-slate-200" />
          </div>

          {/* Quebra por origem */}
          {resumo.porOrigem.length > 0 && (
            <div className="flex flex-wrap gap-2">
              {resumo.porOrigem.map((o) => (
                <span key={o.origem} className={`text-[11px] px-2 py-1 rounded-md border ${ORIGEM_INFO[o.origem]?.cor || 'bg-slate-500/20 text-slate-300 border-slate-500/40'}`}>
                  {o.label}: <b>{o.count}</b>
                  {o.entradas > 0 && <span className="opacity-80"> · +{fmtNum(o.entradas)}</span>}
                  {o.saidas > 0 && <span className="opacity-80"> · −{fmtNum(o.saidas)}</span>}
                </span>
              ))}
            </div>
          )}

          {/* Extrato */}
          {historico.length === 0 ? (
            <div className="py-10 text-center text-slate-400 text-sm">
              Sem movimentações registradas para este item ainda.
            </div>
          ) : (
            <div className="overflow-x-auto rounded-lg border border-slate-800">
              <table className="w-full text-sm">
                <thead className="bg-slate-800/60 text-slate-400 text-xs">
                  <tr>
                    <th className="text-left p-2.5">Data</th>
                    <th className="text-left p-2.5">Movimento</th>
                    <th className="text-left p-2.5">Origem</th>
                    <th className="text-right p-2.5">Qtd</th>
                    <th className="text-right p-2.5">Saldo</th>
                    <th className="text-left p-2.5">Detalhe</th>
                  </tr>
                </thead>
                <tbody>
                  {historico.map((m) => {
                    const ehEntrada = m.tipo === 'entrada';
                    return (
                      <tr key={m.id} className="border-t border-slate-800 hover:bg-slate-800/30">
                        <td className="p-2.5 text-slate-300 whitespace-nowrap text-xs">{fmtData(m.data)}</td>
                        <td className="p-2.5">
                          <span className={`inline-flex items-center gap-1 text-xs font-medium ${ehEntrada ? 'text-emerald-400' : 'text-red-400'}`}>
                            {ehEntrada ? <ArrowDownLeft className="w-3.5 h-3.5" /> : <ArrowUpRight className="w-3.5 h-3.5" />}
                            {ehEntrada ? 'Entrada' : 'Saída'}
                          </span>
                        </td>
                        <td className="p-2.5">
                          <span className={`text-[10px] px-1.5 py-0.5 rounded border ${ORIGEM_INFO[m.origem]?.cor || 'bg-slate-500/20 text-slate-300 border-slate-500/40'}`}>
                            {rotuloOrigem(m.origem)}
                          </span>
                        </td>
                        <td className={`p-2.5 text-right text-xs font-semibold ${ehEntrada ? 'text-emerald-400' : 'text-red-400'}`}>
                          {ehEntrada ? '+' : '−'}{fmtNum(m.quantidade, m.unidade || un)}
                        </td>
                        <td className="p-2.5 text-right text-xs text-slate-300 whitespace-nowrap">
                          {m.saldoNovo != null ? fmtNum(m.saldoNovo) : '—'}
                        </td>
                        <td className="p-2.5 text-xs text-slate-400 max-w-[220px]">
                          <div className="truncate" title={m.motivo}>{m.motivo || '—'}</div>
                          <div className="flex items-center gap-2 mt-0.5 text-[10px] text-slate-500">
                            {m.pecaId && <span>peça {m.pecaId}</span>}
                            {m.notaFiscal && <span>NF {m.notaFiscal}</span>}
                            {m.custoUnitario > 0 && <span>R$ {m.custoUnitario.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}/un</span>}
                            {m.documentoUrl && (
                              <a href={m.documentoUrl} target="_blank" rel="noreferrer" className="inline-flex items-center gap-0.5 text-orange-400 hover:text-orange-300">
                                <FileText className="w-3 h-3" /> anexo
                              </a>
                            )}
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>

        <div className="flex justify-end p-5 border-t border-slate-700 sticky bottom-0 bg-slate-900">
          <button onClick={onClose} className="px-5 py-2.5 rounded-lg border border-slate-600 text-slate-300 hover:bg-slate-800 text-sm">Fechar</button>
        </div>
      </div>
    </div>
  );
}

function ResumoBox({ label, valor, cor }) {
  return (
    <div className="bg-slate-800/50 border border-slate-700/50 rounded-xl px-3 py-2.5">
      <p className="text-[11px] text-slate-400">{label}</p>
      <p className={`text-lg font-bold ${cor}`}>{valor}</p>
    </div>
  );
}
