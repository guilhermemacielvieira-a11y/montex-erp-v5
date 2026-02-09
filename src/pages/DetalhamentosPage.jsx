// MONTEX ERP Premium - Visualizador de Detalhamentos / Desenhos de Fabricação
// Projetos de montagem - Como as peças cortadas se integram em conjuntos
// PDFs para visualização + DWGs para download + Cross-reference com Peças de Produção

import React, { useState, useMemo } from 'react';
import {
  Search, Download, Eye, FileText, ChevronLeft, ChevronRight,
  LayoutGrid, Table2, Filter, Layers, X as XIcon, ExternalLink
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { cn } from '@/lib/utils';
import * as Dialog from '@radix-ui/react-dialog';
import {
  DETALHAMENTO_INDEX,
  DETALHAMENTO_FOLDERS,
  getDetalhamentoByNumero,
  getDetalhamentosByTipo,
  DETALHAMENTO_METADATA
} from '../data/detalhamentoDatabase';
import { getCroquiByMarca } from '../data/croquiDatabase';
import { pecasProducao } from '../data/database';

// Cores por tipo de peça
const CORES_TIPO = {
  'COLUNA': { bg: 'bg-blue-500/10', text: 'text-blue-400', border: 'border-blue-500/30' },
  'TESOURA': { bg: 'bg-orange-500/10', text: 'text-orange-400', border: 'border-orange-500/30' },
  'VIGA': { bg: 'bg-green-500/10', text: 'text-green-400', border: 'border-green-500/30' },
  'VIGA-MESTRA': { bg: 'bg-emerald-500/10', text: 'text-emerald-400', border: 'border-emerald-500/30' },
  'TERÇA': { bg: 'bg-purple-500/10', text: 'text-purple-400', border: 'border-purple-500/30' },
  'TRELIÇA': { bg: 'bg-cyan-500/10', text: 'text-cyan-400', border: 'border-cyan-500/30' },
  'TIRANTE': { bg: 'bg-rose-500/10', text: 'text-rose-400', border: 'border-rose-500/30' },
  'TERÇA-TAP': { bg: 'bg-amber-500/10', text: 'text-amber-400', border: 'border-amber-500/30' },
  'CONTRAVENTAMENTO': { bg: 'bg-yellow-500/10', text: 'text-yellow-400', border: 'border-yellow-500/30' },
  'MISCELÂNEA': { bg: 'bg-lime-500/10', text: 'text-lime-400', border: 'border-lime-500/30' },
};

const getCorTipo = (tipo) => CORES_TIPO[tipo] || { bg: 'bg-slate-500/10', text: 'text-slate-400', border: 'border-slate-500/30' };

export default function DetalhamentosPage() {
  const [busca, setBusca] = useState('');
  const [filtroTipo, setFiltroTipo] = useState('todos');
  const [modoView, setModoView] = useState('grid'); // grid | tabela
  const [detalhamentoSelecionado, setDetalhamentoSelecionado] = useState(null);
  const [paginaAtual, setPaginaAtual] = useState(1);
  const itensPorPagina = modoView === 'grid' ? 24 : 50;

  // Tipos disponíveis
  const tiposDisponiveis = useMemo(() => {
    return DETALHAMENTO_METADATA.tipos.sort();
  }, []);

  // Vincular peças da produção ao detalhamento por tipo
  const pecasPorTipo = useMemo(() => {
    const map = {};
    pecasProducao.forEach(p => {
      const t = p.tipo;
      if (!map[t]) map[t] = [];
      map[t].push(p);
    });
    return map;
  }, []);

  // Lista filtrada
  const detalhamentosFiltrados = useMemo(() => {
    let lista = Object.values(DETALHAMENTO_INDEX);

    if (filtroTipo !== 'todos') {
      lista = lista.filter(d => d.tipo === filtroTipo);
    }

    if (busca.trim()) {
      const termo = busca.trim().toLowerCase();
      lista = lista.filter(d =>
        String(d.numero).includes(termo) ||
        d.tipo.toLowerCase().includes(termo)
      );
    }

    return lista.sort((a, b) => parseInt(a.numero) - parseInt(b.numero));
  }, [filtroTipo, busca]);

  // Paginação
  const totalPaginas = Math.ceil(detalhamentosFiltrados.length / itensPorPagina);
  const detalhamentosPaginados = detalhamentosFiltrados.slice(
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
  const handleDownloadDWG = (detalhamento) => {
    if (!detalhamento.dwg) return;
    const link = document.createElement('a');
    link.href = detalhamento.dwg;
    link.download = detalhamento.dwg.split('/').pop();
    link.click();
  };

  // Abrir Detalhamento
  const handleViewPDF = (detalhamento) => {
    setDetalhamentoSelecionado(detalhamento);
  };

  // Stats por tipo
  const statsPorTipo = useMemo(() => {
    return tiposDisponiveis.map(tipo => {
      const folder = DETALHAMENTO_FOLDERS.find(f => f.name === tipo);
      return {
        tipo,
        count: folder?.count || 0,
        cor: getCorTipo(tipo)
      };
    });
  }, [tiposDisponiveis]);

  // Contar PDFs e DWGs
  const countPDFsDWGs = useMemo(() => {
    let pdfs = 0, dwgs = 0;
    Object.values(DETALHAMENTO_INDEX).forEach(d => {
      if (d.pdf) pdfs++;
      if (d.dwg) dwgs++;
    });
    return { pdfs, dwgs };
  }, []);

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-950 via-slate-900 to-slate-950 text-white p-4 md:p-6">
      {/* Header */}
      <div className="mb-6">
        <div className="flex items-center gap-3 mb-2">
          <div className="p-2 bg-amber-500/20 rounded-lg">
            <Layers className="w-6 h-6 text-amber-400" />
          </div>
          <div>
            <h1 className="text-2xl font-bold bg-gradient-to-r from-amber-400 to-orange-400 bg-clip-text text-transparent">
              Detalhamentos de Fabricação
            </h1>
            <p className="text-sm text-slate-400">
              Projetos de montagem — Como as peças cortadas se integram em conjuntos
            </p>
          </div>
        </div>

        {/* Stats Cards */}
        <div className="grid grid-cols-2 md:grid-cols-5 gap-3 mt-4">
          <div className="bg-slate-800/50 rounded-lg p-3 border border-slate-700/50">
            <div className="text-2xl font-bold text-amber-400">{DETALHAMENTO_METADATA.totalEntries}</div>
            <div className="text-xs text-slate-400">Total Detalhamentos</div>
          </div>
          <div className="bg-slate-800/50 rounded-lg p-3 border border-slate-700/50">
            <div className="text-2xl font-bold text-orange-400">{countPDFsDWGs.pdfs}</div>
            <div className="text-xs text-slate-400">PDFs Disponíveis</div>
          </div>
          <div className="bg-slate-800/50 rounded-lg p-3 border border-slate-700/50">
            <div className="text-2xl font-bold text-yellow-400">{countPDFsDWGs.dwgs}</div>
            <div className="text-xs text-slate-400">DWGs Disponíveis</div>
          </div>
          <div className="bg-slate-800/50 rounded-lg p-3 border border-slate-700/50">
            <div className="text-2xl font-bold text-green-400">{tiposDisponiveis.length}</div>
            <div className="text-xs text-slate-400">Tipos de Peça</div>
          </div>
          <div className="bg-slate-800/50 rounded-lg p-3 border border-slate-700/50">
            <div className="text-2xl font-bold text-blue-400">{detalhamentosFiltrados.length}</div>
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
            placeholder="Buscar por número ou tipo..."
            value={busca}
            onChange={e => handleBusca(e.target.value)}
            className="pl-9 bg-slate-800/50 border-slate-700 text-white placeholder:text-slate-500"
          />
        </div>

        {/* Toggle View */}
        <div className="flex items-center bg-slate-800 rounded-lg border border-slate-700 overflow-hidden">
          <button
            onClick={() => { setModoView('grid'); setPaginaAtual(1); }}
            className={cn('px-3 py-2 text-sm flex items-center gap-1', modoView === 'grid' ? 'bg-amber-500/20 text-amber-400' : 'text-slate-400')}
          >
            <LayoutGrid className="w-4 h-4" /> Grid
          </button>
          <button
            onClick={() => { setModoView('tabela'); setPaginaAtual(1); }}
            className={cn('px-3 py-2 text-sm flex items-center gap-1 border-l border-slate-700', modoView === 'tabela' ? 'bg-amber-500/20 text-amber-400' : 'text-slate-400')}
          >
            <Table2 className="w-4 h-4" /> Tabela
          </button>
        </div>
      </div>

      {/* Filtro Chips por Tipo */}
      <div className="flex flex-wrap items-center gap-2 mb-4 pb-4 border-b border-slate-700/30">
        <Filter className="w-4 h-4 text-slate-400 mr-2" />
        <button
          onClick={() => handleFiltro('todos')}
          className={cn(
            'px-3 py-1 rounded-full text-xs font-medium border transition-all',
            filtroTipo === 'todos'
              ? 'bg-amber-500/20 text-amber-400 border-amber-500/50'
              : 'bg-slate-800/50 text-slate-400 border-slate-700/50 hover:border-slate-600'
          )}
        >
          Todos ({DETALHAMENTO_METADATA.totalEntries})
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
          {detalhamentosPaginados.map(detalhamento => {
            const cor = getCorTipo(detalhamento.tipo);
            const pecas = pecasPorTipo[detalhamento.tipo] || [];
            return (
              <div
                key={detalhamento.numero}
                className={cn(
                  'group relative bg-slate-800/40 rounded-lg border border-slate-700/40 hover:border-slate-600 transition-all cursor-pointer overflow-hidden',
                  'hover:shadow-lg hover:shadow-amber-500/5'
                )}
                onClick={() => handleViewPDF(detalhamento)}
              >
                {/* Preview area */}
                <div className={cn('h-20 flex items-center justify-center', cor.bg)}>
                  <FileText className={cn('w-8 h-8', cor.text)} />
                </div>
                {/* Info */}
                <div className="p-2">
                  <div className="flex items-center justify-between mb-1">
                    <span className="text-sm font-bold text-white">EM-{detalhamento.numero}</span>
                    {pecas.length > 0 && (
                      <span className="text-[10px] px-1.5 py-0.5 bg-green-500/20 text-green-400 rounded">
                        {pecas.length}
                      </span>
                    )}
                  </div>
                  <div className={cn('text-[10px] font-medium', cor.text)}>{detalhamento.tipo}</div>
                  {pecas.length > 0 && (
                    <div className="text-[10px] text-slate-500 mt-0.5 truncate">
                      {pecas.length} peça{pecas.length !== 1 ? 's' : ''}
                    </div>
                  )}
                </div>
                {/* Actions overlay */}
                <div className="absolute top-1 right-1 opacity-0 group-hover:opacity-100 transition-opacity flex gap-1">
                  {detalhamento.dwg && (
                    <button
                      onClick={(e) => { e.stopPropagation(); handleDownloadDWG(detalhamento); }}
                      className="p-1 bg-slate-900/80 rounded text-yellow-400 hover:text-yellow-300"
                      title="Download DWG"
                    >
                      <Download className="w-3 h-3" />
                    </button>
                  )}
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
                <th className="text-left py-2 px-3 font-medium">NÚMERO</th>
                <th className="text-left py-2 px-3 font-medium">TIPO</th>
                <th className="text-center py-2 px-3 font-medium">PEÇAS</th>
                <th className="text-center py-2 px-3 font-medium">PDF</th>
                <th className="text-center py-2 px-3 font-medium">DWG</th>
              </tr>
            </thead>
            <tbody>
              {detalhamentosPaginados.map(detalhamento => {
                const cor = getCorTipo(detalhamento.tipo);
                const pecas = pecasPorTipo[detalhamento.tipo] || [];
                return (
                  <tr key={detalhamento.numero} className="border-b border-slate-700/20 hover:bg-slate-700/20">
                    <td className="py-2 px-3 font-mono font-bold">EM-{detalhamento.numero}</td>
                    <td className="py-2 px-3">
                      <span className={cn('px-2 py-0.5 rounded text-xs font-medium', cor.bg, cor.text)}>
                        {detalhamento.tipo}
                      </span>
                    </td>
                    <td className="py-2 px-3 text-center text-slate-300">{pecas.length || '—'}</td>
                    <td className="py-2 px-3 text-center">
                      {detalhamento.pdf && (
                        <button
                          onClick={() => handleViewPDF(detalhamento)}
                          className="p-1 hover:bg-amber-500/20 rounded text-amber-400"
                          title="Visualizar PDF"
                        >
                          <Eye className="w-4 h-4" />
                        </button>
                      )}
                    </td>
                    <td className="py-2 px-3 text-center">
                      {detalhamento.dwg && (
                        <button
                          onClick={() => handleDownloadDWG(detalhamento)}
                          className="p-1 hover:bg-yellow-500/20 rounded text-yellow-400"
                          title="Download DWG"
                        >
                          <Download className="w-4 h-4" />
                        </button>
                      )}
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
            {detalhamentosFiltrados.length} detalhamentos · Página {paginaAtual}/{totalPaginas}
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
            <span className="px-3 py-1 bg-amber-500/20 text-amber-400 rounded text-sm font-medium">
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
      <Dialog.Root open={!!detalhamentoSelecionado} onOpenChange={(open) => !open && setDetalhamentoSelecionado(null)}>
        <Dialog.Portal>
          <Dialog.Overlay className="fixed inset-0 bg-black/80 z-50" />
          <Dialog.Content className="fixed inset-4 md:inset-8 bg-slate-900 rounded-xl border border-slate-700 z-50 flex flex-col overflow-hidden">
            {detalhamentoSelecionado && (
              <>
                {/* Header do Modal */}
                <div className="flex items-center justify-between p-4 border-b border-slate-700">
                  <div className="flex items-center gap-3 flex-1">
                    <div className={cn('p-2 rounded-lg', getCorTipo(detalhamentoSelecionado.tipo).bg)}>
                      <Layers className={cn('w-5 h-5', getCorTipo(detalhamentoSelecionado.tipo).text)} />
                    </div>
                    <div>
                      <h3 className="text-lg font-bold text-white">
                        EM-{detalhamentoSelecionado.numero} — {detalhamentoSelecionado.tipo}
                      </h3>
                      <p className="text-sm text-slate-400">
                        Detalhamento de Fabricação
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    {/* Navegação entre detalhamentos */}
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => {
                        const idx = detalhamentosFiltrados.findIndex(d => d.numero === detalhamentoSelecionado.numero);
                        if (idx > 0) setDetalhamentoSelecionado(detalhamentosFiltrados[idx - 1]);
                      }}
                      className="bg-slate-800 border-slate-700 text-slate-300"
                    >
                      <ChevronLeft className="w-4 h-4" /> Anterior
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => {
                        const idx = detalhamentosFiltrados.findIndex(d => d.numero === detalhamentoSelecionado.numero);
                        if (idx < detalhamentosFiltrados.length - 1) setDetalhamentoSelecionado(detalhamentosFiltrados[idx + 1]);
                      }}
                      className="bg-slate-800 border-slate-700 text-slate-300"
                    >
                      Próximo <ChevronRight className="w-4 h-4" />
                    </Button>
                    {/* Download DWG */}
                    {detalhamentoSelecionado.dwg && (
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => handleDownloadDWG(detalhamentoSelecionado)}
                        className="bg-yellow-500/20 border-yellow-500/50 text-yellow-400 hover:bg-yellow-500/30"
                      >
                        <Download className="w-4 h-4 mr-1" /> DWG
                      </Button>
                    )}
                    {/* Abrir PDF em nova aba */}
                    {detalhamentoSelecionado.pdf && (
                      <a
                        href={detalhamentoSelecionado.pdf}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="inline-flex items-center gap-1 px-3 py-1.5 bg-amber-500/20 border border-amber-500/50 text-amber-400 rounded-md text-sm hover:bg-amber-500/30"
                      >
                        <Eye className="w-4 h-4" /> Abrir
                      </a>
                    )}
                    <Dialog.Close asChild>
                      <button className="p-2 hover:bg-slate-700 rounded-lg text-slate-400">
                        <XIcon className="w-5 h-5" />
                      </button>
                    </Dialog.Close>
                  </div>
                </div>

                {/* PDF Embed */}
                {detalhamentoSelecionado.pdf && (
                  <div className="flex-1 bg-slate-950">
                    <iframe
                      src={detalhamentoSelecionado.pdf}
                      className="w-full h-full border-0"
                      title={`Detalhamento EM-${detalhamentoSelecionado.numero}`}
                    />
                  </div>
                )}

                {/* Peças Relacionadas */}
                {pecasPorTipo[detalhamentoSelecionado.tipo]?.length > 0 && (
                  <div className="border-t border-slate-700 bg-slate-800/50 max-h-48 overflow-y-auto">
                    <div className="p-4">
                      <h4 className="text-sm font-bold text-white mb-3 flex items-center gap-2">
                        <Package className="w-4 h-4 text-green-400" />
                        Peças Relacionadas ({pecasPorTipo[detalhamentoSelecionado.tipo].length})
                      </h4>
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                        {pecasPorTipo[detalhamentoSelecionado.tipo].map((peca, idx) => {
                          const croqui = getCroquiByMarca(peca.marca);
                          return (
                            <div
                              key={idx}
                              className="p-3 bg-slate-700/30 rounded border border-slate-600/30 text-sm"
                            >
                              <div className="flex items-center justify-between mb-2">
                                <span className="font-mono font-bold text-cyan-400">MRC {peca.marca}</span>
                                <span className={cn(
                                  'text-[10px] px-1.5 py-0.5 rounded font-medium',
                                  peca.etapa === 'aguardando' ? 'bg-slate-600 text-slate-300' :
                                  peca.etapa === 'corte' ? 'bg-yellow-500/20 text-yellow-400' :
                                  peca.etapa === 'pintura' ? 'bg-green-500/20 text-green-400' :
                                  'bg-blue-500/20 text-blue-400'
                                )}>
                                  {peca.etapa?.toUpperCase() || 'AGUARDANDO'}
                                </span>
                              </div>
                              <div className="text-slate-300 space-y-1">
                                <div><strong>Perfil:</strong> {peca.perfil}</div>
                                <div><strong>Comp:</strong> {peca.comprimento}mm · <strong>Qtd:</strong> {peca.quantidade}</div>
                                <div><strong>Peso:</strong> {peca.peso}kg · <strong>Material:</strong> {peca.material}</div>
                              </div>
                              {croqui && (
                                <div className="mt-2 pt-2 border-t border-slate-600/30 flex items-center gap-1">
                                  <FileText className="w-3 h-3 text-cyan-400" />
                                  <span className="text-cyan-400 text-xs">Croqui disponível</span>
                                </div>
                              )}
                            </div>
                          );
                        })}
                      </div>
                    </div>
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
