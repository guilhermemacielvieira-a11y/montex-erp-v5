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
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { FileUp, Check, AlertCircle, Loader2 } from 'lucide-react';
import { toast } from 'sonner';

export default function ImportadorNotaFiscal() {
  const [mostrarModal, setMostrarModal] = useState(false);
  const [etapa, setEtapa] = useState('upload'); // 'upload', 'preview', 'loading', 'sucesso'
  const [arquivoCarregado, setArquivoCarregado] = useState(null);
  const [previewUrl, setPreviewUrl] = useState(null);
  const [dadosExtraidos, setDadosExtraidos] = useState(null);
  const [formData, setFormData] = useState({
    categoria: 'compra_material',
    forma_pagamento: 'boleto',
    status: 'previsto',
  });
  const [erros, setErros] = useState([]);
  const queryClient = useQueryClient();

  const extrairDadosMutation = useMutation({
    mutationFn: async (file) => {
      // Upload do PDF para obter URL
      const uploadResult = await base44.integrations.Core.UploadFile({ file });
      const fileUrl = uploadResult.file_url;

      // Usar InvokeLLM com vision para OCR
      const resultado = await base44.integrations.Core.InvokeLLM({
        prompt: `Analise esta nota fiscal em PDF e extraia as seguintes informações em formato JSON:
- numero_nf (número da nota fiscal)
- data_emissao (data em formato YYYY-MM-DD)
- fornecedor (nome completo do fornecedor)
- cnpj_fornecedor (CNPJ do fornecedor)
- descricao_produtos (descrição dos produtos/serviços)
- valor_total (valor total em números)
- natureza_operacao (tipo de operação)

Retorne APENAS o JSON, sem explicações.`,
        file_urls: [fileUrl],
        response_json_schema: {
          type: 'object',
          properties: {
            numero_nf: { type: 'string' },
            data_emissao: { type: 'string' },
            fornecedor: { type: 'string' },
            cnpj_fornecedor: { type: 'string' },
            descricao_produtos: { type: 'string' },
            valor_total: { type: 'number' },
            natureza_operacao: { type: 'string' },
          },
          required: ['numero_nf', 'data_emissao', 'fornecedor', 'valor_total']
        }
      });

      return resultado;
    },
    onSuccess: (dados) => {
      setDadosExtraidos(dados);
      setFormData(prev => ({
        ...prev,
        documento_fiscal: dados.numero_nf,
      }));
      setEtapa('preview');
      setErros([]);
    },
    onError: () => {
      setErros(['Erro ao extrair dados da nota fiscal. Tente novamente.']);
      setEtapa('upload');
    }
  });

  const criarMovimentacaoMutation = useMutation({
    mutationFn: (dados) => {
      return base44.entities.MovimentacaoFinanceira.create({
        tipo: 'saida',
        categoria: formData.categoria,
        descricao: `${dados.descricao_produtos} - NF ${dados.numero_nf}`,
        valor: dados.valor_total,
        data_movimentacao: dados.data_emissao,
        forma_pagamento: formData.forma_pagamento,
        status: formData.status,
        documento_fiscal: dados.numero_nf,
        observacoes: `Fornecedor: ${dados.fornecedor} | CNPJ: ${dados.cnpj_fornecedor || 'N/A'}`,
      });
    },
    onSuccess: async () => {
      await new Promise(resolve => setTimeout(resolve, 500));
      await queryClient.invalidateQueries({ queryKey: ['movimentacoes'] });
      await queryClient.invalidateQueries({ queryKey: ['movimentacoes-obra'] });
      
      toast.success('Nota fiscal importada com sucesso!');
      setEtapa('sucesso');
      
      setTimeout(() => {
        setMostrarModal(false);
        setEtapa('upload');
        setArquivoCarregado(null);
        setPreviewUrl(null);
        setDadosExtraidos(null);
      }, 1500);
    },
    onError: () => {
      toast.error('Erro ao criar movimentação');
      setEtapa('preview');
    }
  });

  const handleArquivo = async (event) => {
    const arquivo = event.target.files?.[0];
    if (!arquivo) return;

    if (!arquivo.type.includes('pdf')) {
      setErros(['Por favor, selecione um arquivo PDF']);
      return;
    }

    setArquivoCarregado(arquivo);
    setErros([]);
    
    // Criar preview URL
    const reader = new FileReader();
    reader.onload = (e) => {
      setPreviewUrl(e.target?.result);
    };
    reader.readAsArrayBuffer(arquivo);

    setEtapa('loading');
    extrairDadosMutation.mutate(arquivo);
  };

  return (
    <Dialog open={mostrarModal} onOpenChange={setMostrarModal}>
      <DialogTrigger asChild>
        <Button variant="outline" size="sm" className="gap-2">
          <FileUp className="h-4 w-4" />
          Nota Fiscal (PDF)
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Importar Nota Fiscal com OCR</DialogTitle>
        </DialogHeader>

        {etapa === 'upload' && (
          <div className="space-y-4 py-4">
            <div className="border-2 border-dashed border-slate-300 rounded-lg p-8 text-center">
              <FileUp className="h-8 w-8 mx-auto text-slate-400 mb-2" />
              <p className="text-sm text-slate-600 mb-2">Faça upload de uma nota fiscal em PDF</p>
              <p className="text-xs text-slate-500 mb-4">Os dados serão extraídos automaticamente por OCR</p>
              <input
                type="file"
                accept=".pdf"
                onChange={handleArquivo}
                className="hidden"
                id="arquivo-nf"
              />
              <Button
                onClick={() => document.getElementById('arquivo-nf').click()}
                className="bg-blue-600 hover:bg-blue-700"
              >
                Escolher PDF
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

        {etapa === 'loading' && (
          <div className="flex flex-col items-center justify-center py-12">
            <Loader2 className="h-8 w-8 animate-spin text-blue-600 mb-3" />
            <p className="text-sm text-slate-600">Analisando nota fiscal com OCR...</p>
            <p className="text-xs text-slate-500 mt-2">Este processo pode levar alguns segundos</p>
          </div>
        )}

        {etapa === 'preview' && dadosExtraidos && (
          <div className="space-y-4 py-4">
            <div className="bg-emerald-50 border border-emerald-200 rounded-lg p-3">
              <p className="text-sm text-emerald-700 flex items-center gap-2">
                <Check className="h-4 w-4" />
                Dados extraídos com sucesso! Confirme as informações:
              </p>
            </div>

            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label className="text-sm">Número NF</Label>
                  <Input value={dadosExtraidos.numero_nf} disabled className="bg-slate-50" />
                </div>
                <div className="space-y-2">
                  <Label className="text-sm">Data Emissão</Label>
                  <Input 
                    value={new Date(dadosExtraidos.data_emissao).toLocaleDateString('pt-BR')} 
                    disabled 
                    className="bg-slate-50" 
                  />
                </div>
              </div>

              <div className="space-y-2">
                <Label className="text-sm">Fornecedor</Label>
                <Input value={dadosExtraidos.fornecedor} disabled className="bg-slate-50" />
              </div>

              <div className="space-y-2">
                <Label className="text-sm">Descrição</Label>
                <Input value={dadosExtraidos.descricao_produtos} disabled className="bg-slate-50" />
              </div>

              <div className="space-y-2">
                <Label className="text-sm">Valor Total</Label>
                <Input 
                  value={`R$ ${dadosExtraidos.valor_total.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}`}
                  disabled 
                  className="bg-slate-50 font-bold"
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label className="text-sm">Categoria</Label>
                  <Select value={formData.categoria} onValueChange={(v) => setFormData({...formData, categoria: v})}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="compra_material">Compra de Material</SelectItem>
                      <SelectItem value="mao_de_obra">Mão de Obra</SelectItem>
                      <SelectItem value="equipamento">Equipamento</SelectItem>
                      <SelectItem value="transporte">Transporte</SelectItem>
                      <SelectItem value="despesa_administrativa">Despesa Administrativa</SelectItem>
                      <SelectItem value="outros">Outros</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label className="text-sm">Status</Label>
                  <Select value={formData.status} onValueChange={(v) => setFormData({...formData, status: v})}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="previsto">Previsto</SelectItem>
                      <SelectItem value="realizado">Realizado</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
            </div>

            <div className="flex justify-end gap-3 pt-4 border-t">
              <Button variant="outline" onClick={() => setEtapa('upload')}>
                Cancelar
              </Button>
              <Button
                onClick={() => {
                  setEtapa('loading');
                  criarMovimentacaoMutation.mutate(dadosExtraidos);
                }}
                disabled={criarMovimentacaoMutation.isPending}
                className="bg-emerald-600 hover:bg-emerald-700"
              >
                Importar
              </Button>
            </div>
          </div>
        )}

        {etapa === 'sucesso' && (
          <div className="flex flex-col items-center justify-center py-12">
            <Check className="h-8 w-8 text-emerald-600 mb-3" />
            <p className="text-sm font-medium text-slate-900">Nota fiscal importada com sucesso!</p>
            <p className="text-xs text-slate-500 mt-1">Movimentação criada automaticamente</p>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}