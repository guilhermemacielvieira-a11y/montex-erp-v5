import React, { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';


import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  TrendingUp,
  TrendingDown,
  DollarSign,
  FileBarChart,
  PieChart,
  Activity,
  Plus,
  X
} from 'lucide-react';
import FluxoCaixaReport from '../components/financeiro/FluxoCaixaReport';
import RentabilidadeReport from '../components/financeiro/RentabilidadeReport';
import DespesasReport from '../components/financeiro/DespesasReport';
import MovimentacaoComAlocacao from '../components/financeiro/MovimentacaoComAlocacao';
import FluxoCaixaPorObra from '../components/financeiro/FluxoCaixaPorObra';
import FiltrosAvancados from '../components/financeiro/FiltrosAvancados';
import GraficosAvancados from '../components/financeiro/GraficosAvancados';
import ExportadorRelatorios from '../components/financeiro/ExportadorRelatorios';
import RelatorioFisicoFinanceiro from '../components/financeiro/RelatorioFisicoFinanceiro';
import FiltrosSalvos from '../components/financeiro/FiltrosSalvos';
import ImportadorLancamentosMaterial from '../components/financeiro/ImportadorLancamentosMaterial';
import ImportadorExtratoBancario from '../components/financeiro/ImportadorExtratoBancario';
import ImportadorNotaFiscal from '../components/financeiro/ImportadorNotaFiscal';

export default function RelatoriosFinanceiros() {
  const [filtros, setFiltros] = useState({
    dataInicio: new Date(new Date().setMonth(new Date().getMonth() - 3)).toISOString().split('T')[0],
    dataFim: new Date().toISOString().split('T')[0],
    projetoId: 'todos',
    status: 'todos'
  });
  const [showMovimentacaoModal, setShowMovimentacaoModal] = useState(false);
  const [abaAtiva, setAbaAtiva] = useState('fluxo');
  const [filtrosAvancados, setFiltrosAvancados] = useState({
    dataInicio: new Date(new Date().setMonth(new Date().getMonth() - 3)).toISOString().split('T')[0],
    dataFim: new Date().toISOString().split('T')[0],
    tipos: [],
    categorias: [],
    status: [],
    projetos: [],
  });

  const { data: movimentacoes = [] } = useQuery({
    queryKey: ['movimentacoes'],
    queryFn: () => base44.entities.MovimentacaoFinanceira.list('-data_movimentacao', 500)
  });

  const { data: projetos = [] } = useQuery({
    queryKey: ['projetos'],
    queryFn: () => base44.entities.Projeto.list()
  });

  const { data: orcamentos = [] } = useQuery({
    queryKey: ['orcamentos'],
    queryFn: () => base44.entities.Orcamento.list()
  });

  const movimentacoesFiltradas = movimentacoes.filter(m => {
    const dataMovimentacao = new Date(m.data_movimentacao);
    const dataInicio = new Date(filtrosAvancados.dataInicio);
    const dataFim = new Date(filtrosAvancados.dataFim);
    
    if (dataMovimentacao < dataInicio || dataMovimentacao > dataFim) return false;
    if (filtrosAvancados.tipos.length > 0 && !filtrosAvancados.tipos.includes(m.tipo)) return false;
    if (filtrosAvancados.categorias.length > 0 && !filtrosAvancados.categorias.includes(m.categoria)) return false;
    if (filtrosAvancados.status.length > 0 && !filtrosAvancados.status.includes(m.status)) return false;
    if (filtrosAvancados.projetos.length > 0 && !filtrosAvancados.projetos.includes(m.projeto_id)) return false;
    if (filtros.projetoId !== 'todos' && m.projeto_id !== filtros.projetoId) return false;
    
    return true;
  });

  const entradas = movimentacoesFiltradas
    .filter(m => m.tipo === 'entrada' && m.status === 'realizado')
    .reduce((acc, m) => acc + (m.valor || 0), 0);

  const saidas = movimentacoesFiltradas
    .filter(m => m.tipo === 'saida' && m.status === 'realizado')
    .reduce((acc, m) => acc + (m.valor || 0), 0);

  // Calcular valor total de contratos dos projetos filtrados
  const contratosFiltrados = filtrosAvancados.projetos.length > 0 
    ? projetos.filter(p => filtrosAvancados.projetos.includes(p.id))
    : projetos;
  
  const totalContratos = contratosFiltrados.reduce((acc, p) => acc + (p.valor_contrato || 0), 0);

  // Saldo = valor dos contratos - entradas já realizadas - saídas realizadas
  const saldo = totalContratos - entradas - saidas;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold text-slate-900">Relatórios Financeiros</h1>
          <p className="text-slate-500 mt-1">Análise completa de fluxo de caixa, rentabilidade e despesas</p>
        </div>
        <div className="flex gap-2 flex-wrap">
          <ImportadorLancamentosMaterial projetos={projetos} />
          <ImportadorExtratoBancario />
          <ImportadorNotaFiscal />
          <Button
            onClick={() => setShowMovimentacaoModal(true)}
            className="bg-gradient-to-r from-emerald-500 to-emerald-600 hover:from-emerald-600 hover:to-emerald-700"
          >
            <Plus className="h-4 w-4 mr-2" />
            Nova Movimentação
          </Button>
        </div>
      </div>

      {/* Cards de Resumo */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <Card className="border-emerald-200 bg-gradient-to-br from-emerald-50 to-emerald-100">
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-emerald-700">Total Entradas</p>
                <p className="text-2xl font-bold text-emerald-900 mt-1">
                  R$ {entradas.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                </p>
              </div>
              <div className="w-12 h-12 rounded-xl bg-emerald-600 flex items-center justify-center">
                <TrendingUp className="h-6 w-6 text-white" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="border-red-200 bg-gradient-to-br from-red-50 to-red-100">
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-red-700">Total Saídas</p>
                <p className="text-2xl font-bold text-red-900 mt-1">
                  R$ {saidas.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                </p>
              </div>
              <div className="w-12 h-12 rounded-xl bg-red-600 flex items-center justify-center">
                <TrendingDown className="h-6 w-6 text-white" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className={saldo >= 0 ? 'border-blue-200 bg-gradient-to-br from-blue-50 to-blue-100' : 'border-orange-200 bg-gradient-to-br from-orange-50 to-orange-100'}>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className={saldo >= 0 ? 'text-sm font-medium text-blue-700' : 'text-sm font-medium text-orange-700'}>Saldo do Contrato</p>
                <p className={saldo >= 0 ? 'text-2xl font-bold text-blue-900 mt-1' : 'text-2xl font-bold text-orange-900 mt-1'}>
                  R$ {Math.abs(saldo).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                </p>
              </div>
              <div className={saldo >= 0 ? 'w-12 h-12 rounded-xl bg-blue-600 flex items-center justify-center' : 'w-12 h-12 rounded-xl bg-orange-600 flex items-center justify-center'}>
                <DollarSign className="h-6 w-6 text-white" />
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Filtros Avançados */}
      <div className="space-y-4">
        <div className="flex flex-col lg:flex-row lg:items-center gap-4 justify-between">
          <div className="flex gap-2">
            <FiltrosSalvos
              filtros={filtrosAvancados}
              onCarregarFiltro={setFiltrosAvancados}
            />
            <Button
              onClick={() => setFiltrosAvancados({
                dataInicio: new Date(new Date().setMonth(new Date().getMonth() - 3)).toISOString().split('T')[0],
                dataFim: new Date().toISOString().split('T')[0],
                tipos: [],
                categorias: [],
                status: [],
                projetos: [],
              })}
              variant="outline"
              size="sm"
              className="gap-2 text-red-600 hover:text-red-700"
            >
              <X className="h-4 w-4" />
              Limpar Filtros
            </Button>
          </div>
        </div>
        <FiltrosAvancados
          filtros={filtrosAvancados}
          onFiltrosChange={setFiltrosAvancados}
          projetos={projetos}
        />
      </div>

      {/* Relatórios */}
      <Tabs value={abaAtiva} onValueChange={setAbaAtiva}>
        <TabsList className="grid w-full grid-cols-2 lg:grid-cols-6 overflow-x-auto">
          <TabsTrigger value="fisico" className="text-xs sm:text-sm">
            <FileBarChart className="h-4 w-4 mr-1 sm:mr-2" />
            <span className="hidden sm:inline">Físico-Financeiro</span>
            <span className="sm:hidden">Físico</span>
          </TabsTrigger>
          <TabsTrigger value="fluxo" className="text-xs sm:text-sm">
            <Activity className="h-4 w-4 mr-1 sm:mr-2" />
            <span className="hidden sm:inline">Fluxo de Caixa</span>
            <span className="sm:hidden">Fluxo</span>
          </TabsTrigger>
          <TabsTrigger value="graficos" className="text-xs sm:text-sm">
            <FileBarChart className="h-4 w-4 mr-1 sm:mr-2" />
            Gráficos
          </TabsTrigger>
          <TabsTrigger value="fluxoObra" className="text-xs sm:text-sm">
            <DollarSign className="h-4 w-4 mr-1 sm:mr-2" />
            <span className="hidden sm:inline">Fluxo por Obra</span>
            <span className="sm:hidden">Obra</span>
          </TabsTrigger>
          <TabsTrigger value="rentabilidade" className="text-xs sm:text-sm">
            <FileBarChart className="h-4 w-4 mr-1 sm:mr-2" />
            <span className="hidden md:inline">Rentabilidade</span>
            <span className="md:hidden">Rentab</span>
          </TabsTrigger>
          <TabsTrigger value="despesas" className="text-xs sm:text-sm">
            <PieChart className="h-4 w-4 mr-1 sm:mr-2" />
            Despesas
          </TabsTrigger>
        </TabsList>

        <TabsContent value="fisico" className="space-y-4 mt-6">
          <RelatorioFisicoFinanceiro
            projetoId={filtros.projetoId}
            projetos={projetos}
          />
        </TabsContent>

        <TabsContent value="fluxo" className="space-y-4 mt-6">
          <div className="flex justify-end mb-4">
            <ExportadorRelatorios
              movimentacoes={movimentacoesFiltradas}
              filtros={filtrosAvancados}
            />
          </div>
          <FluxoCaixaReport
            movimentacoes={movimentacoesFiltradas}
            filtros={filtrosAvancados}
          />
        </TabsContent>

        <TabsContent value="graficos" className="space-y-4 mt-6">
          <GraficosAvancados
            movimentacoes={movimentacoesFiltradas}
          />
        </TabsContent>

        <TabsContent value="fluxoObra" className="space-y-4 mt-6">
          <FluxoCaixaPorObra
            projetoId={filtros.projetoId === 'todos' ? 'todos' : filtros.projetoId}
            projetos={projetos}
          />
        </TabsContent>

        <TabsContent value="rentabilidade" className="space-y-4 mt-6">
          <RentabilidadeReport
            projetos={projetos}
            movimentacoes={movimentacoesFiltradas}
            orcamentos={orcamentos}
            filtros={filtros}
          />
        </TabsContent>

        <TabsContent value="despesas" className="space-y-4 mt-6">
          <DespesasReport
            movimentacoes={movimentacoesFiltradas}
            filtros={filtros}
          />
        </TabsContent>
      </Tabs>

      {/* Modal de Movimentação com Alocação */}
      <MovimentacaoComAlocacao
        open={showMovimentacaoModal}
        onClose={() => setShowMovimentacaoModal(false)}
        projetos={projetos}
      />
    </div>
  );
}