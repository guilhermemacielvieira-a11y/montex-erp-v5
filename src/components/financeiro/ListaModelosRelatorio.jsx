import React from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Copy, Trash2, FileText } from 'lucide-react';
import { toast } from 'sonner';

const TIPOS_LABELS = {
  fluxo_caixa: 'Fluxo de Caixa',
  despesas: 'Despesas',
  receitas: 'Receitas',
  rentabilidade: 'Rentabilidade',
  completo: 'Completo',
};

const FORMATOS_CORES = {
  pdf: 'bg-red-100 text-red-700',
  xlsx: 'bg-green-100 text-green-700',
  csv: 'bg-blue-100 text-blue-700',
};

export default function ListaModelosRelatorio() {
  const queryClient = useQueryClient();

  const { data: modelos = [], isLoading } = useQuery({
    queryKey: ['modelos-relatorio'],
    queryFn: () => base44.entities.ModeloRelatorio.list('-created_date', 100),
  });

  const deletarMutation = useMutation({
    mutationFn: (id) => base44.entities.ModeloRelatorio.delete(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['modelos-relatorio'] });
      toast.success('Modelo deletado');
    },
  });

  const duplicarMutation = useMutation({
    mutationFn: async (modelo) => {
      const { id, created_date, updated_date, created_by, ...dados } = modelo;
      return base44.entities.ModeloRelatorio.create({
        ...dados,
        nome: `${dados.nome} (Cópia)`,
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['modelos-relatorio'] });
      toast.success('Modelo duplicado com sucesso!');
    },
  });

  if (isLoading) {
    return (
      <Card>
        <CardContent className="p-8 text-center">
          <p className="text-sm text-slate-600">Carregando modelos...</p>
        </CardContent>
      </Card>
    );
  }

  if (modelos.length === 0) {
    return (
      <Card>
        <CardContent className="p-8 text-center">
          <FileText className="h-12 w-12 text-slate-300 mx-auto mb-3" />
          <p className="text-slate-600 font-medium">Nenhum modelo criado</p>
          <p className="text-sm text-slate-500 mt-1">Clique em "Novo Modelo" para começar</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="overflow-x-auto border rounded-lg">
      <Table>
        <TableHeader>
          <TableRow className="bg-slate-50">
            <TableHead>Nome</TableHead>
            <TableHead>Tipo</TableHead>
            <TableHead>Colunas</TableHead>
            <TableHead>Formatos</TableHead>
            <TableHead className="text-center">Opções</TableHead>
            <TableHead className="w-32"></TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {modelos.map(modelo => (
            <TableRow key={modelo.id} className={!modelo.ativo ? 'opacity-60' : ''}>
              <TableCell>
                <div>
                  <p className="font-medium text-sm">{modelo.nome}</p>
                  <p className="text-xs text-slate-500 mt-0.5">{modelo.descricao}</p>
                </div>
              </TableCell>
              <TableCell>
                <Badge className="bg-blue-100 text-blue-700">
                  {TIPOS_LABELS[modelo.tipo_relatorio]}
                </Badge>
              </TableCell>
              <TableCell className="text-sm">
                <div className="space-y-1">
                  {modelo.colunas.slice(0, 2).map(col => (
                    <div key={col} className="text-xs text-slate-600">{col}</div>
                  ))}
                  {modelo.colunas.length > 2 && (
                    <div className="text-xs text-slate-500">+{modelo.colunas.length - 2} mais</div>
                  )}
                </div>
              </TableCell>
              <TableCell>
                <div className="flex gap-1 flex-wrap">
                  {modelo.formato_saida.map(fmt => (
                    <Badge key={fmt} className={FORMATOS_CORES[fmt]}>
                      {fmt.toUpperCase()}
                    </Badge>
                  ))}
                </div>
              </TableCell>
              <TableCell>
                <div className="flex justify-center gap-2 text-xs">
                  {modelo.incluir_graficos && (
                    <Badge variant="outline" className="text-xs">Gráficos</Badge>
                  )}
                  {modelo.incluir_resumo && (
                    <Badge variant="outline" className="text-xs">Resumo</Badge>
                  )}
                </div>
              </TableCell>
              <TableCell>
                <div className="flex gap-1 justify-end">
                  <Button
                    size="sm"
                    variant="ghost"
                    onClick={() => duplicarMutation.mutate(modelo)}
                    disabled={duplicarMutation.isPending}
                    title="Duplicar"
                  >
                    <Copy className="h-3 w-3" />
                  </Button>
                  <Button
                    size="sm"
                    variant="ghost"
                    onClick={() => deletarMutation.mutate(modelo.id)}
                    disabled={deletarMutation.isPending}
                    className="text-red-600 hover:text-red-700"
                    title="Deletar"
                  >
                    <Trash2 className="h-3 w-3" />
                  </Button>
                </div>
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  );
}