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
import { Upload, FileUp, Check, AlertCircle, Loader2 } from 'lucide-react';
import * as XLSX from 'xlsx';
import { toast } from 'sonner';

export default function ImportadorLancamentosMaterial({ projetos = [] }) {
  const [mostrarModal, setMostrarModal] = useState(false);
  const [dadosPreview, setDadosPreview] = useState([]);
  const [etapa, setEtapa] = useState('upload'); // 'upload', 'preview', 'loading', 'sucesso'
  const [erros, setErros] = useState([]);
  const queryClient = useQueryClient();

  const importarMutation = useMutation({
    mutationFn: async (dados) => {
      const movimentacoes = dados.map(item => ({
        tipo: 'saida',
        categoria: 'compra_material',
        descricao: `Compra de Material - ${item.FORNECEDOR} (NF ${item['Nº NOTA FISCAL']})`,
        valor: parseFloat(item['VALOR TOTAL'].toString().replace(/[^\d,.-]/g, '').replace(',', '.')),
        data_movimentacao: new Date(item.DATA).toISOString().split('T')[0],
        forma_pagamento: 'boleto',
        status: 'previsto',
        documento_fiscal: item['Nº NOTA FISCAL'],
        observacoes: `Fornecedor: ${item.FORNECEDOR}`,
      }));

      // Criar em lotes para não sobrecarregar
      for (let i = 0; i < movimentacoes.length; i += 10) {
        const lote = movimentacoes.slice(i, i + 10);
        await base44.entities.MovimentacaoFinanceira.bulkCreate(lote);
      }
    },
    onSuccess: async () => {
      // Aguardar um pouco para garantir que os dados foram salvos
      await new Promise(resolve => setTimeout(resolve, 500));
      
      // Invalidar todas as queries relacionadas
      await queryClient.invalidateQueries({ queryKey: ['movimentacoes'] });
      await queryClient.invalidateQueries({ queryKey: ['movimentacoes-obra'] });
      
      toast.success(`${dadosPreview.length} movimentações importadas com sucesso!`);
      setEtapa('sucesso');
      
      setTimeout(() => {
        setMostrarModal(false);
        setEtapa('upload');
        setDadosPreview([]);
      }, 1500);
    },
    onError: (error) => {
      toast.error('Erro ao importar dados');
      setEtapa('upload');
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

      // Validar colunas obrigatórias
      const colunasObrigatorias = ['DATA', 'Nº NOTA FISCAL', 'FORNECEDOR', 'VALOR TOTAL'];
      const colunasEncontradas = Object.keys(linhas[0] || {});
      
      const colunasValidas = colunasObrigatorias.every(col => 
        colunasEncontradas.some(c => c.toUpperCase().includes(col.toUpperCase()))
      );

      if (!colunasValidas) {
        setErros(['Arquivo não contém as colunas esperadas: DATA, Nº NOTA FISCAL, FORNECEDOR, VALOR TOTAL']);
        return;
      }

      // Normalizar nomes das colunas
      const linhasNormalizadas = linhas.map(linha => {
        const novaLinha = {};
        Object.entries(linha).forEach(([chave, valor]) => {
          const chaveNormalizada = chave.trim().toUpperCase();
          if (chaveNormalizada.includes('DATA')) novaLinha.DATA = valor;
          else if (chaveNormalizada.includes('NOTA')) novaLinha['Nº NOTA FISCAL'] = valor;
          else if (chaveNormalizada.includes('FORNECEDOR')) novaLinha.FORNECEDOR = valor;
          else if (chaveNormalizada.includes('VALOR')) novaLinha['VALOR TOTAL'] = valor;
        });
        return novaLinha;
      }).filter(linha => linha.DATA && linha['Nº NOTA FISCAL'] && linha.FORNECEDOR && linha['VALOR TOTAL']);

      if (linhasNormalizadas.length === 0) {
        setErros(['Nenhuma linha válida encontrada no arquivo']);
        return;
      }

      setDadosPreview(linhasNormalizadas);
      setErros([]);
      setEtapa('preview');
    } catch (error) {
      setErros(['Erro ao ler arquivo. Verifique se é um Excel válido.']);
      console.error(error);
    }
  };

  return (
    <Dialog open={mostrarModal} onOpenChange={setMostrarModal}>
      <DialogTrigger asChild>
        <Button variant="outline" size="sm" className="gap-2">
          <Upload className="h-4 w-4" />
          Importar Lançamentos
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-3xl max-h-96 overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Importar Lançamentos de Material</DialogTitle>
        </DialogHeader>

        {etapa === 'upload' && (
          <div className="space-y-4 py-4">
            <div className="border-2 border-dashed border-slate-300 rounded-lg p-8 text-center">
              <FileUp className="h-8 w-8 mx-auto text-slate-400 mb-2" />
              <p className="text-sm text-slate-600 mb-4">Selecione um arquivo Excel com as colunas:</p>
              <p className="text-xs text-slate-500 mb-4">DATA | Nº NOTA FISCAL | FORNECEDOR | VALOR TOTAL</p>
              <input
                type="file"
                accept=".xlsx,.xls"
                onChange={handleArquivo}
                className="hidden"
                id="arquivo-input"
              />
              <Button
                onClick={() => document.getElementById('arquivo-input').click()}
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

        {etapa === 'preview' && (
          <div className="space-y-4 py-4">
            <div className="text-sm text-slate-600">
              <p className="font-medium mb-2">Serão importados {dadosPreview.length} lançamentos:</p>
              <div className="border rounded-lg overflow-x-auto max-h-64 overflow-y-auto">
                <Table className="text-xs">
                  <TableHeader className="sticky top-0 bg-slate-50">
                    <TableRow>
                      <TableHead>Data</TableHead>
                      <TableHead>NF</TableHead>
                      <TableHead>Fornecedor</TableHead>
                      <TableHead className="text-right">Valor</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {dadosPreview.map((item, idx) => (
                      <TableRow key={idx}>
                        <TableCell>
                          {new Date(item.DATA).toLocaleDateString('pt-BR')}
                        </TableCell>
                        <TableCell>{item['Nº NOTA FISCAL']}</TableCell>
                        <TableCell>{item.FORNECEDOR}</TableCell>
                        <TableCell className="text-right font-medium">
                          R$ {parseFloat(item['VALOR TOTAL'].toString().replace(/[^\d,.-]/g, '').replace(',', '.')).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            </div>
            <div className="flex justify-end gap-3 pt-4 border-t">
              <Button
                variant="outline"
                onClick={() => {
                  setEtapa('upload');
                  setDadosPreview([]);
                }}
              >
                Cancelar
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
            <p className="text-sm text-slate-600">Importando {dadosPreview.length} lançamentos...</p>
          </div>
        )}

        {etapa === 'sucesso' && (
          <div className="flex flex-col items-center justify-center py-8">
            <Check className="h-8 w-8 text-emerald-600 mb-3" />
            <p className="text-sm font-medium text-slate-900">Importação concluída com sucesso!</p>
            <p className="text-xs text-slate-500 mt-1">{dadosPreview.length} lançamentos adicionados</p>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}