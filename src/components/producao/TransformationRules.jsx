import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Plus, Trash2, Settings2 } from 'lucide-react';

export default function TransformationRules({ transformacoes = [], onChange }) {
  const [expandido, setExpandido] = useState(false);
  const [novaRegra, setNovaRegra] = useState({
    campo: '',
    tipo_transformacao: 'nenhuma',
    formato: '',
    casas_decimais: 2
  });

  const campos = [
    { value: 'codigo', label: 'Código' },
    { value: 'nome', label: 'Nome' },
    { value: 'marca', label: 'Marca' },
    { value: 'peso_unitario', label: 'Peso Unitário' },
    { value: 'quantidade', label: 'Quantidade' },
    { value: 'responsavel', label: 'Responsável' },
    { value: 'data_inicio', label: 'Data Início' },
    { value: 'data_fim_prevista', label: 'Data Fim Prevista' },
    { value: 'observacoes', label: 'Observações' }
  ];

  const tiposTransformacao = [
    { value: 'nenhuma', label: 'Nenhuma' },
    { value: 'data', label: 'Converter Data' },
    { value: 'numero', label: 'Converter Número' },
    { value: 'texto', label: 'Converter Texto' },
    { value: 'maiuscula', label: 'Maiúscula' },
    { value: 'minuscula', label: 'Minúscula' },
    { value: 'trim', label: 'Remover Espaços' }
  ];

  const adicionarRegra = () => {
    if (!novaRegra.campo || novaRegra.tipo_transformacao === 'nenhuma') {
      alert('Selecione um campo e um tipo de transformação');
      return;
    }

    const regraNova = { ...novaRegra };
    onChange([...transformacoes, regraNova]);
    setNovaRegra({
      campo: '',
      tipo_transformacao: 'nenhuma',
      formato: '',
      casas_decimais: 2
    });
  };

  const removerRegra = (index) => {
    onChange(transformacoes.filter((_, i) => i !== index));
  };

  const getNomeCampo = (value) => campos.find(c => c.value === value)?.label || value;
  const getNomeTipoTransformacao = (value) => tiposTransformacao.find(t => t.value === value)?.label || value;

  return (
    <Card className="border-purple-200 bg-purple-50">
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <CardTitle className="text-sm flex items-center gap-2">
            <Settings2 className="h-4 w-4 text-purple-600" />
            Regras de Transformação de Dados
          </CardTitle>
          <Button
            variant="outline"
            size="sm"
            onClick={() => setExpandido(!expandido)}
            className="text-purple-700 border-purple-200 hover:bg-purple-100"
          >
            {expandido ? 'Ocultar' : 'Configurar'}
          </Button>
        </div>
      </CardHeader>

      {expandido && (
        <CardContent className="space-y-4">
          {/* Lista de Transformações */}
          {transformacoes.length > 0 && (
            <div className="space-y-2">
              <Label className="text-xs font-semibold text-purple-900">Transformações Ativas</Label>
              <div className="space-y-2">
                {transformacoes.map((regra, idx) => (
                  <div key={idx} className="flex items-center justify-between bg-white p-3 rounded-lg border border-purple-200">
                    <div className="flex-1">
                      <p className="text-sm font-medium text-slate-900">
                        {getNomeCampo(regra.campo)}
                      </p>
                      <p className="text-xs text-slate-600">
                        {getNomeTipoTransformacao(regra.tipo_transformacao)}
                        {regra.formato && ` - ${regra.formato}`}
                      </p>
                    </div>
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => removerRegra(idx)}
                      className="text-red-600 hover:bg-red-50"
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Adicionar Nova Regra */}
          <div className="border-t border-purple-200 pt-4 space-y-3">
            <Label className="text-xs font-semibold text-purple-900">Adicionar Nova Transformação</Label>

            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-2">
                <Label className="text-xs">Campo</Label>
                <Select value={novaRegra.campo} onValueChange={(value) => setNovaRegra({ ...novaRegra, campo: value })}>
                  <SelectTrigger className="text-sm">
                    <SelectValue placeholder="Selecione" />
                  </SelectTrigger>
                  <SelectContent>
                    {campos.map(campo => (
                      <SelectItem key={campo.value} value={campo.value}>{campo.label}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label className="text-xs">Transformação</Label>
                <Select value={novaRegra.tipo_transformacao} onValueChange={(value) => setNovaRegra({ ...novaRegra, tipo_transformacao: value })}>
                  <SelectTrigger className="text-sm">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {tiposTransformacao.map(tipo => (
                      <SelectItem key={tipo.value} value={tipo.value}>{tipo.label}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            {/* Campos de Configuração Específica */}
            {novaRegra.tipo_transformacao === 'data' && (
              <div className="space-y-2">
                <Label className="text-xs">Formato (ex: YYYY-MM-DD, DD/MM/YYYY)</Label>
                <Input
                  placeholder="YYYY-MM-DD"
                  value={novaRegra.formato}
                  onChange={(e) => setNovaRegra({ ...novaRegra, formato: e.target.value })}
                  className="text-sm"
                />
              </div>
            )}

            {novaRegra.tipo_transformacao === 'numero' && (
              <div className="space-y-2">
                <Label className="text-xs">Casas Decimais</Label>
                <Input
                  type="number"
                  min="0"
                  max="10"
                  value={novaRegra.casas_decimais}
                  onChange={(e) => setNovaRegra({ ...novaRegra, casas_decimais: parseInt(e.target.value) })}
                  className="text-sm"
                />
              </div>
            )}

            <Button
              onClick={adicionarRegra}
              size="sm"
              className="w-full bg-purple-600 hover:bg-purple-700"
            >
              <Plus className="h-4 w-4 mr-2" />
              Adicionar Transformação
            </Button>
          </div>
        </CardContent>
      )}
    </Card>
  );
}