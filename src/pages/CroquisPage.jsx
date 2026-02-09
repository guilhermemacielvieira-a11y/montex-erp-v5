// MONTEX ERP Premium - Visualizador de Croquis / Desenhos Técnicos
// Vinculado à Lista de Peças (pecasProducao) via MARCA
// PDFs para visualização + DWGs para download

import React, { useState, useMemo } from 'react';
import {
  Search, Download, Eye, FileText, FolderOpen,
  ChevronLeft, ChevronRight, X as XIcon,
  LayoutGrid, Table2, Filter, Package, Layers
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { cn } from '@/lib/utils';
import * as Dialog from '@radix-ui/react-dialog';
import { CROQUI_INDEX, CROQUI_FOLDERS, getCroquiByMarca, getCroquisByTipo, CROQUI_METADATA } from '../data/croquiDatabase';
import { pecasProducao } from '../data/database';

// Cores por tipo de peça
const CORES_TIPO = {
  'COLUNA': { bg: 'bg-blue-500/10', text: 'text-blue-400', border: 'border-blue-500/30' },
  'TESOURA': { bg: 'bg-orange-500/10', text: 'text-orange-400', border: 'border-orange-500/30' },
  'VIGA': { bg: 'bg-green-500/10', text: 'text-green-400', border: 'border-green-500/30' },
  'VIGA-MESTRA': { bg: 'bg-emerald-500/10', text: 'text-emerald-400', border: 'border-emerald-500/30' },
  'CHAPA': { bg: 'bg-purple-500/10', text: 'text-purple-400', border: 'border-purple-500/30' },
  'TRELIÇA': { bg: 'bg-cyan-500/10', text: 'text-cyan-400', border: 'border-cyan-500/30' },
  'TIRANTE': { bg: 'bg-rose-500/10', text: 'text-rose-400', border: 'border-rose-500/30' },
  'DIAGONAL-VM': { bg: 'bg-amber-500/10', text: 'text-amber-400', border: 'border-amber-500/30' },
  'DIAGONAL-TL': { bg: 'bg-yellow-500/10', text: 'text-yellow-400', border: 'border-yellow-500/30' },
  'DIAGONAL': { bg: 'bg-lime-500/10', text: 'text-lime-400', border: 'border-lime-500/30' },
  'SUPORTE': { bg: 'bg-indigo-500/10', text: 'text-indigo-400', border: 'border-indigo-500/30' },
  'CONTRAVENTAMENTO': { bg: 'bg-pink-500/10', text: 'text-pink-400', border: 'border-pink-500/30' },
  'MISULA': { bg: 'bg-red-500/10', text: 'text-red-400', border: 'border-red-500/30' },
  'CALHA': { bg: 'bg-teal-500/10', text: 'text-teal-400', border: 'border-teal-500/30' },
  'TERÇA-TAP': { bg: 'bg-sky-500/10', text: 'text-sky-400', border: 'border-sky-500/30' },
  'CHUMBADOR': { bg: 'bg-stone-500/10', text: 'text-stone-400', border: 'border-stone-500/30' },
  'COLUNETA': { bg: 'bg-violet-500/10', text: 'text-violet-400', border: 'border-violet-500/30' },
  'MONTANTE-VM': { bg: 'bg-fuchsia-500/10', text: 'text-fuchsia-400', border: 'border-fuchsia-500/30' },
  'MONTANTE-TL': { bg: 'bg-zinc-500/10', text: 'text-zinc-400', border: 'border-zinc-500/30' },
};

const getCorTipo = (tipo) => CORES_TIPO[tipo] || { bg: 'bg-slate-500/10', text: 'text-slate-400', border: 'border-slate-500/30' };

export default function CroquisPage() {
  const [busca, setBusca] = useState('');
  const [filtroTipo, setFiltroTipo] = useState('todos');
  const [modoView, setModoView] = useState('grid'); // grid | tabela
  const [croquiSelecionado, setCroquiSelecionado] = useState(null);
  const [paginaAtual, setPaginaAtual] = useState(1);
  const itensPorPagina = modoView === 'grid' ? 24 : 50;

  // Tipos disponíveis
  const tiposDisponiveis = useMemo(() => {
    return Object.keys(CROQUI_FOLDERS).sort();
  }, []);

  // Vincular peças da produção ao croqui
  const pecasPorMarca = useMemo(() => {
    const map = {};
    pecasProducao.forEach(p => {
      const m = String(p.marca);
      if (!map[m]) map[m] = [];
      map[m].push(p);
    });
    return map;
  }, []);

  // Lista filtrada
  const croquisFiltrados = useMemo(() => {
    let lista = Object.values(CROQUI_INDEX);

    if (filtroTipo !== 'todos') {
      lista = lista.filter(c => c.tipo === filtroTipo);
    }

    if (busca.trim()) {
      const termo = busca.trim().toLowerCase();
      lista = lista.filter(c =>
        String(c.marca).includes(termo) ||
        c.tipo.toLowerCase().includes(termo)
      );
    }

    return lista.sort((a, b) => a.marca - b.marca);
  }, [filtroTipo, busca]);

  // Paginação
  const totalPaginas = Math.ceil(croquisFiltrados.length / itensPorPagina);
  const croquisPaginados = croquisFiltrados.slice(
    (paginaAtual - 1) * itensPorPagina,
    paginaAtual * itensPorPagina
  );

  // Reset página ao mudar filtro
  const handleFiltro = (tipo) => {
    setFiltroTipo(tipo);
    setPaginaAtual(1);
  };

  const handleBusca = (val) => {
    setBusca(val);
    setPaginaAtual(1);
  };

  // Download DWG
  const handleDownloadDWG = (croqui) => {
    const link = document.createElement('a');
    link.href = croqui.dwg;
    link.download = croqui.dwg.split('/').pop();
    link.click();
  };

  // Abrir PDF
  const handleViewPDF = (croqui) => {
    setCroquiSelecionado(croqui);
  };

  // Stats por tipo
  const statsPorTipo = useMemo(() => {
    return tiposDisponiveis.map(tipo => ({
      tipo,
      count: CROQUI_FOLDERS[tipo]?.count || 0,
      cor: getCorTipo(tipo)
    }));
  }, [tiposDisponiveis]);

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-950 via-slate-900 to-slate-950 text-white p-4 md:p-6">
      {/* Header */}
      <div className="mb-6">
        <div className="flex items-center gap-3 mb-2">
          <div className="p-2 bg-cyan-500/20 rounded-lg">
            <FileText className="w-6 h-6 text-cyan-400" />
          </div>
          <div>
            <h1 className="text-2xl font-bold bg-gradient-to-r from-cyan-400 to-blue-400 bg-clip-text text-transparent">
              Croquis & Desenhos Técnicos
            </h1>
            <p className="text-sm text-slate-400">
              SUPER LUNA — {CROQUI_METADATA.totalMarcas} desenhos em {Object.keys(CROQUI_FOLDERS).length} categorias
            </p>
          </div>
        </div>

        {/* Stats Cards */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mt-4">
          <div className="bg-slate-800/50 rounded-lg p-3 border border-slate-700/50">
            <div className="text-2xl font-bold text-cyan-400">{CROQUI_METADATA.totalMarcas}</div>
            <div className="text-xs text-slate-400">Total PDFs</div>
          </div>
          <div className="bg-slate-800/50 rounded-lg p-3 border border-slate-700/50">
            <div className="text-2xl font-bold text-blue-400">{Object.keys(CROQUI_FOLDERS).length}</div>
            <div className="text-xs text-slate-400">Tipos de Peça</div>
          </div>
          <div className="bg-slate-800/50 rounded-lg p-3 border border-slate-700/50">
            <div className="text-2xl font-bold text-green-400">{pecasProducao.length}</div>
            <div className="text-xs text-slate-400">Peças na Produção</div>
          </div>
          <div className="bg-slate-800/50 rounded-lg p-3 border border-slate-700/50">
            <div className="text-2xl font-bold text-amber-400">{croquisFiltrados.length}</div>
            <div className="text-xs text-slate-400">Filtrados</div>
          </div>
        </div>
      </div>

      {/* Filtros */}
      <div className="flex flex-wrap items-center gap-3 mb-4">
        {/* Busca */}
        <div className="relative flex-1 min-w-[200px] max-w-md">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
          <Input
            placeholder="Buscar por marca ou tipo..."
            value={busca}
            onChange={e => handleBusca(e.target.value)}
            className="pl-9 bg-slate-800/50 border-slate-700 text-white placeholder:text-slate-500"
          />
        </div>

        {/* Filtro Tipo */}
        <div className="flex items-center gap-1">
          <Filter className="w-4 h-4 text-slate-400" />
          <select
            value={filtroTipo}
            onChange={e => handleFiltro(e.target.value)}
            className="bg-slate-800 border border-slate-700 rounded-md px-3 py-2 text-sm text-white"
          >
            <option value="todos">Todos os Tipos ({CROQUI_METADATA.totalMarcas})</option>
            {tiposDisponiveis.map(tipo => (
              <option key={tipo} value={tipo}>
                {tipo} ({CROQUI_FOLDERS[tipo]?.count || 0})
              </option>
            ))}
          </select>
        </div>

        {/* Toggle View */}
        <div className="flex items-center bg-slate-800 rounded-lg border border-slate-700 overflow-hidden">
          <button
            onClick={() => { setModoView('grid'); setPaginaAtual(1); }}
            className={cn('px-3 py-2 text-sm flex items-center gap-1', modoView === 'grid' ? 'bg-cyan-500/20 text-cyan-400' : 'text-slate-400')}
          >
            <LayoutGrid className="w-4 h-4" /> Grid
          </button>
          <button
            onClick={() => { setModoView('tabela'); setPaginaAtual(1); }}
            className={cn('px-3 py-2 text-sm flex items-center gap-1', modoView === 'tabela' ? 'bg-cyan-500/20 text-cyan-400' : 'text-slate-400')}
          >
            <Table2 className="w-4 h-4" /> Tabela
          </button>
        </div>
      </div>

      {/* Chips de Tipo (resumo rápido) */}
      <div className="flex flex-wrap gap-2 mb-4">
        <button
          onClick={() => handleFiltro('todos')}
          className={cn(
            'px-3 py-1 rounded-full text-xs font-medium border transition-all',
            filtroTipo === 'todos'
              ? 'bg-cyan-500/20 text-cyan-400 border-cyan-500/50'
              : 'bg-slate-800/50 text-slate-400 border-slate-700/50 hover:border-slate-600'
          )}
        >
          Todos ({CROQUI_METADATA.totalMarcas})
        </button>
        {statsPorTipo.map(({ tipo, count, cor }) => (
          <button
            key={tipo}
            onClick={() => handleFiltro(tipo)}
            className={cn(
              'px-3 py-1 rounded-full text-xs font-medium border transition-all',
              filtroTipo === tipo
                ? `${cor.bg} ${cor.text} ${cor.border}`
                : 'bg-slate-800/50 text-slate-400 border-slate-700/50 hover:border-slate-600'
            )}
          >
            {tipo} ({count})
          </button>
        ))}
      </div>

      {/* Grid View */}
      {modoView === 'grid' && (
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 xl:grid-cols-8 gap-3">
          {croquisPaginados.map(croqui => {
            const cor = getCorTipo(croqui.tipo);
            const pecas = pecasPorMarca[String(croqui.marca)] || [];
            return (
              <div
                key={croqui.marca}
                className={cn(
                  'group relative bg-slate-800/40 rounded-lg border border-slate-700/40 hover:border-slate-600 transition-all cursor-pointer overflow-hidden',
                  'hover:shadow-lg hover:shadow-cyan-500/5'
                )}
                onClick={() => handleViewPDF(croqui)}
              >
                {/* Preview area */}
                <div className={cn('h-20 flex items-center justify-center', cor.bg)}>
                  <FileText className={cn('w-8 h-8', cor.text)} />
                </div>
                {/* Info */}
                <div className="p-2">
                  <div className="flex items-center justify-between mb-1">
                    <span className="text-sm font-bold text-white">MRC {croqui.marca}</span>
                    {pecas.length > 0 && (
                      <span className="text-[10px] px-1.5 py-0.5 bg-green-500/20 text-green-400 rounded">
                        {pecas.reduce((s, p) => s + p.quantidade, 0)}un
                      </span>
                    )}
                  </div>
                  <div className={cn('text-[10px] font-medium', cor.text)}>{croqui.tipo}</div>
                  {pecas.length > 0 && (
                    <div className="text-[10px] text-slate-500 mt-0.5 truncate">
                      {pecas[0].perfil} · {pecas[0].peso}kg
                    </div>
                  )}
                </div>
                {/* Actions overlay */}
                <div className="absolute top-1 right-1 opacity-0 group-hover:opacity-100 transition-opacity flex gap-1">
                  <button
                    onClick={(e) => { e.stopPropagation(); handleDownloadDWG(croqui); }}
                    className="p-1 bg-slate-900/80 rounded text-amber-400 hover:text-amber-300"
                    title="Download DWG"
                  >
                    <Download className="w-3 h-3" />
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Tabela View */}
      {modoView === 'tabela' && (
        <div className="bg-slate-800/30 rounded-lg border border-slate-700/50 overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-slate-700/50 text-slate-400">
                <th className="text-left py-2 px-3 font-medium">MARCA</th>
                <th className="text-left py-2 px-3 font-medium">TIPO</th>
                <th className="text-left py-2 px-3 font-medium">PERFIL</th>
                <th className="text-right py-2 px-3 font-medium">QTD</th>
                <th className="text-right py-2 px-3 font-medium">PESO</th>
                <th className="text-center py-2 px-3 font-medium">PDF</th>
                <th className="text-center py-2 px-3 font-medium">DWG</th>
              </tr>
            </thead>
            <tbody>
              {croquisPaginados.map(croqui => {
                const cor = getCorTipo(croqui.tipo);
                const pecas = pecasPorMarca[String(croqui.marca)] || [];
                const perfil = pecas.length > 0 ? pecas[0].perfil : '—';
                const qtd = pecas.reduce((s, p) => s + p.quantidade, 0);
                const peso = pecas.reduce((s, p) => s + p.peso, 0);
                return (
                  <tr key={croqui.marca} className="border-b border-slate-700/20 hover:bg-slate-700/20">
                    <td className="py-2 px-3 font-mono font-bold">{croqui.marca}</td>
                    <td className="py-2 px-3">
                      <span className={cn('px-2 py-0.5 rounded text-xs font-medium', cor.bg, cor.text)}>
                        {croqui.tipo}
                      </span>
                    </td>
                    <td className="py-2 px-3 text-slate-300">{perfil}</td>
                    <td className="py-2 px-3 text-right text-slate-300">{qtd || '—'}</td>
                    <td className="py-2 px-3 text-right text-slate-300">{peso ? `${peso.toFixed(1)}kg` : '—'}</td>
                    <td className="py-2 px-3 text-center">
                      <button
                        onClick={() => handleViewPDF(croqui)}
                        className="p-1 hover:bg-cyan-500/20 rounded text-cyan-400"
                        title="Visualizar PDF"
                      >
                        <Eye className="w-4 h-4" />
                      </button>
                    </td>
                    <td className="py-2 px-3 text-center">
                      <button
                        onClick={() => handleDownloadDWG(croqui)}
                        className="p-1 hover:bg-amber-500/20 rounded text-amber-400"
                        title="Download DWG"
                      >
                        <Download className="w-4 h-4" />
                      </button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}

      {/* Paginação */}
      {totalPaginas > 1 && (
        <div className="flex items-center justify-between mt-4">
          <span className="text-sm text-slate-400">
            {croquisFiltrados.length} desenhos · Página {paginaAtual}/{totalPaginas}
          </span>
          <div className="flex items-center gap-1">
            <Button
              variant="outline"
              size="sm"
              onClick={() => setPaginaAtual(1)}
              disabled={paginaAtual === 1}
              className="bg-slate-800 border-slate-700 text-slate-300 hover:bg-slate-700"
            >
              «
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={() => setPaginaAtual(p => Math.max(1, p - 1))}
              disabled={paginaAtual === 1}
              className="bg-slate-800 border-slate-700 text-slate-300 hover:bg-slate-700"
            >
              <ChevronLeft className="w-4 h-4" />
            </Button>
            <span className="px-3 py-1 bg-cyan-500/20 text-cyan-400 rounded text-sm font-medium">
              {paginaAtual}
            </span>
            <Button
              variant="outline"
              size="sm"
              onClick={() => setPaginaAtual(p => Math.min(totalPaginas, p + 1))}
              disabled={paginaAtual === totalPaginas}
              className="bg-slate-800 border-slate-700 text-slate-300 hover:bg-slate-700"
            >
              <ChevronRight className="w-4 h-4" />
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={() => setPaginaAtual(totalPaginas)}
              disabled={paginaAtual === totalPaginas}
              className="bg-slate-800 border-slate-700 text-slate-300 hover:bg-slate-700"
            >
              »
            </Button>
          </div>
        </div>
      )}

      {/* Modal PDF Viewer */}
      <Dialog.Root open={!!croquiSelecionado} onOpenChange={(open) => !open && setCroquiSelecionado(null)}>
        <Dialog.Portal>
          <Dialog.Overlay className="fixed inset-0 bg-black/80 z-50" />
          <Dialog.Content className="fixed inset-4 md:inset-8 bg-slate-900 rounded-xl border border-slate-700 z-50 flex flex-col overflow-hidden">
            {croquiSelecionado && (
              <>
                {/* Header do Modal */}
                <div className="flex items-center justify-between p-4 border-b border-slate-700">
                  <div className="flex items-center gap-3">
                    <div className={cn('p-2 rounded-lg', getCorTipo(croquiSelecionado.tipo).bg)}>
                      <FileText className={cn('w-5 h-5', getCorTipo(croquiSelecionado.tipo).text)} />
                    </div>
                    <div>
                      <h3 className="text-lg font-bold text-white">
                        Marca {croquiSelecionado.marca} — {croquiSelecionado.tipo}
                      </h3>
                      {pecasPorMarca[String(croquiSelecionado.marca)]?.length > 0 && (
                        <p className="text-sm text-slate-400">
                          {pecasPorMarca[String(croquiSelecionado.marca)][0].perfil} ·
                          {pecasPorMarca[String(croquiSelecionado.marca)][0].peso}kg ·
                          {pecasPorMarca[String(croquiSelecionado.marca)][0].material}
                        </p>
                      )}
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    {/* Navegação entre croquis */}
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => {
                        const idx = croquisFiltrados.findIndex(c => c.marca === croquiSelecionado.marca);
                        if (idx > 0) setCroquiSelecionado(croquisFiltrados[idx - 1]);
                      }}
                      className="bg-slate-800 border-slate-700 text-slate-300"
                    >
                      <ChevronLeft className="w-4 h-4" /> Anterior
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => {
                        const idx = croquisFiltrados.findIndex(c => c.marca === croquiSelecionado.marca);
                        if (idx < croquisFiltrados.length - 1) setCroquiSelecionado(croquisFiltrados[idx + 1]);
                      }}
                      className="bg-slate-800 border-slate-700 text-slate-300"
                    >
                      Próximo <ChevronRight className="w-4 h-4" />
                    </Button>
                    {/* Download DWG */}
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => handleDownloadDWG(croquiSelecionado)}
                      className="bg-amber-500/20 border-amber-500/50 text-amber-400 hover:bg-amber-500/30"
                    >
                      <Download className="w-4 h-4 mr-1" /> DWG
                    </Button>
                    {/* Abrir PDF em nova aba */}
                    <a
                      href={croquiSelecionado.pdf}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center gap-1 px-3 py-1.5 bg-cyan-500/20 border border-cyan-500/50 text-cyan-400 rounded-md text-sm hover:bg-cyan-500/30"
                    >
                      <Eye className="w-4 h-4" /> Abrir
                    </a>
                    <Dialog.Close asChild>
                      <button className="p-2 hover:bg-slate-700 rounded-lg text-slate-400">
                        <XIcon className="w-5 h-5" />
                      </button>
                    </Dialog.Close>
                  </div>
                </div>

                {/* PDF Embed */}
                <div className="flex-1 bg-slate-950">
                  <iframe
                    src={croquiSelecionado.pdf}
                    className="w-full h-full border-0"
                    title={`Croqui Marca ${croquiSelecionado.marca}`}
                  />
                </div>

                {/* Info Peça no rodapé */}
                {pecasPorMarca[String(croquiSelecionado.marca)]?.length > 0 && (
                  <div className="p-3 border-t border-slate-700 bg-slate-800/50 flex items-center gap-6 text-sm">
                    {pecasPorMarca[String(croquiSelecionado.marca)].map((peca, i) => (
                      <div key={i} className="flex items-center gap-4 text-slate-300">
                        <span><strong>Peça:</strong> {peca.tipo}</span>
                        <span><strong>Perfil:</strong> {peca.perfil}</span>
                        <span><strong>Comp:</strong> {peca.comprimento}mm</span>
                        <span><strong>Qtd:</strong> {peca.quantidade}</span>
                        <span><strong>Peso:</strong> {peca.peso}kg</span>
                        <span><strong>Material:</strong> {peca.material}</span>
                        <span className={cn(
                          'px-2 py-0.5 rounded text-xs',
                          peca.etapa === 'aguardando' ? 'bg-slate-600 text-slate-300' :
                          peca.etapa === 'corte' ? 'bg-yellow-500/20 text-yellow-400' :
                          peca.etapa === 'pintura' ? 'bg-green-500/20 text-green-400' :
                          'bg-blue-500/20 text-blue-400'
                        )}>
                          {peca.etapa?.toUpperCase() || 'AGUARDANDO'}
                        </span>
                      </div>
                    ))}
                  </div>
                )}
              </>
            )}
          </Dialog.Content>
        </Dialog.Portal>
      </Dialog.Root>
    </div>
  );
}
