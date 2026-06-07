// ============================================================
// MEDIÇÃO MOBILE - Lançar medição com cálculo + foto + Face ID
// ============================================================
// Lança medição de produção: valorTotal = peso(kg) × valor/kg.
// O valor/kg é pré-preenchido pelo contrato da obra (valorContrato/pesoTotal),
// editável. Foto de evidência opcional (Supabase Storage, best-effort).
// Confirmação por Face ID (degradando no web). Persiste via addMedicao.
// ============================================================
import React, { useMemo, useState } from 'react';
import { toast } from 'react-hot-toast';
import {
  Ruler, Plus, Camera, Loader2, CheckCircle2, Building2, X,
} from 'lucide-react';
import MobileLayout from '../MobileLayout';
import Sheet from '../ui/Sheet';
import { tap, success } from '../ui/haptics';
import { confirmarBiometria } from '../ui/biometric';
import { useERP, useMedicoes } from '@/contexts/ERPContext';
import { useObraFiltro } from '../ObraContext';
import { supabase } from '@/api/supabaseClient';

const fmtMoney = (n) => 'R$ ' + (Number(n) || 0).toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
const fmtKg = (n) => (Number(n) || 0).toLocaleString('pt-BR', { maximumFractionDigits: 0 }) + ' kg';

const STATUS = {
  pendente: 'bg-amber-500/15 text-amber-300 border-amber-500/30',
  aprovada: 'bg-blue-500/15 text-blue-300 border-blue-500/30',
  pago: 'bg-emerald-500/15 text-emerald-300 border-emerald-500/30',
};

// Upload best-effort para o bucket 'uploads' (mesmo do base44Client). Não bloqueia.
async function uploadFoto(file) {
  try {
    const fileName = `medicoes/${Date.now()}_${(file.name || 'foto.jpg').replace(/\s+/g, '_')}`;
    const { error } = await supabase.storage.from('uploads').upload(fileName, file);
    if (error) return null;
    const { data } = supabase.storage.from('uploads').getPublicUrl(fileName);
    return data?.publicUrl || null;
  } catch { return null; }
}

export default function MedicaoMobile() {
  const { obras = [] } = useERP?.() || {};
  const { medicoes = [], addMedicao } = useMedicoes?.() || {};
  const { matchObra, obraSelecionada, isTodas } = useObraFiltro();

  const [formOpen, setFormOpen] = useState(false);
  const [obraId, setObraId] = useState(obraSelecionada?.id || '');
  const [peso, setPeso] = useState('');
  const [valorKg, setValorKg] = useState('');
  const [responsavel, setResponsavel] = useState('');
  const [obs, setObs] = useState('');
  const [foto, setFoto] = useState(null); // { file, url(preview) }
  const [saving, setSaving] = useState(false);

  const lista = useMemo(
    () => medicoes.filter(matchObra).slice().sort((a, b) => String(b.dataMedicao || b.data || '').localeCompare(String(a.dataMedicao || a.data || ''))).slice(0, 50),
    [medicoes, matchObra]
  );

  const obrasOrdenadas = useMemo(() => [...obras].sort((a, b) => (a.nome || '').localeCompare(b.nome || '')), [obras]);

  // Pré-preenche valor/kg pelo contrato da obra escolhida
  const aplicarObra = (id) => {
    setObraId(id);
    const o = obras.find(x => x.id === id);
    const peso0 = Number(o?.pesoTotal || o?.contratoPesoTotal) || 0;
    const valor0 = Number(o?.valorContrato || o?.contratoValorTotal) || 0;
    if (peso0 > 0 && valor0 > 0) setValorKg((valor0 / peso0).toFixed(2));
  };

  const abrirForm = () => {
    tap('light');
    const oid = !isTodas ? (obraSelecionada?.id || '') : '';
    setObraId(oid); setPeso(''); setValorKg(''); setResponsavel(''); setObs(''); setFoto(null);
    if (oid) aplicarObra(oid);
    setFormOpen(true);
  };

  const valorTotal = (parseFloat(peso) || 0) * (parseFloat(valorKg) || 0);

  const escolherFoto = (e) => {
    const file = e.target.files?.[0];
    if (file) setFoto({ file, url: URL.createObjectURL(file) });
  };

  const registrar = async () => {
    if (!obraId) { toast.error('Selecione a obra'); return; }
    if (!(parseFloat(peso) > 0)) { toast.error('Informe o peso medido'); return; }
    const ok = await confirmarBiometria('Confirmar lançamento de medição');
    if (!ok) { toast.error('Autenticação não confirmada'); return; }

    setSaving(true);
    try {
      let fotoUrl = null;
      if (foto?.file) {
        fotoUrl = await uploadFoto(foto.file);
        if (!fotoUrl) toast('Foto não enviada (segue sem evidência)', { icon: '⚠️' });
      }
      const obraObj = obras.find(o => o.id === obraId);
      const nMed = medicoes.filter(m => (m.obraId || m.obra_id) === obraId).length + 1;
      const hoje = new Date().toISOString().slice(0, 10);
      const medicao = {
        id: `med-${Date.now()}`,
        numero: `MED-${String(nMed).padStart(3, '0')}`,
        tipo: 'producao',
        obraId,
        obra: obraObj?.nome || 'Obra',
        descricao: `Medição ${obraObj?.nome || ''}`.trim(),
        pesoMedido: parseFloat(peso),
        valorTotal,
        valor: valorTotal, // compat. display local (FinanceiroMobile lê r.valor)
        valorBruto: valorTotal,
        status: 'pendente',
        responsavel: responsavel || null,
        observacoes: obs || null,
        dataMedicao: hoje,
        detalhamento: { valorKg: parseFloat(valorKg) || null, fotoUrl },
      };
      await addMedicao?.(medicao);
      await success();
      toast.success(`Medição ${medicao.numero} lançada · ${fmtMoney(valorTotal)}`);
      setFormOpen(false);
    } catch (err) {
      toast.error('Falha ao lançar medição');
      console.error('[MedicaoMobile] addMedicao falhou:', err);
    } finally {
      setSaving(false);
    }
  };

  return (
    <MobileLayout title="Medição" obraFilter>
      <div className="px-4 pt-3 pb-2">
        <div className="text-[11px] text-slate-400 uppercase tracking-wider font-semibold">{lista.length} medição(ões)</div>
      </div>

      {/* Lista */}
      <div className="px-4 space-y-2">
        {lista.length === 0 && (
          <div className="text-center py-12 text-slate-400">
            <Ruler className="w-10 h-10 mx-auto mb-2 opacity-40" />
            <div className="text-sm">Nenhuma medição{!isTodas ? ' para esta obra' : ''}</div>
          </div>
        )}
        {lista.map(m => {
          const st = String(m.status || 'pendente').toLowerCase();
          return (
            <div key={m.id} className="rounded-2xl border border-slate-800 bg-slate-900 p-3.5 flex items-center gap-3">
              <div className="w-11 h-11 rounded-xl bg-slate-800 flex items-center justify-center"><Ruler className="w-5 h-5 text-amber-400" /></div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2">
                  <span className="font-bold text-sm truncate">{m.numero || m.descricao || m.id}</span>
                  <span className={`text-[9px] font-bold px-2 py-0.5 rounded-full border ${STATUS[st] || STATUS.pendente}`}>{st}</span>
                </div>
                <div className="text-[11px] text-slate-400 truncate mt-0.5">
                  {m.pesoMedido ? fmtKg(m.pesoMedido) + ' · ' : ''}{m.dataMedicao || m.data || ''}
                </div>
              </div>
              <div className="text-sm font-black text-emerald-300">{fmtMoney(m.valorTotal || m.valor)}</div>
            </div>
          );
        })}
      </div>

      {/* FAB Nova medição */}
      <button
        onClick={abrirForm}
        className="fixed right-4 z-30 flex items-center gap-2 px-5 py-3.5 rounded-full bg-amber-500 text-slate-950 font-black text-sm shadow-lg shadow-amber-500/30 active:scale-95 transition"
        style={{ bottom: 'calc(env(safe-area-inset-bottom) + 80px)' }}
      >
        <Plus className="w-5 h-5" /> Nova medição
      </button>

      {/* Form */}
      <Sheet
        open={formOpen}
        onClose={() => !saving && setFormOpen(false)}
        title="Nova medição"
        footer={
          <button
            onClick={registrar}
            disabled={saving}
            className="w-full flex items-center justify-center gap-2 py-3.5 rounded-2xl bg-emerald-500 text-slate-950 font-black text-sm active:scale-[.99] transition disabled:opacity-60"
          >
            {saving ? <Loader2 className="w-5 h-5 animate-spin" /> : <CheckCircle2 className="w-5 h-5" />}
            {saving ? 'Lançando…' : `Lançar medição · ${fmtMoney(valorTotal)}`}
          </button>
        }
      >
        <div className="space-y-4">
          {/* Obra */}
          <div>
            <Label>Obra</Label>
            <div className="relative">
              <Building2 className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 pointer-events-none" />
              <select
                value={obraId} onChange={e => aplicarObra(e.target.value)}
                className="w-full bg-slate-800 border border-slate-700 rounded-xl pl-10 pr-3 py-3 text-sm focus:outline-none focus:border-amber-500/50"
              >
                <option value="">Selecione a obra…</option>
                {obrasOrdenadas.map(o => <option key={o.id} value={o.id}>{o.nome || o.codigo || o.id}</option>)}
              </select>
            </div>
          </div>

          {/* Peso + Valor/kg */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label>Peso medido (kg)</Label>
              <input type="number" inputMode="decimal" value={peso} onChange={e => setPeso(e.target.value)} placeholder="0"
                className="w-full bg-slate-800 border border-slate-700 rounded-xl px-3 py-3 text-sm font-bold focus:outline-none focus:border-amber-500/50" />
            </div>
            <div>
              <Label>Valor / kg (R$)</Label>
              <input type="number" inputMode="decimal" value={valorKg} onChange={e => setValorKg(e.target.value)} placeholder="0,00"
                className="w-full bg-slate-800 border border-slate-700 rounded-xl px-3 py-3 text-sm font-bold focus:outline-none focus:border-amber-500/50" />
            </div>
          </div>

          {/* Valor total calculado */}
          <div className="rounded-xl bg-emerald-500/10 border border-emerald-500/30 px-3 py-3 flex items-center justify-between">
            <span className="text-[11px] uppercase tracking-wider text-emerald-400/80 font-semibold">Valor total</span>
            <span className="text-xl font-black text-emerald-300">{fmtMoney(valorTotal)}</span>
          </div>

          {/* Responsável */}
          <div>
            <Label>Responsável (opcional)</Label>
            <input value={responsavel} onChange={e => setResponsavel(e.target.value)} placeholder="Nome"
              className="w-full bg-slate-800 border border-slate-700 rounded-xl px-3 py-3 text-sm focus:outline-none focus:border-amber-500/50" />
          </div>

          {/* Observações */}
          <div>
            <Label>Observações (opcional)</Label>
            <textarea value={obs} onChange={e => setObs(e.target.value)} rows={2} placeholder="Notas da medição"
              className="w-full bg-slate-800 border border-slate-700 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:border-amber-500/50 resize-none" />
          </div>

          {/* Foto de evidência */}
          <div>
            <Label>Evidência fotográfica (opcional)</Label>
            {foto ? (
              <div className="relative rounded-xl overflow-hidden border border-slate-700">
                <img src={foto.url} alt="evidência" className="w-full h-40 object-cover" />
                <button onClick={() => setFoto(null)} aria-label="Remover foto" className="absolute top-2 right-2 w-10 h-10 flex items-center justify-center rounded-lg bg-black/60 active:bg-black/80">
                  <X className="w-5 h-5 text-white" />
                </button>
              </div>
            ) : (
              <label className="flex items-center justify-center gap-2 py-3 rounded-xl bg-slate-800 border border-dashed border-slate-600 text-sm text-slate-300 active:bg-slate-700 cursor-pointer">
                <Camera className="w-5 h-5 text-amber-400" /> Tirar foto / anexar
                <input type="file" accept="image/*" capture="environment" onChange={escolherFoto} className="hidden" />
              </label>
            )}
          </div>
        </div>
      </Sheet>
    </MobileLayout>
  );
}

function Label({ children }) {
  return <div className="text-[11px] uppercase tracking-wider text-slate-400 font-semibold mb-1.5">{children}</div>;
}
