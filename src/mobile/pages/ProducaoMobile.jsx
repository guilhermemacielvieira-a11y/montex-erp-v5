// ============================================================
// PRODUÇÃO MOBILE - Kanban resumido por obra/etapa
// ============================================================
import React, { useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import { Search, Factory, Scissors, Wrench, PaintBucket, PackageCheck, Truck, ChevronRight } from 'lucide-react';
import MobileLayout from '../MobileLayout';
import { useERP } from '@/contexts/ERPContext';
import { useObraFiltro } from '../ObraContext';

const ETAPAS = [
  { key: 'aguardando', label: 'Aguardando', icon: Factory, color: 'slate' },
  { key: 'fabricacao', label: 'Fabricação', icon: Wrench, color: 'blue' },
  { key: 'solda', label: 'Solda', icon: Wrench, color: 'amber' },
  { key: 'pintura', label: 'Pintura', icon: PaintBucket, color: 'purple' },
  { key: 'expedido', label: 'Expedido', icon: PackageCheck, color: 'emerald' },
  { key: 'enviado', label: 'Enviado', icon: Truck, color: 'green' },
];

const C_BG = { slate: 'bg-slate-700/30 border-slate-600', blue: 'bg-blue-500/15 border-blue-500/30', amber: 'bg-amber-500/15 border-amber-500/30', purple: 'bg-violet-500/15 border-violet-500/30', emerald: 'bg-emerald-500/15 border-emerald-500/30', green: 'bg-green-500/15 border-green-500/30' };
const C_TXT = { slate: 'text-slate-300', blue: 'text-blue-300', amber: 'text-amber-300', purple: 'text-violet-300', emerald: 'text-emerald-300', green: 'text-green-300' };

export default function ProducaoMobile() {
  const erp = useERP?.() || {};
  const { pecas = [] } = erp;
  const { matchObra } = useObraFiltro();
  const [q, setQ] = useState('');

  const pecasFiltradas = useMemo(() => {
    let lst = pecas.filter(matchObra);
    if (q.trim()) {
      const qq = q.toUpperCase();
      lst = lst.filter(p => (p.marca || '').toUpperCase().includes(qq) || (p.id || '').toString().toUpperCase().includes(qq));
    }
    return lst;
  }, [pecas, matchObra, q]);

  const porEtapa = useMemo(() => {
    const m = {};
    for (const e of ETAPAS) m[e.key] = { conjuntos: 0, unidades: 0, peso: 0 };
    for (const p of pecasFiltradas) {
      const e = (p.etapa || 'aguardando').toLowerCase();
      if (!m[e]) continue;
      m[e].conjuntos += 1;
      m[e].unidades += Number(p.quantidade) || 1;
      m[e].peso += (Number(p.peso) || 0) * (Number(p.quantidade) || 1);
    }
    return m;
  }, [pecasFiltradas]);

  const totalConjuntos = pecasFiltradas.length;

  return (
    <MobileLayout title="Produção" obraFilter>
      {/* Busca */}
      <div className="sticky top-0 z-10 bg-slate-950/95 backdrop-blur-md border-b border-slate-800 px-4 py-3">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500" />
          <input
            type="text" value={q} onChange={e => setQ(e.target.value)}
            placeholder="Buscar marca ou ID..."
            className="w-full bg-slate-900 border border-slate-800 rounded-xl pl-10 pr-3 py-2.5 text-sm placeholder:text-slate-500 focus:outline-none focus:border-amber-500/50"
          />
        </div>
      </div>

      {/* Resumo */}
      <div className="px-4 pt-3 pb-2">
        <div className="text-[11px] text-slate-500 uppercase tracking-wider font-semibold">
          {totalConjuntos.toLocaleString('pt-BR')} conjuntos · {Object.values(porEtapa).reduce((s, v) => s + v.unidades, 0).toLocaleString('pt-BR')} unidades
        </div>
      </div>

      {/* Cards por etapa */}
      <div className="px-4 space-y-2">
        {ETAPAS.map(e => {
          const Icon = e.icon;
          const d = porEtapa[e.key] || { conjuntos: 0, unidades: 0, peso: 0 };
          const pct = totalConjuntos ? Math.round((d.conjuntos / totalConjuntos) * 100) : 0;
          return (
            <motion.div
              key={e.key}
              initial={{ opacity: 0, x: -10 }} animate={{ opacity: 1, x: 0 }}
              className={`relative rounded-2xl border ${C_BG[e.color]} overflow-hidden`}
            >
              <div className="p-3 flex items-center gap-3">
                <div className={`w-11 h-11 rounded-xl ${C_BG[e.color]} border-2 flex items-center justify-center`}>
                  <Icon className={`w-5 h-5 ${C_TXT[e.color]}`} />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="text-sm font-bold">{e.label}</div>
                  <div className="text-[11px] text-slate-400">
                    {d.conjuntos} conjuntos · {d.unidades} un · {(d.peso / 1000).toFixed(1)} t
                  </div>
                </div>
                <div className="text-right">
                  <div className={`text-2xl font-black ${C_TXT[e.color]}`}>{pct}%</div>
                </div>
              </div>
              {/* Barra */}
              <div className="h-1 bg-slate-800">
                <div className={`h-full ${C_TXT[e.color].replace('text-', 'bg-')}`} style={{ width: pct + '%' }} />
              </div>
            </motion.div>
          );
        })}
      </div>

      {/* Link para kanban completo */}
      <div className="px-4 mt-4">
        <Link to="/m/kanban" className="flex items-center justify-between p-4 bg-slate-900 border border-slate-800 rounded-2xl active:scale-[.99] transition">
          <div>
            <div className="text-sm font-semibold">Ver Kanban completo</div>
            <div className="text-[11px] text-slate-400">Cards detalhados por etapa</div>
          </div>
          <ChevronRight className="w-5 h-5 text-amber-400" />
        </Link>
      </div>
    </MobileLayout>
  );
}
