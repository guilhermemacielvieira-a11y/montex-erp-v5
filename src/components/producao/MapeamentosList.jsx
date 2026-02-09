import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';


import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Trash2, Save, Download } from 'lucide-react';
import { toast } from 'sonner';
import { base44 } from '@/api/base44Client';

export default function MapeamentosList({ 
  mapeamentos = [], 
  onSelect, 
  onSaved,
  mapeamentoAtual,
  transformacoes,
  colunaEtapa
}) {
  const [mapeamentosSalvos, setMapeamentosSalvos] = useState(mapeamentos);
  const [showSaveDialog, setShowSaveDialog] = useState(false);
  const [nomeMapeamento, setNomeMapeamento] = useState('');
  const [descricao, setDescricao] = useState('');
  const [salvando, setSalvando] = useState(false);

  const salvarMapeamento = async () => {
    if (!nomeMapeamento.trim()) {
      toast.error('Digite um nome para o mapeamento');
      return;
    }

    setSalvando(true);
    try {
      const novoMapeamento = {
        nome: nomeMapeamento,
        descricao,
        mapeamento: mapeamentoAtual,
        transformacoes: transformacoes || [],
        coluna_etapa: colunaEtapa,
        ativo: true
      };

      await base44.entities.MapeamentoPredefinido.create(novoMapeamento);
      
      setMapeamentosSalvos([...mapeamentosSalvos, novoMapeamento]);
      setShowSaveDialog(false);
      setNomeMapeamento('');
      setDescricao('');
      
      toast.success('Mapeamento salvo com sucesso!');
      if (onSaved) onSaved();
    } catch (error) {
      console.error('Erro ao salvar mapeamento:', error);
      toast.error(`Erro ao salvar: ${error.message}`);
    }
    setSalvando(false);
  };

  const deletarMapeamento = async (id) => {
    if (!confirm('Deseja remover este mapeamento predefinido?')) return;

    try {
      await base44.entities.MapeamentoPredefinido.delete(id);
      setMapeamentosSalvos(mapeamentosSalvos.filter(m => m.id !== id));
      toast.success('Mapeamento removido');
    } catch (error) {
      toast.error('Erro ao remover mapeamento');
    }
  };

  return (
    <>
      <Card className="border-blue-200 bg-blue-50">
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between">
            <CardTitle className="text-sm flex items-center gap-2">
              <Download className="h-4 w-4 text-blue-600" />
              Mapeamentos Predefinidos
            </CardTitle>
            <Button
              onClick={() => setShowSaveDialog(true)}
              size="sm"
              className="bg-blue-600 hover:bg-blue-700"
            >
              <Save className="h-4 w-4 mr-2" />
              Salvar Mapeamento
            </Button>
          </div>
        </CardHeader>

        <CardContent className="space-y-3">
          {mapeamentosSalvos.length > 0 ? (
            <div className="space-y-2">
              <Label className="text-xs font-semibold text-blue-900">Carregar Mapeamento</Label>
              <div className="space-y-2">
                {mapeamentosSalvos.map((map) => (
                  <div key={map.id} className="flex items-center justify-between bg-white p-3 rounded-lg border border-blue-200 hover:border-blue-300">
                    <div className="flex-1 cursor-pointer" onClick={() => onSelect?.(map)}>
                      <p className="text-sm font-medium text-slate-900">{map.nome}</p>
                      {map.descricao && (
                        <p className="text-xs text-slate-600">{map.descricao}</p>
                      )}
                      {map.transformacoes?.length > 0 && (
                        <Badge variant="outline" className="mt-1 text-xs">
                          {map.transformacoes.length} transformações
                        </Badge>
                      )}
                    </div>
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => deletarMapeamento(map.id)}
                      className="text-red-600 hover:bg-red-50"
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                ))}
              </div>
            </div>
          ) : (
            <p className="text-xs text-slate-600 py-3">
              Nenhum mapeamento predefinido. Crie um novo salvando sua configuração.
            </p>
          )}
        </CardContent>
      </Card>

      {/* Dialog para Salvar */}
      <Dialog open={showSaveDialog} onOpenChange={setShowSaveDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Salvar Mapeamento Predefinido</DialogTitle>
          </DialogHeader>

          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label>Nome do Mapeamento *</Label>
              <Input
                placeholder="Ex: Mapeamento Projeto Gerdau"
                value={nomeMapeamento}
                onChange={(e) => setNomeMapeamento(e.target.value)}
              />
            </div>

            <div className="space-y-2">
              <Label>Descrição</Label>
              <Input
                placeholder="Ex: Mapeamento padrão para estruturas de aço"
                value={descricao}
                onChange={(e) => setDescricao(e.target.value)}
              />
            </div>

            <div className="bg-blue-50 border border-blue-200 rounded-lg p-3">
              <p className="text-xs text-blue-800">
                ✓ {Object.values(mapeamentoAtual || {}).filter(Boolean).length} campos mapeados
                {transformacoes?.length > 0 && ` + ${transformacoes.length} transformações`}
              </p>
            </div>
          </div>

          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setShowSaveDialog(false)}
            >
              Cancelar
            </Button>
            <Button
              onClick={salvarMapeamento}
              disabled={salvando}
              className="bg-blue-600 hover:bg-blue-700"
            >
              {salvando ? 'Salvando...' : 'Salvar'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}