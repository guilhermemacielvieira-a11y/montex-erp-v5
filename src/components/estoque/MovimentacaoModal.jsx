// ============================================================
// MovimentacaoModal — entrada/saída manual de estoque + anexo
// ============================================================
// Lança uma ENTRADA ou SAÍDA em um item de estoque: ajusta a quantidade e
// registra a movimentação (movimentacoes_estoque) com motivo, responsável,
// NF (entrada) e um ANEXO opcional (foto/PDF) — documento_url. Aberto pelos
// botões +/- do card do item.
// ============================================================
import React, { useState, useEffect } from 'react';
import { X, ArrowDownLeft, ArrowUpRight, Loader2 } from 'lucide-react';
import { toast } from 'sonner';
import { estoqueApi, movEstoqueApi } from '@/api/supabaseClient';
import AnexoDocumento from '@/components/ui/AnexoDocumento';

const N = (v) => { const n = parseFloat(String(v ?? '').replace(',', '.')); return Number.isFinite(n) ? n : 0; };
const hojeLocal = () => { const d = new Date(); return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`; };

export default function MovimentacaoModal({ open, item, tipo = 'entrada', obraAtual = null, onClose, onSaved }) {
  const ehEntrada = tipo === 'entrada';
  const [qtd, setQtd] = useState('');
  const [motivo, setMotivo] = useState('');
  const [responsavel, setResponsavel] = useState('');
  const [nf, setNf] = useState('');
  const [anexo, setAnexo] = useState('');
  const [salvando, setSalvando] = useState(false);

  useEffect(() => { if (open) { setQtd(''); setMotivo(''); setResponsavel(''); setNf(''); setAnexo(''); } }, [open, item]);
  if (!open || !item) return null;

  const saldoAtual = Number(item.quantidade) || 0;
  const q = N(qtd);
  const novoSaldo = ehEntrada ? saldoAtual + q : saldoAtual - q;

  const confirmar = async () => {
    if (!(q > 0)) { toast.error('Informe a quantidade'); return; }
    if (!ehEntrada && q > saldoAtual) { toast.error(`Saída (${q}) maior que o saldo atual (${saldoAtual})`); return; }
    setSalvando(true);
    try {
      const now = new Date().toISOString();
      await estoqueApi.update(item.id, {
        quantidade: novoSaldo,
        ...(ehEntrada ? { ultima_entrada: hojeLocal() } : { ultima_saida: hojeLocal() }),
        updated_at: now,
      });
      await movEstoqueApi.create({
        item_id: item.id,
        obra_id: item.obra_id || item.obraId || obraAtual || null,
        tipo,
        quantidade: q,
        unidade: item.unidade || 'UN',
        material: item.descricao || item.codigo || null,
        motivo: motivo.trim() || (ehEntrada ? 'Entrada manual' : 'Saída manual'),
        responsavel: responsavel.trim() || null,
        nota_fiscal: ehEntrada ? (nf.trim() || null) : null,
        documento_url: anexo || null,
        saldo_anterior: saldoAtual,
        saldo_novo: novoSaldo,
        origem: 'manual',
        data: now,
      });
      toast.success(`${ehEntrada ? 'Entrada' : 'Saída'} registrada — novo saldo: ${novoSaldo} ${item.unidade || ''}`);
      onSaved?.();
      onClose?.();
    } catch (e) {
      toast.error('Erro ao registrar movimentação: ' + (e.message || e));
    } finally {
      setSalvando(false);
    }
  };

  const Icon = ehEntrada ? ArrowDownLeft : ArrowUpRight;

  return (
    <div className="fixed inset-0 z-[80] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm" onClick={onClose}>
      <div className="bg-slate-900 border border-slate-700 rounded-2xl shadow-2xl w-full max-w-lg max-h-[92vh] overflow-y-auto" onClick={(e) => e.stopPropagation()}>
        <div className="flex items-center justify-between p-5 border-b border-slate-700 sticky top-0 bg-slate-900 z-10">
          <h2 className={`text-white font-semibold text-lg flex items-center gap-2 ${ehEntrada ? 'text-emerald-300' : 'text-red-300'}`}>
            <Icon className="w-5 h-5" /> {ehEntrada ? 'Entrada' : 'Saída'} — {item.codigo || item.descricao}
          </h2>
          <button onClick={onClose} className="text-slate-400 hover:text-white p-1 rounded-lg hover:bg-slate-800"><X className="w-5 h-5" /></button>
        </div>

        <div className="p-5 space-y-4">
          <div className={`rounded-xl px-3 py-2.5 text-sm flex items-center justify-between border ${ehEntrada ? 'bg-emerald-500/10 border-emerald-500/30' : 'bg-red-500/10 border-red-500/30'}`}>
            <span className="text-slate-300">Saldo atual: <b className="text-white">{saldoAtual} {item.unidade || ''}</b></span>
            {q > 0 && <span className={`font-bold ${ehEntrada ? 'text-emerald-300' : 'text-red-300'}`}>→ {novoSaldo} {item.unidade || ''}</span>}
          </div>

          <div className="grid grid-cols-2 gap-3">
            <L label={`Quantidade (${item.unidade || 'UN'}) *`}><input type="number" inputMode="decimal" value={qtd} onChange={(e) => setQtd(e.target.value)} className={inp} autoFocus /></L>
            {ehEntrada && <L label="Nº Nota Fiscal"><input value={nf} onChange={(e) => setNf(e.target.value)} className={inp} placeholder="Opcional" /></L>}
          </div>
          <L label="Motivo"><input value={motivo} onChange={(e) => setMotivo(e.target.value)} className={inp} placeholder={ehEntrada ? 'Ex.: Compra / chegada' : 'Ex.: Consumo em produção'} /></L>
          <L label="Responsável"><input value={responsavel} onChange={(e) => setResponsavel(e.target.value)} className={inp} placeholder="Opcional" /></L>
          <AnexoDocumento valor={anexo} onChange={setAnexo} pasta="movimentacoes" label={ehEntrada ? 'Anexo da nota (foto/PDF)' : 'Comprovante (foto/PDF)'} />
        </div>

        <div className="flex justify-end gap-3 p-5 border-t border-slate-700 sticky bottom-0 bg-slate-900">
          <button onClick={onClose} className="px-4 py-2.5 rounded-lg border border-slate-600 text-slate-300 hover:bg-slate-800 text-sm">Cancelar</button>
          <button onClick={confirmar} disabled={salvando || !(q > 0)} className={`px-5 py-2.5 rounded-lg text-white font-semibold text-sm flex items-center gap-2 disabled:opacity-60 ${ehEntrada ? 'bg-emerald-600 hover:bg-emerald-700' : 'bg-red-600 hover:bg-red-700'}`}>
            {salvando ? <Loader2 className="w-4 h-4 animate-spin" /> : <Icon className="w-4 h-4" />}
            {salvando ? 'Registrando…' : `Registrar ${ehEntrada ? 'entrada' : 'saída'}`}
          </button>
        </div>
      </div>
    </div>
  );
}

const inp = 'w-full bg-slate-800 border border-slate-700 rounded-lg px-3 py-2.5 text-sm text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-orange-500/50';
function L({ label, children }) {
  return <div><label className="block text-xs font-medium text-slate-400 mb-1.5">{label}</label>{children}</div>;
}
