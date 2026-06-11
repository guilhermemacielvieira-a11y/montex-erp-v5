// ============================================================
// MappingAprendidoModal — Fase 3 do plano Despesas
// ============================================================
// Lista o mapping fornecedor/NF → categoria aprendido pelo sistema (alimentado
// por edições manuais e por importações XML/XLSX). Permite revisar, limpar
// individualmente ou em massa. Útil para auditar correções.
//
// O mapping vive em localStorage 'montex_nf_fornecedor_mapping' (mesmo lugar
// que DespesasPage usa). Schema:
//   { 'FORNECEDOR UPPER': { categoria, centroCusto, natureza, aprendidoEm } }
//   { 'NF_12345': { categoria, fornecedor, aprendidoEm } }
// ============================================================

import React, { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Trash2, Search, Brain } from 'lucide-react';
import { toast } from 'react-hot-toast';

const MAPPING_KEY = 'montex_nf_fornecedor_mapping';

function loadMapping() {
  try {
    const raw = localStorage.getItem(MAPPING_KEY);
    return raw ? JSON.parse(raw) : {};
  } catch {
    return {};
  }
}

function saveMapping(obj) {
  try {
    localStorage.setItem(MAPPING_KEY, JSON.stringify(obj || {}));
  } catch {}
}

export default function MappingAprendidoModal({ open, onOpenChange }) {
  const [mapping, setMapping] = useState({});
  const [busca, setBusca] = useState('');

  useEffect(() => {
    if (open) setMapping(loadMapping());
  }, [open]);

  // Lista achatada: { key, fornecedor, nf, categoria, centroCusto, aprendidoEm }
  const entradas = Object.entries(mapping)
    .map(([key, value]) => {
      const isNF = key.startsWith('NF_');
      return {
        key,
        tipo: isNF ? 'NF' : 'Fornecedor',
        identificador: isNF ? key.slice(3) : key,
        fornecedor: value.fornecedor || (isNF ? '' : key),
        categoria: value.categoria || '-',
        centroCusto: value.centroCusto || '',
        aprendidoEm: value.aprendidoEm || null,
      };
    })
    .filter(e => {
      if (!busca.trim()) return true;
      const q = busca.toLowerCase();
      return (
        e.identificador.toLowerCase().includes(q) ||
        e.categoria.toLowerCase().includes(q) ||
        (e.fornecedor || '').toLowerCase().includes(q)
      );
    })
    .sort((a, b) => {
      // mais recente primeiro
      if (a.aprendidoEm && b.aprendidoEm) return b.aprendidoEm.localeCompare(a.aprendidoEm);
      return a.identificador.localeCompare(b.identificador);
    });

  const removerEntrada = (key) => {
    const novo = { ...mapping };
    delete novo[key];
    saveMapping(novo);
    setMapping(novo);
    toast.success('Mapping removido — categorização desta regra volta ao automático');
  };

  const limparTudo = () => {
    if (entradas.length === 0) return;
    if (!confirm(`Remover TODAS as ${entradas.length} regras de aprendizado? Esta ação não pode ser desfeita.`)) return;
    saveMapping({});
    setMapping({});
    toast.success('Todas as regras removidas');
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="bg-slate-900 border-slate-700 max-w-3xl max-h-[80vh] overflow-hidden flex flex-col">
        <DialogHeader>
          <DialogTitle className="text-white flex items-center gap-2">
            <Brain className="h-5 w-5 text-cyan-400" />
            Regras de Categorização Aprendidas
          </DialogTitle>
          <p className="text-xs text-slate-400">
            Mapeamentos fornecedor/NF → categoria gerados por suas correções manuais e
            importações. Estas regras são consultadas antes da categorização por palavras-chave.
          </p>
        </DialogHeader>

        <div className="flex items-center gap-2 mt-2">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-500" />
            <Input
              className="pl-9 bg-slate-800 border-slate-700"
              placeholder="Buscar fornecedor, NF ou categoria…"
              value={busca}
              onChange={e => setBusca(e.target.value)}
            />
          </div>
          <Button
            variant="outline"
            size="sm"
            className="border-red-700/40 text-red-300 hover:bg-red-500/10"
            onClick={limparTudo}
            disabled={entradas.length === 0}
          >
            <Trash2 className="h-4 w-4 mr-1" />
            Limpar todas
          </Button>
        </div>

        <div className="overflow-auto flex-1 mt-3 -mx-1 px-1">
          {entradas.length === 0 ? (
            <div className="text-center py-12 text-slate-500 text-sm">
              {busca.trim()
                ? 'Nenhuma regra corresponde à busca.'
                : 'Nenhuma regra aprendida ainda. Edite categoria de qualquer despesa para começar.'}
            </div>
          ) : (
            <div className="space-y-1.5">
              {entradas.map(e => (
                <div
                  key={e.key}
                  className="flex items-center gap-3 px-3 py-2 bg-slate-800/40 hover:bg-slate-800/70 border border-slate-800 rounded-lg transition-colors"
                >
                  <Badge
                    variant="outline"
                    className={
                      e.tipo === 'NF'
                        ? 'border-blue-500/40 text-blue-300 text-[10px]'
                        : 'border-amber-500/40 text-amber-300 text-[10px]'
                    }
                  >
                    {e.tipo}
                  </Badge>
                  <div className="flex-1 min-w-0">
                    <div className="text-sm text-white truncate font-medium">{e.identificador}</div>
                    {e.fornecedor && e.tipo === 'NF' && (
                      <div className="text-[11px] text-slate-500 truncate">{e.fornecedor}</div>
                    )}
                  </div>
                  <div className="text-right">
                    <div className="text-xs text-cyan-300 font-medium">→ {e.categoria}</div>
                    {e.centroCusto && (
                      <div className="text-[10px] text-slate-500">{e.centroCusto}</div>
                    )}
                    {e.aprendidoEm && (
                      <div className="text-[9px] text-slate-600 mt-0.5">
                        {new Date(e.aprendidoEm).toLocaleDateString('pt-BR')}
                      </div>
                    )}
                  </div>
                  <button
                    onClick={() => removerEntrada(e.key)}
                    className="p-1.5 hover:bg-red-500/20 rounded text-slate-500 hover:text-red-400 transition-colors"
                    title="Remover esta regra"
                  >
                    <Trash2 className="h-3.5 w-3.5" />
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>

        <div className="pt-3 border-t border-slate-800 flex items-center justify-between text-xs text-slate-500">
          <span>{entradas.length} regra{entradas.length !== 1 ? 's' : ''} aprendida{entradas.length !== 1 ? 's' : ''}</span>
          <Button variant="outline" size="sm" onClick={() => onOpenChange(false)} className="border-slate-700">
            Fechar
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
