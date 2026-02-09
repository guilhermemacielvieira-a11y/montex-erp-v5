import React, { useState, useRef } from 'react';
import { base44 } from '@/api/base44Client';
import toast from 'react-hot-toast';
import {
  FileSearch,
  Upload,
  FileText,
  AlertTriangle,
  CheckCircle,
  Loader2,
  Weight,
  Calendar,
  DollarSign,
  Sparkles,
  FileSpreadsheet
} from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { motion, AnimatePresence } from 'framer-motion';

export default function Analisador() {
  const [file, setFile] = useState(null);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [analysis, setAnalysis] = useState(null);
  const fileInputRef = useRef(null);

  const handleFileChange = (e) => {
    const selectedFile = e.target.files?.[0];
    if (selectedFile) {
      setFile(selectedFile);
      setAnalysis(null);
    }
  };

  const handleDrop = (e) => {
    e.preventDefault();
    const droppedFile = e.dataTransfer.files?.[0];
    if (droppedFile) {
      setFile(droppedFile);
      setAnalysis(null);
    }
  };

  const analyzeDocument = async () => {
    if (!file) return;
    
    setIsAnalyzing(true);

    // Check if it's an Excel file
    const isExcel = file.name.endsWith('.xlsx') || file.name.endsWith('.xls');

    // Upload file first
    const { file_url } = await base44.integrations.Core.UploadFile({ file });

    // Extract data using AI
    const extractedData = await base44.integrations.Core.ExtractDataFromUploadedFile({
      file_url,
      json_schema: isExcel ? {
        type: 'object',
        properties: {
          nome_projeto: { type: 'string' },
          cliente: { type: 'string' },
          area_construida: { type: 'number' },
          tipo_estrutura: { type: 'string' },
          localizacao: { type: 'string' },
          itens_lista: {
            type: 'array',
            items: {
              type: 'object',
              properties: {
                descricao: { type: 'string' },
                quantidade: { type: 'number' },
                peso_unitario: { type: 'number' },
                peso_total: { type: 'number' },
                material: { type: 'string' }
              }
            }
          },
          peso_total_estrutura: { type: 'number' },
          especificacoes_tecnicas: { 
            type: 'array', 
            items: { type: 'string' } 
          }
        }
      } : {
        type: 'object',
        properties: {
          nome_projeto: { type: 'string' },
          cliente: { type: 'string' },
          area_construida: { type: 'number' },
          tipo_estrutura: { type: 'string' },
          localizacao: { type: 'string' },
          especificacoes_tecnicas: { 
            type: 'array', 
            items: { type: 'string' } 
          },
          materiais_mencionados: {
            type: 'array',
            items: { type: 'string' }
          },
          prazos_mencionados: { type: 'string' },
          requisitos_especiais: {
            type: 'array',
            items: { type: 'string' }
          }
        }
      }
    });

    // Generate detailed analysis with AI
    const prompt = `Você é um engenheiro especialista em estruturas metálicas do Grupo Montex.

Analise o seguinte documento de projeto extraído:

${JSON.stringify(extractedData.output, null, 2)}

Gere uma análise completa incluindo:

1. **Resumo Executivo**: Visão geral do projeto
2. **Estimativa de Tonelagem**: Baseado na área e tipo de estrutura, estime o peso da estrutura metálica
3. **Análise de Complexidade**: Classifique como Baixa, Média ou Alta
4. **Riscos Identificados**: Liste potenciais riscos e desafios
5. **Oportunidades**: Possíveis otimizações ou serviços adicionais
6. **Estimativa de Prazo**: Prazo aproximado de fabricação e montagem
7. **Estimativa de Custo**: Faixa de preço aproximada
8. **Documentos Necessários**: Checklist de documentos para prosseguir
9. **Recomendações**: Próximos passos sugeridos

Seja específico e técnico, mas compreensível.`;

    const analysisResult = await base44.integrations.Core.InvokeLLM({
      prompt,
      response_json_schema: {
        type: 'object',
        properties: {
          resumo_executivo: { type: 'string' },
          peso_estimado_kg: { type: 'number' },
          complexidade: { type: 'string', enum: ['baixa', 'media', 'alta'] },
          riscos: { type: 'array', items: { type: 'object', properties: { descricao: { type: 'string' }, severidade: { type: 'string' } } } },
          oportunidades: { type: 'array', items: { type: 'string' } },
          prazo_fabricacao_dias: { type: 'number' },
          prazo_montagem_dias: { type: 'number' },
          custo_minimo: { type: 'number' },
          custo_maximo: { type: 'number' },
          documentos_necessarios: { type: 'array', items: { type: 'string' } },
          recomendacoes: { type: 'array', items: { type: 'string' } },
          tipo_projeto: { type: 'string' },
          area_estimada: { type: 'number' }
        }
      }
    });

    setAnalysis({
      ...analysisResult,
      dados_extraidos: extractedData.output
    });
    
    setIsAnalyzing(false);
  };

  const getComplexidadeBadge = (complexidade) => {
    const config = {
      baixa: { label: 'Baixa', className: 'bg-emerald-100 text-emerald-700' },
      media: { label: 'Média', className: 'bg-yellow-100 text-yellow-700' },
      alta: { label: 'Alta', className: 'bg-red-100 text-red-700' }
    };
    return config[complexidade] || config.media;
  };

  return (
    <div className="space-y-8">
      {/* Header */}
      <div>
        <h1 className="text-3xl font-bold text-slate-900">Analisador de Projetos</h1>
        <p className="text-slate-500 mt-1">Analise memoriais e especificações com IA</p>
      </div>

      {/* Upload Area */}
      <Card className="border-slate-200 border-dashed">
        <CardContent className="p-8">
          <div
            onDrop={handleDrop}
            onDragOver={(e) => e.preventDefault()}
            onClick={() => fileInputRef.current?.click()}
            className="flex flex-col items-center justify-center py-12 cursor-pointer hover:bg-slate-50 transition-colors rounded-xl"
          >
            <input
              ref={fileInputRef}
              type="file"
              onChange={handleFileChange}
              accept=".pdf,.doc,.docx,.txt,.xlsx,.xls"
              className="hidden"
            />
            
            {file ? (
              <div className="text-center">
                <div className="w-16 h-16 rounded-2xl bg-emerald-100 flex items-center justify-center mx-auto mb-4">
                  <FileText className="h-8 w-8 text-emerald-600" />
                </div>
                <p className="font-semibold text-slate-900">{file.name}</p>
                <p className="text-sm text-slate-500 mt-1">
                  {(file.size / 1024).toFixed(1)} KB
                </p>
                <Button
                  variant="link"
                  className="text-orange-600 mt-2"
                  onClick={(e) => {
                    e.stopPropagation();
                    setFile(null);
                    setAnalysis(null);
                  }}
                >
                  Trocar arquivo
                </Button>
              </div>
            ) : (
              <>
                <div className="w-20 h-20 rounded-3xl bg-gradient-to-br from-blue-400 to-blue-600 flex items-center justify-center mb-6 shadow-lg shadow-blue-500/30">
                  <Upload className="h-10 w-10 text-white" />
                </div>
                <h3 className="text-lg font-semibold text-slate-900 mb-2">
                  Arraste um documento ou clique para selecionar
                </h3>
                <p className="text-slate-500 mb-3">
                  Suporta PDF, DOC, DOCX, TXT e Excel
                </p>
                <div className="flex items-center gap-3 text-sm text-slate-400">
                  <div className="flex items-center gap-1">
                    <FileText className="h-4 w-4" />
                    <span>Documentos</span>
                  </div>
                  <span>•</span>
                  <div className="flex items-center gap-1">
                    <FileSpreadsheet className="h-4 w-4" />
                    <span>Planilhas Excel</span>
                  </div>
                </div>
              </>
            )}
          </div>

          {file && !analysis && (
            <div className="flex justify-center mt-6">
              <Button
                onClick={analyzeDocument}
                disabled={isAnalyzing}
                className="bg-gradient-to-r from-orange-500 to-orange-600 hover:from-orange-600 hover:to-orange-700 px-8"
              >
                {isAnalyzing ? (
                  <>
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    Analisando...
                  </>
                ) : (
                  <>
                    <Sparkles className="h-4 w-4 mr-2" />
                    Analisar com IA
                  </>
                )}
              </Button>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Analysis Results */}
      <AnimatePresence>
        {analysis && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            className="space-y-6"
          >
            {/* Summary Cards */}
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
              <Card className="border-slate-100">
                <CardContent className="p-4">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-xl bg-blue-100 flex items-center justify-center">
                      <Weight className="h-5 w-5 text-blue-600" />
                    </div>
                    <div>
                      <p className="text-sm text-slate-500">Peso Estimado</p>
                      <p className="text-xl font-bold text-slate-900">
                        {(analysis.peso_estimado_kg / 1000).toFixed(1)} ton
                      </p>
                    </div>
                  </div>
                </CardContent>
              </Card>

              <Card className="border-slate-100">
                <CardContent className="p-4">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-xl bg-purple-100 flex items-center justify-center">
                      <FileSearch className="h-5 w-5 text-purple-600" />
                    </div>
                    <div>
                      <p className="text-sm text-slate-500">Complexidade</p>
                      <Badge className={getComplexidadeBadge(analysis.complexidade).className}>
                        {getComplexidadeBadge(analysis.complexidade).label}
                      </Badge>
                    </div>
                  </div>
                </CardContent>
              </Card>

              <Card className="border-slate-100">
                <CardContent className="p-4">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-xl bg-emerald-100 flex items-center justify-center">
                      <Calendar className="h-5 w-5 text-emerald-600" />
                    </div>
                    <div>
                      <p className="text-sm text-slate-500">Prazo Total</p>
                      <p className="text-xl font-bold text-slate-900">
                        {analysis.prazo_fabricacao_dias + analysis.prazo_montagem_dias} dias
                      </p>
                    </div>
                  </div>
                </CardContent>
              </Card>

              <Card className="border-slate-100">
                <CardContent className="p-4">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-xl bg-orange-100 flex items-center justify-center">
                      <DollarSign className="h-5 w-5 text-orange-600" />
                    </div>
                    <div>
                      <p className="text-sm text-slate-500">Faixa de Custo</p>
                      <p className="text-lg font-bold text-slate-900">
                        R$ {(analysis.custo_minimo / 1000).toFixed(0)}k - {(analysis.custo_maximo / 1000).toFixed(0)}k
                      </p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>

            {/* Detailed Analysis */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {/* Summary */}
              <Card className="border-slate-100">
                <CardHeader>
                  <CardTitle className="text-lg">Resumo Executivo</CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-slate-600 leading-relaxed">{analysis.resumo_executivo}</p>
                </CardContent>
              </Card>

              {/* Risks */}
              <Card className="border-slate-100">
                <CardHeader>
                  <CardTitle className="text-lg flex items-center gap-2">
                    <AlertTriangle className="h-5 w-5 text-yellow-500" />
                    Riscos Identificados
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-3">
                    {analysis.riscos?.map((risco, idx) => (
                      <div key={idx} className="flex items-start gap-3 p-3 bg-slate-50 rounded-lg">
                        <div className={`w-2 h-2 rounded-full mt-2 ${
                          risco.severidade === 'alta' ? 'bg-red-500' :
                          risco.severidade === 'media' ? 'bg-yellow-500' : 'bg-emerald-500'
                        }`} />
                        <p className="text-sm text-slate-700">{risco.descricao}</p>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>

              {/* Opportunities */}
              <Card className="border-slate-100">
                <CardHeader>
                  <CardTitle className="text-lg flex items-center gap-2">
                    <CheckCircle className="h-5 w-5 text-emerald-500" />
                    Oportunidades
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <ul className="space-y-2">
                    {analysis.oportunidades?.map((opp, idx) => (
                      <li key={idx} className="flex items-start gap-2 text-sm text-slate-600">
                        <span className="text-emerald-500 mt-1">•</span>
                        {opp}
                      </li>
                    ))}
                  </ul>
                </CardContent>
              </Card>

              {/* Documents Checklist */}
              <Card className="border-slate-100">
                <CardHeader>
                  <CardTitle className="text-lg">Documentos Necessários</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-2">
                    {analysis.documentos_necessarios?.map((doc, idx) => (
                      <div key={idx} className="flex items-center gap-3 p-2">
                        <div className="w-5 h-5 rounded border-2 border-slate-300" />
                        <span className="text-sm text-slate-600">{doc}</span>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            </div>

            {/* Recommendations */}
            <Card className="border-slate-100">
              <CardHeader>
                <CardTitle className="text-lg">Recomendações</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {analysis.recomendacoes?.map((rec, idx) => (
                    <div key={idx} className="flex items-start gap-3 p-4 bg-orange-50 rounded-xl">
                      <div className="w-6 h-6 rounded-full bg-orange-500 text-white flex items-center justify-center text-sm font-semibold flex-shrink-0">
                        {idx + 1}
                      </div>
                      <p className="text-sm text-slate-700">{rec}</p>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>

            {/* Actions */}
            <div className="flex justify-center gap-4">
              <Button variant="outline" onClick={() => { setFile(null); setAnalysis(null); }}>
                Nova Análise
              </Button>
              <Button
                onClick={() => {
                  toast.success('Orçamento gerado com sucesso!');
                  // Aqui você pode adicionar a lógica para navegar ou abrir um modal de orçamento
                }}
                className="bg-gradient-to-r from-orange-500 to-orange-600"
              >
                <Sparkles className="h-4 w-4 mr-2" />
                Gerar Orçamento
              </Button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}