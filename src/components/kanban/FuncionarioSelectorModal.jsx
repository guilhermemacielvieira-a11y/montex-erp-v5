/**
 * MONTEX ERP - Modal de Seleção de Funcionário
 *
 * Modal reutilizável que aparece ao mover peças no Kanban.
 * Permite selecionar o funcionário responsável pela operação.
 * Filtra por setor quando especificado.
 */

import React, { useState, useMemo } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Search, User, CheckCircle2, X, Briefcase } from 'lucide-react';
import { useERP } from '@/contexts/ERPContext';

// Mapeamento de etapas para setores relevantes
const SETORES_POR_ETAPA = {
  'corte': ['producao', 'fabricacao', 'corte'],
  'em_corte': ['producao', 'fabricacao', 'corte'],
  'conferencia': ['producao', 'fabricacao'],
  'fabricacao': ['fabricacao', 'producao'],
  'solda': ['solda', 'producao'],
  'pintura': ['pintura', 'producao', 'geral'],
  'expedido': ['geral', 'producao', 'montagem'],
};

export function FuncionarioSelectorModal({
  isOpen,
  onClose,
  onConfirm,
  setor = null,
  etapaLabel = 'Produção',
  pecaInfo = null,
}) {
  const [busca, setBusca] = useState('');
  const [selecionado, setSelecionado] = useState(null);
  const { funcionarios } = useERP();

  // Filtrar funcionários por setor e busca
  const funcionariosDisponiveis = useMemo(() => {
    let filtered = (funcionarios || []).filter(f => f.ativo !== false);

    // Filtrar por setor se especificado
    if (setor) {
      const setoresValidos = SETORES_POR_ETAPA[setor] || [setor];
      filtered = filtered.filter(f =>
        setoresValidos.includes(f.setor) || f.setor === 'geral'
      );
    }

    // Filtrar por busca
    if (busca.trim()) {
      const termo = busca.toLowerCase();
      filtered = filtered.filter(f =>
        f.nome?.toLowerCase().includes(termo) ||
        f.cargo?.toLowerCase().includes(termo)
      );
    }

    return filtered;
  }, [funcionarios, setor, busca]);

  const handleConfirm = () => {
    if (selecionado) {
      onConfirm(selecionado.id, selecionado.nome);
      setSelecionado(null);
      setBusca('');
    }
  };

  const handleClose = () => {
    setSelecionado(null);
    setBusca('');
    onClose();
  };

  return (
    <Dialog open={isOpen} onOpenChange={handleClose}>
      <DialogContent className="max-w-md bg-slate-900 border-slate-700 text-white">
        <DialogHeader>
          <DialogTitle className="text-lg font-bold text-white flex items-center gap-2">
            <User className="w-5 h-5 text-orange-400" />
            Selecionar Responsável — {etapaLabel}
          </DialogTitle>
        </DialogHeader>

        {/* Info da peça */}
        {pecaInfo && (
          <div className="bg-slate-800/50 rounded-lg p-3 border border-slate-700">
            <p className="text-xs text-slate-500 mb-1">Peça selecionada:</p>
            <p className="text-white font-medium text-sm">
              MARCA {pecaInfo.marca} — {pecaInfo.perfil || pecaInfo.tipo}
            </p>
            {pecaInfo.peso > 0 && (
              <p className="text-slate-400 text-xs mt-1">{pecaInfo.peso?.toFixed(1)} kg</p>
            )}
          </div>
        )}

        {/* Campo de busca */}
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500" />
          <Input
            placeholder="Buscar funcionário..."
            value={busca}
            onChange={(e) => setBusca(e.target.value)}
            className="pl-10 bg-slate-800 border-slate-600 text-white placeholder-slate-500"
          />
        </div>

        {/* Lista de funcionários */}
        <div className="max-h-64 overflow-y-auto space-y-1 pr-1">
          {funcionariosDisponiveis.length === 0 ? (
            <div className="text-center py-6 text-slate-500 text-sm">
              Nenhum funcionário encontrado
              {setor && <p className="text-xs mt-1">Setor: {setor}</p>}
            </div>
          ) : (
            funcionariosDisponiveis.map(func => (
              <button
                key={func.id}
                onClick={() => setSelecionado(func)}
                className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-left transition-all ${
                  selecionado?.id === func.id
                    ? 'bg-orange-500/20 border border-orange-500/50 text-orange-300'
                    : 'bg-slate-800/30 border border-transparent hover:bg-slate-800 hover:border-slate-600 text-slate-300'
                }`}
              >
                <div className={`w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold ${
                  selecionado?.id === func.id
                    ? 'bg-orange-500 text-white'
                    : 'bg-slate-700 text-slate-300'
                }`}>
                  {func.nome?.charAt(0).toUpperCase()}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="font-medium text-sm truncate">{func.nome}</p>
                  <p className="text-xs text-slate-500 flex items-center gap-1">
                    <Briefcase className="w-3 h-3" />
                    {func.cargo || 'Sem cargo'}
                  </p>
                </div>
                {selecionado?.id === func.id && (
                  <CheckCircle2 className="w-5 h-5 text-orange-400 flex-shrink-0" />
                )}
              </button>
            ))
          )}
        </div>

        {/* Botões */}
        <div className="flex gap-3 pt-2">
          <Button
            variant="outline"
            onClick={handleClose}
            className="flex-1 border-slate-600 text-slate-300 hover:bg-slate-800"
          >
            <X className="w-4 h-4 mr-2" />
            Cancelar
          </Button>
          <Button
            onClick={handleConfirm}
            disabled={!selecionado}
            className="flex-1 bg-orange-600 hover:bg-orange-700 text-white disabled:opacity-40"
          >
            <CheckCircle2 className="w-4 h-4 mr-2" />
            Confirmar
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
