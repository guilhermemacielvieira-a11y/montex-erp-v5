// MONTEX ERP Premium - Import Listas GADE
// Importação de Lista de Corte (Peças) e Resumo de Material (Estoque)

import React, { useState, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import * as XLSX from 'xlsx';
import {
  Upload,
  FileSpreadsheet,
  CheckCircle2,
  X,
  Eye,
  RefreshCw,
  Package,
  Building2,
  FileText,
  ArrowRight,
  Check,
  Warehouse,
  Scissors,
  TrendingUp,
  Clock,
  Truck
} from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Input } from '@/components/ui/input';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import {
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from '@/components/ui/tabs';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog';
import { Checkbox } from '@/components/ui/checkbox';
import { cn } from '@/lib/utils';
import { useObras, useProducao, useEstoque, useMateriais } from '@/contexts/ERPContext';
import { ETAPAS_PRODUCAO } from '@/data/database';
import toast from 'react-hot-toast';

// Tipos de Lista
const TIPO_LISTA = {
  CORTE: 'corte',
  RESUMO_MATERIAL: 'resumo_material'
};

// Status de item importado
const STATUS_ITEM = {
  NOVO: 'novo',
  DUPLICADO: 'duplicado',
  ERRO: 'erro',
  ATUALIZADO: 'atualizado'
};

// Status de material no estoque
const STATUS_MATERIAL = {
  PENDENTE: 'pendente',
  PARCIAL: 'parcial',
  COMPLETO: 'completo'
};

const getStatusColor = (status) => {
  switch (status) {
    case 'novo': return 'bg-emerald-500/20 text-emerald-400 border-emerald-500/30';
    case 'duplicado': return 'bg-amber-500/20 text-amber-400 border-amber-500/30';
    case 'erro': return 'bg-red-500/20 text-red-400 border-red-500/30';
    case 'sucesso':
    case 'atualizado': return 'bg-emerald-500/20 text-emerald-400 border-emerald-500/30';
    case 'pendente': return 'bg-slate-500/20 text-slate-400 border-slate-500/30';
    case 'parcial': return 'bg-amber-500/20 text-amber-400 border-amber-500/30';
    case 'completo': return 'bg-emerald-500/20 text-emerald-400 border-emerald-500/30';
    default: return 'bg-slate-500/20 text-slate-400 border-slate-500/30';
  }
};

// Parser para Lista de Corte GADE
const parseListaCorte = (data) => {
  const pecas = [];
  let headerFound = false;

  for (const row of data) {
    const firstCol = String(row[0] || '').trim();

    // Identificar linha de cabeçalho
    if (firstCol === 'PEÇA' || firstCol.includes('PEÇA')) {
      headerFound = true;
      continue;
    }

    // Pular linhas vazias ou de metadados
    if (!headerFound || !firstCol || firstCol.startsWith('PROJETO') ||
        firstCol.startsWith('CLIENTE') || firstCol.startsWith('OBRA') ||
        firstCol === '_x000C_') {
      continue;
    }

    // Extrair dados da peça
    const tipo = firstCol.trim();
    const marca = row[1];
    const quantidade = parseInt(row[2]) || 1;
    const perfil = String(row[3] || '').trim();
    const comprimento = parseFloat(String(row[4]).replace(',', '.')) || 0;
    const material = String(row[5] || '').trim();
    const peso = parseFloat(String(row[6]).replace(',', '.')) || 0;

    if (tipo && marca) {
      pecas.push({
        tipo,
        marca: parseInt(marca) || marca,
        quantidade,
        perfil,
        comprimento,
        material,
        peso,
        status: STATUS_ITEM.NOVO
      });
    }
  }

  return pecas;
};

// Parser para Lista de Resumo de Material GADE - FOCO EM PESO (KG)
const parseResumoMaterial = (data) => {
  const materiais = [];
  let headerFound = false;

  for (const row of data) {
    const firstCol = String(row[0] || '').trim();

    // Identificar linha de cabeçalho
    if (firstCol === 'PERFIL' || firstCol.includes('PERFIL')) {
      headerFound = true;
      continue;
    }

    // Pular linhas vazias ou de metadados
    if (!headerFound || !firstCol || firstCol.startsWith('PROJETO') ||
        firstCol.startsWith('CLIENTE') || firstCol.startsWith('OBRA')) {
      continue;
    }

    // Extrair dados do material - FOCO PRINCIPAL: PESO (KG)
    const perfil = firstCol;
    const material = String(row[1] || '').trim();
    // Peso é a métrica principal de controle de estoque
    const pesoKg = parseFloat(String(row[3]).replace(',', '.')) || 0;

    if (perfil && material && pesoKg > 0) {
      materiais.push({
        id: `MAT-${Date.now()}-${materiais.length}`,
        perfil,
        material,
        // CONTROLE DE ESTOQUE EM PESO (KG)
        pesoPedido: pesoKg,        // Peso total pedido (kg)
        pesoRecebido: 0,           // Peso já recebido (kg)
        pesoFalta: pesoKg,         // Peso que falta receber (kg)
        percentualRecebido: 0,     // % recebido
        status: STATUS_MATERIAL.PENDENTE,
        dataImportacao: new Date().toISOString().split('T')[0],
        dataPrevisaoChegada: null,
        entregas: []               // Histórico de entregas
      });
    }
  }

  return materiais;
};

export default function ImportRomaneioPage() {
  // Hooks do ERPContext
  const { obras, obraAtual, obraAtualData } = useObras();
  const { addPecas, pecas } = useProducao();
  const { estoque } = useEstoque();
  const {
    materiaisEstoque,
    estatisticasEstoque,
    importarMateriais,
    registrarEntregaMaterial
  } = useMateriais();

  // Estados
  const [tipoLista, setTipoLista] = useState(TIPO_LISTA.CORTE);
  const [obraSelecionada, setObraSelecionada] = useState(obraAtual || '');
  const [arquivoSelecionado, setArquivoSelecionado] = useState(null);
  const [etapa, setEtapa] = useState('upload');
  const [previewData, setPreviewData] = useState([]);
  const [itensSelecionados, setItensSelecionados] = useState([]);
  const [progresso, setProgresso] = useState(0);
  const [isDragging, setIsDragging] = useState(false);
  const [historicoImportacoes, setHistoricoImportacoes] = useState([]);
  const [showEntregaModal, setShowEntregaModal] = useState(false);
  const [materialSelecionado, setMaterialSelecionado] = useState(null);
  const [novaEntrega, setNovaEntrega] = useState({ quantidade: 0, data: '', notaFiscal: '' });
  const [activeTab, setActiveTab] = useState('importar'); // Controle de tab ativa

  // Detectar tipo de lista pelo nome do arquivo
  const detectarTipoLista = (fileName) => {
    const nome = fileName.toLowerCase();
    if (nome.includes('corte') || nome.includes('materiais para corte')) {
      return TIPO_LISTA.CORTE;
    } else if (nome.includes('resumo') || nome.includes('material')) {
      return TIPO_LISTA.RESUMO_MATERIAL;
    }
    return TIPO_LISTA.CORTE; // Default
  };

  // Processar arquivo Excel
  const processarArquivo = async (file) => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();

      reader.onload = (e) => {
        try {
          const data = new Uint8Array(e.target.result);
          const workbook = XLSX.read(data, { type: 'array' });
          const firstSheet = workbook.Sheets[workbook.SheetNames[0]];
          const jsonData = XLSX.utils.sheet_to_json(firstSheet, { header: 1 });

          resolve(jsonData);
        } catch (error) {
          reject(error);
        }
      };

      reader.onerror = () => reject(new Error('Erro ao ler arquivo'));
      reader.readAsArrayBuffer(file);
    });
  };

  // Handle upload de arquivo
  const handleFileSelect = async (file) => {
    if (!file) return;

    const validExtensions = ['.xlsx', '.xls', '.csv'];
    const ext = '.' + file.name.split('.').pop().toLowerCase();

    if (!validExtensions.includes(ext)) {
      toast.error('Formato não suportado. Use .xlsx, .xls ou .csv');
      return;
    }

    setArquivoSelecionado(file);

    // Detectar tipo de lista
    const tipo = detectarTipoLista(file.name);
    setTipoLista(tipo);

    try {
      const rawData = await processarArquivo(file);

      let parsedData;
      if (tipo === TIPO_LISTA.CORTE) {
        parsedData = parseListaCorte(rawData);

        // Verificar duplicados com peças existentes
        const marcasExistentes = new Set(pecas.filter(p => p.obraId === obraSelecionada).map(p => p.marca));
        parsedData = parsedData.map(item => ({
          ...item,
          status: marcasExistentes.has(item.marca) ? STATUS_ITEM.DUPLICADO : STATUS_ITEM.NOVO
        }));
      } else {
        parsedData = parseResumoMaterial(rawData);

        // Verificar materiais existentes no estoque
        parsedData = parsedData.map(item => {
          const existente = estoque.find(e =>
            e.codigo === item.perfil || e.material === item.material
          );
          return {
            ...item,
            status: existente ? STATUS_ITEM.ATUALIZADO : STATUS_ITEM.NOVO
          };
        });
      }

      setPreviewData(parsedData);
      setItensSelecionados(
        parsedData
          .map((item, idx) => item.status !== STATUS_ITEM.ERRO ? idx : null)
          .filter(idx => idx !== null)
      );
      setEtapa('preview');

      toast.success(`${parsedData.length} itens encontrados`);
    } catch (error) {
      console.error('Erro ao processar arquivo:', error);
      toast.error('Erro ao processar arquivo');
    }
  };

  // Drag and Drop
  const handleDragOver = useCallback((e) => {
    e.preventDefault();
    setIsDragging(true);
  }, []);

  const handleDragLeave = useCallback((e) => {
    e.preventDefault();
    setIsDragging(false);
  }, []);

  const handleDrop = useCallback((e) => {
    e.preventDefault();
    setIsDragging(false);
    const file = e.dataTransfer.files[0];
    handleFileSelect(file);
  }, [obraSelecionada]);

  // Processar importação
  const handleImportar = async () => {
    setEtapa('processando');
    setProgresso(0);

    const itensParaImportar = previewData.filter((_, idx) => itensSelecionados.includes(idx));
    const totalItens = itensParaImportar.length;

    // Simular processamento progressivo
    for (let i = 0; i < totalItens; i++) {
      await new Promise(resolve => setTimeout(resolve, 50));
      setProgresso(Math.round(((i + 1) / totalItens) * 100));
    }

    if (tipoLista === TIPO_LISTA.CORTE) {
      // Criar peças no sistema
      const novasPecas = itensParaImportar.map((item, idx) => ({
        id: `PEC${Date.now()}-${idx}`,
        obraId: obraSelecionada,
        marca: item.marca,
        tipo: item.tipo,
        perfil: item.perfil,
        comprimento: item.comprimento,
        quantidade: item.quantidade,
        material: item.material,
        peso: item.peso,
        etapa: ETAPAS_PRODUCAO.AGUARDANDO,
        statusCorte: 'PROGRAMACAO',
        dataImportacao: new Date().toISOString().split('T')[0]
      }));

      addPecas(novasPecas);
      toast.success(`${novasPecas.length} peças adicionadas à produção`);
    } else {
      // IMPORTAÇÃO AUTOMÁTICA PARA CONTROLE DE MATERIAIS (ESTOQUE EM KG)
      // Adicionar obraId aos materiais importados
      const materiaisComObra = itensParaImportar.map(m => ({
        ...m,
        obraId: obraSelecionada
      }));

      // Adicionar ao controle de materiais via ERPContext
      importarMateriais(materiaisComObra);

      // AUTOMATICAMENTE IR PARA TAB DE CONTROLE DE MATERIAIS
      setTimeout(() => {
        setActiveTab('estoque');
      }, 1500);
    }

    // Adicionar ao histórico
    const pesoTotal = tipoLista === TIPO_LISTA.CORTE
      ? itensParaImportar.reduce((acc, p) => acc + (p.peso || 0), 0)
      : itensParaImportar.reduce((acc, m) => acc + (m.pesoPedido || 0), 0);

    setHistoricoImportacoes(prev => [...prev, {
      id: Date.now(),
      arquivo: arquivoSelecionado.name,
      obra: obraAtualData?.nome || obraSelecionada,
      data: new Date().toISOString().split('T')[0],
      itens: totalItens,
      pesoTotal,
      tipo: tipoLista,
      status: 'sucesso',
      usuario: 'Usuário Atual'
    }]);

    setTimeout(() => setEtapa('concluido'), 500);
  };

  // Registrar entrega de material (CONTROLE EM PESO KG) via ERPContext
  const handleRegistrarEntrega = () => {
    if (!materialSelecionado || novaEntrega.quantidade <= 0) return;

    // Usar função do ERPContext que já faz toda a lógica de atualização
    registrarEntregaMaterial(materialSelecionado.id, {
      pesoKg: novaEntrega.quantidade,
      data: novaEntrega.data || new Date().toISOString().split('T')[0],
      notaFiscal: novaEntrega.notaFiscal
    });

    setShowEntregaModal(false);
    setNovaEntrega({ quantidade: 0, data: '', notaFiscal: '' });
    setMaterialSelecionado(null);
  };

  // Reset
  const handleReset = () => {
    setArquivoSelecionado(null);
    setPreviewData([]);
    setItensSelecionados([]);
    setEtapa('upload');
    setProgresso(0);
  };

  // Toggle seleção
  const toggleItem = (index) => {
    setItensSelecionados(prev =>
      prev.includes(index) ? prev.filter(i => i !== index) : [...prev, index]
    );
  };

  const toggleTodos = () => {
    const validIndexes = previewData
      .map((item, idx) => item.status !== STATUS_ITEM.ERRO ? idx : null)
      .filter(idx => idx !== null);

    if (itensSelecionados.length === validIndexes.length) {
      setItensSelecionados([]);
    } else {
      setItensSelecionados(validIndexes);
    }
  };

  // Estatísticas do estoque agora vem do hook useMateriais() - já importado

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold text-white flex items-center gap-3">
            <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-green-500 to-emerald-500 flex items-center justify-center">
              <FileSpreadsheet className="h-6 w-6 text-white" />
            </div>
            Import Listas GADE
          </h1>
          <p className="text-slate-400 mt-1">Lista de Corte (Peças) e Resumo de Material (Estoque)</p>
        </div>

        {etapa !== 'upload' && (
          <Button variant="outline" onClick={handleReset} className="border-slate-700 text-slate-300">
            <RefreshCw className="h-4 w-4 mr-2" />
            Nova Importação
          </Button>
        )}
      </div>

      {/* Tabs para diferentes funcionalidades */}
      <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
        <TabsList className="bg-slate-800 border border-slate-700">
          <TabsTrigger value="importar" className="data-[state=active]:bg-emerald-500">
            <Upload className="h-4 w-4 mr-2" />
            Importar Lista
          </TabsTrigger>
          <TabsTrigger value="estoque" className="data-[state=active]:bg-amber-500">
            <Warehouse className="h-4 w-4 mr-2" />
            Controle de Materiais ({estatisticasEstoque.total})
            {estatisticasEstoque.pesoPedido > 0 && (
              <Badge className="ml-2 bg-amber-500/20 text-amber-400 text-xs">
                {(estatisticasEstoque.pesoPedido / 1000).toFixed(1)}t
              </Badge>
            )}
          </TabsTrigger>
          <TabsTrigger value="historico" className="data-[state=active]:bg-blue-500">
            <FileText className="h-4 w-4 mr-2" />
            Histórico
          </TabsTrigger>
        </TabsList>

        {/* Tab: Importar */}
        <TabsContent value="importar">
          {/* Etapas */}
          <div className="flex items-center justify-center gap-4 py-4">
            {['upload', 'preview', 'processando', 'concluido'].map((step, index) => (
              <React.Fragment key={step}>
                <div className={cn(
                  "flex items-center gap-2 px-4 py-2 rounded-lg transition-all",
                  etapa === step ? "bg-emerald-500/20 text-emerald-400" :
                  ['upload', 'preview', 'processando', 'concluido'].indexOf(etapa) > index ? "bg-slate-800 text-slate-300" :
                  "bg-slate-900 text-slate-500"
                )}>
                  <div className={cn(
                    "w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold",
                    etapa === step ? "bg-emerald-500 text-white" :
                    ['upload', 'preview', 'processando', 'concluido'].indexOf(etapa) > index ? "bg-slate-600 text-white" :
                    "bg-slate-700 text-slate-500"
                  )}>
                    {['upload', 'preview', 'processando', 'concluido'].indexOf(etapa) > index ? (
                      <Check className="h-3 w-3" />
                    ) : (
                      index + 1
                    )}
                  </div>
                  <span className="text-sm font-medium capitalize">{step}</span>
                </div>
                {index < 3 && <ArrowRight className="h-4 w-4 text-slate-600" />}
              </React.Fragment>
            ))}
          </div>

          <AnimatePresence mode="wait">
            {/* Etapa 1: Upload */}
            {etapa === 'upload' && (
              <motion.div
                key="upload"
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -20 }}
                className="space-y-6"
              >
                {/* Seleção de Obra */}
                <Card className="bg-slate-900/60 border-slate-700/50">
                  <CardHeader>
                    <CardTitle className="text-white flex items-center gap-2">
                      <Building2 className="h-5 w-5 text-blue-400" />
                      Selecione a Obra
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <Select value={obraSelecionada} onValueChange={setObraSelecionada}>
                      <SelectTrigger className="w-full bg-slate-800 border-slate-700">
                        <SelectValue placeholder="Selecione uma obra" />
                      </SelectTrigger>
                      <SelectContent className="bg-slate-800 border-slate-700">
                        {obras.map(obra => (
                          <SelectItem key={obra.id} value={obra.id}>
                            <span className="font-mono text-cyan-400">{obra.codigo}</span>
                            <span className="mx-2">-</span>
                            <span>{obra.nome}</span>
                            <span className="text-slate-500 ml-2">({obra.cliente})</span>
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </CardContent>
                </Card>

                {/* Área de Upload */}
                <Card className="bg-slate-900/60 border-slate-700/50">
                  <CardHeader>
                    <CardTitle className="text-white flex items-center gap-2">
                      <Upload className="h-5 w-5 text-emerald-400" />
                      Upload do Arquivo
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div
                      onDragOver={handleDragOver}
                      onDragLeave={handleDragLeave}
                      onDrop={handleDrop}
                      className={cn(
                        "border-2 border-dashed rounded-xl p-12 text-center transition-all cursor-pointer",
                        isDragging ? "border-emerald-500 bg-emerald-500/10" : "border-slate-600 hover:border-slate-500",
                        !obraSelecionada && "opacity-50 pointer-events-none"
                      )}
                      onClick={() => document.getElementById('file-input').click()}
                    >
                      <FileSpreadsheet className="h-16 w-16 text-slate-500 mx-auto mb-4" />
                      <p className="text-lg font-medium text-white mb-2">
                        Arraste o arquivo Excel aqui
                      </p>
                      <p className="text-slate-400 mb-4">ou clique para selecionar</p>
                      <Badge variant="outline" className="border-slate-600 text-slate-400">
                        Formatos aceitos: .xlsx, .xls, .csv
                      </Badge>
                      <input
                        id="file-input"
                        type="file"
                        accept=".xlsx,.xls,.csv"
                        className="hidden"
                        onChange={(e) => handleFileSelect(e.target.files[0])}
                        disabled={!obraSelecionada}
                      />
                    </div>

                    {/* Tipos de Lista */}
                    <div className="mt-6 grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div className="p-4 bg-orange-500/10 border border-orange-500/30 rounded-lg">
                        <h4 className="font-semibold text-orange-400 mb-2 flex items-center gap-2">
                          <Scissors className="h-4 w-4" />
                          Lista de Corte (GADE)
                        </h4>
                        <p className="text-sm text-slate-300 mb-2">
                          Arquivo: <code className="text-cyan-400">*LISTA_MATERIAIS PARA CORTE*</code>
                        </p>
                        <p className="text-xs text-slate-400">
                          Colunas: PEÇA, MARCA, QUANTIDADE, PERFIL, COMPRIMENTO, MATERIAL, PESO
                        </p>
                        <p className="text-xs text-emerald-400 mt-2">
                          → Gera peças no módulo de Produção
                        </p>
                      </div>

                      <div className="p-4 bg-blue-500/10 border border-blue-500/30 rounded-lg">
                        <h4 className="font-semibold text-blue-400 mb-2 flex items-center gap-2">
                          <Warehouse className="h-4 w-4" />
                          Resumo de Material (GADE)
                        </h4>
                        <p className="text-sm text-slate-300 mb-2">
                          Arquivo: <code className="text-cyan-400">*LISTA_RESUMO DE MATERIAL*</code>
                        </p>
                        <p className="text-xs text-slate-400">
                          Colunas: PERFIL, MATERIAL, COMPRIMENTO TOTAL, PESO TOTAL
                        </p>
                        <p className="text-xs text-emerald-400 mt-2">
                          → Entrada no controle de Estoque
                        </p>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </motion.div>
            )}

            {/* Etapa 2: Preview */}
            {etapa === 'preview' && (
              <motion.div
                key="preview"
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -20 }}
                className="space-y-6"
              >
                {/* Info do arquivo */}
                <Card className="bg-slate-900/60 border-slate-700/50">
                  <CardContent className="p-4">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-4">
                        {tipoLista === TIPO_LISTA.CORTE ? (
                          <Scissors className="h-10 w-10 text-orange-400" />
                        ) : (
                          <Warehouse className="h-10 w-10 text-blue-400" />
                        )}
                        <div>
                          <p className="font-semibold text-white">{arquivoSelecionado?.name}</p>
                          <p className="text-sm text-slate-400">
                            <Badge className={cn("mr-2", tipoLista === TIPO_LISTA.CORTE ? "bg-orange-500/20 text-orange-400" : "bg-blue-500/20 text-blue-400")}>
                              {tipoLista === TIPO_LISTA.CORTE ? 'Lista de Corte' : 'Resumo de Material'}
                            </Badge>
                            {previewData.length} itens encontrados •
                            {previewData.filter(i => i.status === 'novo').length} novos •
                            {previewData.filter(i => i.status === 'duplicado' || i.status === 'atualizado').length} existentes
                          </p>
                        </div>
                      </div>
                      <Badge variant="outline" className="border-emerald-500/30 text-emerald-400">
                        <CheckCircle2 className="h-4 w-4 mr-1" />
                        Arquivo válido
                      </Badge>
                    </div>
                  </CardContent>
                </Card>

                {/* Tabela de Preview */}
                <Card className="bg-slate-900/60 border-slate-700/50">
                  <CardHeader className="flex flex-row items-center justify-between">
                    <CardTitle className="text-white flex items-center gap-2">
                      <Eye className="h-5 w-5 text-blue-400" />
                      Preview dos Dados ({previewData.length} itens)
                    </CardTitle>
                    <Button variant="outline" size="sm" onClick={toggleTodos} className="border-slate-700 text-slate-300">
                      {itensSelecionados.length === previewData.filter(i => i.status !== 'erro').length ? 'Desmarcar Todos' : 'Selecionar Todos'}
                    </Button>
                  </CardHeader>
                  <CardContent>
                    <div className="max-h-[400px] overflow-y-auto">
                      <Table>
                        <TableHeader>
                          <TableRow className="border-slate-700">
                            <TableHead className="w-12"></TableHead>
                            {tipoLista === TIPO_LISTA.CORTE ? (
                              <>
                                <TableHead className="text-slate-400">Tipo</TableHead>
                                <TableHead className="text-slate-400">Marca</TableHead>
                                <TableHead className="text-slate-400">Perfil</TableHead>
                                <TableHead className="text-slate-400 text-right">Qtd</TableHead>
                                <TableHead className="text-slate-400 text-right">Comp (mm)</TableHead>
                                <TableHead className="text-slate-400 text-right">Peso (kg)</TableHead>
                              </>
                            ) : (
                              <>
                                <TableHead className="text-slate-400">Perfil</TableHead>
                                <TableHead className="text-slate-400">Material</TableHead>
                                <TableHead className="text-slate-400 text-right">Peso Pedido (kg)</TableHead>
                                <TableHead className="text-slate-400 text-center">Status Estoque</TableHead>
                              </>
                            )}
                            <TableHead className="text-slate-400">Status</TableHead>
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                          {previewData.slice(0, 100).map((item, index) => (
                            <TableRow key={index} className={cn("border-slate-800", item.status === 'erro' && "opacity-50")}>
                              <TableCell>
                                <Checkbox
                                  checked={itensSelecionados.includes(index)}
                                  onCheckedChange={() => toggleItem(index)}
                                  disabled={item.status === 'erro'}
                                />
                              </TableCell>
                              {tipoLista === TIPO_LISTA.CORTE ? (
                                <>
                                  <TableCell className="text-white font-medium">{item.tipo}</TableCell>
                                  <TableCell className="font-mono text-cyan-400">{item.marca}</TableCell>
                                  <TableCell className="text-slate-300">{item.perfil}</TableCell>
                                  <TableCell className="text-right text-white">{item.quantidade}</TableCell>
                                  <TableCell className="text-right text-slate-300">{item.comprimento?.toLocaleString()}</TableCell>
                                  <TableCell className="text-right text-orange-400">{item.peso?.toLocaleString()}</TableCell>
                                </>
                              ) : (
                                <>
                                  <TableCell className="font-mono text-cyan-400 font-semibold">{item.perfil}</TableCell>
                                  <TableCell className="text-slate-300">{item.material}</TableCell>
                                  <TableCell className="text-right text-orange-400 font-bold text-lg">{item.pesoPedido?.toLocaleString()} kg</TableCell>
                                  <TableCell className="text-center">
                                    <Badge className="bg-blue-500/20 text-blue-400">→ Estoque</Badge>
                                  </TableCell>
                                </>
                              )}
                              <TableCell>
                                <Badge className={cn("border", getStatusColor(item.status))}>
                                  {item.status}
                                </Badge>
                              </TableCell>
                            </TableRow>
                          ))}
                        </TableBody>
                      </Table>
                      {previewData.length > 100 && (
                        <p className="text-center text-slate-500 py-2">
                          Mostrando 100 de {previewData.length} itens
                        </p>
                      )}
                    </div>
                  </CardContent>
                </Card>

                {/* Resumo e Ações */}
                <div className="flex items-center justify-between">
                  <div className="text-sm text-slate-400">
                    <span className="text-white font-semibold">{itensSelecionados.length}</span> de {previewData.length} itens selecionados
                    <span className="ml-4">
                      Peso total: <span className="text-orange-400 font-semibold text-lg">
                        {tipoLista === TIPO_LISTA.CORTE
                          ? previewData.filter((_, i) => itensSelecionados.includes(i)).reduce((a, b) => a + (b.peso || 0), 0).toLocaleString()
                          : previewData.filter((_, i) => itensSelecionados.includes(i)).reduce((a, b) => a + (b.pesoPedido || 0), 0).toLocaleString()
                        } kg
                      </span>
                    </span>
                    {tipoLista === TIPO_LISTA.RESUMO_MATERIAL && (
                      <Badge className="ml-4 bg-blue-500/20 text-blue-400">
                        → Vai para Controle de Materiais
                      </Badge>
                    )}
                  </div>
                  <div className="flex gap-2">
                    <Button variant="outline" onClick={handleReset} className="border-slate-700 text-slate-300">
                      <X className="h-4 w-4 mr-2" />
                      Cancelar
                    </Button>
                    <Button
                      onClick={handleImportar}
                      disabled={itensSelecionados.length === 0}
                      className="bg-gradient-to-r from-emerald-500 to-green-500"
                    >
                      <Upload className="h-4 w-4 mr-2" />
                      Importar {itensSelecionados.length} Itens
                    </Button>
                  </div>
                </div>
              </motion.div>
            )}

            {/* Etapa 3: Processando */}
            {etapa === 'processando' && (
              <motion.div
                key="processando"
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -20 }}
                className="flex flex-col items-center justify-center py-20"
              >
                <div className="w-full max-w-md space-y-6">
                  <div className="text-center">
                    <RefreshCw className="h-16 w-16 text-emerald-400 mx-auto mb-4 animate-spin" />
                    <h2 className="text-2xl font-bold text-white">Processando Importação</h2>
                    <p className="text-slate-400 mt-2">
                      {tipoLista === TIPO_LISTA.CORTE ? 'Criando peças...' : 'Adicionando materiais ao estoque...'}
                    </p>
                  </div>
                  <div className="space-y-2">
                    <div className="flex justify-between text-sm">
                      <span className="text-slate-400">Progresso</span>
                      <span className="text-emerald-400 font-semibold">{progresso}%</span>
                    </div>
                    <Progress value={progresso} className="h-3" />
                  </div>
                </div>
              </motion.div>
            )}

            {/* Etapa 4: Concluído */}
            {etapa === 'concluido' && (
              <motion.div
                key="concluido"
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                className="flex flex-col items-center justify-center py-20"
              >
                <div className="text-center space-y-6">
                  <div className="w-20 h-20 rounded-full bg-emerald-500/20 flex items-center justify-center mx-auto">
                    <CheckCircle2 className="h-10 w-10 text-emerald-400" />
                  </div>
                  <div>
                    <h2 className="text-2xl font-bold text-white">Importação Concluída!</h2>
                    <p className="text-slate-400 mt-2">
                      {itensSelecionados.length} {tipoLista === TIPO_LISTA.CORTE ? 'peças' : 'materiais'} importados com sucesso
                    </p>
                  </div>
                  <div className="flex items-center gap-4">
                    <Button variant="outline" onClick={handleReset} className="border-slate-700 text-slate-300">
                      Nova Importação
                    </Button>
                    <Button
                      onClick={() => {
                        const mensagem = tipoLista === TIPO_LISTA.CORTE
                          ? 'Abrindo peças na tela de Produção...'
                          : 'Abrindo materiais no Estoque...';
                        toast(mensagem);
                      }}
                      className="bg-gradient-to-r from-blue-500 to-cyan-500"
                    >
                      <Eye className="h-4 w-4 mr-2" />
                      {tipoLista === TIPO_LISTA.CORTE ? 'Ver na Produção' : 'Ver Estoque'}
                    </Button>
                  </div>
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </TabsContent>

        {/* Tab: Controle de Materiais / Estoque */}
        <TabsContent value="estoque">
          <div className="space-y-6">
            {/* Cards de Resumo */}
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
              <Card className="bg-slate-900/60 border-slate-700/50">
                <CardContent className="p-4 text-center">
                  <Package className="h-8 w-8 text-blue-400 mx-auto mb-2" />
                  <p className="text-2xl font-bold text-white">{estatisticasEstoque.total}</p>
                  <p className="text-xs text-slate-400">Materiais Pedidos</p>
                </CardContent>
              </Card>
              <Card className="bg-slate-900/60 border-slate-700/50">
                <CardContent className="p-4 text-center">
                  <Clock className="h-8 w-8 text-slate-400 mx-auto mb-2" />
                  <p className="text-2xl font-bold text-slate-300">{estatisticasEstoque.pendentes}</p>
                  <p className="text-xs text-slate-400">Pendentes</p>
                </CardContent>
              </Card>
              <Card className="bg-slate-900/60 border-slate-700/50">
                <CardContent className="p-4 text-center">
                  <TrendingUp className="h-8 w-8 text-amber-400 mx-auto mb-2" />
                  <p className="text-2xl font-bold text-amber-400">{estatisticasEstoque.parciais}</p>
                  <p className="text-xs text-slate-400">Parciais</p>
                </CardContent>
              </Card>
              <Card className="bg-slate-900/60 border-slate-700/50">
                <CardContent className="p-4 text-center">
                  <CheckCircle2 className="h-8 w-8 text-emerald-400 mx-auto mb-2" />
                  <p className="text-2xl font-bold text-emerald-400">{estatisticasEstoque.completos}</p>
                  <p className="text-xs text-slate-400">Completos</p>
                </CardContent>
              </Card>
            </div>

            {/* Barra de Progresso Geral - CONTROLE EM PESO (KG) */}
            {estatisticasEstoque.pesoPedido > 0 && (
              <Card className="bg-gradient-to-r from-slate-900/80 to-slate-800/60 border-slate-700/50">
                <CardContent className="p-6">
                  <div className="flex justify-between items-center mb-3">
                    <div>
                      <span className="text-slate-400 text-sm">Progresso de Recebimento</span>
                      <p className="text-2xl font-bold text-white">
                        {estatisticasEstoque.percentualGeral}%
                      </p>
                    </div>
                    <div className="text-right">
                      <p className="text-emerald-400 font-semibold">
                        {estatisticasEstoque.pesoRecebido.toLocaleString()} kg recebido
                      </p>
                      <p className="text-slate-400 text-sm">
                        de {estatisticasEstoque.pesoPedido.toLocaleString()} kg pedido
                      </p>
                      <p className="text-red-400 text-sm font-medium">
                        Falta: {estatisticasEstoque.pesoFalta.toLocaleString()} kg
                      </p>
                    </div>
                  </div>
                  <Progress
                    value={estatisticasEstoque.percentualGeral}
                    className="h-5"
                  />
                  <div className="flex justify-between mt-2 text-xs text-slate-500">
                    <span>0 kg</span>
                    <span>{(estatisticasEstoque.pesoPedido / 1000).toFixed(1)} toneladas</span>
                  </div>
                </CardContent>
              </Card>
            )}

            {/* Tabela de Materiais */}
            <Card className="bg-slate-900/60 border-slate-700/50">
              <CardHeader>
                <CardTitle className="text-white flex items-center gap-2">
                  <Warehouse className="h-5 w-5 text-amber-400" />
                  Materiais Pedidos vs Recebidos
                </CardTitle>
              </CardHeader>
              <CardContent>
                {materiaisEstoque.length === 0 ? (
                  <div className="text-center py-12">
                    <Warehouse className="h-16 w-16 text-slate-600 mx-auto mb-4" />
                    <p className="text-slate-400">Nenhum material importado ainda</p>
                    <p className="text-sm text-slate-500">Importe uma Lista de Resumo de Material para começar</p>
                  </div>
                ) : (
                  <Table>
                    <TableHeader>
                      <TableRow className="border-slate-700">
                        <TableHead className="text-slate-400">Perfil</TableHead>
                        <TableHead className="text-slate-400">Material</TableHead>
                        <TableHead className="text-slate-400 text-right">Pedido (kg)</TableHead>
                        <TableHead className="text-slate-400 text-right">Recebido (kg)</TableHead>
                        <TableHead className="text-slate-400 text-right">Falta (kg)</TableHead>
                        <TableHead className="text-slate-400 text-center">%</TableHead>
                        <TableHead className="text-slate-400">Status</TableHead>
                        <TableHead className="text-slate-400">Ações</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {materiaisEstoque.map((mat) => (
                        <TableRow key={mat.id} className="border-slate-800 hover:bg-slate-800/50">
                          <TableCell className="font-mono text-cyan-400 font-semibold">{mat.perfil}</TableCell>
                          <TableCell className="text-slate-300">{mat.material}</TableCell>
                          <TableCell className="text-right text-white font-medium">{mat.pesoPedido?.toLocaleString()}</TableCell>
                          <TableCell className="text-right text-emerald-400 font-medium">{mat.pesoRecebido?.toLocaleString()}</TableCell>
                          <TableCell className="text-right text-red-400 font-medium">
                            {mat.pesoFalta?.toLocaleString()}
                          </TableCell>
                          <TableCell className="text-center">
                            <span className={cn(
                              "font-bold",
                              mat.percentualRecebido >= 100 ? "text-emerald-400" :
                              mat.percentualRecebido >= 50 ? "text-amber-400" : "text-slate-400"
                            )}>
                              {mat.percentualRecebido}%
                            </span>
                          </TableCell>
                          <TableCell>
                            <Badge className={cn("border", getStatusColor(mat.status))}>
                              {mat.status === 'pendente' && '⏳ Pendente'}
                              {mat.status === 'parcial' && '📦 Parcial'}
                              {mat.status === 'completo' && '✅ Completo'}
                            </Badge>
                          </TableCell>
                          <TableCell>
                            <Button
                              size="sm"
                              variant="outline"
                              className="border-emerald-500/30 text-emerald-400 hover:bg-emerald-500/10"
                              onClick={() => {
                                setMaterialSelecionado(mat);
                                setShowEntregaModal(true);
                              }}
                              disabled={mat.status === 'completo'}
                            >
                              <Truck className="h-3 w-3 mr-1" />
                              Entrega
                            </Button>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                )}
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        {/* Tab: Histórico */}
        <TabsContent value="historico">
          <Card className="bg-slate-900/60 border-slate-700/50">
            <CardHeader>
              <CardTitle className="text-white flex items-center gap-2">
                <FileText className="h-5 w-5 text-blue-400" />
                Histórico de Importações
              </CardTitle>
            </CardHeader>
            <CardContent>
              {historicoImportacoes.length === 0 ? (
                <div className="text-center py-12">
                  <FileText className="h-16 w-16 text-slate-600 mx-auto mb-4" />
                  <p className="text-slate-400">Nenhuma importação realizada ainda</p>
                </div>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow className="border-slate-700">
                      <TableHead className="text-slate-400">Arquivo</TableHead>
                      <TableHead className="text-slate-400">Tipo</TableHead>
                      <TableHead className="text-slate-400">Obra</TableHead>
                      <TableHead className="text-slate-400">Data</TableHead>
                      <TableHead className="text-slate-400">Itens</TableHead>
                      <TableHead className="text-slate-400">Status</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {historicoImportacoes.map(item => (
                      <TableRow key={item.id} className="border-slate-800">
                        <TableCell className="font-mono text-sm text-white">{item.arquivo}</TableCell>
                        <TableCell>
                          <Badge className={item.tipo === 'corte' ? 'bg-orange-500/20 text-orange-400' : 'bg-blue-500/20 text-blue-400'}>
                            {item.tipo === 'corte' ? 'Corte' : 'Material'}
                          </Badge>
                        </TableCell>
                        <TableCell className="text-slate-300">{item.obra}</TableCell>
                        <TableCell className="text-slate-400">{new Date(item.data).toLocaleDateString('pt-BR')}</TableCell>
                        <TableCell className="text-white font-semibold">{item.itens}</TableCell>
                        <TableCell>
                          <Badge className={cn("border", getStatusColor(item.status))}>
                            <CheckCircle2 className="h-3 w-3 mr-1" />
                            Sucesso
                          </Badge>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* Modal de Entrega */}
      <Dialog open={showEntregaModal} onOpenChange={setShowEntregaModal}>
        <DialogContent className="bg-slate-900 border-slate-700">
          <DialogHeader>
            <DialogTitle className="text-white flex items-center gap-2">
              <Truck className="h-5 w-5 text-emerald-400" />
              Registrar Entrega de Material
            </DialogTitle>
          </DialogHeader>

          {materialSelecionado && (
            <div className="space-y-4">
              {/* Info do Material */}
              <div className="p-4 bg-slate-800 rounded-lg border border-slate-700">
                <div className="flex justify-between items-start">
                  <div>
                    <p className="text-sm text-slate-400">Material:</p>
                    <p className="text-white font-bold text-lg">{materialSelecionado.perfil}</p>
                    <p className="text-slate-400 text-sm">{materialSelecionado.material}</p>
                  </div>
                  <Badge className={cn("border", getStatusColor(materialSelecionado.status))}>
                    {materialSelecionado.percentualRecebido}% recebido
                  </Badge>
                </div>

                <div className="grid grid-cols-3 gap-3 mt-4 pt-3 border-t border-slate-700">
                  <div className="text-center">
                    <p className="text-white font-bold">{materialSelecionado.pesoPedido?.toLocaleString()}</p>
                    <p className="text-xs text-slate-400">Pedido (kg)</p>
                  </div>
                  <div className="text-center">
                    <p className="text-emerald-400 font-bold">{materialSelecionado.pesoRecebido?.toLocaleString()}</p>
                    <p className="text-xs text-slate-400">Recebido (kg)</p>
                  </div>
                  <div className="text-center">
                    <p className="text-red-400 font-bold">{materialSelecionado.pesoFalta?.toLocaleString()}</p>
                    <p className="text-xs text-slate-400">Falta (kg)</p>
                  </div>
                </div>
              </div>

              {/* Input de Quantidade */}
              <div>
                <label className="text-sm text-slate-400 mb-1 block">Peso Recebido (kg)</label>
                <Input
                  type="number"
                  value={novaEntrega.quantidade}
                  onChange={(e) => setNovaEntrega(prev => ({ ...prev, quantidade: parseFloat(e.target.value) || 0 }))}
                  className="bg-slate-800 border-slate-700 text-lg font-bold"
                  placeholder="0"
                  max={materialSelecionado.pesoFalta}
                />
                {novaEntrega.quantidade > 0 && (
                  <p className="text-xs text-emerald-400 mt-1">
                    Após entrega: {(materialSelecionado.pesoRecebido + novaEntrega.quantidade).toLocaleString()} kg recebido
                    ({Math.min(100, Math.round(((materialSelecionado.pesoRecebido + novaEntrega.quantidade) / materialSelecionado.pesoPedido) * 100))}%)
                  </p>
                )}
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-sm text-slate-400 mb-1 block">Data da Entrega</label>
                  <Input
                    type="date"
                    value={novaEntrega.data}
                    onChange={(e) => setNovaEntrega(prev => ({ ...prev, data: e.target.value }))}
                    className="bg-slate-800 border-slate-700"
                  />
                </div>
                <div>
                  <label className="text-sm text-slate-400 mb-1 block">Nota Fiscal</label>
                  <Input
                    value={novaEntrega.notaFiscal}
                    onChange={(e) => setNovaEntrega(prev => ({ ...prev, notaFiscal: e.target.value }))}
                    className="bg-slate-800 border-slate-700"
                    placeholder="Número da NF"
                  />
                </div>
              </div>
            </div>
          )}

          <DialogFooter>
            <Button variant="outline" onClick={() => setShowEntregaModal(false)} className="border-slate-700">
              Cancelar
            </Button>
            <Button
              onClick={handleRegistrarEntrega}
              disabled={!novaEntrega.quantidade || novaEntrega.quantidade <= 0}
              className="bg-emerald-500 hover:bg-emerald-600"
            >
              <Check className="h-4 w-4 mr-2" />
              Registrar Entrega
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
