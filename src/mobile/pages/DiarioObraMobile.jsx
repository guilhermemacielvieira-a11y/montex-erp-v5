// ============================================================
// DIÁRIO DE OBRA MOBILE — registro diário da montagem em campo
// ============================================================
// O encarregado registra, direto do canteiro, o que a equipe montou no
// dia: obra, turno, equipe/responsável, unidades e kg, observações e
// ATÉ 3 FOTOS. Persiste na tabela `diario_producao` (mesma do desktop,
// etapa='MONTAGEM'); as fotos sobem para o Storage (bucket 'uploads',
// pasta diario-obra) e as URLs são anexadas às observações com o
// prefixo 📷 — mesmo padrão consagrado dos romaneios (GaleriaMobile).
// Exige rede (upload de foto não tem fila offline) → ensureOnline.
// Turno respeita o CHECK do banco: 'Manhã' | 'Tarde' | 'Noite'.
// ============================================================
import React, { useEffect, useMemo, useState, useCallback } from 'react';
import { toast } from 'react-hot-toast';
import {
  ClipboardList, Plus, Loader2, CheckCircle2, Building2, Camera, X, Sun, SunMedium, Moon,
} from 'lucide-react';
import MobileLayout from '../MobileLayout';
import Sheet from '../ui/Sheet';
import EmptyState from '../ui/EmptyState';
import { tap, success } from '../ui/haptics';
import { ensureOnline } from '../ui/online';
import { uploadFoto } from '../ui/upload';
import { supabase, isSupabaseConfigured } from '@/api/supabaseClient';
import { useERP } from '@/contexts/ERPContext';
import { useObraFiltro } from '../ObraContext';

const hojeISO = () => new Date().toISOString().slice(0, 10);
const URL_RE = /https?:\/\/\S+/g;
const fmtKg = (n) => (Number(n) || 0).toLocaleString('pt-BR', { maximumFractionDigits: 0 }) + ' kg';
const TURNOS = [
  { v: 'Manhã', icon: Sun },
  { v: 'Tarde', icon: SunMedium },
  { v: 'Noite', icon: Moon },
];
const MAX_FOTOS = 3;

export default function DiarioObraMobile() {
  const { obras = [], equipes = [], funcionarios = [] } = useERP?.() || {};
  const { obraSelecionada, isTodas } = useObraFiltro();

  const [data, setData] = useState(hojeISO());
  const [registros, setRegistros] = useState([]);
  const [loading, setLoading] = useState(false);
  const [formOpen, setFormOpen] = useState(false);
  const [saving, setSaving] = useState(false);

  // ---- form ----
  const [obraNome, setObraNome] = useState('');
  const [turno, setTurno] = useState('Manhã');
  const [equipeId, setEquipeId] = useState('');
  const [funcId, setFuncId] = useState('');
  const [unidades, setUnidades] = useState('');
  const [kg, setKg] = useState('');
  const [obs, setObs] = useState('');
  const [fotos, setFotos] = useState([]); // [{ file, url }]

  const obrasOrdenadas = useMemo(() => [...obras].sort((a, b) => (a.nome || '').localeCompare(b.nome || '')), [obras]);

  // Registros de MONTAGEM do dia escolhido (filtra por obra quando houver filtro)
  const fetchRegistros = useCallback(async () => {
    if (!isSupabaseConfigured()) return;
    setLoading(true);
    try {
      let q = supabase.from('diario_producao').select('*').eq('data', data).eq('etapa', 'MONTAGEM');
      if (!isTodas && obraSelecionada?.nome) q = q.eq('obra', obraSelecionada.nome);
      const { data: rows, error } = await q.order('created_at', { ascending: false });
      if (error) throw error;
      setRegistros(rows || []);
    } catch (err) {
      console.error('[DiarioObra] fetch falhou:', err);
      toast.error('Erro ao carregar o diário');
      setRegistros([]);
    } finally {
      setLoading(false);
    }
  }, [data, isTodas, obraSelecionada]);

  useEffect(() => { fetchRegistros(); }, [fetchRegistros]);

  const abrirForm = () => {
    tap('light');
    setObraNome(!isTodas ? (obraSelecionada?.nome || '') : '');
    setTurno('Manhã'); setEquipeId(''); setFuncId(''); setUnidades(''); setKg(''); setObs(''); setFotos([]);
    setFormOpen(true);
  };

  const addFotos = (e) => {
    const files = Array.from(e.target.files || []);
    if (!files.length) return;
    setFotos(prev => [...prev, ...files.map(f => ({ file: f, url: URL.createObjectURL(f) }))].slice(0, MAX_FOTOS));
    e.target.value = ''; // permite re-selecionar o mesmo arquivo
  };

  const salvar = async () => {
    if (!obraNome) { toast.error('Selecione a obra'); return; }
    const un = parseInt(unidades) || 0;
    const peso = parseFloat(kg) || 0;
    if (un <= 0 && peso <= 0 && fotos.length === 0 && !obs.trim()) {
      toast.error('Registre ao menos unidades, kg, foto ou observação');
      return;
    }
    if (!ensureOnline('Sem conexão — o diário com fotos exige rede.')) return;

    setSaving(true);
    try {
      // 1) Fotos → Storage (best-effort: falha de uma não bloqueia o registro)
      const urls = [];
      for (const f of fotos) {
        const u = await uploadFoto(f.file, 'diario-obra');
        if (u) urls.push(u);
      }
      if (fotos.length && urls.length < fotos.length) {
        toast(`${fotos.length - urls.length} foto(s) não subiram (registro segue)`, { icon: '⚠️' });
      }

      // 2) Observações = texto + URLs com 📷 (padrão da Galeria/romaneios)
      const obsFinal = [obs.trim(), ...urls.map(u => `📷 ${u}`)].filter(Boolean).join('\n') || null;

      const equipe = equipes.find(e => e.id === equipeId);
      const func = funcionarios.find(f => f.id === funcId);
      const record = {
        id: `DIARIO-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
        data,
        etapa: 'MONTAGEM',
        obra: obraNome,
        equipe_id: equipeId || null,
        equipe_nome: equipe?.nome || null,
        funcionario_id: funcId || null,
        funcionario_nome: func?.nome || null,
        unidades_produzidas: un,
        kg_processados: peso,
        observacoes: obsFinal,
        turno,
      };
      const { error } = await supabase.from('diario_producao').upsert([record]);
      if (error) throw error;

      await success();
      toast.success('Diário registrado');
      setFormOpen(false);
      await fetchRegistros();
    } catch (err) {
      console.error('[DiarioObra] salvar falhou:', err);
      toast.error('Falha ao salvar o diário');
    } finally {
      setSaving(false);
    }
  };

  return (
    <MobileLayout title="Diário de Obra" back obraFilter>
      {/* Data */}
      <div className="px-4 pt-3 pb-2 flex items-center justify-between gap-3">
        <div className="text-[11px] text-slate-400 uppercase tracking-wider font-semibold">
          {loading ? 'Carregando…' : `${registros.length} registro(s) · Montagem`}
        </div>
        <input
          type="date" value={data} onChange={e => setData(e.target.value)}
          className="bg-slate-800 border border-slate-700 rounded-xl px-3 py-2 text-sm focus:outline-none focus:border-amber-500/50"
        />
      </div>

      {/* Lista do dia */}
      <div className="px-4 space-y-2">
        {!loading && registros.length === 0 && (
          <EmptyState icon={ClipboardList} title="Sem registros neste dia" subtitle="Toque em Registrar dia para criar o primeiro" />
        )}
        {registros.map(r => {
          const urls = String(r.observacoes || '').match(URL_RE) || [];
          const texto = String(r.observacoes || '').replace(URL_RE, '').replace(/📷/g, '').trim();
          return (
            <div key={r.id} className="rounded-2xl border border-slate-800 bg-slate-900 p-3.5">
              <div className="flex items-center gap-2">
                <span className="font-bold text-sm truncate flex-1">{r.obra || 'Obra'}</span>
                <span className="text-[10px] font-bold px-2 py-0.5 rounded-full border bg-amber-500/15 text-amber-300 border-amber-500/30">{r.turno || '—'}</span>
              </div>
              <div className="text-[11px] text-slate-400 mt-1">
                {(r.equipe_nome || r.funcionario_nome) ? `${r.equipe_nome || ''}${r.equipe_nome && r.funcionario_nome ? ' · ' : ''}${r.funcionario_nome || ''}` : 'Sem equipe vinculada'}
              </div>
              <div className="flex items-center gap-3 mt-2">
                <span className="text-sm font-black text-emerald-300">{r.unidades_produzidas || 0} un</span>
                <span className="text-sm font-black text-blue-300">{fmtKg(r.kg_processados)}</span>
              </div>
              {texto && <div className="text-[12px] text-slate-300 mt-2 whitespace-pre-line">{texto}</div>}
              {urls.length > 0 && (
                <div className="flex gap-2 mt-2">
                  {urls.map((u, i) => (
                    <a key={i} href={u} target="_blank" rel="noreferrer" className="block w-16 h-16 rounded-lg overflow-hidden border border-slate-700 active:scale-95 transition">
                      <img src={u} alt={`foto ${i + 1} do diário`} className="w-full h-full object-cover" loading="lazy" />
                    </a>
                  ))}
                </div>
              )}
            </div>
          );
        })}
      </div>

      {/* FAB */}
      <button
        onClick={abrirForm}
        className="fixed right-4 z-30 flex items-center gap-2 px-5 py-3.5 rounded-full bg-amber-500 text-slate-950 font-black text-sm shadow-lg shadow-amber-500/30 active:scale-95 transition"
        style={{ bottom: 'calc(env(safe-area-inset-bottom) + 80px)' }}
      >
        <Plus className="w-5 h-5" /> Registrar dia
      </button>

      {/* Form */}
      <Sheet
        open={formOpen}
        onClose={() => !saving && setFormOpen(false)}
        title="Registrar diário de obra"
        footer={
          <button
            onClick={salvar}
            disabled={saving}
            className="w-full flex items-center justify-center gap-2 py-3.5 rounded-2xl bg-emerald-500 text-slate-950 font-black text-sm active:scale-[.99] transition disabled:opacity-60"
          >
            {saving ? <Loader2 className="w-5 h-5 animate-spin" /> : <CheckCircle2 className="w-5 h-5" />}
            {saving ? 'Salvando…' : 'Salvar registro'}
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
                value={obraNome} onChange={e => setObraNome(e.target.value)}
                className="w-full bg-slate-800 border border-slate-700 rounded-xl pl-10 pr-3 py-3 text-sm focus:outline-none focus:border-amber-500/50"
              >
                <option value="">Selecione a obra…</option>
                {obrasOrdenadas.map(o => <option key={o.id} value={o.nome || o.id}>{o.nome || o.codigo || o.id}</option>)}
              </select>
            </div>
          </div>

          {/* Turno (CHECK do banco: Manhã/Tarde/Noite) */}
          <div>
            <Label>Turno</Label>
            <div className="grid grid-cols-3 gap-2">
              {TURNOS.map(t => {
                const Icon = t.icon;
                const sel = turno === t.v;
                return (
                  <button
                    key={t.v}
                    onClick={() => { setTurno(t.v); tap('light'); }}
                    className={`flex items-center justify-center gap-1.5 py-3 rounded-xl border text-sm font-bold transition active:scale-[.98] ${sel ? 'bg-amber-500/20 border-amber-500/60 text-amber-300' : 'bg-slate-800 border-slate-700 text-slate-300'}`}
                  >
                    <Icon className="w-4 h-4" /> {t.v}
                  </button>
                );
              })}
            </div>
          </div>

          {/* Equipe + Responsável */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label>Equipe (opcional)</Label>
              <select value={equipeId} onChange={e => setEquipeId(e.target.value)}
                className="w-full bg-slate-800 border border-slate-700 rounded-xl px-3 py-3 text-sm focus:outline-none focus:border-amber-500/50">
                <option value="">—</option>
                {equipes.map(eq => <option key={eq.id} value={eq.id}>{eq.nome || eq.id}</option>)}
              </select>
            </div>
            <div>
              <Label>Responsável (opcional)</Label>
              <select value={funcId} onChange={e => setFuncId(e.target.value)}
                className="w-full bg-slate-800 border border-slate-700 rounded-xl px-3 py-3 text-sm focus:outline-none focus:border-amber-500/50">
                <option value="">—</option>
                {funcionarios.map(f => <option key={f.id} value={f.id}>{f.nome || f.id}</option>)}
              </select>
            </div>
          </div>

          {/* Unidades + Kg */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label>Unidades montadas</Label>
              <input type="number" inputMode="numeric" value={unidades} onChange={e => setUnidades(e.target.value)} placeholder="0"
                className="w-full bg-slate-800 border border-slate-700 rounded-xl px-3 py-3 text-sm font-bold focus:outline-none focus:border-amber-500/50" />
            </div>
            <div>
              <Label>Kg montados</Label>
              <input type="number" inputMode="decimal" value={kg} onChange={e => setKg(e.target.value)} placeholder="0"
                className="w-full bg-slate-800 border border-slate-700 rounded-xl px-3 py-3 text-sm font-bold focus:outline-none focus:border-amber-500/50" />
            </div>
          </div>

          {/* Observações */}
          <div>
            <Label>Observações (opcional)</Label>
            <textarea value={obs} onChange={e => setObs(e.target.value)} rows={2} placeholder="Frentes de trabalho, intercorrências, clima…"
              className="w-full bg-slate-800 border border-slate-700 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:border-amber-500/50 resize-none" />
          </div>

          {/* Fotos (até 3) */}
          <div>
            <Label>Fotos do dia ({fotos.length}/{MAX_FOTOS})</Label>
            <div className="grid grid-cols-3 gap-2">
              {fotos.map((f, i) => (
                <div key={i} className="relative aspect-square rounded-xl overflow-hidden border border-slate-700">
                  <img src={f.url} alt={`foto ${i + 1}`} className="w-full h-full object-cover" />
                  <button
                    onClick={() => setFotos(prev => prev.filter((_, j) => j !== i))}
                    aria-label="Remover foto"
                    className="absolute top-1 right-1 w-8 h-8 flex items-center justify-center rounded-lg bg-black/60 active:bg-black/80"
                  ><X className="w-4 h-4 text-white" /></button>
                </div>
              ))}
              {fotos.length < MAX_FOTOS && (
                <label className="flex flex-col items-center justify-center gap-1 aspect-square rounded-xl bg-slate-800 border border-dashed border-slate-600 text-[11px] text-slate-300 active:bg-slate-700 cursor-pointer">
                  <Camera className="w-5 h-5 text-amber-400" /> Adicionar
                  <input type="file" accept="image/*" capture="environment" multiple onChange={addFotos} className="hidden" />
                </label>
              )}
            </div>
          </div>
        </div>
      </Sheet>
    </MobileLayout>
  );
}

function Label({ children }) {
  return <div className="text-[11px] uppercase tracking-wider text-slate-400 font-semibold mb-1.5">{children}</div>;
}
