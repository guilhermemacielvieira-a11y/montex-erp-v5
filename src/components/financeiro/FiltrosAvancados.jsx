import React from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { X, Filter } from 'lucide-react';

const tiposMovimentacao = [
  { id: 'entrada', label: 'Receita' },
  { id: 'saida', label: 'Despesa' },
];

const categorias = [
  { id: 'receita_projeto', label: 'Receita do Projeto' },
  { id: 'adiantamento', label: 'Adiantamento' },
  { id: 'pagamento_final', label: 'Pagamento Final' },
  { id: 'compra_material', label: 'Compra de Material' },
  { id: 'mao_de_obra', label: 'Mão de Obra' },
  { id: 'transporte', label: 'Transporte' },
  { id: 'equipamento', label: 'Equipamento' },
  { id: 'despesa_administrativa', label: 'Despesa Administrativa' },
  { id: 'impostos', label: 'Impostos' },
  { id: 'outros', label: 'Outros' },
];

const status = [
  { id: 'previsto', label: 'Previsto' },
  { id: 'realizado', label: 'Realizado' },
  { id: 'cancelado', label: 'Cancelado' },
];

export default function FiltrosAvancados({
  filtros,
  onFiltrosChange,
  projetos = [],
}) {
  const [mostrarFiltros, setMostrarFiltros] = React.useState(false);

  const handleAddFiltro = (tipo, valor) => {
    const filtrosAtivos = filtros[tipo] || [];
    if (!filtrosAtivos.includes(valor)) {
      onFiltrosChange({
        ...filtros,
        [tipo]: [...filtrosAtivos, valor],
      });
    }
  };

  const handleRemoverFiltro = (tipo, valor) => {
    const filtrosAtivos = filtros[tipo] || [];
    onFiltrosChange({
      ...filtros,
      [tipo]: filtrosAtivos.filter(f => f !== valor),
    });
  };

  const handleLimparTodos = () => {
    onFiltrosChange({
      dataInicio: new Date(new Date().setMonth(new Date().getMonth() - 3)).toISOString().split('T')[0],
      dataFim: new Date().toISOString().split('T')[0],
      tipos: [],
      categorias: [],
      status: [],
      projetos: [],
    });
  };

  const temFiltrosAtivos = 
    (filtros.tipos?.length > 0) ||
    (filtros.categorias?.length > 0) ||
    (filtros.status?.length > 0) ||
    (filtros.projetos?.length > 0);

  return (
    <Card>
      <CardContent className="p-4">
        {/* Header com botão */}
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2">
            <Filter className="h-4 w-4 text-slate-600" />
            <span className="font-medium text-slate-700">Filtros</span>
            {temFiltrosAtivos && (
              <Badge variant="default" className="ml-2">
                {(filtros.tipos?.length || 0) + (filtros.categorias?.length || 0) + (filtros.status?.length || 0) + (filtros.projetos?.length || 0)} ativos
              </Badge>
            )}
          </div>
          <Button
            size="sm"
            variant="ghost"
            onClick={() => setMostrarFiltros(!mostrarFiltros)}
            className="text-sm"
          >
            {mostrarFiltros ? 'Ocultar' : 'Mostrar'}
          </Button>
        </div>

        {mostrarFiltros && (
          <div className="space-y-4 border-t pt-4">
            {/* Período */}
            <div>
              <Label className="text-sm mb-2 block font-medium">Período</Label>
              <div className="grid grid-cols-2 gap-3">
                <Input
                  type="date"
                  value={filtros.dataInicio}
                  onChange={(e) => onFiltrosChange({ ...filtros, dataInicio: e.target.value })}
                />
                <Input
                  type="date"
                  value={filtros.dataFim}
                  onChange={(e) => onFiltrosChange({ ...filtros, dataFim: e.target.value })}
                />
              </div>
            </div>

            {/* Tipo de Movimentação */}
            <div>
              <Label className="text-sm mb-2 block font-medium">Tipo de Movimentação</Label>
              <div className="flex gap-2 flex-wrap">
                {tiposMovimentacao.map(tipo => (
                  <Badge
                    key={tipo.id}
                    variant="outline"
                    className={`cursor-pointer ${
                      filtros.tipos?.includes(tipo.id)
                        ? 'bg-blue-100 text-blue-700 border-blue-300'
                        : 'hover:bg-slate-100'
                    }`}
                    onClick={() => {
                      if (filtros.tipos?.includes(tipo.id)) {
                        handleRemoverFiltro('tipos', tipo.id);
                      } else {
                        handleAddFiltro('tipos', tipo.id);
                      }
                    }}
                  >
                    {tipo.label}
                  </Badge>
                ))}
              </div>
            </div>

            {/* Categoria */}
            <div>
              <Label className="text-sm mb-2 block font-medium">Categoria</Label>
              <div className="space-y-2">
                <Select onValueChange={(value) => handleAddFiltro('categorias', value)}>
                  <SelectTrigger>
                    <SelectValue placeholder="Adicionar categoria..." />
                  </SelectTrigger>
                  <SelectContent>
                    {categorias.map(cat => (
                      <SelectItem key={cat.id} value={cat.id}>
                        {cat.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                {filtros.categorias?.length > 0 && (
                  <div className="flex gap-2 flex-wrap mt-2">
                    {filtros.categorias.map(catId => {
                      const cat = categorias.find(c => c.id === catId);
                      return (
                        <Badge key={catId} className="bg-purple-100 text-purple-700 flex items-center gap-1">
                          {cat?.label}
                          <X
                            className="h-3 w-3 cursor-pointer"
                            onClick={() => handleRemoverFiltro('categorias', catId)}
                          />
                        </Badge>
                      );
                    })}
                  </div>
                )}
              </div>
            </div>

            {/* Status */}
            <div>
              <Label className="text-sm mb-2 block font-medium">Status</Label>
              <div className="flex gap-2 flex-wrap">
                {status.map(s => (
                  <Badge
                    key={s.id}
                    variant="outline"
                    className={`cursor-pointer ${
                      filtros.status?.includes(s.id)
                        ? 'bg-green-100 text-green-700 border-green-300'
                        : 'hover:bg-slate-100'
                    }`}
                    onClick={() => {
                      if (filtros.status?.includes(s.id)) {
                        handleRemoverFiltro('status', s.id);
                      } else {
                        handleAddFiltro('status', s.id);
                      }
                    }}
                  >
                    {s.label}
                  </Badge>
                ))}
              </div>
            </div>

            {/* Projeto */}
            <div>
              <Label className="text-sm mb-2 block font-medium">Projeto</Label>
              <div className="space-y-2">
                <Select onValueChange={(value) => handleAddFiltro('projetos', value)}>
                  <SelectTrigger>
                    <SelectValue placeholder="Adicionar projeto..." />
                  </SelectTrigger>
                  <SelectContent>
                    {projetos.map(proj => (
                      <SelectItem key={proj.id} value={proj.id}>
                        {proj.nome}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                {filtros.projetos?.length > 0 && (
                  <div className="flex gap-2 flex-wrap mt-2">
                    {filtros.projetos.map(projId => {
                      const proj = projetos.find(p => p.id === projId);
                      return (
                        <Badge key={projId} className="bg-orange-100 text-orange-700 flex items-center gap-1">
                          {proj?.nome}
                          <X
                            className="h-3 w-3 cursor-pointer"
                            onClick={() => handleRemoverFiltro('projetos', projId)}
                          />
                        </Badge>
                      );
                    })}
                  </div>
                )}
              </div>
            </div>

            {/* Botão Limpar */}
            {temFiltrosAtivos && (
              <Button
                size="sm"
                variant="outline"
                onClick={handleLimparTodos}
                className="w-full mt-4"
              >
                Limpar Todos os Filtros
              </Button>
            )}
          </div>
        )}
      </CardContent>
    </Card>
  );
}