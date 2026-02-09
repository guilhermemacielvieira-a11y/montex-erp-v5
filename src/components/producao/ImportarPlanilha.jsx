import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Upload, FileSpreadsheet, Loader2, Check, Download } from 'lucide-react';
import { base44 } from '@/api/base44Client';
import { toast } from 'sonner';
import ColumnMapper from './ColumnMapper';
import DataValidator from './DataValidator';
import TransformationRules from './TransformationRules';
import MapeamentosList from './MapeamentosList';

export default function ImportarPlanilha({ projetos, onImportSuccess }) {
   const [showModal, setShowModal] = useState(false);
   const [uploading, setUploading] = useState(false);
   const [importing, setImporting] = useState(false);
   const [dadosPreview, setDadosPreview] = useState(null);
   const [projetoSelecionado, setProjetoSelecionado] = useState('');
   const [etapaAtiva, setEtapaAtiva] = useState('fabricacao');
   const [etapaDefinida, setEtapaDefinida] = useState(null);
   const [showColumnMapper, setShowColumnMapper] = useState(false);
   const [rawColumns, setRawColumns] = useState([]);
   const [columnMapping, setColumnMapping] = useState(null);
   const [validationErrors, setValidationErrors] = useState(null);
   const [rawData, setRawData] = useState(null);
   const [transformacoes, setTransformacoes] = useState([]);
   const [colunaEtapa, setColunaEtapa] = useState('');
   const [mapeamentosSalvos, setMapeamentosSalvos] = useState([]);

   const parseCSV = (text) => {
     const lines = text.trim().split('\n');
     if (lines.length < 2) return [];

     const headers = lines[0].split(',').map(h => h.trim());
     return lines.slice(1).map(line => {
       const values = line.split(',').map(v => v.trim());
       return headers.reduce((obj, header, idx) => {
         obj[header] = values[idx] || '';
         return obj;
       }, {});
     });
   };

   const parseTXT = (text) => {
     const lines = text.trim().split('\n');
     if (lines.length < 2) return [];

     // Detectar separador (TAB ou ponto-e-vírgula)
     const separador = lines[0].includes('\t') ? '\t' : 
                       lines[0].includes(';') ? ';' : '\t';

     const headers = lines[0].split(separador).map(h => h.trim());
     return lines.slice(1).map(line => {
       const values = line.split(separador).map(v => v.trim());
       return headers.reduce((obj, header, idx) => {
         obj[header] = values[idx] || '';
         return obj;
       }, {});
     });
   };

   const parseJSON = (text) => {
      const data = JSON.parse(text);
      // Se for um objeto, converter para array
      if (!Array.isArray(data)) {
        return Object.values(data);
      }
      return data;
    };

   useEffect(() => {
     const carregarMapeamentos = async () => {
       try {
         const maps = await base44.entities.MapeamentoPredefinido.list();
         setMapeamentosSalvos(maps);
       } catch (error) {
         console.log('Erro ao carregar mapeamentos:', error);
       }
     };
     carregarMapeamentos();
   }, []);

   const aplicarTransformacao = (valor, transformacao) => {
     if (!transformacao || !valor) return valor;

     switch (transformacao.tipo_transformacao) {
       case 'data':
         const dateStr = String(valor).trim();
         if (transformacao.formato) {
           // Converter de um formato para outro
           return dateStr; // Simplificado - em produção seria mais robusto
         }
         return dateStr;
       case 'numero':
         const numVal = parseFloat(String(valor).replace(/[^0-9.,]/g, '').replace(',', '.'));
         return isNaN(numVal) ? 0 : parseFloat(numVal.toFixed(transformacao.casas_decimais || 2));
       case 'texto':
         return String(valor).trim();
       case 'maiuscula':
         return String(valor).toUpperCase();
       case 'minuscula':
         return String(valor).toLowerCase();
       case 'trim':
         return String(valor).trim();
       default:
         return valor;
     }
   };

   const carregarMapeamentoPredefinido = (mapeamento) => {
     setColumnMapping(mapeamento.mapeamento);
     setTransformacoes(mapeamento.transformacoes || []);
     setColunaEtapa(mapeamento.coluna_etapa);
     toast.success(`Mapeamento "${mapeamento.nome}" carregado!`);
   };

   const validateData = (items, mapping, etapaCol) => {
     const valid = [];
     const invalid = [];
     const warnings = [];

     items.forEach((row, index) => {
       const rowErrors = [];
       const rowWarnings = [];
       const rowNum = index + 2; // +1 para header, +1 para numeração humana

       // Validar campo obrigatório: nome
       const nomeVal = mapping.nome ? row[mapping.nome] : '';
       if (!nomeVal || String(nomeVal).trim().length === 0) {
         rowErrors.push('Nome é obrigatório');
       }

       // Validar campo obrigatório: quantidade
       const qtdVal = mapping.quantidade ? row[mapping.quantidade] : '';
       const qtd = parseFloat(String(qtdVal).replace(/[^0-9.,]/g, '').replace(',', '.'));
       if (!qtdVal || isNaN(qtd) || qtd <= 0) {
         rowErrors.push('Quantidade deve ser um número maior que 0');
       }

       // Validar peso unitário se informado
       if (mapping.peso_unitario && row[mapping.peso_unitario]) {
         const pesoVal = parseFloat(String(row[mapping.peso_unitario]).replace(/[^0-9.,]/g, '').replace(',', '.'));
         if (isNaN(pesoVal)) {
           rowErrors.push('Peso unitário deve ser um número');
         } else if (pesoVal < 0) {
           rowErrors.push('Peso unitário não pode ser negativo');
         }
       }

       // Validar datas se informadas
       if (mapping.data_inicio && row[mapping.data_inicio]) {
         const dateVal = row[mapping.data_inicio];
         if (!isValidDate(String(dateVal))) {
           rowWarnings.push('Data de início inválida (use YYYY-MM-DD)');
         }
       }

       if (mapping.data_fim_prevista && row[mapping.data_fim_prevista]) {
         const dateVal = row[mapping.data_fim_prevista];
         if (!isValidDate(String(dateVal))) {
           rowWarnings.push('Data de fim prevista inválida (use YYYY-MM-DD)');
         }
       }

       // Validar etapa
       const etapaVal = String(row[etapaCol] || '').toLowerCase().trim();
       if (!etapaVal.includes('montag') && !etapaVal.includes('fabric')) {
         rowWarnings.push(`Etapa "${row[etapaCol]}" não reconhecida (assumindo fabricação)`);
       }

       if (rowErrors.length === 0) {
         valid.push({ ...row, rowNum });
       } else {
         invalid.push({ row: rowNum, errors: rowErrors });
       }

       if (rowWarnings.length > 0) {
         warnings.push({ row: rowNum, message: rowWarnings.join('; ') });
       }
     });

     return { valid, invalid, warnings };
   };

   const isValidDate = (dateString) => {
     const regex = /^\d{4}-\d{2}-\d{2}$/;
     if (!regex.test(dateString)) return false;
     const date = new Date(dateString);
     return date instanceof Date && !isNaN(date);
   };

  const gerarTemplate = async () => {
    const XLSX = await import('xlsx');
    const wb = XLSX.utils.book_new();

    const templateData = [
      ['TEMPLATE DE IMPORTAÇÃO - ITENS DE PRODUÇÃO'],
      [''],
      ['INSTRUÇÕES:'],
      ['1. Preencha todos os dados abaixo'],
      ['2. Etapa: fabricacao ou montagem'],
      ['3. Não altere os nomes das colunas'],
      ['4. Salve e faça upload do arquivo'],
      [''],
      ['Código', 'Nome', 'Marca', 'Peso Unitário (kg)', 'Quantidade', 'Etapa', 'Responsável', 'Data Início', 'Data Fim Prevista', 'Observações'],
      ['P001', 'Viga W250x73', 'Gerdau', '73', '10', 'fabricacao', 'João Silva', '2026-02-01', '2026-02-15', 'Material principal'],
      ['P002', 'Coluna W360x101', 'Gerdau', '101', '8', 'fabricacao', 'João Silva', '2026-02-01', '2026-02-20', ''],
      ['P003', 'Terça Z150', 'Belgo', '12', '50', 'fabricacao', 'Maria Santos', '2026-02-05', '2026-02-25', ''],
      ['M001', 'Montagem Vigas Principais', '', '0', '10', 'montagem', 'Carlos Oliveira', '2026-02-20', '2026-03-05', 'Após fabricação'],
      ['M002', 'Montagem Terças', '', '0', '50', 'montagem', 'Carlos Oliveira', '2026-02-25', '2026-03-10', ''],
      ['', '', '', '', '', '', '', '', '', ''],
    ];

    const ws = XLSX.utils.aoa_to_sheet(templateData);
    ws['!cols'] = [
      { wch: 12 }, { wch: 25 }, { wch: 15 }, { wch: 20 }, 
      { wch: 12 }, { wch: 15 }, { wch: 20 }, { wch: 15 }, 
      { wch: 18 }, { wch: 30 }
    ];

    XLSX.utils.book_append_sheet(wb, ws, 'Itens de Produção');
    XLSX.writeFile(wb, 'template_itens_producao.xlsx');
    toast.success('Template baixado com sucesso!');
  };

  const handleFileUpload = async (e) => {
    const file = e.target.files[0];
    if (!file) return;

    setUploading(true);

    try {
      let jsonData = [];
      const fileName = file.name.toLowerCase();

      if (fileName.endsWith('.xlsx') || fileName.endsWith('.xls')) {
        // Processar Excel
        const XLSX = await import('xlsx');
        const data = await file.arrayBuffer();
        const workbook = XLSX.read(data);
        const worksheet = workbook.Sheets[workbook.SheetNames[0]];
        jsonData = XLSX.utils.sheet_to_json(worksheet, { defval: '' });
      } else if (fileName.endsWith('.csv')) {
        // Processar CSV
        const text = await file.text();
        jsonData = parseCSV(text);
      } else if (fileName.endsWith('.txt')) {
        // Processar TXT
        const text = await file.text();
        jsonData = parseTXT(text);
      } else if (fileName.endsWith('.json')) {
        // Processar JSON
        const text = await file.text();
        jsonData = parseJSON(text);
      } else {
        toast.error('Formato não suportado. Use .xlsx, .csv, .txt ou .json');
        setUploading(false);
        return;
      }

      // Detectar colunas automaticamente
      const firstRow = jsonData[0];
      if (!firstRow) {
        toast.error('Planilha vazia');
        setUploading(false);
        return;
      }

      // Processar dados com flexibilidade de nomes de colunas
      const chavesPlanilha = Object.keys(jsonData[0] || {});
      console.log('Colunas encontradas:', chavesPlanilha);

      // Armazenar dados brutos e colunas para mapeamento
      setRawData(jsonData);
      setRawColumns(chavesPlanilha);
      setShowColumnMapper(true);

      setUploading(false);
      } catch (error) {
      console.error('Erro ao ler planilha:', error);
      toast.error(`Erro ao ler planilha: ${error.message}`);
      setUploading(false);
      }
      };

      const processDataWithMapping = (mapping, etapaColumn) => {
      if (!rawData || !columnMapping) return;

      const itensProcessados = rawData
      .filter(row => {
        const temNome = mapping.nome && row[mapping.nome] && String(row[mapping.nome]).trim().length > 0;
        return temNome;
      })
      .map(row => {
        const getValor = (fieldKey) => {
          const coluna = mapping[fieldKey];
          if (!coluna || !row[coluna]) return '';
          const valor = String(row[coluna] || '').trim();
          
          // Aplicar transformação se existir
          const transformacao = transformacoes.find(t => t.campo === fieldKey);
          return transformacao ? aplicarTransformacao(valor, transformacao) : valor;
        };

        const codigo = getValor('codigo');
        const nome = getValor('nome');
        const marca = getValor('marca');
        const pesoStr = getValor('peso_unitario');
        const qtdStr = getValor('quantidade');
        const etapaStr = row[etapaColumn] || '';
        const responsavel = getValor('responsavel');
        const dataInicio = getValor('data_inicio');
        const dataFimPrevista = getValor('data_fim_prevista');
        const observacoes = getValor('observacoes');

        let pesoUnit = parseFloat(String(pesoStr).replace(/[^0-9.,]/g, '').replace(',', '.') || 0);
        let quantidade = parseFloat(String(qtdStr).replace(/[^0-9.,]/g, '').replace(',', '.') || 0);
        let pesoTotal = pesoUnit * quantidade;

        const etapa = String(etapaStr).toLowerCase().includes('montag') ? 'montagem' : 'fabricacao';

        return {
          codigo: codigo || `ITEM-${Math.random().toString(36).substr(2, 9)}`,
          nome,
          marca,
          peso_unitario: Math.round(pesoUnit * 100) / 100,
          quantidade,
          etapa,
          responsavel,
          data_inicio: dataInicio,
          data_fim_prevista: dataFimPrevista,
          observacoes,
          peso_total: Math.round(pesoTotal * 100) / 100
        };
      });

      // Validar dados
      const validation = validateData(itensProcessados, mapping, etapaColumn);

      if (validation.valid.length === 0) {
      toast.error('Nenhum item válido para importar');
      setValidationErrors(validation);
      return;
      }

      setValidationErrors(validation);
      setDadosPreview(validation.valid);
      setEtapaDefinida(etapaAtiva);
      toast.success(`${validation.valid.length} itens válidos carregados!`);
      };

      const handleMapperComplete = ({ mapping, etapaColumn }) => {
        setColumnMapping(mapping);
        setColunaEtapa(etapaColumn);
        setShowColumnMapper(false);
        processDataWithMapping(mapping, etapaColumn);
      };

  const importarItens = async () => {
    if (!projetoSelecionado || !dadosPreview) {
      toast.error('Selecione um projeto');
      return;
    }

    setImporting(true);

    const projeto = projetos.find(p => p.id === projetoSelecionado);

    try {
      const itensParaCriar = dadosPreview
        .filter(item => item.etapa === etapaDefinida)
        .map(item => ({
          projeto_id: projetoSelecionado,
          projeto_nome: projeto.nome,
          codigo: item.codigo,
          nome: item.nome,
          marca: item.marca,
          peso_unitario: item.peso_unitario,
          quantidade: item.quantidade,
          peso_total: item.peso_total,
          etapa: etapaDefinida,
          quantidade_produzida: 0,
          percentual_conclusao: 0,
          data_inicio: item.data_inicio || null,
          data_fim_prevista: item.data_fim_prevista || null,
          status: 'pendente',
          responsavel: item.responsavel,
          observacoes: item.observacoes
        }));

      // Criar tarefas correspondentes
      const tarefasParaCriar = itensParaCriar.map(item => ({
        titulo: item.nome,
        projeto_id: item.projeto_id,
        projeto_nome: item.projeto_nome,
        responsavel: item.responsavel || '',
        status: 'pendente',
        prioridade: 'media',
        data_inicio: item.data_inicio || null,
        data_fim: item.data_fim_prevista || null,
        observacoes: item.observacoes,
        percentual_conclusao: 0
      }));

      await base44.entities.ItemProducao.bulkCreate(itensParaCriar);
      await base44.entities.Tarefa.bulkCreate(tarefasParaCriar);

      // Se importou fabricação, também copiar para montagem
      if (etapaDefinida === 'fabricacao') {
        const itensMontagem = itensParaCriar.map(item => ({
          ...item,
          etapa: 'montagem'
        }));
        await base44.entities.ItemProducao.bulkCreate(itensMontagem);
      }

      toast.success(`${itensParaCriar.length} itens importados com sucesso!`);
      setShowModal(false);
      setDadosPreview(null);
      setProjetoSelecionado('');
      setEtapaDefinida(null);
      if (onImportSuccess) onImportSuccess();
    } catch (error) {
      console.error('Erro ao importar:', error);
      toast.error(`Erro ao importar: ${error.message}`);
    }

    setImporting(false);
  };

  return (
    <>
      <Button
        onClick={() => setShowModal(true)}
        className="bg-gradient-to-r from-emerald-500 to-emerald-600"
      >
        <Upload className="h-4 w-4 mr-2" />
        Importar Planilha Excel
      </Button>

      <Dialog open={showModal} onOpenChange={setShowModal}>
        <DialogContent className="max-w-5xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <FileSpreadsheet className="h-5 w-5 text-emerald-600" />
              Importar Itens de Produção
            </DialogTitle>
          </DialogHeader>

          <div className="space-y-6 py-4">
            {/* Abas de Etapa */}
            {!dadosPreview && (
              <Tabs value={etapaAtiva} onValueChange={setEtapaAtiva} className="w-full">
                <TabsList className="grid w-full grid-cols-2">
                  <TabsTrigger value="fabricacao">Fabricação</TabsTrigger>
                  <TabsTrigger value="montagem">Montagem</TabsTrigger>
                </TabsList>
              </Tabs>
            )}
            {dadosPreview && (
              <Card className="border-orange-200 bg-orange-50">
                <CardContent className="p-4">
                  <p className="text-sm text-orange-800">
                    <strong>Importando itens de:</strong> {etapaDefinida === 'fabricacao' ? 'Fabricação' : 'Montagem'}
                  </p>
                </CardContent>
              </Card>
            )}

            {/* Template Download */}
            <Card className="border-blue-200 bg-blue-50">
              <CardContent className="p-4">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="font-medium text-blue-900 mb-1">Baixar Template Excel</p>
                    <p className="text-sm text-blue-700">
                      Baixe o modelo, preencha e faça upload
                    </p>
                  </div>
                  <Button onClick={gerarTemplate} variant="outline" size="sm">
                    <Download className="h-4 w-4 mr-2" />
                    Baixar Template
                  </Button>
                </div>
              </CardContent>
            </Card>

            {/* Seleção de Projeto */}
            <div className="space-y-2">
              <Label>Projeto *</Label>
              <Select value={projetoSelecionado} onValueChange={setProjetoSelecionado}>
                <SelectTrigger>
                  <SelectValue placeholder="Selecione o projeto" />
                </SelectTrigger>
                <SelectContent>
                  {projetos.map((projeto) => (
                    <SelectItem key={projeto.id} value={projeto.id}>
                      {projeto.nome} - {projeto.cliente_nome}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Upload */}
            <div className="space-y-2">
              <Label>Importar Arquivo</Label>
              <div className="border-2 border-dashed border-slate-300 rounded-lg p-8 text-center hover:border-emerald-400 transition-colors">
                <input
                  type="file"
                  accept=".xlsx,.xls,.csv,.txt,.json"
                  onChange={handleFileUpload}
                  className="hidden"
                  id="file-upload"
                  disabled={uploading}
                />
                <label htmlFor="file-upload" className="cursor-pointer">
                  {uploading ? (
                    <Loader2 className="h-12 w-12 mx-auto text-emerald-500 animate-spin mb-3" />
                  ) : (
                    <Upload className="h-12 w-12 mx-auto text-slate-400 mb-3" />
                  )}
                  <p className="text-sm font-medium text-slate-700">
                    {uploading ? 'Processando...' : 'Clique para selecionar arquivo'}
                  </p>
                  <p className="text-xs text-slate-500 mt-1">
                    Suportados: Excel (.xlsx, .xls), CSV, TXT (TAB ou ;), JSON
                  </p>
                </label>
              </div>
            </div>

            {/* Validação */}
            {validationErrors && (
              <DataValidator validationResults={validationErrors} onClose={() => setValidationErrors(null)} />
            )}

            {/* Column Mapper */}
            {showColumnMapper && (
              <ColumnMapper
                columns={rawColumns}
                onMapComplete={handleMapperComplete}
                onCancel={() => {
                  setShowColumnMapper(false);
                  setRawData(null);
                  setRawColumns([]);
                }}
              />
            )}

            {/* Mapeamentos Predefinidos */}
            {!showColumnMapper && rawData && (
              <MapeamentosList
                mapeamentos={mapeamentosSalvos}
                onSelect={carregarMapeamentoPredefinido}
                mapeamentoAtual={columnMapping}
                transformacoes={transformacoes}
                colunaEtapa={colunaEtapa}
                onSaved={() => {
                  // Recarregar lista de mapeamentos
                }}
              />
            )}

            {/* Transformações */}
            {rawData && columnMapping && (
              <TransformationRules
                transformacoes={transformacoes}
                onChange={setTransformacoes}
              />
            )}

            {/* Preview */}
            {dadosPreview && (
              <Card className="border-emerald-200">
                <CardHeader>
                  <div className="flex items-center justify-between">
                  <CardTitle className="text-sm flex items-center gap-2">
                    <Check className="h-4 w-4 text-emerald-600" />
                    Preview dos Dados ({dadosPreview.filter(i => i.etapa === etapaDefinida).length} itens de {etapaDefinida})
                  </CardTitle>
                  </div>
                </CardHeader>
                <CardContent>
                  <div className="max-h-96 overflow-y-auto">
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>Código</TableHead>
                          <TableHead>Nome</TableHead>
                          <TableHead>Marca</TableHead>
                          <TableHead>Peso Un.</TableHead>
                          <TableHead>Qtd</TableHead>
                          <TableHead>Peso Total</TableHead>
                          <TableHead>Etapa</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {(validationErrors?.valid || dadosPreview)?.filter(i => i.etapa === etapaDefinida).map((item, idx) => (
                          <TableRow key={idx}>
                            <TableCell className="font-mono text-xs">{item.codigo}</TableCell>
                            <TableCell className="font-medium">{item.nome}</TableCell>
                            <TableCell>{item.marca || '-'}</TableCell>
                            <TableCell>{item.peso_unitario} kg</TableCell>
                            <TableCell>{item.quantidade}</TableCell>
                            <TableCell className="font-semibold">{item.peso_total.toFixed(1)} kg</TableCell>
                            <TableCell>
                              <Badge className={item.etapa === 'fabricacao' ? 'bg-blue-100 text-blue-700' : 'bg-orange-100 text-orange-700'}>
                                {item.etapa}
                              </Badge>
                            </TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </div>

                  <div className="mt-4 p-4 bg-slate-50 rounded-lg">
                    <div className="grid grid-cols-3 gap-4 text-center">
                      <div>
                        <p className="text-sm text-slate-500">Total de Itens</p>
                        <p className="text-2xl font-bold text-slate-900">{(validationErrors?.valid || dadosPreview)?.filter(i => i.etapa === etapaDefinida).length}</p>
                      </div>
                      <div>
                        <p className="text-sm text-slate-500">Peso Total</p>
                        <p className="text-2xl font-bold text-slate-900">
                          {((validationErrors?.valid || dadosPreview)?.filter(i => i.etapa === etapaDefinida).reduce((acc, item) => acc + item.peso_total, 0) || 0).toLocaleString('pt-BR', { maximumFractionDigits: 1 })} kg
                        </p>
                      </div>
                      <div>
                        <p className="text-sm text-slate-500">Quantidade Total</p>
                        <p className="text-2xl font-bold text-slate-900">
                          {(validationErrors?.valid || dadosPreview)?.filter(i => i.etapa === etapaDefinida).reduce((acc, item) => acc + item.quantidade, 0)}
                        </p>
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            )}

            {/* Actions */}
            <div className="flex justify-end gap-3 pt-4 border-t">
              <Button 
                variant="outline" 
                onClick={() => {
                  setShowModal(false);
                  setDadosPreview(null);
                  setProjetoSelecionado('');
                  setEtapaDefinida(null);
                }}
              >
                Cancelar
              </Button>
              <Button
                onClick={importarItens}
                disabled={!projetoSelecionado || !dadosPreview || importing || validationErrors?.invalid?.length > 0}
                className="bg-gradient-to-r from-emerald-500 to-emerald-600"
              >
                {importing ? (
                  <>
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    Importando...
                  </>
                ) : (
                  <>
                    <Check className="h-4 w-4 mr-2" />
                    Importar {validationErrors?.valid?.filter(i => i.etapa === etapaDefinida).length || dadosPreview?.filter(i => i.etapa === etapaDefinida).length || 0} Itens
                  </>
                )}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}