// ============================================================
// MATERIAIS — Análise de compras por item de Nota Fiscal
// ============================================================
// Desmembrado do submódulo "Materiais" da ComprasPage (pedido do
// usuário): cada ITEM das NFs vira uma linha analisável, com visão
// de comprador sênior:
//   • KPIs (gasto, materiais distintos, NFs, fornecedores)
//   • Filtros: busca, categoria (classificador do nfPipeline),
//     fornecedor, obra e período
//   • Catálogo agregado por material: qtd, gasto, preço unit
//     mín/médio/máx/último, nº de compras e fornecedores
//   • Alertas: dispersão de preço, fornecedor único, último preço
//     acima da média (pagando mais caro)
//   • Gráficos: gasto por categoria, top fornecedores, evolução mensal
//   • Detalhe por material com histórico completo + export CSV
// Fonte única: notasFiscais (tabela notas_fiscais, itens JSONB) +
// helpers de src/services/nfPipeline.js — NADA é recalculado de
// forma divergente da ComprasPage.
// ============================================================

import React, { useMemo, useState } from 'react';
import { motion } from 'framer-motion';
import toast from 'react-hot-toast';
import {
  ResponsiveContainer, BarChart, Bar, XAxis, YAxis, Tooltip as RTooltip,
  Cell, LineChart, Line, CartesianGrid,
} from 'recharts';
import {
  Package, Search, Download, DollarSign, Layers, FileText, Factory,
  AlertTriangle, TrendingUp, TrendingDown, Eye, X, Filter, ShieldAlert,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@/components/ui/select';
import {
  Dialog, DialogContent, DialogHeader, DialogTitle,
} from '@/components/ui/dialog';
import { useERP } from '../contexts/ERPContext';
import {
  CATEGORIAS_DISPONIVEIS, classificarCategoria,
  itemQtd, itemValorUnit, itemValorTotal, itemUnidade,
} from '@/services/nfPipeline';

// ── Helpers ─────────────────────────────────────────────────
const fmtMoney = (v) => new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(Number(v) || 0);
const fmtMoneyShort = (v) => {
  const n = Number(v) || 0; const a = Math.abs(n);
  if (a >= 1e6) return `R$ ${(n / 1e6).toFixed(1).replace('.', ',')}M`;
  if (a >= 1e3) return `R$ ${Math.round(n / 1e3)}k`;
  return fmtMoney(n);
};
const fmtNum = (v) => new Intl.NumberFormat('pt-BR', { maximumFractionDigits: 2 }).format(Number(v) || 0);
const fmtData = (d) => (d ? new Date(String(d).slice(0, 10) + 'T12:00:00').toLocaleDateString('pt-BR') : '—');
const normalizar = (s) => String(s || '').toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/\s+/g, ' ').trim();

const CORES_CAT = ['#f59e0b', '#3b82f6', '#10b981', '#8b5cf6', '#ec4899', '#06b6d4', '#ef4444', '#64748b'];

// ── Card de KPI ─────────────────────────────────────────────
function KPI({ icon: Icon, label, value, sub, color = 'from-amber-500 to-orange-600' }) {
  return (
    <div className="bg-slate-900/60 backdrop-blur-xl rounded-xl border border-slate-700/50 p-4">
      <div className={cn('w-10 h-10 rounded-xl flex items-center justify-center bg-gradient-to-br', color)}>
        <Icon className="h-5 w-5 text-white" />
      </div>
      <p className="text-xs text-slate-400 mt-3">{label}</p>
      <p className="text-xl font-bold text-white mt-0.5">{value}</p>
      {sub && <p className="text-[11px] text-slate-500 mt-0.5">{sub}</p>}
    </div>
  );
}

// ── Página ──────────────────────────────────────────────────
export default function MateriaisPage() {
  const { notasFiscais = [], obras = [] } = useERP();

  // Filtros
  const [busca, setBusca] = useState('');
  const [fCategoria, setFCategoria] = useState('todas');
  const [fFornecedor, setFFornecedor] = useState('todos');
  const [fObra, setFObra] = useState('todas');
  const [fPeriodo, setFPeriodo] = useState('todos'); // todos | 30 | 90 | 180 | 365
  const [ordem, setOrdem] = useState('valor'); // valor | qtd | dispersao | recente
  const [materialSel, setMaterialSel] = useState(null);

  const nomeObra = useMemo(() => {
    const m = new Map();
    obras.forEach(o => m.set(o.id, o.nome || o.codigo || o.id));
    return m;
  }, [obras]);

  // 1 linha por ITEM de NF — base de toda a análise
  const itensFlat = useMemo(() => {
    const out = [];
    (notasFiscais || []).forEach(nf => {
      const itens = Array.isArray(nf.itens) ? nf.itens : [];
      const data = String(nf.dataEmissao || nf.dataEntrada || nf.createdAt || '').slice(0, 10);
      const fornecedor = String(nf.fornecedor || 'Não informado').trim();
      itens.forEach(item => {
        const descricao = String(item.descricao || '').trim();
        if (!descricao) return;
        out.push({
          descricao,
          chave: normalizar(descricao),
          categoria: classificarCategoria([item], nf.naturezaOp || nf.natureza_op || ''),
          fornecedor,
          data,
          nf: String(nf.numero || ''),
          obraId: nf.obraId ?? nf.obra_id ?? null,
          qtd: itemQtd(item),
          unidade: itemUnidade(item),
          valorUnit: itemValorUnit(item),
          valorTotal: itemValorTotal(item),
        });
      });
    });
    return out;
  }, [notasFiscais]);

  const fornecedores = useMemo(
    () => [...new Set(itensFlat.map(i => i.fornecedor))].sort((a, b) => a.localeCompare(b)),
    [itensFlat]
  );

  // Aplicar filtros
  const itensFiltrados = useMemo(() => {
    const t = normalizar(busca);
    const corte = fPeriodo === 'todos' ? null
      : new Date(Date.now() - Number(fPeriodo) * 864e5).toISOString().slice(0, 10);
    return itensFlat.filter(i =>
      (!t || i.chave.includes(t) || normalizar(i.fornecedor).includes(t) || i.nf.includes(t)) &&
      (fCategoria === 'todas' || i.categoria === fCategoria) &&
      (fFornecedor === 'todos' || i.fornecedor === fFornecedor) &&
      (fObra === 'todas' || String(i.obraId) === String(fObra)) &&
      (!corte || (i.data && i.data >= corte))
    );
  }, [itensFlat, busca, fCategoria, fFornecedor, fObra, fPeriodo]);

  // Catálogo agregado por material
  const catalogo = useMemo(() => {
    const m = new Map();
    itensFiltrados.forEach(i => {
      if (!m.has(i.chave)) {
        m.set(i.chave, {
          chave: i.chave, descricao: i.descricao, unidade: i.unidade,
          categoria: i.categoria, compras: 0, qtd: 0, valorTotal: 0,
          unitMin: Infinity, unitMax: 0, fornecedores: new Set(),
          ultimaData: '', unitUltimo: 0, entradas: [],
        });
      }
      const g = m.get(i.chave);
      g.compras += 1; g.qtd += i.qtd; g.valorTotal += i.valorTotal;
      g.fornecedores.add(i.fornecedor);
      g.entradas.push(i);
      if (i.valorUnit > 0) {
        g.unitMin = Math.min(g.unitMin, i.valorUnit);
        g.unitMax = Math.max(g.unitMax, i.valorUnit);
      }
      if (String(i.data) >= String(g.ultimaData)) {
        g.ultimaData = i.data; g.unitUltimo = i.valorUnit; g.descricao = i.descricao;
      }
    });
    const lista = [...m.values()].map(g => {
      if (g.unitMin === Infinity) g.unitMin = 0;
      // Preço médio PONDERADO por quantidade (visão de comprador)
      const unitMedio = g.qtd > 0 ? g.valorTotal / g.qtd : 0;
      const dispersaoPct = g.unitMin > 0 ? ((g.unitMax - g.unitMin) / g.unitMin) * 100 : 0;
      const vsMediaPct = unitMedio > 0 && g.unitUltimo > 0 ? ((g.unitUltimo - unitMedio) / unitMedio) * 100 : 0;
      g.entradas.sort((a, b) => String(b.data).localeCompare(String(a.data)));
      return { ...g, nFornecedores: g.fornecedores.size, unitMedio, dispersaoPct, vsMediaPct };
    });
    const sorters = {
      valor: (a, b) => b.valorTotal - a.valorTotal,
      qtd: (a, b) => b.qtd - a.qtd,
      dispersao: (a, b) => b.dispersaoPct - a.dispersaoPct,
      recente: (a, b) => String(b.ultimaData).localeCompare(String(a.ultimaData)),
    };
    return lista.sort(sorters[ordem] || sorters.valor);
  }, [itensFiltrados, ordem]);

  // KPIs do escopo filtrado
  const kpis = useMemo(() => {
    const valor = itensFiltrados.reduce((s, i) => s + i.valorTotal, 0);
    const nfs = new Set(itensFiltrados.map(i => i.nf)).size;
    const forn = new Set(itensFiltrados.map(i => i.fornecedor)).size;
    return {
      valor, nfs, forn,
      materiais: catalogo.length,
      itens: itensFiltrados.length,
      ticketNF: nfs ? valor / nfs : 0,
    };
  }, [itensFiltrados, catalogo]);

  // Alertas de comprador sênior
  const alertas = useMemo(() => {
    const dispersos = catalogo.filter(c => c.dispersaoPct > 20 && c.compras >= 2);
    const fornUnico = catalogo.filter(c => c.nFornecedores === 1 && c.valorTotal >= 1000 && c.compras >= 2);
    const pagandoMais = catalogo.filter(c => c.vsMediaPct > 10 && c.compras >= 2);
    return { dispersos, fornUnico, pagandoMais };
  }, [catalogo]);

  // Gasto por categoria
  const porCategoria = useMemo(() => {
    const m = new Map();
    itensFiltrados.forEach(i => m.set(i.categoria, (m.get(i.categoria) || 0) + i.valorTotal));
    return [...m.entries()].map(([name, valor]) => ({ name, valor: Math.round(valor) }))
      .sort((a, b) => b.valor - a.valor);
  }, [itensFiltrados]);

  // Top fornecedores + concentração
  const porFornecedor = useMemo(() => {
    const m = new Map();
    itensFiltrados.forEach(i => m.set(i.fornecedor, (m.get(i.fornecedor) || 0) + i.valorTotal));
    const total = [...m.values()].reduce((s, v) => s + v, 0) || 1;
    return [...m.entries()].map(([name, valor]) => ({
      name, valor: Math.round(valor), pct: (valor / total) * 100,
    })).sort((a, b) => b.valor - a.valor).slice(0, 8);
  }, [itensFiltrados]);

  // Evolução mensal (últimos 12 meses com dado)
  const porMes = useMemo(() => {
    const m = new Map();
    itensFiltrados.forEach(i => {
      const ym = String(i.data || '').slice(0, 7);
      if (!ym) return;
      m.set(ym, (m.get(ym) || 0) + i.valorTotal);
    });
    return [...m.entries()].sort((a, b) => a[0].localeCompare(b[0])).slice(-12)
      .map(([ym, valor]) => ({
        name: new Date(ym + '-15T12:00:00').toLocaleDateString('pt-BR', { month: 'short', year: '2-digit' }).replace('.', ''),
        valor: Math.round(valor),
      }));
  }, [itensFiltrados]);

  // Export CSV do catálogo filtrado
  const exportarCSV = () => {
    if (catalogo.length === 0) { toast.error('Nenhum material para exportar'); return; }
    const esc = (v) => `"${String(v ?? '').replace(/"/g, '""')}"`;
    const num = (v) => String(Number(v) || 0).replace('.', ',');
    const header = ['Material', 'Categoria', 'Unidade', 'Compras', 'Qtd Total', 'Valor Total (R$)',
      'Unit Mín', 'Unit Médio', 'Unit Máx', 'Último Unit', 'Última Compra', 'Fornecedores', 'Dispersão (%)'];
    const rows = catalogo.map(c => [
      esc(c.descricao), esc(c.categoria), esc(c.unidade), c.compras, num(c.qtd), num(c.valorTotal),
      num(c.unitMin), num(c.unitMedio), num(c.unitMax), num(c.unitUltimo),
      esc(fmtData(c.ultimaData)), c.nFornecedores, num(c.dispersaoPct),
    ].join(';'));
    const blob = new Blob(['\ufeff' + [header.join(';'), ...rows].join('\n')], { type: 'text/csv;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url; a.download = `materiais_${new Date().toISOString().slice(0, 10)}.csv`;
    document.body.appendChild(a); a.click(); document.body.removeChild(a);
    URL.revokeObjectURL(url);
    toast.success(`${catalogo.length} materiais exportados!`);
  };

  const limparFiltros = () => {
    setBusca(''); setFCategoria('todas'); setFFornecedor('todos'); setFObra('todas'); setFPeriodo('todos');
  };

  const temFiltro = busca || fCategoria !== 'todas' || fFornecedor !== 'todos' || fObra !== 'todas' || fPeriodo !== 'todos';

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-950 via-slate-900 to-slate-950 p-6">
      <div className="max-w-[1800px] mx-auto space-y-5">

        {/* Header */}
        <motion.div initial={{ opacity: 0, y: -16 }} animate={{ opacity: 1, y: 0 }}
          className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
          <div>
            <h1 className="text-3xl font-bold text-white flex items-center gap-3">
              <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-amber-500 to-orange-600 flex items-center justify-center">
                <Package className="h-6 w-6 text-white" />
              </div>
              Materiais
            </h1>
            <p className="text-slate-400 mt-1">Análise de compras item a item, direto das notas fiscais</p>
          </div>
          <Button variant="outline" className="border-slate-700 text-white" onClick={exportarCSV}>
            <Download className="h-4 w-4 mr-2" />
            Exportar CSV
          </Button>
        </motion.div>

        {/* KPIs */}
        <div className="grid grid-cols-2 md:grid-cols-3 xl:grid-cols-6 gap-3">
          <KPI icon={DollarSign} label="Gasto em materiais" value={fmtMoneyShort(kpis.valor)} sub={`${kpis.itens} itens comprados`} color="from-amber-500 to-orange-600" />
          <KPI icon={Package} label="Materiais distintos" value={kpis.materiais} color="from-blue-500 to-cyan-500" />
          <KPI icon={FileText} label="Notas fiscais" value={kpis.nfs} sub={`ticket ${fmtMoneyShort(kpis.ticketNF)}`} color="from-violet-500 to-purple-600" />
          <KPI icon={Factory} label="Fornecedores" value={kpis.forn} color="from-emerald-500 to-green-600" />
          <KPI icon={ShieldAlert} label="Dispersão > 20%" value={alertas.dispersos.length} sub="preços desiguais" color="from-red-500 to-rose-600" />
          <KPI icon={AlertTriangle} label="Fornecedor único" value={alertas.fornUnico.length} sub="risco de dependência" color="from-yellow-500 to-amber-600" />
        </div>

        {/* Filtros */}
        <div className="bg-slate-900/60 backdrop-blur-xl rounded-xl border border-slate-700/50 p-3 flex flex-wrap items-center gap-2">
          <div className="relative flex-1 min-w-[220px]">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
            <Input placeholder="Buscar material, fornecedor ou NF..." value={busca}
              onChange={(e) => setBusca(e.target.value)}
              className="pl-9 bg-slate-800/60 border-slate-700 text-white" />
          </div>
          <Select value={fCategoria} onValueChange={setFCategoria}>
            <SelectTrigger className="w-[170px] bg-slate-800/60 border-slate-700 text-white">
              <SelectValue placeholder="Categoria" />
            </SelectTrigger>
            <SelectContent className="bg-slate-800 border-slate-700">
              <SelectItem value="todas" className="text-white">Todas categorias</SelectItem>
              {CATEGORIAS_DISPONIVEIS.map(c => (
                <SelectItem key={c} value={c} className="text-white">{c}</SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Select value={fFornecedor} onValueChange={setFFornecedor}>
            <SelectTrigger className="w-[190px] bg-slate-800/60 border-slate-700 text-white">
              <SelectValue placeholder="Fornecedor" />
            </SelectTrigger>
            <SelectContent className="bg-slate-800 border-slate-700 max-h-72">
              <SelectItem value="todos" className="text-white">Todos fornecedores</SelectItem>
              {fornecedores.map(f => (
                <SelectItem key={f} value={f} className="text-white">{f}</SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Select value={fObra} onValueChange={setFObra}>
            <SelectTrigger className="w-[170px] bg-slate-800/60 border-slate-700 text-white">
              <SelectValue placeholder="Obra" />
            </SelectTrigger>
            <SelectContent className="bg-slate-800 border-slate-700 max-h-72">
              <SelectItem value="todas" className="text-white">Todas as obras</SelectItem>
              {obras.map(o => (
                <SelectItem key={o.id} value={String(o.id)} className="text-white">{o.nome || o.codigo || o.id}</SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Select value={fPeriodo} onValueChange={setFPeriodo}>
            <SelectTrigger className="w-[150px] bg-slate-800/60 border-slate-700 text-white">
              <SelectValue placeholder="Período" />
            </SelectTrigger>
            <SelectContent className="bg-slate-800 border-slate-700">
              <SelectItem value="todos" className="text-white">Todo período</SelectItem>
              <SelectItem value="30" className="text-white">Últimos 30 dias</SelectItem>
              <SelectItem value="90" className="text-white">Últimos 90 dias</SelectItem>
              <SelectItem value="180" className="text-white">Últimos 6 meses</SelectItem>
              <SelectItem value="365" className="text-white">Últimos 12 meses</SelectItem>
            </SelectContent>
          </Select>
          {temFiltro && (
            <Button variant="ghost" size="sm" className="text-slate-400" onClick={limparFiltros}>
              <X className="h-4 w-4 mr-1" /> Limpar
            </Button>
          )}
        </div>

        {/* Alertas de comprador */}
        {(alertas.dispersos.length > 0 || alertas.pagandoMais.length > 0) && (
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-3">
            {alertas.dispersos.length > 0 && (
              <div className="bg-red-500/10 border border-red-500/30 rounded-xl p-4">
                <p className="text-sm font-bold text-red-300 flex items-center gap-2 mb-2">
                  <ShieldAlert className="h-4 w-4" /> Preços desiguais para o mesmo material
                </p>
                <div className="space-y-1.5">
                  {alertas.dispersos.slice(0, 4).map(c => (
                    <button key={c.chave} onClick={() => setMaterialSel(c)}
                      className="w-full text-left text-xs text-slate-300 hover:text-white flex items-center justify-between gap-2">
                      <span className="truncate">{c.descricao}</span>
                      <span className="text-red-300 font-bold whitespace-nowrap">
                        {fmtMoney(c.unitMin)} → {fmtMoney(c.unitMax)} (+{c.dispersaoPct.toFixed(0)}%)
                      </span>
                    </button>
                  ))}
                </div>
              </div>
            )}
            {alertas.pagandoMais.length > 0 && (
              <div className="bg-amber-500/10 border border-amber-500/30 rounded-xl p-4">
                <p className="text-sm font-bold text-amber-300 flex items-center gap-2 mb-2">
                  <TrendingUp className="h-4 w-4" /> Última compra acima da média histórica
                </p>
                <div className="space-y-1.5">
                  {alertas.pagandoMais.slice(0, 4).map(c => (
                    <button key={c.chave} onClick={() => setMaterialSel(c)}
                      className="w-full text-left text-xs text-slate-300 hover:text-white flex items-center justify-between gap-2">
                      <span className="truncate">{c.descricao}</span>
                      <span className="text-amber-300 font-bold whitespace-nowrap">
                        {fmtMoney(c.unitUltimo)} (+{c.vsMediaPct.toFixed(0)}% vs média)
                      </span>
                    </button>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}

        {/* Gráficos */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-3">
          <div className="bg-slate-900/60 rounded-xl border border-slate-700/50 p-4">
            <p className="text-sm font-semibold text-white mb-3 flex items-center gap-2"><Layers className="h-4 w-4 text-amber-400" /> Gasto por categoria</p>
            <ResponsiveContainer width="100%" height={210}>
              <BarChart data={porCategoria} layout="vertical" margin={{ left: 8, right: 8 }}>
                <XAxis type="number" hide />
                <YAxis type="category" dataKey="name" width={110} tick={{ fill: '#94a3b8', fontSize: 11 }} />
                <RTooltip formatter={(v) => fmtMoney(v)} contentStyle={{ background: '#0f172a', border: '1px solid #334155', borderRadius: 8 }} labelStyle={{ color: '#e2e8f0' }} />
                <Bar dataKey="valor" radius={[0, 6, 6, 0]}>
                  {porCategoria.map((_, i) => <Cell key={i} fill={CORES_CAT[i % CORES_CAT.length]} />)}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
          <div className="bg-slate-900/60 rounded-xl border border-slate-700/50 p-4">
            <p className="text-sm font-semibold text-white mb-3 flex items-center gap-2"><Factory className="h-4 w-4 text-emerald-400" /> Top fornecedores (concentração)</p>
            <div className="space-y-2 max-h-[210px] overflow-y-auto pr-1">
              {porFornecedor.map((f, i) => (
                <div key={f.name}>
                  <div className="flex items-center justify-between text-xs mb-0.5">
                    <span className="text-slate-300 truncate mr-2">{i + 1}. {f.name}</span>
                    <span className="text-white font-semibold whitespace-nowrap">{fmtMoneyShort(f.valor)} · {f.pct.toFixed(0)}%</span>
                  </div>
                  <div className="h-1.5 bg-slate-800 rounded-full overflow-hidden">
                    <div className="h-full bg-emerald-500 rounded-full" style={{ width: `${Math.min(100, f.pct)}%` }} />
                  </div>
                </div>
              ))}
              {porFornecedor.length === 0 && <p className="text-xs text-slate-500">Sem dados no filtro atual.</p>}
            </div>
          </div>
          <div className="bg-slate-900/60 rounded-xl border border-slate-700/50 p-4">
            <p className="text-sm font-semibold text-white mb-3 flex items-center gap-2"><TrendingUp className="h-4 w-4 text-blue-400" /> Evolução mensal do gasto</p>
            <ResponsiveContainer width="100%" height={210}>
              <BarChart data={porMes}>
                <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" vertical={false} />
                <XAxis dataKey="name" tick={{ fill: '#94a3b8', fontSize: 11 }} />
                <YAxis tickFormatter={(v) => fmtMoneyShort(v)} tick={{ fill: '#94a3b8', fontSize: 10 }} width={52} />
                <RTooltip formatter={(v) => fmtMoney(v)} contentStyle={{ background: '#0f172a', border: '1px solid #334155', borderRadius: 8 }} labelStyle={{ color: '#e2e8f0' }} />
                <Bar dataKey="valor" fill="#3b82f6" radius={[6, 6, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Catálogo */}
        <div className="bg-slate-900/60 backdrop-blur-xl rounded-xl border border-slate-700/50 overflow-hidden">
          <div className="flex flex-wrap items-center justify-between gap-2 p-4 border-b border-slate-700/50">
            <p className="text-sm font-semibold text-white flex items-center gap-2">
              <Filter className="h-4 w-4 text-amber-400" /> Catálogo de materiais
              <span className="text-slate-500 font-normal">({catalogo.length})</span>
            </p>
            <Select value={ordem} onValueChange={setOrdem}>
              <SelectTrigger className="w-[200px] bg-slate-800/60 border-slate-700 text-white h-8 text-xs">
                <SelectValue />
              </SelectTrigger>
              <SelectContent className="bg-slate-800 border-slate-700">
                <SelectItem value="valor" className="text-white">Maior gasto</SelectItem>
                <SelectItem value="qtd" className="text-white">Maior quantidade</SelectItem>
                <SelectItem value="dispersao" className="text-white">Maior dispersão de preço</SelectItem>
                <SelectItem value="recente" className="text-white">Compra mais recente</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-slate-700/50 text-xs text-slate-400">
                  <th className="text-left p-3 font-medium">Material</th>
                  <th className="text-left p-3 font-medium">Categoria</th>
                  <th className="text-right p-3 font-medium">Qtd</th>
                  <th className="text-right p-3 font-medium">Gasto</th>
                  <th className="text-right p-3 font-medium">Unit médio</th>
                  <th className="text-right p-3 font-medium">Mín / Máx</th>
                  <th className="text-center p-3 font-medium">Compras</th>
                  <th className="text-center p-3 font-medium">Fornec.</th>
                  <th className="text-center p-3 font-medium">Última</th>
                  <th className="text-center p-3 font-medium"></th>
                </tr>
              </thead>
              <tbody>
                {catalogo.slice(0, 100).map(c => (
                  <tr key={c.chave} className="border-b border-slate-800/60 hover:bg-slate-800/40 cursor-pointer"
                    onClick={() => setMaterialSel(c)}>
                    <td className="p-3">
                      <p className="text-sm text-white font-medium truncate max-w-[320px]">{c.descricao}</p>
                      <p className="text-[11px] text-slate-500">{c.unidade}</p>
                    </td>
                    <td className="p-3">
                      <Badge className="text-[10px] border-0 bg-slate-700/60 text-slate-300">{c.categoria}</Badge>
                    </td>
                    <td className="p-3 text-right text-sm text-slate-300">{fmtNum(c.qtd)}</td>
                    <td className="p-3 text-right text-sm font-semibold text-white">{fmtMoney(c.valorTotal)}</td>
                    <td className="p-3 text-right text-sm text-slate-300">{fmtMoney(c.unitMedio)}</td>
                    <td className="p-3 text-right text-xs">
                      <span className="text-emerald-400">{fmtMoney(c.unitMin)}</span>
                      <span className="text-slate-500"> / </span>
                      <span className={c.dispersaoPct > 20 ? 'text-red-400 font-bold' : 'text-slate-300'}>{fmtMoney(c.unitMax)}</span>
                      {c.dispersaoPct > 20 && (
                        <span className="ml-1 text-[10px] text-red-400 font-bold">+{c.dispersaoPct.toFixed(0)}%</span>
                      )}
                    </td>
                    <td className="p-3 text-center text-sm text-slate-300">{c.compras}</td>
                    <td className="p-3 text-center">
                      <span className={cn('text-sm', c.nFornecedores === 1 ? 'text-amber-400 font-bold' : 'text-slate-300')}>{c.nFornecedores}</span>
                    </td>
                    <td className="p-3 text-center text-xs text-slate-400">{fmtData(c.ultimaData)}</td>
                    <td className="p-3 text-center">
                      <Eye className="h-4 w-4 text-slate-500" />
                    </td>
                  </tr>
                ))}
                {catalogo.length === 0 && (
                  <tr><td colSpan={10} className="p-10 text-center text-slate-500">
                    <Package className="h-10 w-10 mx-auto mb-2 opacity-40" />
                    Nenhum material encontrado{temFiltro ? ' com os filtros atuais' : ' — importe notas fiscais em Compras'}.
                  </td></tr>
                )}
              </tbody>
            </table>
          </div>
          {catalogo.length > 100 && (
            <p className="p-3 text-center text-xs text-slate-500 border-t border-slate-800">
              Mostrando os 100 primeiros de {catalogo.length} — refine os filtros ou exporte o CSV completo.
            </p>
          )}
        </div>

        {/* Detalhe do material */}
        <Dialog open={!!materialSel} onOpenChange={() => setMaterialSel(null)}>
          <DialogContent className="max-w-3xl bg-slate-900 border-slate-700 max-h-[88vh] overflow-y-auto">
            {materialSel && (
              <>
                <DialogHeader>
                  <DialogTitle className="text-white pr-8">{materialSel.descricao}</DialogTitle>
                </DialogHeader>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-2 text-center">
                  {[
                    ['Gasto total', fmtMoney(materialSel.valorTotal)],
                    ['Qtd total', `${fmtNum(materialSel.qtd)} ${materialSel.unidade}`],
                    ['Unit médio', fmtMoney(materialSel.unitMedio)],
                    ['Mín / Máx', `${fmtMoney(materialSel.unitMin)} / ${fmtMoney(materialSel.unitMax)}`],
                  ].map(([l, v]) => (
                    <div key={l} className="bg-slate-800/60 rounded-lg p-2.5">
                      <p className="text-[10px] text-slate-400">{l}</p>
                      <p className="text-sm font-bold text-white mt-0.5">{v}</p>
                    </div>
                  ))}
                </div>
                {materialSel.entradas.length >= 2 && (
                  <div className="bg-slate-800/40 rounded-lg p-3">
                    <p className="text-xs text-slate-400 mb-2">Preço unitário ao longo das compras</p>
                    <ResponsiveContainer width="100%" height={140}>
                      <LineChart data={[...materialSel.entradas].reverse().map(e => ({ name: fmtData(e.data), unit: e.valorUnit }))}>
                        <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" vertical={false} />
                        <XAxis dataKey="name" tick={{ fill: '#94a3b8', fontSize: 10 }} />
                        <YAxis tickFormatter={(v) => fmtMoneyShort(v)} tick={{ fill: '#94a3b8', fontSize: 10 }} width={52} />
                        <RTooltip formatter={(v) => fmtMoney(v)} contentStyle={{ background: '#0f172a', border: '1px solid #334155', borderRadius: 8 }} labelStyle={{ color: '#e2e8f0' }} />
                        <Line type="monotone" dataKey="unit" stroke="#f59e0b" strokeWidth={2} dot={{ r: 3 }} />
                      </LineChart>
                    </ResponsiveContainer>
                  </div>
                )}
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="text-xs text-slate-400 border-b border-slate-700/50">
                        <th className="text-left p-2 font-medium">Data</th>
                        <th className="text-left p-2 font-medium">NF</th>
                        <th className="text-left p-2 font-medium">Fornecedor</th>
                        <th className="text-left p-2 font-medium">Obra</th>
                        <th className="text-right p-2 font-medium">Qtd</th>
                        <th className="text-right p-2 font-medium">Unit</th>
                        <th className="text-right p-2 font-medium">Total</th>
                      </tr>
                    </thead>
                    <tbody>
                      {materialSel.entradas.map((e, i) => {
                        const melhor = e.valorUnit > 0 && e.valorUnit === materialSel.unitMin;
                        const pior = e.valorUnit === materialSel.unitMax && materialSel.dispersaoPct > 0;
                        return (
                          <tr key={i} className="border-b border-slate-800/60">
                            <td className="p-2 text-slate-300">{fmtData(e.data)}</td>
                            <td className="p-2 text-slate-400 font-mono text-xs">{e.nf || '—'}</td>
                            <td className="p-2 text-slate-300 truncate max-w-[180px]">{e.fornecedor}</td>
                            <td className="p-2 text-slate-400 text-xs truncate max-w-[140px]">{nomeObra.get(e.obraId) || '—'}</td>
                            <td className="p-2 text-right text-slate-300">{fmtNum(e.qtd)}</td>
                            <td className={cn('p-2 text-right font-semibold',
                              melhor ? 'text-emerald-400' : pior ? 'text-red-400' : 'text-white')}>
                              {fmtMoney(e.valorUnit)}
                              {melhor && <TrendingDown className="inline h-3 w-3 ml-1" />}
                              {pior && <TrendingUp className="inline h-3 w-3 ml-1" />}
                            </td>
                            <td className="p-2 text-right text-slate-300">{fmtMoney(e.valorTotal)}</td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              </>
            )}
          </DialogContent>
        </Dialog>
      </div>
    </div>
  );
}
