import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { AlertCircle } from 'lucide-react';

const SYSTEM_FIELDS = [
  { id: 'codigo', label: 'Código do Item', required: false },
  { id: 'nome', label: 'Nome/Descrição', required: true },
  { id: 'marca', label: 'Marca/Especificação', required: false },
  { id: 'peso_unitario', label: 'Peso Unitário (kg)', required: false, type: 'number' },
  { id: 'quantidade', label: 'Quantidade', required: true, type: 'number' },
  { id: 'etapa', label: 'Etapa (Fabricação/Montagem)', required: true },
  { id: 'responsavel', label: 'Responsável', required: false },
  { id: 'data_inicio', label: 'Data Início', required: false, type: 'date' },
  { id: 'data_fim_prevista', label: 'Data Fim Prevista', required: false, type: 'date' },
  { id: 'observacoes', label: 'Observações', required: false },
];

export default function ColumnMapper({ columns, onMapComplete, onCancel }) {
  const [mapping, setMapping] = useState({});
  const [etapaColumn, setEtapaColumn] = useState('');

  const handleMapChange = (fieldId, columnName) => {
    setMapping(prev => ({
      ...prev,
      [fieldId]: columnName
    }));
  };

  const getUnmappedColumns = () => {
    const mapped = Object.values(mapping).filter(Boolean);
    return columns.filter(col => !mapped.includes(col));
  };

  const requiredFieldsMapped = SYSTEM_FIELDS
    .filter(f => f.required)
    .every(f => mapping[f.id]);

  const handleConfirm = () => {
    if (!etapaColumn) {
      alert('Selecione a coluna para Etapa');
      return;
    }
    if (!requiredFieldsMapped) {
      alert('Mapeie todos os campos obrigatórios');
      return;
    }
    onMapComplete({ mapping, etapaColumn });
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base flex items-center gap-2">
          <AlertCircle className="h-4 w-4 text-amber-600" />
          Mapear Colunas da Planilha
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="bg-amber-50 border border-amber-200 rounded-lg p-3 text-sm text-amber-800">
          <p>Especifique qual coluna da sua planilha corresponde a cada campo do sistema.</p>
        </div>

        <div className="space-y-3 max-h-96 overflow-y-auto">
          {SYSTEM_FIELDS.map(field => (
            <div key={field.id} className="space-y-1">
              <Label className="text-sm">
                {field.label}
                {field.required && <span className="text-red-500 ml-1">*</span>}
                {field.type && <span className="text-xs text-slate-500 ml-1">({field.type})</span>}
              </Label>
              <Select value={mapping[field.id] || ''} onValueChange={(val) => handleMapChange(field.id, val)}>
                <SelectTrigger className="h-8 text-sm">
                  <SelectValue placeholder="Selecione coluna..." />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value={null}>-- Não importar --</SelectItem>
                  {columns.map(col => (
                    <SelectItem key={col} value={col}>
                      {col}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          ))}

          <div className="pt-4 border-t space-y-2">
            <Label className="text-sm font-semibold">Coluna de Etapa <span className="text-red-500">*</span></Label>
            <p className="text-xs text-slate-500">Selecione a coluna que identifica se é Fabricação ou Montagem</p>
            <Select value={etapaColumn} onValueChange={setEtapaColumn}>
              <SelectTrigger className="h-8 text-sm">
                <SelectValue placeholder="Selecione coluna de etapa..." />
              </SelectTrigger>
              <SelectContent>
                {columns.map(col => (
                  <SelectItem key={col} value={col}>
                    {col}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>

        <div className="flex justify-end gap-2 pt-4 border-t">
          <Button variant="outline" onClick={onCancel}>
            Cancelar
          </Button>
          <Button 
            onClick={handleConfirm}
            disabled={!requiredFieldsMapped || !etapaColumn}
            className="bg-emerald-600 hover:bg-emerald-700"
          >
            Confirmar Mapeamento
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}