import React, { useState } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { X, Filter } from 'lucide-react';

export default function FiltrosDinamicosIA({ filtrosDisponiveis, filtrosAtuais, onFiltrosChange }) {
  const [mostrandoFiltros, setMostrandoFiltros] = useState(false);

  const handleFiltroChange = (chave, valor) => {
    const novosFiltros = { ...filtrosAtuais, [chave]: valor };
    onFiltrosChange(novosFiltros);
  };

  const handleRemoverFiltro = (chave) => {
    const novosFiltros = { ...filtrosAtuais };
    delete novosFiltros[chave];
    onFiltrosChange(novosFiltros);
  };

  const filtrosAtivos = Object.keys(filtrosAtuais).length;

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <Button
          variant={mostrandoFiltros ? 'default' : 'outline'}
          className="gap-2"
          onClick={() => setMostrandoFiltros(!mostrandoFiltros)}
        >
          <Filter className="h-4 w-4" />
          Filtros
          {filtrosAtivos > 0 && (
            <Badge className="ml-2 bg-orange-600">{filtrosAtivos}</Badge>
          )}
        </Button>
      </div>

      {mostrandoFiltros && (
        <Card className="border-blue-200 bg-blue-50">
          <CardContent className="pt-6">
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {Object.entries(filtrosDisponiveis).map(([chave, { label, opcoes, tipo }]) => (
                <div key={chave} className="space-y-2">
                  <label className="text-sm font-medium text-slate-700">{label}</label>
                  
                  {tipo === 'select' ? (
                    <Select
                      value={filtrosAtuais[chave] || ''}
                      onValueChange={(valor) => handleFiltroChange(chave, valor)}
                    >
                      <SelectTrigger className="bg-white">
                        <SelectValue placeholder="Selecionar..." />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value={null}>Todos</SelectItem>
                        {opcoes.map((opcao) => (
                          <SelectItem key={opcao.id} value={opcao.id}>
                            {opcao.label}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  ) : tipo === 'multi' ? (
                    <div className="space-y-2">
                      {opcoes.map((opcao) => (
                        <label key={opcao.id} className="flex items-center gap-2 cursor-pointer">
                          <input
                            type="checkbox"
                            checked={(filtrosAtuais[chave] || []).includes(opcao.id)}
                            onChange={(e) => {
                              const valores = filtrosAtuais[chave] || [];
                              if (e.target.checked) {
                                handleFiltroChange(chave, [...valores, opcao.id]);
                              } else {
                                handleFiltroChange(chave, valores.filter(v => v !== opcao.id));
                              }
                            }}
                            className="rounded"
                          />
                          <span className="text-sm text-slate-700">{opcao.label}</span>
                        </label>
                      ))}
                    </div>
                  ) : (
                    <input
                      type={tipo}
                      value={filtrosAtuais[chave] || ''}
                      onChange={(e) => handleFiltroChange(chave, e.target.value)}
                      className="w-full px-3 py-2 border border-slate-300 rounded-md text-sm"
                      placeholder="Digite um valor..."
                    />
                  )}
                </div>
              ))}
            </div>

            {filtrosAtivos > 0 && (
              <div className="mt-4 pt-4 border-t border-blue-200">
                <Button
                  variant="ghost"
                  onClick={() => onFiltrosChange({})}
                  className="text-blue-600 hover:text-blue-700 hover:bg-blue-100"
                >
                  Limpar todos os filtros
                </Button>
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {filtrosAtivos > 0 && (
        <div className="flex flex-wrap gap-2">
          {Object.entries(filtrosAtuais).map(([chave, valor]) => {
            const filtro = filtrosDisponiveis[chave];
            if (!filtro) return null;

            let label = valor;
            if (filtro.tipo === 'select') {
              const opcao = filtro.opcoes.find(o => o.id === valor);
              label = opcao?.label || valor;
            }

            return (
              <Badge
                key={chave}
                variant="secondary"
                className="flex items-center gap-2 px-3 py-1.5 bg-blue-100 text-blue-800 border-blue-300"
              >
                <span className="text-xs font-medium">{label}</span>
                <button
                  onClick={() => handleRemoverFiltro(chave)}
                  className="ml-1 hover:bg-blue-200 rounded-full p-0.5"
                >
                  <X className="h-3 w-3" />
                </button>
              </Badge>
            );
          })}
        </div>
      )}
    </div>
  );
}