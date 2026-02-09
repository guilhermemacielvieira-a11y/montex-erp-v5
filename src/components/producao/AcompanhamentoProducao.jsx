import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  Wrench,
  HardHat,
  Plus,
  CheckCircle2,
  DollarSign,
  Calendar,
  Loader2,
  Copy
} from 'lucide-react';
import { base44 } from '@/api/base44Client';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import GestaoDetalhaCustos from './GestaoDetalhaCustos';
import RelatorioCustos from './RelatorioCustos';

export default function AcompanhamentoProducao({ projetoId, projetoNome }) {
  const [showLancamento, setShowLancamento] = useState(false);
  const [itemSelecionado, setItemSelecionado] = useState(null);
  const [itemCustos, setItemCustos] = useState(null);
  const [formLancamento, setFormLancamento] = useState({
    data_lancamento: new Date().toISOString().split('T')[0],
    quantidade_realizada: '',
    horas_trabalhadas: '',
    equipe: '',
    custo_dia: '',
    observacoes: '',
    problemas_encontrados: ''
  });

  const queryClient = useQueryClient();

  const { data: itensFabricacao = [] } = useQuery({
    queryKey: ['itens-producao', projetoId, 'fabricacao'],
    queryFn: () => base44.entities.ItemProducao.filter({ projeto_id: projetoId, etapa: 'fabricacao' }, '-created_date', 1000)
  });

  const { data: itensMontagem = [] } = useQuery({
    queryKey: ['itens-producao', projetoId, 'montagem'],
    queryFn: () => base44.entities.ItemProducao.filter({ projeto_id: projetoId, etapa: 'montagem' }, '-created_date', 1000)
  });

  const { data: lancamentos = [] } = useQuery({
    queryKey: ['lancamentos-producao', projetoId],
    queryFn: () => base44.entities.LancamentoProducao.filter({ projeto_id: projetoId }, '-data_lancamento', 300),
    enabled: !!projetoId
  });

  const createLancamentoMutation = useMutation({
    mutationFn: (data) => base44.entities.LancamentoProducao.create(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['lancamentos-producao'] });
      queryClient.invalidateQueries({ queryKey: ['itens-producao'] });
    }
  });

  const updateItemMutation = useMutation({
    mutationFn: ({ id, data }) => base44.entities.ItemProducao.update(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['itens-producao'] });
    }
  });

  const copiarDadosFabricacaoParaMontagem = async () => {
    if (!confirm('Deseja copiar TODOS os dados de Fabricação para Montagem? Isso criará novos itens na aba de Montagem.')) {
      return;
    }

    try {
      const itensMontagemNovos = itensFabricacao.map(item => ({
        projeto_id: item.projeto_id,
        projeto_nome: item.projeto_nome,
        codigo: item.codigo,
        nome: item.nome,
        marca: item.marca,
        peso_unitario: item.peso_unitario,
        quantidade: item.quantidade,
        peso_total: item.peso_total,
        etapa: 'montagem',
        quantidade_produzida: 0,
        percentual_conclusao: 0,
        data_inicio: null,
        data_fim_prevista: item.data_fim_prevista,
        data_fim_real: null,
        status: 'pendente',
        responsavel: item.responsavel,
        observacoes: item.observacoes
      }));

      await base44.entities.ItemProducao.bulkCreate(itensMontagemNovos);
      
      toast.success(`${itensMontagemNovos.length} itens copiados para Montagem com sucesso!`);
      queryClient.invalidateQueries({ queryKey: ['itens-producao'] });
    } catch (error) {
      console.error('Erro ao copiar:', error);
      toast.error(`Erro ao copiar: ${error.message}`);
    }
  };

  const abrirLancamento = (item) => {
    setItemSelecionado(item);
    setFormLancamento({
      data_lancamento: new Date().toISOString().split('T')[0],
      quantidade_realizada: '',
      horas_trabalhadas: '',
      equipe: '',
      custo_dia: '',
      observacoes: '',
      problemas_encontrados: ''
    });
    setShowLancamento(true);
  };

  const salvarLancamento = async () => {
    if (!itemSelecionado || !formLancamento.quantidade_realizada) {
      toast.error('Preencha a quantidade realizada');
      return;
    }

    const qtdRealizada = parseFloat(formLancamento.quantidade_realizada);
    const novaQtdProduzida = (itemSelecionado.quantidade_produzida || 0) + qtdRealizada;
    const novoPercentual = Math.min((novaQtdProduzida / itemSelecionado.quantidade) * 100, 100);
    const pesoRealizado = itemSelecionado.peso_unitario * qtdRealizada;

    await createLancamentoMutation.mutateAsync({
      item_producao_id: itemSelecionado.id,
      projeto_id: projetoId,
      projeto_nome: projetoNome,
      item_nome: itemSelecionado.nome,
      etapa: itemSelecionado.etapa,
      data_lancamento: formLancamento.data_lancamento,
      quantidade_realizada: qtdRealizada,
      peso_realizado: pesoRealizado,
      horas_trabalhadas: parseFloat(formLancamento.horas_trabalhadas) || 0,
      equipe: formLancamento.equipe,
      responsavel: itemSelecionado.responsavel,
      custo_dia: parseFloat(formLancamento.custo_dia) || 0,
      observacoes: formLancamento.observacoes,
      problemas_encontrados: formLancamento.problemas_encontrados
    });

    const novoStatus = novoPercentual >= 100 ? 'concluido' : 
                       novoPercentual > 0 ? 'em_andamento' : 'pendente';

    await updateItemMutation.mutateAsync({
      id: itemSelecionado.id,
      data: {
        quantidade_produzida: novaQtdProduzida,
        percentual_conclusao: novoPercentual,
        status: novoStatus,
        data_fim_real: novoPercentual >= 100 ? new Date().toISOString().split('T')[0] : null
      }
    });

    toast.success('Lançamento registrado!');
    setShowLancamento(false);
  };

  const calcularEstatisticas = (itens) => {
    const total = itens.length;
    const concluidos = itens.filter(i => i.status === 'concluido').length;
    const emAndamento = itens.filter(i => i.status === 'em_andamento').length;
    const pendentes = itens.filter(i => i.status === 'pendente').length;
    
    const pesoTotal = itens.reduce((acc, i) => acc + ((i.peso_unitario || 0) * (i.quantidade || 0)), 0);
    const pesoProduzido = itens.reduce((acc, i) => acc + ((i.peso_unitario || 0) * (i.quantidade_produzida || 0)), 0);
    const percentualPeso = pesoTotal > 0 ? (pesoProduzido / pesoTotal) * 100 : 0;

    return { total, concluidos, emAndamento, pendentes, pesoTotal, pesoProduzido, percentualPeso };
  };

  const estatisticasFab = calcularEstatisticas(itensFabricacao);
  const estatisticasMont = calcularEstatisticas(itensMontagem);

  const calcularFisicoFinanceiro = (itens, etapa) => {
    const lancamentosEtapa = lancamentos.filter(l => l.etapa === etapa);
    const custoTotal = lancamentosEtapa.reduce((acc, l) => acc + (l.custo_dia || 0), 0);
    const pesoRealizado = lancamentosEtapa.reduce((acc, l) => acc + (l.peso_realizado || 0), 0);
    const pesoTotal = itens.reduce((acc, i) => acc + ((i.peso_unitario || 0) * (i.quantidade || 0)), 0);
    const percentualFisico = pesoTotal > 0 ? (pesoRealizado / pesoTotal) * 100 : 0;

    return { custoTotal, pesoRealizado, percentualFisico };
  };

  const fisicoFinanceiroFab = calcularFisicoFinanceiro(itensFabricacao, 'fabricacao');
  const fisicoFinanceiroMont = calcularFisicoFinanceiro(itensMontagem, 'montagem');

  const ItemRow = ({ item }) => (
    <TableRow className="hover:bg-slate-50">
      <TableCell className="font-mono text-xs">{item.codigo}</TableCell>
      <TableCell>
        <div>
          <p className="font-medium text-sm">{item.nome}</p>
          {item.marca && <p className="text-xs text-slate-500">{item.marca}</p>}
        </div>
      </TableCell>
      <TableCell>{item.peso_unitario} kg</TableCell>
      <TableCell>
        <div className="text-sm">
          <span className="font-semibold text-emerald-600">{item.quantidade_produzida || 0}</span>
          <span className="text-slate-400"> / {item.quantidade}</span>
        </div>
        <Progress value={item.percentual_conclusao || 0} className="h-1 mt-1" />
      </TableCell>
      <TableCell>
        <Badge className={
          item.status === 'concluido' ? 'bg-emerald-100 text-emerald-700' :
          item.status === 'em_andamento' ? 'bg-blue-100 text-blue-700' :
          item.status === 'pausado' ? 'bg-yellow-100 text-yellow-700' :
          'bg-slate-100 text-slate-700'
        }>
          {item.status}
        </Badge>
      </TableCell>
      <TableCell>{item.responsavel || '-'}</TableCell>
      <TableCell>
        <div className="flex gap-1">
          <Button
            size="sm"
            variant="outline"
            onClick={() => abrirLancamento(item)}
            disabled={item.status === 'concluido'}
            className="text-emerald-600 border-emerald-300 hover:bg-emerald-50"
          >
            <Plus className="h-3 w-3 mr-1" />
            Lançar
          </Button>
          <Button
            size="sm"
            variant="outline"
            onClick={() => setItemCustos(item)}
            className="text-orange-600 border-orange-300 hover:bg-orange-50"
          >
            💰
          </Button>
        </div>
      </TableCell>
    </TableRow>
  );

  return (
    <div className="space-y-6">
      <Tabs defaultValue="fabricacao" className="w-full">
        <div className="flex items-center justify-between mb-4 flex-col lg:flex-row gap-3">
          <TabsList className="grid w-full grid-cols-2 max-w-xs">
            <TabsTrigger value="fabricacao" className="flex items-center gap-2">
              <Wrench className="h-4 w-4" />
              Fabricação
            </TabsTrigger>
            <TabsTrigger value="montagem" className="flex items-center gap-2">
              <HardHat className="h-4 w-4" />
              Montagem
            </TabsTrigger>
          </TabsList>
          {itensFabricacao.length > 0 && itensMontagem.length === 0 && (
            <Button
              onClick={copiarDadosFabricacaoParaMontagem}
              size="sm"
              className="bg-gradient-to-r from-purple-500 to-purple-600 hover:from-purple-600 hover:to-purple-700"
            >
              <Copy className="h-4 w-4 mr-2" />
              Copiar Fab → Montagem
            </Button>
          )}
        </div>

        {/* FABRICAÇÃO */}
        <TabsContent value="fabricacao" className="space-y-4">
          {/* Estatísticas */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <Card>
              <CardContent className="p-4 text-center">
                <p className="text-sm text-slate-500">Total</p>
                <p className="text-2xl font-bold text-slate-900">{estatisticasFab.total}</p>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="p-4 text-center">
                <p className="text-sm text-emerald-600">Concluídos</p>
                <p className="text-2xl font-bold text-emerald-600">{estatisticasFab.concluidos}</p>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="p-4 text-center">
                <p className="text-sm text-blue-600">Em Andamento</p>
                <p className="text-2xl font-bold text-blue-600">{estatisticasFab.emAndamento}</p>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="p-4 text-center">
                <p className="text-sm text-slate-500">Progresso</p>
                <p className="text-2xl font-bold text-orange-600">{estatisticasFab.percentualPeso.toFixed(1)}%</p>
              </CardContent>
            </Card>
          </div>

          {/* Físico-Financeiro */}
          <Card className="border-blue-200 bg-blue-50">
            <CardHeader>
              <CardTitle className="text-sm flex items-center gap-2">
                <DollarSign className="h-4 w-4 text-blue-600" />
                Físico-Financeiro - Fabricação
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-3 gap-4">
                <div className="text-center">
                  <p className="text-xs text-blue-600 mb-1">Peso Fabricado</p>
                  <p className="text-xl font-bold text-blue-900">
                    {(fisicoFinanceiroFab.pesoProduzido / 1000).toFixed(2)} ton
                  </p>
                  <p className="text-xs text-slate-500">
                    de {(estatisticasFab.pesoTotal / 1000).toFixed(2)} ton
                  </p>
                </div>
                <div className="text-center">
                  <p className="text-xs text-blue-600 mb-1">Avanço Físico</p>
                  <p className="text-xl font-bold text-blue-900">
                    {fisicoFinanceiroFab.percentualFisico.toFixed(1)}%
                  </p>
                  <Progress value={fisicoFinanceiroFab.percentualFisico} className="mt-2" />
                </div>
                <div className="text-center">
                  <p className="text-xs text-blue-600 mb-1">Custo Realizado</p>
                  <p className="text-xl font-bold text-blue-900">
                    R$ {(fisicoFinanceiroFab.custoTotal / 1000).toFixed(0)}k
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Lista de Itens */}
          <Card>
            <CardContent className="p-0">
              {itensFabricacao.length === 0 ? (
                <div className="text-center py-12">
                  <Wrench className="h-12 w-12 mx-auto text-slate-300 mb-3" />
                  <p className="text-slate-500">Nenhum item de fabricação cadastrado</p>
                </div>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Código</TableHead>
                      <TableHead>Item</TableHead>
                      <TableHead>Peso Un.</TableHead>
                      <TableHead>Progresso</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead>Responsável</TableHead>
                      <TableHead></TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {itensFabricacao.map((item) => (
                      <ItemRow key={item.id} item={item} />
                    ))}
                  </TableBody>
                </Table>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* MONTAGEM */}
        <TabsContent value="montagem" className="space-y-4">
          {/* Estatísticas */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <Card>
              <CardContent className="p-4 text-center">
                <p className="text-sm text-slate-500">Total</p>
                <p className="text-2xl font-bold text-slate-900">{estatisticasMont.total}</p>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="p-4 text-center">
                <p className="text-sm text-emerald-600">Concluídos</p>
                <p className="text-2xl font-bold text-emerald-600">{estatisticasMont.concluidos}</p>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="p-4 text-center">
                <p className="text-sm text-orange-600">Em Andamento</p>
                <p className="text-2xl font-bold text-orange-600">{estatisticasMont.emAndamento}</p>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="p-4 text-center">
                <p className="text-sm text-slate-500">Progresso</p>
                <p className="text-2xl font-bold text-orange-600">{estatisticasMont.percentualPeso.toFixed(1)}%</p>
              </CardContent>
            </Card>
          </div>

          {/* Físico-Financeiro */}
          <Card className="border-orange-200 bg-orange-50">
            <CardHeader>
              <CardTitle className="text-sm flex items-center gap-2">
                <DollarSign className="h-4 w-4 text-orange-600" />
                Físico-Financeiro - Montagem
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-3 gap-4">
                <div className="text-center">
                  <p className="text-xs text-orange-600 mb-1">Peso Montado</p>
                  <p className="text-xl font-bold text-orange-900">
                    {(fisicoFinanceiroMont.pesoProduzido / 1000).toFixed(2)} ton
                  </p>
                  <p className="text-xs text-slate-500">
                    de {(estatisticasMont.pesoTotal / 1000).toFixed(2)} ton
                  </p>
                </div>
                <div className="text-center">
                  <p className="text-xs text-orange-600 mb-1">Avanço Físico</p>
                  <p className="text-xl font-bold text-orange-900">
                    {fisicoFinanceiroMont.percentualFisico.toFixed(1)}%
                  </p>
                  <Progress value={fisicoFinanceiroMont.percentualFisico} className="mt-2" />
                </div>
                <div className="text-center">
                  <p className="text-xs text-orange-600 mb-1">Custo Realizado</p>
                  <p className="text-xl font-bold text-orange-900">
                    R$ {(fisicoFinanceiroMont.custoTotal / 1000).toFixed(0)}k
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Lista de Itens */}
          <Card>
            <CardContent className="p-0">
              {itensMontagem.length === 0 ? (
                <div className="text-center py-12">
                  <HardHat className="h-12 w-12 mx-auto text-slate-300 mb-3" />
                  <p className="text-slate-500">Nenhum item de montagem cadastrado</p>
                </div>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Código</TableHead>
                      <TableHead>Item</TableHead>
                      <TableHead>Peso Un.</TableHead>
                      <TableHead>Progresso</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead>Responsável</TableHead>
                      <TableHead></TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {itensMontagem.map((item) => (
                      <ItemRow key={item.id} item={item} />
                    ))}
                  </TableBody>
                </Table>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* Lançamentos Recentes */}
      {lancamentos.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="text-sm flex items-center gap-2">
              <Calendar className="h-4 w-4 text-purple-600" />
              Lançamentos Recentes (últimos 10)
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              {lancamentos.slice(0, 10).map((lanc) => (
                <div key={lanc.id} className="flex items-center justify-between p-3 bg-slate-50 rounded-lg text-sm">
                  <div className="flex-1">
                    <p className="font-medium text-slate-900">{lanc.item_nome}</p>
                    <p className="text-xs text-slate-500">
                      {new Date(lanc.data_lancamento).toLocaleDateString('pt-BR')} • 
                      {lanc.quantidade_realizada} un • 
                      {lanc.peso_realizado?.toFixed(1)} kg • 
                      {lanc.equipe || 'Sem equipe'}
                    </p>
                  </div>
                  <Badge className={lanc.etapa === 'fabricacao' ? 'bg-blue-100 text-blue-700' : 'bg-orange-100 text-orange-700'}>
                    {lanc.etapa}
                  </Badge>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Relatório de Custos */}
      <Card>
        <CardHeader>
          <CardTitle className="text-sm flex items-center gap-2">
            <DollarSign className="h-4 w-4 text-orange-600" />
            Relatório de Custos
          </CardTitle>
        </CardHeader>
        <CardContent>
          <RelatorioCustos
            projetoId={projetoId}
            itensFabricacao={itensFabricacao}
            itensMontagem={itensMontagem}
          />
        </CardContent>
      </Card>

      {/* Modal de Lançamento */}
      <Dialog open={showLancamento} onOpenChange={setShowLancamento}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Lançar Produção</DialogTitle>
          </DialogHeader>

          {itemSelecionado && (
            <div className="space-y-6 py-4">
              <Card className="bg-slate-50">
                <CardContent className="p-4">
                  <div className="grid grid-cols-2 gap-4 text-sm">
                    <div>
                      <p className="text-slate-500">Item:</p>
                      <p className="font-semibold">{itemSelecionado.nome}</p>
                    </div>
                    <div>
                      <p className="text-slate-500">Código:</p>
                      <p className="font-semibold">{itemSelecionado.codigo}</p>
                    </div>
                    <div>
                      <p className="text-slate-500">Já Produzido:</p>
                      <p className="font-semibold text-emerald-600">
                        {itemSelecionado.quantidade_produzida || 0} / {itemSelecionado.quantidade}
                      </p>
                    </div>
                    <div>
                      <p className="text-slate-500">Restante:</p>
                      <p className="font-semibold text-orange-600">
                        {itemSelecionado.quantidade - (itemSelecionado.quantidade_produzida || 0)}
                      </p>
                    </div>
                  </div>
                </CardContent>
              </Card>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Data do Lançamento *</Label>
                  <Input
                    type="date"
                    value={formLancamento.data_lancamento}
                    onChange={(e) => setFormLancamento({ ...formLancamento, data_lancamento: e.target.value })}
                  />
                </div>
                <div className="space-y-2">
                  <Label>Quantidade Realizada *</Label>
                  <Input
                    type="number"
                    step="0.01"
                    placeholder="Ex: 5"
                    value={formLancamento.quantidade_realizada}
                    onChange={(e) => setFormLancamento({ ...formLancamento, quantidade_realizada: e.target.value })}
                  />
                  <p className="text-xs text-slate-500">
                    Peso: {formLancamento.quantidade_realizada ? (parseFloat(formLancamento.quantidade_realizada) * itemSelecionado.peso_unitario).toFixed(1) : 0} kg
                  </p>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Horas Trabalhadas</Label>
                  <Input
                    type="number"
                    step="0.5"
                    placeholder="Ex: 8"
                    value={formLancamento.horas_trabalhadas}
                    onChange={(e) => setFormLancamento({ ...formLancamento, horas_trabalhadas: e.target.value })}
                  />
                </div>
                <div className="space-y-2">
                  <Label>Custo do Dia (R$)</Label>
                  <Input
                    type="number"
                    step="0.01"
                    placeholder="Ex: 1500"
                    value={formLancamento.custo_dia}
                    onChange={(e) => setFormLancamento({ ...formLancamento, custo_dia: e.target.value })}
                  />
                </div>
              </div>

              <div className="space-y-2">
                <Label>Equipe/Turno</Label>
                <Input
                  placeholder="Ex: Equipe A - Turno Manhã"
                  value={formLancamento.equipe}
                  onChange={(e) => setFormLancamento({ ...formLancamento, equipe: e.target.value })}
                />
              </div>

              <div className="space-y-2">
                <Label>Observações</Label>
                <Textarea
                  placeholder="Informações adicionais sobre o lançamento..."
                  value={formLancamento.observacoes}
                  onChange={(e) => setFormLancamento({ ...formLancamento, observacoes: e.target.value })}
                  rows={2}
                />
              </div>

              <div className="space-y-2">
                <Label>Problemas Encontrados</Label>
                <Textarea
                  placeholder="Descreva problemas ou dificuldades..."
                  value={formLancamento.problemas_encontrados}
                  onChange={(e) => setFormLancamento({ ...formLancamento, problemas_encontrados: e.target.value })}
                  rows={2}
                />
              </div>

              <div className="flex justify-end gap-3 pt-4 border-t">
                <Button variant="outline" onClick={() => setShowLancamento(false)}>
                  Cancelar
                </Button>
                <Button
                  onClick={salvarLancamento}
                  disabled={!formLancamento.quantidade_realizada || createLancamentoMutation.isPending}
                  className="bg-gradient-to-r from-emerald-500 to-emerald-600"
                >
                  {createLancamentoMutation.isPending ? (
                    <>
                      <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                      Salvando...
                    </>
                  ) : (
                    <>
                      <CheckCircle2 className="h-4 w-4 mr-2" />
                      Registrar Lançamento
                    </>
                  )}
                </Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* Modal de Gestão de Custos */}
      <Dialog open={!!itemCustos} onOpenChange={() => setItemCustos(null)}>
        <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Gestão de Custos - {itemCustos?.nome}</DialogTitle>
          </DialogHeader>
          {itemCustos && (
            <GestaoDetalhaCustos
              projetoId={projetoId}
              projetoNome={projetoNome}
              itemSelecionado={itemCustos}
            />
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}