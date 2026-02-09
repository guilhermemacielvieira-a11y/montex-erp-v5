import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import { BookmarkPlus, Bookmark, Trash2 } from 'lucide-react';
import { toast } from 'sonner';

export default function FiltrosSalvos({ filtros, onCarregarFiltro }) {
  const [mostrarModal, setMostrarModal] = useState(false);
  const [nomeFiltro, setNomeFiltro] = useState('');
  const queryClient = useQueryClient();

  const { data: filtrosSalvos = [] } = useQuery({
    queryKey: ['filtros-salvos'],
    queryFn: () => base44.entities.FiltroPersonalizado.list('-created_date', 50)
  });

  const criarFiltroMutation = useMutation({
    mutationFn: (dados) => base44.entities.FiltroPersonalizado.create(dados),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['filtros-salvos'] });
      toast.success('Filtro salvo!');
      setNomeFiltro('');
      setMostrarModal(false);
    }
  });

  const deletarFiltroMutation = useMutation({
    mutationFn: (id) => base44.entities.FiltroPersonalizado.delete(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['filtros-salvos'] });
      toast.success('Filtro removido!');
    }
  });

  const handleSalvarFiltro = async () => {
    if (!nomeFiltro.trim()) {
      toast.error('Digite um nome para o filtro');
      return;
    }
    
    await criarFiltroMutation.mutateAsync({
      nome: nomeFiltro,
      filtros: {
        dataInicio: filtros.dataInicio,
        dataFim: filtros.dataFim,
        tipos: filtros.tipos,
        categorias: filtros.categorias,
        status: filtros.status,
        projetos: filtros.projetos
      }
    });
  };

  return (
    <div className="flex items-center gap-2">
      {/* Botão Salvar Filtro */}
      <Dialog open={mostrarModal} onOpenChange={setMostrarModal}>
        <DialogTrigger asChild>
          <Button variant="outline" size="sm" className="gap-2">
            <BookmarkPlus className="h-4 w-4" />
            Salvar Filtro
          </Button>
        </DialogTrigger>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Salvar Filtro Personalizado</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <Input
              placeholder="Nome do filtro"
              value={nomeFiltro}
              onChange={(e) => setNomeFiltro(e.target.value)}
            />
            <div className="flex justify-end gap-3">
              <Button variant="outline" onClick={() => setMostrarModal(false)}>
                Cancelar
              </Button>
              <Button
                onClick={handleSalvarFiltro}
                disabled={criarFiltroMutation.isPending}
                className="bg-blue-600 hover:bg-blue-700"
              >
                Salvar
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Dropdown Filtros Salvos */}
      {filtrosSalvos.length > 0 && (
        <div className="relative group">
          <Button variant="outline" size="sm" className="gap-2">
            <Bookmark className="h-4 w-4" />
            Meus Filtros ({filtrosSalvos.length})
          </Button>
          <div className="absolute hidden group-hover:flex flex-col right-0 top-full mt-2 bg-white border border-slate-200 rounded-lg shadow-lg z-50 min-w-64">
            {filtrosSalvos.map((filtro) => (
              <div
                key={filtro.id}
                className="flex items-center justify-between p-3 hover:bg-slate-50 border-b last:border-b-0 group/item"
              >
                <div className="flex-1 cursor-pointer" onClick={() => {
                  onCarregarFiltro(filtro.filtros);
                  toast.success('Filtro carregado!');
                }}>
                  <p className="font-medium text-sm">{filtro.nome}</p>
                  {filtro.descricao && (
                    <p className="text-xs text-slate-500">{filtro.descricao}</p>
                  )}
                </div>
                <Button
                  size="icon"
                  variant="ghost"
                  className="h-7 w-7 text-red-600 hover:text-red-700 opacity-0 group-hover/item:opacity-100"
                  onClick={() => deletarFiltroMutation.mutate(filtro.id)}
                >
                  <Trash2 className="h-3 w-3" />
                </Button>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}