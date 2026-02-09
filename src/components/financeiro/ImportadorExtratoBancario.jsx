import React, { useState } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Label } from '@/components/ui/label';
import { FileUp, Check, AlertCircle, Loader2, ChevronRight } from 'lucide-react';
import * as XLSX from 'xlsx';
import { toast } from 'sonner';

const MAPEAMENTOS_COMUNS = {
  itau: {
    nome: 'Itaú',
    colunasEsperadas: ['Data', 'Descrição', 'Valor'],
    mapeamento: { data: 'Data', descricao: 'Descrição', valor: 'Valor' }
  },
  bb: {
    nome: 'Banco do Brasil',
    colunasEsperadas: ['DT_LANCAMENTO', 'DS_HISTORICO', 'VL_LANCAMENTO'],
    mapeamento: { data: 'DT_LANCAMENTO', descricao: 'DS_HISTORICO', valor: 'VL_LANCAMENTO' }
  },
  caixa: {
    nome: 'Caixa Econômica',
    colunasEsperadas: ['Data', 'Descrição', 'Débito/Crédito'],
    mapeamento: { data: 'Data', descricao: 'Descrição', valor: 'Débito/Crédito' }
  },
  generico: {
    nome: 'Genérico (Selecionar Colunas)',
    colunasEsperadas: [],
    mapeamento: { data: '', descricao: '', valor: '' }
  }
};

export default function ImportadorExtratoBancario() {
  const [mostrarModal, setMostrarModal] = useState(false);
  const [etapa, setEtapa] = useState('upload'); // 'upload', 'mapeamento', 'preview', 'loading', 'sucesso'
  const [bancoSelecionado, setBancoSelecionado] = useState('generico');
  const [dadosOriginais, setDadosOriginais] = useState([]);
  const [dadosPreview, setDadosPreview] = useState([]);
  const [mapeamento, setMapeamento] = useState(MAPEAMENTOS_COMUNS.generico.mapeamento);
  const [colunasDisponiveis, setColunasDisponiveis] = useState([]);
  const [erros, setErros] = useState([]);
  const queryClient = useQueryClient();

  const importarMutation = useMutation({
    mutationFn: async (dados) => {
      const movimentacoes = dados.map(item => {
        const valor = parseFloat(
          item.valor.toString().replace(/[^\d,.-]/g, '').replace(',', '.')
        );
        
        return {
          tipo: valor > 0 ? 'entrada' : 'saida',
          categoria: valor > 0 ? 'receita_projeto' : 'compra_material',
          descricao: item.descricao,
          valor: Math.abs(valor),
          data_movimentacao: new Date(item.data).toISOString().split('T')[0],
          forma_pagamento: 'transferencia',
          status: 'realizado',
          observacoes: 'Importado de extrato bancário',
        };
      });

      for (let i = 0; i < movimentacoes.length; i += 10) {
        const lote = movimentacoes.slice(i, i + 10);
        await base44.entities.MovimentacaoFinanceira.bulkCreate(lote);
      }
    },
    onSuccess: async () => {
      await new Promise(resolve => setTimeout(resolve, 500));
      await queryClient.invalidateQueries({ queryKey: ['movimentacoes'] });
      await queryClient.invalidateQueries({ queryKey: ['movimentacoes-obra'] });
      
      toast.success(`${dadosPreview.length} transações importadas do extrato!`);
      setEtapa('sucesso');
      
      setTimeout(() => {
        setMostrarModal(false);
        setEtapa('upload');
        setDadosOriginais([]);
        setDadosPreview([]);
        setBancoSelecionado('generico');
      }, 1500);
    },
    onError: () => {
      toast.error('Erro ao importar extrato');
      setEtapa('mapeamento');
    }
  });

  const handleArquivo = async (event) => {
    const arquivo = event.target.files?.[0];
    if (!arquivo) return;

    try {
      const dados = await arquivo.arrayBuffer();
      const workbook = XLSX.read(dados, { type: 'array' });
      const worksheet = workbook.Sheets[workbook.SheetNames[0]];
      const linhas = XLSX.utils.sheet_to_json(worksheet);

      if (linhas.length === 0) {
        setErros(['Arquivo vazio']);
        return;
      }

      const colunas = Object.keys(linhas[0]);
      setColunasDisponiveis(colunas);
      setDadosOriginais(linhas);

      // Se selecionou um banco específico, usar mapeamento automático
      if (bancoSelecionado !== 'generico') {
        const config = MAPEAMENTOS_COMUNS[bancoSelecionado];
        setMapeamento(config.mapeamento);
      }

      setErros([]);
      setEtapa('mapeamento');
    } catch (error) {
      setErros(['Erro ao ler arquivo']);
      console.error(error);
    }
  };

  const handleAplicarMapeamento = () => {
    // Validar mapeamento
    if (!mapeamento.data || !mapeamento.descricao || !mapeamento.valor) {
      setErros(['Mapeie todas as colunas obrigatórias']);
      return;
    }

    // Processar dados com mapeamento
    const processados = dadosOriginais.map(linha => ({
      data: linha[mapeamento.data],
      descricao: linha[mapeamento.descricao],
      valor: linha[mapeamento.valor],
    })).filter(item => item.data && item.descricao && item.valor);

    setDadosPreview(processados);
    setErros([]);
    setEtapa('preview');
  };

  return (
    <Dialog open={mostrarModal} onOpenChange={setMostrarModal}>
      <DialogTrigger asChild>
        <Button variant="outline" size="sm" className="gap-2">
          <FileUp className="h-4 w-4" />
          Extrato Bancário
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Importar Extrato Bancário</DialogTitle>
        </DialogHeader>

        {etapa === 'upload' && (
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label className="text-sm font-medium">Selecione seu banco</Label>
              <Select value={bancoSelecionado} onValueChange={setBancoSelecionado}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {Object.entries(MAPEAMENTOS_COMUNS).map(([key, config]) => (
                    <SelectItem key={key} value={key}>{config.nome}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="border-2 border-dashed border-slate-300 rounded-lg p-8 text-center">
              <FileUp className="h-8 w-8 mx-auto text-slate-400 mb-2" />
              <p className="text-sm text-slate-600 mb-4">Arquivo Excel com histórico de transações</p>
              <input
                type="file"
                accept=".xlsx,.xls,.csv"
                onChange={handleArquivo}
                className="hidden"
                id="arquivo-extrato"
              />
              <Button
                onClick={() => document.getElementById('arquivo-extrato').click()}
                className="bg-blue-600 hover:bg-blue-700"
              >
                Escolher Arquivo
              </Button>
            </div>

            {erros.length > 0 && (
              <div className="bg-red-50 border border-red-200 rounded-lg p-3">
                {erros.map((erro, idx) => (
                  <div key={idx} className="flex gap-2 text-sm text-red-700">
                    <AlertCircle className="h-4 w-4 mt-0.5 flex-shrink-0" />
                    {erro}
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {etapa === 'mapeamento' && (
          <div className="space-y-4 py-4">
            <div className="bg-blue-50 border border-blue-200 rounded-lg p-3">
              <p className="text-sm text-blue-700">
                Mapeie as colunas do arquivo para o sistema
              </p>
            </div>

            <div className="space-y-3">
              <div className="space-y-2">
                <Label className="text-sm">Data *</Label>
                <Select value={mapeamento.data} onValueChange={(v) => setMapeamento({...mapeamento, data: v})}>
                  <SelectTrigger>
                    <SelectValue placeholder="Selecione coluna de data" />
                  </SelectTrigger>
                  <SelectContent>
                    {colunasDisponiveis.map(col => (
                      <SelectItem key={col} value={col}>{col}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label className="text-sm">Descrição *</Label>
                <Select value={mapeamento.descricao} onValueChange={(v) => setMapeamento({...mapeamento, descricao: v})}>
                  <SelectTrigger>
                    <SelectValue placeholder="Selecione coluna de descrição" />
                  </SelectTrigger>
                  <SelectContent>
                    {colunasDisponiveis.map(col => (
                      <SelectItem key={col} value={col}>{col}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label className="text-sm">Valor *</Label>
                <Select value={mapeamento.valor} onValueChange={(v) => setMapeamento({...mapeamento, valor: v})}>
                  <SelectTrigger>
                    <SelectValue placeholder="Selecione coluna de valor" />
                  </SelectTrigger>
                  <SelectContent>
                    {colunasDisponiveis.map(col => (
                      <SelectItem key={col} value={col}>{col}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            {erros.length > 0 && (
              <div className="bg-red-50 border border-red-200 rounded-lg p-3">
                {erros.map((erro, idx) => (
                  <div key={idx} className="flex gap-2 text-sm text-red-700">
                    <AlertCircle className="h-4 w-4 mt-0.5 flex-shrink-0" />
                    {erro}
                  </div>
                ))}
              </div>
            )}

            <div className="flex justify-end gap-3 pt-4 border-t">
              <Button variant="outline" onClick={() => setEtapa('upload')}>
                Cancelar
              </Button>
              <Button onClick={handleAplicarMapeamento} className="bg-blue-600 hover:bg-blue-700 gap-2">
                Próximo <ChevronRight className="h-4 w-4" />
              </Button>
            </div>
          </div>
        )}

        {etapa === 'preview' && (
          <div className="space-y-4 py-4">
            <p className="text-sm text-slate-600 font-medium">
              Serão importadas {dadosPreview.length} transações:
            </p>
            <div className="border rounded-lg overflow-x-auto max-h-64 overflow-y-auto">
              <Table className="text-xs">
                <TableHeader className="sticky top-0 bg-slate-50">
                  <TableRow>
                    <TableHead>Data</TableHead>
                    <TableHead>Descrição</TableHead>
                    <TableHead className="text-right">Valor</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {dadosPreview.map((item, idx) => (
                    <TableRow key={idx}>
                      <TableCell>{new Date(item.data).toLocaleDateString('pt-BR')}</TableCell>
                      <TableCell className="font-medium">{item.descricao}</TableCell>
                      <TableCell className="text-right font-bold">
                        {parseFloat(item.valor.toString().replace(/[^\d,.-]/g, '').replace(',', '.')) > 0 ? '+' : '-'} R$ {Math.abs(parseFloat(item.valor.toString().replace(/[^\d,.-]/g, '').replace(',', '.'))).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>

            <div className="flex justify-end gap-3 pt-4 border-t">
              <Button variant="outline" onClick={() => setEtapa('mapeamento')}>
                Voltar
              </Button>
              <Button
                onClick={() => {
                  setEtapa('loading');
                  importarMutation.mutate(dadosPreview);
                }}
                className="bg-emerald-600 hover:bg-emerald-700"
              >
                Confirmar Importação
              </Button>
            </div>
          </div>
        )}

        {etapa === 'loading' && (
          <div className="flex flex-col items-center justify-center py-8">
            <Loader2 className="h-8 w-8 animate-spin text-blue-600 mb-3" />
            <p className="text-sm text-slate-600">Processando {dadosPreview.length} transações...</p>
          </div>
        )}

        {etapa === 'sucesso' && (
          <div className="flex flex-col items-center justify-center py-8">
            <Check className="h-8 w-8 text-emerald-600 mb-3" />
            <p className="text-sm font-medium text-slate-900">Extrato importado com sucesso!</p>
            <p className="text-xs text-slate-500 mt-1">{dadosPreview.length} transações adicionadas</p>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}